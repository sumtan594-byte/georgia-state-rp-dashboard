import '../styles/globals.css';
import 'leaflet/dist/leaflet.css';
import { SessionProvider, useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from 'next/router';
import Sidebar from "../components/layout/Sidebar";
import TopBar from "../components/layout/TopBar";
import WelcomeScreen from "../components/auth/WelcomeScreen";
import { UserRefreshProvider } from "../lib/UserRefreshContext";
import { motion } from 'framer-motion';

function DebugSessionLogger() {
  const { status, data } = useSession();
  return null;
}

function AppContent({ Component, pageProps, sidebarOpen, setSidebarOpen, isPublicPage, animationFinished, isPanelPage }) {
  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 z-0">
        <img src="https://i.imgur.com/QVVQSK2.png" alt="" className="w-full h-full object-cover" aria-hidden="true" />
        <div className="absolute inset-0 bg-gsrp-dark/80" />
      </div>

      {isPublicPage ? (
        <div className="relative z-10">
          <Component {...pageProps} />
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={animationFinished ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative z-10 flex min-h-screen"
        >
          {/* Desktop sidebar */}
          <div className={`hidden md:block flex-shrink-0 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-[72px]'}`}>
            <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
          </div>

          {/* Mobile sidebar overlay */}
          {sidebarOpen && (
            <div className="md:hidden fixed inset-0 z-50">
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
              <div className="fixed left-0 top-0 h-screen w-64 shadow-2xl">
                <Sidebar open={true} onToggle={() => setSidebarOpen(false)} />
              </div>
            </div>
          )}

          <div className="flex-1 flex flex-col min-w-0">
            <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
            <main className={`flex-1 ${isPanelPage ? 'p-0' : 'p-4 md:p-6 lg:p-8'}`}>
              <Component {...pageProps} />
            </main>
          </div>
        </motion.div>
      )}
    </div>
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
        />
      </UserRefreshProvider>
    </SessionProvider>
  );
}
