import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
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
import { canAccessPanel, canAccessTraining, canViewAttempts, canViewAllTranscripts, canAccessHandbook, canAccessTrainerHandbook, canReviewApplications, canManageAdmins, canViewTracking, canManageAuthorization } from '../../lib/auth';
import { useRefreshedUser } from '../../lib/UserRefreshContext';

export default function Sidebar({ open, onToggle }) {
  const { data: session } = useSession();
  const router = useRouter();
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
  const hasTrainerHandbook = hasRefreshed ? canAccessTrainerHandbook(effectiveSession) : false;
  const showAllTranscripts = hasRefreshed ? canViewAllTranscripts(effectiveSession) : false;
  const canReviewApps = hasRefreshed ? canReviewApplications(effectiveSession) : false;
  const canManageAdminList = hasRefreshed ? canManageAdmins(effectiveSession) : false;
  const isFullAdminUser = hasRefreshed ? (effectiveSession?.user?.isAdmin) : false;
  const canViewVisitorTracking = hasRefreshed ? canViewTracking(effectiveSession) : false;
  const canManageAuth = hasRefreshed ? canManageAuthorization(effectiveSession) : false;
  const viewersFor = (href) => activeViewers.filter(v => v.page === href || v.page?.startsWith(`${href}/`));

  // Exact match for root, prefix match for sections — so /panel/stats lights up /panel too.
  const isActive = (href) => {
    const path = router.asPath.split('?')[0];
    if (href === '/') return path === '/';
    return path === href || path.startsWith(`${href}/`);
  };

  const sections = [
    {
      label: 'General',
      items: [
        { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { href: '/departments', icon: Building2, label: 'Departments' },
        { href: '/transcripts', icon: FileText, label: 'Transcripts', badge: transcriptCount > 0 ? transcriptCount : null },
        ...(hasPanel ? [{ href: '/panel', icon: Map, label: 'Live Panel' }] : []),
        ...(hasPanel ? [{ href: '/panel/stats', icon: Server, label: 'Server Stats' }] : []),
        { href: '/verify', icon: ShieldCheck, label: 'Verification' },
        { href: '/shop', icon: ShoppingCart, label: 'Store' },
      ],
    },
    {
      label: 'Staff Training',
      show: hasHandbook || hasTraining || hasAttempts || hasTrainerHandbook,
      items: [
        ...(hasHandbook ? [{ href: '/staff-handbook', icon: BookOpen, label: 'Handbook' }] : []),
        ...(hasTrainerHandbook ? [{ href: '/trainer-handbook', icon: ClipboardList, label: 'Trainer Handbook' }] : []),
        ...(hasTraining ? [{ href: '/training', icon: BookOpen, label: 'SSD Quiz' }] : []),
        ...(hasTraining ? [{ href: '/training/ridealong', icon: ShieldCheck, label: 'Ridealong' }] : []),
        ...(hasAttempts ? [{ href: '/training/attempts', icon: ClipboardList, label: 'Attempts' }] : []),
        ...(hasAttempts ? [{ href: '/training/analytics', icon: BarChart3, label: 'Quiz Analytics' }] : []),
      ],
    },
    {
      label: 'Applications',
      items: [
        { href: '/apply', icon: UserPlus, label: 'Apply Now' },
        ...(canReviewApps ? [
          { href: '/applications', icon: Users, label: 'Review Hub' },
          { href: '/applications/manage', icon: Settings, label: 'Manage Forms' },
        ] : []),
      ],
    },
    {
      label: 'Admin',
      show: canManageAdminList || isFullAdminUser || canViewVisitorTracking || canManageAuth,
      items: [
        ...(canManageAdminList ? [{ href: '/admins', icon: ShieldCheck, label: 'Edit Admins' }] : []),
        ...(isFullAdminUser ? [{ href: '/audit-logs', icon: ScrollText, label: 'Audit Logs' }] : []),
        ...(isFullAdminUser ? [{ href: '/admin/user-validations', icon: UserCheck, label: 'User Validations' }] : []),
        ...(canViewVisitorTracking ? [{ href: '/admin/analytics', icon: BarChart3, label: 'Analytics' }] : []),
        ...(canViewVisitorTracking ? [{ href: '/admin/users', icon: Users, label: 'Users' }] : []),
        ...(canViewVisitorTracking ? [{ href: '/admin/users/all-visits', icon: Globe, label: 'All Visits' }] : []),
        ...(canManageAuth ? [{ href: '/admin/authorization', icon: ShieldCheck, label: 'Authorisation' }] : []),
      ],
    },
  ];

  const renderItem = (item) => {
    const active = isActive(item.href);
    const viewer = viewersFor(item.href)[0];
    return (
      <Link
        key={item.href}
        href={item.href}
        target={item.external ? '_blank' : undefined}
        rel={item.external ? 'noopener noreferrer' : undefined}
        aria-current={active ? 'page' : undefined}
        title={!open ? item.label : undefined}
        className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-200 ease-snap group ${
          active
            ? 'tac-accent bg-gsrp-orange/[0.08] text-white'
            : 'text-gsrp-teal-light/55 hover:text-white hover:bg-white/[0.04]'
        }`}
      >
        <span className="relative flex-shrink-0">
          <item.icon
            size={18}
            strokeWidth={active ? 2.4 : 2}
            className={`transition-colors duration-200 ${active ? 'text-gsrp-orange' : 'group-hover:text-gsrp-orange-light'}`}
          />
          {viewer?.image && (
            <img src={viewer.image} alt="" className="absolute -right-2 -top-2 h-4 w-4 rounded-full border border-gsrp-dark object-cover ring-1 ring-gsrp-teal/40" />
          )}
        </span>
        {open && (
          <>
            <span className={`text-[13.5px] flex-1 tracking-tight ${active ? 'font-bold' : 'font-semibold'}`}>{item.label}</span>
            {item.badge != null && (
              <span className="font-mono text-[10px] font-semibold text-gsrp-orange bg-gsrp-orange/12 border border-gsrp-orange/20 px-1.5 py-0.5 rounded-md leading-none">
                {item.badge}
              </span>
            )}
          </>
        )}
      </Link>
    );
  };

  return (
    <div className="h-screen sticky top-0 bg-gsrp-dark-card/85 backdrop-blur-xl border-r border-gsrp-dark-border/40 flex flex-col">
      <div className="flex items-center justify-between h-[60px] px-4 border-b border-gsrp-dark-border/40">
        {open && (
          <div className="flex items-center gap-2.5 min-w-0">
            <img src="https://i.imgur.com/70GfmYd.gif" alt="GSRP" className="w-8 h-8 rounded-lg object-cover ring-1 ring-white/10 shadow-tac-1" />
            <div className="min-w-0 leading-none">
              <span className="block font-display font-extrabold text-[15px] text-white tracking-tight">GSRP</span>
              <span className="block text-[11px] font-medium text-gsrp-teal-light/40 mt-1 truncate">Dashboard</span>
            </div>
          </div>
        )}
        <button
          onClick={onToggle}
          aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
          className="p-1.5 rounded-lg hover:bg-white/[0.06] text-gsrp-teal-light/45 hover:text-gsrp-orange transition-colors cursor-pointer"
        >
          {open ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      <nav className="flex-1 py-5 px-2.5 space-y-6 overflow-y-auto custom-scrollbar">
        {sections.filter(s => s.show !== false && s.items.length > 0).map((section) => (
          <div key={section.label}>
            <p className={`text-[11px] font-semibold tracking-wide text-gsrp-teal-light/35 mb-2 px-3 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 h-0 mb-0 overflow-hidden'}`}>
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map(renderItem)}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}
