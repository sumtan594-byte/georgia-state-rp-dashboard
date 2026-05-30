import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Loader2, BookOpen, Terminal, Shield, AlertTriangle, RotateCcw, ChevronRight, Clock, Play, Trash2, CheckCircle2, Lock } from 'lucide-react';
import { useRouter } from 'next/router';
import LoginScreen from '../../components/auth/LoginScreen';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../lib/auth-options';
import { useRefreshedUser } from '../../lib/UserRefreshContext';
import AccessDenied from '../../components/auth/AccessDenied';
import QuizWarning from '../../components/training/QuizWarning';
import QuizEngine from '../../components/training/QuizEngine';
import CustomCommandsSection from '../../components/training/CustomCommands';
import {
  QUESTION_BANK,
  QUIZ_CONFIG,
  generateQuizSet,
  generateRetryQuizSet,
  getQuestionIds,
} from '../../lib/quiz-questions';

export default function TrainingPage() {
  const { data: session, status } = useSession();
  const { session: refreshedSession, hasRefreshed, accessDenied } = useRefreshedUser();
  const effectiveSession = refreshedSession || session;
  const router = useRouter();

  const [progressChecked, setProgressChecked] = useState(false);
  const [checkingProgress, setCheckingProgress] = useState(true);
  const [handbookCompleted, setHandbookCompleted] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [previousQuestionIds, setPreviousQuestionIds] = useState([]);
  const [cooldownUntil, setCooldownUntil] = useState(null);
  const [hasPassed, setHasPassed] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const [commandsVisible, setCommandsVisible] = useState(false);
  const [savedSession, setSavedSession] = useState(null);
  const [resumeData, setResumeData] = useState(null);
  const [resumeDismissed, setResumeDismissed] = useState(false);
  const [ridealongPassed, setRidealongPassed] = useState(false);
  const [ridealongChecked, setRidealongChecked] = useState(false);
  const sessionCheckDone = useRef(false);

  // Check for saved quiz session from DB
  useEffect(() => {
    if (!progressChecked || !effectiveSession || sessionCheckDone.current) return;
    sessionCheckDone.current = true;
    fetch(`/api/training/session?userId=${effectiveSession.user.id}`)
      .then(r => r.json())
      .then(d => { if (d.data) setSavedSession(d.data); })
      .catch(() => {});
  }, [progressChecked, effectiveSession]);

  // Check handbook progress
  useEffect(() => {
    if (status === 'unauthenticated') return;
    if (!hasRefreshed || !effectiveSession) return;
    if (accessDenied) return;

    async function checkProgress() {
      try {
        const res = await fetch('/api/training/progress');
        const data = await res.json();
        setHandbookCompleted(data.handbookCompleted);
        if (!data.handbookCompleted) {
          router.push('/training/handbook');
        } else {
          setProgressChecked(true);
        }
      } catch (e) {
        console.error('Progress check failed', e);
        router.push('/training/handbook');
      } finally {
        setCheckingProgress(false);
      }
    }
    checkProgress();
  }, [status, hasRefreshed, effectiveSession, accessDenied, router]);

  // Check cooldown / pass status
  useEffect(() => {
    if (!progressChecked || !effectiveSession) return;
    async function checkStatus() {
      try {
        const [cooldownRes, ridealongRes] = await Promise.all([
          fetch(`/api/training/cooldown?userId=${effectiveSession.user.id}`),
          fetch(`/api/training/ridealong/progress?userId=${effectiveSession.user.id}`),
        ]);
        const data = await cooldownRes.json();
        if (data.hasPassed) {
          setHasPassed(true);
        } else if (data.isOnCooldown && data.cooldownUntil) {
          const until = new Date(data.cooldownUntil);
          if (until > new Date()) {
            setCooldownUntil(data.cooldownUntil);
          }
        }

        const ridealongData = await ridealongRes.json();
        setRidealongPassed(ridealongData.hasPassed);
        setRidealongChecked(true);
      } catch (e) {
        console.warn('Status check failed:', e);
      }
    }
    checkStatus();
  }, [progressChecked, effectiveSession]);

  // Intersection observer for commands section
  useEffect(() => {
    if (!showCommands) return;
    const el = document.getElementById('commands-section');
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setCommandsVisible(true); },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [showCommands]);

  const handleStartQuiz = useCallback((isRetry = false) => {
    setShowWarning(false);
    if (isRetry && previousQuestionIds.length > 0) {
      const newQuestions = generateRetryQuizSet(previousQuestionIds);
      setQuestions(newQuestions);
    } else {
      const newQuestions = generateQuizSet();
      setQuestions(newQuestions);
    }
    setQuizStarted(true);
    setSavedSession(null);
  }, [previousQuestionIds]);

  const handleResume = useCallback(() => {
    if (!savedSession || !effectiveSession) return;
    setResumeData(savedSession);
    setQuestions(savedSession.questions);
    setQuizStarted(true);
    setSavedSession(null);
  }, [savedSession, effectiveSession]);

  const handleDiscardSession = useCallback(async () => {
    if (!effectiveSession) return;
    try {
      await fetch('/api/training/session', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: effectiveSession.user.id }),
      });
    } catch {}
    setSavedSession(null);
    setResumeDismissed(true);
  }, [effectiveSession]);

  const handleSaveProgress = useCallback(async (state) => {
    if (!effectiveSession || !questions.length) return;
    try {
      await fetch('/api/training/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: effectiveSession.user.id,
          data: { ...state, questions },
        }),
      });
    } catch {}
  }, [effectiveSession, questions]);

  const handleClearProgress = useCallback(async () => {
    if (!effectiveSession) return;
    try {
      await fetch('/api/training/session', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: effectiveSession.user.id }),
      });
    } catch {}
  }, [effectiveSession]);

  const handleSubmit = useCallback(async (result) => {
    try {
      const res = await fetch('/api/training/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: effectiveSession.user.id,
          username: effectiveSession.user.name,
          globalName: effectiveSession.user.name,
          avatar: effectiveSession.user.avatar,
          score: result.score,
          total: result.total,
          pct: result.pct,
          pass: result.pass,
          timestamp: new Date().toISOString(),
          answers: result.answers.map(a => ({
            question: a.question,
            correct: a.correct,
            chosen: a.chosen,
            answer: a.correctAnswer,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'Already passed') {
          setHasPassed(true);
        } else if (data.error === 'Cooldown active') {
          setCooldownUntil(data.cooldownUntil);
        }
      }
      if (!result.pass && data.cooldownUntil) {
        setCooldownUntil(data.cooldownUntil);
      }
    } catch (e) {
      console.warn('Submit failed:', e);
    }
  }, [effectiveSession]);

  // Loading states
  if (status === 'loading' || checkingProgress || !hasRefreshed) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center">
          <Loader2 className="w-8 h-8 text-gsrp-orange animate-spin mb-4" />
          <span className="text-gsrp-teal-light/40 font-mono text-[9px] uppercase tracking-[0.3em]">Verifying Handbook Completion</span>
        </div>
      </div>
    );
  }

  if (!session) return <LoginScreen />;
  if (accessDenied) return <AccessDenied roleId={accessDenied.roleId} />;

  // Already passed
  if (hasPassed) {
    return (
      <div className="max-w-2xl mx-auto animate-scale-in">
        <div className="card-glass rounded-3xl border border-gsrp-teal/30 p-8 text-center">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gsrp-teal via-gsrp-teal-light to-gsrp-teal rounded-t-3xl" />
          <div className="flex items-center justify-center w-20 h-20 rounded-full mx-auto mb-6 bg-gsrp-teal/10 border-2 border-gsrp-teal/30">
            <Shield size={36} className="text-gsrp-teal-light" />
          </div>
          <h2 className="text-3xl font-black text-white mb-2">Training Complete!</h2>
          <p className="text-gsrp-teal-light/50 text-sm mb-6">
            {ridealongPassed
              ? 'You have completed both the quiz and the ridealong simulation. Your Discord roles have been updated.'
              : 'You have passed the SSD Training Quiz. Complete the ridealong simulation to advance.'}
          </p>
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              {!ridealongPassed && (
                <button
                  onClick={() => router.push('/training/ridealong')}
                  className="flex-1 px-5 py-3 bg-gradient-to-r from-gsrp-orange to-gsrp-orange-light text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Shield size={16} />
                  Start Ridealong Simulation
                </button>
              )}
              <a
                href="https://discord.com/channels/1366688107788894280/1448577067607130183"
                target="_blank"
                rel="noopener noreferrer"
                className={`px-5 py-3 bg-gsrp-dark-surface border border-gsrp-dark-border rounded-xl text-gsrp-teal-light/60 font-bold text-sm hover:border-gsrp-teal/30 transition-all cursor-pointer flex items-center justify-center gap-2 ${ridealongPassed ? 'flex-1' : ''}`}
              >
                Request Ridealong
              </a>
              {ridealongPassed && (
                <button
                  onClick={() => router.push('/')}
                  className="flex-1 px-5 py-3 bg-gsrp-teal text-white rounded-xl font-bold text-sm hover:bg-gsrp-teal/90 transition-all cursor-pointer"
                >
                  Return Home
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // On cooldown
  if (cooldownUntil) {
    const until = new Date(cooldownUntil);
    const remaining = until - new Date();
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const mins = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

    return (
      <div className="max-w-2xl mx-auto animate-scale-in">
        <div className="card-glass rounded-3xl border border-gsrp-sunset/30 p-8 text-center">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gsrp-sunset via-gsrp-orange to-gsrp-sunset rounded-t-3xl" />
          <div className="flex items-center justify-center w-20 h-20 rounded-full mx-auto mb-6 bg-gsrp-sunset/10 border-2 border-gsrp-sunset/30">
            <Clock size={36} className="text-gsrp-sunset" />
          </div>
          <h2 className="text-3xl font-black text-white mb-2">Quiz on Cooldown</h2>
          <p className="text-gsrp-teal-light/50 text-sm mb-2">
            You must wait before retaking the quiz.
          </p>
          <p className="text-gsrp-orange text-2xl font-black mb-6">
            {hours}h {mins}m
          </p>
          <div className="bg-gsrp-dark-surface/50 rounded-xl p-4 mb-6">
            <p className="text-gsrp-teal-light/40 text-xs">
              Use this time to review the{' '}
              <button
                onClick={() => router.push('/training/handbook')}
                className="text-gsrp-orange hover:underline cursor-pointer"
              >
                Staff Handbook
              </button>{' '}
              and study the custom commands.
            </p>
          </div>
          <button
            onClick={() => router.push('/training/handbook')}
            className="w-full px-5 py-3 bg-gsrp-dark-surface border border-gsrp-dark-border rounded-xl text-gsrp-teal-light/60 font-bold text-sm hover:border-gsrp-teal/30 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <BookOpen size={16} />
            Review Handbook
          </button>
        </div>
      </div>
    );
  }

  // Quiz in progress
  if (quizStarted && questions.length > 0) {
    return (
      <div className="max-w-4xl mx-auto animate-fade-in-up">
        <QuizEngine
          questions={questions}
          passScore={QUIZ_CONFIG.PASS_SCORE}
          cooldownHours={QUIZ_CONFIG.COOLDOWN_HOURS}
          onSubmit={handleSubmit}
          user={effectiveSession.user}
          isRetry={previousQuestionIds.length > 0}
          initialState={resumeData ? { currentQ: resumeData.currentQ, score: resumeData.score, userAnswers: resumeData.userAnswers } : undefined}
          onSaveProgress={handleSaveProgress}
          onClearProgress={handleClearProgress}
        />
      </div>
    );
  }

  // Pre-quiz landing
  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-2">
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gsrp-orange/10 border border-gsrp-orange/20">
          <Shield size={26} className="text-gsrp-orange" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">SSD Training Quiz</h1>
          <p className="text-gsrp-teal-light/40 text-xs font-medium">Staff Standards & Development — Georgia State Roleplay</p>
        </div>
      </div>

      {/* Info Cards */}
  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
  <div className="card-glass rounded-2xl border border-gsrp-dark-border/50 p-5">
    <div className="flex items-center gap-3 mb-3">
      <div className="w-10 h-10 rounded-xl bg-gsrp-orange/10 flex items-center justify-center">
        <AlertTriangle size={18} className="text-gsrp-orange" />
      </div>
      <h3 className="text-sm font-black text-white">Pass Score</h3>
    </div>
    <p className="text-2xl font-black text-gsrp-orange">7/10</p>
    <p className="text-xs text-gsrp-teal-light/30 mt-1">70% required to pass</p>
  </div>

  <div className="card-glass rounded-2xl border border-gsrp-dark-border/50 p-5">
    <div className="flex items-center gap-3 mb-3">
      <div className="w-10 h-10 rounded-xl bg-gsrp-sunset/10 flex items-center justify-center">
        <RotateCcw size={18} className="text-gsrp-sunset" />
      </div>
      <h3 className="text-sm font-black text-white">Cooldown</h3>
    </div>
    <p className="text-2xl font-black text-gsrp-sunset">{QUIZ_CONFIG.COOLDOWN_HOURS}h</p>
    <p className="text-xs text-gsrp-teal-light/30 mt-1">Between failed attempts</p>
  </div>

  <div className="card-glass rounded-2xl border border-gsrp-dark-border/50 p-5">
    <div className="flex items-center gap-3 mb-3">
      <div className="w-10 h-10 rounded-xl bg-gsrp-teal/10 flex items-center justify-center">
        <BookOpen size={18} className="text-gsrp-teal-light" />
      </div>
      <h3 className="text-sm font-black text-white">Questions</h3>
    </div>
    <p className="text-2xl font-black text-gsrp-teal-light">{QUIZ_CONFIG.TOTAL_QUESTIONS}</p>
    <p className="text-xs text-gsrp-teal-light/30 mt-1">Randomised each attempt</p>
  </div>

  <div className="card-glass rounded-2xl border border-gsrp-teal/20 p-5">
    <div className="flex items-center gap-3 mb-3">
      <div className="w-10 h-10 rounded-xl bg-gsrp-teal/10 flex items-center justify-center">
        <BookOpen size={18} className="text-gsrp-teal-light" />
      </div>
      <h3 className="text-sm font-black text-gsrp-teal-light">Open Book</h3>
    </div>
    <p className="text-xs text-gsrp-teal-light/50">Handbook accessible at any time during the quiz</p>
  </div>
</div>

      {/* Resume Banner */}
      {savedSession && !resumeDismissed && (
        <div className="card-glass rounded-2xl border border-gsrp-teal/30 p-5 animate-fade-in-up">
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gsrp-teal/10 shrink-0">
              <Clock size={22} className="text-gsrp-teal-light" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-black text-gsrp-teal-light mb-1">Quiz in Progress</h3>
              <p className="text-xs text-gsrp-teal-light/50 mb-1">
                You were on question {savedSession.currentQ + 1} of {savedSession.questions?.length || QUIZ_CONFIG.TOTAL_QUESTIONS} with a score of {savedSession.score}.
              </p>
              <p className="text-[10px] text-gsrp-teal-light/30">
                Saved {new Date(savedSession.timestamp).toLocaleTimeString()}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={handleResume}
                className="px-4 py-2 bg-gsrp-teal text-white rounded-lg text-xs font-bold hover:bg-gsrp-teal/90 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Play size={12} />
                Resume
              </button>
              <button
                onClick={handleDiscardSession}
                className="px-4 py-2 bg-gsrp-dark-surface border border-gsrp-dark-border text-gsrp-teal-light/40 rounded-lg text-xs font-bold hover:border-gsrp-sunset/30 hover:text-gsrp-sunset transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 size={12} />
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Start Quiz Button */}
      <div className="flex justify-center py-4">
        <button
          onClick={() => setShowWarning(true)}
          className="group px-10 py-4 bg-gradient-to-r from-gsrp-orange to-gsrp-orange-light text-white font-black text-lg rounded-2xl shadow-lg shadow-gsrp-orange/20 hover:shadow-gsrp-orange/30 transition-all cursor-pointer flex items-center gap-3"
        >
          <Shield size={20} />
          Start Quiz
          <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

{/* What to expect */}
<div className="card-glass rounded-2xl border border-gsrp-dark-border/50 p-6">
  <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4">What to Expect</h3>
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
  {[
    { label: 'In-Game Punishments', count: '~2 questions', color: 'text-gsrp-orange' },
    { label: 'Staff Rules', count: '~2 questions', color: 'text-gsrp-teal-light' },
    { label: 'Staff Discipline', count: '~2 questions', color: 'text-gsrp-gold' },
    { label: 'Custom Commands', count: '~1 question', color: 'text-gsrp-cyan' },
    { label: 'Vehicles & Patrol', count: '~1 question', color: 'text-gsrp-sky' },
    { label: 'Roleplay Logging', count: '~1 question', color: 'text-gsrp-purple' },
    { label: 'Punishment Logging', count: '~1 question', color: 'text-gsrp-pink' },
  ].map((item, i) => (
    <div key={i} className="flex items-center justify-between p-3 bg-gsrp-dark-surface/40 rounded-xl">
      <span className="text-sm text-gsrp-teal-light/60">{item.label}</span>
      <span className={`text-xs font-bold ${item.color}`}>{item.count}</span>
    </div>
  ))}
</div>
<p className="text-xs text-gsrp-teal-light/30 mt-4">Questions are randomly selected from a pool of 65+. Each retry swaps at least 40% of questions. Interactive simulation questions require you to complete multi-step workflows. </p>
</div>
          ))}
        </div>
        <p className="text-xs text-gsrp-teal-light/30 mt-4">
          Questions are randomly selected from a pool of 50+. Each retry swaps at least 40% of questions to prevent memorisation.
        </p>
      </div>

      {/* Ridealong Simulation */}
      <div className="card-glass rounded-2xl border border-gsrp-teal/20 p-6">
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gsrp-teal/10 border border-gsrp-teal/20 shrink-0">
            <Shield size={22} className="text-gsrp-teal-light" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-black text-gsrp-teal-light mb-1">Ridealong Simulation</h3>
            <p className="text-xs text-gsrp-teal-light/50 mb-3">
              After passing the quiz, test your skills with simulated mod calls. Review video evidence and decide the correct course of action.
            </p>
              {hasPassed ? (
              ridealongPassed ? (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-gsrp-teal-light bg-gsrp-teal/10 px-3 py-1.5 rounded-lg">
                  <CheckCircle2 size={10} />
                  Completed
                </span>
              ) : (
                <button
                  onClick={() => router.push('/training/ridealong')}
                  className="px-4 py-2 bg-gsrp-teal text-white rounded-lg text-xs font-bold hover:bg-gsrp-teal/90 transition-all cursor-pointer"
                >
                  Start Ridealong
                </button>
              )
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[10px] text-gsrp-teal-light/30 bg-gsrp-dark-surface/50 px-3 py-1.5 rounded-lg">
                <Lock size={10} />
                Pass the quiz first
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Custom Commands Reference */}
      <div id="commands-section">
        <CustomCommandsSection isVisible={commandsVisible} />
      </div>

      {/* Warning Modal */}
      {showWarning && (
        <QuizWarning
          onProceed={() => handleStartQuiz(false)}
          onGoToHandbook={() => router.push('/training/handbook')}
        />
      )}
    </div>
  );
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);
  return { props: {} };
}
