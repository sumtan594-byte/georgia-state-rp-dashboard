import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { Loader2, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default function LoginScreen() {
  const { status, data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    console.log('[LOGIN] LoginScreen mounted');
    console.log('[LOGIN] Session status:', status);
    console.log('[LOGIN] Session data:', session);
    console.log('[LOGIN] URL params:', router.query);
    console.log('[LOGIN] Current URL:', window.location.href);

    if (router.query.error) {
      console.error('[LOGIN] OAuth error detected:', router.query.error);
      console.error('[LOGIN] Full query:', router.query);
    }
  }, [status, session, router.query]);

  useEffect(() => {
    console.log(`[LOGIN] Session status changed: "${status}"`);
  }, [status]);

  const handleDiscordLogin = async () => {
    console.log('[LOGIN] 🖱️ Discord login button CLICKED');
    console.log('[LOGIN] Calling signIn("discord")...');
    try {
      await signIn('discord', { callbackUrl: '/' });
      console.log('[LOGIN] signIn() resolved');
    } catch (err) {
      console.error('[LOGIN] signIn() threw error:', err);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center relative">
        <div className="relative z-10 flex flex-col items-center">
          <Loader2 className="w-8 h-8 text-gsrp-orange animate-spin mb-4" />
          <span className="text-gsrp-teal-light/40 font-mono text-[9px] uppercase tracking-[0.3em]">Loading</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative">
      <div className="relative z-10 max-w-md w-full">
        <div className="card-glass rounded-2xl p-8 text-center shadow-2xl animate-scale-in">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gsrp-orange/20 to-gsrp-teal/20 border border-gsrp-orange/20 flex items-center justify-center mx-auto mb-6">
            <ShieldAlert size={28} className="text-gsrp-orange" />
          </div>
          <h1 className="text-white font-black text-xl mb-2">Sign In Required</h1>
          <p className="text-gsrp-teal-light/40 text-sm mb-8">
            You must be a member of the Georgia State Roleplay Discord server to access this dashboard.
          </p>
          <button
            onClick={handleDiscordLogin}
            className="inline-flex items-center gap-2 bg-[#5865F2] hover:bg-[#4752c4] text-white px-6 py-3 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.872-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128c.125-.094.25-.188.372-.284a.076.076 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.076.076 0 01.078.01c.12.096.245.19.37.284a.077.077 0 01-.006.127 12.3 12.3 0 01-1.873.892.077.077 0 00-.041.107c.36.698.77 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.41 0-1.325.956-2.41 2.157-2.41 1.21 0 2.176 1.095 2.157 2.41 0 1.325-.956 2.41-2.157 2.41zm7.975 0c-1.183 0-2.157-1.085-2.157-2.41 0-1.325.955-2.41 2.157-2.41 1.21 0 2.176 1.095 2.157 2.41 0 1.325-.946 2.41-2.157 2.41z" />
            </svg>
            Sign in with Discord
          </button>
          <div className="mt-6 flex items-center justify-center gap-4">
            <Link href="/privacy-policy" className="text-[10px] text-gsrp-teal-light/30 hover:text-gsrp-teal-light/60 transition-colors">
              Privacy Policy
            </Link>
            <span className="text-gsrp-dark-border/50">|</span>
            <Link href="/terms-of-service" className="text-[10px] text-gsrp-teal-light/30 hover:text-gsrp-teal-light/60 transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
