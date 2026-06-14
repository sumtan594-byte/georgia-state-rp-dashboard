import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  LayoutDashboard,
  FileText,
  Map,
  BookOpen,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Users,
  ClipboardList,
  ShoppingCart,
  Building2,
  UserPlus,
  Settings,
  BarChart3,
  Server,
  ScrollText,
  UserCheck,
  Globe,
} from 'lucide-react';
import { canAccessPanel, canAccessTraining, canViewAttempts, canViewAllTranscripts, canAccessHandbook, canReviewApplications, canManageAdmins, canViewTracking, canManageAuthorization } from '../../lib/auth';
import { useRefreshedUser } from '../../lib/UserRefreshContext';

export default function Sidebar({ open, onToggle }) {
  const { data: session } = useSession();
  const { refreshedUser, session: refreshedSession, hasRefreshed } = useRefreshedUser();
  const effectiveSession = refreshedSession || session;
  const [transcriptCount, setTranscriptCount] = useState(0);
  const [activeViewers, setActiveViewers] = useState([]);

  useEffect(() => {
    if (!session || !open) return;

    fetch('/api/transcripts/count')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setTranscriptCount(data.count || 0);
      })
      .catch(() => {});
  }, [session, open]);

  useEffect(() => {
    if (!session || !open) return;
    const loadPresence = () => {
      fetch('/api/presence?page=/')
        .then(r => r.ok ? r.json() : null)
        .then(data => setActiveViewers(data?.allViewers || []))
        .catch(() => {});
    };
    loadPresence();
    const interval = setInterval(loadPresence, 15000);
    return () => clearInterval(interval);
  }, [session, open]);

  const hasPanel = hasRefreshed ? canAccessPanel(effectiveSession) : false;
  const hasHandbook = hasRefreshed ? canAccessHandbook(effectiveSession) : false;
  const hasTraining = hasRefreshed ? canAccessTraining(effectiveSession) : false;
  const hasAttempts = hasRefreshed ? canViewAttempts(effectiveSession) : false;
  const showAllTranscripts = hasRefreshed ? canViewAllTranscripts(effectiveSession) : false;
  const canReviewApps = hasRefreshed ? canReviewApplications(effectiveSession) : false;
  const canManageAdminList = hasRefreshed ? canManageAdmins(effectiveSession) : false;
  const isFullAdminUser = hasRefreshed ? (effectiveSession?.user?.isAdmin) : false;
  const canViewVisitorTracking = hasRefreshed ? canViewTracking(effectiveSession) : false;
  const canManageAuth = hasRefreshed ? canManageAuthorization(effectiveSession) : false;
  const viewersFor = (href) => activeViewers.filter(v => v.page === href || v.page?.startsWith(`${href}/`));

  const navItems = [
    { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/departments', icon: Building2, label: 'Departments' },
    { href: '/transcripts', icon: FileText, label: 'Transcripts', badge: transcriptCount > 0 ? transcriptCount : null },
    ...(hasPanel ? [{ href: '/panel', icon: Map, label: 'Live Panel' }] : []),
    ...(hasHandbook ? [{ href: '/staff-handbook', icon: BookOpen, label: 'Staff Handbook' }] : []),
    ...(hasTraining ? [{ href: '/training', icon: BookOpen, label: 'Training' }] : []),
    ...(hasTraining ? [{ href: '/training/ridealong', icon: ShieldCheck, label: 'Ridealong' }] : []),
    ...(hasAttempts ? [{ href: '/training/attempts', icon: ClipboardList, label: 'Attempts' }] : []),
    { href: '/verify', icon: ShieldCheck, label: 'Verification' },
    { href: '/shop', icon: ShoppingCart, label: 'Store' },
    { href: '/apply', icon: UserPlus, label: 'Applications' },
    ...(canReviewApps ? [
      { href: '/applications', icon: Users, label: 'Review Apps' },
      { href: '/applications/manage', icon: Settings, label: 'Manage Apps' }
    ] : []),
    ...(canManageAdminList ? [{ href: '/admins', icon: ShieldCheck, label: 'Edit Admins' }] : []),
  ];

  return (
    <div className="h-screen sticky top-0 bg-gsrp-dark-card/90 backdrop-blur-xl border-r border-gsrp-dark-border/50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gsrp-dark-border/50">
        {open && (
          <div className="flex items-center gap-3">
            <img src="https://i.imgur.com/70GfmYd.gif" alt="GSRP" className="w-8 h-8 rounded-lg object-cover" />
            <span className="text-white font-bold text-sm">GSRP</span>
          </div>
        )}
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg hover:bg-gsrp-dark-surface/60 text-gsrp-teal-light/40 hover:text-gsrp-orange transition-colors cursor-pointer"
        >
          {open ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      <nav className="flex-1 py-4 px-2 space-y-8 overflow-y-auto custom-scrollbar">
        {/* Community Resources */}
        <div>
          <p className={`text-[10px] font-black uppercase tracking-[0.2em] text-gsrp-teal-light/20 mb-3 px-4 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}>
            General
          </p>
          <div className="space-y-1">
            {[
              { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
              { href: '/departments', icon: Building2, label: 'Departments' },
              { href: '/transcripts', icon: FileText, label: 'Transcripts', badge: transcriptCount > 0 ? transcriptCount : null },
               ...(hasPanel ? [{ href: '/panel', icon: Map, label: 'Live Panel' }] : []),
               ...(hasPanel ? [{ href: '/panel/stats', icon: Server, label: 'Server Stats' }] : []),
               { href: '/verify', icon: ShieldCheck, label: 'Verification' },
               { href: '/shop', icon: ShoppingCart, label: 'Store' },
            ].map((item, idx) => (
              <Link
                key={item.href}
                href={item.href}
                target={item.external ? '_blank' : undefined}
                rel={item.external ? 'noopener noreferrer' : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-gsrp-teal-light/60 hover:text-white hover:bg-gsrp-dark-surface/60 transition-all duration-200 group animate-slide-left stagger-${idx+1}`}
              >
                <span className="relative flex-shrink-0">
                  <item.icon size={18} className="group-hover:text-gsrp-orange transition-colors" />
                  {viewersFor(item.href)[0]?.image && (
                    <img src={viewersFor(item.href)[0].image} alt="" className="absolute -right-2 -top-2 h-4 w-4 rounded-full border border-gsrp-dark object-cover" />
                  )}
                </span>
                {open && (
                  <>
                    <span className="text-sm font-medium flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gsrp-orange bg-gsrp-orange/10 px-2 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* Staff Training */}
        {(hasHandbook || hasTraining || hasAttempts) && (
          <div>
            <p className={`text-[10px] font-black uppercase tracking-[0.2em] text-gsrp-teal-light/20 mb-3 px-4 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}>
              Staff Training
            </p>
            <div className="space-y-1">
              {[
                ...(hasHandbook ? [{ href: '/staff-handbook', icon: BookOpen, label: 'Handbook' }] : []),
                ...(hasTraining ? [{ href: '/training', icon: BookOpen, label: 'ssd quiz' }] : []),
                ...(hasTraining ? [{ href: '/training/ridealong', icon: ShieldCheck, label: 'Ridealong' }] : []),
                ...(hasAttempts ? [{ href: '/training/attempts', icon: ClipboardList, label: 'Attempts' }] : []),
                ...(hasAttempts ? [{ href: '/training/analytics', icon: BarChart3, label: 'Quiz Analytics' }] : []),
              ].map((item, idx) => (
                <Link
                  key={item.href}
                  href={item.href}
className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-gsrp-teal-light/60 hover:text-white hover:bg-gsrp-dark-surface/60 hover:scale-105 transition-all duration-200 group animate-slide-left stagger-${idx+1}`}
                >
                  <span className="relative flex-shrink-0">
                    <item.icon size={18} className="group-hover:text-gsrp-orange transition-colors" />
                    {viewersFor(item.href)[0]?.image && (
                      <img src={viewersFor(item.href)[0].image} alt="" className="absolute -right-2 -top-2 h-4 w-4 rounded-full border border-gsrp-dark object-cover" />
                    )}
                  </span>
                  {open && <span className="text-sm font-medium flex-1">{item.label}</span>}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Applications */}
        <div>
          <p className={`text-[10px] font-black uppercase tracking-[0.2em] text-gsrp-teal-light/20 mb-3 px-4 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}>
            Applications
          </p>
          <div className="space-y-1">
            {[
              { href: '/apply', icon: UserPlus, label: 'Apply Now' },
              ...(canReviewApps ? [
                { href: '/applications', icon: Users, label: 'Review Hub' },
                { href: '/applications/manage', icon: Settings, label: 'Manage Forms' }
              ] : []),
               ...(canManageAdminList ? [{ href: '/admins', icon: ShieldCheck, label: 'Edit Admins' }] : []),
               ...(isFullAdminUser ? [{ href: '/audit-logs', icon: ScrollText, label: 'Audit Logs' }] : []),
               ...(isFullAdminUser ? [{ href: '/admin/user-validations', icon: UserCheck, label: 'User Validations' }] : []),
               ...(canViewVisitorTracking ? [{ href: '/admin/analytics', icon: BarChart3, label: 'Analytics' }] : []),
               ...(canViewVisitorTracking ? [{ href: '/admin/users', icon: Users, label: 'Users' }] : []),
               ...(canViewVisitorTracking ? [{ href: '/admin/users/all-visits', icon: Globe, label: 'All Visits' }] : []),
               ...(canManageAuth ? [{ href: '/admin/authorization', icon: ShieldCheck, label: 'Authorisation' }] : []),
            ].map((item, idx) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-gsrp-teal-light/60 hover:text-white hover:bg-gsrp-dark-surface/60 transition-all duration-200 group animate-slide-left stagger-${idx+1}`}
              >
                <span className="relative flex-shrink-0">
                  <item.icon size={18} className="group-hover:text-gsrp-orange transition-colors" />
                  {viewersFor(item.href)[0]?.image && (
                    <img src={viewersFor(item.href)[0].image} alt="" className="absolute -right-2 -top-2 h-4 w-4 rounded-full border border-gsrp-dark object-cover" />
                  )}
                </span>
                {open && <span className="text-sm font-medium flex-1">{item.label}</span>}
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
}
