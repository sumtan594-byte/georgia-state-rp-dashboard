import { useState, useCallback, useRef, useEffect } from 'react'
import {
  Loader2, CheckCircle2, XCircle, ArrowRight, RotateCcw, Clock,
  Shield, ChevronDown, ChevronUp, BookOpen, AlertTriangle, Camera,
  FileText, Search, X,
  Copy, Check, SkipForward,
} from 'lucide-react'
import Link from 'next/link'
import ModCallPopup from './ModCallPopup'
import VideoEvidencePanel from './VideoEvidencePanel'
import PostRidealongOrientation from './PostRidealongOrientation'
import { MOCK_USERS, matchesOffense } from '../../lib/ridealong-scenarios'

const PUNISHMENT_OPTIONS = ['Warn', 'Kick', 'Ban']

function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function formatTime(ts) {
  try {
    return new Date(ts).toLocaleString()
  } catch {
    return ts
  }
}

export default function RidealongEngine({
  scenarios,
  passScore,
  cooldownHours,
  onSubmit,
  user,
  onSaveProgress,
  onClearProgress,
  onCompleteRidealong,
  onRidealongComplete,
  robloxUsername: propRobloxUsername,
  discordDisplayName: propDiscordDisplayName,
  canSkipQuestions = false,
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
  const [rpLogOpen, setRpLogOpen] = useState(false)
  const [rpLogsViewed, setRpLogsViewed] = useState(false)
  const [rpDecision, setRpDecision] = useState(null)
  const [pFormData, setPFormData] = useState({ offender: '', punishment: '', reason: '' })
  const [pFormUserOpen, setPFormUserOpen] = useState(false)
  const [pFormError, setPFormError] = useState('')
  const [pFormHints, setPFormHints] = useState({ offender: false, punishment: false, reason: false })
  const [pFormAttempts, setPFormAttempts] = useState({ offender: 0, punishment: 0, reason: 0 })
  const [rpLogData, setRpLogData] = useState({ location: '', duration: '', peopleCount: '' })
  const [rpLogFormOpen, setRpLogFormOpen] = useState(false)
  const [rpLogError, setRpLogError] = useState('')
  const [rpLogHints, setRpLogHints] = useState({ location: false, duration: false, peopleCount: false })
  const [rpLogAttempts, setRpLogAttempts] = useState({ location: 0, duration: 0, peopleCount: 0 })
  const containerRef = useRef(null)
  const total = scenarios.length

  const [orientationStep, setOrientationStep] = useState(null)
  const [submitResolved, setSubmitResolved] = useState(false)

  const robloxUsername = propRobloxUsername || user?.name || 'Moderator'
  const discordDisplayName = propDiscordDisplayName || user?.name || 'Moderator'


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
  const isRplog = scenario.type === 'rp-log'
  const isPlog = scenario.type === 'p-log'
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
      type: 'standard',
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

  const handleRpLogDecision = useCallback((choice) => {
    if (!scenario || answered) return

    const isCorrect = choice === 'log' ? !scenario.hasOngoing : scenario.hasOngoing

    if (isCorrect) setScore(prev => prev + 1)

    let wrongReason = null
    if (!isCorrect) {
      wrongReason = choice === 'log'
        ? 'You checked the logs and found an active RP. Logging a new one would cause scene interference. You should have informed the caller to wait.'
        : 'You checked the logs and found no active RPs. The caller should have been permitted to start their RP.'
    }

    const result = {
      scenarioId: scenario.id,
      evidenceValid: true,
      correct: isCorrect,
      chosenOption: choice,
      chosenText: choice === 'log' ? 'Log the RP' : 'Inform caller to wait',
      correctAnswer: scenario.hasOngoing
        ? 'Inform the caller that this RP is already being handled'
        : 'Log the RP with details',
      correctCommand: scenario.hasOngoing ? 'N/A' : ';log_rp',
      explanation: scenario.explanation,
      wrongReason,
      evidenceViewed,
      type: 'rp-log',
    }

    const newResults = [...results, result]
    setResults(newResults)
    setAnswered(true)
    setRpDecision(choice)

    if (onSaveProgress) {
      onSaveProgress({
        currentQ,
        score: score + (isCorrect ? 1 : 0),
        results: newResults,
        phase: 'result',
      })
    }
  }, [scenario, answered, results, score, evidenceViewed, onSaveProgress])

  const handleRpLogSubmit = useCallback(() => {
    if (!scenario || answered) return

    if (!rpLogData.location.trim() || !rpLogData.duration.trim() || !rpLogData.peopleCount.trim()) {
      setRpLogError('Please fill in all fields before submitting.')
      return
    }
    setRpLogError('')

    const parseDuration = (val) => {
      const n = parseInt(val, 10)
      return isNaN(n) ? null : n
    }

    const locationMatch = rpLogData.location.trim().toLowerCase() === scenario.location.toLowerCase()
    const durationMatch = parseDuration(rpLogData.duration) === parseDuration(scenario.duration)
    const peopleMatch = rpLogData.peopleCount.trim() === String(scenario.peopleCount)

    const isCorrect = locationMatch && durationMatch && peopleMatch && !scenario.hasOngoing

    let wrongReason = null
    if (scenario.hasOngoing) {
      wrongReason = 'There is already an active RP. You should have informed the caller to wait.'
    } else if (!isCorrect) {
      wrongReason = 'One or more fields were incorrect. Please check the location, duration, and people count.'
    }

    if (isCorrect) setScore(prev => prev + 1)

    const result = {
      scenarioId: scenario.id,
      evidenceValid: true,
      correct: isCorrect,
      chosenOption: 'log',
      chosenText: `Logged: ${rpLogData.location}, ${rpLogData.duration}, ${rpLogData.peopleCount} people`,
      correctAnswer: scenario.hasOngoing
        ? 'Inform the caller that this RP is already being handled'
        : `Logged: ${scenario.location}, ${scenario.duration}, ${scenario.peopleCount} people`,
      correctCommand: scenario.hasOngoing ? 'N/A' : ';log_rp',
      explanation: scenario.explanation,
      wrongReason,
      evidenceViewed,
      type: 'rp-log'
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
  }, [scenario, answered, rpLogData, results, score, evidenceViewed, onSaveProgress])

  const handlePFormSubmit = useCallback(() => {
    if (!scenario || answered) return

    if (!pFormData.offender.trim() || !pFormData.punishment || !pFormData.reason.trim()) {
      setPFormError('Please fill in all fields before submitting.')
      return
    }
    setPFormError('')

    const normalizeOffender = (v) => v.trim().replace(/^["']|["']$/g, '').toLowerCase()
    const offenderMatch = normalizeOffender(pFormData.offender) === normalizeOffender(scenario.offender)
    const punishmentMatch = pFormData.punishment.trim().toLowerCase() === scenario.correctPunishment.toLowerCase()
    const reasonMatch = matchesOffense(pFormData.reason, scenario)

    const newPFormAttempts = {
      offender: pFormAttempts.offender + (offenderMatch ? 0 : 1),
      punishment: pFormAttempts.punishment + (punishmentMatch ? 0 : 1),
      reason: pFormAttempts.reason + (reasonMatch ? 0 : 1),
    }
    setPFormAttempts(newPFormAttempts)

    const newPFormHints = {
      offender: !offenderMatch,
      punishment: !punishmentMatch,
      reason: !reasonMatch,
    }
    setPFormHints(newPFormHints)

    const matchedFields = [offenderMatch, punishmentMatch, reasonMatch].filter(Boolean).length
    const isCorrect = matchedFields === 3

    if (isCorrect) setScore(prev => prev + 1)

    const result = {
      scenarioId: scenario.id,
      evidenceValid: true,
      correct: isCorrect,
      chosenOption: 'form',
      chosenText: `Offender: ${pFormData.offender}, Punishment: ${pFormData.punishment}, Reason: ${pFormData.reason}`,
      correctAnswer: `Offender: ${scenario.offender}, Punishment: ${scenario.correctPunishment}, Reason: ${scenario.correctReason}`,
      correctCommand: '',
      explanation: scenario.explanation,
      wrongReason: !isCorrect
        ? `You matched ${matchedFields}/3 fields correctly. ${!offenderMatch ? 'Offender name was incorrect. ' : ''}${!punishmentMatch ? `Expected punishment: ${scenario.correctPunishment}. ` : ''}${!reasonMatch ? `Expected reason mentions "${scenario.offenseKeywords ? scenario.offenseKeywords[0].toUpperCase() : scenario.correctReason}".` : ''}`
        : null,
      evidenceViewed,
      type: 'p-log',
      pFormMatched: { offender: offenderMatch, punishment: punishmentMatch, reason: reasonMatch },
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
  }, [scenario, answered, pFormData, pFormAttempts, results, score, evidenceViewed, onSaveProgress])


  const handleOrientationComplete = useCallback(() => {
    if (onRidealongComplete) {
      onRidealongComplete()
      return
    }
    setOrientationStep(null)
    setShowResults(true)
  }, [onRidealongComplete])

  const moveToQuestion = useCallback((nextQ) => {
    setCurrentQ(nextQ)
    setEvidenceViewed(false)
    setSelectedOption(null)
    setAnswered(false)
    setPhase('popup')
    setRpLogOpen(false)
    setRpLogsViewed(false)
    setRpDecision(null)
    setPFormData({ offender: '', punishment: '', reason: '' })
    setPFormUserOpen(false)
    setPFormError('')
    setPFormHints({ offender: false, punishment: false, reason: false })
    setPFormAttempts({ offender: 0, punishment: 0, reason: 0 })
    setRpLogData({ location: '', duration: '', peopleCount: '' })
    setRpLogFormOpen(false)
    setRpLogError('')
    setRpLogHints({ location: false, duration: false, peopleCount: false })
    setRpLogAttempts({ location: 0, duration: 0, peopleCount: 0 })
    containerRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const finishAttempt = useCallback((finalScore, finalResults) => {
    const passed = finalScore >= passScore
    setHasPassed(passed)
    if (onClearProgress) onClearProgress()

    if (!passed) {
      setShowResults(true)
      const cooldownMs = cooldownHours * 60 * 60 * 1000
      setCooldownUntil(new Date(Date.now() + cooldownMs).toISOString())
    } else {
      setOrientationStep(0)
    }

    setSubmitting(true)
    onSubmit({
      score: finalScore,
      total,
      pct: Math.round((finalScore / total) * 100),
      pass: passed,
      results: finalResults,
    }).finally(() => {
      setSubmitting(false)
      setSubmitResolved(true)
    })
  }, [passScore, onClearProgress, cooldownHours, onSubmit, total])

  const handleSkipQuestion = useCallback(() => {
    if (!canSkipQuestions || !scenario || answered) return

    const correctOption = Array.isArray(scenario.options)
      ? scenario.options.find(o => o.correct)
      : null

    const result = {
      scenarioId: scenario.id,
      evidenceValid: scenario.evidenceValid !== false,
      correct: true,
      chosenOption: 'tester-skip',
      chosenText: 'Skipped by tester',
      correctAnswer: isPlog
        ? `Offender: ${scenario.offender}, Punishment: ${scenario.correctPunishment}, Reason: ${scenario.correctReason}`
        : isRplog
        ? (scenario.hasOngoing
            ? 'Inform the caller that this RP is already being handled'
            : `Logged: ${scenario.location}, ${scenario.duration}, ${scenario.peopleCount} people`)
        : correctOption?.text || '',
      correctCommand: isPlog ? '' : isRplog ? (scenario.hasOngoing ? 'N/A' : ';log_rp') : correctOption?.command || '',
      explanation: scenario.explanation,
      wrongReason: null,
      evidenceViewed: true,
      type: scenario.type || 'standard',
      skippedByTester: true,
    }

    const newScore = score + 1
    const newResults = [...results, result]
    setScore(newScore)
    setResults(newResults)
    setAnswered(true)

    if (onSaveProgress) {
      onSaveProgress({
        currentQ,
        score: newScore,
        results: newResults,
        phase: 'result',
      })
    }

    if (currentQ + 1 >= total) {
      finishAttempt(newScore, newResults)
    } else {
      moveToQuestion(currentQ + 1)
    }
  }, [
    canSkipQuestions,
    scenario,
    answered,
    isPlog,
    isRplog,
    score,
    results,
    onSaveProgress,
    currentQ,
    total,
    finishAttempt,
    moveToQuestion,
  ])

  const handleNext = useCallback(() => {
    if (currentQ + 1 >= total) {
      finishAttempt(score, results)
    } else {
      moveToQuestion(currentQ + 1)
    }
  }, [currentQ, total, score, finishAttempt, results, moveToQuestion])

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
    setRpLogOpen(false)
    setRpLogsViewed(false)
    setRpDecision(null)
    setPFormData({ offender: '', punishment: '', reason: '' })
    setPFormUserOpen(false)
    setPFormError('')
    setPFormHints({ offender: false, punishment: false, reason: false })
    setPFormAttempts({ offender: 0, punishment: 0, reason: 0 })
    setRpLogData({ location: '', duration: '', peopleCount: '' })
    setRpLogFormOpen(false)
    setRpLogError('')
    setRpLogHints({ location: false, duration: false, peopleCount: false })
    setRpLogAttempts({ location: 0, duration: 0, peopleCount: 0 })
    setOrientationStep(null)
    setSubmitResolved(false)
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

          <h2 className="text-3xl font-bold text-white mb-2">
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
              <span className="text-3xl font-bold text-white">{pct}%</span>
              <span className="text-[10px] text-gsrp-teal-light/40 uppercase tracking-wider">Score</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-gsrp-dark-surface/50 rounded-xl p-3">
              <div className="text-xl font-bold text-gsrp-teal-light">{score}</div>
              <div className="text-[10px] text-gsrp-teal-light/30 uppercase tracking-wider">Correct</div>
            </div>
            <div className="bg-gsrp-dark-surface/50 rounded-xl p-3">
              <div className="text-xl font-bold text-gsrp-sunset">{total - score}</div>
              <div className="text-[10px] text-gsrp-teal-light/30 uppercase tracking-wider">Wrong</div>
            </div>
            <div className="bg-gsrp-dark-surface/50 rounded-xl p-3">
              <div className="text-xl font-bold text-white">{total}</div>
              <div className="text-[10px] text-gsrp-teal-light/30 uppercase tracking-wider">Total</div>
            </div>
          </div>

          {!passed && cooldownRemaining !== null && cooldownRemaining > 0 && (
            <div className="bg-gsrp-sunset/10 border border-gsrp-sunset/20 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-center gap-2 text-gsrp-sunset text-sm font-bold">
                <Clock size={16} />
                <span>Cooldown</span>
              </div>
              <p className="text-2xl font-bold text-gsrp-sunset mt-2 tabular-nums">
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
                  {r.type === 'rp-log' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gsrp-teal/10 text-gsrp-teal-light/50">RP-Log</span>
                  )}
                  {r.type === 'p-log' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gsrp-orange/10 text-gsrp-orange/50">P-Log</span>
                  )}
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
                      {r.correctCommand && (
                        <p className="text-xs text-gsrp-teal-light">
                          <span className="text-gsrp-teal-light/40 block mb-1 text-[10px] uppercase tracking-wider">Command</span>
                          <code className="text-gsrp-orange font-mono">{r.correctCommand}</code>
                        </p>
                      )}
                      {r.wrongReason && (
                        <p className="text-xs text-gsrp-sunset/70 bg-gsrp-sunset/5 rounded-lg p-2.5 mt-2">
                          {r.wrongReason}
                        </p>
                      )}
                    </>
                  )}
                  {r.type === 'p-log' && r.pFormMatched && (
                    <div className="flex gap-2 mt-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${r.pFormMatched.offender ? 'bg-gsrp-teal/10 text-gsrp-teal-light' : 'bg-gsrp-sunset/10 text-gsrp-sunset'}`}>
                        Offender {r.pFormMatched.offender ? '✓' : '✗'}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${r.pFormMatched.punishment ? 'bg-gsrp-teal/10 text-gsrp-teal-light' : 'bg-gsrp-sunset/10 text-gsrp-sunset'}`}>
                        Punishment {r.pFormMatched.punishment ? '✓' : '✗'}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${r.pFormMatched.reason ? 'bg-gsrp-teal/10 text-gsrp-teal-light' : 'bg-gsrp-sunset/10 text-gsrp-sunset'}`}>
                        Reason {r.pFormMatched.reason ? '✓' : '✗'}
                      </span>
                    </div>
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

  if (orientationStep !== null) {
    return (
      <PostRidealongOrientation
        robloxUsername={robloxUsername}
        discordDisplayName={discordDisplayName}
        submitResolved={submitResolved}
        onApplyRoles={onCompleteRidealong}
        onComplete={handleOrientationComplete}
      />
    )
  }

  return (
    <div className="max-w-3xl mx-auto" ref={containerRef}>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-gsrp-teal-light/40 uppercase tracking-wider">
            Scenario {currentQ + 1} of {total}
            {isRplog && <span className="ml-2 text-gsrp-teal-light/30">— RP Logging</span>}
            {isPlog && <span className="ml-2 text-gsrp-teal-light/30">— Punishment Logging</span>}
          </span>
          <div className="flex items-center gap-3">
            {canSkipQuestions && !answered && (
              <button
                type="button"
                onClick={handleSkipQuestion}
                disabled={submitting}
                className="px-3 py-1.5 rounded-lg border border-gsrp-orange/30 bg-gsrp-orange/10 text-gsrp-orange text-[10px] font-bold uppercase tracking-wider hover:bg-gsrp-orange/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <SkipForward size={12} />
                Skip question
              </button>
            )}
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
              {isRplog && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gsrp-teal/10 text-gsrp-teal-light/50 ml-auto">
                  RP Logging
                </span>
              )}
              {isPlog && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gsrp-orange/10 text-gsrp-orange/50 ml-auto">
                  Punishment Log
                </span>
              )}
            </div>
            <p className="text-sm text-gsrp-teal-light/70 leading-relaxed">
              {scenario.sceneDescription}
            </p>
          </div>

          <VideoEvidencePanel
            evidence={scenario.videoEvidence}
            evidenceValid={scenario.evidenceValid !== false}
            onView={handleEvidenceViewed}
            requestLabel={isRplog ? 'Request more details' : undefined}
          />

          {isRplog && !answered && (
            <div className="card-glass rounded-2xl border border-gsrp-dark-border/50 p-6">
              {!rpLogsViewed ? (
                <div className="text-center py-6">
                  <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-gsrp-teal/10 border border-gsrp-teal/20 mx-auto mb-4">
                    <Search size={24} className="text-gsrp-teal-light" />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-2">Check Active Logs</h3>
                  <p className="text-xs text-gsrp-teal-light/50 mb-5 max-w-md mx-auto">
                    Before making a decision, review the currently active roleplay logs to check for conflicts.
                  </p>
                  <button
                    onClick={() => setRpLogOpen(true)}
                    className="px-5 py-2.5 bg-gsrp-teal/10 border border-gsrp-teal/30 text-gsrp-teal-light rounded-xl text-sm font-bold hover:bg-gsrp-teal/20 transition-all cursor-pointer flex items-center gap-2 mx-auto"
                  >
                    <FileText size={14} />
                    Request Chat Logs
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <FileText size={14} className="text-gsrp-teal-light" />
                    <h3 className="text-xs font-bold text-gsrp-teal-light/60 uppercase tracking-wider">
                      Logs Reviewed — Make Your Decision
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gsrp-teal/10 text-gsrp-teal-light">
                      Logs Viewed
                    </span>
                    <button
                      onClick={() => setRpLogOpen(true)}
                      className="text-[10px] text-gsrp-teal-light/40 underline hover:text-gsrp-teal-light/60 cursor-pointer"
                    >
                      Re-open logs
                    </button>
                  </div>
                  {!rpLogFormOpen ? (
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setRpLogFormOpen(true)}
                        disabled={!evidenceViewed}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                          !evidenceViewed
                            ? 'border-gsrp-dark-border/30 bg-gsrp-dark-surface/30 opacity-50 cursor-not-allowed'
                            : 'border-gsrp-teal/30 bg-gsrp-teal/5 hover:bg-gsrp-teal/10 hover:border-gsrp-teal/50'
                        }`}
                      >
                        <span className="block text-sm font-bold text-white mb-1">Log the RP</span>
                        <span className="block text-[11px] text-gsrp-teal-light/50">
                          Fill out the RP log form
                        </span>
                      </button>
                      <button
                        onClick={() => handleRpLogDecision('inform')}
                        disabled={!evidenceViewed}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                          !evidenceViewed
                            ? 'border-gsrp-dark-border/30 bg-gsrp-dark-surface/30 opacity-50 cursor-not-allowed'
                            : 'border-gsrp-orange/30 bg-gsrp-orange/5 hover:bg-gsrp-orange/10 hover:border-gsrp-orange/50'
                        }`}
                      >
                        <span className="block text-sm font-bold text-white mb-1">Inform Caller to Wait</span>
                        <span className="block text-[11px] text-gsrp-teal-light/50">
                          There is already an active RP
                        </span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4 bg-gsrp-dark-surface/50 p-4 rounded-xl border border-gsrp-dark-border/50">
                      <h4 className="text-xs font-bold text-gsrp-teal-light/60 uppercase tracking-wider mb-2">RP Logging Form</h4>
                      <div>
                        <label className="text-[11px] font-bold text-gsrp-teal-light/40 uppercase tracking-wider block mb-1.5">Location</label>
                        <input
                          type="text"
                          value={rpLogData.location}
                          onChange={e => setRpLogData(prev => ({ ...prev, location: e.target.value }))}
                          placeholder="e.g. Bank of River City"
                          className={`w-full px-4 py-2 bg-gsrp-dark-surface rounded-xl text-sm text-white placeholder:text-gsrp-teal-light/20 focus:outline-none transition-all ${
                            rpLogData.location.length > 0
                              ? rpLogData.location.trim().toLowerCase() === scenario.location.toLowerCase()
                                ? 'border-2 border-gsrp-teal/60'
                                : 'border-2 border-gsrp-sunset/60'
                              : 'border border-gsrp-dark-border/50'
                          }`}
                        />
                        {rpLogData.location.length > 0 && !answered && (() => {
                          const m = rpLogData.location.trim().toLowerCase() === scenario.location.toLowerCase()
                          return (
                            <div className={`flex items-start gap-1.5 mt-1.5 text-[11px] animate-fade-in-up ${m ? 'text-gsrp-teal-light' : 'text-gsrp-sunset'}`}>
                              {m ? <CheckCircle2 size={12} className="shrink-0 mt-0.5" /> : <XCircle size={12} className="shrink-0 mt-0.5" />}
                              <span>{m ? 'Correct location' : `Expected: ${scenario.location}`}</span>
                            </div>
                          )
                        })()}
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-gsrp-teal-light/40 uppercase tracking-wider block mb-1.5">Duration</label>
                        <input
                          type="text"
                          value={rpLogData.duration}
                          onChange={e => setRpLogData(prev => ({ ...prev, duration: e.target.value }))}
                          placeholder="e.g. 20m"
                          className={`w-full px-4 py-2 bg-gsrp-dark-surface rounded-xl text-sm text-white placeholder:text-gsrp-teal-light/20 focus:outline-none transition-all ${
                            rpLogData.duration.length > 0
                              ? (() => {
                                  const p = (v) => { const n = parseInt(v, 10); return isNaN(n) ? null : n }
                                  const m = p(rpLogData.duration) === p(scenario.duration)
                                  return m ? 'border-2 border-gsrp-teal/60' : 'border-2 border-gsrp-sunset/60'
                                })()
                              : 'border border-gsrp-dark-border/50'
                          }`}
                        />
                        {rpLogData.duration.length > 0 && !answered && (() => {
                          const p = (v) => { const n = parseInt(v, 10); return isNaN(n) ? null : n }
                          const m = p(rpLogData.duration) === p(scenario.duration)
                          return (
                            <div className={`flex items-start gap-1.5 mt-1.5 text-[11px] animate-fade-in-up ${m ? 'text-gsrp-teal-light' : 'text-gsrp-sunset'}`}>
                              {m ? <CheckCircle2 size={12} className="shrink-0 mt-0.5" /> : <XCircle size={12} className="shrink-0 mt-0.5" />}
                              <span>{m ? 'Correct duration' : `Expected: ${scenario.duration}`}</span>
                            </div>
                          )
                        })()}
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-gsrp-teal-light/40 uppercase tracking-wider block mb-1.5">Amount of People</label>
                        <input
                          type="number"
                          value={rpLogData.peopleCount}
                          onChange={e => setRpLogData(prev => ({ ...prev, peopleCount: e.target.value }))}
                          placeholder="e.g. 5"
                          className={`w-full px-4 py-2 bg-gsrp-dark-surface rounded-xl text-sm text-white placeholder:text-gsrp-teal-light/20 focus:outline-none transition-all ${
                            rpLogData.peopleCount.length > 0
                              ? rpLogData.peopleCount.trim() === String(scenario.peopleCount)
                                ? 'border-2 border-gsrp-teal/60'
                                : 'border-2 border-gsrp-sunset/60'
                              : 'border border-gsrp-dark-border/50'
                          }`}
                        />
                        {rpLogData.peopleCount.length > 0 && !answered && (() => {
                          const m = rpLogData.peopleCount.trim() === String(scenario.peopleCount)
                          return (
                            <div className={`flex items-start gap-1.5 mt-1.5 text-[11px] animate-fade-in-up ${m ? 'text-gsrp-teal-light' : 'text-gsrp-sunset'}`}>
                              {m ? <CheckCircle2 size={12} className="shrink-0 mt-0.5" /> : <XCircle size={12} className="shrink-0 mt-0.5" />}
                              <span>{m ? 'Correct number of people' : `Expected: ${scenario.peopleCount}`}</span>
                            </div>
                          )
                        })()}
                      </div>
                      {rpLogError && <p className="text-xs text-gsrp-sunset">{rpLogError}</p>}
                      <div className="flex gap-2">
                        <button
                          onClick={() => setRpLogFormOpen(false)}
                          className="flex-1 py-2 rounded-xl text-sm font-bold bg-gsrp-dark-surface border border-gsrp-dark-border text-white"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleRpLogSubmit}
                          className="flex-1 py-2 rounded-xl text-sm font-bold bg-gsrp-teal text-white hover:bg-gsrp-teal/90"
                        >
                          Submit Log
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {rpLogOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => {}} />
              <div className="relative w-full max-w-lg max-h-[80vh] overflow-y-auto bg-gsrp-dark-surface border border-gsrp-dark-border/50 rounded-2xl shadow-2xl animate-scale-in">
                <div className="sticky top-0 bg-gsrp-dark-surface/95 backdrop-blur-sm border-b border-gsrp-dark-border/30 px-5 py-4 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileText size={14} className="text-gsrp-teal-light" />
                    Active Roleplay Logs
                  </h3>
                  <span className="text-[10px] text-gsrp-teal-light/30">
                    {scenario.logs.filter(l => l.active).length} active
                  </span>
                </div>
                <div className="p-5 space-y-3">
                  {scenario.logs.length === 0 ? (
                    <p className="text-xs text-gsrp-teal-light/40 text-center py-8">
                      No roleplay logs found in the system.
                    </p>
                  ) : (
                    scenario.logs.map((log, idx) => (
                      <div
                        key={idx}
                        className={`rounded-xl border p-4 ${
                          log.active
                            ? 'border-gsrp-teal/20 bg-gsrp-teal/5'
                            : 'border-gsrp-dark-border/30 bg-gsrp-dark-surface/30'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-white">{log.player}</span>
                          {log.active ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gsrp-teal/10 text-gsrp-teal-light">
                              Active
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gsrp-dark-border/30 text-gsrp-teal-light/30">
                              Inactive
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                          <span className="text-gsrp-teal-light/40">Type:</span>
                          <span className="text-gsrp-teal-light/70">{log.type || scenario.rpType?.label || 'RP'}</span>
                          <span className="text-gsrp-teal-light/40">Location:</span>
                          <span className="text-gsrp-teal-light/70">{log.location}</span>
                          <span className="text-gsrp-teal-light/40">Duration:</span>
                          <span className="text-gsrp-teal-light/70">{log.duration || `${log.ends || 'N/A'}`}</span>
                          {log.quickKill && (
                            <>
                              <span className="text-gsrp-teal-light/40">Quick Kill:</span>
                              <span className="text-gsrp-teal-light/70">{log.quickKill}</span>
                            </>
                          )}
                          <span className="text-gsrp-teal-light/40">Moderator:</span>
                          <span className="text-gsrp-teal-light/70">{log.moderator}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="sticky bottom-0 bg-gsrp-dark-surface/95 backdrop-blur-sm border-t border-gsrp-dark-border/30 px-5 py-4">
                  <button
                    onClick={() => { setRpLogOpen(false); setRpLogsViewed(true) }}
                    className="w-full py-2.5 bg-gsrp-orange text-white rounded-xl text-sm font-bold hover:bg-gsrp-orange/90 transition-all cursor-pointer"
                  >
                    Close Logs — I've Reviewed Them
                  </button>
                </div>
              </div>
            </div>
          )}

          {isPlog && !answered && (
            <div className="card-glass rounded-2xl border border-gsrp-dark-border/50 p-6">
              <div className="flex items-center gap-2 mb-5">
                <Shield size={14} className="text-gsrp-orange" />
                <h3 className="text-xs font-bold text-gsrp-teal-light/40 uppercase tracking-wider">
                  Melonly Punishment Form
                </h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-gsrp-teal-light/40 uppercase tracking-wider block mb-1.5">
                    Offender Username
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={pFormData.offender}
                      onChange={e => {
                        setPFormData(prev => ({ ...prev, offender: e.target.value }))
                        setPFormUserOpen(e.target.value.length > 0)
                      }}
                      onFocus={() => setPFormUserOpen(pFormData.offender.length > 0)}
                      placeholder="Search username..."
                      className={`w-full px-4 py-2.5 bg-gsrp-dark-surface rounded-xl text-sm text-gsrp-teal-light/70 placeholder:text-gsrp-teal-light/20 focus:outline-none transition-all ${
                        pFormData.offender.length > 0
                          ? (() => {
                              const n = (v) => v.trim().replace(/^["']|["']$/g, '').toLowerCase()
                              const m = n(pFormData.offender) === n(scenario.offender)
                              return m
                                ? 'border-2 border-gsrp-teal/60'
                                : 'border-2 border-gsrp-sunset/60'
                            })()
                          : 'border border-gsrp-dark-border/50'
                      }`}
                    />
                    {pFormUserOpen && (
                      <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-gsrp-dark-surface border border-gsrp-dark-border/50 rounded-xl shadow-xl max-h-40 overflow-y-auto">
                        {MOCK_USERS
                          .filter(n => n.toLowerCase().includes(pFormData.offender.toLowerCase()))
                          .slice(0, 8)
                          .map(n => (
                            <button
                              key={n}
                              onClick={() => {
                                setPFormData(prev => ({ ...prev, offender: n }))
                                setPFormUserOpen(false)
                              }}
                              className="w-full text-left px-4 py-2 text-xs text-gsrp-teal-light/70 hover:bg-gsrp-teal/10 hover:text-gsrp-teal-light transition-colors cursor-pointer"
                            >
                              {n}
                            </button>
                          ))}
                        {MOCK_USERS.filter(n => n.toLowerCase().includes(pFormData.offender.toLowerCase())).length === 0 && (
                          <p className="px-4 py-2 text-xs text-gsrp-teal-light/30">No users found</p>
                        )}
                      </div>
                    )}
                  </div>
                  {pFormData.offender.length > 0 && !answered && (() => {
                    const n = (v) => v.trim().replace(/^["']|["']$/g, '').toLowerCase()
                    const m = n(pFormData.offender) === n(scenario.offender)
                    return (
                      <div className={`flex items-start gap-1.5 mt-1.5 text-[11px] animate-fade-in-up ${m ? 'text-gsrp-teal-light' : 'text-gsrp-sunset'}`}>
                        {m ? <CheckCircle2 size={12} className="shrink-0 mt-0.5" /> : <XCircle size={12} className="shrink-0 mt-0.5" />}
                        <span>
                          {m
                            ? 'Correct offender'
                            : `Expected: ${scenario.offender}`}
                        </span>
                      </div>
                    )
                  })()}
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gsrp-teal-light/40 uppercase tracking-wider block mb-1.5">
                    Punishment Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {PUNISHMENT_OPTIONS.map(p => {
                      const selected = pFormData.punishment === p
                      const correct = p.toLowerCase() === scenario.correctPunishment.toLowerCase()
                      return (
                        <button
                          key={p}
                          onClick={() => setPFormData(prev => ({ ...prev, punishment: p }))}
                          className={`py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                            selected && correct
                              ? 'bg-gsrp-teal text-white ring-2 ring-gsrp-teal/50'
                              : selected && !correct
                              ? 'bg-gsrp-sunset text-white ring-2 ring-gsrp-sunset/50'
                              : selected
                              ? 'bg-gsrp-orange text-white'
                              : 'bg-gsrp-dark-surface border border-gsrp-dark-border/50 text-gsrp-teal-light/50 hover:border-gsrp-orange/30 hover:text-gsrp-teal-light/70'
                          }`}
                        >
                          {p}
                        </button>
                      )
                    })}
                  </div>
                  {pFormData.punishment && !answered && (() => {
                    const correct = pFormData.punishment.toLowerCase() === scenario.correctPunishment.toLowerCase()
                    return (
                      <div className={`flex items-start gap-1.5 mt-1.5 text-[11px] animate-fade-in-up ${correct ? 'text-gsrp-teal-light' : 'text-gsrp-sunset'}`}>
                        {correct ? <CheckCircle2 size={12} className="shrink-0 mt-0.5" /> : <XCircle size={12} className="shrink-0 mt-0.5" />}
                        <span>
                          {correct
                            ? `Correct — ${pFormData.punishment} is the right level`
                            : `Expected: ${scenario.correctPunishment}`}
                        </span>
                      </div>
                    )
                  })()}
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gsrp-teal-light/40 uppercase tracking-wider block mb-1.5">
                    Reason
                  </label>
                  <input
                    type="text"
                    value={pFormData.reason}
                    onChange={e => setPFormData(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="Type the reason..."
                    className={`w-full px-4 py-2.5 bg-gsrp-dark-surface rounded-xl text-sm text-gsrp-teal-light/70 placeholder:text-gsrp-teal-light/20 focus:outline-none transition-all ${
                      pFormData.reason.length > 2
                        ? matchesOffense(pFormData.reason, scenario)
                          ? 'border-2 border-gsrp-teal/60'
                          : 'border-2 border-gsrp-sunset/60'
                        : 'border border-gsrp-dark-border/50'
                    }`}
                  />
                  {pFormData.reason.length > 2 && !answered && (() => {
                    const m = matchesOffense(pFormData.reason, scenario)
                    return (
                      <div className={`flex items-start gap-1.5 mt-1.5 text-[11px] animate-fade-in-up ${m ? 'text-gsrp-teal-light' : 'text-gsrp-sunset'}`}>
                        {m ? <CheckCircle2 size={12} className="shrink-0 mt-0.5" /> : <XCircle size={12} className="shrink-0 mt-0.5" />}
                        <span>
                          {m
                            ? 'Correct reason'
                            : `Expected mentions: ${scenario.offenseKeywords ? scenario.offenseKeywords.slice(0, 3).join(', ').toUpperCase() : scenario.correctReason}`}
                        </span>
                      </div>
                    )
                  })()}
                </div>

                {pFormError && (
                  <p className="text-xs text-gsrp-sunset bg-gsrp-sunset/5 rounded-lg p-2.5">{pFormError}</p>
                )}

                <button
                  onClick={handlePFormSubmit}
                  disabled={!evidenceViewed || !pFormData.offender.trim() || !pFormData.punishment || !pFormData.reason.trim()}
                  className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    evidenceViewed && pFormData.offender.trim() && pFormData.punishment && pFormData.reason.trim()
                      ? 'bg-gsrp-orange text-white hover:bg-gsrp-orange/90'
                      : 'bg-gsrp-dark-surface text-gsrp-teal-light/20 border border-gsrp-dark-border cursor-not-allowed'
                  }`}
                >
                  <Shield size={14} />
                  {!evidenceViewed ? 'Review Evidence First' : 'Submit Punishment'}
                </button>
              </div>
            </div>
          )}

          {!isRplog && !isPlog && (
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
                      <span className={`flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold shrink-0 mt-0.5 ${
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
          )}

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
                !isRplog && !isPlog && (
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
                )
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
