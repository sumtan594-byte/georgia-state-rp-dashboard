import { useState, useCallback, useRef, useEffect } from 'react'
import {
  Loader2, CheckCircle2, XCircle, ArrowRight, RotateCcw, Clock,
  Shield, ChevronDown, ChevronUp, BookOpen, AlertTriangle, Camera,
} from 'lucide-react'
import Link from 'next/link'
import ModCallPopup from './ModCallPopup'
import VideoEvidencePanel from './VideoEvidencePanel'

function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function RidealongEngine({
  scenarios,
  passScore,
  cooldownHours,
  onSubmit,
  user,
  onSaveProgress,
  onClearProgress,
}) {
  const [currentQ, setCurrentQ] = useState(0)
  const [score, setScore] = useState(0)
  const [phase, setPhase] = useState('popup')
  const [answered, setAnswered] = useState(false)
  const [evidenceViewed, setEvidenceViewed] = useState(false)
  const [selectedOption, setSelectedOption] = useState(null)
  const [results, setResults] = useState([])
  const [showResults, setShowResults] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [cooldownUntil, setCooldownUntil] = useState(null)
  const [cooldownRemaining, setCooldownRemaining] = useState(null)
  const [hasPassed, setHasPassed] = useState(false)
  const [reviewExpanded, setReviewExpanded] = useState({})
  const containerRef = useRef(null)
  const total = scenarios.length

  useEffect(() => {
    if (!cooldownUntil) {
      setCooldownRemaining(null)
      return
    }
    const tick = () => {
      const remaining = Math.max(0, Math.floor((new Date(cooldownUntil).getTime() - Date.now()) / 1000))
      setCooldownRemaining(remaining)
      if (remaining <= 0) setCooldownUntil(null)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [cooldownUntil])

  const scenario = scenarios[currentQ]
  const progress = ((currentQ + (answered ? 1 : 0)) / total) * 100

  const handleRespond = useCallback(() => {
    setPhase('scene')
  }, [])

  const handleEvidenceViewed = useCallback(() => {
    setEvidenceViewed(true)
  }, [])

  const handleCheck = useCallback(() => {
    if (!scenario || answered || selectedOption === null) return

    const chosen = scenario.options.find(o => o.id === selectedOption)
    const correct = scenario.options.find(o => o.correct)
    const isCorrect = selectedOption === correct.id

    if (isCorrect) setScore(prev => prev + 1)

    const result = {
      scenarioId: scenario.id,
      evidenceValid: scenario.evidenceValid !== false,
      correct: isCorrect,
      chosenOption: selectedOption,
      chosenText: chosen?.text || '',
      correctAnswer: correct?.text || '',
      correctCommand: correct?.command || '',
      explanation: scenario.explanation,
      wrongReason: chosen?.wrongReason || null,
      evidenceViewed,
    }

    const newResults = [...results, result]
    setResults(newResults)
    setAnswered(true)

    if (onSaveProgress) {
      onSaveProgress({
        currentQ,
        score: score + (isCorrect ? 1 : 0),
        results: newResults,
        phase: 'result',
      })
    }
  }, [scenario, answered, selectedOption, results, score, evidenceViewed, onSaveProgress])

  const handleNext = useCallback(() => {
    if (currentQ + 1 >= total) {
      const finalScore = score
      const passed = finalScore >= passScore
      setHasPassed(passed)
      setShowResults(true)
      if (onClearProgress) onClearProgress()

      if (!passed) {
        const cooldownMs = cooldownHours * 60 * 60 * 1000
        setCooldownUntil(new Date(Date.now() + cooldownMs).toISOString())
      }

      setSubmitting(true)
      onSubmit({
        score: finalScore,
        total,
        pct: Math.round((finalScore / total) * 100),
        pass: passed,
        results,
      }).finally(() => setSubmitting(false))
    } else {
      const nextQ = currentQ + 1
      setCurrentQ(nextQ)
      setEvidenceViewed(false)
      setSelectedOption(null)
      setAnswered(false)
      setPhase('popup')
      containerRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [currentQ, total, score, passScore, cooldownHours, onSubmit, onClearProgress, results])

  const handleRetry = useCallback(() => {
    setCurrentQ(0)
    setScore(0)
    setPhase('popup')
    setAnswered(false)
    setEvidenceViewed(false)
    setSelectedOption(null)
    setResults([])
    setShowResults(false)
    setCooldownUntil(null)
    setCooldownRemaining(null)
    setHasPassed(false)
  }, [])

  if (showResults) {
    const pct = Math.round((score / total) * 100)
    const passed = score >= passScore

    return (
      <div className="max-w-2xl mx-auto animate-scale-in" ref={containerRef}>
        <div className={`card-glass rounded-3xl border p-8 text-center ${
          passed ? 'border-gsrp-teal/30' : 'border-gsrp-sunset/30'
        }`}>
          <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-3xl ${
            passed
              ? 'bg-gradient-to-r from-gsrp-teal via-gsrp-teal-light to-gsrp-teal'
              : 'bg-gradient-to-r from-gsrp-sunset via-gsrp-orange to-gsrp-sunset'
          }`} />

          <div className={`flex items-center justify-center w-20 h-20 rounded-full mx-auto mb-6 ${
            passed
              ? 'bg-gsrp-teal/10 border-2 border-gsrp-teal/30'
              : 'bg-gsrp-sunset/10 border-2 border-gsrp-sunset/30'
          }`}>
            {passed
              ? <CheckCircle2 size={36} className="text-gsrp-teal-light" />
              : <XCircle size={36} className="text-gsrp-sunset" />}
          </div>

          <h2 className="text-3xl font-black text-white mb-2">
            {passed ? 'Ridealong Passed!' : 'Ridealong Failed'}
          </h2>
          <p className="text-gsrp-teal-light/50 text-sm mb-6">
            {passed
              ? 'You have demonstrated the ability to handle real moderation scenarios. Your Discord roles and nickname are being updated.'
              : `You scored ${score}/${total}. A minimum of ${passScore} correct answers is required.`}
          </p>

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

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-gsrp-dark-surface/50 rounded-xl p-3">
              <div className="text-xl font-black text-gsrp-teal-light">{score}</div>
              <div className="text-[10px] text-gsrp-teal-light/30 uppercase tracking-wider">Correct</div>
            </div>
            <div className="bg-gsrp-dark-surface/50 rounded-xl p-3">
              <div className="text-xl font-black text-gsrp-sunset">{total - score}</div>
              <div className="text-[10px] text-gsrp-teal-light/30 uppercase tracking-wider">Wrong</div>
            </div>
            <div className="bg-gsrp-dark-surface/50 rounded-xl p-3">
              <div className="text-xl font-black text-white">{total}</div>
              <div className="text-[10px] text-gsrp-teal-light/30 uppercase tracking-wider">Total</div>
            </div>
          </div>

          {!passed && cooldownRemaining !== null && cooldownRemaining > 0 && (
            <div className="bg-gsrp-sunset/10 border border-gsrp-sunset/20 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-center gap-2 text-gsrp-sunset text-sm font-bold">
                <Clock size={16} />
                <span>Cooldown</span>
              </div>
              <p className="text-2xl font-black text-gsrp-sunset mt-2 tabular-nums">
                {Math.floor(cooldownRemaining / 3600)}h {Math.floor((cooldownRemaining % 3600) / 60)}m {cooldownRemaining % 60}s
              </p>
              <p className="text-gsrp-teal-light/40 text-xs mt-2 text-center">
                Next attempt available {new Date(cooldownUntil).toLocaleString()}
              </p>
            </div>
          )}

          <div className="flex gap-3">
            {passed ? (
              <div className="flex-1 flex gap-3">
                <Link
                  href="/"
                  className="flex-1 px-5 py-3 bg-gsrp-teal text-white rounded-xl font-bold text-sm hover:bg-gsrp-teal/90 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={16} />
                  Return Home
                </Link>
                <Link
                  href="/training"
                  className="flex-1 px-5 py-3 bg-gsrp-dark-surface border border-gsrp-dark-border rounded-xl text-gsrp-teal-light/60 font-bold text-sm hover:border-gsrp-teal/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <BookOpen size={16} />
                  Training
                </Link>
              </div>
            ) : (
              <button
                onClick={handleRetry}
                disabled={cooldownRemaining !== null && cooldownRemaining > 0}
                className={`flex-1 px-5 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  cooldownRemaining !== null && cooldownRemaining > 0
                    ? 'bg-gsrp-dark-surface text-gsrp-teal-light/20 border border-gsrp-dark-border cursor-not-allowed'
                    : 'bg-gsrp-orange text-white hover:bg-gsrp-orange/90'
                }`}
              >
                <RotateCcw size={16} />
                {cooldownRemaining !== null && cooldownRemaining > 0
                  ? `Retry in ${Math.floor(cooldownRemaining / 3600)}h ${Math.floor((cooldownRemaining % 3600) / 60)}m ${cooldownRemaining % 60}s`
                  : 'Retry Ridealong'}
              </button>
            )}
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-bold text-gsrp-teal-light/40 uppercase tracking-wider mb-4">
            Scenario Review — {results.filter(r => !r.correct).length} incorrect
          </h3>
          {results.map((r, i) => (
            <div
              key={i}
              className={`card-glass rounded-xl border mb-2 overflow-hidden ${
                r.correct ? 'border-gsrp-teal/20' : 'border-gsrp-sunset/20'
              }`}
            >
              <button
                onClick={() => setReviewExpanded(prev => ({ ...prev, [i]: !prev[i] }))}
                className="w-full flex items-center justify-between p-4 text-left cursor-pointer hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {r.correct
                    ? <CheckCircle2 size={16} className="text-gsrp-teal-light shrink-0" />
                    : <XCircle size={16} className="text-gsrp-sunset shrink-0" />}
                  <span className="text-sm text-gsrp-teal-light/60 truncate">Scenario {i + 1}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    r.evidenceViewed
                      ? 'bg-gsrp-teal/10 text-gsrp-teal-light'
                      : 'bg-gsrp-sunset/10 text-gsrp-sunset'
                  }`}>
                    {r.evidenceViewed ? 'Evidence OK' : 'No Evidence'}
                  </span>
                  {reviewExpanded[i]
                    ? <ChevronUp size={14} className="text-gsrp-teal-light/30 shrink-0 ml-2" />
                    : <ChevronDown size={14} className="text-gsrp-teal-light/30 shrink-0 ml-2" />}
                </div>
              </button>
              {reviewExpanded[i] && (
                <div className="px-4 pb-4 border-t border-gsrp-dark-border/30 pt-3 animate-fade-in-up space-y-2">
                  <p className="text-xs text-gsrp-teal-light/70 leading-relaxed">
                    <span className="text-gsrp-teal-light/40 block mb-1 text-[10px] uppercase tracking-wider">Your Answer</span>
                    <span className={r.correct ? 'text-gsrp-teal-light' : 'text-gsrp-sunset'}>{r.chosenText}</span>
                  </p>
                  {!r.correct && (
                    <>
                      <p className="text-xs text-gsrp-teal-light">
                        <span className="text-gsrp-teal-light/40 block mb-1 text-[10px] uppercase tracking-wider">Correct Action</span>
                        {r.correctAnswer}
                      </p>
                      <p className="text-xs text-gsrp-teal-light">
                        <span className="text-gsrp-teal-light/40 block mb-1 text-[10px] uppercase tracking-wider">Command</span>
                        <code className="text-gsrp-orange font-mono">{r.correctCommand}</code>
                      </p>
                      {r.wrongReason && (
                        <p className="text-xs text-gsrp-sunset/70 bg-gsrp-sunset/5 rounded-lg p-2.5 mt-2">
                          {r.wrongReason}
                        </p>
                      )}
                    </>
                  )}
                  <p className="text-xs text-gsrp-teal-light/40 mt-1">{r.explanation}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {submitting && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="flex flex-col items-center">
              <Loader2 className="w-8 h-8 text-gsrp-orange animate-spin mb-3" />
              <span className="text-gsrp-teal-light/40 text-sm">Submitting results & updating roles...</span>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto" ref={containerRef}>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-gsrp-teal-light/40 uppercase tracking-wider">
            Scenario {currentQ + 1} of {total}
          </span>
          <span className="text-xs font-bold text-gsrp-orange">
            Score: {score}
          </span>
        </div>
        <div className="h-2 bg-gsrp-dark-surface rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-gsrp-orange to-gsrp-teal-light transition-all duration-500 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {phase === 'popup' && (
        <div className="min-h-[40vh] flex items-center justify-center">
          <ModCallPopup
            modCall={scenario.modCall}
            onRespond={handleRespond}
          />
        </div>
      )}

      {phase === 'scene' && (
        <div className="animate-fade-in-up space-y-5">
          <div className="card-glass rounded-2xl border border-gsrp-dark-border/50 p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-gsrp-orange" />
              <span className="text-[10px] font-bold text-gsrp-teal-light/40 uppercase tracking-wider">
                Scene — Responded to {scenario.modCall.callerName}
              </span>
            </div>
            <p className="text-sm text-gsrp-teal-light/70 leading-relaxed">
              {scenario.sceneDescription}
            </p>
          </div>

          <VideoEvidencePanel
            evidence={scenario.videoEvidence}
            evidenceValid={scenario.evidenceValid !== false}
            onView={handleEvidenceViewed}
          />

          <div className="card-glass rounded-2xl border border-gsrp-dark-border/50 p-6">
            <h3 className="text-xs font-bold text-gsrp-teal-light/40 uppercase tracking-wider mb-4">
              What action do you take?
            </h3>

            <div className="grid gap-3">
              {scenario.options.map((opt) => {
                const isSelected = selectedOption === opt.id
                const isCorrect = answered && opt.correct
                const isWrong = answered && isSelected && !opt.correct

                return (
                  <button
                    key={opt.id}
                    onClick={() => !answered && setSelectedOption(opt.id)}
                    disabled={answered}
                    className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                      isCorrect
                        ? 'border-gsrp-teal/40 bg-gsrp-teal/10'
                        : isWrong
                        ? 'border-gsrp-sunset/40 bg-gsrp-sunset/10'
                        : isSelected
                        ? 'border-gsrp-orange/40 bg-gsrp-orange/10'
                        : 'border-gsrp-dark-border/50 hover:border-gsrp-dark-border hover:bg-gsrp-dark-surface/40'
                    } ${answered ? 'cursor-default' : ''}`}
                  >
                    <span className={`flex items-center justify-center w-7 h-7 rounded-lg text-xs font-black shrink-0 mt-0.5 ${
                      isCorrect
                        ? 'bg-gsrp-teal text-white'
                        : isWrong
                        ? 'bg-gsrp-sunset text-white'
                        : isSelected
                        ? 'bg-gsrp-orange text-white'
                        : 'bg-gsrp-dark-surface text-gsrp-teal-light/40 border border-gsrp-dark-border'
                    }`}>
                      {isCorrect ? '✓' : isWrong ? '✗' : opt.id.toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <span className={`text-sm font-medium block ${
                        isCorrect ? 'text-gsrp-teal-light' : isWrong ? 'text-gsrp-sunset' : isSelected ? 'text-white' : 'text-gsrp-teal-light/70'
                      }`}>
                        {opt.text}
                      </span>

                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {answered && (
            <div className={`card-glass rounded-2xl border p-5 animate-fade-in-up ${
              results[results.length - 1]?.correct
                ? 'border-gsrp-teal/30'
                : 'border-gsrp-sunset/30'
            }`}>
              <div className="flex items-start gap-3 mb-3">
                {results[results.length - 1]?.correct ? (
                  <CheckCircle2 size={20} className="text-gsrp-teal-light shrink-0 mt-0.5" />
                ) : (
                  <XCircle size={20} className="text-gsrp-sunset shrink-0 mt-0.5" />
                )}
                <div>
                  <p className={`text-sm font-bold mb-1 ${
                    results[results.length - 1]?.correct ? 'text-gsrp-teal-light' : 'text-gsrp-sunset'
                  }`}>
                    {results[results.length - 1]?.correct ? '✓ Correct!' : '✗ Incorrect'}
                  </p>
                  {results[results.length - 1]?.wrongReason && (
                    <p className="text-xs text-gsrp-sunset/80 mb-2 bg-gsrp-sunset/5 rounded-lg p-2.5">
                      {results[results.length - 1].wrongReason}
                    </p>
                  )}
                  <p className="text-xs text-gsrp-teal-light/50">{scenario.explanation}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Camera size={12} className="text-gsrp-teal-light/30" />
                    <span className={`text-[10px] ${evidenceViewed ? 'text-gsrp-teal-light/50' : 'text-gsrp-sunset/50'}`}>
                      {evidenceViewed ? 'Video evidence was reviewed' : 'Video evidence was not requested'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              {evidenceViewed && (
                <span className="flex items-center gap-1.5 text-[10px] text-gsrp-teal-light/40 bg-gsrp-teal/10 px-2.5 py-1 rounded-lg">
                  <Camera size={10} />
                  Evidence reviewed
                </span>
              )}
            </div>
            <div className="flex gap-3">
              {!answered ? (
                <button
                  onClick={handleCheck}
                  disabled={selectedOption === null || !evidenceViewed}
                  className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                    selectedOption !== null && evidenceViewed
                      ? 'bg-gsrp-orange text-white hover:bg-gsrp-orange/90'
                      : 'bg-gsrp-dark-surface text-gsrp-teal-light/20 border border-gsrp-dark-border cursor-not-allowed'
                  }`}
                >
                  {!evidenceViewed ? 'Review Evidence First' : 'Confirm Answer'}
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="px-6 py-2.5 bg-gsrp-orange text-white rounded-xl text-sm font-bold hover:bg-gsrp-orange/90 transition-all cursor-pointer flex items-center gap-2"
                >
                  {currentQ + 1 >= total ? 'Finish' : 'Next Scenario'}
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
