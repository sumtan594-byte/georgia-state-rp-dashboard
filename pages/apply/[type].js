import { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { 
  FileText, 
  Send, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Keyboard, 
  ShieldCheck, 
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Save
} from 'lucide-react';
import LoginScreen from '../../components/auth/LoginScreen';
import { hasRole } from '../../lib/auth';
import { PageSkeleton } from '../../components/SkeletonLoader';

function countWords(value) {
  return String(value || '').trim().split(/\s+/).filter(Boolean).length;
}

function getMinimumWords(field) {
  const minimumWords = parseInt(field?.minimumWords, 10);
  return Number.isFinite(minimumWords) && minimumWords > 0 ? minimumWords : 0;
}

function getFieldValidationError(field, answers) {
  if (!field.required) return '';
  const val = answers[field.id];
  const isEmpty = Array.isArray(val) ? val.length === 0 : val === undefined || val === null || val === '';
  if (isEmpty) return 'This field is required';

  if ((field.type === 'textarea' || field.type === 'text') && getMinimumWords(field) > 0 && countWords(val) < getMinimumWords(field)) {
    return 'You have not wrote enough';
  }

  if (field.type === 'textarea' && field.sentences > 0) {
    const sentences = String(val || '').split(/[.!?]+/).filter(s => s.trim().length > 2);
    if (sentences.length < field.sentences) return 'You have not wrote enough';
  }

  return '';
}

function validateFields(fields, answers) {
  const errors = {};
  for (const field of fields) {
    const error = getFieldValidationError(field, answers);
    if (error) errors[field.id] = error;
  }
  return errors;
}

const QuestionLabel = ({ children, required = true, subtitle, sentences = 0, minimumWords = 0 }) => (
  <label className="block mb-3">
    <div className="flex justify-between items-center">
      <span className="text-sm font-bold uppercase tracking-widest text-white/90 ml-1">
        {children} {required && <span className="text-gsrp-orange">*</span>}
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

const TextArea = ({ name, placeholder, trackEvent, value, onChange, error, minimumWords = 0 }) => (
  <>
    <textarea 
      name={name}
      required 
      rows={5}
      value={value}
      onChange={onChange}
      onKeyDown={(e) => {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        trackEvent(name, 'keystroke', e.key);
      }}
      onPaste={(e) => {
        const text = e.clipboardData.getData('text');
        trackEvent(name, 'paste', text);
      }}
      onContextMenu={(e) => trackEvent(name, 'contextmenu', { x: e.clientX, y: e.clientY })}
      placeholder={placeholder}
      className={`w-full bg-gsrp-dark-surface border rounded-2xl px-5 py-4 text-white focus:border-gsrp-orange focus:outline-none transition-all font-medium resize-none mb-8 text-base placeholder:text-white/10 shadow-inner ${error ? 'border-red-500' : 'border-gsrp-dark-border'}`}
    />
    <WordCounter value={value} minimumWords={minimumWords} />
  </>
);

const Input = ({ name, type = "text", placeholder, trackEvent, required = true, value, onChange, error, minimumWords = 0 }) => (
  <>
    <input 
      name={name}
      type={type}
      required={required}
      value={value}
      onChange={onChange}
      onKeyDown={(e) => {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        trackEvent(name, 'keystroke', e.key);
      }}
      onPaste={(e) => {
        const text = e.clipboardData.getData('text');
        trackEvent(name, 'paste', text);
      }}
      onContextMenu={(e) => trackEvent(name, 'contextmenu', { x: e.clientX, y: e.clientY })}
      placeholder={placeholder}
      className={`w-full bg-gsrp-dark-surface border rounded-2xl px-5 py-4 text-white focus:border-gsrp-orange focus:outline-none transition-all font-medium mb-8 text-base placeholder:text-white/10 shadow-inner ${error ? 'border-red-500' : 'border-gsrp-dark-border'}`}
    />
    <WordCounter value={value} minimumWords={minimumWords} />
  </>
);

const RadioGroup = ({ name, options = ['Yes', 'No'], value, onChange }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
    {options.map((opt, i) => (
      <label key={i} className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all border-2 ${value === opt ? 'bg-gsrp-orange/10 border-gsrp-orange shadow-lg shadow-gsrp-orange/5' : 'bg-gsrp-dark-surface/50 border-gsrp-dark-border/50 hover:bg-gsrp-dark-surface hover:border-gsrp-dark-border'} group`}>
        <input type="radio" name={name} value={opt} checked={value === opt} onChange={() => onChange(opt)} className="accent-gsrp-orange w-5 h-5" />
        <span className={`text-sm font-bold ${value === opt ? 'text-white' : 'text-gsrp-teal-light/70 group-hover:text-white'} transition-colors`}>{opt}</span>
      </label>
    ))}
  </div>
);

const CheckboxGroup = ({ name, options = [], value = [], onChange }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
    {options.map((opt, i) => {
      const isChecked = Array.isArray(value) && value.includes(opt);
      return (
        <label key={i} className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all border-2 ${isChecked ? 'bg-gsrp-orange/10 border-gsrp-orange shadow-lg shadow-gsrp-orange/5' : 'bg-gsrp-dark-surface/50 border-gsrp-dark-border/50 hover:bg-gsrp-dark-surface hover:border-gsrp-dark-border'} group`}>
          <input 
            type="checkbox" 
            name={name} 
            value={opt} 
            checked={isChecked} 
            onChange={() => {
              const newValue = isChecked ? value.filter(v => v !== opt) : [...(Array.isArray(value) ? value : []), opt];
              onChange(newValue);
            }} 
            className="accent-gsrp-orange w-5 h-5 rounded" 
          />
          <span className={`text-sm font-bold ${isChecked ? 'text-white' : 'text-gsrp-teal-light/70 group-hover:text-white'} transition-colors`}>{opt}</span>
        </label>
      );
    })}
  </div>
);

const Slider = ({ name, min = 0, max = 10, value = min, onChange, cues = "" }) => {
  const cueMap = cues.split(',').reduce((acc, curr) => {
    const [val, label] = curr.split(':').map(s => s.trim());
    if (val && label) acc[val] = label;
    return acc;
  }, {});

  return (
    <div className="mb-8 p-6 bg-gsrp-dark-surface/50 border border-gsrp-dark-border/50 rounded-2xl">
      <div className="flex justify-between items-center mb-4">
        <span className="text-xs font-bold text-white/40 uppercase tracking-widest">{min}</span>
        <div className="text-center">
          <span className="text-2xl font-bold text-gsrp-orange">{value}</span>
          {cueMap[value] && (
            <p className="text-[10px] font-bold text-gsrp-orange/60 uppercase tracking-widest mt-1 animate-fade-in">{cueMap[value]}</p>
          )}
        </div>
        <span className="text-xs font-bold text-white/40 uppercase tracking-widest">{max}</span>
      </div>
      <input 
        type="range" 
        min={min} 
        max={max} 
        value={value} 
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full accent-gsrp-orange h-2 bg-gsrp-dark-border rounded-lg appearance-none cursor-pointer"
      />
    </div>
  );
};

function detectOS(userAgent) {
  if (/Macintosh|MacIntel|MacPPC|Mac68K/i.test(userAgent)) return 'mac';
  if (/Windows|Win32|Win64|WOW64/i.test(userAgent)) return 'windows';
  return 'other';
}

function isMobileDevice() {
  if (typeof window === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
    || (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
}

const DRAFT_KEY_PREFIX = 'gsrp_app_draft_';
const AUTO_SAVE_INTERVAL = 5000;

function getDraftKey(userId, typeSlug) {
  return `${DRAFT_KEY_PREFIX}${userId}_${typeSlug}`;
}

function loadDraft(userId, typeSlug) {
  try {
    const key = getDraftKey(userId, typeSlug);
    const raw = localStorage.getItem(key);
    if (!raw) { console.log('[Draft] loadDraft: no data for', key); return null; }
    const draft = JSON.parse(raw);
    if (draft.expiresAt && Date.now() > draft.expiresAt) {
      console.log('[Draft] loadDraft: expired, removing', key);
      localStorage.removeItem(key);
      return null;
    }
    console.log('[Draft] loadDraft: restored', Object.keys(draft.answers || {}).length, 'fields from', key);
    return draft;
  } catch (e) {
    console.error('[Draft] loadDraft error:', e);
    return null;
  }
}

function saveDraft(userId, typeSlug, answers) {
  try {
    const key = getDraftKey(userId, typeSlug);
    const draft = {
      answers,
      savedAt: Date.now(),
      expiresAt: Date.now() + 5 * 60 * 60 * 1000,
    };
    localStorage.setItem(key, JSON.stringify(draft));
    console.log('[Draft] saveDraft: saved', Object.keys(answers).length, 'fields to', key);
  } catch (e) {
    console.error('[Draft] saveDraft error:', e);
  }
}

function clearDraft(userId, typeSlug) {
  try {
    const key = getDraftKey(userId, typeSlug);
    const before = localStorage.getItem(key);
    localStorage.removeItem(key);
    console.log('[Draft] clearDraft: removed', key, '| existed:', !!before);
  } catch (e) {
    console.error('[Draft] clearDraft error:', e);
  }
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

export default function DynamicApplyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { type: typeSlug } = router.query;
  
  const [appType, setAppType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [draftRestored, setDraftRestored] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const submitSuccessRef = useRef(false);
  const [timezoneBlocked, setTimezoneBlocked] = useState(false);
  const [checkingTimezone, setCheckingTimezone] = useState(true);

  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState({});
  const [keystrokes, setKeystrokes] = useState({});
  const [pastes, setPastes] = useState({});
  const [monitoringData, setMonitoringData] = useState({});
  const [sessionTabOuts, setSessionTabOuts] = useState([]);
  const [sessionMouseLeaves, setSessionMouseLeaves] = useState([]);
  const [userAgent, setUserAgent] = useState('');
  const [osDetected, setOsDetected] = useState('other');

  const activeFieldRef = useRef(null);
  const tabOutStartRef = useRef(null);
  const sessionTabOutStartRef = useRef(null);
  const mouseLeaveStartRef = useRef(null);
  const idleTimerRef = useRef(null);
  const wpmWindowsRef = useRef({});
  const lastKeystrokeTimeRef = useRef({});
  const monitoringInitializedRef = useRef(false);
  const answersRef = useRef({});
  const keystrokesRef = useRef({});
  const pastesRef = useRef({});
  const monitoringDataRef = useRef({});
  const sessionTabOutsRef = useRef([]);
  const sessionMouseLeavesRef = useRef([]);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    keystrokesRef.current = keystrokes;
  }, [keystrokes]);

  useEffect(() => {
    pastesRef.current = pastes;
  }, [pastes]);

  useEffect(() => {
    monitoringDataRef.current = monitoringData;
  }, [monitoringData]);

  useEffect(() => {
    sessionTabOutsRef.current = sessionTabOuts;
  }, [sessionTabOuts]);

  useEffect(() => {
    sessionMouseLeavesRef.current = sessionMouseLeaves;
  }, [sessionMouseLeaves]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent;
      setUserAgent(ua);
      setOsDetected(detectOS(ua));
    }
  }, []);

  useEffect(() => {
    if (!session || !typeSlug || !appType) return;
    const draft = loadDraft(session.user.id, typeSlug);
    if (draft && draft.answers && Object.keys(draft.answers).length > 0) {
      console.log('[Application] Draft restored:', Object.keys(draft.answers).length, 'fields');
      answersRef.current = draft.answers;
      setAnswers(draft.answers);
      setKeystrokes({});
      keystrokesRef.current = {};
      setPastes({});
      pastesRef.current = {};
      setMonitoringData({});
      monitoringDataRef.current = {};
      setSessionTabOuts([]);
      sessionTabOutsRef.current = [];
      setSessionMouseLeaves([]);
      sessionMouseLeavesRef.current = [];
      setDraftRestored(true);
      setValidationErrors({});
      setStep(1);
      setTimeout(() => setDraftRestored(false), 4000);
    }
  }, [session, typeSlug, appType]);

  useEffect(() => {
    submitSuccessRef.current = success;
  }, [success]);

  useEffect(() => {
    if (!session || !typeSlug || success) return;
    const interval = setInterval(() => {
      if (Object.keys(answersRef.current).length > 0 && !submitSuccessRef.current) {
        saveDraft(session.user.id, typeSlug, answersRef.current);
      }
    }, AUTO_SAVE_INTERVAL);
    return () => clearInterval(interval);
  }, [session, typeSlug, success]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (Object.keys(answers).length > 0 && !success && !isSubmitting) {
        if (session && typeSlug) {
          saveDraft(session.user.id, typeSlug, answers);
        }
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [answers, success, isSubmitting, session, typeSlug]);

  const getMonitoringForField = useCallback((fieldName) => {
    return monitoringData[fieldName] || {
      tabOuts: [],
      rightClicks: [],
      wpmSpikes: [],
      idlePeriods: [],
    };
  }, [monitoringData]);

  const updateMonitoringForField = useCallback((fieldName, updater) => {
    setMonitoringData(prev => {
      const current = prev[fieldName] || { tabOuts: [], rightClicks: [], wpmSpikes: [], idlePeriods: [] };
      return { ...prev, [fieldName]: updater(current) };
    });
  }, []);

  const checkWPMAnomaly = useCallback((fieldName) => {
    const now = Date.now();
    if (!wpmWindowsRef.current[fieldName]) {
      wpmWindowsRef.current[fieldName] = [];
    }
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
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
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

  const trackEvent = useCallback((fieldName, type, data) => {
    if (type === 'keystroke') {
      setKeystrokes(prev => {
        const field = prev[fieldName] || [];
        return { ...prev, [fieldName]: [...field, { timestamp: Date.now(), key: data }] };
      });
      resetIdleTimer(fieldName);
      checkWPMAnomaly(fieldName);
    } else if (type === 'paste') {
      setPastes(prev => {
        const field = prev[fieldName] || [];
        return { ...prev, [fieldName]: [...field, {
          timestamp: Date.now(),
          content: data,
          charCount: data.length,
          cursorPosition: activeFieldRef.current === fieldName ? (document.querySelector(`[name="${fieldName}"]`)?.selectionStart || 0) : 0,
        }] };
      });
      resetIdleTimer(fieldName);
    } else if (type === 'contextmenu') {
      updateMonitoringForField(fieldName, (current) => ({
        ...current,
        rightClicks: [...current.rightClicks, {
          timestamp: Date.now(),
          x: data.x,
          y: data.y,
        }],
      }));
    }
  }, [resetIdleTimer, checkWPMAnomaly, updateMonitoringForField]);

  useEffect(() => {
    if (monitoringInitializedRef.current) return;
    monitoringInitializedRef.current = true;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        tabOutStartRef.current = Date.now();
        sessionTabOutStartRef.current = Date.now();
      } else {
        const leftAt = tabOutStartRef.current;
        if (leftAt) {
          const duration = Math.round((Date.now() - leftAt) / 1000);
          const activeField = activeFieldRef.current;
          if (activeField) {
            updateMonitoringForField(activeField, (current) => ({
              ...current,
              tabOuts: [...current.tabOuts, {
                leftAt,
                returnedAt: Date.now(),
                duration,
                questionLabel: activeField,
              }],
            }));
          }
          setSessionTabOuts(prev => [...prev, {
            leftAt,
            returnedAt: Date.now(),
            duration,
            activeField,
          }]);
          tabOutStartRef.current = null;
        }
        const sessionLeftAt = sessionTabOutStartRef.current;
        if (sessionLeftAt) {
          sessionTabOutStartRef.current = null;
        }
      }
    };

    const handleWindowBlur = () => {
      if (!document.hidden && !tabOutStartRef.current) {
        tabOutStartRef.current = Date.now();
        sessionTabOutStartRef.current = Date.now();
      }
    };

    const handleWindowFocus = () => {
      const leftAt = tabOutStartRef.current;
      if (leftAt) {
        const duration = Math.round((Date.now() - leftAt) / 1000);
        const activeField = activeFieldRef.current;
        if (activeField) {
          updateMonitoringForField(activeField, (current) => ({
            ...current,
            tabOuts: [...current.tabOuts, {
              leftAt,
              returnedAt: Date.now(),
              duration,
              questionLabel: activeField,
            }],
          }));
        }
        setSessionTabOuts(prev => [...prev, {
          leftAt,
          returnedAt: Date.now(),
          duration,
          activeField,
        }]);
        tabOutStartRef.current = null;
      }
      const sessionLeftAt = sessionTabOutStartRef.current;
      if (sessionLeftAt) {
        sessionTabOutStartRef.current = null;
      }
    };

    const handleMouseLeave = () => {
      mouseLeaveStartRef.current = Date.now();
    };

    const handleMouseEnter = () => {
      const leftAt = mouseLeaveStartRef.current;
      if (leftAt) {
        const duration = Math.round((Date.now() - leftAt) / 1000);
        setSessionMouseLeaves(prev => [...prev, {
          leftAt,
          returnedAt: Date.now(),
          duration,
        }]);
        mouseLeaveStartRef.current = null;
      }
    };

    const handleFieldFocus = (e) => {
      const name = e.target.name;
      if (name) {
        activeFieldRef.current = name;
      }
    };

    const handleFieldBlur = (e) => {
      if (activeFieldRef.current === e.target.name) {
        activeFieldRef.current = null;
      }
    };

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

  useEffect(() => {
    if (typeSlug) {
      fetch(`/api/applications/types`)
        .then(r => r.json())
        .then(data => {
          if (!Array.isArray(data)) return;
          const type = data.find(t => t.slug === typeSlug);
          if (type) {
            if (type.requiredRole && (!Array.isArray(type.requiredRole) || type.requiredRole.length > 0)) {
              const required = Array.isArray(type.requiredRole) ? type.requiredRole : [type.requiredRole];
              if (!required.some(roleId => hasRole(session, roleId))) {
                router.push('/apply');
                return;
              }
            }
            setAppType(type);
          } else if (typeSlug === 'staff') {
            setAppType({
              name: 'Staff Application',
              slug: 'staff',
              fields: [
                { id: 'roblox_user', label: 'Roblox username', type: 'text', subtitle: 'Username, not display name.', required: true },
                { id: 'pd_rank', label: 'In game PD rank?', type: 'text', subtitle: 'What rank are you in game (e.g. Major, Commander etc.)', required: true },
                { id: 'rdm', label: 'What is RDM?', type: 'textarea', subtitle: 'Elaborate, What is RDM? What may be a valid punishment for offenders?', sentences: 2, required: true },
                { id: 'vdm', label: 'What is VDM?', type: 'textarea', subtitle: 'Elaborate, What is VDM? What may be a valid punishment for offenders?', sentences: 2, required: true },
                { id: 'frp', label: 'What is FRP?', type: 'textarea', subtitle: 'Elaborate, What is FRP? What may be a valid punishment for offenders?', sentences: 2, required: true },
                { id: 'ltap', label: 'What is LTAP?', type: 'textarea', subtitle: 'Elaborate, What is LTAP? What may be a valid punishment for offenders?', sentences: 2, required: true },
                { id: 'scen_1', label: 'Scenario: Spawn Shooting', type: 'textarea', subtitle: 'A player is shooting inside civilian spawn, which is a safezone. What would you do to this player?', sentences: 2, required: true },
                { id: 'scen_2', label: 'Scenario: Arrest Button', type: 'textarea', subtitle: 'A police officer is arresting people through the "arrest" button. What is this classified as and what will you do in this situation?', sentences: 2, required: true },
                { id: 'scen_3', label: 'Scenario: Sniper', type: 'textarea', subtitle: 'A sniper on a roof is killing people for no reason. What would you do?', sentences: 2, required: true },
                { id: 'scen_4', label: 'Scenario: Stop Sticks', type: 'textarea', subtitle: 'A player is spamming stop sticks. What is this classified as and what would you do?', sentences: 2, required: true },
                { id: 'scen_5', label: 'Scenario: No Response', type: 'textarea', subtitle: 'A player does not respond for more than 2 minutes on a mod call. What is your decision?', sentences: 2, required: true },
                { id: 'scen_6', label: 'Scenario: Threats', type: 'textarea', subtitle: 'A player is threatening to jump off a building, what is this classified as and what would your first instinct be?', sentences: 2, required: true },
                { id: 'scen_7', label: 'Scenario: Swearing', type: 'textarea', subtitle: 'A player is saying swear words bypassing the roblox filter. What is your decision?', sentences: 2, required: true },
                { id: 'scen_8', label: 'Scenario: Exploiting', type: 'textarea', subtitle: 'You see a player exploiting. What would you do?', sentences: 2, required: true },

                { id: 'agree_tiring', label: 'Do you understand that moderation can become tiring and frustrating?', type: 'radio', options: ['Yes I do, and I am ready for it.', 'I don\'t think I can do that'], required: true },
                { id: 'agree_spag', label: 'Do you understand that on shift, you are obliged to use utmost SPaG?', type: 'radio', options: ['I do', 'I cannot do that.'], required: true },
                { id: 'agree_quota', label: 'Do you understand that you Have to meet a 4 hour quota per Week?', type: 'radio', options: ['Yes', 'No'], required: true },
                { id: 'agree_check', label: 'Proceed after checking responses?', type: 'radio', options: ['Yes!'], required: true },
                { id: 'questions', label: 'Questions?', type: 'text', subtitle: 'Note, asking for an update on your application will result in an instant denial + Blacklist.', required: true },
                { id: 'agree_no_ask', label: 'Do you agree to not ask anyone when your application will be read?', type: 'radio', options: ['Yes', 'No'], required: true },
                { id: 'melonly', label: 'How familiar are you with melonly?', type: 'radio', options: ['1 (What the hell?)', '2', '3', '4', '5 (Expert)'], required: true },
              ]
            });
          }
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, [typeSlug]);

  useEffect(() => {
    if (!typeSlug || !session) return;
    const browserTz = (() => {
      try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (_) { return ''; }
    })();
    console.log('[TimezoneCheck] Browser timezone:', browserTz);
    fetch(`/api/applications/check-timezone?type=${typeSlug}`, {
      headers: { 'x-timezone': browserTz }
    })
      .then(r => r.json())
      .then(data => {
        console.log('[TimezoneCheck] Server response:', data);
        if (data.blocked) {
          setTimezoneBlocked(true);
        }
        setCheckingTimezone(false);
      })
      .catch(err => {
        console.error('[TimezoneCheck] Error:', err.message);
        setCheckingTimezone(false);
      });
  }, [typeSlug, session]);

  const handleNextStep = () => {
    const fieldChunks = [];
    for (let i = 0; i < appType.fields.length; i += 4) {
      fieldChunks.push(appType.fields.slice(i, i + 4));
    }
    const currentFields = fieldChunks[step - 1] || [];
    const currentAnswers = answersRef.current;
    const errors = validateFields(currentFields, currentAnswers);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(prev => ({ ...prev, ...errors }));
      return;
    }
    setValidationErrors({});
    setStep(step + 1);
  };

  const handleSubmit = async () => {
    setError(null);
    console.log('[Application] Submit started');

    const fieldErrors = validateFields(appType.fields, answersRef.current);
    const missing = Object.keys(fieldErrors);
    if (missing.length > 0) {
      const fieldLabels = missing.map(id => {
        const f = appType.fields.find(x => x.id === id);
        return f ? f.label : id;
      });
      console.warn('[Application] Validation failed:', fieldLabels.join(', '));
      setError(`Please complete all required fields: ${fieldLabels.join(', ')}`);
      const firstMissing = missing[0];
      for (let s = 1; s <= fieldChunks.length; s++) {
        const chunkFields = fieldChunks[s - 1];
        if (chunkFields.some(f => f.id === firstMissing)) {
          setStep(s);
          break;
        }
      }
      setValidationErrors(prev => {
        const next = { ...prev };
        missing.forEach(id => { next[id] = fieldErrors[id]; });
        return next;
      });
      return;
    }

    setIsSubmitting(true);
    setValidationErrors({});
    console.log('[Application] All fields valid, sending to server...');

    function truncateArrays(obj, maxLen = 50) {
      if (!obj || typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) return obj.slice(-maxLen);
      const result = {};
      for (const [k, v] of Object.entries(obj)) {
        result[k] = truncateArrays(v, maxLen);
      }
      return result;
    }

    const data = {
      type: appType.slug,
      typeName: appType.name,
      username: session.user.name,
      userId: session.user.id,
      userImage: session.user.image,
      answers: answersRef.current,
      keystrokeData: truncateArrays(keystrokesRef.current, 5000),
      pasteData: truncateArrays(pastesRef.current, 100),
      monitoringData: truncateArrays(monitoringDataRef.current, 20),
      sessionTabOuts: Array.isArray(sessionTabOutsRef.current) ? sessionTabOutsRef.current.slice(-50) : [],
      sessionMouseLeaves: Array.isArray(sessionMouseLeavesRef.current) ? sessionMouseLeavesRef.current.slice(-50) : [],
      userAgent: userAgent,
      osDetected: osDetected,
      submittedAt: new Date(),
    };

    let bodyStr;
    try {
      bodyStr = JSON.stringify(data);
    } catch (serializeErr) {
      console.error('[Application] JSON.stringify failed:', serializeErr.message);
      setError('Failed to prepare application data. Please try again.');
      setIsSubmitting(false);
      return;
    }

    if (!bodyStr || bodyStr === '{}' || bodyStr === '[]') {
      console.error('[Application] Serialized body is empty or trivial');
      setError('Application data is empty. Please fill in the fields.');
      setIsSubmitting(false);
      return;
    }

    let lastError = null;
    const maxRetries = 1;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Application] Submit attempt ${attempt + 1}/${maxRetries + 1}`, 'body length:', bodyStr.length);
        const res = await fetchWithTimeout('/api/applications/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: bodyStr,
        }, 30000);

        if (!res.ok) {
          const err = await res.json();
          console.error('[Application] Server error:', res.status, err.message);
          throw new Error(err.message || 'Failed to submit');
        }

        const result = await res.json();
        console.log('[Application] Submit successful, ID:', result.id);
        submitSuccessRef.current = true;
        answersRef.current = {};
        if (session && typeSlug) {
          clearDraft(session.user.id, typeSlug);
        }
        setSuccess(true);
        return;
      } catch (err) {
        lastError = err;
        if (err.name === 'AbortError') {
          console.error('[Application] Request timed out on attempt', attempt + 1);
          lastError = new Error('Request timed out. Please check your connection and try again.');
        } else {
          console.error('[Application] Error on attempt', attempt + 1, ':', err.message);
        }
        if (attempt < maxRetries) {
          const delay = 1500 * (attempt + 1);
          console.log('[Application] Retrying in', delay, 'ms...');
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }

    console.error('[Application] All attempts failed');
    setError(lastError?.message || 'Failed to submit application. Please try again.');
    setIsSubmitting(false);
  };

  if (timezoneBlocked) {
    return (
      <div className="max-w-2xl mx-auto py-24 px-6 text-center animate-fade-in-up">
        <div className="bg-gsrp-dark-card border border-gsrp-orange/20 rounded-3xl p-10">
          <div className="w-16 h-16 rounded-full bg-gsrp-orange/10 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-gsrp-orange" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">We Appreciate Your Interest!</h1>
          <p className="text-white/70 text-base leading-relaxed max-w-lg mx-auto">
            We truly appreciate your interest in joining our staff team! Unfortunately, we've reached capacity for staff from USA timezones at this time. We're incredibly sorry for the inconvenience — please feel free to reapply in the future if our needs change. Thank you for understanding!
          </p>
        </div>
      </div>
    );
  }

  if (status === 'loading' || loading || checkingTimezone) {
    return <PageSkeleton variant="form" />;
  }
  if (!session) return <LoginScreen />;
  if (!appType) return <div className="text-center py-20 text-white">Application type not found.</div>;

  const blacklistedRoles = Array.isArray(appType.blacklistedRole)
    ? appType.blacklistedRole
    : (appType.blacklistedRole ? [appType.blacklistedRole] : []);

  const isBlacklisted = blacklistedRoles.some(roleId => hasRole(session, roleId));

  if (isBlacklisted) {
    return (
      <div className="max-w-2xl mx-auto py-24 px-6 text-center animate-fade-in-up">
        <div className="bg-gsrp-dark-card border border-red-500/20 rounded-3xl p-10">
          <h1 className="text-3xl font-bold text-white mb-4">You are blacklisted from this application</h1>
          <p className="text-white/50 text-sm leading-relaxed">
            Your current Discord roles prevent access to this application form.
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto py-20 px-4 text-center animate-fade-in-up">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gsrp-teal/10 mb-8 border border-gsrp-teal/20">
          <CheckCircle2 className="w-10 h-10 text-gsrp-teal" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-4">Application Sent!</h1>
        <p className="text-gsrp-teal-light text-base mb-8 max-w-md mx-auto">
          Your {appType.name} has been successfully submitted and is being reviewed.
        </p>
        <button onClick={() => window.location.href = '/'} className="px-8 py-3 bg-gsrp-orange text-white font-bold rounded-xl">Return Home</button>
      </div>
    );
  }

  const fieldChunks = [];
  for (let i = 0; i < appType.fields.length; i += 4) {
    fieldChunks.push(appType.fields.slice(i, i + 4));
  }
  const currentFields = fieldChunks[step - 1] || [];
  const totalSteps = fieldChunks.length;

  return (
    <div className="max-w-3xl mx-auto animate-fade-in-up pb-24 px-6">
      <Head><title>Apply: {appType.name}</title></Head>

      <div className="mb-8 p-8 rounded-3xl bg-card-gradient border border-white/10 relative overflow-hidden group shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-gsrp-orange/10 to-gsrp-teal/10 opacity-50" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-white font-bold text-2xl flex items-center gap-4">
              <FileText className="text-gsrp-orange" />
              {appType.name}
            </h1>
            <div className="bg-gsrp-dark-surface px-4 py-1.5 rounded-xl border border-white/10">
              <span className="text-gsrp-orange font-bold text-sm">{step} / {totalSteps}</span>
            </div>
          </div>
          <div className="w-full bg-gsrp-dark-surface h-1.5 rounded-full overflow-hidden">
            <div className="h-full bg-gsrp-orange transition-all duration-500" style={{ width: `${(step/totalSteps)*100}%` }} />
          </div>
        </div>
      </div>

      {step === 1 && (
        <div className="mb-6 p-6 rounded-2xl bg-gsrp-orange/10 border border-gsrp-orange/30 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-5 h-5 text-gsrp-orange flex-shrink-0" />
            <h2 className="text-white font-bold text-sm uppercase tracking-widest">Before You Begin — Important</h2>
          </div>
          <ul className="space-y-2 ml-1">
            <li className="flex items-start gap-3 text-sm text-white/80 font-medium">
              <span className="text-gsrp-orange font-bold mt-0.5">•</span>
              AI usage will result in an immediate blacklist for life.
            </li>
            <li className="flex items-start gap-3 text-sm text-white/80 font-medium">
              <span className="text-gsrp-orange font-bold mt-0.5">•</span>
              Asking when your application will be read will lead to it being declined.
            </li>
            <li className="flex items-start gap-3 text-sm text-white/80 font-medium">
              <span className="text-gsrp-orange font-bold mt-0.5">•</span>
              Make sure to use at least 2 or more proper sentences.
            </li>
          </ul>
        </div>
      )}

      {draftRestored && (
        <div className="mb-6 p-4 rounded-2xl bg-gsrp-teal/10 border border-gsrp-teal/20 flex items-center gap-3 animate-fade-in-up">
          <Save className="w-5 h-5 text-gsrp-teal flex-shrink-0" />
          <p className="text-gsrp-teal-light text-sm font-medium">Draft restored from your last session.</p>
        </div>
      )}

      {lastSaved && !success && (
        <div className="mb-4 text-right">
          <span className="text-xs text-white/30 font-medium">Last saved: {lastSaved.toLocaleTimeString()}</span>
        </div>
      )}

      <div className="bg-gsrp-dark-card rounded-[2rem] border border-white/20 p-8 shadow-2xl relative">
        <div className="space-y-2 animate-fade-in-right">
          {currentFields.map((field) => (
            <div key={field.id}>
              <QuestionLabel subtitle={field.subtitle} required={field.required} sentences={field.sentences} minimumWords={getMinimumWords(field)}>
                {field.label}
              </QuestionLabel>
              
              {field.type === 'textarea' ? (
                <TextArea 
                  name={field.id} 
                  value={answers[field.id] || ''} 
                  trackEvent={trackEvent}
                  minimumWords={getMinimumWords(field)}
                  onChange={(e) => {
                    const val = e.target.value;
                    answersRef.current = { ...answersRef.current, [field.id]: val };
                    setAnswers(answersRef.current);
                    if (validationErrors[field.id]) {
                      setValidationErrors(prev => {
                        const next = { ...prev };
                        delete next[field.id];
                        return next;
                      });
                    }
                  }}
                  error={validationErrors[field.id]}
                />
              ) : field.type === 'radio' ? (
                <RadioGroup 
                  name={field.id} 
                  options={field.options} 
                  value={answers[field.id]} 
                  onChange={(val) => {
                    answersRef.current = { ...answersRef.current, [field.id]: val };
                    setAnswers(answersRef.current);
                    if (validationErrors[field.id]) {
                      setValidationErrors(prev => {
                        const next = { ...prev };
                        delete next[field.id];
                        return next;
                      });
                    }
                  }}
                />
              ) : field.type === 'checkbox' ? (
                <CheckboxGroup 
                  name={field.id} 
                  options={field.options} 
                  value={answers[field.id]} 
                  onChange={(val) => {
                    answersRef.current = { ...answersRef.current, [field.id]: val };
                    setAnswers(answersRef.current);
                    if (validationErrors[field.id]) {
                      setValidationErrors(prev => {
                        const next = { ...prev };
                        delete next[field.id];
                        return next;
                      });
                    }
                  }}
                />
              ) : field.type === 'slider' ? (
                <Slider 
                  name={field.id} 
                  min={field.min} 
                  max={field.max} 
                  cues={field.cues}
                  value={answers[field.id] || field.min || 0} 
                  onChange={(val) => {
                    answersRef.current = { ...answersRef.current, [field.id]: val };
                    setAnswers(answersRef.current);
                  }}
                />
              ) : (
                <Input 
                  name={field.id} 
                  required={field.required}
                  value={answers[field.id] || ''} 
                  trackEvent={trackEvent}
                  minimumWords={getMinimumWords(field)}
                  onChange={(e) => {
                    const val = e.target.value;
                    answersRef.current = { ...answersRef.current, [field.id]: val };
                    setAnswers(answersRef.current);
                    if (validationErrors[field.id]) {
                      setValidationErrors(prev => {
                        const next = { ...prev };
                        delete next[field.id];
                        return next;
                      });
                    }
                  }}
                  error={validationErrors[field.id]}
                />
              )}
              {validationErrors[field.id] && (
                <p className="text-red-400 text-xs font-medium -mt-6 mb-6 ml-2">{validationErrors[field.id]}</p>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-10">
          {step > 1 && (
            <button onClick={() => { setValidationErrors({}); setStep(step - 1); }} className="flex items-center gap-2 px-6 py-3 bg-gsrp-dark-surface text-white font-bold rounded-xl border border-white/5"><ArrowLeft size={18} /> Back</button>
          )}
          <div className="flex-1" />
          {step < totalSteps ? (
            <button onClick={handleNextStep} className="flex items-center gap-2 px-8 py-3 bg-gsrp-orange text-white font-bold rounded-xl">Next <ArrowRight size={18} /></button>
          ) : (
            <div className="flex flex-col items-end gap-4">
              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm font-medium">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}
              <button 
                onClick={handleSubmit} 
                disabled={isSubmitting}
                className="px-10 py-3 bg-gradient-to-r from-gsrp-orange to-gsrp-warm text-white font-bold rounded-xl shadow-lg shadow-gsrp-orange/20 disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? <><Loader2 className="animate-spin w-5 h-5" /> Submitting...</> : <><Send size={18} /> Submit Application</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
