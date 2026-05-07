import { useState, useEffect } from 'react';
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
  Info
} from 'lucide-react';
import Link from 'next/link';
import { canReviewApplications } from '../../lib/auth';
import LoginScreen from '../../components/auth/LoginScreen';

export default function ApplicationDetail() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = router.query;
  
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [decisionType, setDecisionType] = useState(null); 
  const [reason, setReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (id && session && canReviewApplications(session)) {
      fetch(`/api/applications/${id}`)
        .then(r => {
          if (!r.ok) throw new Error('Failed to fetch application');
          return r.json();
        })
        .then(data => {
          setApplication(data);
          setLoading(false);
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

  const getStats = (field) => {
    const keys = application.keystrokeData?.[field] || [];
    const pastes = application.pasteData?.[field] || [];
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

  const sections = [
    {
      title: "Applicant Profile",
      icon: User,
      fields: [
        { label: "Roblox Username", key: "roblox_username" },
        { label: "PD Rank", key: "pd_rank" },
        { label: "Timezone", key: "timezone" },
      ]
    },
    {
      title: "Game Knowledge",
      icon: Shield,
      fields: [
        { label: "RDM Explanation", key: "explain_rdm" },
        { label: "VDM Explanation", key: "explain_vdm" },
        { label: "FRP Explanation", key: "explain_frp" },
        { label: "LTAP Explanation", key: "explain_ltap" },
      ]
    },
    {
      title: "Scenarios",
      icon: Zap,
      fields: [
        { label: "Scenario 1 (Spawn Shooting)", key: "scenario_1" },
        { label: "Scenario 2 (Arrest Button)", key: "scenario_2" },
        { label: "Scenario 3 (Sniper)", key: "scenario_3" },
        { label: "Scenario 4 (Stop Sticks)", key: "scenario_4" },
        { label: "Scenario 5 (No Response)", key: "scenario_5" },
      ]
    },
    {
      title: "Serious Punishments",
      icon: AlertCircle,
      fields: [
        { label: "Scenario 6 (Threats)", key: "scenario_6" },
        { label: "Scenario 7 (Swearing)", key: "scenario_7" },
        { label: "Scenario 8 (Exploiting)", key: "scenario_8" },
      ]
    },
    {
      title: "Agreements & Familiarity",
      icon: Info,
      fields: [
        { label: "Tiring/Frustrating?", key: "agree_workload" },
        { label: "SPaG/Professionalism?", key: "agree_spag" },
        { label: "4 Hour Quota?", key: "agree_quota" },
        { label: "No Ask Rule?", key: "agree_no_ask" },
        { label: "Melonly Familiarity (1-5)", key: "melonly_familiarity" },
        { label: "Final Questions/Comments", key: "final_questions" },
      ]
    }
  ];

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
              <div className="w-20 h-20 rounded-full bg-gsrp-dark-surface border border-gsrp-dark-border/50 flex items-center justify-center text-gsrp-teal-light font-black text-3xl shadow-xl">
                {application.username.charAt(0).toUpperCase()}
              </div>
              <div className="text-center md:text-left flex-1">
                <h1 className="text-2xl font-black text-white mb-1">{application.username}</h1>
                <p className="text-xs font-mono text-gsrp-teal-light/40 uppercase tracking-widest">{application.userId}</p>
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

          {sections.map((section, idx) => (
            <div key={idx} className="bg-gsrp-dark-card/60 backdrop-blur-md rounded-2xl border border-gsrp-dark-border/50 p-8">
              <h2 className="text-white font-black text-sm uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                <section.icon size={18} className="text-gsrp-orange" />
                {section.title}
              </h2>
              <div className="space-y-8">
                {section.fields.map((field, fIdx) => {
                  const val = application.answers?.[field.key];
                  const stats = getStats(field.key);
                  return (
                    <div key={fIdx} className="relative group">
                      <div className="flex justify-between items-start mb-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gsrp-teal-light/30">{field.label}</label>
                        {stats.hasPastes && <span className="text-[8px] font-black uppercase bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full border border-red-500/20">Paste Detected</span>}
                      </div>
                      <div className="bg-gsrp-dark-surface/30 rounded-xl p-4 border border-gsrp-dark-border/30 hover:border-gsrp-dark-border transition-colors">
                        <p className="text-white font-medium text-sm leading-relaxed whitespace-pre-wrap">
                          {val || "N/A"}
                        </p>
                      </div>
                      {stats.count > 0 && (
                        <div className="mt-2 flex gap-4 text-[9px] font-bold text-gsrp-teal-light/20 uppercase tracking-widest">
                          <span>{stats.count} Keystrokes</span>
                          <span>{stats.wpm} WPM</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
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
                  <span className="text-white font-bold">Good</span>
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
