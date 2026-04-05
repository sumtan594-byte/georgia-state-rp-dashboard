import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { Loader2, ShieldCheck, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function VerifyPage() {
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
      setMessage('Invalid verification session. Please restart from Discord.');
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
              <p className="text-gsrp-teal-light/40 text-sm mb-6">
                Join our Discord server, press Verify in the verification channel, and complete Roblox authentication. You will be redirected back here automatically.
              </p>
              <a
                href="https://discord.gg/gsrp7"
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-2 bg-[#5865F2] hover:bg-[#4752c4] text-white px-6 py-3 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.872-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128c.125-.094.25-.188.372-.284a.076.076 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.076.076 0 01.078.01c.12.096.245.19.37.284a.077.077 0 01-.006.127 12.3 12.3 0 01-1.873.892.077.077 0 00-.041.107c.36.698.77 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.41 0-1.325.956-2.41 2.157-2.41 1.21 0 2.176 1.095 2.157 2.41 0 1.325-.956 2.41-2.157 2.41zm7.975 0c-1.183 0-2.157-1.085-2.157-2.41 0-1.325.955-2.41 2.157-2.41 1.21 0 2.176 1.095 2.157 2.41 0 1.325-.946 2.41-2.157 2.41z" />
                </svg>
                Join Discord Server
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
              <p className="text-gsrp-teal-light/40 text-sm">{message}</p>
            </>
          )}

          {status === 'error' && (
            <>
              <h1 className="text-red-400 font-black text-xl mb-2">Verification Failed</h1>
              <p className="text-gsrp-teal-light/40 text-sm mb-4">{message}</p>
              <a href="https://discord.gg/gsrp7" target="_blank" rel="noopener" className="inline-flex items-center gap-2 text-gsrp-orange hover:text-gsrp-orange-light text-sm font-bold transition-colors cursor-pointer">
                Try Again
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
