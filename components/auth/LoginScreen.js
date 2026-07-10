import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { Loader2, ShieldAlert, Lock } from 'lucide-react';
import { AuthSkeleton } from '../SkeletonLoader';
import Link from 'next/link';

export default function LoginScreen() {
  const { status, data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (router.query.error) {
      console.error('[LOGIN] OAuth error detected:', router.query.error);
    }
  }, [router.query]);

  const getCallbackUrl = () => {
    const raw = Array.isArray(router.query.callbackUrl)
      ? router.query.callbackUrl[0]
      : router.query.callbackUrl;

    if (!raw) return '/dashboard';

    try {
      const url = new URL(raw, window.location.origin);
      if (url.origin !== window.location.origin) return '/dashboard';
      return `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return '/dashboard';
    }
  };

  const handleDiscordLogin = async () => {
    try {
      await signIn('discord', { callbackUrl: getCallbackUrl() });
    } catch (err) {
      console.error('[LOGIN] signIn() threw error:', err);
    }
  };

  if (status === 'loading') {
    return <AuthSkeleton />;
  }

  const accessDenied = router.query.error === 'AccessDenied';

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative">
      <div className="relative z-10 grid lg:grid-cols-2 items-center gap-10 lg:gap-16 max-w-5xl w-full">
        {/* Access card */}
        <div className="w-full max-w-md mx-auto lg:mx-0 order-2 lg:order-1">
          <div className="tac-panel rounded-3xl p-8 shadow-tac-3 animate-scale-in">
            <div className="flex items-center gap-3 mb-7">
              <img src="https://i.imgur.com/70GfmYd.gif" alt="GSRP" className="w-9 h-9 rounded-xl object-cover ring-1 ring-white/10" />
              <span className="font-display font-extrabold text-white tracking-tight">Georgia State Roleplay</span>
            </div>

            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border ${accessDenied ? 'border-gsrp-sunset/30 bg-gsrp-sunset/10' : 'border-gsrp-orange/25 bg-gradient-to-br from-gsrp-orange/15 to-gsrp-teal/12'}`}>
              {accessDenied
                ? <ShieldAlert size={26} className="text-gsrp-sunset" />
                : <Lock size={24} className="text-gsrp-orange" />}
            </div>

            {accessDenied ? (
              <>
                <h1 className="font-display text-white font-extrabold text-2xl tracking-tight mb-2">Access Denied</h1>
                <p className="text-gsrp-teal-light/55 text-sm leading-relaxed mb-6">
                  You are not a member of the Georgia State Roleplay Discord server. Membership is required to access the dashboard.
                </p>
                <a
                  href="https://discord.gg/gsrp7"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-gsrp-teal hover:bg-gsrp-teal-light text-white px-6 py-3.5 rounded-xl font-bold text-sm transition-colors duration-200 cursor-pointer mb-3 w-full justify-center"
                >
                  Join our Discord
                </a>
              </>
            ) : (
              <>
                <h1 className="font-display text-white font-extrabold text-2xl tracking-tight mb-2">Sign In Required</h1>
                <p className="text-gsrp-teal-light/55 text-sm leading-relaxed mb-7">
                  Sign in with Discord to access the dashboard. You must be a member of the Georgia State Roleplay server.
                </p>
              </>
            )}

            <button
              onClick={handleDiscordLogin}
              className="group relative inline-flex items-center gap-2.5 bg-[#5865F2] hover:bg-[#4752c4] text-white px-6 py-3.5 rounded-xl font-bold text-sm transition-colors duration-200 cursor-pointer w-full justify-center shadow-tac-2 overflow-hidden"
            >
              <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-white/15 to-transparent" aria-hidden="true" />
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.872-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128c.125-.094.25-.188.372-.284a.076.076 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.076.076 0 01.078.01c.12.096.245.19.37.284a.077.077 0 01-.006.127 12.3 12.3 0 01-1.873.892.077.077 0 00-.041.107c.36.698.77 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.41 0-1.325.956-2.41 2.157-2.41 1.21 0 2.176 1.095 2.157 2.41 0 1.325-.956 2.41-2.157 2.41zm7.975 0c-1.183 0-2.157-1.085-2.157-2.41 0-1.325.955-2.41 2.157-2.41 1.21 0 2.176 1.095 2.157 2.41 0 1.325-.946 2.41-2.157 2.41z" />
              </svg>
              Sign in with Discord
            </button>

            <div className="mt-6 pt-5 border-t border-gsrp-dark-border/40 flex items-center justify-center gap-4">
              <Link href="/privacy-policy" className="text-[11px] text-gsrp-teal-light/35 hover:text-gsrp-orange transition-colors">
                Privacy Policy
              </Link>
              <span className="w-1 h-1 rounded-full bg-gsrp-dark-border" />
              <Link href="/terms-of-service" className="text-[11px] text-gsrp-teal-light/35 hover:text-gsrp-orange transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>

        {/* Identity panel */}
        <div className="hidden lg:flex flex-col items-start order-1 lg:order-2">
          <div className="relative mb-8">
            <div className="absolute -inset-6 bg-gradient-to-br from-gsrp-orange/15 to-gsrp-teal/12 rounded-[2.5rem] blur-3xl" aria-hidden="true" />
            <img
              src="https://i.imgur.com/70GfmYd.gif"
              alt="Georgia State Roleplay emblem"
              className="relative w-36 h-36 rounded-3xl border border-white/10 object-cover shadow-tac-3"
            />
          </div>
          <h2 className="font-display text-white font-extrabold text-4xl xl:text-5xl leading-[1.02] tracking-tight">
            Georgia State<br /><span className="text-gsrp-orange">Roleplay</span>
          </h2>
        </div>
      </div>
    </div>
  );
}
