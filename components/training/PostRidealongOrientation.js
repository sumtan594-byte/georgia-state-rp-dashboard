import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/router'
import {
  CheckCircle2, Copy, Check, ChevronRight, Shield, ExternalLink,
  Loader2, CheckCheck, ArrowRight
} from 'lucide-react'

// ─── helpers ─────────────────────────────────────────────────────────────────
function useFadeIn(dep) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    setVisible(false)
    const t = setTimeout(() => setVisible(true), 30)
    return () => clearTimeout(t)
  }, [dep])
  return visible
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const handle = () => {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handle}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gsrp-teal/10 border border-gsrp-teal/30 text-gsrp-teal-light text-xs font-bold hover:bg-gsrp-teal/20 transition-all cursor-pointer"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

// Video that autoplays looped, fades in when it enters this step
function LoopVideo({ src, label, accent = 'teal' }) {
  const [loaded, setLoaded] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current) {
      ref.current.currentTime = 0
      ref.current.play().catch(() => {})
    }
  }, [src])

  const borderColor = accent === 'red' ? 'border-gsrp-sunset/40' : 'border-gsrp-teal/30'
  const labelColor  = accent === 'red' ? 'text-gsrp-sunset'      : 'text-gsrp-teal-light'
  const bgPulse     = accent === 'red' ? 'bg-gsrp-sunset/5'       : 'bg-gsrp-teal/5'

  return (
    <div className="space-y-2 flex-1">
      {label && (
        <p className={`text-[11px] font-black uppercase tracking-widest ${labelColor}`}>{label}</p>
      )}
      <div className={`rounded-2xl overflow-hidden border ${borderColor} bg-black relative`}>
        {!loaded && (
          <div className={`absolute inset-0 flex items-center justify-center ${bgPulse}`}>
            <Loader2 size={20} className="text-gsrp-teal-light/30 animate-spin" />
          </div>
        )}
        <video
          ref={ref}
          loop
          muted
          playsInline
          src={src}
          className={`w-full aspect-video object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onCanPlay={() => setLoaded(true)}
        />
      </div>
    </div>
  )
}

// Single video with controls (for shift / uniform steps)
function CtrlVideo({ src }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <div className="rounded-2xl overflow-hidden border border-gsrp-dark-border/50 bg-black relative mt-6">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <Loader2 size={20} className="text-gsrp-teal-light/30 animate-spin" />
        </div>
      )}
      <video
        controls
        playsInline
        src={src}
        className={`w-full aspect-video transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onCanPlay={() => setLoaded(true)}
      />
    </div>
  )
}

// ─── main component ───────────────────────────────────────────────────────────
export default function PostRidealongOrientation({
  robloxUsername,
  discordDisplayName,
  submitResolved,
  onComplete,
}) {
  const router = useRouter()

  // step 0 = welcome, 1 = greeting pick, 2 = greeting confirm,
  // 3 = shift start, 4 = uniforms, 5 = end shift, 6 = driving,
  // 7 = username length, 8 = final/complete
  const [step, setStep] = useState(0)
  const [chosenGreeting, setChosenGreeting] = useState(null) // 'a'|'b'|'c'
  const [btnReady, setBtnReady] = useState(false)
  const visible = useFadeIn(step)

  const username = robloxUsername || 'Moderator'
  const displayName = discordDisplayName || 'Moderator'

  const GREETINGS = [
    {
      id: 'a',
      text: `Hey! I am ${username} from the GSRP staff team! How may I assist? Make sure you are in our comms, gsrp7. If I am late, say "void".`,
    },
    {
      id: 'b',
      text: `Greetings, I'm ${username} from the staff team, how can I assist you today? Make sure you are in our comms, gsrp7. If I am late, say "void".`,
    },
    {
      id: 'c',
      text: `Hey! Assisting you today will be me, ${username}. What is it you need help with? Make sure you are in our comms, gsrp7. If I am late, say "void".`,
    },
  ]

  // reset button lock every step change
  useEffect(() => {
    setBtnReady(false)
    // step 0: no timer (immediate)
    // step 1: greeting picker — button appears only after a greeting is selected (handled inline)
    if (step === 0) {
      setBtnReady(true)
      return
    }
    if (step === 1) return // handled by greeting selection
    const t = setTimeout(() => setBtnReady(true), 5000)
    return () => clearTimeout(t)
  }, [step])

  const next = useCallback(() => {
    setStep(s => s + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const handleGreetingPick = useCallback((id) => {
    setChosenGreeting(id)
    setBtnReady(true)
  }, [])

  const chosenText = GREETINGS.find(g => g.id === chosenGreeting)?.text || ''

  // ─── per-step content ─────────────────────────────────────────────────────
  const renderStep = () => {
    // ── 0: welcome ────────────────────────────────────────────────────────
    if (step === 0) return (
      <div className="flex flex-col items-center justify-center text-center max-w-xl mx-auto">
        <div className="w-20 h-20 rounded-full bg-gsrp-orange/10 border-2 border-gsrp-orange/30 flex items-center justify-center mb-8">
          <Shield size={36} className="text-gsrp-orange" />
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-4">
          Great job, you have completed<br />
          <span className="text-gsrp-orange">your orientation!</span>
        </h1>
        <p className="text-gsrp-teal-light/50 text-lg leading-relaxed mb-12">
          Here are a few important pieces of information before your first shift.
        </p>
        <ActionButton ready={btnReady} onClick={next} label="Okay, proceed" />
      </div>
    )

    // ── 1: greeting picker ────────────────────────────────────────────────
    if (step === 1) return (
      <div className="max-w-2xl mx-auto w-full">
        <p className="text-gsrp-orange text-xs font-bold uppercase tracking-widest mb-4 text-center">Greeting Setup</p>
        <h2 className="text-3xl sm:text-4xl font-black text-white text-center mb-3 leading-tight">
          The most important thing is how you approach players.
        </h2>
        <p className="text-gsrp-teal-light/50 text-center mb-10 text-base">
          Let's get a greeting set for you! Pick one of the three options below.
        </p>
        <div className="space-y-4 mb-10">
          {GREETINGS.map(g => (
            <button
              key={g.id}
              onClick={() => handleGreetingPick(g.id)}
              className={`w-full flex items-start gap-4 p-5 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                chosenGreeting === g.id
                  ? 'border-gsrp-teal/50 bg-gsrp-teal/8 shadow-lg shadow-gsrp-teal/10'
                  : 'border-gsrp-dark-border/50 hover:border-gsrp-teal/30 hover:bg-gsrp-dark-surface/40'
              }`}
            >
              <span className={`flex items-center justify-center w-8 h-8 rounded-xl text-sm font-black shrink-0 mt-0.5 transition-all ${
                chosenGreeting === g.id
                  ? 'bg-gsrp-teal text-white'
                  : 'bg-gsrp-dark-surface text-gsrp-teal-light/40 border border-gsrp-dark-border'
              }`}>
                {chosenGreeting === g.id ? <Check size={16} /> : g.id.toUpperCase()}
              </span>
              <span className={`text-sm leading-relaxed transition-colors ${
                chosenGreeting === g.id ? 'text-white' : 'text-gsrp-teal-light/60'
              }`}>{g.text}</span>
            </button>
          ))}
        </div>
        <div className="flex justify-center">
          <ActionButton ready={chosenGreeting !== null} onClick={next} label="Confirm greeting" />
        </div>
      </div>
    )

    // ── 2: greeting confirmed ─────────────────────────────────────────────
    if (step === 2) return (
      <div className="max-w-2xl mx-auto w-full">
        <p className="text-gsrp-teal-light text-xs font-bold uppercase tracking-widest mb-4 text-center">Your Greeting</p>
        <h2 className="text-3xl sm:text-4xl font-black text-white text-center mb-3 leading-tight">
          This will be your greeting every time<br />you respond to a mod call.
        </h2>
        <div className="mt-10 bg-gsrp-dark-surface/60 border border-gsrp-teal/30 rounded-2xl p-6 relative mb-10">
          <p className="text-white text-base leading-relaxed font-medium mb-4">{chosenText}</p>
          <CopyButton text={chosenText} />
        </div>
        <div className="flex justify-center">
          <ActionButton ready={btnReady} onClick={next} label="Got it!" />
        </div>
      </div>
    )

    // ── 3: shift start via melonly ────────────────────────────────────────
    if (step === 3) return (
      <div className="max-w-2xl mx-auto w-full">
        <h2 className="text-3xl sm:text-4xl font-black text-white text-center mb-3 leading-tight">
          Before starting to moderate, always ensure<br />
          <span className="text-gsrp-orange">you start your shift through Melonly first!</span>
        </h2>
        <CtrlVideo src="https://i.imgur.com/CTlwKik.mp4" />
        <div className="flex justify-center mt-10">
          <ActionButton ready={btnReady} onClick={next} label="I understand." />
        </div>
      </div>
    )

    // ── 4: uniforms / SPaG ───────────────────────────────────────────────
    if (step === 4) return (
      <div className="max-w-2xl mx-auto w-full">
        <h2 className="text-3xl sm:text-4xl font-black text-white text-center mb-3 leading-tight">
          Always ensure you use proper uniforms, liveries,<br />
          and <span className="text-gsrp-orange">SPaG</span>
          <span className="text-gsrp-teal-light/50 text-xl font-semibold"> (Spelling, Punctuation & Grammar).</span>
        </h2>
        <CtrlVideo src="https://i.imgur.com/ffLh3Ya.mp4" />
        <div className="flex justify-center mt-10">
          <ActionButton ready={btnReady} onClick={next} label="Got it!" />
        </div>
      </div>
    )

    // ── 5: end shift ──────────────────────────────────────────────────────
    if (step === 5) return (
      <div className="max-w-xl mx-auto w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-gsrp-sunset/10 border border-gsrp-sunset/30 flex items-center justify-center mx-auto mb-8">
          <span className="text-3xl">⚠️</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-black text-white mb-4 leading-tight">
          When getting off, always make sure to{' '}
          <span className="text-gsrp-sunset">end your shift</span>{' '}
          or else you will be infracted!
        </h2>
        <div className="flex justify-center mt-12">
          <ActionButton ready={btnReady} onClick={next} label="Understood." />
        </div>
      </div>
    )

    // ── 6: driving examples ───────────────────────────────────────────────
    if (step === 6) return (
      <div className="max-w-3xl mx-auto w-full">
        <h2 className="text-3xl sm:text-4xl font-black text-white text-center mb-3 leading-tight">
          Always make sure you are driving professionally and realistically.
        </h2>
        <p className="text-gsrp-teal-light/50 text-center text-base mb-10">No swerving or cutting corners.</p>
        <div className="flex flex-col sm:flex-row gap-6 mb-10">
          <LoopVideo src="https://i.imgur.com/qosNnCJ.mp4" label="Bad Driving ✗" accent="red" />
          <LoopVideo src="https://i.imgur.com/cMWSRAC.mp4" label="Good Driving ✓" accent="teal" />
        </div>
        <div className="flex justify-center">
          <ActionButton ready={btnReady} onClick={next} label="Understood." />
        </div>
      </div>
    )

    // ── 7: username length ────────────────────────────────────────────────
    if (step === 7) return (
      <div className="max-w-2xl mx-auto w-full">
        <div className="w-16 h-16 rounded-2xl bg-gsrp-orange/10 border border-gsrp-orange/30 flex items-center justify-center mx-auto mb-8">
          <span className="text-3xl">‼️</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-black text-white text-center mb-3 leading-tight">
          This is the most important thing!
        </h2>
        <p className="text-gsrp-orange text-center text-xl font-black mb-10">
          Always use 4 letters or more in usernames when using commands!
        </p>
        <div className="grid grid-cols-2 gap-6 mb-10">
          {/* Bad column */}
          <div className="space-y-3">
            <p className="text-gsrp-sunset text-xs font-black uppercase tracking-widest text-center">NO 😞</p>
            {[':to kol', ':to ko', ':to k'].map(cmd => (
              <div key={cmd} className="bg-gsrp-sunset/8 border border-gsrp-sunset/25 rounded-xl px-4 py-3 text-center">
                <code className="text-gsrp-sunset font-mono text-base font-bold">{cmd}</code>
              </div>
            ))}
          </div>
          {/* Good column */}
          <div className="space-y-3">
            <p className="text-gsrp-teal-light text-xs font-black uppercase tracking-widest text-center">YES 😊</p>
            {[':to kolt', ':to koltboy', ':to koltboy123'].map(cmd => (
              <div key={cmd} className="bg-gsrp-teal/8 border border-gsrp-teal/25 rounded-xl px-4 py-3 text-center">
                <code className="text-gsrp-teal-light font-mono text-base font-bold">{cmd}</code>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-center">
          <ActionButton ready={btnReady} onClick={next} label="Understood." />
        </div>
      </div>
    )

    // ── 8: final / complete ───────────────────────────────────────────────
    if (step === 8) return (
      <div className="max-w-2xl mx-auto w-full">
        <div className="w-20 h-20 rounded-full bg-gsrp-teal/10 border-2 border-gsrp-teal/30 flex items-center justify-center mx-auto mb-8">
          <CheckCheck size={36} className="text-gsrp-teal-light" />
        </div>
        <h2 className="text-3xl sm:text-4xl font-black text-white text-center mb-4 leading-tight">
          And that's it, you are (hopefully) ready to start moderating<br />
          <span className="text-gsrp-teal-light">for Georgia State Roleplay!</span>
        </h2>
        <p className="text-gsrp-teal-light/50 text-center mb-10">
          Make sure to ask any questions you may have in staff chat. Congratulations on completing your training.
          Your roles have been given to you — here's what to do next.
        </p>

        <div className="space-y-6 mb-10">
          {/* Step block: join WL group */}
          <div className="bg-gsrp-dark-surface/50 border border-gsrp-dark-border/50 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gsrp-orange/10 border border-gsrp-orange/20 flex items-center justify-center shrink-0">
                <span className="text-xs font-black text-gsrp-orange">1</span>
              </div>
              <h3 className="text-white font-black">Request to join the WL group</h3>
            </div>
            <ol className="space-y-2">
              {[
                <>Head over to <a href="https://discord.com/channels/1366688107788894280/1421334036688932885" target="_blank" rel="noreferrer" className="text-gsrp-teal-light underline underline-offset-2 inline-flex items-center gap-1">this channel <ExternalLink size={11} /></a></>,
                'Click the "Roblox group" button.',
                'Click "I haven\'t requested yet".',
                'Press "Visit group page".',
                'Press "Join community".',
                'Come back to the channel and press "I have requested".',
                'From the dropdown, select "Staff team".',
              ].map((text, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gsrp-teal-light/60">
                  <span className="w-5 h-5 rounded-full bg-gsrp-dark-surface border border-gsrp-dark-border/60 flex items-center justify-center text-[10px] font-bold text-gsrp-teal-light/40 shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span>{text}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Step block: receive mod commands */}
          <div className="bg-gsrp-dark-surface/50 border border-gsrp-dark-border/50 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gsrp-orange/10 border border-gsrp-orange/20 flex items-center justify-center shrink-0">
                <span className="text-xs font-black text-gsrp-orange">2</span>
              </div>
              <h3 className="text-white font-black">Receiving your mod commands</h3>
            </div>
            <ol className="space-y-2">
              {[
                <>Go to the <a href="https://discord.com/channels/1366688107788894280/1421334036688932885" target="_blank" rel="noreferrer" className="text-gsrp-teal-light underline underline-offset-2 inline-flex items-center gap-1">same channel <ExternalLink size={11} /></a>.</>,
                'Press "In game mod" — and it should give you the commands!',
              ].map((text, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gsrp-teal-light/60">
                  <span className="w-5 h-5 rounded-full bg-gsrp-dark-surface border border-gsrp-dark-border/60 flex items-center justify-center text-[10px] font-bold text-gsrp-teal-light/40 shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span>{text}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Discord status */}
          <div className="grid grid-cols-2 gap-4">
            {submitResolved ? (
              <>
                <div className="bg-gsrp-teal/10 rounded-xl p-4 border border-gsrp-teal/20 text-center">
                  <Check size={18} className="text-gsrp-teal-light mx-auto mb-1" />
                  <p className="text-[11px] font-bold text-gsrp-teal-light">Roles Set ✓</p>
                  <p className="text-[10px] text-gsrp-teal-light/40">Your Discord roles have been updated</p>
                </div>
                <div className="bg-gsrp-teal/10 rounded-xl p-4 border border-gsrp-teal/20 text-center">
                  <Check size={18} className="text-gsrp-teal-light mx-auto mb-1" />
                  <p className="text-[11px] font-bold text-gsrp-teal-light">Nickname Set ✓</p>
                  <p className="text-[10px] text-gsrp-teal-light/40">Your Discord nickname has been updated</p>
                </div>
              </>
            ) : (
              <>
                <div className="bg-gsrp-dark-surface/50 rounded-xl p-4 border border-gsrp-dark-border/50 text-center">
                  <Loader2 size={16} className="text-gsrp-orange mx-auto mb-1 animate-spin" />
                  <p className="text-[11px] font-bold text-gsrp-teal-light/40">Assigning Roles…</p>
                </div>
                <div className="bg-gsrp-dark-surface/50 rounded-xl p-4 border border-gsrp-dark-border/50 text-center">
                  <Loader2 size={16} className="text-gsrp-orange mx-auto mb-1 animate-spin" />
                  <p className="text-[11px] font-bold text-gsrp-teal-light/40">Setting Nickname…</p>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex justify-center">
          <ActionButton
            ready={btnReady}
            onClick={onComplete}
            label="Done!"
            color="teal"
          />
        </div>
      </div>
    )

    return null
  }

  const TOTAL_STEPS = 9

  return (
    // Full area between topbar and sidebar — parent layout handles the outer frame
    <div className="flex flex-col min-h-full w-full">
      {/* Progress bar */}
      <div className="w-full h-1 bg-gsrp-dark-surface shrink-0">
        <div
          className="h-full bg-gradient-to-r from-gsrp-orange via-gsrp-teal-light to-gsrp-teal transition-all duration-700 ease-out"
          style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
        />
      </div>

      {/* Step counter */}
      <div className="flex items-center justify-between px-8 pt-4 pb-0 shrink-0">
        <span className="text-[10px] text-gsrp-teal-light/30 font-bold uppercase tracking-widest">
          Post-Ridealong Orientation
        </span>
        <span className="text-[10px] text-gsrp-teal-light/30 font-bold uppercase tracking-widest">
          {step + 1} / {TOTAL_STEPS}
        </span>
      </div>

      {/* Main content area — fills remaining space and centres content */}
      <div
        className={`flex-1 flex flex-col items-center justify-center px-6 py-10 transition-all duration-500 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        {renderStep()}
      </div>
    </div>
  )
}

// ─── shared CTA button ────────────────────────────────────────────────────────
function ActionButton({ ready, onClick, label, color = 'orange' }) {
  const bg =
    color === 'teal'
      ? 'bg-gsrp-teal hover:bg-gsrp-teal/90 shadow-gsrp-teal/20 hover:shadow-gsrp-teal/30'
      : 'bg-gradient-to-r from-gsrp-orange to-gsrp-orange-light hover:opacity-90 shadow-gsrp-orange/20 hover:shadow-gsrp-orange/30'

  return (
    <button
      onClick={ready ? onClick : undefined}
      disabled={!ready}
      className={`flex items-center gap-3 px-10 py-4 rounded-2xl text-white font-black text-base shadow-lg transition-all duration-300 ${
        ready
          ? `${bg} cursor-pointer`
          : 'bg-gsrp-dark-surface border border-gsrp-dark-border text-gsrp-teal-light/20 cursor-not-allowed'
      }`}
    >
      {ready ? (
        <>
          {label}
          <ArrowRight size={18} />
        </>
      ) : (
        <span className="text-sm">Please read the info above…</span>
      )}
    </button>
  )
}
