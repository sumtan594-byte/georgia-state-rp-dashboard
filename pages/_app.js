import '../styles/globals.css';
import { SessionProvider, useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from 'next/router';
import Sidebar from "../components/layout/Sidebar";
import TopBar from "../components/layout/TopBar";

function DebugSessionLogger() {
  const { status, data } = useSession();
  useEffect(() => {
    // console.log('[APP] SessionProvider status:', status);
  }, [status, data]);
  return null;
}

export default function App({ Component, pageProps: { session, ...pageProps } }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const publicRoutes = ['/verify', '/privacy-policy', '/terms-of-service', '/login'];
  const isPublicPage = publicRoutes.includes(router.pathname);

  // ─── PRE-HYDRATION ────────────────────────────────────────────────────────
  // Before the client is mounted we must NOT render the real app shell.
  // The old code rendered the full layout here, which caused React to unmount
  // and remount the ENTIRE tree (including WelcomeOverlay) the moment
  // `mounted` flipped to true — killing every in-flight rAF timer and ref.
  //
  // Instead, render only an inert background so there is no visible flash,
  // and let the real shell mount exactly once after hydration.
  if (!mounted) {
    return (
      <SessionProvider session={session}>
        <div className="min-h-screen relative">
          <div className="fixed inset-0 z-0">
            <img
              src="https://i.imgur.com/QVVQSK2.png"
              alt=""
              className="w-full h-full object-cover"
              aria-hidden="true"
            />
            <div className="absolute inset-0 bg-gsrp-dark/80" />
          </div>
        </div>
      </SessionProvider>
    );
  }

  // ─── PUBLIC ROUTES (no sidebar / topbar) ─────────────────────────────────
  if (isPublicPage) {
    return (
      <SessionProvider session={session}>
        <DebugSessionLogger />
        <div className="min-h-screen relative">
          <div className="fixed inset-0 z-0">
            <img
              src="https://i.imgur.com/QVVQSK2.png"
              alt=""
              className="w-full h-full object-cover"
              aria-hidden="true"
            />
            <div className="absolute inset-0 bg-gsrp-dark/80" />
          </div>
          <div className="relative z-10">
            <Component {...pageProps} />
          </div>
        </div>
      </SessionProvider>
    );
  }

  // ─── AUTHENTICATED APP SHELL ──────────────────────────────────────────────
  return (
    <SessionProvider session={session}>
      <DebugSessionLogger />
      <div className="min-h-screen relative">
        <div className="fixed inset-0 z-0">
          <img
            src="https://i.imgur.com/QVVQSK2.png"
            alt=""
            className="w-full h-full object-cover"
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gsrp-dark/80" />
        </div>

        <div className="relative z-10 flex min-h-screen">
          <div
            className={`hidden md:block flex-shrink-0 transition-all duration-300 ${
              sidebarOpen ? 'w-64' : 'w-[72px]'
            }`}
          >
            <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
          </div>

          <div className="flex-1 flex flex-col min-w-0">
            <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
              <Component {...pageProps} />
            </main>
          </div>
        </div>
      </div>
    </SessionProvider>
  );
}
