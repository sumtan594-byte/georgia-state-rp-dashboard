import Link from 'next/link';

export default function FeatureCard({ href, icon: Icon, title, description, badge, locked, className = "" }) {
  if (locked) return null;

  return (
    <Link
      href={href}
      className={`card-glass rounded-2xl p-6 hover:border-gsrp-orange/30 transition-all duration-300 group cursor-pointer block h-full ${className}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gsrp-orange/10 to-gsrp-teal/10 border border-gsrp-orange/20 flex items-center justify-center group-hover:from-gsrp-orange/20 group-hover:to-gsrp-teal/20 transition-all duration-300">
          <Icon size={22} className="text-gsrp-orange group-hover:text-gsrp-orange-light transition-colors" />
        </div>
        {badge && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-gsrp-orange bg-gsrp-orange/10 px-2.5 py-1 rounded-full">
            {badge}
          </span>
        )}
      </div>
      <h3 className="text-white font-bold text-lg mb-1 group-hover:text-gsrp-orange-light transition-colors">{title}</h3>
      <p className="text-gsrp-teal-light/40 text-sm leading-relaxed">{description}</p>
    </Link>
  );
}
