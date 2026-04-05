import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { Loader2, ShieldCheck, ArrowLeft, Gamepad2 } from 'lucide-react';
import Link from 'next/link';
import LoginScreen from '../../components/auth/LoginScreen';

const ROBLOX_CLIENT_ID = '4646799346124146894';
const REDIRECT_URI = process.env.NEXT_PUBLIC_VERCEL_URL
  ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}/verify`
  : 'https://georgia-state-rp-dashboard.vercel.app/verify';

export default function VerifyPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');

    if (!code) return;

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
      return;
    }

    setStatus('loading');

    try {
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    } catch {}

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
      } else {
        throw new Error(data?.error || 'An unexpected error occurred.');
      }
    })
    .catch(err => {
      clearTimeout(timeout);
      setStatus('error');
      if (err.name === 'AbortError') {
        setMessage('Request timed out. Please try again.');
      } else {
        setMessage(err.message || 'An unexpected error occurred.');
      }
    });
  }, []);

  if (sessionStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gsrp-orange animate-spin" />
      </div>
    );
  }

  if (!session) return <LoginScreen />;

  const discordId = session.user.id;
  const robloxAuthUrl = `https://authorize.roblox.com/?client_id=${ROBLOX_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=openid%20profile&state=${discordId}`;

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <Link href="/" className="inline-flex items-center gap-2 text-gsrp-teal-light/40 hover:text-gsrp-orange-light text-[10px] font-bold uppercase tracking-widest transition-colors mb-8 cursor-pointer">
          <ArrowLeft size={12} /> Back to Dashboard
        </Link>

        <div className="card-glass rounded-2xl p-8 text-center shadow-2xl animate-scale-in">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gsrp-teal/20 to-gsrp-orange/20 border border-gsrp-teal/20 flex items-center justify-center mx-auto mb-6">
            <ShieldCheck size={28} className="text-gsrp-teal-light" />
          </div>

          {status === 'idle' && (
            <>
              <h1 className="text-white font-black text-xl mb-2">Roblox Verification</h1>
              <p className="text-gsrp-teal-light/40 text-sm mb-2">
                Link your Roblox account to <span className="text-white font-medium">{session.user.name}</span>
              </p>
              <p className="text-gsrp-teal-light/30 text-xs mb-6">
                You will be redirected to Roblox to authorize the connection.
              </p>
              <a
                href={robloxAuthUrl}
                className="inline-flex items-center gap-2 bg-[#E22323] hover:bg-[#c41e1e] text-white px-6 py-3 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer"
              >
                <Gamepad2 size={18} />
                Verify with Roblox
              </a>
            </>
          )}

          {status === 'loading' && (
            <>
              <h1 className="text-white font-black text-xl mb-2">Processing Verification</h1>
              <div className="flex justify-center mb-4">
                <Loader2 className="w-8 h-8 text-gsrp-orange animate-spin" />
              </div>
              <p className="text-gsrp-teal-light/40 text-sm">Verifying your Roblox identity...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <h1 className="text-green-400 font-black text-xl mb-2">Verification Complete</h1>
              <p className="text-gsrp-teal-light/40 text-sm mb-6">{message}</p>
              <Link href="/" className="inline-flex items-center gap-2 text-gsrp-orange hover:text-gsrp-orange-light text-sm font-bold transition-colors cursor-pointer">
                <ArrowLeft size={14} /> Back to Dashboard
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <h1 className="text-red-400 font-black text-xl mb-2">Verification Failed</h1>
              <p className="text-gsrp-teal-light/40 text-sm mb-6">{message}</p>
              <a
                href={robloxAuthUrl}
                className="inline-flex items-center gap-2 bg-[#E22323] hover:bg-[#c41e1e] text-white px-6 py-3 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer"
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
