import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth-options';
import LoginScreen from '../../../components/auth/LoginScreen';
import {
  MessageSquare, Send, Loader2, Brain, Target, CheckCircle,
  XCircle, AlertTriangle, Star, Trophy, Lightbulb, Shield,
  ArrowLeft, Play, Award, RotateCcw, Terminal
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
  const [currentHint, setCurrentHint] = useState('');
  const [decisionHint, setDecisionHint] = useState('');
  const [results, setResults] = useState(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [completionData, setCompletionData] = useState(null);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') checkCompletion();
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
  }, [messages]);

  async function fetchHint(scenario, history) {
    try {
      const res = await fetch('/api/training/scenario/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario, chatHistory: history }),
      });
      const data = await res.json();
      if (data.ok) setCurrentHint(data.hint);
    } catch (err) {
      console.error('Hint error:', err);
    }
  }

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
        setCurrentHint('');
        setDecisionHint('');
        const openerHistory = [{ role: 'user', content: data.scenario.opener }];
        setMessages([{ role: 'ai', content: data.scenario.opener, timestamp: Date.now() }]);
        setPhase('chat');
        fetchHint(data.scenario, openerHistory);
      }
    } catch (err) {
      console.error('Failed to start session:', err);
    }
    setLoading(false);
  }

  async function sendMessage(text) {
    if (!text.trim() || loading) return;
    const userMsg = { role: 'user', content: text.trim(), timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const newHistory = [...messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'ai' ? 'model' : 'user',
      content: m.content,
    })), { role: 'user', content: text.trim() }];

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

      if (data.decisionHint) {
        setDecisionHint(data.decisionHint);
      }

      if (data.score !== undefined) {
        setScores(prev => [...prev, {
          scenario: currentScenario.type,
          label: currentScenario.label,
          score: data.score,
          maxScore: data.maxScore,
          feedback: data.feedback,
        }]);
        setTimeout(() => loadNextScenario(), 2500);
      }

      if (data.score !== undefined || data.ended) {
        const updatedHistory = [...newHistory, { role: 'model', content: data.response }];
        fetchHint(currentScenario, updatedHistory);
      } else {
        const updatedHistory = [...newHistory, { role: 'model', content: data.response }];
        fetchHint(currentScenario, updatedHistory);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [...prev, { role: 'system', content: 'Error. Try again.', timestamp: Date.now() }]);
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
          setCurrentHint('');
          setDecisionHint('');
          setMessages(prev => [...prev, {
            role: 'system',
            content: `--- Scenario ${nextIndex + 1} of ${totalScenarios}: ${data.scenario.label} ---`,
            timestamp: Date.now(),
          }, {
            role: 'ai',
            content: data.scenario.opener,
            timestamp: Date.now(),
          }]);
          fetchHint(data.scenario, [{ role: 'user', content: data.scenario.opener }]);
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
          <p className="text-gray-400 mb-6">You completed this on {completionData?.completedAt ? new Date(completionData.completedAt).toLocaleDateString() : 'N/A'}.</p>
          {completionData && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="bg-gsrp-dark-surface/50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Score</p>
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
                <p className="text-xs text-gray-500 mb-1">Result</p>
                <p className={`text-2xl font-bold ${completionData.passed ? 'text-green-400' : 'text-red-400'}`}>
                  {completionData.passed ? 'PASSED' : 'FAILED'}
                </p>
              </div>
            </div>
          )}
          <div className="flex gap-3 justify-center">
            <button onClick={handleRetry} className="px-6 py-3 bg-gsrp-orange text-white rounded-xl font-semibold hover:bg-gsrp-orange/90 transition-colors flex items-center gap-2 cursor-pointer">
              <RotateCcw className="w-4 h-4" /> Retry
            </button>
            <button onClick={() => router.push('/training')} className="px-6 py-3 bg-gsrp-dark-surface text-white rounded-xl font-semibold hover:bg-gsrp-dark-surface/80 transition-colors cursor-pointer">
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
          <p className="text-gray-400 text-sm mt-1">Practice handling real in-game moderation situations.</p>
        </div>
        <div className="bg-gsrp-dark-card/50 border border-gsrp-dark-border/50 rounded-2xl p-6 md:p-8 mb-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gsrp-orange/10 flex items-center justify-center flex-shrink-0">
              <Brain className="w-6 h-6 text-gsrp-orange" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white mb-2">How It Works</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                An AI player will report a rule violation to you. Respond like a real staff member would.
                Use commands like :warn :kick :ban or :jail to take action. Hints will always show to help you learn.
              </p>
            </div>
          </div>

          <div className="bg-gsrp-dark-surface/50 rounded-xl p-4 mb-6">
            <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-gsrp-teal" />
              Commands You Can Use
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-gray-400">
              <div className="bg-gsrp-dark-card/50 rounded-lg p-2"><span className="text-gsrp-orange font-mono">:warn</span> Warn a player</div>
              <div className="bg-gsrp-dark-card/50 rounded-lg p-2"><span className="text-gsrp-orange font-mono">:kick</span> Kick a player</div>
              <div className="bg-gsrp-dark-card/50 rounded-lg p-2"><span className="text-gsrp-orange font-mono">:ban</span> Ban a player</div>
              <div className="bg-gsrp-dark-card/50 rounded-lg p-2"><span className="text-gsrp-orange font-mono">:jail</span> Put in ban jail</div>
              <div className="bg-gsrp-dark-card/50 rounded-lg p-2"><span className="text-gsrp-orange font-mono">:view</span> See what player is doing</div>
              <div className="bg-gsrp-dark-card/50 rounded-lg p-2"><span className="text-gsrp-orange font-mono">:load</span> Load player info</div>
            </div>
          </div>

          <div className="bg-gsrp-dark-surface/50 rounded-xl p-4 mb-6">
            <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-gsrp-gold" />
              Important Rules
            </h3>
            <ul className="text-xs text-gray-400 space-y-1.5">
              <li>Always ask for video proof before punishing anyone</li>
              <li>Kill logs are NOT valid proof</li>
              <li>For LTAP server logs are enough proof</li>
              <li>Be professional and follow the chain of command</li>
              <li>Hints will guide you through each step</li>
            </ul>
          </div>

          <button onClick={startSession} disabled={loading} className="w-full py-3 bg-gsrp-orange text-white rounded-xl font-semibold hover:bg-gsrp-orange/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer">
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
          <p className="text-gray-400 text-sm mt-1">Generating your feedback...</p>
        </div>
        <div className="bg-gsrp-dark-card/50 border border-gsrp-dark-border/50 rounded-2xl p-12 text-center">
          <Loader2 className="w-12 h-12 text-gsrp-orange animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">AI is checking your performance</p>
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
          <p className="text-gray-400 text-sm mt-1">Here is how you did.</p>
        </div>
        <div className="bg-gsrp-dark-card/50 border border-gsrp-dark-border/50 rounded-2xl p-6 md:p-8 mb-6">
          <div className="text-center mb-8">
            <div className={`w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center ${passed ? 'bg-green-400/10' : 'bg-red-400/10'}`}>
              {passed ? <Trophy className="w-12 h-12 text-green-400" /> : <XCircle className="w-12 h-12 text-red-400" />}
            </div>
            <h2 className={`text-2xl font-bold mb-2 ${passed ? 'text-green-400' : 'text-red-400'}`}>
              {passed ? 'You Passed!' : 'Not Passed'}
            </h2>
            <p className="text-gray-400">
              Score: <span className="text-white font-semibold">{results.totalScore}/{results.maxScore}</span> ({percentage}%)
            </p>
            <p className="text-xs text-gray-500 mt-1">You need 60% to pass</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-gsrp-dark-surface/50 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Scenarios</p>
              <p className="text-xl font-bold text-white">{results.scenariosCompleted}</p>
            </div>
            <div className="bg-gsrp-dark-surface/50 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Best</p>
              <p className="text-xl font-bold text-gsrp-orange">{results.bestScenario || '—'}</p>
            </div>
            <div className="bg-gsrp-dark-surface/50 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Needs Work</p>
              <p className="text-xl font-bold text-gsrp-sunset">{results.worstScenario || '—'}</p>
            </div>
          </div>

          {results.overallComment && (
            <div className="mb-6 bg-gsrp-dark-surface/50 rounded-xl p-5 border border-gsrp-dark-border/30">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-gsrp-orange" />
                Trainer Feedback
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
              Things to Work On
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
                      <div className={`h-full rounded-full transition-all ${pct >= 70 ? 'bg-green-400' : 'bg-red-400'}`} style={{ width: `${pct}%` }} />
                    </div>
                    {sd.feedback && <p className="text-xs text-gray-500 mt-2">{sd.feedback}</p>}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={handleRetry} className="flex-1 py-3 bg-gsrp-orange text-white rounded-xl font-semibold hover:bg-gsrp-orange/90 transition-colors flex items-center justify-center gap-2 cursor-pointer">
              <RotateCcw className="w-4 h-4" /> Retry
            </button>
            <button onClick={() => router.push('/training')} className="flex-1 py-3 bg-gsrp-dark-surface text-white rounded-xl font-semibold hover:bg-gsrp-dark-surface/80 transition-colors flex items-center justify-center gap-2 cursor-pointer">
              <ArrowLeft className="w-4 h-4" /> Back to Training
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'chat' && currentScenario) {
    return (
      <div className="max-w-4xl mx-auto h-[calc(100vh-140px)] flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-3">
              <MessageSquare className="w-6 h-6 text-gsrp-orange" />
              Scenario Training
            </h1>
            <p className="text-gray-400 text-xs mt-0.5">
              Scenario {scenarioIndex + 1} of {totalScenarios} — {currentScenario.label}
            </p>
          </div>
        </div>

        <div className="mb-3 bg-gsrp-gold/5 border border-gsrp-gold/20 rounded-xl p-3">
          <div className="flex items-start gap-2">
            <Lightbulb className="w-4 h-4 text-gsrp-gold flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-semibold text-gsrp-gold mb-0.5 uppercase tracking-wider">Hint</p>
              <p className="text-xs text-gray-300">{currentHint || 'Ask the player for video proof of what happened.'}</p>
            </div>
          </div>
        </div>

        {decisionHint && (
          <div className="mb-3 bg-gsrp-teal/5 border border-gsrp-teal/20 rounded-xl p-3">
            <div className="flex items-start gap-2">
              <Terminal className="w-4 h-4 text-gsrp-teal flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-semibold text-gsrp-teal mb-0.5 uppercase tracking-wider">Ready to Act</p>
                <p className="text-xs text-gray-300">{decisionHint}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 bg-gsrp-dark-card/50 border border-gsrp-dark-border/50 rounded-2xl overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {messages.map((msg, i) => {
              if (msg.role === 'system') {
                return (
                  <div key={i} className="flex justify-center">
                    <span className="text-xs text-gray-600 bg-gsrp-dark-surface/50 px-3 py-1 rounded-full">{msg.content}</span>
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

          <div className="border-t border-gsrp-dark-border/50 p-3">
            <div className="flex flex-wrap gap-2 mb-2">
              <button
                onClick={() => sendMessage('Ask something else')}
                className="px-3 py-1.5 bg-gsrp-dark-surface text-gray-300 rounded-lg text-xs font-medium hover:bg-gsrp-dark-surface/80 hover:text-white transition-colors cursor-pointer"
              >
                Ask something else
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message or use :warn :kick :ban :jail :view"
                disabled={loading}
                className="flex-1 bg-gsrp-dark-surface/50 border border-gsrp-dark-border/30 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gsrp-orange/50 disabled:opacity-50"
              />
              <button type="submit" disabled={loading || !input.trim()} className="p-2.5 bg-gsrp-orange/10 text-gsrp-orange rounded-xl hover:bg-gsrp-orange/20 transition-colors disabled:opacity-50 cursor-pointer">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
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
