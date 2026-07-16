import { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useSession, signIn, signOut } from 'next-auth/react';
import {
  Gavel,
  Send,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Keyboard,
  ShieldCheck,
  ShieldAlert,
  Clock,
  RefreshCw,
  Lock,
  Eye,
  LogOut,
} from 'lucide-react';

const APPEAL_QUESTIONS = [
  {
    id: 'why_banned',
    label: 'Why were you banned?',
    subtitle: 'Be honest and specific. Staff can see the ban reason on record — dishonesty will end your appeal instantly.',
    placeholder: 'Explain, in your own words, what led to your ban...',
    minimumWords: 15,
    sentences: 2,
  },
  {
    id: 'why_unban',
    label: 'Why should we unban you?',
    subtitle: 'What has changed? Why should staff trust you back in the community?',
    placeholder: 'Make your case for a second chance...',
    minimumWords: 25,
    sentences: 2,
  },
];

const MAX_TIMELINE_EVENTS_PER_FIELD = 20000;
const DRAFT_KEY_PREFIX = 'gsrp_ban_appeal_draft_';
const AUTO_SAVE_INTERVAL = 5000;

function countWords(value) {
  return String(value || '').trim().split(/\s+/).filter(Boolean).length;
}

function countSentences(value) {
  return String(value || '').split(/[.!?]+/).filter(s => s.trim().length > 2).length;
}

// Same minimal-edit diff the application form records, so the reviewer's
// typing replay works identically for appeals.
function computeDiff(oldValue, newValue) {
  const a = String(oldValue || '');
  const b = String(newValue || '');
  if (a === b) return null;

  const maxPrefix = Math.min(a.length, b.length);
  let p = 0;
  while (p < maxPrefix && a[p] === b[p]) p++;

  let s = 0;
  const maxSuffix = Math.min(a.length - p, b.length - p);
  while (s < maxSuffix && a[a.length - 1 - s] === b[b.length - 1 - s]) s++;

  return { p, d: a.length - p - s, i: b.slice(p, b.length - s) };
}

function detectOS(userAgent) {
  if (/Macintosh|MacIntel|MacPPC|Mac68K/i.test(userAgent)) return 'mac';
  if (/Windows|Win32|Win64|WOW64/i.test(userAgent)) return 'windows';
  return 'other';
}

function fetchWithTimeout(url, options, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    fetch(url, { ...options, signal: controller.signal })
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timeout));
  });
}

function formatDate(value) {
  try {
    return new Date(value).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' });
  } catch {
    return '';
  }
}

const QuestionLabel = ({ children, subtitle, sentences = 0, minimumWords = 0 }) => (
  <label className="block mb-3">
    <div className="flex justify-between items-center">
      <span className="text-sm font-bold uppercase tracking-widest text-white/90 ml-1">
        {children} <span className="text-gsrp-orange">*</span>
      </span>
      <span className="flex items-center gap-1 opacity-60 text-[10px] font-bold uppercase tracking-widest text-gsrp-teal-light">
        <Keyboard size={10} /> Monitoring Active
      </span>
    </div>
    {subtitle && <p className="text-xs text-gsrp-teal-light/70 ml-1 mt-1 font-medium">{subtitle}</p>}
    {sentences > 0 && <p className="text-[10px] text-gsrp-orange ml-1 mt-0.5 font-bold uppercase tracking-widest">({sentences} Sentences Required)</p>}
    {minimumWords > 0 && <p className="text-[10px] text-gsrp-orange ml-1 mt-0.5 font-bold uppercase tracking-widest">({minimumWords} Words Required)</p>}
  </label>
);

const WordCounter = ({ value, minimumWords = 0 }) => {
  if (!minimumWords) return null;
  const words = countWords(value);
  const complete = words >= minimumWords;
  return (
    <div className={`-mt-6 mb-6 ml-2 text-[10px] font-bold uppercase tracking-widest ${complete ? 'text-gsrp-teal' : 'text-gsrp-orange'}`}>
      {words} / {minimumWords} words
    </div>
  );
};

const StatusCard = ({ icon, tone = 'orange', title, children }) => {
  const tones = {
    orange: 'border-gsrp-orange/25 bg-gsrp-orange/10 text-gsrp-orange',
    teal: 'border-gsrp-teal/25 bg-gsrp-teal/10 text-gsrp-teal',
    red: 'border-red-500/25 bg-red-500/10 text-red-400',
  };
  return (
    <div className="bg-gsrp-dark-card/80 backdrop-blur-md border border-white/10 rounded-3xl p-10 text-center shadow-2xl animate-fade-in-up">
      <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center mx-auto mb-6 ${tones[tone]}`}>
        {icon}
      </div>
      <h2 className="font-display text-white font-extrabold text-2xl tracking-tight mb-3">{title}</h2>
      {children}
    </div>
  );
};

function PageShell({ children }) {
  const { data: session } = useSession();
  return (
    <div className="min-h-screen relative z-10 px-6 py-14">
      <Head><title>Ban Appeal | GSRP</title></Head>
      {session && (
        <div className="fixed top-5 right-5 z-20">
          <button
            onClick={() => signOut({ callbackUrl: '/ban-appeals' })}
            className="flex items-center gap-2.5 bg-gsrp-dark-card/80 backdrop-blur-md border border-white/10 hover:border-gsrp-orange/40 rounded-2xl pl-2 pr-4 py-2 transition-colors group cursor-pointer"
            title="Sign out"
          >
            {session.user?.image && (
              <img src={session.user.image} alt="" className="w-7 h-7 rounded-full border border-white/10 object-cover" />
            )}
            <span className="text-white/70 text-xs font-bold max-w-[120px] truncate hidden sm:block">{session.user?.name}</span>
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gsrp-teal-light/50 group-hover:text-gsrp-orange transition-colors">
              <LogOut size={12} /> Sign out
            </span>
          </button>
        </div>
      )}
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col items-center text-center mb-10 animate-fade-in-up">
          <div className="relative mb-5">
            <div className="absolute -inset-4 bg-gradient-to-br from-gsrp-orange/20 to-gsrp-teal/15 rounded-3xl blur-2xl" aria-hidden="true" />
            <img src="https://i.imgur.com/70GfmYd.gif" alt="Georgia State Roleplay" className="relative w-16 h-16 rounded-2xl border border-white/10 object-cover shadow-2xl" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-gsrp-teal-light/50 mb-2">Georgia State Roleplay</p>
          <h1 className="font-display text-white font-extrabold text-4xl tracking-tight flex items-center gap-3">
            <Gavel className="text-gsrp-orange" size={30} />
            Ban Appeals
          </h1>
          <p className="text-gsrp-teal-light/55 text-sm mt-3 max-w-md leading-relaxed">
            Banned from the GSRP Discord? This is your one formal chance to make it right.
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function BanAppealsPage() {
  const { data: session, status } = useSession();

  const [banState, setBanState] = useState(null); // response from /api/ban-appeals/status
  const [checkError, setCheckError] = useState(null);
  const [checking, setChecking] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [success, setSuccess] = useState(null); // { dmDelivered }
  const [validationErrors, setValidationErrors] = useState({});
  const [answers, setAnswers] = useState({});
  const [userAgent, setUserAgent] = useState('');
  const [osDetected, setOsDetected] = useState('other');
  const [sessionTabOuts, setSessionTabOuts] = useState([]);
  const [sessionMouseLeaves, setSessionMouseLeaves] = useState([]);

  const answersRef = useRef({});
  const typingTimelineRef = useRef({});
  const keystrokesRef = useRef({});
  const pastesRef = useRef({});
  const monitoringDataRef = useRef({});
  const sessionTabOutsRef = useRef([]);
  const sessionMouseLeavesRef = useRef([]);
  const activeFieldRef = useRef(null);
  const tabOutStartRef = useRef(null);
  const mouseLeaveStartRef = useRef(null);
  const idleTimerRef = useRef(null);
  const wpmWindowsRef = useRef({});
  const lastKeystrokeTimeRef = useRef({});
  const successRef = useRef(false);

  useEffect(() => { sessionTabOutsRef.current = sessionTabOuts; }, [sessionTabOuts]);
  useEffect(() => { sessionMouseLeavesRef.current = sessionMouseLeaves; }, [sessionMouseLeaves]);
  useEffect(() => { successRef.current = !!success; }, [success]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent;
      setUserAgent(ua);
      setOsDetected(detectOS(ua));
    }
  }, []);

  const loadBanStatus = useCallback(async () => {
    setChecking(true);
    setCheckError(null);
    try {
      const res = await fetchWithTimeout('/api/ban-appeals/status', {}, 20000);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Could not verify your ban status.');
      setBanState(data);
    } catch (err) {
      setCheckError(err.name === 'AbortError' ? 'The ban check timed out. Please try again.' : err.message);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (session) loadBanStatus();
  }, [session, loadBanStatus]);

  // ── Draft persistence (same behavior as the application form) ──────────────
  useEffect(() => {
    if (!session) return;
    try {
      const raw = localStorage.getItem(`${DRAFT_KEY_PREFIX}${session.user.id}`);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft.expiresAt && Date.now() > draft.expiresAt) {
        localStorage.removeItem(`${DRAFT_KEY_PREFIX}${session.user.id}`);
        return;
      }
      if (draft.answers && Object.keys(draft.answers).length > 0) {
        answersRef.current = draft.answers;
        setAnswers(draft.answers);
        if (draft.timeline && typeof draft.timeline === 'object' && !Array.isArray(draft.timeline)) {
          typingTimelineRef.current = draft.timeline;
        } else {
          const seeded = {};
          for (const [fieldId, value] of Object.entries(draft.answers)) {
            if (typeof value === 'string' && value.length > 0) {
              seeded[fieldId] = [{ t: Date.now(), p: 0, d: 0, i: value }];
            }
          }
          typingTimelineRef.current = seeded;
        }
      }
    } catch (e) {
      console.error('[Ban Appeal] Draft restore failed:', e);
    }
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const interval = setInterval(() => {
      if (Object.keys(answersRef.current).length > 0 && !successRef.current) {
        try {
          localStorage.setItem(`${DRAFT_KEY_PREFIX}${session.user.id}`, JSON.stringify({
            answers: answersRef.current,
            timeline: typingTimelineRef.current,
            savedAt: Date.now(),
            expiresAt: Date.now() + 5 * 60 * 60 * 1000,
          }));
        } catch (e) {
          try {
            localStorage.setItem(`${DRAFT_KEY_PREFIX}${session.user.id}`, JSON.stringify({
              answers: answersRef.current,
              timeline: {},
              savedAt: Date.now(),
              expiresAt: Date.now() + 5 * 60 * 60 * 1000,
            }));
          } catch (_) {}
        }
      }
    }, AUTO_SAVE_INTERVAL);
    return () => clearInterval(interval);
  }, [session]);

  // ── Monitoring: WPM spikes, idle periods, tab-outs, mouse leaves ────────────
  const updateMonitoringForField = useCallback((fieldName, updater) => {
    const current = monitoringDataRef.current[fieldName] || { tabOuts: [], rightClicks: [], wpmSpikes: [], idlePeriods: [] };
    monitoringDataRef.current = { ...monitoringDataRef.current, [fieldName]: updater(current) };
  }, []);

  const checkWPMAnomaly = useCallback((fieldName) => {
    const now = Date.now();
    if (!wpmWindowsRef.current[fieldName]) wpmWindowsRef.current[fieldName] = [];
    wpmWindowsRef.current[fieldName].push(now);
    const windowStart = now - 10000;
    wpmWindowsRef.current[fieldName] = wpmWindowsRef.current[fieldName].filter(t => t > windowStart);
    const recentKeystrokes = wpmWindowsRef.current[fieldName].length;
    const windowWPM = (recentKeystrokes / 5) / (10 / 60);
    const allTimes = wpmWindowsRef.current[fieldName];
    if (allTimes.length < 10) return;
    const overallDuration = (allTimes[allTimes.length - 1] - allTimes[0]) / 1000 / 60;
    if (overallDuration <= 0) return;
    const overallWPM = (allTimes.length / 5) / overallDuration;
    if (overallWPM > 0 && windowWPM > overallWPM * 3) {
      updateMonitoringForField(fieldName, (current) => ({
        ...current,
        wpmSpikes: [...current.wpmSpikes, {
          timestamp: now,
          windowWpm: Math.round(windowWPM),
          averageWpm: Math.round(overallWPM),
          ratio: parseFloat((windowWPM / overallWPM).toFixed(1)),
        }],
      }));
    }
  }, [updateMonitoringForField]);

  const resetIdleTimer = useCallback((fieldName) => {
    lastKeystrokeTimeRef.current[fieldName] = Date.now();
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      const lastTime = lastKeystrokeTimeRef.current[fieldName];
      if (lastTime && Date.now() - lastTime >= 30000) {
        updateMonitoringForField(fieldName, (current) => ({
          ...current,
          idlePeriods: [...current.idlePeriods, {
            startedAt: lastTime,
            endedAt: Date.now(),
            duration: Math.round((Date.now() - lastTime) / 1000),
          }],
        }));
      }
    }, 30000);
  }, [updateMonitoringForField]);

  const recordTyping = useCallback((fieldName, oldValue, newValue) => {
    const diff = computeDiff(oldValue, newValue);
    if (!diff) return;
    const list = typingTimelineRef.current[fieldName] || (typingTimelineRef.current[fieldName] = []);
    if (list.length >= MAX_TIMELINE_EVENTS_PER_FIELD) return;
    list.push({ t: Date.now(), ...diff });
  }, []);

  const trackEvent = useCallback((fieldName, type, data) => {
    if (type === 'keystroke') {
      const field = keystrokesRef.current[fieldName] || [];
      keystrokesRef.current = { ...keystrokesRef.current, [fieldName]: [...field, { timestamp: Date.now(), key: data }] };
      resetIdleTimer(fieldName);
      checkWPMAnomaly(fieldName);
    } else if (type === 'paste') {
      const field = pastesRef.current[fieldName] || [];
      pastesRef.current = { ...pastesRef.current, [fieldName]: [...field, {
        timestamp: Date.now(),
        content: data,
        charCount: data.length,
        cursorPosition: activeFieldRef.current === fieldName ? (document.querySelector(`[name="${fieldName}"]`)?.selectionStart || 0) : 0,
      }] };
      resetIdleTimer(fieldName);
    } else if (type === 'contextmenu') {
      updateMonitoringForField(fieldName, (current) => ({
        ...current,
        rightClicks: [...current.rightClicks, { timestamp: Date.now(), x: data.x, y: data.y }],
      }));
    }
  }, [resetIdleTimer, checkWPMAnomaly, updateMonitoringForField]);

  useEffect(() => {
    const closeTabOut = () => {
      const leftAt = tabOutStartRef.current;
      if (!leftAt) return;
      const duration = Math.round((Date.now() - leftAt) / 1000);
      const activeField = activeFieldRef.current;
      if (activeField) {
        updateMonitoringForField(activeField, (current) => ({
          ...current,
          tabOuts: [...current.tabOuts, { leftAt, returnedAt: Date.now(), duration, questionLabel: activeField }],
        }));
      }
      setSessionTabOuts(prev => [...prev, { leftAt, returnedAt: Date.now(), duration, activeField }]);
      tabOutStartRef.current = null;
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        tabOutStartRef.current = Date.now();
      } else {
        closeTabOut();
      }
    };
    const handleWindowBlur = () => {
      if (!document.hidden && !tabOutStartRef.current) tabOutStartRef.current = Date.now();
    };
    const handleWindowFocus = closeTabOut;
    const handleMouseLeave = () => { mouseLeaveStartRef.current = Date.now(); };
    const handleMouseEnter = () => {
      const leftAt = mouseLeaveStartRef.current;
      if (leftAt) {
        setSessionMouseLeaves(prev => [...prev, {
          leftAt,
          returnedAt: Date.now(),
          duration: Math.round((Date.now() - leftAt) / 1000),
          activeField: activeFieldRef.current,
        }]);
        mouseLeaveStartRef.current = null;
      }
    };
    const handleFieldFocus = (e) => { if (e.target.name) activeFieldRef.current = e.target.name; };
    const handleFieldBlur = (e) => { if (activeFieldRef.current === e.target.name) activeFieldRef.current = null; };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);
    document.addEventListener('focusin', handleFieldFocus);
    document.addEventListener('focusout', handleFieldBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      document.removeEventListener('focusin', handleFieldFocus);
      document.removeEventListener('focusout', handleFieldBlur);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [updateMonitoringForField]);

  const setAnswer = (fieldId, value) => {
    recordTyping(fieldId, answersRef.current[fieldId], value);
    answersRef.current = { ...answersRef.current, [fieldId]: value };
    setAnswers(answersRef.current);
    if (validationErrors[fieldId]) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  const handleSubmit = async () => {
    setSubmitError(null);

    const errors = {};
    for (const q of APPEAL_QUESTIONS) {
      const val = String(answersRef.current[q.id] || '');
      if (!val.trim()) errors[q.id] = 'This field is required';
      else if (countWords(val) < q.minimumWords || countSentences(val) < q.sentences) errors[q.id] = 'You have not wrote enough';
    }
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setIsSubmitting(true);

    function truncateArrays(obj, maxLen = 50) {
      if (!obj || typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) return obj.slice(-maxLen);
      const result = {};
      for (const [k, v] of Object.entries(obj)) result[k] = truncateArrays(v, maxLen);
      return result;
    }

    const data = {
      answers: {
        why_banned: answersRef.current.why_banned,
        why_unban: answersRef.current.why_unban,
      },
      typingTimeline: typingTimelineRef.current,
      keystrokeData: truncateArrays(keystrokesRef.current, 5000),
      pasteData: truncateArrays(pastesRef.current, 100),
      monitoringData: truncateArrays(monitoringDataRef.current, 20),
      sessionTabOuts: sessionTabOutsRef.current.slice(-50),
      sessionMouseLeaves: sessionMouseLeavesRef.current.slice(-50),
      userAgent,
      osDetected,
      submittedAt: new Date(),
    };

    try {
      const res = await fetchWithTimeout('/api/ban-appeals/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }, 30000);

      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.message || 'Failed to submit your appeal.');

      try { localStorage.removeItem(`${DRAFT_KEY_PREFIX}${session.user.id}`); } catch (_) {}
      answersRef.current = {};
      typingTimelineRef.current = {};
      setSuccess({ dmDelivered: result.dmDelivered !== false });
    } catch (err) {
      setSubmitError(err.name === 'AbortError' ? 'Request timed out. Please check your connection and try again.' : err.message);
      setIsSubmitting(false);
    }
  };

  // ── Screens ─────────────────────────────────────────────────────────────────

  if (status === 'loading') {
    return (
      <PageShell>
        <StatusCard icon={<Loader2 size={28} className="animate-spin" />} title="Loading">
          <p className="text-gsrp-teal-light/55 text-sm">One moment...</p>
        </StatusCard>
      </PageShell>
    );
  }

  if (!session) {
    return (
      <PageShell>
        <div className="bg-gsrp-dark-card/80 backdrop-blur-md border border-white/10 rounded-3xl p-10 shadow-2xl animate-fade-in-up">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border border-gsrp-orange/25 bg-gradient-to-br from-gsrp-orange/15 to-gsrp-teal/12">
            <Lock size={24} className="text-gsrp-orange" />
          </div>
          <h2 className="font-display text-white font-extrabold text-2xl tracking-tight mb-2">Sign In to Appeal</h2>
          <p className="text-gsrp-teal-light/55 text-sm leading-relaxed mb-2">
            Sign in with Discord so we can verify your ban and identify your appeal.
          </p>
          <p className="text-gsrp-teal-light/40 text-xs leading-relaxed mb-7">
            You do <span className="text-gsrp-orange font-bold">not</span> need to be a member of the Discord server — this page is made for banned users.
          </p>
          <button
            onClick={() => signIn('discord', { callbackUrl: '/ban-appeals' })}
            className="group relative inline-flex items-center gap-2.5 bg-[#5865F2] hover:bg-[#4752c4] text-white px-6 py-3.5 rounded-xl font-bold text-sm transition-colors duration-200 cursor-pointer w-full justify-center overflow-hidden"
          >
            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-white/15 to-transparent" aria-hidden="true" />
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.872-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128c.125-.094.25-.188.372-.284a.076.076 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.076.076 0 01.078.01c.12.096.245.19.37.284a.077.077 0 01-.006.127 12.3 12.3 0 01-1.873.892.077.077 0 00-.041.107c.36.698.77 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.41 0-1.325.956-2.41 2.157-2.41 1.21 0 2.176 1.095 2.157 2.41 0 1.325-.956 2.41-2.157 2.41zm7.975 0c-1.183 0-2.157-1.085-2.157-2.41 0-1.325.955-2.41 2.157-2.41 1.21 0 2.176 1.095 2.157 2.41 0 1.325-.946 2.41-2.157 2.41z" />
            </svg>
            Sign in with Discord
          </button>
        </div>
      </PageShell>
    );
  }

  if (checking) {
    return (
      <PageShell>
        <StatusCard icon={<Loader2 size={28} className="animate-spin" />} title="Checking Your Ban Status">
          <p className="text-gsrp-teal-light/55 text-sm">Verifying your standing with the GSRP Discord server...</p>
        </StatusCard>
      </PageShell>
    );
  }

  if (checkError) {
    return (
      <PageShell>
        <StatusCard icon={<AlertCircle size={28} />} tone="red" title="Verification Failed">
          <p className="text-gsrp-teal-light/55 text-sm mb-6">{checkError}</p>
          <button onClick={loadBanStatus} className="inline-flex items-center gap-2 px-6 py-3 bg-gsrp-orange text-white font-bold text-sm rounded-xl">
            <RefreshCw size={16} /> Try Again
          </button>
        </StatusCard>
      </PageShell>
    );
  }

  if (banState && !banState.banned) {
    return (
      <PageShell>
        <StatusCard icon={<ShieldCheck size={28} />} tone="teal" title="You're Not Banned">
          <p className="text-gsrp-teal-light/55 text-sm leading-relaxed mb-6 max-w-md mx-auto">
            Good news, <span className="text-white font-bold">{banState.username}</span> — this Discord account is not banned from the Georgia State Roleplay server. There's nothing to appeal.
          </p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-6 py-3 bg-gsrp-orange text-white font-bold text-sm rounded-xl">
            Go to Dashboard
          </Link>
        </StatusCard>
      </PageShell>
    );
  }

  if (success) {
    return (
      <PageShell>
        <StatusCard icon={<CheckCircle2 size={28} />} tone="teal" title="Appeal Submitted">
          <p className="text-gsrp-teal-light/55 text-sm leading-relaxed mb-4 max-w-md mx-auto">
            Your ban appeal has been sent to the staff team for review. You will be notified of the outcome — do not submit another appeal while this one is pending.
          </p>
          {success.dmDelivered ? (
            <p className="text-gsrp-teal text-xs font-bold uppercase tracking-widest">A confirmation has been sent to your Discord DMs</p>
          ) : (
            <p className="text-gsrp-orange text-xs font-medium max-w-md mx-auto">
              We couldn't DM you a confirmation — your appeal was still received. Enable DMs from server members to get the outcome notification.
            </p>
          )}
        </StatusCard>
      </PageShell>
    );
  }

  if (banState?.appeal?.status === 'pending') {
    return (
      <PageShell>
        <StatusCard icon={<Clock size={28} />} title="Appeal Pending Review">
          <p className="text-gsrp-teal-light/55 text-sm leading-relaxed mb-4 max-w-md mx-auto">
            You already have a ban appeal awaiting review{banState.appeal.submittedAt ? `, submitted ${formatDate(banState.appeal.submittedAt)}` : ''}. The staff team will DM you once a decision is made.
          </p>
          <p className="text-gsrp-teal-light/35 text-xs">Submitting additional appeals or asking for updates will not speed up the process.</p>
        </StatusCard>
      </PageShell>
    );
  }

  const lastAppeal = banState?.appeal;

  return (
    <PageShell>
      {lastAppeal && lastAppeal.status !== 'pending' && (
        <div className={`mb-6 p-5 rounded-2xl border animate-fade-in-up ${lastAppeal.status === 'denied' ? 'bg-red-500/10 border-red-500/20' : 'bg-gsrp-teal/10 border-gsrp-teal/20'}`}>
          <p className="text-white text-sm font-bold mb-1">
            Your previous appeal was {lastAppeal.status}{lastAppeal.reviewedAt ? ` on ${formatDate(lastAppeal.reviewedAt)}` : ''}.
          </p>
          {lastAppeal.reason && <p className="text-white/60 text-xs leading-relaxed">Reason: {lastAppeal.reason}</p>}
        </div>
      )}

      <div className="mb-6 p-6 rounded-2xl bg-gsrp-orange/10 border border-gsrp-orange/30 animate-fade-in-up">
        <div className="flex items-center gap-3 mb-4">
          <Eye className="w-5 h-5 text-gsrp-orange flex-shrink-0" />
          <h2 className="text-white font-bold text-sm uppercase tracking-widest">Before You Begin, Important</h2>
        </div>
        <ul className="space-y-2 ml-1">
          <li className="flex items-start gap-3 text-sm text-white/80 font-medium">
            <span className="text-gsrp-orange font-bold mt-0.5">•</span>
            Keystrokes, pastes, tab-outs and typing rhythm are recorded while you write.
          </li>
          <li className="flex items-start gap-3 text-sm text-white/80 font-medium">
            <span className="text-gsrp-orange font-bold mt-0.5">•</span>
            AI-written or copy-pasted appeals will be denied instantly.
          </li>
          <li className="flex items-start gap-3 text-sm text-white/80 font-medium">
            <span className="text-gsrp-orange font-bold mt-0.5">•</span>
            Be honest — staff can see the ban reason on record.
          </li>
        </ul>
      </div>

      <div className="bg-gsrp-dark-card rounded-[2rem] border border-white/20 p-8 shadow-2xl animate-fade-in-up">
        <div className="mb-8">
          <QuestionLabel subtitle="Auto-filled from your Discord account.">Discord username</QuestionLabel>
          <div className="flex items-center gap-4 bg-gsrp-dark-surface border border-gsrp-dark-border rounded-2xl px-5 py-4 shadow-inner">
            {banState?.userImage && (
              <img src={banState.userImage} alt="" className="w-10 h-10 rounded-full border border-white/10 object-cover" />
            )}
            <div className="min-w-0">
              <p className="text-white font-bold text-base truncate">{banState?.username || session.user.name}</p>
              <p className="text-gsrp-teal-light/35 text-[10px] font-mono uppercase tracking-widest">{banState?.userId || session.user.id}</p>
            </div>
            <span className="ml-auto flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gsrp-teal bg-gsrp-teal/10 border border-gsrp-teal/20 px-3 py-1.5 rounded-full">
              <ShieldCheck size={11} /> Verified
            </span>
          </div>
        </div>

        {banState?.banReason && (
          <div className="mb-8 p-5 rounded-2xl bg-red-500/5 border border-red-500/15">
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-red-400 mb-2">
              <ShieldAlert size={12} /> Ban reason on record
            </p>
            <p className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap">{banState.banReason}</p>
          </div>
        )}

        {APPEAL_QUESTIONS.map((q) => (
          <div key={q.id}>
            <QuestionLabel subtitle={q.subtitle} sentences={q.sentences} minimumWords={q.minimumWords}>
              {q.label}
            </QuestionLabel>
            <textarea
              name={q.id}
              required
              rows={6}
              value={answers[q.id] || ''}
              onChange={(e) => setAnswer(q.id, e.target.value)}
              onKeyDown={(e) => {
                if (e.ctrlKey || e.metaKey || e.altKey) return;
                trackEvent(q.id, 'keystroke', e.key);
              }}
              onPaste={(e) => {
                const text = e.clipboardData.getData('text');
                trackEvent(q.id, 'paste', text);
              }}
              onContextMenu={(e) => trackEvent(q.id, 'contextmenu', { x: e.clientX, y: e.clientY })}
              placeholder={q.placeholder}
              className={`w-full bg-gsrp-dark-surface border rounded-2xl px-5 py-4 text-white focus:border-gsrp-orange focus:outline-none transition-all font-medium resize-none mb-8 text-base placeholder:text-white/10 shadow-inner ${validationErrors[q.id] ? 'border-red-500' : 'border-gsrp-dark-border'}`}
            />
            <WordCounter value={answers[q.id]} minimumWords={q.minimumWords} />
            {validationErrors[q.id] && (
              <p className="text-red-400 text-xs font-medium -mt-4 mb-6 ml-2">{validationErrors[q.id]}</p>
            )}
          </div>
        ))}

        <div className="flex flex-col items-end gap-4 mt-6">
          {submitError && (
            <div className="flex items-center gap-2 text-red-400 text-sm font-medium">
              <AlertCircle size={16} />
              {submitError}
            </div>
          )}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-10 py-3 bg-gradient-to-r from-gsrp-orange to-gsrp-warm text-white font-bold rounded-xl shadow-lg shadow-gsrp-orange/20 disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? <><Loader2 className="animate-spin w-5 h-5" /> Submitting...</> : <><Send size={18} /> Submit Ban Appeal</>}
          </button>
        </div>
      </div>
    </PageShell>
  );
}
