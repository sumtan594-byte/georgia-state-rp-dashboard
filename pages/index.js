import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { FileText, Map, BookOpen, ShieldCheck, Users, Loader2, ShoppingCart } from 'lucide-react';
import FeatureCard from '../components/dashboard/FeatureCard';
import LoginScreen from '../components/auth/LoginScreen';
import WelcomeOverlay from '../components/dashboard/WelcomeOverlay';
import { canAccessPanel, canAccessTraining, canViewAttempts, canViewAllTranscripts } from '../lib/auth';

export default function Dashboard() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState({ transcripts: 0, players: 0, online: false });
  const [showWelcome, setShowWelcome] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (status === 'authenticated' && !sessionStorage.getItem('welcome_played')) {
      setShowWelcome(true);
    } else if (status === 'authenticated') {
      setIsReady(true);
    }
  }, [status]);

  useEffect(() => {
    if (!session) return;

    Promise.allSettled([
      fetch('/api/transcripts/count').then(r => r.ok ? r.json() : { count: 0 }),
      fetch('/api/panel/players').then(r => r.ok ? r.json() : null),
    ]).then(([transcriptResult, panelResult]) => {
      setStats({
        transcripts: transcriptResult.status === 'fulfilled' ? transcriptResult.value.count || 0 : 0,
        players: panelResult.status === 'fulfilled' && panelResult.value ? panelResult.value.Players?.length || 0 : 0,
        online: panelResult.status === 'fulfilled' && panelResult.value !== null,
      });
    });
  }, [session]);

  const handleWelcomeComplete = () => {
    sessionStorage.setItem('welcome_played', 'true');
    setShowWelcome(false);
    setIsReady(true);
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center">
          <Loader2 className="w-8 h-8 text-gsrp-orange animate-spin mb-4" />
          <span className="text-gsrp-teal-light/40 font-mono text-[9px] uppercase tracking-[0.3em]">Loading Dashboard</span>
        </div>
      </div>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  const hasPanel = canAccessPanel(session);
  const hasTraining = canAccessTraining(session);
  const hasAttempts = canViewAttempts(session);

  return (
    <>
      {showWelcome && <WelcomeOverlay onComplete={handleWelcomeComplete} />}
      
      <div className={`max-w-5xl mx-auto transition-opacity duration-500 ${isReady ? 'opacity-100' : 'opacity-0'}`}>
        <div className={`mb-8 ${isReady ? 'animate-fade-in-up' : ''}`}>
          <h1 className="text-white font-black text-2xl md:text-3xl mb-2">
            Welcome back, <span className="text-gsrp-orange">{session.user.name}</span>
          </h1>
          <p className="text-gsrp-teal-light/40 text-sm">Georgia State Roleplay Dashboard</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className={isReady ? 'animate-pop-up stagger-1' : ''}>
            <FeatureCard
              href="/transcripts"
              icon={FileText}
              title="Transcripts"
              description="View and manage Discord ticket transcripts"
              badge={stats.transcripts > 0 ? `${stats.transcripts} records` : null}
            />
          </div>

          <div className={isReady ? 'animate-pop-up stagger-2' : ''}>
            <FeatureCard
              href="/panel"
              icon={Map}
              title="Live Panel"
              description="ERLC server map, player management, and commands"
              badge={stats.online ? `${stats.players} online` : null}
              locked={!hasPanel}
            />
          </div>

          <div className={isReady ? 'animate-pop-up stagger-3' : ''}>
            <FeatureCard
              href="/training"
              icon={BookOpen}
              title="Staff Training"
              description="SSD training quiz and staff handbook"
              locked={!hasTraining}
            />
          </div>

          <div className={isReady ? 'animate-pop-up stagger-4' : ''}>
            <FeatureCard
              href="/verify"
              icon={ShieldCheck}
              title="Verification"
              description="Link your Roblox account to Discord"
            />
          </div>

          <div className={isReady ? 'animate-pop-up stagger-5' : ''}>
            <FeatureCard
              href="/shop"
              icon={ShoppingCart}
              title="Store"
              description="Purchase premium roles, pings, and donations"
            />
          </div>

          {hasAttempts && (
            <div className={isReady ? 'animate-pop-up stagger-6' : ''}>
              <FeatureCard
                href="/training/attempts"
                icon={Users}
                title="Quiz Attempts"
                description="View all staff training quiz attempts"
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

