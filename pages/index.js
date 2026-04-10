import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import {
  FileText,
  Map,
  BookOpen,
  ShieldCheck,
  Users,
  Loader2,
  ShoppingCart,
} from 'lucide-react';
import FeatureCard from '../components/dashboard/FeatureCard';
import LoginScreen from '../components/auth/LoginScreen';
import WelcomeOverlay from '../components/dashboard/WelcomeOverlay';
import { canAccessPanel, canAccessTraining, canViewAttempts } from '../lib/auth';

/**
 * WHY CARDS DON'T NEED THE ref/rAF TRICK:
 *
 * The card grid is only mounted once `isReady` becomes true. Because the
 * elements don't exist in the DOM before that point, the `animate-pop-up`
 * and `stagger-X` classes fire their @keyframes animation from the very
 * first frame of the element's life — no "from" state conflict.
 *
 * The classes themselves live in globals.css (not Tailwind utilities), so
 * Tailwind's JIT purger cannot strip them. The className strings passed to
 * FeatureCard are static string literals, which are also safe from purging.
 *
 * DO NOT wrap cards in a `<div className={condition ? 'animate-pop-up' : 'opacity-0'}>`.
 * Dynamic class assembly is what gets purged. Keep them as static literals.
 */
export default function Dashboard() {
  const { data: session, status } = useSession();

  const [stats, setStats] = useState({
    transcripts: 0,
    players: 0,
    online: false,
  });
  const [showWelcome, setShowWelcome] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Decide whether to show the welcome overlay
  useEffect(() => {
    if (status !== 'authenticated') return;

    if (!sessionStorage.getItem('welcome_played')) {
      setShowWelcome(true);
    } else {
      setIsReady(true);
    }
  }, [status]);

  // Fetch sidebar stats
  useEffect(() => {
    if (!session) return;

    Promise.allSettled([
      fetch('/api/transcripts/count').then(r => (r.ok ? r.json() : { count: 0 })),
      fetch('/api/panel/players').then(r => (r.ok ? r.json() : null)),
    ]).then(([transcriptResult, panelResult]) => {
      setStats({
        transcripts:
          transcriptResult.status === 'fulfilled'
            ? transcriptResult.value.count || 0
            : 0,
        players:
          panelResult.status === 'fulfilled' && panelResult.value
            ? panelResult.value.Players?.length || 0
            : 0,
        online:
          panelResult.status === 'fulfilled' && panelResult.value !== null,
      });
    });
  }, [session]);

  const handleWelcomeComplete = () => {
    sessionStorage.setItem('welcome_played', 'true');
    setShowWelcome(false);
    setIsReady(true);
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center">
          <Loader2 className="w-8 h-8 text-gsrp-orange animate-spin mb-4" />
          <span className="text-gsrp-teal-light/40 font-mono text-[9px] uppercase tracking-[0.3em]">
            Loading Dashboard
          </span>
        </div>
      </div>
    );
  }

  // ── Unauthenticated ──────────────────────────────────────────────────────
  if (!session) return <LoginScreen />;

  const hasPanel = canAccessPanel(session);
  const hasTraining = canAccessTraining(session);
  const hasAttempts = canViewAttempts(session);

  // ── Dashboard ────────────────────────────────────────────────────────────
  return (
    <>
      {/* Welcome overlay — only shown once per session */}
      {showWelcome && <WelcomeOverlay onComplete={handleWelcomeComplete} />}

      {/*
        Mount the card grid ONLY after isReady.

        This is the key trick for staggered card animation:
        - Because the grid doesn't exist in the DOM before this point,
          `animate-pop-up` fires its @keyframes from the element's first
          painted frame — no state toggling required, no purge risk.
        - The `stagger-X` classes are static string literals and are
          defined in globals.css, so they survive production builds.
      */}
      {isReady && (
        <div className="max-w-5xl mx-auto">
          {/* Page heading */}
          <div className="animate-fade-in-up mb-8">
            <h1 className="text-white font-black text-2xl md:text-3xl mb-2">
              Welcome back,{' '}
              <span className="text-gsrp-orange">{session.user.name}</span>
            </h1>
            <p className="text-gsrp-teal-light/40 text-sm">
              Georgia State Roleplay Dashboard
            </p>
          </div>

          {/* Feature card grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard
              href="/transcripts"
              icon={FileText}
              title="Transcripts"
              description="View and manage Discord ticket transcripts"
              badge={stats.transcripts > 0 ? `${stats.transcripts} records` : null}
              className="animate-pop-up stagger-1"
            />

            <FeatureCard
              href="/panel"
              icon={Map}
              title="Live Panel"
              description="ERLC server map, player management, and commands"
              badge={stats.online ? `${stats.players} online` : null}
              locked={!hasPanel}
              className="animate-pop-up stagger-2"
            />

            <FeatureCard
              href="/training"
              icon={BookOpen}
              title="Staff Training"
              description="SSD training quiz and staff handbook"
              locked={!hasTraining}
              className="animate-pop-up stagger-3"
            />

            <FeatureCard
              href="/verify"
              icon={ShieldCheck}
              title="Verification"
              description="Link your Roblox account to Discord"
              className="animate-pop-up stagger-4"
            />

            <FeatureCard
              href="/shop"
              icon={ShoppingCart}
              title="Store"
              description="Purchase premium roles, pings, and donations"
              className="animate-pop-up stagger-5"
            />

            {hasAttempts && (
              <FeatureCard
                href="/training/attempts"
                icon={Users}
                title="Quiz Attempts"
                description="View all staff training quiz attempts"
                className="animate-pop-up stagger-6"
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}