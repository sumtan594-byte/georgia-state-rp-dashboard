import Link from 'next/link';

export default function FeatureCard({ href, icon: Icon, title, description, badge, locked, activeViewers = [], className = "" }) {
  if (locked) return null;

  return (
    <Link
      href={href}
      className={`card-glass rounded-2xl p-6 hover:border-gsrp-orange/30 hover:scale-105 transition-all duration-300 group cursor-pointer border border-gsrp-dark-border/50 block ${className}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-xl border flex items-center justify-center transition-all duration-300 bg-gradient-to-br from-gsrp-orange/10 to-gsrp-teal/10 border-gsrp-orange/20 group-hover:from-gsrp-orange/20 group-hover:to-gsrp-teal/20">
          <Icon size={22} className="text-gsrp-orange group-hover:text-gsrp-orange-light transition-colors" />
        </div>
        {activeViewers.length > 0 ? (
          <div className="flex items-center">
            {activeViewers.slice(0, 3).map((viewer, i) => (
              <img
                key={viewer.userId}
                src={viewer.image || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                alt={viewer.name || ''}
                title={`${viewer.name || 'Member'} on ${viewer.pageLabel || viewer.page || href}`}
                className="h-7 w-7 rounded-full border-2 border-gsrp-dark object-cover"
                style={{ marginLeft: i === 0 ? 0 : '-8px' }}
              />
            ))}
          </div>
        ) : badge ? (
          <span className="text-[10px] font-bold uppercase tracking-wider text-gsrp-orange bg-gsrp-orange/10 px-2.5 py-1 rounded-full">
            {badge}
          </span>
        ) : null}
      </div>
      <h3 className="font-bold text-lg mb-1 text-white group-hover:text-gsrp-orange-light transition-colors">{title}</h3>
      <p className="text-gsrp-teal-light/40 text-sm leading-relaxed">{description}</p>
    </Link>
  );
}
