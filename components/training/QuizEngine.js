import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, CheckCircle2, XCircle, ArrowRight, RotateCcw, BookOpen, Clock, AlertTriangle, ChevronDown, ChevronUp, Eye, X } from 'lucide-react';
import Link from 'next/link';

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Mock Roblox username list for autocomplete
const ALL_MOCK_USERS = [
  'Killer_X99', 'Speedy_Racer42', 'ShadowCop_LC', 'NoobMaster2007',
  'xXFastBoyXx', 'GTA_Enjoyer', 'RP_King_01', 'ChaoticNeutral',
  'DriftKing_LC', 'SilentTrooper', 'BountyHunter99', 'RoadRage_Pro',
  'CivilianJoe', 'TacticalOwl', 'NightHawk_LC', 'PixelBandit',
  'TurboVandal', 'CopBlockr', 'SpeedDemon_X', 'GhostRider_LC',
  'RogueElement', 'BlazeFury', 'StealthOps', 'UrbanRaider',
];

export default function QuizEngine({
  questions, passScore, cooldownHours, onSubmit, user, isRetry,
  initialState, onSaveProgress, onClearProgress,
}) {
  const [currentQ, setCurrentQ] = useState(initialState?.currentQ ?? 0);
  const [score, setScore] = useState(initialState?.score ?? 0);
  const [userAnswers, setUserAnswers] = useState(initialState?.userAnswers ?? []);
  const [showResults, setShowResults] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(null);
  const [hasPassed, setHasPassed] = useState(false);
  const [reviewExpanded, setReviewExpanded] = useState({});
  const containerRef = useRef(null);
  const initializedRef = useRef(false);

  // Per-question interactive state — keyed by question id
  const [interactiveState, setInteractiveState] = useState({});

  // Restore answered state if resuming
  useEffect(() => {
    if (initialState && !initializedRef.current) {
      initializedRef.current = true;
      if (initialState.userAnswers && initialState.userAnswers.length > initialState.currentQ) {
        // Mark all previous questions as answered
        const restored = {};
        for (let i = 0; i < initialState.currentQ; i++) {
          restored[i] = { answered: true, correct: initialState.userAnswers[i]?.correct ?? false };
        }
        setInteractiveState(restored);
      }
    }
  }, []);

  const question = questions[currentQ];
  const progress = ((currentQ + (!!interactiveState[currentQ]?.answered ? 1 : 0)) / questions.length) * 100;

  const currentInteractive = interactiveState[currentQ] || {};
  const isQuestionAnswered = !!currentInteractive.answered;

  // Reset state for new question
  useEffect(() => {
    if (!interactiveState[currentQ]) {
      setInteractiveState(prev => ({
        ...prev,
        [currentQ]: question?.type === 'rp-log'
          ? { phase: 'idle', rpAction: null, rpFinalChoice: null, answered: false, correct: false }
          : question?.type === 'p-log'
          ? { phase: 'idle', formData: null, answered: false, correct: false }
          : { selectedMC: null, selectedTF: null, answered: false },
      }));
    }
  }, [currentQ, question?.type]);

  // ── MC / TF check ──────────────────────────────────────────────────────────
  const handleCheck = useCallback(() => {
    if (!question || isQuestionAnswered) return;
    const state = interactiveState[currentQ];

    let isCorrect = false;
    let chosen = '';
    let correct = '';

    if (question.type === 'mc') {
      if (state.selectedMC === null) return;
      isCorrect = state.selectedMC === question.correct;
      chosen = question.options[state.selectedMC];
      correct = question.options[question.correct];
    } else if (question.type === 'tf') {
      if (state.selectedTF === null) return;
      isCorrect = state.selectedTF === question.correct;
      chosen = state.selectedTF ? 'True' : 'False';
      correct = question.correct ? 'True' : 'False';
    }

    if (isCorrect) setScore(prev => prev + 1);

    setUserAnswers(prev => {
      const next = [...prev, {
        correct: isCorrect,
        chosen,
        correctAnswer: correct,
        question: question.text,
        explanation: question.explanation,
        section: question.section,
        questionType: question.type,
      }];
      if (onSaveProgress) {
        onSaveProgress({ currentQ, score: score + (isCorrect ? 1 : 0), userAnswers: next });
      }
      return next;
    });

    setInteractiveState(prev => ({
      ...prev,
      [currentQ]: { ...prev[currentQ], answered: true, correct: isCorrect },
    }));
  }, [question, currentQ, interactiveState, isQuestionAnswered, score, onSaveProgress]);

  // ── RP-Log handlers ────────────────────────────────────────────────────────
  const handleRPAskDetails = useCallback(() => {
    setInteractiveState(prev => ({
      ...prev,
      [currentQ]: { ...prev[currentQ], phase: 'details-shown' },
    }));
  }, [currentQ]);

  const handleRPFirstAction = useCallback((action) => {
    setInteractiveState(prev => ({
      ...prev,
      [currentQ]: { ...prev[currentQ], rpAction: action },
    }));

    if (action === 'log') {
      // Wrong — trainee tried to log before checking
      const newCorrect = false;
      setUserAnswers(prev => {
        const next = [...prev, {
          correct: false,
          chosen: 'Logged without checking roleplay logs',
          correctAnswer: 'Check roleplay logs first, then log if no conflict',
          question: question.text,
          explanation: question.explanation,
          section: question.section,
          questionType: question.type,
          rpWrongAction: 'log-first',
        }];
        if (onSaveProgress) {
          onSaveProgress({ currentQ, score, userAnswers: next });
        }
        return next;
      });

      setInteractiveState(prev => ({
        ...prev,
        [currentQ]: { ...prev[currentQ], answered: true, correct: false, phase: 'answered' },
      }));
    } else {
      // Check — show the log dialog
      setInteractiveState(prev => ({
        ...prev,
        [currentQ]: { ...prev[currentQ], phase: 'logs-shown' },
      }));
    }
  }, [currentQ, question, score, onSaveProgress]);

  const handleRPCloseLogs = useCallback(() => {
    setInteractiveState(prev => ({
      ...prev,
      [currentQ]: { ...prev[currentQ], phase: 'final-choice' },
    }));
  }, [currentQ]);

  const handleRPFinalChoice = useCallback((choiceIndex) => {
    const state = interactiveState[currentQ];
    const scenario = question.scenario; // 'no-ongoing' or 'ongoing'
    const correctAnswer = question.correctAnswer;

    const isCorrect = scenario === 'no-ongoing'
      ? choiceIndex === (question.options.indexOf(correctAnswer) !== -1 ? question.options.indexOf(correctAnswer) : 0)
      : choiceIndex !== (question.options.indexOf(correctAnswer) !== -1 ? question.options.indexOf(correctAnswer) : 0);

    // More direct check: compare the chosen text with the correct answer
    const chosenText = question.options[choiceIndex];
    const actualCorrect = chosenText === correctAnswer;

    if (actualCorrect) setScore(prev => prev + 1);

    setUserAnswers(prev => {
      const next = [...prev, {
        correct: actualCorrect,
        chosen: chosenText,
        correctAnswer,
        question: question.text,
        explanation: question.explanation,
        section: question.section,
        questionType: question.type,
      }];
      if (onSaveProgress) {
        onSaveProgress({ currentQ, score: score + (actualCorrect ? 1 : 0), userAnswers: next });
      }
      return next;
    });

    setInteractiveState(prev => ({
      ...prev,
      [currentQ]: { ...prev[currentQ], answered: true, correct: actualCorrect, rpFinalChoice: choiceIndex, phase: 'answered' },
    }));
  }, [currentQ, question, score, onSaveProgress]);

  // ── P-Log handlers ─────────────────────────────────────────────────────────
  const handlePFormChange = useCallback((field, value) => {
    setInteractiveState(prev => ({
      ...prev,
      [currentQ]: {
        ...prev[currentQ],
        phase: 'form-editing',
        formData: { ...prev[currentQ].formData, [field]: value },
      },
    }));
  }, [currentQ]);

  const handlePSubmit = useCallback(() => {
    const state = interactiveState[currentQ];
    const formData = state.formData || {};
    if (!formData.username || !formData.punishment || !formData.reason) return;

    const isCorrect =
      formData.username === question.offender &&
      formData.punishment === question.correctPunishment &&
      formData.reason === question.correctReason;

    if (isCorrect) setScore(prev => prev + 1);

    setInteractiveState(prev => ({
      ...prev,
      [currentQ]: { ...prev[currentQ], phase: 'answered', correct: isCorrect, formData },
    }));

    setUserAnswers(prev => {
      const next = [...prev, {
        correct: isCorrect,
        chosen: `${formData.punishment} | ${formData.username} | ${formData.reason}`,
        correctAnswer: `${question.correctPunishment} | ${question.offender} | ${question.correctReason}`,
        question: question.text,
        explanation: question.explanation,
        section: question.section,
        questionType: question.type,
      }];
      if (onSaveProgress) {
        onSaveProgress({ currentQ, score: score + (isCorrect ? 1 : 0), userAnswers: next });
      }
      return next;
    });
  }, [currentQ, question, score, onSaveProgress]);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const handleNext = useCallback(() => {
    if (currentQ + 1 >= questions.length) {
      const finalScore = score;
      const passed = finalScore >= passScore;
      setHasPassed(passed);
      setShowResults(true);
      if (onClearProgress) onClearProgress();

      if (!passed) {
        const cooldownMs = cooldownHours * 60 * 60 * 1000;
        setCooldownUntil(new Date(Date.now() + cooldownMs).toISOString());
      }

      setSubmitting(true);
      onSubmit({
        score: finalScore,
        total: questions.length,
        pct: Math.round((finalScore / questions.length) * 100),
        pass: passed,
        answers: userAnswers,
      }).finally(() => setSubmitting(false));
    } else {
      const nextQ = currentQ + 1;
      setCurrentQ(nextQ);
      containerRef.current?.scrollIntoView({ behavior: 'smooth' });
      if (onSaveProgress) {
        onSaveProgress({ currentQ: nextQ, score, userAnswers });
      }
    }
  }, [currentQ, questions.length, score, passScore, cooldownHours, onSubmit, userAnswers, onClearProgress, onSaveProgress]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (showResults || submitting) return;
      if (e.key === 'Enter' && isQuestionAnswered) handleNext();
      if (e.key === ' ' && !isQuestionAnswered) {
        e.preventDefault();
        if (question.type === 'mc' || question.type === 'tf') handleCheck();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isQuestionAnswered, showResults, submitting, handleNext, handleCheck, question.type]);

  // ── Results ────────────────────────────────────────────────────────────────
  if (showResults) {
    const pct = Math.round((score / questions.length) * 100);
    const passed = score >= passScore;

    return (
      <div className="max-w-2xl mx-auto animate-scale-in" ref={containerRef}>
        <div className={`card-glass rounded-3xl border p-8 text-center ${passed ? 'border-gsrp-teal/30' : 'border-gsrp-sunset/30'}`}>
          <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-3xl ${passed ? 'bg-gradient-to-r from-gsrp-teal via-gsrp-teal-light to-gsrp-teal' : 'bg-gradient-to-r from-gsrp-sunset via-gsrp-orange to-gsrp-sunset'}`} />
          <div className={`flex items-center justify-center w-20 h-20 rounded-full mx-auto mb-6 ${passed ? 'bg-gsrp-teal/10 border-2 border-gsrp-teal/30' : 'bg-gsrp-sunset/10 border-2 border-gsrp-sunset/30'}`}>
            {passed ? <CheckCircle2 size={36} className="text-gsrp-teal-light" /> : <XCircle size={36} className="text-gsrp-sunset" />}
          </div>
          <h2 className="text-3xl font-black text-white mb-2">{passed ? 'Quiz Passed!' : 'Quiz Failed'}</h2>
          <p className={`text-sm mb-6 ${passed ? 'text-gsrp-teal-light/50' : 'text-gsrp-orange'}`}>
            {passed ? 'You have demonstrated sufficient knowledge of the GSRP Staff Handbook.' : `You scored ${score}/${questions.length}. A minimum of ${passScore} correct answers is required.`}
          </p>
          <div className="relative w-32 h-32 mx-auto mb-6">
            <svg viewBox="0 0 130 130" className="w-full h-full -rotate-90">
              <circle cx="65" cy="65" r="54" fill="none" stroke="var(--gsrp-dark-border, #1E2A4A)" strokeWidth="7" />
              <circle cx="65" cy="65" r="54" fill="none" stroke={passed ? '#14B8A6' : '#EF4444'} strokeWidth="7" strokeLinecap="round" strokeDasharray="339.3" strokeDashoffset={339.3 - (pct / 100) * 339.3} className="transition-all duration-1000" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-white">{pct}%</span>
              <span className="text-[10px] text-gsrp-teal-light/40 uppercase tracking-wider">Score</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-gsrp-dark-surface/50 rounded-xl p-3">
              <div className="text-xl font-black text-gsrp-teal-light">{score}</div>
              <div className="text-[10px] text-gsrp-teal-light/30 uppercase tracking-wider">Correct</div>
            </div>
            <div className="bg-gsrp-dark-surface/50 rounded-xl p-3">
              <div className="text-xl font-black text-gsrp-sunset">{questions.length - score}</div>
              <div className="text-[10px] text-gsrp-teal-light/30 uppercase tracking-wider">Wrong</div>
            </div>
            <div className="bg-gsrp-dark-surface/50 rounded-xl p-3">
              <div className="text-xl font-black text-white">{questions.length}</div>
              <div className="text-[10px] text-gsrp-teal-light/30 uppercase tracking-wider">Total</div>
            </div>
          </div>
          {!passed && cooldownUntil && (
            <div className="bg-gsrp-sunset/10 border border-gsrp-sunset/20 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-center gap-2 text-gsrp-sunset text-sm font-bold">
                <Clock size={16} /><span>Cooldown: {cooldownHours} hours</span>
              </div>
              <p className="text-gsrp-teal-light/40 text-xs mt-1 text-center">Next attempt available after {new Date(cooldownUntil).toLocaleString()}</p>
            </div>
          )}
          <div className="flex gap-3">
            {passed ? (
              <Link href="/" className="flex-1 px-5 py-3 bg-gsrp-teal text-white rounded-xl font-bold text-sm hover:bg-gsrp-teal/90 transition-all cursor-pointer flex items-center justify-center gap-2">
                <CheckCircle2 size={16} /> Return Home
              </Link>
            ) : (
              <button onClick={() => window.location.reload()} disabled={!!cooldownUntil} className={`flex-1 px-5 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 ${cooldownUntil ? 'bg-gsrp-dark-surface text-gsrp-teal-light/20 border border-gsrp-dark-border cursor-not-allowed' : 'bg-gsrp-orange text-white hover:bg-gsrp-orange/90'}`}>
                <RotateCcw size={16} />{cooldownUntil ? `Retry in ${cooldownHours}h` : 'Retry Quiz'}
              </button>
            )}
          </div>
        </div>
        <ReviewSection userAnswers={userAnswers} reviewExpanded={reviewExpanded} setReviewExpanded={setReviewExpanded} />
        {submitting && <LoadingOverlay />}
      </div>
    );
  }

  // ── Active Question ────────────────────────────────────────────────────────
  if (!question) return null;

  const sectionLabel = {
    punishments: 'In-Game Punishments',
    rules: 'Staff Rules',
    discipline: 'Staff Discipline',
    commands: 'Custom Commands',
    vehicles: 'Vehicles & Patrol',
    'rp-log': 'Roleplay Logging',
    'punishment-log': 'Punishment Logging',
  }[question.section] || question.section;

  return (
    <div className="max-w-2xl mx-auto" ref={containerRef}>
      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-gsrp-teal-light/40 uppercase tracking-wider">
            Question {currentQ + 1} of {questions.length}
          </span>
          <div className="flex items-center gap-3">
            <Link href="/training/handbook" className="text-[10px] font-bold text-gsrp-teal-light/30 hover:text-gsrp-teal-light transition-colors flex items-center gap-1">
              <BookOpen size={10} /> Handbook
            </Link>
            <span className="text-xs font-bold text-gsrp-orange">Score: {score}</span>
          </div>
        </div>
        <div className="h-2 bg-gsrp-dark-surface rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-gsrp-orange to-gsrp-teal-light transition-all duration-500 rounded-full" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Question Card */}
      <div className="card-glass rounded-3xl border border-gsrp-dark-border/50 p-6 sm:p-8 animate-fade-in-up">
        {/* Section badge */}
        <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-gsrp-teal-light/40 bg-gsrp-teal/10 px-3 py-1 rounded-full mb-4">
          {sectionLabel}
        </span>

        {/* Question text */}
        <h3 className="text-lg sm:text-xl font-black text-white mb-6 leading-snug">
          {question.text}
        </h3>

        {/* ── RP-Log Question ─────────────────────────────────────────────── */}
        {question.type === 'rp-log' && (
          <RPQuestion
            question={question}
            currentQ={currentQ}
            interactiveState={currentInteractive}
            onAskDetails={handleRPAskDetails}
            onFirstAction={handleRPFirstAction}
            onCloseLogs={handleRPCloseLogs}
            onFinalChoice={handleRPFinalChoice}
          />
        )}

        {/* ── P-Log Question ──────────────────────────────────────────────── */}
        {question.type === 'p-log' && (
          <PLogQuestion
            question={question}
            currentQ={currentQ}
            interactiveState={currentInteractive}
            onFormChange={handlePFormChange}
            onSubmit={handlePSubmit}
          />
        )}

        {/* ── MC Options ─────────────────────────────────────────────────── */}
        {question.type === 'mc' && !isQuestionAnswered && (
          <div className="grid gap-3">
            {question.options.map((opt, i) => {
              const isSelected = currentInteractive.selectedMC === i;
              return (
                <button key={i} onClick={() => {
                  if (isQuestionAnswered) return;
                  setInteractiveState(prev => ({
                    ...prev,
                    [currentQ]: { ...prev[currentQ], selectedMC: i },
                  }));
                }} className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer ${isSelected ? 'border-gsrp-orange/40 bg-gsrp-orange/10' : 'border-gsrp-dark-border/50 hover:border-gsrp-dark-border hover:bg-gsrp-dark-surface/40'}`}>
                  <span className={`flex items-center justify-center w-8 h-8 rounded-lg text-xs font-black shrink-0 ${isSelected ? 'bg-gsrp-orange text-white' : 'bg-gsrp-dark-surface text-gsrp-teal-light/40 border border-gsrp-dark-border'}`}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-gsrp-teal-light/70'}`}>{opt}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* MC answered */}
        {question.type === 'mc' && isQuestionAnswered && (
          <div className="grid gap-3">
            {question.options.map((opt, i) => {
              const isCorrect = i === question.correct;
              const isWrong = currentInteractive.selectedMC === i && !isCorrect;
              return (
                <button key={i} disabled className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-200 cursor-default ${isCorrect ? 'border-gsrp-teal/40 bg-gsrp-teal/10' : isWrong ? 'border-gsrp-sunset/40 bg-gsrp-sunset/10' : 'border-gsrp-dark-border/30 opacity-50'}`}>
                  <span className={`flex items-center justify-center w-8 h-8 rounded-lg text-xs font-black shrink-0 ${isCorrect ? 'bg-gsrp-teal text-white' : isWrong ? 'bg-gsrp-sunset text-white' : 'bg-gsrp-dark-surface text-gsrp-teal-light/30'}`}>
                    {isCorrect ? '✓' : isWrong ? '✗' : String.fromCharCode(65 + i)}
                  </span>
                  <span className={`text-sm font-medium ${isCorrect ? 'text-gsrp-teal-light' : isWrong ? 'text-gsrp-sunset' : 'text-gsrp-teal-light/50'}`}>{opt}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── True/False ─────────────────────────────────────────────────── */}
        {question.type === 'tf' && !isQuestionAnswered && (
          <div className="grid grid-cols-2 gap-4">
            {[true, false].map((val) => {
              const isSelected = currentInteractive.selectedTF === val;
              return (
                <button key={String(val)} onClick={() => {
                  if (isQuestionAnswered) return;
                  setInteractiveState(prev => ({
                    ...prev,
                    [currentQ]: { ...prev[currentQ], selectedTF: val },
                  }));
                }} className={`flex flex-col items-center gap-3 p-6 rounded-xl border transition-all duration-200 cursor-pointer ${isSelected ? 'border-gsrp-orange/40 bg-gsrp-orange/10' : 'border-gsrp-dark-border/50 hover:border-gsrp-dark-border hover:bg-gsrp-dark-surface/40'}`}>
                  <span className={`text-3xl ${isSelected ? 'text-gsrp-orange' : 'text-gsrp-teal-light/30'}`}>{val ? '✓' : '✗'}</span>
                  <span className={`text-lg font-black ${isSelected ? 'text-white' : 'text-gsrp-teal-light/50'}`}>{val ? 'True' : 'False'}</span>
                </button>
              );
            })}
          </div>
        )}

        {question.type === 'tf' && isQuestionAnswered && (
          <div className="grid grid-cols-2 gap-4">
            {[true, false].map((val) => {
              const isCorrect = val === question.correct;
              const isWrong = currentInteractive.selectedTF === val && !isCorrect;
              return (
                <button key={String(val)} disabled className={`flex flex-col items-center gap-3 p-6 rounded-xl border transition-all duration-200 cursor-default ${isCorrect ? 'border-gsrp-teal/40 bg-gsrp-teal/10' : isWrong ? 'border-gsrp-sunset/40 bg-gsrp-sunset/10' : 'border-gsrp-dark-border/30 opacity-50'}`}>
                  <span className={`text-3xl ${isCorrect ? 'text-gsrp-teal-light' : isWrong ? 'text-gsrp-sunset' : 'text-gsrp-teal-light/30'}`}>{val ? '✓' : '✗'}</span>
                  <span className={`text-lg font-black ${isCorrect ? 'text-gsrp-teal-light' : isWrong ? 'text-gsrp-sunset' : 'text-gsrp-teal-light/50'}`}>{val ? 'True' : 'False'}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Feedback ───────────────────────────────────────────────────── */}
        {isQuestionAnswered && (
          <div className={`mt-6 p-4 rounded-xl border ${currentInteractive.correct ? 'bg-gsrp-teal/10 border-gsrp-teal/20' : 'bg-gsrp-sunset/10 border-gsrp-sunset/20'}`}>
            <p className={`text-sm font-bold mb-1 ${currentInteractive.correct ? 'text-gsrp-teal-light' : 'text-gsrp-sunset'}`}>
              {currentInteractive.correct ? '✓ Correct!' : '✗ Incorrect'}
            </p>
            <p className="text-xs text-gsrp-teal-light/50">{question.explanation}</p>
          </div>
        )}

        {/* ── Navigation ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gsrp-dark-border/30">
          <span className="hidden sm:inline text-xs text-gsrp-teal-light/30">
            {(question.type === 'mc' || question.type === 'tf') && <>Press <kbd className="px-1.5 py-0.5 bg-gsrp-dark-surface rounded text-[10px] font-mono">Space</kbd> to check, <kbd className="px-1.5 py-0.5 bg-gsrp-dark-surface rounded text-[10px] font-mono">Enter</kbd> for next</>}
          </span>
          <div className="flex gap-3 ml-auto">
            {!isQuestionAnswered ? (
              <button
                onClick={handleCheck}
                disabled={question.type === 'mc'
                  ? currentInteractive.selectedMC === null
                  : question.type === 'tf'
                  ? currentInteractive.selectedTF === null
                  : false
                }
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${((question.type === 'mc' && currentInteractive.selectedMC !== null) || (question.type === 'tf' && currentInteractive.selectedTF !== null) || question.type === 'rp-log' || question.type === 'p-log') ? 'bg-gsrp-orange text-white hover:bg-gsrp-orange/90' : 'bg-gsrp-dark-surface text-gsrp-teal-light/20 border border-gsrp-dark-border cursor-not-allowed'}`}
              >
                {question.type === 'rp-log' && currentInteractive.phase === 'idle' ? 'Continue' : 'Check Answer'}
              </button>
            ) : (
              <button onClick={handleNext} className="px-6 py-2.5 bg-gsrp-orange text-white rounded-xl text-sm font-bold hover:bg-gsrp-orange/90 transition-all cursor-pointer flex items-center gap-2">
                {currentQ + 1 >= questions.length ? 'Finish' : 'Next'} <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
      {submitting && <LoadingOverlay />}
    </div>
  );
}

// ── RP-Log Question Component ─────────────────────────────────────────────────

function RPQuestion({
  question,
  currentQ,
  interactiveState,
  onAskDetails,
  onFirstAction,
  onCloseLogs,
  onFinalChoice,
}) {
  const { phase, rpAction, rpFinalChoice } = interactiveState;
  const mockUser = question.mockUser;
  const rpType = question.rpType;
  const details = question.userDetails;
  const dialogText = question.logDialog;

  return (
    <div className="space-y-4">
      {/* Step 1: Initial request */}
      {phase === 'idle' && (
        <div className="bg-gsrp-dark-surface/60 rounded-xl p-5 border border-gsrp-dark-border/50">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-gsrp-orange/20 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-sm font-black text-gsrp-orange">?</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gsrp-teal-light/30 mb-1">In-game message from <span className="text-gsrp-teal-light">{mockUser}</span></p>
              <p className="text-sm text-gsrp-teal-light font-medium italic">"{question.requestText}"</p>
            </div>
          </div>
          <button
            onClick={onAskDetails}
            className="mt-4 w-full px-4 py-3 bg-gsrp-orange/15 border border-gsrp-orange/30 text-gsrp-orange rounded-xl text-sm font-bold hover:bg-gsrp-orange/25 transition-all cursor-pointer"
          >
            Ask for more details (duration, location, other players)
          </button>
        </div>
      )}

      {/* Step 2: User provides details */}
      {(phase === 'details-shown' || phase === 'logs-shown' || phase === 'final-choice' || phase === 'answered') && (
        <div className="space-y-3 animate-fade-in-up">
          {/* User response */}
          <div className="bg-gsrp-dark-surface/60 rounded-xl p-5 border border-gsrp-teal/10">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-gsrp-teal/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-sm font-black text-gsrp-teal-light">{mockUser[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gsrp-teal-light/30 mb-2">{mockUser} replies:</p>
                <p className="text-sm text-gsrp-teal-light font-medium">
                  Sure! Here are my details: <br />
                  <span className="text-gsrp-teal-light/80">• <strong>Duration:</strong> {details.duration}</span><br />
                  <span className="text-gsrp-teal-light/80">• <strong>Location:</strong> {details.location}</span><br />
                  <span className="text-gsrp-teal-light/80">• <strong>Other players:</strong> {details.otherPlayers}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Step 3: First decision */}
          {phase !== 'logs-shown' && phase !== 'final-choice' && phase !== 'answered' && rpAction === null && (
            <div className="space-y-2 animate-fade-in-up">
              <p className="text-xs text-gsrp-teal-light/40 font-bold uppercase tracking-wider">What do you do first?</p>
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => onFirstAction('log')}
                  className="px-4 py-3 bg-gsrp-sunset/10 border border-gsrp-sunset/20 text-gsrp-sunset rounded-xl text-sm font-bold hover:bg-gsrp-sunset/20 transition-all cursor-pointer text-left"
                >
                  📋 Log the {rpType.label.toLowerCase()} roleplay in the roleplay log channel
                </button>
                <button
                  onClick={() => onFirstAction('check')}
                  className="px-4 py-3 bg-gsrp-teal/10 border border-gsrp-teal/20 text-gsrp-teal-light rounded-xl text-sm font-bold hover:bg-gsrp-teal/20 transition-all cursor-pointer text-left"
                >
                  🔍 Check if there are any ongoing {rpType.plural} roleplays
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 4: User tried to log first — WRONG */}
      {phase !== 'idle' && phase !== 'logs-shown' && phase !== 'final-choice' && phase !== 'answered' && rpAction === 'log' && (
        <div className="bg-gsrp-sunset/10 border border-gsrp-sunset/20 rounded-xl p-5 animate-fade-in-up">
          <div className="flex items-start gap-3">
            <div className="text-2xl">💢</div>
            <div className="flex-1">
              <p className="text-xs text-gsrp-teal-light/30 mb-1">Mock reply from {mockUser}</p>
              <p className="text-sm text-gsrp-sunset font-bold italic">
                "Hey! There's already an active {rpType.label.toLowerCase()} RP happening right now! You're such a bad mod for not checking first — Unbelievable!"
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Step 5: User checks logs — show dialog */}
      {phase === 'logs-shown' && (
        <div className="bg-gsrp-dark-surface/60 border border-gsrp-dark-border rounded-xl animate-fade-in-up">
          <div className="flex items-center justify-between p-4 border-b border-gsrp-dark-border/50">
            <h4 className="text-sm font-black text-gsrp-teal-light">Roleplay Log Channel</h4>
            <button onClick={onCloseLogs} className="p-1.5 rounded-lg hover:bg-gsrp-dark-surface text-gsrp-teal-light/40 hover:text-white transition-colors cursor-pointer">
              <Eye size={14} />
              <span className="text-[10px] font-bold ml-1">Close</span>
            </button>
          </div>
          <div className="p-4">
            <div className="text-xs text-gsrp-teal-light whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto">
              {dialogText}
            </div>
          </div>
        </div>
      )}

      {/* Step 6: Final choice */}
      {phase === 'final-choice' && (
        <div className="space-y-2 animate-fade-in-up">
          <p className="text-xs text-gsrp-teal-light/40 font-bold uppercase tracking-wider">Based on the logs, what do you do?</p>
          <div className="grid grid-cols-1 gap-2">
            {question.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => onFinalChoice(i)}
                className="px-4 py-3 bg-gsrp-dark-surface/60 border border-gsrp-dark-border/50 text-gsrp-teal-light rounded-xl text-sm font-bold hover:bg-gsrp-teal/10 hover:border-gsrp-teal/20 transition-all cursor-pointer text-left"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── P-Log (Punishment Logging) Question Component ──────────────────────────────

function PLogQuestion({
  question,
  currentQ,
  interactiveState,
  onFormChange,
  onSubmit,
}) {
  const { phase, formData } = interactiveState;
  const [usernameInput, setUsernameInput] = useState(formData?.username || '');
  const [showDropdown, setShowDropdown] = useState(false);
  const [punishment, setPunishment] = useState(formData?.punishment || '');
  const [reason, setReason] = useState(formData?.reason || '');

  const filteredUsers = usernameInput.trim()
    ? question.mockAutocomplete.filter(u => u.toLowerCase().includes(usernameInput.trim().toLowerCase()))
    : question.mockAutocomplete;

  const selectedUser = question.mockAutocomplete.find(
    u => u.toLowerCase() === usernameInput.trim().toLowerCase()
  );

  const isFormValid = selectedUser && punishment && reason;
  const canSubmit = isFormValid && phase !== 'submitting' && phase !== 'answered';

  useEffect(() => {
    onFormChange('username', usernameInput);
  }, [usernameInput]);

  useEffect(() => {
    onFormChange('punishment', punishment);
  }, [punishment]);

  useEffect(() => {
    onFormChange('reason', reason);
  }, [reason]);

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit();
  };

  if (phase === 'answered') {
    return (
      <div className="space-y-4 animate-fade-in-up">
        {/* Completed Form Display */}
        <div className="bg-gsrp-dark-surface/60 rounded-xl p-5 border border-gsrp-dark-border/50 space-y-3">
          <h4 className="text-sm font-black text-gsrp-teal-light/60">Melonly Log Entry Submitted</h4>
          <div>
            <label className="text-[10px] font-bold text-gsrp-teal-light/30 uppercase tracking-wider">User</label>
            <p className="text-sm text-gsrp-teal-light font-mono">{formData?.username || selectedUser || usernameInput}</p>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gsrp-teal-light/30 uppercase tracking-wider">Punishment</label>
            <p className="text-sm text-gsrp-teal-light">{formData?.punishment || punishment}</p>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gsrp-teal-light/30 uppercase tracking-wider">Reason</label>
            <p className="text-sm text-gsrp-teal-light">{formData?.reason || reason}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      <h4 className="text-sm font-black text-gsrp-teal-light/60 uppercase tracking-wider mb-3">Create New Log</h4>

      {/* User autocomplete */}
      <div className="relative">
        <label className="text-[10px] font-bold text-gsrp-teal-light/40 uppercase tracking-wider mb-1 block">
          User <span className="text-gsrp-sunset">*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={usernameInput}
            onChange={(e) => { setUsernameInput(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            placeholder="Enter username (⌘I/Ctrl+I)"
            className="w-full px-4 py-2.5 bg-gsrp-dark-surface/80 border border-gsrp-dark-border rounded-xl text-sm text-white placeholder:text-gsrp-teal-light/20 focus:outline-none focus:border-gsrp-orange/40 transition-colors font-mono"
            autoComplete="off"
            data-form-type="other"
          />
          {showDropdown && filteredUsers.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-gsrp-dark-surface border border-gsrp-dark-border rounded-xl overflow-hidden z-10 shadow-xl max-h-48 overflow-y-auto">
              {filteredUsers.map((u, idx) => (
                <button
                  key={u}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { setUsernameInput(u); setShowDropdown(false); onFormChange('username', u); }}
                  className={`w-full text-left px-4 py-2.5 text-sm font-mono hover:bg-gsrp-orange/10 transition-colors cursor-pointer flex items-center gap-2 ${u === question.offender ? 'text-gsrp-teal-light font-bold' : 'text-gsrp-teal-light/70'}`}
                >
                  {u === question.offender && <span className="text-[9px] bg-gsrp-orange/20 text-gsrp-orange px-1.5 py-0.5 rounded font-bold">TARGET</span>}
                  {u}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Punishment dropdown */}
      <div>
        <label className="text-[10px] font-bold text-gsrp-teal-light/40 uppercase tracking-wider mb-1 block">
          Punishment <span className="text-gsrp-sunset">*</span>
        </label>
        <select
          value={punishment}
          onChange={(e) => setPunishment(e.target.value)}
          className="w-full px-4 py-2.5 bg-gsrp-dark-surface/80 border border-gsrp-dark-border rounded-xl text-sm text-white focus:outline-none focus:border-gsrp-orange/40 transition-colors cursor-pointer appearance-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 12px center',
          }}
        >
          <option value="" disabled className="text-gsrp-teal-light/30">Select punishment type</option>
          {question.punishmentOptions.map(p => (
            <option key={p} value={p} className="text-white">{p}</option>
          ))}
        </select>
      </div>

      {/* Reason input */}
      <div>
        <label className="text-[10px] font-bold text-gsrp-teal-light/40 uppercase tracking-wider mb-1 block">
          Reason <span className="text-gsrp-sunset">*</span>
        </label>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full px-4 py-2.5 bg-gsrp-dark-surface/80 border border-gsrp-dark-border rounded-xl text-sm text-white focus:outline-none focus:border-gsrp-orange/40 transition-colors cursor-pointer appearance-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 12px center',
          }}
        >
          <option value="" disabled className="text-gsrp-teal-light/30">Select reason</option>
          {question.mockReasons.map(r => (
            <option key={r} value={r} className="text-white">{r}</option>
          ))}
        </select>
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className={`w-full px-6 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${canSubmit ? 'bg-gsrp-orange text-white hover:bg-gsrp-orange/90' : 'bg-gsrp-dark-surface text-gsrp-teal-light/20 border border-gsrp-dark-border cursor-not-allowed'}`}
      >
        Submit Log Entry
      </button>

      {!isFormValid && usernameInput && (
        <p className="text-[10px] text-gsrp-teal-light/30">Fill in all fields to submit. Search for the exact username.</p>
      )}
    </div>
  );
}

// ── Review Section ─────────────────────────────────────────────────────────────

function ReviewSection({ userAnswers, reviewExpanded, setReviewExpanded }) {
  return (
    <div className="mt-6">
      <h3 className="text-sm font-bold text-gsrp-teal-light/40 uppercase tracking-wider mb-4">
        Review — {userAnswers.filter(a => !a.correct).length} incorrect
      </h3>
      {userAnswers.map((a, i) => (
        <div key={i} className={`card-glass rounded-xl border mb-2 overflow-hidden ${a.correct ? 'border-gsrp-teal/20' : 'border-gsrp-sunset/20'}`}>
          <button
            onClick={() => setReviewExpanded(prev => ({ ...prev, [i]: !prev[i] }))}
            className="w-full flex items-center justify-between p-4 text-left cursor-pointer hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              {a.correct ? <CheckCircle2 size={16} className="text-gsrp-teal-light shrink-0" /> : <XCircle size={16} className="text-gsrp-sunset shrink-0" />}
              <span className="text-sm text-gsrp-teal-light/60 truncate">{a.question}</span>
            </div>
            {reviewExpanded[i] ? <ChevronUp size={14} className="text-gsrp-teal-light/30 shrink-0 ml-2" /> : <ChevronDown size={14} className="text-gsrp-teal-light/30 shrink-0 ml-2" />}
          </button>
          {reviewExpanded[i] && !a.correct && (
            <div className="px-4 pb-4 border-t border-gsrp-dark-border/30 pt-3 animate-fade-in-up">
              {a.questionType === 'rp-log' ? (
                <>
                  <p className="text-xs text-gsrp-sunset mb-1">Your action: {a.chosen}</p>
                  <p className="text-xs text-gsrp-teal-light mb-1">Correct approach: {a.correctAnswer}</p>
                  {a.rpWrongAction === 'log-first' && (
                    <p className="text-xs text-gsrp-sunset/70 mb-2">⚠️ You tried to log without checking the roleplay logs first. Always check for ongoing roleplays before logging a new one.</p>
                  )}
                  <p className="text-xs text-gsrp-teal-light/40">{a.explanation}</p>
                </>
              ) : a.questionType === 'p-log' ? (
                <>
                  <p className="text-xs text-gsrp-sunset mb-1">Your submission: {a.chosen}</p>
                  <p className="text-xs text-gsrp-teal-light mb-1">Correct: {a.correctAnswer}</p>
                  <p className="text-xs text-gsrp-teal-light/40">{a.explanation}</p>
                </>
              ) : (
                <>
                  <p className="text-xs text-gsrp-sunset mb-1">Your answer: {a.chosen}</p>
                  <p className="text-xs text-gsrp-teal-light mb-1">Correct: {a.correctAnswer}</p>
                  <p className="text-xs text-gsrp-teal-light/40">{a.explanation}</p>
                </>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function LoadingOverlay() {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="flex flex-col items-center">
        <Loader2 className="w-8 h-8 text-gsrp-orange animate-spin mb-3" />
        <span className="text-gsrp-teal-light/40 text-sm">Submitting results...</span>
      </div>
    </div>
  );
}
