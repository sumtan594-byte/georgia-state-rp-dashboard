import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function FeatureCard({ href, icon: Icon, title, description, badge, locked, activeViewers = [], className = "" }) {
  if (locked) return null;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.008 }}
      whileTap={{ y: -1, scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 420, damping: 30, mass: 0.55 }}
    >
      <Link
        href={href}
        className="tac-panel tac-panel-hover rounded-2xl p-5 group cursor-pointer block h-full overflow-hidden"
      >
        <span className="feature-card-sheen" aria-hidden="true" />
        <div className="flex items-start justify-between mb-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center border border-gsrp-orange/20 bg-gradient-to-br from-gsrp-orange/12 to-gsrp-teal/10 transition-all duration-300 ease-out-expo group-hover:border-gsrp-orange/45 group-hover:from-gsrp-orange/22 group-hover:to-gsrp-teal/18 group-hover:scale-[1.04]">
            <Icon size={21} strokeWidth={2.1} className="text-gsrp-orange transition-all duration-300 group-hover:text-gsrp-orange-light group-hover:rotate-[-3deg]" />
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
                    className="h-7 w-7 rounded-full border-2 border-gsrp-dark object-cover transition-transform duration-200 group-hover:-translate-y-0.5"
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
              className="text-gsrp-teal-light/30 transition-all duration-300 ease-out-expo group-hover:text-gsrp-orange group-hover:-translate-y-1 group-hover:translate-x-1"
            />
          </div>
        </div>
        <h3 className="font-display font-bold text-[17px] mb-1 text-white tracking-tight transition-colors duration-300 group-hover:text-gsrp-orange-light">{title}</h3>
        <p className="text-gsrp-teal-light/55 text-[13.5px] leading-relaxed transition-colors duration-300 group-hover:text-gsrp-teal-light/70">{description}</p>
      </Link>
    </motion.div>
  );
}
