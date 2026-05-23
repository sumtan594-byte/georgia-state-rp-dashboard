import '../styles/globals.css';
import 'leaflet/dist/leaflet.css';
import { SessionProvider, useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from 'next/router';
import Sidebar from "../components/layout/Sidebar";
import TopBar from "../components/layout/TopBar";
import WelcomeScreen from "../components/auth/WelcomeScreen";
import { UserRefreshProvider } from "../lib/UserRefreshContext";
import { ToastProvider } from "../lib/ToastContext";
import { motion, AnimatePresence } from 'framer-motion';

function DebugSessionLogger() {
  const { status, data } = useSession();
  return null;
}

function AuthGuard({ isPublicPage, children }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated' && !isPublicPage) {
      router.replace('/login');
    }
  }, [status, isPublicPage, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-2 border-gsrp-orange/20 border-t-gsrp-orange rounded-full animate-spin mb-4" />
          <span className="text-gsrp-teal-light/50 font-mono text-[9px] uppercase tracking-[0.3em]">Loading</span>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated' && !isPublicPage) {
    return null;
  }

  return children;
}

function AppContent({ Component, pageProps, sidebarOpen, setSidebarOpen, isPublicPage, animationFinished, isPanelPage, routerPath }) {
  return (
    <AuthGuard isPublicPage={isPublicPage}>
      <div className="min-h-screen relative">
        <div className="fixed inset-0 z-0">
          <img src="https://i.imgur.com/QVVQSK2.png" alt="" className="w-full h-full object-cover" aria-hidden="true" />
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
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="relative z-10 flex min-h-screen"
          >
            <div className={`hidden md:block flex-shrink-0 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-[72px]'}`}>
              <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
            </div>

            {sidebarOpen && (
              <div className="md:hidden fixed inset-0 z-50">
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
                <div className="fixed left-0 top-0 h-screen w-64 max-w-[80vw] shadow-2xl">
                  <Sidebar open={true} onToggle={() => setSidebarOpen(false)} />
                </div>
              </div>
            )}

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

function RouteLoadingBar() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const start = () => setLoading(true);
    const end = () => setLoading(false);

    router.events.on('routeChangeStart', start);
    router.events.on('routeChangeComplete', end);
    router.events.on('routeChangeError', end);

    return () => {
      router.events.off('routeChangeStart', start);
      router.events.off('routeChangeComplete', end);
      router.events.off('routeChangeError', end);
    };
  }, [router]);

  return (
    <div
      className={`fixed top-0 left-0 z-[100] h-0.5 bg-gradient-to-r from-gsrp-orange via-gsrp-teal to-gsrp-orange transition-all duration-300 ease-out ${
        loading ? 'w-full opacity-100' : 'w-0 opacity-0'
      }`}
      style={{
        backgroundSize: '200% 100%',
        animation: loading ? 'shimmer 1s linear infinite' : 'none',
      }}
    />
  );
}

export default function App({ Component, pageProps: { session, ...pageProps } }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [animationFinished, setAnimationFinished] = useState(true);

  useEffect(() => {
    setMounted(true);
    const publicRoutes = ['/verify', '/privacy-policy', '/terms-of-service', '/login'];
    const isPublicPage = publicRoutes.includes(router.pathname);

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

  const publicRoutes = ['/verify', '/privacy-policy', '/terms-of-service', '/login'];
  const isPublicPage = publicRoutes.includes(router.pathname);

  if (!mounted) return null;

  return (
    <SessionProvider session={session}>
      <UserRefreshProvider>
        <ToastProvider>
          <RouteLoadingBar />

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
            isPanelPage={router.pathname === '/panel'}
            routerPath={router.pathname}
          />
        </ToastProvider>
      </UserRefreshProvider>
    </SessionProvider>
  );
}
