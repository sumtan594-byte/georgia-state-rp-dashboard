import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, CheckCircle2, XCircle, ArrowRight, RotateCcw, BookOpen, Clock, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function QuizEngine({ questions, passScore, cooldownHours, onSubmit, user, isRetry, initialState, onSaveProgress, onClearProgress }) {
  const [currentQ, setCurrentQ] = useState(initialState?.currentQ ?? 0);
  const [score, setScore] = useState(initialState?.score ?? 0);
  const [answered, setAnswered] = useState(false);
  const [userAnswers, setUserAnswers] = useState(initialState?.userAnswers ?? []);
  const [selectedMC, setSelectedMC] = useState(null);
  const [selectedTF, setSelectedTF] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(null);
  const [hasPassed, setHasPassed] = useState(false);
  const [reviewExpanded, setReviewExpanded] = useState({});
  const containerRef = useRef(null);
  const initializedRef = useRef(false);

  // Restore answered state if resuming mid-question
  useEffect(() => {
    if (initialState && !initializedRef.current) {
      initializedRef.current = true;
      if (initialState.userAnswers && initialState.userAnswers.length > initialState.currentQ) {
        setAnswered(true);
      }
    }
  }, []);

  const question = questions[currentQ];
  const progress = ((currentQ + (answered ? 1 : 0)) / questions.length) * 100;

  const resetAnswerState = useCallback(() => {
    setSelectedMC(null);
    setSelectedTF(null);
    setAnswered(false);
  }, []);

  const handleCheck = useCallback(() => {
    if (!question || answered) return;

    let isCorrect = false;
    let chosen = '';
    let correct = '';

    if (question.type === 'mc') {
      if (selectedMC === null) return;
      isCorrect = selectedMC === question.correct;
      chosen = question.options[selectedMC];
      correct = question.options[question.correct];
    } else if (question.type === 'tf') {
      if (selectedTF === null) return;
      isCorrect = selectedTF === question.correct;
      chosen = selectedTF ? 'True' : 'False';
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
      }];
      if (onSaveProgress) {
        onSaveProgress({ currentQ, score: score + (isCorrect ? 1 : 0), userAnswers: next });
      }
      return next;
    });

    setAnswered(true);
  }, [question, answered, selectedMC, selectedTF]);

  const handleNext = useCallback(() => {
    if (currentQ + 1 >= questions.length) {
      const finalScore = score + (userAnswers[userAnswers.length - 1]?.correct ? 0 : 0);
      const passed = finalScore >= passScore;
      setHasPassed(passed);
      setShowResults(true);
      if (onClearProgress) onClearProgress();

      if (!passed) {
        const cooldownMs = cooldownHours * 60 * 60 * 1000;
        setCooldownUntil(new Date(Date.now() + cooldownMs).toISOString());
      }

      // Submit to API
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
      resetAnswerState();
      containerRef.current?.scrollIntoView({ behavior: 'smooth' });
      if (onSaveProgress) {
        onSaveProgress({ currentQ: nextQ, score, userAnswers });
      }
    }
  }, [currentQ, questions.length, score, userAnswers, passScore, cooldownHours, onSubmit, resetAnswerState, onSaveProgress]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (showResults || submitting) return;
      if (e.key === 'Enter' && answered) handleNext();
      if (e.key === ' ' && !answered) { e.preventDefault(); handleCheck(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [answered, showResults, submitting, handleNext, handleCheck]);

  if (showResults) {
    const pct = Math.round((score / questions.length) * 100);
    const passed = score >= passScore;

    return (
      <div className="max-w-2xl mx-auto animate-scale-in" ref={containerRef}>
        {/* Result Card */}
        <div className={`card-glass rounded-3xl border p-8 text-center ${
          passed ? 'border-gsrp-teal/30' : 'border-gsrp-sunset/30'
        }`}>
          {/* Top accent */}
          <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-3xl ${
            passed ? 'bg-gradient-to-r from-gsrp-teal via-gsrp-teal-light to-gsrp-teal' : 'bg-gradient-to-r from-gsrp-sunset via-gsrp-orange to-gsrp-sunset'
          }`} />

          {/* Icon */}
          <div className={`flex items-center justify-center w-20 h-20 rounded-full mx-auto mb-6 ${
            passed ? 'bg-gsrp-teal/10 border-2 border-gsrp-teal/30' : 'bg-gsrp-sunset/10 border-2 border-gsrp-sunset/30'
          }`}>
            {passed ? (
              <CheckCircle2 size={36} className="text-gsrp-teal-light" />
            ) : (
              <XCircle size={36} className="text-gsrp-sunset" />
            )}
          </div>

          {/* Verdict */}
          <h2 className="text-3xl font-black text-white mb-2">
            {passed ? 'Quiz Passed!' : 'Quiz Failed'}
          </h2>
          <p className="text-gsrp-teal-light/50 text-sm mb-6">
            {passed
              ? 'You have demonstrated sufficient knowledge of the GSRP Staff Handbook.'
              : `You scored ${score}/${questions.length}. A minimum of ${passScore} correct answers is required.`
            }
          </p>

          {/* Score Ring */}
          <div className="relative w-32 h-32 mx-auto mb-6">
            <svg viewBox="0 0 130 130" className="w-full h-full -rotate-90">
              <circle cx="65" cy="65" r="54" fill="none" stroke="var(--gsrp-dark-border, #1E2A4A)" strokeWidth="7" />
              <circle
                cx="65" cy="65" r="54" fill="none"
                stroke={passed ? '#14B8A6' : '#EF4444'}
                strokeWidth="7" strokeLinecap="round"
                strokeDasharray="339.3"
                strokeDashoffset={339.3 - (pct / 100) * 339.3}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-white">{pct}%</span>
              <span className="text-[10px] text-gsrp-teal-light/40 uppercase tracking-wider">Score</span>
            </div>
          </div>

          {/* Stats */}
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

          {/* Cooldown info */}
          {!passed && cooldownUntil && (
            <div className="bg-gsrp-sunset/10 border border-gsrp-sunset/20 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-center gap-2 text-gsrp-sunset text-sm font-bold">
                <Clock size={16} />
                <span>Cooldown: {cooldownHours} hours</span>
              </div>
              <p className="text-gsrp-teal-light/40 text-xs mt-1 text-center">
                Next attempt available after {new Date(cooldownUntil).toLocaleString()}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {passed ? (
              <Link
                href="/"
                className="flex-1 px-5 py-3 bg-gsrp-teal text-white rounded-xl font-bold text-sm hover:bg-gsrp-teal/90 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={16} />
                Return Home
              </Link>
            ) : (
              <button
                onClick={() => window.location.reload()}
                disabled={!!cooldownUntil}
                className={`flex-1 px-5 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  cooldownUntil
                    ? 'bg-gsrp-dark-surface text-gsrp-teal-light/20 border border-gsrp-dark-border cursor-not-allowed'
                    : 'bg-gsrp-orange text-white hover:bg-gsrp-orange/90'
                }`}
              >
                <RotateCcw size={16} />
                {cooldownUntil ? `Retry in ${cooldownHours}h` : 'Retry Quiz'}
              </button>
            )}
          </div>
        </div>

        {/* Review Section */}
        <div className="mt-6">
          <h3 className="text-sm font-bold text-gsrp-teal-light/40 uppercase tracking-wider mb-4">
            Review — {userAnswers.filter(a => !a.correct).length} incorrect
          </h3>
          {userAnswers.map((a, i) => (
            <div
              key={i}
              className={`card-glass rounded-xl border mb-2 overflow-hidden ${
                a.correct ? 'border-gsrp-teal/20' : 'border-gsrp-sunset/20'
              }`}
            >
              <button
                onClick={() => setReviewExpanded(prev => ({ ...prev, [i]: !prev[i] }))}
                className="w-full flex items-center justify-between p-4 text-left cursor-pointer hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {a.correct ? (
                    <CheckCircle2 size={16} className="text-gsrp-teal-light shrink-0" />
                  ) : (
                    <XCircle size={16} className="text-gsrp-sunset shrink-0" />
                  )}
                  <span className="text-sm text-gsrp-teal-light/60 truncate">{a.question}</span>
                </div>
                {reviewExpanded[i] ? <ChevronUp size={14} className="text-gsrp-teal-light/30 shrink-0 ml-2" /> : <ChevronDown size={14} className="text-gsrp-teal-light/30 shrink-0 ml-2" />}
              </button>
              {reviewExpanded[i] && !a.correct && (
                <div className="px-4 pb-4 border-t border-gsrp-dark-border/30 pt-3 animate-fade-in-up">
                  <p className="text-xs text-gsrp-sunset mb-1">Your answer: {a.chosen}</p>
                  <p className="text-xs text-gsrp-teal-light">Correct: {a.correctAnswer}</p>
                  <p className="text-xs text-gsrp-teal-light/40 mt-2">{a.explanation}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {submitting && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="flex flex-col items-center">
              <Loader2 className="w-8 h-8 text-gsrp-orange animate-spin mb-3" />
              <span className="text-gsrp-teal-light/40 text-sm">Submitting results...</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto" ref={containerRef}>
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-gsrp-teal-light/40 uppercase tracking-wider">
            Question {currentQ + 1} of {questions.length}
          </span>
          <div className="flex items-center gap-3">
            <Link
              href="/training/handbook"
              className="text-[10px] font-bold text-gsrp-teal-light/30 hover:text-gsrp-teal-light transition-colors flex items-center gap-1"
            >
              <BookOpen size={10} />
              Handbook
            </Link>
            <span className="text-xs font-bold text-gsrp-orange">
              Score: {score}
            </span>
          </div>
        </div>
        <div className="h-2 bg-gsrp-dark-surface rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-gsrp-orange to-gsrp-teal-light transition-all duration-500 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="card-glass rounded-3xl border border-gsrp-dark-border/50 p-6 sm:p-8 animate-fade-in-up">
        {/* Section badge */}
        <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-gsrp-teal-light/40 bg-gsrp-teal/10 px-3 py-1 rounded-full mb-4">
          {question.section === 'punishments' && 'In-Game Punishments'}
          {question.section === 'rules' && 'Staff Rules'}
          {question.section === 'discipline' && 'Staff Discipline'}
          {question.section === 'commands' && 'Custom Commands'}
          {question.section === 'vehicles' && 'Vehicles & Patrol'}
        </span>

        {/* Question text */}
        <h3 className="text-lg sm:text-xl font-black text-white mb-6 leading-snug">
          {question.text}
        </h3>

        {/* MC Options */}
        {question.type === 'mc' && (
          <div className="grid gap-3">
            {question.options.map((opt, i) => {
              const isSelected = selectedMC === i;
              const isCorrect = answered && i === question.correct;
              const isWrong = answered && isSelected && i !== question.correct;

              return (
                <button
                  key={i}
                  onClick={() => !answered && setSelectedMC(i)}
                  disabled={answered}
                  className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                    isCorrect
                      ? 'border-gsrp-teal/40 bg-gsrp-teal/10'
                      : isWrong
                      ? 'border-gsrp-sunset/40 bg-gsrp-sunset/10'
                      : isSelected
                      ? 'border-gsrp-orange/40 bg-gsrp-orange/10'
                      : 'border-gsrp-dark-border/50 hover:border-gsrp-dark-border hover:bg-gsrp-dark-surface/40'
                  } ${answered ? 'cursor-default' : ''}`}
                >
                  <span className={`flex items-center justify-center w-8 h-8 rounded-lg text-xs font-black shrink-0 ${
                    isCorrect
                      ? 'bg-gsrp-teal text-white'
                      : isWrong
                      ? 'bg-gsrp-sunset text-white'
                      : isSelected
                      ? 'bg-gsrp-orange text-white'
                      : 'bg-gsrp-dark-surface text-gsrp-teal-light/40 border border-gsrp-dark-border'
                  }`}>
                    {isCorrect ? '✓' : isWrong ? '✗' : String.fromCharCode(65 + i)}
                  </span>
                  <span className={`text-sm font-medium ${
                    isCorrect ? 'text-gsrp-teal-light' : isWrong ? 'text-gsrp-sunset' : isSelected ? 'text-white' : 'text-gsrp-teal-light/70'
                  }`}>
                    {opt}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* True/False */}
        {question.type === 'tf' && (
          <div className="grid grid-cols-2 gap-4">
            {[true, false].map((val) => {
              const isSelected = selectedTF === val;
              const isCorrect = answered && val === question.correct;
              const isWrong = answered && isSelected && val !== question.correct;

              return (
                <button
                  key={String(val)}
                  onClick={() => !answered && setSelectedTF(val)}
                  disabled={answered}
                  className={`flex flex-col items-center gap-3 p-6 rounded-xl border transition-all duration-200 cursor-pointer ${
                    isCorrect
                      ? 'border-gsrp-teal/40 bg-gsrp-teal/10'
                      : isWrong
                      ? 'border-gsrp-sunset/40 bg-gsrp-sunset/10'
                      : isSelected
                      ? 'border-gsrp-orange/40 bg-gsrp-orange/10'
                      : 'border-gsrp-dark-border/50 hover:border-gsrp-dark-border hover:bg-gsrp-dark-surface/40'
                  } ${answered ? 'cursor-default' : ''}`}
                >
                  <span className={`text-3xl ${
                    isCorrect ? 'text-gsrp-teal-light' : isWrong ? 'text-gsrp-sunset' : isSelected ? 'text-gsrp-orange' : 'text-gsrp-teal-light/30'
                  }`}>
                    {val ? '✓' : '✗'}
                  </span>
                  <span className={`text-lg font-black ${
                    isCorrect ? 'text-gsrp-teal-light' : isWrong ? 'text-gsrp-sunset' : isSelected ? 'text-white' : 'text-gsrp-teal-light/50'
                  }`}>
                    {val ? 'True' : 'False'}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Feedback */}
        {answered && (
          <div className={`mt-6 p-4 rounded-xl border ${
            userAnswers[userAnswers.length - 1]?.correct
              ? 'bg-gsrp-teal/10 border-gsrp-teal/20'
              : 'bg-gsrp-sunset/10 border-gsrp-sunset/20'
          }`}>
            <p className={`text-sm font-bold mb-1 ${
              userAnswers[userAnswers.length - 1]?.correct ? 'text-gsrp-teal-light' : 'text-gsrp-sunset'
            }`}>
              {userAnswers[userAnswers.length - 1]?.correct ? '✓ Correct!' : '✗ Incorrect'}
            </p>
            <p className="text-xs text-gsrp-teal-light/50">{question.explanation}</p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gsrp-dark-border/30">
          <span className="hidden sm:inline text-xs text-gsrp-teal-light/30">
            Press <kbd className="px-1.5 py-0.5 bg-gsrp-dark-surface rounded text-[10px] font-mono">Space</kbd> to check, <kbd className="px-1.5 py-0.5 bg-gsrp-dark-surface rounded text-[10px] font-mono">Enter</kbd> for next
          </span>
          <div className="flex gap-3">
            {!answered ? (
              <button
                onClick={handleCheck}
                disabled={question.type === 'mc' ? selectedMC === null : selectedTF === null}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  (question.type === 'mc' ? selectedMC !== null : selectedTF !== null)
                    ? 'bg-gsrp-orange text-white hover:bg-gsrp-orange/90'
                    : 'bg-gsrp-dark-surface text-gsrp-teal-light/20 border border-gsrp-dark-border cursor-not-allowed'
                }`}
              >
                Check Answer
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="px-6 py-2.5 bg-gsrp-orange text-white rounded-xl text-sm font-bold hover:bg-gsrp-orange/90 transition-all cursor-pointer flex items-center gap-2"
              >
                {currentQ + 1 >= questions.length ? 'Finish' : 'Next'}
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
