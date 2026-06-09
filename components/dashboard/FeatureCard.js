import Link from 'next/link';
import { LockKeyhole } from 'lucide-react';

export default function FeatureCard({ href, icon: Icon, title, description, badge, locked, requiredRole = 'required staff role', className = "" }) {
  const content = (
    <>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-all duration-300 ${
          locked
            ? 'bg-white/5 border-white/10'
            : 'bg-gradient-to-br from-gsrp-orange/10 to-gsrp-teal/10 border-gsrp-orange/20 group-hover:from-gsrp-orange/20 group-hover:to-gsrp-teal/20'
        }`}>
          <Icon size={22} className={locked ? 'text-white/25' : 'text-gsrp-orange group-hover:text-gsrp-orange-light transition-colors'} />
        </div>
        {locked ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white/35 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
            <LockKeyhole size={10} /> Locked
          </span>
        ) : badge ? (
          <span className="text-[10px] font-bold uppercase tracking-wider text-gsrp-orange bg-gsrp-orange/10 px-2.5 py-1 rounded-full">
            {badge}
          </span>
        ) : null}
      </div>
      <h3 className={`font-bold text-lg mb-1 transition-colors ${locked ? 'text-white/45' : 'text-white group-hover:text-gsrp-orange-light'}`}>{title}</h3>
      <p className="text-gsrp-teal-light/40 text-sm leading-relaxed">{description}</p>
      {locked && (
        <p className="mt-4 text-[11px] leading-relaxed text-white/25">
          Requires {requiredRole}. Access refreshes automatically after Discord roles are updated.
        </p>
      )}
    </>
  );

  if (locked) {
    return (
      <div className={`card-glass rounded-2xl p-6 border border-gsrp-dark-border/50 opacity-80 ${className}`} aria-disabled="true">
        {content}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={`card-glass rounded-2xl p-6 hover:border-gsrp-orange/30 hover:scale-105 transition-all duration-300 group cursor-pointer border border-gsrp-dark-border/50 block ${className}`}
    >
      {content}
    </Link>
  );
}
