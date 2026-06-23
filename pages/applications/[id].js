import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { createPortal } from 'react-dom';
import { 
  FileText, 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Clock, 
  MousePointer2, 
  Loader2, 
  AlertCircle,
  Shield,
  Zap,
  Eye,
  AlertTriangle,
  Timer,
  Mouse,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Trash2,
  Clipboard,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { canReviewApplications } from '../../lib/auth';
import { useRefreshedUser } from '../../lib/UserRefreshContext';
import LoginScreen from '../../components/auth/LoginScreen';
import AccessDenied from '../../components/auth/AccessDenied';

const TAB_OUT_THRESHOLD = 3;

const PasteDetector = ({ pastes }) => {
  if (!pastes || pastes.length === 0) return null;

  return (
    <div className="mt-4 p-4 bg-black/40 rounded-2xl border border-white/5 overflow-hidden">
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle size={14} className="text-amber-500/60" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500/60">
          Paste Events Detected ({pastes.length})
        </span>
      </div>
      <div className="space-y-2">
        {pastes.map((p, i) => (
          <div key={i} className="flex items-start gap-2 text-[11px] text-amber-400/70 bg-amber-500/5 px-3 py-2 rounded-lg border border-amber-500/10">
            <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-[9px] text-amber-500/40">#{i + 1}</span>
                <span className="font-bold text-amber-400">{p.content.length} chars</span>
                <span className="text-amber-500/40">at {new Date(p.timestamp).toLocaleTimeString()}</span>
              </div>
              {p.content.length > 0 && (
                <p className="text-[10px] text-amber-300/50 line-clamp-2 font-mono break-all bg-amber-500/5 p-2 rounded border border-amber-500/5">
                  {p.content.length > 100 ? p.content.slice(0, 100) + '...' : p.content}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const formatTime = (ts) => {
  if (!ts) return '--:--';
  const d = new Date(ts);
  return d.toLocaleTimeString([], { minute: '2-digit', second: '2-digit' });
};

const formatDuration = (seconds) => {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
};

const IntegrityScoreCard = ({ application }) => {
  const totalPastes = Object.values(application.pasteData || {}).reduce((sum, arr) => sum + arr.length, 0);
  const totalTabOuts = (application.sessionTabOuts || []).length;
  const totalTabOutTime = (application.sessionTabOuts || []).reduce((sum, t) => sum + (t.duration || 0), 0);
  const totalRightClicks = Object.values(application.monitoringData || {}).reduce((sum, m) => sum + (m.rightClicks?.length || 0), 0);
  const totalWpmSpikes = Object.values(application.monitoringData || {}).reduce((sum, m) => sum + (m.wpmSpikes?.length || 0), 0);
  const totalIdlePeriods = Object.values(application.monitoringData || {}).reduce((sum, m) => sum + (m.idlePeriods?.length || 0), 0);
  const totalMouseLeaves = (application.sessionMouseLeaves || []).length;

  let score = 100;
  score -= totalPastes * 12;
  score -= Math.min(totalTabOuts * 8, 40);
  score -= Math.min(totalTabOutTime * 0.5, 15);
  score -= totalRightClicks * 5;
  score -= totalWpmSpikes * 10;
  score -= totalIdlePeriods * 5;
  score -= totalMouseLeaves * 3;
  score = Math.max(0, Math.min(100, score));

  let grade, color, icon;
  if (score >= 80) {
    grade = 'HIGH'; color = 'text-green-500'; icon = <ShieldCheck size={18} className="text-green-500" />;
  } else if (score >= 50) {
    grade = 'MEDIUM'; color = 'text-amber-500'; icon = <ShieldAlert size={18} className="text-amber-500" />;
  } else {
    grade = 'LOW'; color = 'text-red-500'; icon = <ShieldX size={18} className="text-red-500" />;
  }

  return (
    <div className="bg-gsrp-dark-card/60 backdrop-blur-md rounded-2xl border border-gsrp-dark-border/50 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-white font-bold text-xs uppercase tracking-widest flex items-center gap-2">
          <Shield size={14} className="text-gsrp-orange" />
          Session Integrity
        </h3>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
          score >= 80 ? 'bg-green-500/10 border-green-500/20' :
          score >= 50 ? 'bg-amber-500/10 border-amber-500/20' :
          'bg-red-500/10 border-red-500/20'
        }`}>
          {icon}
          <span className={`text-sm font-bold ${color}`}>{score}</span>
          <span className={`text-[9px] font-bold ${color} uppercase tracking-wider`}>{grade}</span>
        </div>
      </div>

      <div className="w-full bg-gsrp-dark-surface h-2 rounded-full overflow-hidden mb-6">
        <div 
          className={`h-full rounded-full transition-all duration-1000 ${
            score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500'
          }`} 
          style={{ width: `${score}%` }} 
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gsrp-dark-surface/50 rounded-xl p-3 border border-white/5">
          <div className="flex items-center gap-1.5 mb-1">
            <AlertCircle size={12} className="text-red-400" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-gsrp-teal-light/30">Pastes</span>
          </div>
          <span className={`text-lg font-bold ${totalPastes > 0 ? 'text-red-500' : 'text-green-500'}`}>{totalPastes}</span>
        </div>

        <div className="bg-gsrp-dark-surface/50 rounded-xl p-3 border border-white/5">
          <div className="flex items-center gap-1.5 mb-1">
            <Eye size={12} className="text-amber-400" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-gsrp-teal-light/30">Tab-Outs</span>
          </div>
          <span className={`text-lg font-bold ${totalTabOuts > 0 ? 'text-amber-500' : 'text-green-500'}`}>
            {totalTabOuts}
            {totalTabOutTime > 0 && <span className="text-[10px] font-bold text-gsrp-teal-light/30 ml-1">({formatDuration(totalTabOutTime)})</span>}
          </span>
        </div>

        <div className="bg-gsrp-dark-surface/50 rounded-xl p-3 border border-white/5">
          <div className="flex items-center gap-1.5 mb-1">
            <Zap size={12} className="text-orange-400" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-gsrp-teal-light/30">WPM Spikes</span>
          </div>
          <span className={`text-lg font-bold ${totalWpmSpikes > 0 ? 'text-orange-500' : 'text-green-500'}`}>{totalWpmSpikes}</span>
        </div>

        <div className="bg-gsrp-dark-surface/50 rounded-xl p-3 border border-white/5">
          <div className="flex items-center gap-1.5 mb-1">
            <MousePointer2 size={12} className="text-purple-400" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-gsrp-teal-light/30">Right-Clicks</span>
          </div>
          <span className={`text-lg font-bold ${totalRightClicks > 0 ? 'text-purple-500' : 'text-green-500'}`}>{totalRightClicks}</span>
        </div>

        <div className="bg-gsrp-dark-surface/50 rounded-xl p-3 border border-white/5">
          <div className="flex items-center gap-1.5 mb-1">
            <Timer size={12} className="text-cyan-400" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-gsrp-teal-light/30">Idle Periods</span>
          </div>
          <span className={`text-lg font-bold ${totalIdlePeriods > 0 ? 'text-cyan-500' : 'text-green-500'}`}>{totalIdlePeriods}</span>
        </div>

        <div className="bg-gsrp-dark-surface/50 rounded-xl p-3 border border-white/5">
          <div className="flex items-center gap-1.5 mb-1">
            <Mouse size={12} className="text-pink-400" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-gsrp-teal-light/30">Mouse Leaves</span>
          </div>
          <span className={`text-lg font-bold ${totalMouseLeaves > 0 ? 'text-pink-500' : 'text-green-500'}`}>{totalMouseLeaves}</span>
        </div>
      </div>

      {totalTabOuts > TAB_OUT_THRESHOLD && (
        <div className="mt-4 flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-xl">
          <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
          <span className="text-xs font-bold text-red-400">
            {totalTabOuts} tab-outs detected (threshold: {TAB_OUT_THRESHOLD}) — review recommended
          </span>
        </div>
      )}
    </div>
  );
};

const MonitoringTimeline = ({ application, fieldId, fieldLabel }) => {
  const [expanded, setExpanded] = useState(false);
  const fieldMonitoring = application.monitoringData?.[fieldId] || {};
  const tabOuts = fieldMonitoring.tabOuts || [];
  const rightClicks = fieldMonitoring.rightClicks || [];
  const wpmSpikes = fieldMonitoring.wpmSpikes || [];
  const idlePeriods = fieldMonitoring.idlePeriods || [];

  const hasData = tabOuts.length > 0 || rightClicks.length > 0 || wpmSpikes.length > 0 || idlePeriods.length > 0;
  if (!hasData) return null;

  return (
    <div className="mt-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gsrp-teal-light/30 hover:text-gsrp-teal-light/60 transition-colors"
      >
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        Monitoring Events ({tabOuts.length + rightClicks.length + wpmSpikes.length + idlePeriods.length})
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          {tabOuts.length > 0 && (
            <div>
              <div className="text-[9px] font-bold uppercase tracking-widest text-amber-500/60 mb-1 flex items-center gap-1">
                <Eye size={10} /> Tab-Outs ({tabOuts.length})
              </div>
              <div className="space-y-1">
                {tabOuts.map((t, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px] text-amber-400/70 bg-amber-500/5 px-3 py-1.5 rounded-lg border border-amber-500/10">
                    <span className="font-mono">{formatTime(t.leftAt)}</span>
                    <span>— left for <span className="font-bold text-amber-400">{formatDuration(t.duration)}</span></span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {rightClicks.length > 0 && (
            <div>
              <div className="text-[9px] font-bold uppercase tracking-widest text-purple-500/60 mb-1 flex items-center gap-1">
                <MousePointer2 size={10} /> Right-Clicks ({rightClicks.length})
              </div>
              <div className="space-y-1">
                {rightClicks.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px] text-purple-400/70 bg-purple-500/5 px-3 py-1.5 rounded-lg border border-purple-500/10">
                    <span className="font-mono">{formatTime(r.timestamp)}</span>
                    <span>Context menu opened</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {wpmSpikes.length > 0 && (
            <div>
              <div className="text-[9px] font-bold uppercase tracking-widest text-orange-500/60 mb-1 flex items-center gap-1">
                <Zap size={10} /> WPM Anomalies ({wpmSpikes.length})
              </div>
              <div className="space-y-1">
                {wpmSpikes.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px] text-orange-400/70 bg-orange-500/5 px-3 py-1.5 rounded-lg border border-orange-500/10">
                    <span className="font-mono">{formatTime(s.timestamp)}</span>
                    <span>{s.windowWpm} WPM spike ({s.ratio}x average of {s.averageWpm} WPM)</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {idlePeriods.length > 0 && (
            <div>
              <div className="text-[9px] font-bold uppercase tracking-widest text-cyan-500/60 mb-1 flex items-center gap-1">
                <Timer size={10} /> Idle Periods ({idlePeriods.length})
              </div>
              <div className="space-y-1">
                {idlePeriods.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px] text-cyan-400/70 bg-cyan-500/5 px-3 py-1.5 rounded-lg border border-cyan-500/10">
                    <span className="font-mono">{formatTime(p.startedAt)}</span>
                    <span>— idle for <span className="font-bold text-cyan-400">{formatDuration(p.duration)}</span></span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ApplicantTimeDisplay = ({ timezone }) => {
  const [time, setTime] = useState('');

  useEffect(() => {
    if (!timezone) return;

    const updateTime = () => {
      try {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
        setTime(formatter.format(now));
      } catch (_) {}
    };

    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, [timezone]);

  if (!time) return null;

  return (
    <p className="text-[10px] font-bold text-gsrp-teal-light/30 mt-1 flex items-center gap-1.5">
      <Clock size={10} className="text-gsrp-teal-light/40" />
      Current time for applicant: <span className="text-gsrp-teal-light/50">{time}</span>
    </p>
  );
};

export default function ApplicationDetail() {
  const { data: session, status } = useSession();
  const { session: refreshedSession, hasRefreshed, accessDenied } = useRefreshedUser();
  const effectiveSession = refreshedSession || session;
  const router = useRouter();
  const { id } = router.query;
  
  const [application, setApplication] = useState(null);
  const [resolvedTimezone, setResolvedTimezone] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [appType, setAppType] = useState(null);
  const [pendingApplications, setPendingApplications] = useState([]);

  
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [decisionType, setDecisionType] = useState(null); 
  const [reason, setReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (id && session && canReviewApplications(effectiveSession)) {
      fetch(`/api/applications/${id}`)
        .then(r => {
          if (!r.ok) {
            setLoading(false);
            return null;
          }
          return r.json();
        })
        .then(data => {
          setApplication(data);
          if (!data) return;

          // Resolve timezone if not present or invalid (not IANA)
          const hasValidTz = data.timezone && data.timezone.includes('/');
          if (!hasValidTz) {
            fetch(`/api/applications/timezone/${id}`)
              .then(r => r.ok ? r.json() : null)
              .then(res => {
                if (res?.timezone) setResolvedTimezone(res.timezone);
              })
              .catch(err => console.error('[Review Page] Timezone resolve failed:', err));
          } else {
            setResolvedTimezone(data.timezone);
          }

          if (data?.type) {
            fetch('/api/applications/types')

              .then(r => r.json())
              .then(types => {
                const type = types.find(t => t.slug === data.type);
                if (type) {
                  setAppType(type);
                } else if (data.type === 'staff') {
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
          } else {
            setLoading(false);
          }
        })
        .catch(err => {
          setError(err.message);
          setLoading(false);
        });
    }
  }, [id, session]);

  useEffect(() => {
    if (!session || !canReviewApplications(effectiveSession)) return;
    fetch('/api/applications/list?limit=100')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const apps = Array.isArray(data?.applications) ? data.applications : [];
        setPendingApplications(apps.filter(app => app.status === 'pending'));
      })
      .catch(err => console.error('[Review Page] Pending list failed:', err));
  }, [id, session, effectiveSession]);

  const handleDecision = async () => {
    if (!reason.trim()) return;
    setIsProcessing(true);
    
    try {
      const res = await fetch('/api/applications/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: application._id,
          status: decisionType,
          reason: reason
        }),
      });

      if (!res.ok) throw new Error('Failed to process decision');
      
      setApplication(prev => ({ ...prev, status: decisionType, decisionReason: reason }));
      setShowReasonModal(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/applications/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete application');
      router.push('/applications');
    } catch (err) {
      alert(err.message);
      setIsDeleting(false);
    }
  };

  const handleCopyResponses = () => {
    if (!appType || !application.answers) return;
    const realQuestions = appType.fields.filter(f => f.type === 'textarea');
    const lines = realQuestions
      .map(f => {
        const val = application.answers[f.id] || application.answers[f.label];
        return Array.isArray(val) ? val.join(', ') : (val || 'N/A');
      })
      .join('\n\n');
    navigator.clipboard.writeText(lines);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (status === 'loading' || !hasRefreshed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-gsrp-orange animate-spin mb-4" />
        <span className="text-gsrp-teal-light/40 font-mono text-[9px] uppercase tracking-[0.3em]">Loading Application Access</span>
      </div>
    );
  }
  if (!session) return <LoginScreen />;
  if (accessDenied) return <AccessDenied roleId={accessDenied.roleId} />;
  if (!canReviewApplications(effectiveSession)) return <AccessDenied roleId="1372491512709124106" />;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-gsrp-orange animate-spin mb-4" />
        <span className="text-gsrp-teal-light/40 font-mono text-[9px] uppercase tracking-[0.3em]">Fetching Application</span>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in-up">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
          <Trash2 size={28} className="text-red-500/60" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Application Deleted</h1>
        <p className="text-gsrp-teal-light/40 mb-6">This application has been deleted and is no longer available.</p>
        <Link href="/applications" className="inline-flex items-center gap-2 px-6 py-3 bg-gsrp-orange text-white font-bold rounded-xl">
          <ArrowLeft size={16} />
          Back to Applications
        </Link>
      </div>
    );
  }

  const getStats = (fieldId) => {
    const keys = application.keystrokeData?.[fieldId] || [];
    const pastes = application.pasteData?.[fieldId] || [];
    if (keys.length === 0) return { speed: 0, count: 0, hasPastes: pastes.length > 0 };
    
    const startTime = keys[0].timestamp;
    const endTime = keys[keys.length - 1].timestamp;
    const durationMins = (endTime - startTime) / 1000 / 60;
    const wpm = durationMins > 0 ? (keys.length / 5) / durationMins : 0;
    
    return {
      count: keys.length,
      wpm: Math.round(wpm),
      hasPastes: pastes.length > 0
    };
  };

  const totalSessionTabOuts = (application.sessionTabOuts || []).length;
  const totalSessionTabOutTime = (application.sessionTabOuts || []).reduce((sum, t) => sum + (t.duration || 0), 0);
  const totalSessionMouseLeaves = (application.sessionMouseLeaves || []).length;

  // Pending applications other than the one currently open.
  const otherPending = pendingApplications.filter(app => app._id !== application._id);
  // The next pending application to review. If we're already viewing a pending
  // app, cycle to the one after it; otherwise jump to the first in the queue.
  const currentPendingIdx = pendingApplications.findIndex(app => app._id === application._id);
  let nextPendingApp = null;
  if (pendingApplications.length > 0) {
    if (currentPendingIdx >= 0) {
      nextPendingApp = pendingApplications.length > 1
        ? pendingApplications[(currentPendingIdx + 1) % pendingApplications.length]
        : null;
    } else {
      nextPendingApp = pendingApplications[0];
    }
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in-up pb-20 px-4">
      <Head>
        <title>Review {application.username} | GSRP Dashboard</title>
      </Head>

      <div className="mb-6">
        <Link href="/applications" className="inline-flex items-center gap-2 text-gsrp-teal-light/40 hover:text-gsrp-orange transition-colors text-xs font-bold uppercase tracking-widest">
          <ArrowLeft size={14} />
          Back to Applications
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-8">
          <div className="bg-gsrp-dark-card/60 backdrop-blur-md rounded-2xl border border-gsrp-dark-border/50 p-8">
            <div className="flex flex-col md:flex-row items-center gap-6">
              {application.userImage ? (
                <img src={application.userImage} alt="" className="w-20 h-20 rounded-full border border-gsrp-dark-border/50 shadow-xl object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gsrp-dark-surface border border-gsrp-dark-border/50 flex items-center justify-center text-gsrp-teal-light font-bold text-3xl shadow-xl">
                  {application.username.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="text-center md:text-left flex-1">
                <h1 className="text-2xl font-bold text-white mb-1">{application.username}</h1>
                <p className="text-xs font-mono text-gsrp-teal-light/40 uppercase tracking-widest">{application.userId}</p>
                <p className="text-[10px] font-bold text-gsrp-orange uppercase tracking-widest mt-2">{application.typeName || "Application"}</p>
                {application.osDetected && (
                  <p className="text-[10px] font-bold text-gsrp-teal-light/30 mt-1">
                    Detected OS: <span className="text-gsrp-teal-light/50">{application.osDetected === 'mac' ? 'macOS' : application.osDetected === 'windows' ? 'Windows' : 'Other'}</span>
                  </p>
                )}
                {(resolvedTimezone || application?.timezone || application?.answers?.timezone) && (
                  <ApplicantTimeDisplay timezone={resolvedTimezone || application?.timezone || application?.answers?.timezone} />
                )}
              </div>
              <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest text-center border
                ${application.status === 'pending' ? 'bg-gsrp-orange/10 text-gsrp-orange border-gsrp-orange/20' : 
                  application.status === 'accepted' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                  'bg-red-500/10 text-red-500 border-red-500/20'}
              `}>
                {application.status}
              </span>
            </div>
          </div>

          <div className="bg-gsrp-dark-card/60 backdrop-blur-md rounded-2xl border border-gsrp-dark-border/50 p-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-white font-bold text-sm uppercase tracking-[0.2em] flex items-center gap-3">
                <FileText size={18} className="text-gsrp-orange" />
                Submission Details
              </h2>
              <button
                onClick={handleCopyResponses}
                className={`flex items-center gap-2 px-4 py-2 bg-gsrp-dark-surface border rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                  copied
                    ? 'border-green-500/30 text-green-400 bg-green-500/10'
                    : 'border-gsrp-dark-border text-gsrp-teal-light/60 hover:text-white hover:border-gsrp-orange'
                }`}
              >
                {copied ? <CheckCircle size={14} /> : <Clipboard size={14} />}
                {copied ? 'Copied!' : 'Copy user responses'}
              </button>
            </div>
            <div className="space-y-8">
              {appType ? appType.fields.map((field, fIdx) => {
                const val = application.answers?.[field.id] || application.answers?.[field.label];
                const stats = getStats(field.id);
                const fieldPastes = application.pasteData?.[field.id] || [];
                return (
                  <div key={field.id} className="relative group">
                    <div className="flex justify-between items-start mb-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gsrp-teal-light/30">{field.label}</label>
                      <div className="flex items-center gap-2">
                        {stats.hasPastes && <span className="text-[8px] font-bold uppercase bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full border border-red-500/20">Paste Detected</span>}
                        {fieldPastes.length > 0 && (
                          <span className="text-[8px] font-bold uppercase bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full border border-amber-500/20">
                            {fieldPastes.length} paste{fieldPastes.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="bg-gsrp-dark-surface/30 rounded-xl p-4 border border-gsrp-dark-border/30 hover:border-gsrp-dark-border transition-colors">
                      <p className="text-white font-medium text-sm leading-relaxed whitespace-pre-wrap">
                        {(() => {
                          if (Array.isArray(val)) return val.join(', ');
                          if (!val) return "N/A";
                          
                          if (field.type === 'slider' && field.cues) {
                            const cueMap = field.cues.split(',').reduce((acc, curr) => {
                              const [v, l] = curr.split(':').map(s => s.trim());
                              if (v && l) acc[v] = l;
                              return acc;
                            }, {});
                            if (cueMap[val]) return `${val} (${cueMap[val]})`;
                          }
                          
                          return val;
                        })()}
                      </p>
                    </div>
                    
                    <PasteDetector pastes={fieldPastes} />

                    <MonitoringTimeline 
                      application={application} 
                      fieldId={field.id} 
                      fieldLabel={field.label} 
                    />
                  </div>
                );
              }) : (
                <div className="text-gsrp-teal-light/40 text-sm italic">
                  Could not load application structure. This might be an older submission.
                </div>
              )}
            </div>
          </div>

          {totalSessionTabOuts > 0 && (
            <div className="bg-gsrp-dark-card/60 backdrop-blur-md rounded-2xl border border-gsrp-dark-border/50 p-8">
              <h2 className="text-white font-bold text-sm uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                <Eye size={18} className="text-amber-500" />
                Session Tab-Out Log
                {totalSessionTabOuts > TAB_OUT_THRESHOLD && (
                  <span className="ml-2 px-2 py-0.5 bg-red-500/10 text-red-500 text-[9px] font-bold uppercase rounded-full border border-red-500/20">
                    Exceeds Threshold
                  </span>
                )}
              </h2>
              <div className="space-y-2">
                {(application.sessionTabOuts || []).map((tab, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm bg-amber-500/5 px-4 py-2.5 rounded-xl border border-amber-500/10">
                    <span className="text-amber-500/40 font-mono text-xs">#{i + 1}</span>
                    <span className="text-gsrp-teal-light/50 font-mono text-xs">{formatTime(tab.leftAt)}</span>
                    <span className="text-amber-400/80 text-xs font-medium">
                      Left on {tab.activeField || 'unknown field'} — returned after <span className="font-bold text-amber-400">{formatDuration(tab.duration)}</span>
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-4 text-[10px] font-bold text-gsrp-teal-light/30 uppercase tracking-widest">
                <span>Total: {totalSessionTabOuts} tab-out{totalSessionTabOuts !== 1 ? 's' : ''}</span>
                <span>Total time away: {formatDuration(totalSessionTabOutTime)}</span>
              </div>
            </div>
          )}

          {totalSessionMouseLeaves > 0 && (
            <div className="bg-gsrp-dark-card/60 backdrop-blur-md rounded-2xl border border-gsrp-dark-border/50 p-8">
              <h2 className="text-white font-bold text-sm uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                <Mouse size={18} className="text-pink-500" />
                Mouse Leave Events
              </h2>
              <div className="space-y-2">
                {(application.sessionMouseLeaves || []).map((ml, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm bg-pink-500/5 px-4 py-2.5 rounded-xl border border-pink-500/10">
                    <span className="text-pink-500/40 font-mono text-xs">#{i + 1}</span>
                    <span className="text-gsrp-teal-light/50 font-mono text-xs">{formatTime(ml.leftAt)}</span>
                    <span className="text-pink-400/80 text-xs font-medium">
                      Mouse left viewport for <span className="font-bold text-pink-400">{formatDuration(ml.duration)}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <IntegrityScoreCard application={application} />

          <div className="bg-gsrp-dark-card/60 backdrop-blur-md rounded-2xl border border-gsrp-dark-border/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                <Clock size={14} className="text-gsrp-orange" />
                Pending Queue
              </h3>
              <span className="text-[9px] font-bold uppercase tracking-widest text-gsrp-orange bg-gsrp-orange/10 border border-gsrp-orange/20 px-2 py-0.5 rounded-full">
                {pendingApplications.length} pending
              </span>
            </div>

            {nextPendingApp ? (
              <button
                onClick={() => router.push(`/applications/${nextPendingApp._id}`)}
                className="w-full mb-4 py-3.5 bg-gsrp-orange hover:bg-gsrp-orange/90 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-widest shadow-lg shadow-gsrp-orange/10"
              >
                Next Application
                <ArrowRight size={18} />
              </button>
            ) : pendingApplications.length > 0 ? (
              <div className="w-full mb-4 py-3 bg-gsrp-dark-surface/50 border border-white/5 text-gsrp-teal-light/30 font-bold rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-widest">
                <CheckCircle size={14} />
                Last in queue
              </div>
            ) : null}

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {otherPending.length > 0 ? (
                otherPending.map(app => (
                  <Link
                    key={app._id}
                    href={`/applications/${app._id}`}
                    className="block rounded-xl border border-white/5 bg-gsrp-dark-surface/40 px-3 py-3 hover:border-gsrp-orange/40 hover:bg-gsrp-dark-surface transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {app.userImage ? (
                        <img src={app.userImage} alt="" className="w-8 h-8 rounded-full object-cover border border-white/10" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gsrp-dark-card border border-white/10 flex items-center justify-center text-white/70 text-xs font-bold">
                          {(app.username || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-white text-xs font-bold truncate">{app.username}</p>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-gsrp-teal-light/30 truncate">
                          {app.typeName || app.type || 'Application'}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-gsrp-teal-light/30 text-xs font-medium">No other pending applications.</p>
              )}
            </div>
          </div>

          <div className="bg-gsrp-dark-card/60 backdrop-blur-md rounded-2xl border border-gsrp-dark-border/50 p-6 sticky top-6">
            <h3 className="text-white font-bold text-xs uppercase tracking-widest mb-6 flex items-center gap-2">
              <CheckCircle size={14} className="text-gsrp-teal" />
              Decision Area
            </h3>
            
            {application.status === 'pending' ? (
              <div className="space-y-3">
                <button 
                  onClick={() => { setDecisionType('accepted'); setShowReasonModal(true); }}
                  className="w-full py-3 bg-gsrp-teal hover:bg-gsrp-teal-light text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle size={16} />
                  Accept
                </button>
                <button 
                  onClick={() => { setDecisionType('denied'); setShowReasonModal(true); }}
                  className="w-full py-3 bg-gsrp-dark-surface border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <XCircle size={16} />
                  Deny
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-gsrp-dark-surface border border-gsrp-dark-border/50">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gsrp-teal-light/40 mb-2">Review Reason</p>
                  <p className="text-white text-sm font-medium italic">"{application.decisionReason || application.reason}"</p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-bold text-gsrp-teal-light/20 uppercase tracking-widest">
                    Reviewed by {application.reviewedByName || application.reviewedBy || 'Unknown'}
                  </p>
                </div>
              </div>
            )}

            <div className="mt-8 pt-8 border-t border-gsrp-dark-border/50">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-gsrp-teal-light/40 mb-4">Typing Analysis</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gsrp-teal-light/40">Total Pastes</span>
                  <span className={`font-bold ${Object.keys(application.pasteData || {}).length > 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {Object.keys(application.pasteData || {}).length}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gsrp-teal-light/40">Tab-Outs</span>
                  <span className={`font-bold ${totalSessionTabOuts > 0 ? 'text-amber-500' : 'text-green-500'}`}>
                    {totalSessionTabOuts}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gsrp-teal-light/40">Mouse Leaves</span>
                  <span className={`font-bold ${totalSessionMouseLeaves > 0 ? 'text-pink-500' : 'text-green-500'}`}>
                    {totalSessionMouseLeaves}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gsrp-dark-border/50">
              <button 
                onClick={() => setShowDeleteModal(true)}
                className="w-full py-3 bg-red-500/5 border border-red-500/20 text-red-500/60 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
              >
                <Trash2 size={14} />
                Delete Application
              </button>
            </div>
          </div>
        </div>
      </div>

      {showReasonModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ position: 'fixed' }}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowReasonModal(false)} />
          <div className="relative bg-gsrp-dark-card border border-gsrp-dark-border rounded-2xl p-8 w-full max-w-lg shadow-2xl">
            <h3 className="text-white font-bold text-xl mb-4">
              {decisionType === 'accepted' ? 'Accept' : 'Deny'} Application
            </h3>
            <p className="text-gsrp-teal-light/60 text-sm mb-6">
              Enter the reason for this decision. This will be sent to the user's DMs.
            </p>
            <textarea 
              autoFocus
              className="w-full bg-gsrp-dark-surface border border-gsrp-dark-border rounded-xl p-4 text-white text-sm focus:border-gsrp-orange/50 focus:outline-none h-32 mb-6"
              placeholder="Reason..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="flex gap-3">
              <button onClick={() => setShowReasonModal(false)} className="flex-1 py-3 text-gsrp-teal-light font-bold">Cancel</button>
              <button 
                onClick={handleDecision}
                disabled={isProcessing || !reason.trim()}
                className={`flex-1 py-3 font-bold rounded-xl ${decisionType === 'accepted' ? 'bg-green-500' : 'bg-red-500'} text-white`}
              >
                {isProcessing ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showDeleteModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ position: 'fixed' }}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)} />
          <div className="relative bg-gsrp-dark-card border border-red-500/30 rounded-2xl p-8 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <Trash2 size={20} className="text-red-500" />
              </div>
              <h3 className="text-white font-bold text-xl">Delete Application</h3>
            </div>
            <p className="text-gsrp-teal-light/60 text-sm mb-2">
              This will permanently delete <span className="text-white font-bold">{application.username}</span>'s application.
            </p>
            <p className="text-red-400/80 text-xs mb-6 font-medium">
              This action cannot be undone. All responses, keystroke data, and monitoring records will be erased.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowDeleteModal(false)} 
                className="flex-1 py-3 bg-gsrp-dark-surface border border-white/10 text-gsrp-teal-light font-bold rounded-xl hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
