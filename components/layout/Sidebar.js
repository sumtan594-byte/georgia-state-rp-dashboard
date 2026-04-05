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
} from 'lucide-react';
import { canAccessPanel, canAccessTraining, canViewAttempts, canViewAllTranscripts } from '../../lib/auth';

export default function Sidebar({ open, onToggle }) {
  const { data: session } = useSession();
  const [serverStatus, setServerStatus] = useState(null);
  const [transcriptCount, setTranscriptCount] = useState(0);

  useEffect(() => {
    if (!session || !open) return;

    fetch('/api/panel/players')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setServerStatus({
            online: true,
            players: data.players?.length || 0,
            staff: data.staff?.length || 0,
          });
        }
      })
      .catch(() => setServerStatus({ online: false, players: 0, staff: 0 }));

    fetch('/api/transcripts/count')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setTranscriptCount(data.count || 0);
      })
      .catch(() => {});
  }, [session, open]);

  const hasPanel = canAccessPanel(session);
  const hasTraining = canAccessTraining(session);
  const hasAttempts = canViewAttempts(session);
  const showAllTranscripts = canViewAllTranscripts(session);

  const navItems = [
    { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/transcripts', icon: FileText, label: 'Transcripts', badge: transcriptCount > 0 ? transcriptCount : null },
    ...(hasPanel ? [{ href: '/panel', icon: Map, label: 'Live Panel', badge: serverStatus?.online ? `${serverStatus.players} online` : null }] : []),
    ...(hasTraining ? [{ href: '/training', icon: BookOpen, label: 'Training' }] : []),
    ...(hasAttempts ? [{ href: '/training/attempts', icon: ClipboardList, label: 'Attempts' }] : []),
    { href: '/verify', icon: ShieldCheck, label: 'Verification' },
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

      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gsrp-teal-light/60 hover:text-white hover:bg-gsrp-dark-surface/60 transition-all duration-200 group cursor-pointer"
          >
            <item.icon size={18} className="flex-shrink-0" />
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
      </nav>

      {open && serverStatus && (
        <div className="p-4 border-t border-gsrp-dark-border/50">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${serverStatus.online ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-gsrp-teal-light/40">
              {serverStatus.online ? 'Server Online' : 'Server Offline'}
            </span>
          </div>
          {serverStatus.online && (
            <div className="flex items-center gap-2">
              <Users size={12} className="text-gsrp-teal-light/30" />
              <span className="text-xs text-gsrp-teal-light/60">{serverStatus.players} players</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
