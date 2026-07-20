import '../styles/globals.css';
import 'leaflet/dist/leaflet.css';
import Head from 'next/head';
import { SessionProvider, useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from 'next/router';
import Sidebar from "../components/layout/Sidebar";
import TopBar from "../components/layout/TopBar";
import WelcomeScreen from "../components/auth/WelcomeScreen";
import AccessDenied from "../components/auth/AccessDenied";
import { UserRefreshProvider, useRefreshedUser } from "../lib/UserRefreshContext";
import { ToastProvider } from "../lib/ToastContext";
import { ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { EMBED_IMAGE, EMBED_THEME_COLOR, getRouteEmbed } from '../lib/discord-embeds';
import { DEFAULT_SOCIAL_IMAGE, absoluteUrl, getSeoForPath, isPublicRoute } from '../lib/seo';
import { PageSkeleton } from '../components/SkeletonLoader';

function DebugSessionLogger() {
  const { status, data } = useSession();
  return null;
}

function AuthGuard({ isPublicPage, children }) {
  const { data: session, status } = useSession();
  const { accessDenied } = useRefreshedUser();
  const router = useRouter();

  // Banned users may sign in solely to reach /ban-appeals; keep them out of
  // the member-facing dashboard entirely.
  const isBanned = session?.user?.banned === true;

  useEffect(() => {
    if (status === 'unauthenticated' && !isPublicPage) {
      router.replace('/login');
    }
  }, [status, isPublicPage, router]);

  useEffect(() => {
    if (isBanned && !isPublicPage && router.pathname !== '/ban-appeals') {
      router.replace('/ban-appeals');
    }
  }, [isBanned, isPublicPage, router]);

  // Public pages (landing, verify, policies, login) must render their real
  // content immediately, even before the session resolves, so crawlers and
  // first paint get the marketing/page HTML instead of a loading spinner.
  if (status === 'loading' && !isPublicPage) {
    return <div className="min-h-screen p-4 md:p-8"><PageSkeleton /></div>;
  }

  if (status === 'unauthenticated' && !isPublicPage) {
    return null;
  }

  if (isBanned && !isPublicPage) {
    return null;
  }

  if (!isPublicPage && accessDenied) {
    return <AccessDenied {...accessDenied} />;
  }

  return children;
}

function AppContent({ Component, pageProps, sidebarOpen, setSidebarOpen, isPublicPage, animationFinished, isPanelPage, routerPath }) {
  return (
    <AuthGuard isPublicPage={isPublicPage}>
      <div className="min-h-screen relative">
        <div className="fixed inset-0 z-0">
          <img src="/media/Background.png" alt="" className="w-full h-full object-cover" aria-hidden="true" />
          <div className="absolute inset-0 bg-gsrp-dark/80" />
        </div>

        {isPublicPage || isPanelPage ? (
        <div className={`relative z-10 ${isPanelPage ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
          <Component {...pageProps} />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={routerPath}
            initial={{ opacity: 0, y: 20 }}
            animate={animationFinished ? { opacity: 1, y: 0 } : {}}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex min-h-screen"
          >
            <div className={`hidden md:block flex-shrink-0 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-[72px]'}`}>
              <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
            </div>

            <AnimatePresence>
              {sidebarOpen && (
                <motion.div className="md:hidden fixed inset-0 z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
                  <motion.div
                    initial={{ x: -280 }}
                    animate={{ x: 0 }}
                    exit={{ x: -280 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 38 }}
                    className="fixed left-0 top-0 h-screen w-64 max-w-[80vw] shadow-2xl"
                  >
                    <Sidebar open={true} onToggle={() => setSidebarOpen(false)} />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex-1 flex flex-col min-w-0">
              <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
              <main className="flex-1 p-4 md:p-6 lg:p-8">
                <Component {...pageProps} />
              </main>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
    </AuthGuard>
  );
}

const SUPPORT_TICKET_URL = 'https://discord.com/channels/1366688107788894280/1372499646223482930';

function ProxyBlockOverlay() {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-gsrp-dark">
      <div className="max-w-md mx-auto px-6 text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
          <ShieldAlert className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">VPN / Proxy Alert</h1>
        <p className="text-gray-400 text-sm leading-relaxed mb-6">
          To avoid attacks and malicious activity, we require all users to access the website without a VPN.
          Please turn your VPN / proxy off and refresh the page.
        </p>
        <p className="text-gray-500 text-sm mb-8">
          If the issue persists, please{' '}
          <a
            href={SUPPORT_TICKET_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gsrp-orange hover:underline font-semibold"
          >
            make a support ticket
          </a>.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 rounded-lg bg-gsrp-orange text-white font-semibold text-sm hover:bg-gsrp-orange/90 transition-colors cursor-pointer"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
}

function VisitorTracker({ setProxyBlocked }) {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'loading') return;
    const data = {
      userAgent: navigator.userAgent,
      page: window.location.pathname,
    };
    if (session?.user) {
      data.userId = session.user.id;
      data.username = session.user.name || '';
      data.avatar = session.user.image || '';
    } else {
      // Roblox verification visitors aren't logged in via Discord OAuth but
      // carry a Discord ID in the URL state param, pass it so the tracking
      // API can resolve their identity instead of logging an anonymous IP.
      try {
        const params = new URLSearchParams(window.location.search);
        const state = params.get('state');
        if (state && /^\d{17,20}$/.test(state.trim())) {
          data.discordId = state.trim();
        }
      } catch {}
    }
    fetch('/api/tracking/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
      .then(r => r.json())
      .then(json => {
        if (json.blocked) setProxyBlocked(true);
      })
      .catch(() => {});
  }, [router.pathname, session?.user?.id, status]);

  return null;
}

function RouteLoadingBar() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false);

  useEffect(() => {
    let skeletonTimer;
    const start = () => {
      setLoading(true);
      clearTimeout(skeletonTimer);
      skeletonTimer = setTimeout(() => setShowSkeleton(true), 120);
    };
    const end = () => {
      clearTimeout(skeletonTimer);
      setLoading(false);
      setShowSkeleton(false);
    };

    router.events.on('routeChangeStart', start);
    router.events.on('routeChangeComplete', end);
    router.events.on('routeChangeError', end);

    return () => {
      clearTimeout(skeletonTimer);
      router.events.off('routeChangeStart', start);
      router.events.off('routeChangeComplete', end);
      router.events.off('routeChangeError', end);
    };
  }, [router]);

  return (
    <>
      <div
        className={`fixed top-0 left-0 z-[100] h-0.5 bg-gradient-to-r from-gsrp-orange via-gsrp-teal to-gsrp-orange transition-all duration-300 ease-out ${
          loading ? 'w-full opacity-100' : 'w-0 opacity-0'
        }`}
        style={{
          backgroundSize: '200% 100%',
          animation: loading ? 'shimmer 1s linear infinite' : 'none',
        }}
      />
      <AnimatePresence>
        {showSkeleton && (
          <motion.div
            className="fixed inset-0 z-[90] overflow-y-auto bg-gsrp-dark/95 p-4 pt-20 backdrop-blur-xl md:p-8 md:pt-24"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <PageSkeleton />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function RouteHead({ asPath, pathname }) {
  const seo = getSeoForPath(asPath);
  const embed = getRouteEmbed(pathname);
  const title = seo.indexable ? seo.title : (embed ? `${embed.title} | GSRP` : seo.title);
  const description = seo.indexable ? seo.description : (embed?.description || seo.description);
  const url = absoluteUrl(seo.path);
  const image = seo.image || DEFAULT_SOCIAL_IMAGE || EMBED_IMAGE;

  return (
    <Head>
      <title key="title">{title}</title>
      <meta key="description" name="description" content={description} />
      <meta key="robots" name="robots" content={seo.indexable ? 'index, follow, max-image-preview:large' : 'noindex, nofollow, noarchive'} />
      {seo.indexable ? <link key="canonical" rel="canonical" href={url} /> : null}
      <meta key="og-title" property="og:title" content={title} />
      <meta key="og-description" property="og:description" content={description} />
      <meta key="og-image" property="og:image" content={image} />
      <meta key="og-image-alt" property="og:image:alt" content="Georgia State Roleplay community" />
      <meta key="og-type" property="og:type" content={seo.type || 'website'} />
      <meta key="og-url" property="og:url" content={url} />
      <meta key="og-site-name" property="og:site_name" content="Georgia State Roleplay" />
      <meta key="twitter-card" name="twitter:card" content="summary_large_image" />
      <meta key="twitter-title" name="twitter:title" content={title} />
      <meta key="twitter-description" name="twitter:description" content={description} />
      <meta key="twitter-image" name="twitter:image" content={image} />
      <meta key="theme-color" name="theme-color" content={EMBED_THEME_COLOR} />
    </Head>
  );
}

export default function App({ Component, pageProps: { session, ...pageProps } }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [animationFinished, setAnimationFinished] = useState(true);
  const [proxyBlocked, setProxyBlocked] = useState(false);

  useEffect(() => {
    const isPublicPage = isPublicRoute(router.asPath);

    if (!isPublicPage && !sessionStorage.getItem('hasSeenWelcome')) {
      setShowWelcome(true);
      setAnimationFinished(false);
    }
  }, [router.pathname]);

  const handleWelcomeComplete = () => {
    setShowWelcome(false);
    setAnimationFinished(true);
    sessionStorage.setItem('hasSeenWelcome', 'true');
  };

  const isPublicPage = isPublicRoute(router.asPath);

  return (
    <SessionProvider session={session}>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </Head>
      <UserRefreshProvider>
        <ToastProvider>
          <RouteHead asPath={router.asPath} pathname={router.pathname} />
          <RouteLoadingBar />
          <VisitorTracker setProxyBlocked={setProxyBlocked} />

          {proxyBlocked && <ProxyBlockOverlay />}

          {showWelcome && (
            <WelcomeScreen
              onComplete={handleWelcomeComplete}
            />
          )}

          <AppContent
            Component={Component}
            pageProps={pageProps}
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            isPublicPage={isPublicPage}
            animationFinished={animationFinished}
            isPanelPage={router.pathname.startsWith('/panel')}
            routerPath={router.pathname}
          />
        </ToastProvider>
      </UserRefreshProvider>
    </SessionProvider>
  );
}
