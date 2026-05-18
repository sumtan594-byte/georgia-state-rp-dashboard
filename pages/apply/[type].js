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
  ArrowLeft
} from 'lucide-react';
import LoginScreen from '../../components/auth/LoginScreen';
import { hasRole } from '../../lib/auth';

const QuestionLabel = ({ children, required = true, subtitle, sentences = 0 }) => (
  <label className="block mb-3">
    <div className="flex justify-between items-center">
      <span className="text-sm font-black uppercase tracking-widest text-white/90 ml-1">
        {children} {required && <span className="text-gsrp-orange">*</span>}
      </span>
      <span className="flex items-center gap-1 opacity-60 text-[10px] font-bold uppercase tracking-widest text-gsrp-teal-light">
        <Keyboard size={10} /> Monitoring Active
      </span>
    </div>
    {subtitle && <p className="text-xs text-gsrp-teal-light/70 ml-1 mt-1 font-medium">{subtitle}</p>}
    {sentences > 0 && <p className="text-[10px] text-gsrp-orange ml-1 mt-0.5 font-black uppercase tracking-widest">({sentences} Sentences Required)</p>}
  </label>
);

const TextArea = ({ name, placeholder, trackEvent, value, onChange }) => (
  <textarea 
    name={name}
    required 
    rows={5}
    value={value}
    onChange={onChange}
    onKeyDown={(e) => trackEvent(name, 'keystroke', e.key)}
    onPaste={(e) => {
      e.preventDefault();
      const text = e.clipboardData.getData('text');
      trackEvent(name, 'paste', text);
      const target = e.target;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newValue = value.substring(0, start) + text + value.substring(end);
      onChange({ target: { name, value: newValue } });
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + text.length;
      }, 0);
    }}
    onContextMenu={(e) => trackEvent(name, 'contextmenu', { x: e.clientX, y: e.clientY })}
    placeholder={placeholder}
    className="w-full bg-gsrp-dark-surface border border-gsrp-dark-border rounded-2xl px-5 py-4 text-white focus:border-gsrp-orange focus:outline-none transition-all font-medium resize-none mb-8 text-base placeholder:text-white/10 shadow-inner"
  />
);

const Input = ({ name, type = "text", placeholder, trackEvent, required = true, value, onChange }) => (
  <input 
    name={name}
    type={type}
    required={required}
    value={value}
    onChange={onChange}
    onKeyDown={(e) => trackEvent(name, 'keystroke', e.key)}
    onPaste={(e) => {
      e.preventDefault();
      const text = e.clipboardData.getData('text');
      trackEvent(name, 'paste', text);
      const target = e.target;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newValue = value.substring(0, start) + text + value.substring(end);
      onChange({ target: { name, value: newValue } });
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + text.length;
      }, 0);
    }}
    onContextMenu={(e) => trackEvent(name, 'contextmenu', { x: e.clientX, y: e.clientY })}
    placeholder={placeholder}
    className="w-full bg-gsrp-dark-surface border border-gsrp-dark-border rounded-2xl px-5 py-4 text-white focus:border-gsrp-orange focus:outline-none transition-all font-medium mb-8 text-base placeholder:text-white/10 shadow-inner"
  />
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
        <span className="text-xs font-black text-white/40 uppercase tracking-widest">{min}</span>
        <div className="text-center">
          <span className="text-2xl font-black text-gsrp-orange">{value}</span>
          {cueMap[value] && (
            <p className="text-[10px] font-black text-gsrp-orange/60 uppercase tracking-widest mt-1 animate-fade-in">{cueMap[value]}</p>
          )}
        </div>
        <span className="text-xs font-black text-white/40 uppercase tracking-widest">{max}</span>
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

export default function DynamicApplyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { type: typeSlug } = router.query;
  
  const [appType, setAppType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent;
      setUserAgent(ua);
      setOsDetected(detectOS(ua));
    }
  }, []);

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
                { id: 'scen_2', label: 'Scenario: Arrest Button', type: 'textarea', subtitle: 'A police officer is arresting criminals through the "arrest" button. What is this classified as and what will you do in this situation?', sentences: 2, required: true },
                { id: 'scen_3', label: 'Scenario: Sniper', type: 'textarea', subtitle: 'A sniper on a roof is killing people for no reason. What would you do?', sentences: 2, required: true },
                { id: 'scen_4', label: 'Scenario: Stop Sticks', type: 'textarea', subtitle: 'A player is spamming stop sticks. What is this classified as and what would you do?', sentences: 2, required: true },
                { id: 'scen_5', label: 'Scenario: No Response', type: 'textarea', subtitle: 'A player does not respond for more than 2 minutes on a mod call. What is your decision?', sentences: 2, required: true },
                { id: 'scen_6', label: 'Scenario: Threats', type: 'textarea', subtitle: 'A player is threatening to jump off a building, what is this classified as and what would your first instinct be?', sentences: 2, required: true },
                { id: 'scen_7', label: 'Scenario: Swearing', type: 'textarea', subtitle: 'A player is saying swear words bypassing the roblox filter. What is your decision?', sentences: 2, required: true },
                { id: 'scen_8', label: 'Scenario: Exploiting', type: 'textarea', subtitle: 'You see a player exploiting. What would you do?', sentences: 2, required: true },
                { id: 'timezone', label: 'What is your Time zone?', type: 'textarea', required: true },
                { id: 'agree_tiring', label: 'Do you understand that moderation can become tiring and frustrating?', type: 'radio', options: ['Yes I do, and I am ready for it.', 'I don\'t think I can do that'], required: true },
                { id: 'agree_spag', label: 'Do you understand that on shift, you are obliged to use utmost SPaG?', type: 'radio', options: ['I do', 'I cannot do that.'], required: true },
                { id: 'agree_quota', label: 'Do you understand that you Have to meet a 4 hour quota per Week?', type: 'radio', options: ['Yes', 'No'], required: true },
                { id: 'agree_check', label: 'Procced after checking responses?', type: 'radio', options: ['Yes!'], required: true },
                { id: 'questions', label: 'Questions?', type: 'text', subtitle: 'Note, asking for an update on your application will result in an instant denial + Blacklist.', required: true },
                { id: 'agree_no_ask', label: 'Do you agree to not ask anyone when your application will be read?', type: 'radio', options: ['Yes', 'No'], required: true },
                { id: 'melonly', label: 'How familiar are you with melonly?', type: 'radio', options: ['1 (What the hell?)', '2', '3', '4', '5 (Expert)'], required: true },
              ]
            });
          }
          setLoading(false);
        });
    }
  }, [typeSlug]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    const data = {
      type: appType.slug,
      typeName: appType.name,
      username: session.user.name,
      userId: session.user.id,
      userImage: session.user.image,
      answers: answers,
      keystrokeData: keystrokes,
      pasteData: pastes,
      monitoringData: monitoringData,
      sessionTabOuts: sessionTabOuts,
      sessionMouseLeaves: sessionMouseLeaves,
      userAgent: userAgent,
      osDetected: osDetected,
      submittedAt: new Date(),
    };

    try {
      const res = await fetch('/api/applications/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to submit');
      }

      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'loading' || loading) return null;
  if (!session) return <LoginScreen />;
  if (!appType) return <div className="text-center py-20 text-white">Application type not found.</div>;

  if (success) {
    return (
      <div className="max-w-2xl mx-auto py-20 px-4 text-center animate-fade-in-up">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gsrp-teal/10 mb-8 border border-gsrp-teal/20">
          <CheckCircle2 className="w-10 h-10 text-gsrp-teal" />
        </div>
        <h1 className="text-3xl font-black text-white mb-4">Application Sent!</h1>
        <p className="text-gsrp-teal-light text-base mb-8 max-w-md mx-auto">
          Your {appType.name} has been successfully recorded.
        </p>
        <button onClick={() => window.location.href = '/'} className="px-8 py-3 bg-gsrp-orange text-white font-black rounded-xl">Return Home</button>
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
            <h1 className="text-white font-black text-2xl flex items-center gap-4">
              <FileText className="text-gsrp-orange" />
              {appType.name}
            </h1>
            <div className="bg-gsrp-dark-surface px-4 py-1.5 rounded-xl border border-white/10">
              <span className="text-gsrp-orange font-black text-sm">{step} / {totalSteps}</span>
            </div>
          </div>
          <div className="w-full bg-gsrp-dark-surface h-1.5 rounded-full overflow-hidden">
            <div className="h-full bg-gsrp-orange transition-all duration-500" style={{ width: `${(step/totalSteps)*100}%` }} />
          </div>
        </div>
      </div>

      <div className="bg-gsrp-dark-card rounded-[2rem] border border-white/20 p-8 shadow-2xl relative">
        <div className="space-y-2 animate-fade-in-right">
          {currentFields.map((field) => (
            <div key={field.id}>
              <QuestionLabel subtitle={field.subtitle} required={field.required} sentences={field.sentences}>
                {field.label}
              </QuestionLabel>
              
              {field.type === 'textarea' ? (
                <TextArea 
                  name={field.id} 
                  value={answers[field.id] || ''} 
                  trackEvent={trackEvent}
                  onChange={(e) => setAnswers({...answers, [field.id]: e.target.value})}
                />
              ) : field.type === 'radio' ? (
                <RadioGroup 
                  name={field.id} 
                  options={field.options} 
                  value={answers[field.id]} 
                  onChange={(val) => setAnswers({...answers, [field.id]: val})}
                />
              ) : field.type === 'checkbox' ? (
                <CheckboxGroup 
                  name={field.id} 
                  options={field.options} 
                  value={answers[field.id]} 
                  onChange={(val) => setAnswers({...answers, [field.id]: val})}
                />
              ) : field.type === 'slider' ? (
                <Slider 
                  name={field.id} 
                  min={field.min} 
                  max={field.max} 
                  cues={field.cues}
                  value={answers[field.id] || field.min || 0} 
                  onChange={(val) => setAnswers({...answers, [field.id]: val})}
                />
              ) : (
                <Input 
                  name={field.id} 
                  required={field.required}
                  value={answers[field.id] || ''} 
                  trackEvent={trackEvent}
                  onChange={(e) => setAnswers({...answers, [field.id]: e.target.value})}
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-10">
          {step > 1 && (
            <button onClick={() => setStep(step - 1)} className="flex items-center gap-2 px-6 py-3 bg-gsrp-dark-surface text-white font-bold rounded-xl border border-white/5"><ArrowLeft size={18} /> Back</button>
          )}
          <div className="flex-1" />
          {step < totalSteps ? (
            <button onClick={() => setStep(step + 1)} className="flex items-center gap-2 px-8 py-3 bg-gsrp-orange text-white font-black rounded-xl">Next <ArrowRight size={18} /></button>
          ) : (
            <button 
              onClick={handleSubmit} 
              disabled={isSubmitting}
              className="px-10 py-3 bg-gradient-to-r from-gsrp-orange to-gsrp-warm text-white font-black rounded-xl shadow-lg shadow-gsrp-orange/20"
            >
              {isSubmitting ? <Loader2 className="animate-spin" /> : 'Submit Application'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
