import { Shield, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRefreshedUser } from '../../lib/UserRefreshContext';

export default function AccessDenied({ roleId }) {
  const { roleMap, refreshedUser } = useRefreshedUser();

  let roleName = 'Access';
  if (roleId === 'ADMIN') {
    roleName = 'Admin';
  } else if (roleMap[roleId]) {
    roleName = roleMap[roleId].name;
  } else if (refreshedUser?.discordRoles) {
    const found = refreshedUser.discordRoles.find(r => r.id === roleId);
    if (found) roleName = found.name;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-scale-in">
      <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
        <Shield className="w-10 h-10 text-red-400" />
      </div>
      <h2 className="text-2xl font-black text-white mb-2">Access Denied</h2>
      <p className="text-gsrp-teal-light/40 text-sm max-w-md leading-relaxed">
        You do not hold the <span className="text-gsrp-orange font-bold">{roleName}</span> role required to view this page.
      </p>
      <p className="text-gsrp-teal-light/20 text-xs mt-2">
        If you believe this is an error, try refreshing the page or contact an administrator.
      </p>
      <Link
        href="/"
        className="mt-8 flex items-center gap-2 px-6 py-3 rounded-xl bg-gsrp-dark-card border border-gsrp-dark-border text-gsrp-teal-light/60 hover:text-white hover:border-gsrp-orange/30 transition-all text-sm font-medium"
      >
        <ArrowLeft size={14} />
        Back to Dashboard
      </Link>
    </div>
  );
}
