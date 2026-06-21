import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

export default function FeatureCard({ href, icon: Icon, title, description, badge, locked, activeViewers = [], className = "" }) {
  if (locked) return null;

  return (
    <Link
      href={href}
      className={`tac-panel tac-panel-hover rounded-2xl p-5 group cursor-pointer block ${className}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center border border-gsrp-orange/20 bg-gradient-to-br from-gsrp-orange/12 to-gsrp-teal/10 transition-colors duration-200 group-hover:border-gsrp-orange/40 group-hover:from-gsrp-orange/20 group-hover:to-gsrp-teal/16">
          <Icon size={21} strokeWidth={2.1} className="text-gsrp-orange transition-colors group-hover:text-gsrp-orange-light" />
        </div>
        <div className="flex items-center gap-2">
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
            <span className="tac-chip text-gsrp-orange border-gsrp-orange/25 bg-gsrp-orange/10">
              {badge}
            </span>
          ) : null}
          <ArrowUpRight
            size={17}
            className="text-gsrp-teal-light/30 transition-all duration-200 ease-snap group-hover:text-gsrp-orange group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
        </div>
      </div>
      <h3 className="font-display font-bold text-[17px] mb-1 text-white tracking-tight transition-colors group-hover:text-gsrp-orange-light">{title}</h3>
      <p className="text-gsrp-teal-light/55 text-[13.5px] leading-relaxed">{description}</p>
    </Link>
  );
}
