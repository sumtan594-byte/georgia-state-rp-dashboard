import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { FileText, Map, BookOpen, ShieldCheck, Users, Loader2, ShoppingCart, Building2, UserPlus, Settings } from 'lucide-react';
import Link from 'next/link';
import FeatureCard from '../components/dashboard/FeatureCard';
import LoginScreen from '../components/auth/LoginScreen';
import { canAccessPanel, canAccessTraining, canViewAttempts, canReviewApplications } from '../lib/auth';

export default function Dashboard() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState({ transcripts: 0, players: 0, online: false });

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
  const canReviewApps = canReviewApplications(session);

  return (
    <div className="max-w-5xl mx-auto animate-fade-in-up">
      <div className="mb-8">
        <h1 className="text-white font-black text-2xl md:text-3xl mb-2">
          Welcome back, <span className="text-gsrp-orange">{session.user.name}</span>
        </h1>
        <p className="text-gsrp-teal-light/40 text-sm">Georgia State Roleplay Dashboard</p>
      </div>

      {/* Community Resources Section */}
      <div className="mb-12">
        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-gsrp-orange mb-6 flex items-center gap-4">
          Community Resources
          <div className="h-[1px] flex-1 bg-gradient-to-r from-gsrp-orange/20 to-transparent" />
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <FeatureCard className="animate-fade-in-up stagger-1" href="/departments" icon={Building2} title="Departments" description="View and join GSRP's official departments" />
          <FeatureCard className="animate-fade-in-up stagger-2" href="/transcripts" icon={FileText} title="Transcripts" description="View and manage Discord ticket transcripts" badge={stats.transcripts > 0 ? `${stats.transcripts} records` : null} />
          <FeatureCard className="animate-fade-in-up stagger-3" href="/panel" icon={Map} title="Live Panel" description="ERLC server map, player management, and commands" badge={stats.online ? `${stats.players} online` : null} locked={!hasPanel} />
          <FeatureCard className="animate-fade-in-up stagger-4" href="/verify" icon={ShieldCheck} title="Verification" description="Link your Roblox account to Discord" />
          <FeatureCard className="animate-fade-in-up stagger-5" href="/shop" icon={ShoppingCart} title="Store" description="Purchase premium roles, pings, and donations" />
        </div>
      </div>

      {/* Staff Training Section */}
      {(hasTraining || hasAttempts) && (
        <div className="mb-12">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-gsrp-orange mb-6 flex items-center gap-4">
            Staff Training
            <div className="h-[1px] flex-1 bg-gradient-to-r from-gsrp-orange/20 to-transparent" />
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard className="animate-fade-in-up stagger-1" href="/training" icon={BookOpen} title="Staff Training" description="SSD training quiz and staff handbook" locked={!hasTraining} />
            {hasAttempts && (
              <FeatureCard className="animate-fade-in-up stagger-2" href="/training/attempts" icon={Users} title="Quiz Attempts" description="View all staff training quiz attempts" />
            )}
          </div>
        </div>
      )}

      {/* Applications Section */}
      <div className="mb-12">
        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-gsrp-orange mb-6 flex items-center gap-4">
          Applications
          <div className="h-[1px] flex-1 bg-gradient-to-r from-gsrp-orange/20 to-transparent" />
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <FeatureCard className="animate-fade-in-up stagger-1" href="/apply" icon={UserPlus} title="Applications" description="Apply for staff, departments, or special roles" />
          {canReviewApps && (
            <>
              <FeatureCard className="animate-fade-in-up stagger-2" href="/applications" icon={Users} title="Review Apps" description="Manage and review incoming staff applications" />
              <FeatureCard className="animate-fade-in-up stagger-3" href="/applications/manage" icon={Settings} title="Manage Forms" description="Create and edit application types and questions" />
            </>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 mt-8 text-xs text-gsrp-teal-light/30">
        <Link href="/privacy-policy" className="hover:text-gsrp-orange transition-colors">Privacy Policy</Link>
        <span className="text-gsrp-dark-border">•</span>
        <Link href="/terms-of-service" className="hover:text-gsrp-orange transition-colors">Terms of Service</Link>
      </div>
    </div>
  );
}