import { useSession } from 'next-auth/react';
import { useState, useEffect, useRef } from 'react';
import { Loader2, ShieldCheck, ArrowLeft, Gamepad2 } from 'lucide-react';
import Link from 'next/link';
import LoginScreen from '../../components/auth/LoginScreen';

const ROBLOX_CLIENT_ID = '4646799346124146894';
const REDIRECT_URI = 'https://join-gsrp.com/verify';

export default function VerifyPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [verificationData, setVerificationData] = useState(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const codeHandledRef = useRef(false);

  useEffect(() => {
    const checkLinking = async (retries = 3, delayMs = 2000) => {
      if (sessionStatus !== 'authenticated') return;
      
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const res = await fetch('/api/verify/check');
          const data = await res.json();
          if (data.linked) {
            setVerificationData(data);
            setStatus('idle');
            setIsChecking(false);
            return;
          }
          if (attempt < retries) {
            await new Promise(r => setTimeout(r, delayMs));
          }
        } catch (err) {
          console.error('Error checking linking:', err);
          if (attempt < retries) {
            await new Promise(r => setTimeout(r, delayMs));
          }
        }
      }
      setIsChecking(false);
    };

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');

    if (!code) {
      checkLinking();
      return;
    }

    let discordId = '';
    if (state && /^\d{17,20}$/.test(state.trim())) {
      discordId = state.trim();
    } else if (state && state.includes('user_')) {
      const stripped = state.replace('user_', '').trim();
      if (/^\d{17,20}$/.test(stripped)) discordId = stripped;
    }

    if (!discordId) {
      setStatus('error');
      setMessage('Invalid verification session. Please restart the verification.');
      setIsChecking(false);
      return;
    }

    if (codeHandledRef.current) return;
    codeHandledRef.current = true;

    // Double-submit guard - store pending code to prevent race conditions
    const pendingKey = `verify_pending:${discordId}:${code}`;
    globalThis.pendingVerifications ??= new Set();
    if (globalThis.pendingVerifications.has(pendingKey)) {
      console.log('[verify] Duplicate request detected, ignoring');
      return;
    }
    globalThis.pendingVerifications.add(pendingKey);

    setStatus('loading');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    fetch('/api/verify/forward', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ discordId, authCode: code }),
      signal: controller.signal
    })
    .then(res => {
      clearTimeout(timeout);
      if (!res.ok) {
        return res.json().catch(() => ({ success: false, error: `Server error (${res.status})` }))
          .then(data => { throw new Error(data.error || `Server error (${res.status})`); });
      }
      return res.json();
    })
    .then(data => {
      if (data?.success) {
        setStatus('success');
        setMessage('Your citizenship has been verified! Check your Discord Direct Messages for confirmation.');
        
        // Clean URL only on success
        try {
          const cleanUrl = window.location.origin + window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        } catch {}
        
        // Refresh page after 2 seconds to show the dashboard
        setTimeout(() => window.location.reload(), 2000);
        
        // Clear pending guard
        globalThis.pendingVerifications?.delete(pendingKey);
      } else {
        throw new Error(data?.error || 'An unexpected error occurred.');
      }
    })
    .catch(err => {
      clearTimeout(timeout);
      // Clear pending guard on error too
      globalThis.pendingVerifications?.delete(pendingKey);
      if (err.name !== 'AbortError') {
        setStatus('error');
        setMessage(err.message || 'An unexpected error occurred.');
      }
      setIsChecking(false);
    });
  }, [sessionStatus]);

  const handleUnlink = async () => {
    if (!window.confirm('Are you sure you want to unlink your Roblox account? This will remove your Discord roles and access to verified channels.')) {
      return;
    }

    setIsUnlinking(true);
    try {
      const res = await fetch('/api/verify/unlink', { method: 'POST' });
      const data = await res.json();
      
      if (data.success) {
        setVerificationData(null);
        setStatus('idle');
        setMessage('');
        // Force re-check
        window.location.reload();
      } else {
        alert(data.error || 'Failed to unlink account.');
      }
    } catch (err) {
      console.error('Unlink error:', err);
      alert('An error occurred while unlinking.');
    } finally {
      setIsUnlinking(false);
    }
  };

  if (isChecking || (status === 'idle' && sessionStatus === 'loading')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-gsrp-orange animate-spin" />
          <p className="text-gsrp-teal-light/40 font-mono text-[10px] uppercase tracking-[0.3em]">Checking Verification Status</p>
        </div>
      </div>
    );
  }

  if (!session) return <LoginScreen />;

  const discordId = session?.user?.id;
  const robloxAuthUrl = `https://authorize.roblox.com/?client_id=${ROBLOX_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=openid%20profile&state=${discordId}`;

  // If we have verification data, show the dashboard
  if (verificationData && status === 'idle') {
    const { roblox, discord, erlc, melonly } = verificationData;
    const wornAssets = Array.isArray(roblox?.currentlyWearing) ? roblox.currentlyWearing : [];
    const discordRoles = Array.isArray(discord?.roles) ? discord.roles : [];
    const melonlyLogs = Array.isArray(melonly?.logs) ? melonly.logs : [];
    const isBanned = erlc?.ban?.isBanned;

    return (
      <div className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto animate-fade-in-up">
        <Link href="/" className="inline-flex items-center gap-2 text-gsrp-teal-light/40 hover:text-gsrp-orange-light text-[10px] font-bold uppercase tracking-widest transition-colors mb-8 cursor-pointer group">
          <ArrowLeft size={12} className="group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* BAN ALERT */}
          {isBanned && (
            <div className="lg:col-span-12 card-glass rounded-2xl p-6 border-red-500/30 bg-red-500/5 flex flex-col md:flex-row items-center gap-6 animate-scale-in">
              <div className="w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0">
                <ShieldCheck size={32} className="text-red-400" />
              </div>
              <div className="text-center md:text-left flex-1">
                <h2 className="text-red-400 font-bold text-xl mb-1">Account Banned from ER:LC</h2>
                <p className="text-gsrp-teal-light/60 text-sm mb-2">
                  You were banned by <span className="text-white font-bold">{erlc.ban.logger}</span> for:
                </p>
                <div className="bg-gsrp-dark/50 rounded-xl p-3 border border-gsrp-dark-border/30 mb-3">
                  <p className="font-mono text-xs text-gsrp-teal-light/80 italic">"{erlc.ban.reason}"</p>
                </div>
                <p className="text-gsrp-orange text-xs font-bold uppercase tracking-wider">
                  Appeal this ban in the Discord server.
                </p>
              </div>
            </div>
          )}

          {/* LEFT COLUMN: ROBLOX PROFILE */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="card-glass rounded-3xl overflow-hidden shadow-2xl relative group">
              <div className="h-32 bg-gradient-to-br from-gsrp-teal/30 via-gsrp-orange/20 to-gsrp-sunset/30 relative">
                <div className="absolute inset-0 bg-gsrp-dark/40 backdrop-blur-[2px]" />
              </div>
              
              <div className="px-8 pb-8 -mt-16 relative">
                <div className="inline-block p-1 bg-gsrp-dark-border/30 backdrop-blur-xl rounded-[2.5rem] mb-4 shadow-xl">
                  <div className="w-32 h-32 rounded-[2.2rem] overflow-hidden border-2 border-gsrp-dark/50 bg-gsrp-dark">
                    <img src={roblox.headshotUrl} alt={roblox.username} className="w-full h-full object-cover" />
                  </div>
                </div>

                <div className="mb-6">
                  <h1 className="text-white font-bold text-2xl mb-1 flex items-center gap-2">
                    {roblox.displayName}
                    {roblox.displayName !== roblox.username && (
                      <span className="text-gsrp-teal-light/30 text-sm font-medium">@{roblox.username}</span>
                    )}
                  </h1>
                  <p className="text-gsrp-teal-light/40 text-xs font-mono uppercase tracking-[0.2em]">Roblox Official Account</p>
                </div>

                {roblox.description && (
                  <div className="mb-8">
                    <h3 className="text-gsrp-teal-light/40 text-[10px] font-bold uppercase tracking-widest mb-2">Bio</h3>
                    <div className="bg-gsrp-dark/30 rounded-2xl p-4 border border-gsrp-dark-border/20">
                      <p className="text-gsrp-teal-light/80 text-sm leading-relaxed italic line-clamp-4">
                        {roblox.description}
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-gsrp-teal-light/40 text-[10px] font-bold uppercase tracking-widest mb-3">Currently Wearing</h3>
                  <div className="flex flex-wrap gap-2">
                    {wornAssets.slice(0, 8).map((asset, i) => (
                      <span key={i} className="px-3 py-1.5 bg-gsrp-dark-surface/60 border border-gsrp-dark-border/30 rounded-lg text-gsrp-teal-light/70 text-[11px] font-semibold">
                        {asset}
                      </span>
                    ))}
                    {wornAssets.length > 8 && (
                      <span className="px-3 py-1.5 bg-gsrp-dark-surface/30 border border-gsrp-dark-border/20 rounded-lg text-gsrp-teal-light/30 text-[11px] font-semibold">
                        +{wornAssets.length - 8} more
                      </span>
                    )}
                    {wornAssets.length === 0 && (
                      <span className="px-3 py-1.5 bg-gsrp-dark-surface/30 border border-gsrp-dark-border/20 rounded-lg text-gsrp-teal-light/30 text-[11px] font-semibold">
                        No wearable assets returned
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-8 pt-8 border-t border-gsrp-dark-border/20">
                  <button
                    onClick={handleUnlink}
                    disabled={isUnlinking}
                    className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group/btn"
                  >
                    {isUnlinking ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Unlinking Account...
                      </>
                    ) : (
                      <>
                        < ShieldCheck size={14} className="group-hover/btn:scale-110 transition-transform" />
                        Unlink Roblox Account
                      </>
                    )}
                  </button>
                  <p className="text-center text-[9px] text-gsrp-teal-light/20 mt-3 font-medium uppercase tracking-widest italic">
                    Unlinking will reset your Discord roles & nickname
                  </p>
                </div>
              </div>
            </div>

            {/* AVATAR PREVIEW */}
            <div className="card-glass rounded-3xl p-6 flex flex-col items-center gap-4 relative overflow-hidden">
               <h3 className="self-start text-gsrp-teal-light/40 text-[10px] font-bold uppercase tracking-widest mb-2">Avatar Appearance</h3>
               <div className="relative w-full aspect-square max-w-[280px] bg-gsrp-dark/20 rounded-2xl flex items-center justify-center overflow-hidden border border-gsrp-dark-border/20 group">
                  <div className="absolute inset-0 bg-gradient-to-t from-gsrp-dark/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <img src={roblox.avatarUrl} alt="Avatar" className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-700" />
               </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* DISCORD CARD */}
            <div className="card-glass rounded-3xl p-8 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-gsrp-teal/5 rounded-full blur-3xl -mr-16 -mt-16" />
               
               <div className="flex items-center gap-6 mb-8 relative">
                 <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gsrp-dark border border-gsrp-dark-border/50 shadow-lg">
                    <img src={session.user.image} alt={session.user.name} className="w-full h-full object-cover" />
                 </div>
                 <div>
                    <h2 className="text-white font-bold text-2xl mb-1">{discord.name}</h2>
                    <p className="text-gsrp-orange font-bold text-[10px] uppercase tracking-widest">{discord.id}</p>
                 </div>
               </div>

               <div>
                 <h3 className="text-gsrp-teal-light/40 text-[10px] font-bold uppercase tracking-widest mb-4">Discord Server Roles</h3>
                 <div className="flex flex-wrap gap-2">
                     {discordRoles.map((role, i) => (
                      <span key={i} className="px-4 py-2 bg-gsrp-dark-surface/40 hover:bg-gsrp-dark-surface/60 border border-gsrp-dark-border/20 hover:border-gsrp-teal/30 transition-all rounded-xl text-gsrp-teal-light/80 text-xs font-bold shadow-sm">
                        {role}
                      </span>
                     ))}
                     {discordRoles.length === 0 && (
                       <span className="px-4 py-2 bg-gsrp-dark-surface/30 border border-gsrp-dark-border/20 rounded-xl text-gsrp-teal-light/30 text-xs font-bold">
                         No roles returned
                       </span>
                     )}
                 </div>
               </div>
            </div>

            {/* RECENT ACTIVITY / LOGS */}
            <div className="card-glass rounded-3xl p-8 flex-1">
               <h3 className="text-gsrp-teal-light/40 text-[10px] font-bold uppercase tracking-widest mb-6 flex items-center justify-between">
                  Recent User Logs (Melonly)
                  <span className="text-[9px] lowercase font-normal italic px-2 py-0.5 rounded-full bg-gsrp-dark/50 border border-gsrp-dark-border/30">api.melonly.xyz</span>
               </h3>

               <div className="space-y-3">
                 {melonlyLogs.length > 0 ? (
                   melonlyLogs.map((log, i) => (
                     <div key={i} className="group p-4 bg-gsrp-dark/30 hover:bg-gsrp-dark/50 border border-gsrp-dark-border/20 rounded-2xl transition-all">
                        <div className="flex items-center justify-between mb-2">
                           <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                             log.typeId === 'ban' ? 'bg-red-500/20 text-red-400' : 
                             log.typeId === 'kick' ? 'bg-orange-500/20 text-orange-400' :
                             'bg-gsrp-teal/20 text-gsrp-teal-light'
                           }`}>
                              {log.typeId || 'Log'}
                           </span>
                           <span className="text-[10px] text-gsrp-teal-light/30">{new Date(log.createdAt * 1000).toLocaleDateString()}</span>
                        </div>
                        <p className="text-gsrp-teal-light/70 text-sm mb-2">{log.text}</p>
                        <div className="flex items-center justify-between">
                           <span className="text-[10px] text-gsrp-teal-light/40">Moderator: <span className="text-white/60">{log.createdBy}</span></span>
                        </div>
                     </div>
                   ))
                 ) : (
                   <div className="text-center py-12 bg-gsrp-dark/10 rounded-2xl border border-dashed border-gsrp-dark-border/30">
                      <p className="text-gsrp-teal-light/20 text-sm italic">No recent activity logs found</p>
                   </div>
                 )}
               </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#0A0E1A]">
      <div className="max-w-md w-full">
        <Link href="/" className="inline-flex items-center gap-2 text-gsrp-teal-light/40 hover:text-gsrp-orange-light text-[10px] font-bold uppercase tracking-widest transition-colors mb-8 cursor-pointer">
          <ArrowLeft size={12} /> Back to Dashboard
        </Link>

        <div className="card-glass rounded-2xl p-8 text-center shadow-2xl animate-scale-in border-gsrp-dark-border/50">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gsrp-teal/20 to-gsrp-orange/20 border border-gsrp-teal/20 flex items-center justify-center mx-auto mb-6">
            <ShieldCheck size={28} className="text-gsrp-teal-light" />
          </div>

          {status === 'idle' && (
            <>
              <h1 className="text-white font-bold text-xl mb-2">Roblox Verification</h1>
              <p className="text-gsrp-teal-light/40 text-sm mb-2">
                Link your Roblox account to <span className="text-white font-medium">{session.user.name}</span>
              </p>
              <p className="text-gsrp-teal-light/30 text-xs mb-6">
                You will be redirected to Roblox to authorize the connection.
              </p>
              <a
                href={robloxAuthUrl}
                className="inline-flex items-center gap-2 bg-[#E22323] hover:bg-[#c41e1e] text-white px-6 py-3 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer shadow-lg shadow-red-600/10"
              >
                <Gamepad2 size={18} />
                Verify with Roblox
              </a>
            </>
          )}

          {status === 'loading' && (
            <>
              <h1 className="text-white font-bold text-xl mb-2">Processing Verification</h1>
              <div className="flex justify-center mb-4">
                <Loader2 className="w-8 h-8 text-gsrp-orange animate-spin" />
              </div>
              <p className="text-gsrp-teal-light/40 text-sm">Verifying your Roblox identity...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <h1 className="text-green-400 font-bold text-xl mb-2">Verification Complete</h1>
              <p className="text-gsrp-teal-light/40 text-sm mb-6">{message}</p>
              <Link href="/" className="inline-flex items-center gap-2 text-gsrp-orange hover:text-gsrp-orange-light text-sm font-bold transition-colors cursor-pointer">
                <ArrowLeft size={14} /> Back to Dashboard
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <h1 className="text-red-400 font-bold text-xl mb-2">Verification Failed</h1>
              <p className="text-gsrp-teal-light/40 text-sm mb-6">{message}</p>
              <a
                href={robloxAuthUrl}
                className="inline-flex items-center gap-2 bg-[#E22323] hover:bg-[#c41e1e] text-white px-6 py-3 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer shadow-lg shadow-red-600/10"
              >
                <Gamepad2 size={18} />
                Try Again
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
