import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import {
  Copy, Check, Shield, AlertTriangle, Car, MessageSquare, ClipboardList,
  Search, Loader2, X, Plus, Send, ChevronRight, CheckCircle2, Flag, User
} from 'lucide-react'

// ─── Preset content (ride-along only, no Q&A) ────────────────────────────────
const PRE_TRAINING = [
  'Hey! I hope you are having a great day. Are you ready to begin your training?',
  "Welcome to GSRP Staff Onboarding. Today, we'll assess your moderation skills through a brief ride-along. Make sure to use your best grammar.",
  'Training will require a minimum of 15 minutes to complete, will you have time to finish?',
  'Before we start the ride-along section, do you have any questions about today’s training?',
]

const RIDE_ALONG_BRIEF = [
  'Before we start our ride-along section, I will brief you on what I will be assessing you on.',
  "Please respond to these messages with a 'Yes' or 'Alright'.",
  'I will be looking at your driving skills, so please ensure you follow all traffic laws and drive professionally.',
  'I will be assessing your moderation skills. Every time we get a mod call, I will teleport to it and bring you there. From there on out, you are to handle the scene yourself.',
  'When a mod call arrives, I will inform you there is one. You are to park your car in a spot where it does not cause any obstruction. Do not park on the road.',
  'I will be judging your professionalism during mod scenes, and most importantly your SPaG (Spelling, Punctuation and Grammar).',
  'I will use commands if necessary, such as :kick or :ban.',
  'During the mod scene, do not bother asking me for any advice or help, as I will not answer you.',
  'Note the usage of guns is allowed, but only a handgun. Anything else is not permitted. If you abuse this, I will prohibit it from being used.',
  'Before we begin, do you have any questions?',
  'Please make a greeting which states your full username, or an easier nickname such as Kolt, and your rank.',
]

// The mandatory message every trainer must deliver to the trainee.
const HANDLING_MESSAGE =
  'All mod calls are to be handled by YOU. I am solely here to assist you, for example, if a member asks for something you physically cannot do. You will run every scene yourself.'

const LOOK_OUT_FOR = [
  'Their adherence to traffic laws while driving.',
  'Their situation-handling skills during scenes.',
  'Their parking skills (never on the road, never obstructing).',
  'How they confront the offender before taking action.',
  'Whether they give proper, correct punishments.',
  'How they answer member questions.',
]

const TRAINER_DUTIES = [
  'Follow the order strictly: Wait → let the trainee Confront the offender → only then React (punish). Never punish before the trainee confronts.',
  'Assist only if a member asks something the trainee physically cannot do (e.g. "Can you bring Kolt to me?" or "Can you advertise this store?").',
  'Pay extremely close attention to the trainee’s professionalism during every mod call.',
  'Overtake the scene if the trainee fails to handle it correctly.',
  'After a mod call, return to your car and resume driving.',
]

const MARKING_CRITERIA = [
  'Drives with caution and follows all traffic laws (breaks them fewer than 4 times).',
  'Parks the car safely, without obstructing any roads or driveways.',
  'Greets the mod call properly: states username, rank, and uses a friendly tone.',
  'Gives proper answers to server-related questions.',
  'Gives proper punishments to offenders, confronting them first.',
  'Uses proper SPaG and corrects mistakes with a * correction in a new message. (No mark if corrected more than 5 times.)',
]
const MARK_PER_CRITERION = 2
const MAX_SCORE = MARKING_CRITERIA.length * MARK_PER_CRITERION // 12
const PASS_SCORE = 8 // 8/12 ≈ 67%, mirrors the original 20/30 threshold

const MOD_CALL_CHECKS = [
  'Parked safely off the road before attending.',
  'Greeted with a proper greeting (username, rank, friendly tone).',
  'Stayed professional throughout, with clean SPaG.',
  'Waited, let the offender be confronted, then reacted.',
  'Issued the correct punishment for the offence.',
  'Answered member questions correctly (assisted only when truly needed).',
]

const POST_TRAINING = [
  'Here, our training concludes. I will announce your results soon. Before you leave, here are the guidelines of being a staff member here at GSRP.',
  'These guidelines will also be present in the staff handbook. Please reply with a Yes or Alright.',
  'When you are on duty, you are expected to act professionally at all times. Staff must follow all in-game traffic and roleplay laws while performing their duties.',
  'Emergency lights and sirens should only be used when absolutely necessary, and reckless driving is not tolerated.',
  'Moderation should only occur when there are at least 20 players in the server. If the player count is below 20, you should remain off-duty.',
  'All server-wide announcements must be made using the official clipboard templates, available in the #h-m hints channel.',
  'If you have an urgent need to customise one, permission must be granted by a High Rank first.',
  'When dealing with player reports, always aim for fairness. Witnesses are not taken as proof since they could be biased towards the player being moderated.',
  'If there is a video or screenshot, that takes priority. If no evidence is available, de-escalate the situation and issue a verbal warning.',
  'The most important rule: only use command usernames with 4 or more letters in them.',
  'Do not use commands like :to kol or :to k. Instead use :to kolt or :to samu, the first four letters of a username. An exception can be made for usernames with only 3 letters.',
  'Watch out for troll usernames that contain "all" or "others" at the beginning. Notify a High Rank or administrator immediately if you see one.',
  'If none are online, do not use :kick others, instead use :kick othe or :kick other. After kicking, make a ban BOLO.',
  'I will now send you your results. Keep watch in your DMs for your outcome.',
]

// ─── Small building blocks ────────────────────────────────────────────────────
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const handle = () => {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }
  return (
    <button
      onClick={handle}
      aria-label="Copy message"
      className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gsrp-teal/10 border border-gsrp-teal/30 text-gsrp-teal-light text-xs font-bold hover:bg-gsrp-teal/20 transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-gsrp-teal/40"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function MessageRow({ text }) {
  return (
    <div className="flex items-start gap-3 bg-gsrp-dark-surface/40 border border-gsrp-dark-border/40 rounded-xl p-3.5">
      <p className="text-sm text-gsrp-teal-light/80 leading-relaxed flex-1">{text}</p>
      <CopyButton text={text} />
    </div>
  )
}

function SectionCard({ icon: Icon, title, subtitle, children, accent = 'teal' }) {
  const ring = accent === 'orange' ? 'border-gsrp-orange/25' : accent === 'red' ? 'border-gsrp-sunset/30' : 'border-gsrp-dark-border/50'
  const iconWrap = accent === 'orange' ? 'bg-gsrp-orange/10 border-gsrp-orange/20 text-gsrp-orange'
    : accent === 'red' ? 'bg-gsrp-sunset/10 border-gsrp-sunset/25 text-gsrp-sunset'
    : 'bg-gsrp-teal/10 border-gsrp-teal/20 text-gsrp-teal-light'
  return (
    <section className={`bg-gsrp-dark-surface/50 border ${ring} rounded-2xl p-6`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${iconWrap}`}>
          <Icon size={18} />
        </div>
        <div>
          <h2 className="text-white font-bold leading-tight">{title}</h2>
          {subtitle && <p className="text-xs text-gsrp-teal-light/40 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

// ─── Discord member search dropdown ───────────────────────────────────────────
function MemberSearch({ value, onSelect }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const boxRef = useRef(null)

  useEffect(() => {
    if (!query || query.length < 2) { setResults([]); return }
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/discord/members?q=${encodeURIComponent(query)}`)
        const data = await res.json().catch(() => ({}))
        setResults(Array.isArray(data.members) ? data.members : [])
      } catch { setResults([]) }
      finally { setLoading(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    const onClick = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div ref={boxRef} className="relative">
      {value ? (
        <div className="flex items-center gap-3 bg-gsrp-dark-surface border border-gsrp-teal/30 rounded-xl px-3 py-2.5">
          <img src={value.avatar} alt="" className="w-7 h-7 rounded-full" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white font-medium truncate">{value.displayName}</p>
            <p className="text-[11px] text-gsrp-teal-light/40 truncate">@{value.username}</p>
          </div>
          <button onClick={() => onSelect(null)} aria-label="Clear selection" className="text-gsrp-teal-light/40 hover:text-gsrp-sunset transition-colors cursor-pointer">
            <X size={16} />
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 bg-gsrp-dark-surface border border-gsrp-dark-border rounded-xl px-3 py-2.5 focus-within:border-gsrp-teal/40 transition-colors">
            <Search size={15} className="text-gsrp-teal-light/40 shrink-0" />
            <input
              value={query}
              onChange={e => { setQuery(e.target.value); setOpen(true) }}
              onFocus={() => setOpen(true)}
              placeholder="Search Discord members by name..."
              className="bg-transparent text-sm text-white placeholder:text-gsrp-teal-light/30 outline-none flex-1"
            />
            {loading && <Loader2 size={14} className="text-gsrp-teal-light/40 animate-spin" />}
          </div>
          {open && (query.length >= 2) && (
            <div className="absolute z-20 mt-2 w-full max-h-60 overflow-y-auto bg-gsrp-dark-surface border border-gsrp-dark-border rounded-xl shadow-2xl">
              {results.length === 0 && !loading && (
                <p className="px-4 py-3 text-xs text-gsrp-teal-light/40">No members found.</p>
              )}
              {results.map(m => (
                <button
                  key={m.id}
                  onClick={() => { onSelect(m); setOpen(false); setQuery('') }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gsrp-teal/10 transition-colors cursor-pointer"
                >
                  <img src={m.avatar} alt="" className="w-7 h-7 rounded-full" />
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{m.displayName}</p>
                    <p className="text-[11px] text-gsrp-teal-light/40 truncate">@{m.username}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Intake modal ─────────────────────────────────────────────────────────────
export function TraineeIntakeModal({ onConfirm }) {
  const [roblox, setRoblox] = useState('')
  const [member, setMember] = useState(null)
  const ready = roblox.trim().length >= 2 && member

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-gsrp-dark border border-gsrp-dark-border rounded-3xl p-7 shadow-2xl">
        <div className="w-12 h-12 rounded-2xl bg-gsrp-orange/10 border border-gsrp-orange/25 flex items-center justify-center mb-5">
          <ClipboardList size={22} className="text-gsrp-orange" />
        </div>
        <h2 className="text-xl font-bold text-white mb-1.5">Start a Training Report</h2>
        <p className="text-sm text-gsrp-teal-light/50 mb-6 leading-relaxed">
          Enter your trainee’s details to open the handbook and your interactive report.
        </p>

        <label htmlFor="trainee-roblox" className="block text-xs font-bold uppercase tracking-widest text-gsrp-teal-light/50 mb-2">
          Trainee Roblox username
        </label>
        <input
          id="trainee-roblox"
          value={roblox}
          onChange={e => setRoblox(e.target.value)}
          placeholder="e.g. koltboy123"
          className="w-full bg-gsrp-dark-surface border border-gsrp-dark-border rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-gsrp-teal-light/30 outline-none focus:border-gsrp-teal/40 transition-colors mb-5"
        />

        <label className="block text-xs font-bold uppercase tracking-widest text-gsrp-teal-light/50 mb-2">
          Trainee Discord member
        </label>
        <MemberSearch value={member} onSelect={setMember} />

        <button
          disabled={!ready}
          onClick={() => ready && onConfirm({ roblox: roblox.trim(), member })}
          className={`mt-7 w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-200 ${
            ready
              ? 'bg-gsrp-orange text-white hover:bg-gsrp-orange/90 cursor-pointer'
              : 'bg-gsrp-dark-surface border border-gsrp-dark-border text-gsrp-teal-light/30 cursor-not-allowed'
          }`}
        >
          Open handbook <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}

// ─── Mod call modal ───────────────────────────────────────────────────────────
function ModCallModal({ index, onClose, onSave, initial }) {
  const [checks, setChecks] = useState(initial?.checks || MOD_CALL_CHECKS.map(() => false))
  const [verdict, setVerdict] = useState(initial?.verdict || null) // 'handled' | 'overtaken'
  const [note, setNote] = useState(initial?.note || '')

  const toggle = (i) => setChecks(c => c.map((v, idx) => idx === i ? !v : v))

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg max-h-[88vh] overflow-y-auto bg-gsrp-dark border border-gsrp-dark-border rounded-3xl p-7 shadow-2xl">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gsrp-sunset/10 border border-gsrp-sunset/25 flex items-center justify-center">
              <Flag size={18} className="text-gsrp-sunset" />
            </div>
            <div>
              <h3 className="text-white font-bold">Mod Call {index + 1} of 3</h3>
              <p className="text-xs text-gsrp-teal-light/40">Mark this scene against the guideline below.</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-gsrp-teal-light/40 hover:text-white transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="bg-gsrp-sunset/8 border border-gsrp-sunset/20 rounded-xl p-3.5 mb-5">
          <p className="text-xs text-gsrp-sunset font-semibold leading-relaxed">
            Be extremely strict. Follow Wait → Confront (by trainee) → React. Overtake the scene if it is handled incorrectly.
          </p>
        </div>

        <div className="space-y-2 mb-6">
          {MOD_CALL_CHECKS.map((c, i) => (
            <button
              key={i}
              onClick={() => toggle(i)}
              className="w-full flex items-start gap-3 text-left p-3 rounded-xl border border-gsrp-dark-border/50 hover:border-gsrp-teal/30 transition-colors cursor-pointer"
            >
              <span className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                checks[i] ? 'bg-gsrp-teal border-gsrp-teal text-white' : 'border-gsrp-dark-border'
              }`}>
                {checks[i] && <Check size={13} />}
              </span>
              <span className="text-sm text-gsrp-teal-light/75">{c}</span>
            </button>
          ))}
        </div>

        <p className="text-xs font-bold uppercase tracking-widest text-gsrp-teal-light/50 mb-2">Scene outcome</p>
        <div className="grid grid-cols-2 gap-3 mb-5">
          <button
            onClick={() => setVerdict('handled')}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold border transition-colors cursor-pointer ${
              verdict === 'handled' ? 'bg-gsrp-teal/15 border-gsrp-teal/40 text-gsrp-teal-light' : 'border-gsrp-dark-border text-gsrp-teal-light/50 hover:border-gsrp-teal/30'
            }`}
          >
            Handled correctly
          </button>
          <button
            onClick={() => setVerdict('overtaken')}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold border transition-colors cursor-pointer ${
              verdict === 'overtaken' ? 'bg-gsrp-sunset/15 border-gsrp-sunset/40 text-gsrp-sunset' : 'border-gsrp-dark-border text-gsrp-teal-light/50 hover:border-gsrp-sunset/30'
            }`}
          >
            Had to overtake
          </button>
        </div>

        <label htmlFor={`modcall-note-${index}`} className="block text-xs font-bold uppercase tracking-widest text-gsrp-teal-light/50 mb-2">Notes (optional)</label>
        <textarea
          id={`modcall-note-${index}`}
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={2}
          placeholder="What happened, what to improve..."
          className="w-full bg-gsrp-dark-surface border border-gsrp-dark-border rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-gsrp-teal-light/30 outline-none focus:border-gsrp-teal/40 transition-colors mb-6 resize-none"
        />

        <button
          disabled={!verdict}
          onClick={() => verdict && onSave({ checks, verdict, note: note.trim() })}
          className={`w-full px-6 py-3 rounded-xl font-bold text-sm transition-all duration-200 ${
            verdict ? 'bg-gsrp-teal text-white hover:bg-gsrp-teal/90 cursor-pointer' : 'bg-gsrp-dark-surface border border-gsrp-dark-border text-gsrp-teal-light/30 cursor-not-allowed'
          }`}
        >
          Save mod call
        </button>
      </div>
    </div>
  )
}

// ─── Main handbook / report ───────────────────────────────────────────────────
export default function TrainerHandbook({ trainee }) {
  const [criteria, setCriteria] = useState(MARKING_CRITERIA.map(() => false))
  const [modCalls, setModCalls] = useState([]) // { checks, verdict, note }
  const [modalOpen, setModalOpen] = useState(false)
  const [notes, setNotes] = useState('')
  const [posting, setPosting] = useState(false)
  const [postResult, setPostResult] = useState(null) // { ok, error }

  const score = useMemo(() => criteria.filter(Boolean).length * MARK_PER_CRITERION, [criteria])
  const pct = Math.round((score / MAX_SCORE) * 100)
  const passed = score >= PASS_SCORE
  const toggleCriterion = (i) => setCriteria(c => c.map((v, idx) => idx === i ? !v : v))

  const saveModCall = (data) => {
    setModCalls(prev => [...prev, data])
    setModalOpen(false)
  }

  const handlePost = useCallback(async () => {
    setPosting(true)
    setPostResult(null)
    // Fold mod-call notes into the posted notes so the trainee gets the detail.
    const modSummary = modCalls.map((m, i) =>
      `Mod call ${i + 1}: ${m.verdict === 'handled' ? 'handled correctly' : 'had to overtake'}${m.note ? `, ${m.note}` : ''}`
    ).join('\n')
    const combinedNotes = [notes.trim(), modSummary].filter(Boolean).join('\n\n')
    try {
      const res = await fetch('/api/trainer/post-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          traineeDiscordId: trainee.member.id,
          traineeRoblox: trainee.roblox,
          score,
          total: MAX_SCORE,
          passed,
          notes: combinedNotes,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to post result')
      setPostResult({ ok: true, ...data })
    } catch (err) {
      setPostResult({ ok: false, error: err.message })
    } finally {
      setPosting(false)
    }
  }, [modCalls, notes, passed, score, trainee])

  return (
    <div className="max-w-3xl mx-auto w-full pb-32 space-y-5">
      {/* Trainee header */}
      <div className="bg-gradient-to-br from-gsrp-dark-surface/80 to-gsrp-dark-surface/30 border border-gsrp-dark-border/60 rounded-2xl p-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gsrp-orange mb-3">Trainer Report</p>
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <div className="flex items-center gap-3">
            <img src={trainee.member.avatar} alt="" className="w-10 h-10 rounded-full" />
            <div>
              <p className="text-white font-bold leading-tight">{trainee.member.displayName}</p>
              <p className="text-xs text-gsrp-teal-light/40">@{trainee.member.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <User size={14} className="text-gsrp-teal-light/40" />
            <span className="text-gsrp-teal-light/50">Roblox:</span>
            <span className="text-white font-medium">{trainee.roblox}</span>
          </div>
        </div>
      </div>

      {/* Strictness banner */}
      <div className="bg-gsrp-sunset/8 border border-gsrp-sunset/25 rounded-2xl p-5 flex items-start gap-3">
        <AlertTriangle size={20} className="text-gsrp-sunset shrink-0 mt-0.5" />
        <div>
          <h3 className="text-gsrp-sunset font-bold mb-1">Be extremely strict.</h3>
          <p className="text-sm text-gsrp-teal-light/70 leading-relaxed">
            Hold the trainee to a high standard on how they act during mod calls. Maintain utmost SPaG and
            professionalism yourself. Only <span className="font-semibold text-white">3 mod calls</span> are to be
            answered before the training ends.
          </p>
        </div>
      </div>

      {/* Mandatory message */}
      <SectionCard icon={MessageSquare} title="Tell the trainee this first" subtitle="Mandatory, send before the ride-along" accent="orange">
        <MessageRow text={HANDLING_MESSAGE} />
      </SectionCard>

      {/* Pre-training */}
      <SectionCard icon={MessageSquare} title="Pre-training messages" subtitle="Send these in order">
        <div className="space-y-2.5">
          {PRE_TRAINING.map((m, i) => <MessageRow key={i} text={m} />)}
        </div>
      </SectionCard>

      {/* Ride-along briefing */}
      <SectionCard icon={Car} title="Ride-along briefing" subtitle="Brief the trainee on what you will assess">
        <div className="space-y-2.5">
          {RIDE_ALONG_BRIEF.map((m, i) => <MessageRow key={i} text={m} />)}
        </div>
      </SectionCard>

      {/* Assessment guidance */}
      <SectionCard icon={Shield} title="What to assess" subtitle="Watch for these throughout the ride-along">
        <p className="text-xs font-bold uppercase tracking-widest text-gsrp-teal-light/40 mb-2">Look out for</p>
        <ul className="space-y-1.5 mb-5">
          {LOOK_OUT_FOR.map((t, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-gsrp-teal-light/70">
              <ChevronRight size={15} className="text-gsrp-teal-light/30 shrink-0 mt-0.5" />{t}
            </li>
          ))}
        </ul>
        <p className="text-xs font-bold uppercase tracking-widest text-gsrp-teal-light/40 mb-2">Your duties</p>
        <ul className="space-y-1.5">
          {TRAINER_DUTIES.map((t, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-gsrp-teal-light/70">
              <ChevronRight size={15} className="text-gsrp-teal-light/30 shrink-0 mt-0.5" />{t}
            </li>
          ))}
        </ul>
      </SectionCard>

      {/* Mod call tracker */}
      <SectionCard icon={Flag} title="Mod call marking" subtitle="Mark each scene as it happens, maximum of 3" accent="red">
        <div className="space-y-2.5 mb-4">
          {modCalls.map((m, i) => (
            <div key={i} className="flex items-center gap-3 bg-gsrp-dark-surface/50 border border-gsrp-dark-border/40 rounded-xl p-3.5">
              <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                m.verdict === 'handled' ? 'bg-gsrp-teal/15 text-gsrp-teal-light' : 'bg-gsrp-sunset/15 text-gsrp-sunset'
              }`}>
                {m.verdict === 'handled' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium">Mod call {i + 1}, {m.verdict === 'handled' ? 'Handled correctly' : 'Had to overtake'}</p>
                {m.note && <p className="text-xs text-gsrp-teal-light/40 truncate">{m.note}</p>}
                <p className="text-[11px] text-gsrp-teal-light/40">{m.checks.filter(Boolean).length}/{MOD_CALL_CHECKS.length} criteria met</p>
              </div>
            </div>
          ))}
        </div>
        {modCalls.length < 3 ? (
          <button
            onClick={() => setModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-dashed border-gsrp-sunset/40 text-gsrp-sunset font-bold text-sm hover:bg-gsrp-sunset/8 transition-colors cursor-pointer"
          >
            <Plus size={16} /> Log mod call {modCalls.length + 1}
          </button>
        ) : (
          <p className="text-center text-xs text-gsrp-teal-light/40 py-2">
            All 3 mod calls logged. The training should now end.
          </p>
        )}
      </SectionCard>

      {/* Marking criteria */}
      <SectionCard icon={ClipboardList} title="Marking criteria" subtitle="Each tick is worth 2 marks">
        <div className="space-y-2">
          {MARKING_CRITERIA.map((c, i) => (
            <button
              key={i}
              onClick={() => toggleCriterion(i)}
              className="w-full flex items-start gap-3 text-left p-3 rounded-xl border border-gsrp-dark-border/50 hover:border-gsrp-teal/30 transition-colors cursor-pointer"
            >
              <span className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                criteria[i] ? 'bg-gsrp-teal border-gsrp-teal text-white' : 'border-gsrp-dark-border'
              }`}>
                {criteria[i] && <Check size={13} />}
              </span>
              <span className="text-sm text-gsrp-teal-light/75 flex-1">{c}</span>
              <span className="text-xs font-bold text-gsrp-teal-light/30">{criteria[i] ? '+2' : '0'}</span>
            </button>
          ))}
        </div>
      </SectionCard>

      {/* Post-training */}
      <SectionCard icon={MessageSquare} title="Post-training messages" subtitle="Deliver the staff guidelines, then send results">
        <div className="space-y-2.5">
          {POST_TRAINING.map((m, i) => <MessageRow key={i} text={m} />)}
        </div>
      </SectionCard>

      {/* Result + post */}
      <SectionCard icon={Send} title="Final result" subtitle={`Pass mark: ${PASS_SCORE}/${MAX_SCORE}`}>
        <div className={`rounded-2xl p-5 mb-5 border ${passed ? 'bg-gsrp-teal/10 border-gsrp-teal/30' : 'bg-gsrp-sunset/10 border-gsrp-sunset/30'}`}>
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gsrp-teal-light/40">Total score</p>
              <p className="text-3xl font-bold text-white">{score}<span className="text-lg text-gsrp-teal-light/40">/{MAX_SCORE}</span></p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-widest text-gsrp-teal-light/40">Outcome</p>
              <p className={`text-2xl font-bold ${passed ? 'text-gsrp-teal-light' : 'text-gsrp-sunset'}`}>{passed ? 'PASS' : 'FAIL'}</p>
            </div>
          </div>
          <div className="h-2 rounded-full bg-gsrp-dark-surface overflow-hidden">
            <div className={`h-full transition-all duration-500 ${passed ? 'bg-gsrp-teal' : 'bg-gsrp-sunset'}`} style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-gsrp-teal-light/40 mt-2">{pct}%</p>
        </div>

        <label htmlFor="final-notes" className="block text-xs font-bold uppercase tracking-widest text-gsrp-teal-light/50 mb-2">
          Notes for the trainee
        </label>
        <textarea
          id="final-notes"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          placeholder="Strengths, things to improve on..."
          className="w-full bg-gsrp-dark-surface border border-gsrp-dark-border rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-gsrp-teal-light/30 outline-none focus:border-gsrp-teal/40 transition-colors resize-none mb-5"
        />

        {postResult?.ok ? (
          <div className="bg-gsrp-teal/10 border border-gsrp-teal/25 rounded-xl p-4 text-center">
            <CheckCircle2 size={20} className="text-gsrp-teal-light mx-auto mb-1.5" />
            <p className="text-sm font-bold text-gsrp-teal-light">Result posted</p>
            <p className="text-xs text-gsrp-teal-light/50 mt-1">
              {postResult.dmSent ? 'The trainee was DMed their outcome.' : 'Trainee DM could not be delivered.'}
              {postResult.channelPosted ? ' Posted to the results channel.' : ''}
            </p>
          </div>
        ) : (
          <>
            <button
              onClick={handlePost}
              disabled={posting}
              className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-200 ${
                posting ? 'bg-gsrp-dark-surface border border-gsrp-dark-border text-gsrp-teal-light/40 cursor-not-allowed' : 'bg-gsrp-orange text-white hover:bg-gsrp-orange/90 cursor-pointer'
              }`}
            >
              {posting ? <><Loader2 size={16} className="animate-spin" /> Posting...</> : <><Send size={16} /> Post result &amp; DM trainee</>}
            </button>
            {postResult?.error && (
              <p className="text-xs text-gsrp-sunset bg-gsrp-sunset/8 border border-gsrp-sunset/20 rounded-xl p-3 text-center mt-3">{postResult.error}</p>
            )}
          </>
        )}
      </SectionCard>

      {modalOpen && (
        <ModCallModal
          index={modCalls.length}
          onClose={() => setModalOpen(false)}
          onSave={saveModCall}
        />
      )}
    </div>
  )
}
