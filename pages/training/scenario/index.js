import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth-options';
import LoginScreen from '../../../components/auth/LoginScreen';
import {
  MessageSquare, Send, Loader2, Brain, Target, CheckCircle,
  XCircle, AlertTriangle, ChevronRight, RotateCcw, Star,
  Trophy, Lightbulb, Shield, ArrowLeft, Play, Award
} from 'lucide-react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';

export default function ScenarioTrainingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [phase, setPhase] = useState('loading');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [currentScenario, setCurrentScenario] = useState(null);
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [totalScenarios] = useState(5);
  const [scores, setScores] = useState([]);
  const [hints, setHints] = useState([]);
  const [showHint, setShowHint] = useState(false);
  const [decisionPopup, setDecisionPopup] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [results, setResults] = useState(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [completionData, setCompletionData] = useState(null);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      checkCompletion();
    }
  }, [status]);

  async function checkCompletion() {
    try {
      const res = await fetch('/api/training/scenario/status');
      const data = await res.json();
      if (data.completed) {
        setAlreadyCompleted(true);
        setCompletionData(data.data);
        setPhase('completed');
      } else {
        setPhase('intro');
      }
    } catch {
      setPhase('intro');
    }
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, decisionPopup]);

  async function startSession() {
    setLoading(true);
    try {
      const res = await fetch('/api/training/scenario/start', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        setSessionId(data.sessionId);
        setScenarioIndex(0);
        setScores([]);
        setCurrentScenario(data.scenario);
        setHints(data.scenario.hints || []);
        setShowHint(false);
        setDecisionPopup(null);
        setChatHistory([{ role: 'user', content: data.scenario.opener }]);
        setMessages([
          { role: 'ai', content: data.scenario.opener, timestamp: Date.now() },
        ]);
        setPhase('chat');
      }
    } catch (err) {
      console.error('Failed to start session:', err);
    }
    setLoading(false);
  }

  async function sendMessage(text) {
    if (!text.trim() || loading || decisionPopup) return;
    const userMsg = { role: 'user', content: text.trim(), timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const newHistory = [...chatHistory, { role: 'user', content: text.trim() }];

    try {
      const res = await fetch('/api/training/scenario/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: text.trim(),
          chatHistory: newHistory,
          scenario: currentScenario,
        }),
      });
      const data = await res.json();

      setMessages(prev => [...prev, { role: 'ai', content: data.response, timestamp: Date.now() }]);
      setChatHistory(prev => [...prev, { role: 'ai', content: data.response }]);

      if (data.decision) {
        setDecisionPopup(data.decision);
      }

      if (data.ended && data.score !== undefined) {
        setScores(prev => [...prev, {
          scenario: currentScenario.type,
          label: currentScenario.label,
          score: data.score,
          maxScore: data.maxScore,
          feedback: data.feedback,
        }]);
        setTimeout(() => loadNextScenario(), 2000);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [...prev, { role: 'system', content: 'Error sending message. Please try again.', timestamp: Date.now() }]);
    }
    setLoading(false);
  }

  async function handleDecision(action) {
    if (!decisionPopup || loading) return;
    const popupTitle = decisionPopup.title;
    setDecisionPopup(null);
    setLoading(true);

    try {
      const res = await fetch('/api/training/scenario/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: `[DECISION:${action}]`,
          chatHistory,
          scenario: currentScenario,
          decisionAction: action,
        }),
      });
      const data = await res.json();

      const actionLabels = { warn: 'Warn', kick: 'Kick', ban: 'Ban', ban_jail: 'Ban Jail', ignore: 'Ignore' };
      setMessages(prev => [...prev, {
        role: 'system',
        content: `You chose: ${actionLabels[action] || action}`,
        timestamp: Date.now(),
      }]);
      setMessages(prev => [...prev, { role: 'ai', content: data.response, timestamp: Date.now() }]);
      setChatHistory(prev => [...prev, { role: 'ai', content: data.response }]);

      if (data.score !== undefined) {
        setScores(prev => [...prev, {
          scenario: currentScenario.type,
          label: currentScenario.label,
          score: data.score,
          maxScore: data.maxScore,
          feedback: data.feedback,
        }]);
      }

      if (data.ended) {
        setTimeout(() => loadNextScenario(), 2000);
      }
    } catch (err) {
      console.error('Decision error:', err);
    }
    setLoading(false);
  }

  function loadNextScenario() {
    const nextIndex = scenarioIndex + 1;
    if (nextIndex >= totalScenarios) {
      submitResults();
      return;
    }

    fetch('/api/training/scenario/start', { method: 'POST' })
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          setScenarioIndex(nextIndex);
          setCurrentScenario(data.scenario);
          setHints(data.scenario.hints || []);
          setShowHint(false);
          setDecisionPopup(null);
          setChatHistory([{ role: 'user', content: data.scenario.opener }]);
          setMessages(prev => [...prev, {
            role: 'system',
            content: `--- Scenario ${nextIndex + 1} of ${totalScenarios}: ${data.scenario.label} ---`,
            timestamp: Date.now(),
          }, {
            role: 'ai',
            content: data.scenario.opener,
            timestamp: Date.now(),
          }]);
        }
      })
      .catch(err => console.error('Failed to load next scenario:', err));
  }

  async function submitResults() {
    setLoading(true);
    setResultsLoading(true);
    try {
      const res = await fetch('/api/training/scenario/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, scores }),
      });
      const data = await res.json();
      if (data.ok) {
        setResults(data.results);
        setPhase('results');
      }
    } catch (err) {
      console.error('Submit error:', err);
    }
    setLoading(false);
    setResultsLoading(false);
  }

  async function handleRetry() {
    try {
      const res = await fetch('/api/training/scenario/reset', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        setAlreadyCompleted(false);
        setCompletionData(null);
        setPhase('intro');
      }
    } catch (err) {
      console.error('Reset error:', err);
    }
  }

  if (status === 'loading' || phase === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center">
          <Loader2 className="w-8 h-8 text-gsrp-orange animate-spin mb-4" />
          <span className="text-gsrp-teal-light/40 font-mono text-[9px] uppercase tracking-[0.3em]">Loading Scenario Training</span>
        </div>
      </div>
    );
  }

  if (!session) return <LoginScreen />;

  if (alreadyCompleted && phase === 'completed') {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Shield className="w-7 h-7 text-gsrp-orange" />
            Scenario Training
          </h1>
          <p className="text-gray-400 text-sm mt-1">You have already completed this training module.</p>
        </div>
        <div className="bg-gsrp-dark-card/50 border border-gsrp-dark-border/50 rounded-2xl p-8 text-center">
          <Trophy className="w-16 h-16 text-gsrp-orange mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Training Complete!</h2>
          <p className="text-gray-400 mb-6">You completed this training on {completionData?.completedAt ? new Date(completionData.completedAt).toLocaleDateString() : 'N/A'}.</p>
          {completionData && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="bg-gsrp-dark-surface/50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Total Score</p>
                <p className="text-2xl font-bold text-white">{completionData.totalScore}/{completionData.maxScore}</p>
              </div>
              <div className="bg-gsrp-dark-surface/50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Percentage</p>
                <p className="text-2xl font-bold text-gsrp-orange">{completionData.percentage}%</p>
              </div>
              <div className="bg-gsrp-dark-surface/50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Scenarios</p>
                <p className="text-2xl font-bold text-white">{completionData.scenariosCompleted}</p>
              </div>
              <div className="bg-gsrp-dark-surface/50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Status</p>
                <p className={`text-2xl font-bold ${completionData.passed ? 'text-green-400' : 'text-red-400'}`}>
                  {completionData.passed ? 'PASSED' : 'FAILED'}
                </p>
              </div>
            </div>
          )}
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleRetry}
              className="px-6 py-3 bg-gsrp-orange text-white rounded-xl font-semibold hover:bg-gsrp-orange/90 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Retry Training
            </button>
            <button
              onClick={() => router.push('/training')}
              className="px-6 py-3 bg-gsrp-dark-surface text-white rounded-xl font-semibold hover:bg-gsrp-dark-surface/80 transition-colors cursor-pointer"
            >
              Back to Training
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'intro') {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Shield className="w-7 h-7 text-gsrp-orange" />
            Scenario Training
          </h1>
          <p className="text-gray-400 text-sm mt-1">Practice handling real in-game moderation scenarios with AI-powered roleplay.</p>
        </div>

        <div className="bg-gsrp-dark-card/50 border border-gsrp-dark-border/50 rounded-2xl p-6 md:p-8 mb-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gsrp-orange/10 flex items-center justify-center flex-shrink-0">
              <Brain className="w-6 h-6 text-gsrp-orange" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white mb-2">How It Works</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                You'll interact with an AI that acts as a regular player reporting rule violations. Respond as a staff member would in real situations.
                The AI will evaluate your responses and provide feedback at the end.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-gsrp-dark-surface/50 rounded-xl p-4">
              <Target className="w-5 h-5 text-gsrp-teal mb-2" />
              <h3 className="text-sm font-semibold text-white mb-1">{totalScenarios} Scenarios</h3>
              <p className="text-xs text-gray-500">Covering RDM, VDM, FRP, NLR, LTAP, and more</p>
            </div>
            <div className="bg-gsrp-dark-surface/50 rounded-xl p-4">
              <Lightbulb className="w-5 h-5 text-gsrp-gold mb-2" />
              <h3 className="text-sm font-semibold text-white mb-1">Hints Available</h3>
              <p className="text-xs text-gray-500">Use hints if you get stuck on a scenario</p>
            </div>
            <div className="bg-gsrp-dark-surface/50 rounded-xl p-4">
              <AlertTriangle className="w-5 h-5 text-gsrp-sunset mb-2" />
              <h3 className="text-sm font-semibold text-white mb-1">Decision Points</h3>
              <p className="text-xs text-gray-500">Choose actions like Warn, Kick, or Ban</p>
            </div>
            <div className="bg-gsrp-dark-surface/50 rounded-xl p-4">
              <Award className="w-5 h-5 text-gsrp-orange mb-2" />
              <h3 className="text-sm font-semibold text-white mb-1">One Attempt</h3>
              <p className="text-xs text-gray-500">This training can only be completed once</p>
            </div>
          </div>

          <div className="bg-gsrp-dark-surface/50 rounded-xl p-4 mb-6">
            <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-gsrp-gold" />
              Important Rules
            </h3>
            <ul className="text-xs text-gray-400 space-y-1.5">
              <li>Always ask for video proof before taking action</li>
              <li>Kill logs are NOT valid proof</li>
              <li>Be professional and follow the chain of command</li>
              <li>Only moderate when there are 20+ players in the server</li>
              <li>Use 4-letter commands while on duty</li>
            </ul>
          </div>

          <button
            onClick={startSession}
            disabled={loading}
            className="w-full py-3 bg-gsrp-orange text-white rounded-xl font-semibold hover:bg-gsrp-orange/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
            {loading ? 'Starting...' : 'Start Training'}
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'results' && resultsLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Award className="w-7 h-7 text-gsrp-orange" />
            Training Results
          </h1>
          <p className="text-gray-400 text-sm mt-1">Generating your personalized feedback...</p>
        </div>
        <div className="bg-gsrp-dark-card/50 border border-gsrp-dark-border/50 rounded-2xl p-12 text-center">
          <Loader2 className="w-12 h-12 text-gsrp-orange animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">AI is analyzing your performance across all scenarios</p>
          <p className="text-gray-600 text-xs mt-2">This may take a few seconds</p>
        </div>
      </div>
    );
  }

  if (phase === 'results' && results) {
    const percentage = results.maxScore > 0 ? Math.round((results.totalScore / results.maxScore) * 100) : 0;
    const passed = percentage >= 60;

    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Award className="w-7 h-7 text-gsrp-orange" />
            Training Results
          </h1>
          <p className="text-gray-400 text-sm mt-1">Here's how you performed in the scenario training.</p>
        </div>

        <div className="bg-gsrp-dark-card/50 border border-gsrp-dark-border/50 rounded-2xl p-6 md:p-8 mb-6">
          <div className="text-center mb-8">
            <div className={`w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center ${passed ? 'bg-green-400/10' : 'bg-red-400/10'}`}>
              {passed ? <Trophy className="w-12 h-12 text-green-400" /> : <XCircle className="w-12 h-12 text-red-400" />}
            </div>
            <h2 className={`text-2xl font-bold mb-2 ${passed ? 'text-green-400' : 'text-red-400'}`}>
              {passed ? 'Congratulations! You Passed!' : 'Training Not Passed'}
            </h2>
            <p className="text-gray-400">
              You scored <span className="text-white font-semibold">{results.totalScore}/{results.maxScore}</span> ({percentage}%)
            </p>
            <p className="text-xs text-gray-500 mt-1">Passing score: 60%</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-gsrp-dark-surface/50 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Scenarios Completed</p>
              <p className="text-xl font-bold text-white">{results.scenariosCompleted}</p>
            </div>
            <div className="bg-gsrp-dark-surface/50 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Best Scenario</p>
              <p className="text-xl font-bold text-gsrp-orange">{results.bestScenario || '—'}</p>
            </div>
            <div className="bg-gsrp-dark-surface/50 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Needs Improvement</p>
              <p className="text-xl font-bold text-gsrp-sunset">{results.worstScenario || '—'}</p>
            </div>
          </div>

          {results.overallComment && (
            <div className="mb-6 bg-gsrp-dark-surface/50 rounded-xl p-5 border border-gsrp-dark-border/30">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-gsrp-orange" />
                Trainer Feedback
                {results.aiGenerated && (
                  <span className="text-[10px] font-medium text-gsrp-teal bg-gsrp-teal/10 px-2 py-0.5 rounded-full">AI Generated</span>
                )}
              </h3>
              <p className="text-sm text-gray-300 leading-relaxed">{results.overallComment}</p>
            </div>
          )}

          <div className="mb-6">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Star className="w-4 h-4 text-gsrp-gold" />
              What You Did Well
            </h3>
            <div className="space-y-2">
              {results.strengths.map((s, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-green-400 bg-green-400/5 rounded-lg p-3">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-gsrp-gold" />
              Areas for Improvement
            </h3>
            <div className="space-y-2">
              {results.improvements.map((s, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-yellow-400 bg-yellow-400/5 rounded-lg p-3">
                  <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-semibold text-white mb-4">Scenario Breakdown</h3>
            <div className="space-y-3">
              {results.scenarioDetails.map((sd, i) => {
                const pct = sd.maxScore > 0 ? (sd.score / sd.maxScore) * 100 : 0;
                return (
                  <div key={i} className="bg-gsrp-dark-surface/50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-white">{sd.label || sd.type}</span>
                      <span className={`text-sm font-bold ${pct >= 70 ? 'text-green-400' : 'text-red-400'}`}>
                        {sd.score}/{sd.maxScore}
                      </span>
                    </div>
                    <div className="h-2 bg-gsrp-dark rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${pct >= 70 ? 'bg-green-400' : 'bg-red-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {sd.feedback && <p className="text-xs text-gray-500 mt-2">{sd.feedback}</p>}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleRetry}
              className="flex-1 py-3 bg-gsrp-orange text-white rounded-xl font-semibold hover:bg-gsrp-orange/90 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Retry Training
            </button>
            <button
              onClick={() => router.push('/training')}
              className="flex-1 py-3 bg-gsrp-dark-surface text-white rounded-xl font-semibold hover:bg-gsrp-dark-surface/80 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Training Hub
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'chat' && currentScenario) {
    return (
      <div className="max-w-4xl mx-auto h-[calc(100vh-140px)] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-3">
              <MessageSquare className="w-6 h-6 text-gsrp-orange" />
              Scenario Training
            </h1>
            <p className="text-gray-400 text-xs mt-0.5">
              Scenario {scenarioIndex + 1} of {totalScenarios} — {currentScenario.label}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hints.length > 0 && (
              <button
                onClick={() => setShowHint(!showHint)}
                className="px-3 py-1.5 bg-gsrp-gold/10 text-gsrp-gold rounded-lg text-xs font-medium hover:bg-gsrp-gold/20 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Lightbulb className="w-3.5 h-3.5" />
                Hint
              </button>
            )}
          </div>
        </div>

        <AnimatePresence>
          {showHint && hints.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 bg-gsrp-gold/5 border border-gsrp-gold/20 rounded-xl p-4"
            >
              <div className="flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-gsrp-gold flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-gsrp-gold mb-1">Training Hint</p>
                  <p className="text-xs text-gray-300">{hints[0]}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 bg-gsrp-dark-card/50 border border-gsrp-dark-border/50 rounded-2xl overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {messages.map((msg, i) => {
              if (msg.role === 'system') {
                return (
                  <div key={i} className="flex justify-center">
                    <span className="text-xs text-gray-600 bg-gsrp-dark-surface/50 px-3 py-1 rounded-full">
                      {msg.content}
                    </span>
                  </div>
                );
              }

              if (msg.role === 'user') {
                return (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[80%] bg-gsrp-orange/10 border border-gsrp-orange/20 rounded-2xl rounded-tr-sm px-4 py-3">
                      <p className="text-sm text-white">{msg.content}</p>
                    </div>
                  </div>
                );
              }

              return (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gsrp-dark-surface flex items-center justify-center flex-shrink-0">
                    <span className="text-xs">🎮</span>
                  </div>
                  <div className="max-w-[80%] bg-gsrp-dark-surface/50 border border-gsrp-dark-border/30 rounded-2xl rounded-tl-sm px-4 py-3">
                    <p className="text-sm text-gray-200">{msg.content}</p>
                  </div>
                </div>
              );
            })}
            {loading && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gsrp-dark-surface flex items-center justify-center flex-shrink-0">
                  <span className="text-xs">🎮</span>
                </div>
                <div className="bg-gsrp-dark-surface/50 border border-gsrp-dark-border/30 rounded-2xl px-4 py-3">
                  <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <AnimatePresence>
            {decisionPopup && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="border-t border-gsrp-dark-border/50 p-4 bg-gsrp-dark-surface/30"
              >
                <p className="text-xs font-semibold text-gsrp-orange mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  {decisionPopup.title}
                </p>
                <div className="flex flex-wrap gap-2">
                  {decisionPopup.options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => handleDecision(opt.value)}
                      disabled={loading}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer ${
                        opt.variant === 'danger'
                          ? 'bg-red-400/10 text-red-400 border border-red-400/20 hover:bg-red-400/20'
                          : opt.variant === 'warning'
                          ? 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 hover:bg-yellow-400/20'
                          : opt.variant === 'success'
                          ? 'bg-green-400/10 text-green-400 border border-green-400/20 hover:bg-green-400/20'
                          : 'bg-gsrp-dark-card text-gray-300 border border-gsrp-dark-border hover:border-gsrp-orange/30 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!decisionPopup && (
            <div className="border-t border-gsrp-dark-border/50 p-3">
              <form
                onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your response..."
                  disabled={loading}
                  className="flex-1 bg-gsrp-dark-surface/50 border border-gsrp-dark-border/30 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gsrp-orange/50 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="p-2.5 bg-gsrp-orange/10 text-gsrp-orange rounded-xl hover:bg-gsrp-orange/20 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}

export async function getServerSideProps(context) {
  const { isFullAdmin } = require('../../../lib/admin-helper');
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session) return { props: {} };

  const hasRole = session.user?.roles?.includes('1372476380096237609');
  const isAdmin = await isFullAdmin(session.user?.id, session.user?.roles || []);

  if (!hasRole && !isAdmin) return { redirect: { destination: '/', permanent: false } };

  return { props: {} };
}
