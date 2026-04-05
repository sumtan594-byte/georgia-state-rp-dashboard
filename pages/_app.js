import '../styles/globals.css';
import { SessionProvider } from "next-auth/react";
import { useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import TopBar from "../components/layout/TopBar";

export default function App({ Component, pageProps: { session, ...pageProps } }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const isPublicPage = typeof window !== 'undefined' && (
    window.location.pathname === '/verify' ||
    window.location.pathname === '/privacy-policy' ||
    window.location.pathname === '/terms-of-service' ||
    window.location.pathname === '/login'
  );

  if (isPublicPage) {
    return (
      <SessionProvider session={session}>
        <div className="min-h-screen relative">
          <div className="fixed inset-0 z-0">
            <img src="https://i.imgur.com/QVVQSK2.png" alt="" className="w-full h-full object-cover" aria-hidden="true" />
            <div className="absolute inset-0 bg-gsrp-dark/80" />
          </div>
          <div className="relative z-10">
            <Component {...pageProps} />
          </div>
        </div>
      </SessionProvider>
    );
  }

  return (
    <SessionProvider session={session}>
      <div className="min-h-screen relative">
        <div className="fixed inset-0 z-0">
          <img src="https://i.imgur.com/QVVQSK2.png" alt="" className="w-full h-full object-cover" aria-hidden="true" />
          <div className="absolute inset-0 bg-gsrp-dark/80" />
        </div>

        <div className="relative z-10 flex min-h-screen">
          <div className={`hidden md:block flex-shrink-0 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-[72px]'}`}>
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
