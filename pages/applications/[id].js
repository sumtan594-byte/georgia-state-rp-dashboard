import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { 
  FileText, 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Clock, 
  MousePointer2, 
  Keyboard, 
  MessageSquare, 
  Loader2, 
  AlertCircle,
  User,
  Shield,
  Zap,
  Info,
  Play,
  RotateCcw
} from 'lucide-react';
import Link from 'next/link';
import { canReviewApplications } from '../../lib/auth';
import LoginScreen from '../../components/auth/LoginScreen';

const KeystrokePlayer = ({ keystrokes, originalText }) => {
  const [playing, setPlaying] = useState(false);
  const [displayText, setDisplayText] = useState('');
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);

  const stop = () => {
    setPlaying(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    setDisplayText('');
    setProgress(0);
  };

  const play = async () => {
    if (playing) return stop();
    
    setPlaying(true);
    setDisplayText('');
    setProgress(0);
    
    const sorted = [...keystrokes].sort((a, b) => a.timestamp - b.timestamp);
    if (sorted.length === 0) {
      setPlaying(false);
      return;
    }

    const playSequence = async (index) => {
      if (index >= sorted.length) {
        setPlaying(false);
        return;
      }

      const current = sorted[index];
      const nextDelay = index === 0 ? 0 : Math.min(current.timestamp - sorted[index - 1].timestamp, 300);

      timerRef.current = setTimeout(() => {
        setDisplayText(prev => {
          if (current.key === 'Backspace') return prev.slice(0, -1);
          if (current.key.length === 1) return prev + current.key;
          return prev;
        });
        setProgress(Math.round(((index + 1) / sorted.length) * 100));
        playSequence(index + 1);
      }, nextDelay);
    };

    playSequence(0);
  };

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return (
    <div className="mt-4 p-4 bg-black/40 rounded-2xl border border-white/5 overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button 
            onClick={play} 
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all
              ${playing ? 'bg-gsrp-orange text-white' : 'bg-gsrp-dark-surface text-gsrp-teal-light/40 hover:text-white'}
            `}
          >
            {playing ? <RotateCcw size={12} /> : <Play size={12} />}
            {playing ? 'Stop Replay' : 'Replay Typing'}
          </button>
          {playing && (
            <span className="text-[10px] font-bold text-gsrp-orange animate-pulse">Playing Sequence...</span>
          )}
        </div>
        <span className="text-[10px] font-mono text-white/20">{progress}%</span>
      </div>
      
      <div className="relative min-h-[60px] bg-gsrp-dark-surface/50 rounded-xl p-4 border border-white/5">
        <p className="text-sm font-medium text-gsrp-teal-light leading-relaxed whitespace-pre-wrap">
          {playing ? displayText : <span className="opacity-20 italic">Click replay to see typing behavior...</span>}
          {playing && <span className="inline-block w-1.5 h-4 bg-gsrp-orange ml-1 animate-pulse align-middle" />}
        </p>
      </div>
    </div>
  );
};

export default function ApplicationDetail() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = router.query;
  
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [appType, setAppType] = useState(null);
  
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [decisionType, setDecisionType] = useState(null); 
  const [reason, setReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (id && session && canReviewApplications(session)) {
      fetch(`/api/applications/${id}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          setApplication(data);
          // Fetch type info
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

  if (status === 'loading') return null;
  if (!session) return <LoginScreen />;
  if (!canReviewApplications(session)) return <div>Access Denied</div>;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-gsrp-orange animate-spin mb-4" />
        <span className="text-gsrp-teal-light/40 font-mono text-[9px] uppercase tracking-[0.3em]">Fetching Application</span>
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
        {/* Left Column: Responses */}
        <div className="lg:col-span-3 space-y-8">
          <div className="bg-gsrp-dark-card/60 backdrop-blur-md rounded-2xl border border-gsrp-dark-border/50 p-8">
            <div className="flex flex-col md:flex-row items-center gap-6">
              {application.userImage ? (
                <img src={application.userImage} alt="" className="w-20 h-20 rounded-full border border-gsrp-dark-border/50 shadow-xl object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gsrp-dark-surface border border-gsrp-dark-border/50 flex items-center justify-center text-gsrp-teal-light font-black text-3xl shadow-xl">
                  {application.username.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="text-center md:text-left flex-1">
                <h1 className="text-2xl font-black text-white mb-1">{application.username}</h1>
                <p className="text-xs font-mono text-gsrp-teal-light/40 uppercase tracking-widest">{application.userId}</p>
                <p className="text-[10px] font-black text-gsrp-orange uppercase tracking-widest mt-2">{application.typeName || "Application"}</p>
              </div>
              <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest text-center border
                ${application.status === 'pending' ? 'bg-gsrp-orange/10 text-gsrp-orange border-gsrp-orange/20' : 
                  application.status === 'accepted' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                  'bg-red-500/10 text-red-500 border-red-500/20'}
              `}>
                {application.status}
              </span>
            </div>
          </div>

          <div className="bg-gsrp-dark-card/60 backdrop-blur-md rounded-2xl border border-gsrp-dark-border/50 p-8">
            <h2 className="text-white font-black text-sm uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
              <FileText size={18} className="text-gsrp-orange" />
              Submission Details
            </h2>
            <div className="space-y-8">
              {appType ? appType.fields.map((field, fIdx) => {
                const val = application.answers?.[field.id] || application.answers?.[field.label];
                const stats = getStats(field.id);
                return (
                  <div key={field.id} className="relative group">
                    <div className="flex justify-between items-start mb-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gsrp-teal-light/30">{field.label}</label>
                      {stats.hasPastes && <span className="text-[8px] font-black uppercase bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full border border-red-500/20">Paste Detected</span>}
                    </div>
                    <div className="bg-gsrp-dark-surface/30 rounded-xl p-4 border border-gsrp-dark-border/30 hover:border-gsrp-dark-border transition-colors">
                      <p className="text-white font-medium text-sm leading-relaxed whitespace-pre-wrap">
                        {Array.isArray(val) ? val.join(', ') : (val || "N/A")}
                      </p>
                    </div>
                    
                    {stats.count > 0 && (
                      <>
                        <div className="mt-2 flex gap-4 text-[9px] font-bold text-gsrp-teal-light/20 uppercase tracking-widest">
                          <span>{stats.count} Keystrokes</span>
                          <span>{stats.wpm} WPM</span>
                        </div>
                        <KeystrokePlayer keystrokes={application.keystrokeData?.[field.id] || []} originalText={val} />
                      </>
                    )}
                  </div>
                );
              }) : (
                <div className="text-gsrp-teal-light/40 text-sm italic">
                  Could not load application structure. This might be an older submission.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Actions & Global Stats */}
        <div className="space-y-6">
          <div className="bg-gsrp-dark-card/60 backdrop-blur-md rounded-2xl border border-gsrp-dark-border/50 p-6 sticky top-6">
            <h3 className="text-white font-black text-xs uppercase tracking-widest mb-6 flex items-center gap-2">
              <CheckCircle size={14} className="text-gsrp-teal" />
              Decision Area
            </h3>
            
            {application.status === 'pending' ? (
              <div className="space-y-3">
                <button 
                  onClick={() => { setDecisionType('accepted'); setShowReasonModal(true); }}
                  className="w-full py-3 bg-gsrp-teal hover:bg-gsrp-teal-light text-white font-black rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle size={16} />
                  Accept
                </button>
                <button 
                  onClick={() => { setDecisionType('denied'); setShowReasonModal(true); }}
                  className="w-full py-3 bg-gsrp-dark-surface border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white font-black rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <XCircle size={16} />
                  Deny
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-gsrp-dark-surface border border-gsrp-dark-border/50">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gsrp-teal-light/40 mb-2">Review Reason</p>
                  <p className="text-white text-sm font-medium italic">"{application.decisionReason || application.reason}"</p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-bold text-gsrp-teal-light/20 uppercase tracking-widest">
                    Reviewed by {`<@${application.reviewedBy}>`}
                  </p>
                </div>
              </div>
            )}

            <div className="mt-8 pt-8 border-t border-gsrp-dark-border/50">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-gsrp-teal-light/40 mb-4">Typing Analysis</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gsrp-teal-light/40">Total Pastes</span>
                  <span className={`font-bold ${Object.keys(application.pasteData || {}).length > 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {Object.keys(application.pasteData || {}).length}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gsrp-teal-light/40">Avg. Consistency</span>
                  <span className={`font-bold ${
                    Object.keys(application.pasteData || {}).length >= 10 ? 'text-red-500' :
                    Object.keys(application.pasteData || {}).length > 5 ? 'text-gsrp-orange' :
                    'text-green-500'
                  }`}>
                    {Object.keys(application.pasteData || {}).length >= 10 ? 'High chance of AI' :
                     Object.keys(application.pasteData || {}).length > 5 ? 'Poor' :
                     'Good'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Decision Modal */}
      {showReasonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowReasonModal(false)} />
          <div className="relative bg-gsrp-dark-card border border-gsrp-dark-border rounded-2xl p-8 w-full max-w-lg shadow-2xl">
            <h3 className="text-white font-black text-xl mb-4">
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
                className={`flex-1 py-3 font-black rounded-xl ${decisionType === 'accepted' ? 'bg-green-500' : 'bg-red-500'} text-white`}
              >
                {isProcessing ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
