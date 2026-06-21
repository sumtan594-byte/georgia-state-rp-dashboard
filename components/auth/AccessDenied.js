import { Shield, ArrowLeft, RefreshCw, Radio, LockKeyhole } from 'lucide-react';
import Link from 'next/link';
import { useRefreshedUser } from '../../lib/UserRefreshContext';

export default function AccessDenied({ roleId, resourceLabel, revoked }) {
  const { roleMap, refreshedUser, refreshNow, isStale } = useRefreshedUser();

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
    <div className="flex items-center justify-center min-h-[60vh] px-4 animate-scale-in">
      <div className="relative max-w-xl w-full overflow-hidden rounded-3xl border border-red-500/20 bg-gsrp-dark-card/80 p-8 text-center shadow-2xl">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-500 via-gsrp-orange to-red-500" />
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10">
          <Shield className="h-10 w-10 text-red-400" />
        </div>
        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-white/40">
          <LockKeyhole size={12} /> Restricted Module
        </p>
        <h2 className="mb-3 text-2xl font-bold text-white">{revoked ? 'Your access to this resource has been revoked' : 'Access Locked'}</h2>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-gsrp-teal-light/45">
          {revoked
            ? `${resourceLabel || 'This page'} is no longer available to your current Discord roles.`
            : <>This page requires <span className="font-bold text-gsrp-orange">{roleName}</span>. Your access state updates automatically as Discord roles change.</>}
        </p>
        <div className="mt-5 flex items-center justify-center gap-2 text-xs text-white/30">
          <Radio size={13} className={isStale ? 'text-gsrp-orange' : 'text-green-400'} />
          {isStale ? 'Role update detected, syncing access...' : 'Watching Discord role changes'}
        </div>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            onClick={() => refreshNow?.()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gsrp-orange/30 bg-gsrp-orange/15 px-5 py-3 text-sm font-bold text-gsrp-orange transition-all hover:bg-gsrp-orange/25"
          >
            <RefreshCw size={15} /> Check Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gsrp-dark-border bg-black/20 px-5 py-3 text-sm font-bold text-gsrp-teal-light/60 transition-all hover:border-gsrp-orange/30 hover:text-white"
          >
            <ArrowLeft size={15} /> Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
