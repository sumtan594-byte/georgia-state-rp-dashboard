import { useSession } from 'next-auth/react'
import { useEffect, useState, useCallback, useRef } from 'react'
import { Loader2, Shield, AlertTriangle, RotateCcw, ChevronRight, BookOpen, Ban } from 'lucide-react'
import { useRouter } from 'next/router'
import LoginScreen from '../../../components/auth/LoginScreen'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../lib/auth-options'
import { useRefreshedUser } from '../../../lib/UserRefreshContext'
import AccessDenied from '../../../components/auth/AccessDenied'
import RidealongEngine from '../../../components/training/RidealongEngine'
import PostRidealongOrientation from '../../../components/training/PostRidealongOrientation'
import { SCENARIO_BANK, generateRpLogScenario, generatePLogScenario, RIDEALONG_POOL } from '../../../lib/ridealong-scenarios'
import { RIDEALONG_CONFIG, RIDEALONG_TESTER_ROLE_ID } from '../../../lib/ridealong-config'

function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function drawScenarios() {
  const invalidBank = SCENARIO_BANK.filter(s => s.evidenceValid === false)
  const validBank = SCENARIO_BANK.filter(s => s.evidenceValid !== false)

  const picked = []
  if (invalidBank.length > 0) {
    const shuffledInvalid = shuffleArray(invalidBank)
    picked.push({ ...shuffledInvalid[0], options: shuffledInvalid[0].options ? shuffleArray(shuffledInvalid[0].options) : undefined })
  }

  const needed = RIDEALONG_CONFIG.TOTAL_SCENARIOS - picked.length

  const rpLogCount = Math.min(RIDEALONG_POOL.RP_LOG, needed)
  const pLogCount = Math.min(RIDEALONG_POOL.P_LOG, needed - rpLogCount)
  const standardCount = Math.min(RIDEALONG_POOL.STANDARD, needed - rpLogCount - pLogCount)

  for (let i = 0; i < rpLogCount; i++) {
    picked.push(generateRpLogScenario(i))
  }

  for (let i = 0; i < pLogCount; i++) {
    picked.push(generatePLogScenario(i))
  }

  const shuffledValid = shuffleArray(validBank)
  for (const s of shuffledValid) {
    if (picked.length >= RIDEALONG_CONFIG.TOTAL_SCENARIOS) break
    if (!picked.find(p => p.id === s.id)) picked.push({ ...s, options: s.options ? shuffleArray(s.options) : undefined })
  }

  return shuffleArray(picked)
}

export default function RidealongPage() {
  const { data: session, status } = useSession()
  const { session: refreshedSession, hasRefreshed, accessDenied } = useRefreshedUser()
  const effectiveSession = refreshedSession || session
  const router = useRouter()

  useEffect(() => {
    const videos = [
      '/media/Uniformsandlivery.mp4',
      '/media/Baddriving.mp4',
      '/media/Gooddriving.mp4',
    ]
    Promise.all(videos.map(src =>
      fetch(src, { method: 'HEAD' }).then(r => r.ok).catch(() => false)
    )).then(results => {
      const all = videos.reduce((acc, src, i) => ({ ...acc, [src.split('/').pop()]: results[i] }), {})
      console.log('[Media Check]', all)
    })
  }, [])

  const [checkingAccess, setCheckingAccess] = useState(true)
  const [quizPassed, setQuizPassed] = useState(false)
  const [ridealongPassed, setRidealongPassed] = useState(false)
  const [pendingRidealongCompletion, setPendingRidealongCompletion] = useState(false)
  const [showStart, setShowStart] = useState(false)
  const [scenarios, setScenarios] = useState([])
  const [started, setStarted] = useState(false)
  const [callsignGate, setCallsignGate] = useState(false)
  const [callsignInput, setCallsignInput] = useState('')
  const [callsignError, setCallsignError] = useState('')
  const [cooldownUntil, setCooldownUntil] = useState(null)
  const [cooldownRemaining, setCooldownRemaining] = useState(null)
  const [revoked, setRevoked] = useState(false)
  const [robloxUsername, setRobloxUsername] = useState(null)
  const canSkipRidealongQuestions = effectiveSession?.user?.roles?.includes(RIDEALONG_TESTER_ROLE_ID)

  useEffect(() => {
    if (status === 'unauthenticated') return
    if (!hasRefreshed || !effectiveSession) return
    if (accessDenied) return

    async function checkAccess() {
      try {
        const quizRes = await fetch(`/api/training/cooldown?userId=${effectiveSession.user.id}`)
        const quizData = await quizRes.json()

        const ridealongRes = await fetch(`/api/training/ridealong/progress?userId=${effectiveSession.user.id}`)
        const ridealongData = await ridealongRes.json()

        if (ridealongData.hasPassed && !ridealongData.discordRolesApplied && !started) {
          setPendingRidealongCompletion(true)
        } else if (ridealongData.hasPassed && !started) {
          setRidealongPassed(true)
        } else if (ridealongData.cooldownUntil) {
          const until = new Date(ridealongData.cooldownUntil)
          if (until > new Date()) {
            setCooldownUntil(ridealongData.cooldownUntil)
          }
        }

        if (quizData.hasPassed) {
          setQuizPassed(true)
        }

        try {
          const verifyRes = await fetch('/api/verify/check')
          const verifyData = await verifyRes.json()
          if (verifyData.linked && verifyData.robloxUsername) {
            setRobloxUsername(verifyData.robloxUsername)
          }
        } catch {}
      } catch (e) {
        console.warn('Access check failed:', e)
      } finally {
        setCheckingAccess(false)
        setShowStart(true)
      }
    }
    checkAccess()
  }, [status, hasRefreshed, effectiveSession, accessDenied, started])

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

  useEffect(() => {
    if (!effectiveSession?.user?.id) return

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/training/cooldown?userId=${effectiveSession.user.id}`)
        const data = await res.json()
        if (!data.hasPassed && started) {
          setRevoked(true)
        }
        setQuizPassed(!!data.hasPassed)
      } catch {}
    }, 15000)

    return () => clearInterval(interval)
  }, [effectiveSession?.user?.id, started])

  const handleStart = useCallback(() => {
    setCallsignGate(true)
  }, [])

  const handleCallsignSubmit = useCallback(() => {
    const trimmed = callsignInput.trim()
    // Accept JM-<one or more digits>, case-insensitive
    if (/^[Jj][Mm]-\d+$/.test(trimmed)) {
      setCallsignError('')
      setCallsignGate(false)
      setScenarios(drawScenarios())
      setStarted(true)
    } else {
      setCallsignError(
        'Incorrect callsign. Your callsign must match your rank — Junior Moderators must use the prefix JM- (e.g. JM-1234). The numbers at the end do not matter, but the prefix does.'
      )
    }
  }, [callsignInput])

  const handleSubmit = useCallback(async (result) => {
    try {
      const res = await fetch('/api/training/ridealong/submit', {
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
          results: result.results,
          timestamp: new Date().toISOString(),
        }),
      })
      const data = await res.json()
      if (!result.pass && data.cooldownUntil) {
        setCooldownUntil(data.cooldownUntil)
      }
    } catch (e) {
      console.warn('Submit failed:', e)
    }
  }, [effectiveSession])

  const handleSaveProgress = useCallback(async (state) => {
    try {
      await fetch('/api/training/ridealong/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: effectiveSession.user.id,
          data: state,
        }),
      })
    } catch {}
  }, [effectiveSession])

  const handleClearProgress = useCallback(async () => {
    try {
      await fetch('/api/training/ridealong/progress', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: effectiveSession.user.id }),
      })
    } catch {}
  }, [effectiveSession])

  const handleCompleteRidealong = useCallback(async () => {
    const res = await fetch('/api/training/ridealong/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update Discord roles')
    }
    return data
  }, [])

  const handlePendingCompletionDone = useCallback(() => {
    setPendingRidealongCompletion(false)
    setRidealongPassed(true)
  }, [])

  if (status === 'loading' || checkingAccess || !hasRefreshed) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center">
          <Loader2 className="w-8 h-8 text-gsrp-orange animate-spin mb-4" />
          <span className="text-gsrp-teal-light/40 font-mono text-[9px] uppercase tracking-[0.3em]">Verifying Access</span>
        </div>
      </div>
    )
  }

  if (!session) return <LoginScreen />
  if (accessDenied) return <AccessDenied roleId={accessDenied.roleId} />

  if (pendingRidealongCompletion && !started) {
    return (
      <PostRidealongOrientation
        robloxUsername={robloxUsername}
        discordDisplayName={effectiveSession.user.name}
        submitResolved={true}
        onApplyRoles={handleCompleteRidealong}
        onComplete={handlePendingCompletionDone}
      />
    )
  }

  if (ridealongPassed && !started) {
    return (
      <div className="max-w-2xl mx-auto animate-scale-in">
        <div className="card-glass rounded-3xl border border-gsrp-teal/30 p-8 text-center">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gsrp-teal via-gsrp-teal-light to-gsrp-teal rounded-t-3xl" />
          <div className="flex items-center justify-center w-20 h-20 rounded-full mx-auto mb-6 bg-gsrp-teal/10 border-2 border-gsrp-teal/30">
            <Shield size={36} className="text-gsrp-teal-light" />
          </div>
          <h2 className="text-3xl font-black text-white mb-2">Ridealong Complete!</h2>
          <p className="text-gsrp-teal-light/50 text-sm mb-6">
            You have passed the Ridealong Simulation. Your Discord roles and nickname have been updated.
          </p>
          <button
            onClick={() => router.push('/training')}
            className="px-5 py-3 bg-gsrp-teal text-white rounded-xl font-bold text-sm hover:bg-gsrp-teal/90 transition-all cursor-pointer"
          >
            Return to Training
          </button>
        </div>
      </div>
    )
  }

  if (revoked) {
    return (
      <div className="max-w-2xl mx-auto animate-scale-in">
        <div className="card-glass rounded-3xl border border-gsrp-sunset/40 p-8 text-center">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-gsrp-sunset to-red-500 rounded-t-3xl" />
          <div className="flex items-center justify-center w-20 h-20 rounded-full mx-auto mb-6 bg-red-500/10 border-2 border-red-500/30">
            <Ban size={36} className="text-red-400" />
          </div>
          <h2 className="text-3xl font-black text-white mb-2">Access Revoked</h2>
          <p className="text-gsrp-teal-light/50 text-sm mb-6">
            Your access to the ridealong has been revoked, please redo the Staff orientation quiz.
          </p>
          <button
            onClick={() => router.push('/training')}
            className="px-5 py-3 bg-gsrp-orange text-white rounded-xl font-bold text-sm hover:bg-gsrp-orange/90 transition-all cursor-pointer"
          >
            Go to Training
          </button>
        </div>
      </div>
    )
  }

  if (callsignGate) {
    return (
      <div className="max-w-lg mx-auto animate-scale-in">
        <div className="card-glass rounded-3xl border border-gsrp-orange/30 p-8">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gsrp-orange via-gsrp-orange-light to-gsrp-orange rounded-t-3xl" />

          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gsrp-orange/10 border border-gsrp-orange/20 mx-auto mb-6">
            <Shield size={28} className="text-gsrp-orange" />
          </div>

          <h2 className="text-2xl font-black text-white text-center mb-1">Callsign Verification</h2>
          <p className="text-gsrp-teal-light/40 text-xs text-center mb-8">
            Answer correctly to begin the ridealong simulation.
          </p>

          <div className="bg-gsrp-dark-surface/60 rounded-2xl border border-gsrp-dark-border/40 p-5 mb-6">
            <p className="text-sm font-bold text-gsrp-teal-light/50 uppercase tracking-wider mb-3 text-[11px]">Question</p>
            <p className="text-base font-semibold text-white leading-relaxed">
              You are a Junior Moderator. What callsign will you use?
            </p>
          </div>

          <div className="mb-4">
            <input
              type="text"
              value={callsignInput}
              onChange={e => { setCallsignInput(e.target.value); setCallsignError('') }}
              onKeyDown={e => e.key === 'Enter' && handleCallsignSubmit()}
              placeholder=""
              autoFocus
              className={`w-full px-4 py-3 bg-gsrp-dark-surface border rounded-xl text-sm text-white placeholder:text-gsrp-teal-light/20 focus:outline-none transition-all ${
                callsignError
                  ? 'border-gsrp-sunset/50 focus:border-gsrp-sunset'
                  : 'border-gsrp-dark-border/50 focus:border-gsrp-orange/50'
              }`}
            />
          </div>

          {callsignError && (
            <div className="bg-gsrp-sunset/8 border border-gsrp-sunset/20 rounded-xl p-4 mb-5 flex items-start gap-3">
              <AlertTriangle size={15} className="text-gsrp-sunset shrink-0 mt-0.5" />
              <p className="text-xs text-gsrp-sunset/90 leading-relaxed">{callsignError}</p>
            </div>
          )}

          <button
            onClick={handleCallsignSubmit}
            className="w-full py-3 bg-gradient-to-r from-gsrp-orange to-gsrp-orange-light text-white font-black rounded-xl text-sm hover:opacity-90 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Shield size={15} />
            Confirm & Begin
          </button>
        </div>
      </div>
    )
  }

  if (started && scenarios.length > 0) {
    return (
      <div className="max-w-4xl mx-auto animate-fade-in-up">
        <RidealongEngine
          scenarios={scenarios}
          passScore={RIDEALONG_CONFIG.PASS_SCORE}
          cooldownHours={RIDEALONG_CONFIG.COOLDOWN_HOURS}
          onSubmit={handleSubmit}
          user={effectiveSession.user}
          onSaveProgress={handleSaveProgress}
          onClearProgress={handleClearProgress}
          onCompleteRidealong={handleCompleteRidealong}
          robloxUsername={robloxUsername}
          discordDisplayName={effectiveSession.user.name}
          canSkipQuestions={canSkipRidealongQuestions}
        />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up space-y-8">
      <div className="flex items-center gap-4 mb-2">
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gsrp-orange/10 border border-gsrp-orange/20">
          <Shield size={26} className="text-gsrp-orange" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Ridealong Simulation</h1>
          <p className="text-gsrp-teal-light/40 text-xs font-medium">Simulated mod call training — Georgia State Roleplay</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-glass rounded-2xl border border-gsrp-dark-border/50 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gsrp-orange/10 flex items-center justify-center">
              <AlertTriangle size={18} className="text-gsrp-orange" />
            </div>
            <h3 className="text-sm font-black text-white">Pass Score</h3>
          </div>
          <p className="text-2xl font-black text-gsrp-orange">{RIDEALONG_CONFIG.PASS_SCORE}/{RIDEALONG_CONFIG.TOTAL_SCENARIOS}</p>
          <p className="text-xs text-gsrp-teal-light/30 mt-1">Correct scenarios required</p>
        </div>

        <div className="card-glass rounded-2xl border border-gsrp-dark-border/50 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gsrp-sunset/10 flex items-center justify-center">
              <RotateCcw size={18} className="text-gsrp-sunset" />
            </div>
            <h3 className="text-sm font-black text-white">Cooldown</h3>
          </div>
          <p className="text-2xl font-black text-gsrp-sunset">{RIDEALONG_CONFIG.COOLDOWN_HOURS}h</p>
          <p className="text-xs text-gsrp-teal-light/30 mt-1">Between failed attempts</p>
        </div>

        <div className="card-glass rounded-2xl border border-gsrp-dark-border/50 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gsrp-teal/10 flex items-center justify-center">
              <BookOpen size={18} className="text-gsrp-teal-light" />
            </div>
            <h3 className="text-sm font-black text-white">Scenarios</h3>
          </div>
          <p className="text-2xl font-black text-gsrp-teal-light">{RIDEALONG_CONFIG.TOTAL_SCENARIOS}</p>
          <p className="text-xs text-gsrp-teal-light/30 mt-1">Randomised each attempt</p>
        </div>
      </div>

      {!quizPassed && !checkingAccess && (
        <div className="card-glass rounded-2xl border border-gsrp-sunset/30 p-6 text-center">
          <p className="text-gsrp-sunset text-sm font-bold mb-2">Quiz Required First</p>
          <p className="text-gsrp-teal-light/50 text-xs mb-4">
            You must pass the Staff Orientation Quiz before attempting the ridealong simulation.
          </p>
          <button
            onClick={() => router.push('/training')}
            className="px-5 py-2.5 bg-gsrp-orange text-white rounded-xl text-sm font-bold hover:bg-gsrp-orange/90 transition-all cursor-pointer"
          >
            Go to Quiz
          </button>
        </div>
      )}

      {cooldownUntil && cooldownRemaining !== null && cooldownRemaining > 0 && (
        <div className="card-glass rounded-2xl border border-gsrp-sunset/30 p-6 text-center">
          <p className="text-gsrp-sunset text-sm font-bold mb-1">Cooldown Active</p>
          <p className="text-2xl font-black text-gsrp-sunset mt-2 tabular-nums">
            {Math.floor(cooldownRemaining / 3600)}h {Math.floor((cooldownRemaining % 3600) / 60)}m {cooldownRemaining % 60}s
          </p>
          <p className="text-gsrp-teal-light/50 text-xs mt-2">
            Next attempt available {new Date(cooldownUntil).toLocaleString()}
          </p>
        </div>
      )}

      {showStart && quizPassed && !cooldownUntil && !ridealongPassed && (
        <div className="space-y-6">
          <div className="card-glass rounded-2xl border border-gsrp-dark-border/50 p-6">
            <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4">How It Works</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-3 p-3 bg-gsrp-dark-surface/40 rounded-xl">
                  <span className="text-lg">🚨</span>
                  <div>
                    <p className="text-sm font-bold text-white">Receive Mod Call</p>
                    <p className="text-[10px] text-gsrp-teal-light/40">A popup appears with caller info</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gsrp-dark-surface/40 rounded-xl">
                  <span className="text-lg">🎥</span>
                  <div>
                    <p className="text-sm font-bold text-white">Review Evidence</p>
                    <p className="text-[10px] text-gsrp-teal-light/40">Review player-submitted clips before deciding</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gsrp-dark-surface/40 rounded-xl">
                  <span className="text-lg">⚖️</span>
                  <div>
                    <p className="text-sm font-bold text-white">Take Action</p>
                    <p className="text-[10px] text-gsrp-teal-light/40">Choose the correct action</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gsrp-dark-surface/40 rounded-xl">
                  <span className="text-lg">📝</span>
                  <div>
                    <p className="text-sm font-bold text-white">Get Feedback</p>
                    <p className="text-[10px] text-gsrp-teal-light/40">Immediate explanation of right/wrong</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gsrp-dark-surface/40 rounded-xl">
                  <span className="text-lg">📋</span>
                  <div>
                    <p className="text-sm font-bold text-white">RP Logging</p>
                    <p className="text-[10px] text-gsrp-teal-light/40">Check logs before approving RPs</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gsrp-dark-surface/40 rounded-xl">
                  <span className="text-lg">🔨</span>
                  <div>
                    <p className="text-sm font-bold text-white">Melonly Form</p>
                    <p className="text-[10px] text-gsrp-teal-light/40">Log punishments via melonly system</p>
                  </div>
                </div>
              </div>
          </div>

          <div className="card-glass rounded-2xl border border-gsrp-teal/20 p-5">
            <h3 className="text-xs font-bold text-gsrp-teal-light uppercase tracking-wider mb-2">Requirements</h3>
            <ul className="text-xs text-gsrp-teal-light/50 space-y-1">
              <li className="flex items-center gap-2">
                <CheckIcon />
                Staff Orientation Quiz passed
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon />
                Review video evidence before each decision (mandatory)
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon />
                Score {RIDEALONG_CONFIG.PASS_SCORE}/{RIDEALONG_CONFIG.TOTAL_SCENARIOS} or higher to pass
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon />
                {RIDEALONG_POOL.RP_LOG} RP logging scenarios per attempt
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon />
                {RIDEALONG_POOL.P_LOG} melonly form scenarios per attempt
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon />
                Interactive multi-step decision making
              </li>
            </ul>
          </div>

          <div className="flex justify-center py-4">
            <button
              onClick={handleStart}
              className="group px-10 py-4 bg-gradient-to-r from-gsrp-orange to-gsrp-orange-light text-white font-black text-lg rounded-2xl shadow-lg shadow-gsrp-orange/20 hover:shadow-gsrp-orange/30 transition-all cursor-pointer flex items-center gap-3"
            >
              <Shield size={20} />
              Start Ridealong
              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-gsrp-teal-light/30 shrink-0">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions)
  return { props: {} }
}
