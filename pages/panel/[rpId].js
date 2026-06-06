import { useState, useEffect } from 'react';
import Head from 'next/head';
import { Loader2, MapPin, Clock, User, Radio, Calendar } from 'lucide-react';

export default function RoleplayDetailPage() {
  const [rp, setRp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchRp() {
      try {
        const id = window.location.pathname.split('/').pop();
        const res = await fetch(`/api/panel/roleplays/${id}`);
        if (res.ok) {
          setRp(await res.json());
        } else {
          setError('Roleplay log not found');
        }
      } catch (e) {
        setError('Failed to load roleplay data');
      } finally {
        setLoading(false);
      }
    }
    fetchRp();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-gsrp-orange animate-spin" />
          <p className="text-xs font-mono uppercase tracking-widest text-white/40">Loading Roleplay Log</p>
        </div>
      </div>
    );
  }

  if (error || !rp) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center text-white text-center px-4">
        <div>
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Radio size={32} />
          </div>
          <h1 className="text-xl font-bold mb-2">Log Not Found</h1>
          <p className="text-white/40 text-sm">The requested roleplay log has expired or does not exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white p-4 sm:p-8 flex justify-center items-start">
      <Head>
        <title>RP Log | {rp.robloxUsername}</title>
      </Head>
      
      <div className="w-full max-w-2xl bg-gsrp-dark-card border border-gsrp-dark-border/50 rounded-3xl overflow-hidden shadow-2xl"
           style={{ backdropFilter: 'blur(20px)', background: 'rgba(15,22,41,0.97)' }}>
        
        {/* Header */}
        <div className="p-6 border-b border-gsrp-dark-border/50 bg-gsrp-orange/5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gsrp-dark-surface border-2 border-gsrp-orange flex items-center justify-center overflow-hidden">
               <img src={`/api/panel/avatar?id=${rp.robloxUserId}`} alt="" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{rp.robloxUsername}</h1>
              <div className="flex items-center gap-2 text-gsrp-orange text-sm font-semibold">
                <Radio size={14} />
                {rp.roleplayType}
              </div>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-white/60">
              <MapPin size={18} className="text-gsrp-orange" />
              <div>
                <p className="text-[10px] uppercase font-bold text-white/30 leading-none mb-1">Location</p>
                <p className="text-sm font-medium">{rp.location}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-white/60">
              <Clock size={18} className="text-gsrp-orange" />
              <div>
                <p className="text-[10px] uppercase font-bold text-white/30 leading-none mb-1">Duration</p>
                <p className="text-sm font-medium">{rp.durationMs ? `${Math.floor(rp.durationMs / 60000)}m` : 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-white/60">
              <Calendar size={18} className="text-gsrp-orange" />
              <div>
                <p className="text-[10px] uppercase font-bold text-white/30 leading-none mb-1">Logged At</p>
                <p className="text-sm font-medium">{new Date(rp.createdAt).toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-white/60">
              <User size={18} className="text-gsrp-orange" />
              <div>
                <p className="text-[10px] uppercase font-bold text-white/30 leading-none mb-1">Logged By</p>
                <p className="text-sm font-medium">{rp.moderatorName}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Status */}
        <div className="p-4 bg-black/20 border-t border-gsrp-dark-border/50 flex justify-center">
          <div className={`px-4 py-1.5 rounded-full text-xs font-bold ${rp.active ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
            {rp.active ? '● Active Roleplay' : '○ Roleplay Ended'}
          </div>
        </div>
      </div>
    </div>
  );
}
