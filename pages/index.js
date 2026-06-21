import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { FileText, Map, BookOpen, ShieldCheck, Users, Loader2, ShoppingCart, Building2, UserPlus, Settings, ScrollText, UserCheck, BarChart3, Globe } from 'lucide-react';
import Link from 'next/link';
import FeatureCard from '../components/dashboard/FeatureCard';
import PresenceBar from '../components/dashboard/PresenceBar';
import LoginScreen from '../components/auth/LoginScreen';
import { canAccessPanel, canAccessTraining, canViewAttempts, canReviewApplications, canManageAdmins, canViewTracking, canManageAuthorization } from '../lib/auth';
import { useRefreshedUser } from '../lib/UserRefreshContext';

export default function Dashboard() {
  const { data: session, status } = useSession();
  const { session: refreshedSession, hasRefreshed } = useRefreshedUser();
  const effectiveSession = refreshedSession || session;
  const [stats, setStats] = useState({ transcripts: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [activeViewers, setActiveViewers] = useState([]);

  useEffect(() => {
    if (!session) return;

    fetch('/api/transcripts/count')
      .then(r => r.ok ? r.json() : { count: 0 })
      .then(data => {
        setStats({ transcripts: data.count || 0 });
        setStatsLoading(false);
      })
      .catch(() => setStatsLoading(false));
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const loadPresence = () => {
      fetch('/api/presence?page=/')
        .then(r => r.ok ? r.json() : null)
        .then(data => setActiveViewers(data?.allViewers || []))
        .catch(() => {});
    };
    loadPresence();
    const interval = setInterval(loadPresence, 15000);
    return () => clearInterval(interval);
  }, [session]);


  if (status === 'loading' || !hasRefreshed) {
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

  const hasPanel = canAccessPanel(effectiveSession);
  const hasTraining = canAccessTraining(effectiveSession);
  const hasAttempts = canViewAttempts(effectiveSession);
  const canReviewApps = canReviewApplications(effectiveSession);
  const canManageAdminList = canManageAdmins(effectiveSession);
  const isFullAdminUser = effectiveSession?.user?.isAdmin;
  const canViewVisitorTracking = canViewTracking(effectiveSession);
  const canManageAuth = canManageAuthorization(effectiveSession);
  const hasAdminAccess = canManageAdminList || isFullAdminUser || canViewVisitorTracking || canManageAuth;
  const viewersFor = (path) => activeViewers.filter(v => v.page === path || v.page?.startsWith(`${path}/`));

  return (
    <div className="max-w-5xl mx-auto animate-fade-in-up">
      <div className="mb-8">
        <h1 className="font-display text-white font-extrabold text-2xl md:text-[34px] leading-[1.05] tracking-tight mb-2">
          Welcome back, <span className="text-gsrp-orange">{session.user.name}</span>
        </h1>
        <p className="text-gsrp-teal-light/50 text-sm">Georgia State Roleplay Dashboard</p>
      </div>

      <PresenceBar page="/" />

      {/* Community Resources Section */}
      <div className="mb-12">
        <h2 className="font-display text-white font-bold text-lg tracking-tight mb-5 flex items-center gap-4">
          Community Resources
          <div className="h-[1px] flex-1 bg-gradient-to-r from-gsrp-orange/20 to-transparent" />
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <FeatureCard className="animate-fade-in-up stagger-1" href="/departments" icon={Building2} title="Departments" description="View and join GSRP's official departments" activeViewers={viewersFor('/departments')} />
          <FeatureCard className="animate-fade-in-up stagger-2" href="/transcripts" icon={FileText} title="Transcripts" description="View and manage Discord ticket transcripts" badge={stats.transcripts > 0 ? `${stats.transcripts} records` : null} activeViewers={viewersFor('/transcripts')} />
          <FeatureCard className="animate-fade-in-up stagger-3" href="/panel" icon={Map} title="Live Panel" description="ERLC server map, player management, and commands" locked={!hasPanel} requiredRole="Panel" activeViewers={viewersFor('/panel')} />
          <FeatureCard className="animate-fade-in-up stagger-4" href="/verify" icon={ShieldCheck} title="Verification" description="Link your Roblox account to Discord" activeViewers={viewersFor('/verify')} />
          <FeatureCard className="animate-fade-in-up stagger-5" href="/shop" icon={ShoppingCart} title="Store" description="Purchase premium roles, pings, and donations" activeViewers={viewersFor('/shop')} />
        </div>
      </div>

      {/* Staff Training Section */}
      <div className="mb-12">
          <h2 className="font-display text-white font-bold text-lg tracking-tight mb-5 flex items-center gap-4">
            Staff Training
            <div className="h-[1px] flex-1 bg-gradient-to-r from-gsrp-orange/20 to-transparent" />
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard className="animate-fade-in-up stagger-1" href="/training" icon={BookOpen} title="Staff Training" description="Staff orientation quiz and staff handbook" locked={!hasTraining} requiredRole="Trainee" activeViewers={viewersFor('/training')} />
            <FeatureCard className="animate-fade-in-up stagger-2" href="/training/attempts" icon={Users} title="Quiz Attempts" description="View all staff training quiz attempts" locked={!hasAttempts} requiredRole="Trainer" activeViewers={viewersFor('/training/attempts')} />
          </div>
        </div>

      {/* Applications Section */}
      <div className="mb-12">
        <h2 className="font-display text-white font-bold text-lg tracking-tight mb-5 flex items-center gap-4">
          Applications
          <div className="h-[1px] flex-1 bg-gradient-to-r from-gsrp-orange/20 to-transparent" />
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <FeatureCard className="animate-fade-in-up stagger-1" href="/apply" icon={UserPlus} title="Applications" description="Apply for staff, departments, or special roles" activeViewers={viewersFor('/apply')} />
          {canReviewApps && (
            <>
              <FeatureCard className="animate-fade-in-up stagger-2" href="/applications" icon={Users} title="Review Apps" description="Manage and review incoming staff applications" activeViewers={viewersFor('/applications')} />
              <FeatureCard className="animate-fade-in-up stagger-3" href="/applications/manage" icon={Settings} title="Manage Forms" description="Create and edit application types and questions" activeViewers={viewersFor('/applications/manage')} />
            </>
          )}
        </div>
      </div>

      {hasAdminAccess && (
        <div className="mb-12">
          <h2 className="font-display text-white font-bold text-lg tracking-tight mb-5 flex items-center gap-4">
            Admin
            <div className="h-[1px] flex-1 bg-gradient-to-r from-gsrp-orange/20 to-transparent" />
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {canManageAdminList && (
              <FeatureCard className="animate-fade-in-up stagger-1" href="/admins" icon={ShieldCheck} title="Edit Admins" description="Manage full server administrators" activeViewers={viewersFor('/admins')} />
            )}
            {isFullAdminUser && (
              <>
                <FeatureCard className="animate-fade-in-up stagger-2" href="/audit-logs" icon={ScrollText} title="Audit Logs" description="View audit trail of staff actions" activeViewers={viewersFor('/audit-logs')} />
                <FeatureCard className="animate-fade-in-up stagger-3" href="/admin/user-validations" icon={UserCheck} title="User Validations" description="Validate and manage user verifications" activeViewers={viewersFor('/admin/user-validations')} />
              </>
            )}
            {canViewVisitorTracking && (
              <>
                <FeatureCard className="animate-fade-in-up stagger-4" href="/admin/analytics" icon={BarChart3} title="Analytics" description="Visitor tracking and analytics" activeViewers={viewersFor('/admin/analytics')} />
                <FeatureCard className="animate-fade-in-up stagger-5" href="/admin/users" icon={Users} title="Users" description="View and manage registered users" activeViewers={viewersFor('/admin/users')} />
                <FeatureCard className="animate-fade-in-up stagger-6" href="/admin/users/all-visits" icon={Globe} title="All Visits" description="View all page visit history" activeViewers={viewersFor('/admin/users/all-visits')} />
              </>
            )}
            {canManageAuth && (
              <FeatureCard className="animate-fade-in-up stagger-7" href="/admin/authorization" icon={ShieldCheck} title="Authorisation" description="Manage route authorisation rules" activeViewers={viewersFor('/admin/authorization')} />
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-center gap-4 mt-8 text-xs text-gsrp-teal-light/30">
        <Link href="/privacy-policy" className="hover:text-gsrp-orange transition-colors">Privacy Policy</Link>
        <span className="text-gsrp-dark-border">•</span>
        <Link href="/terms-of-service" className="hover:text-gsrp-orange transition-colors">Terms of Service</Link>
      </div>
    </div>
  );
}
