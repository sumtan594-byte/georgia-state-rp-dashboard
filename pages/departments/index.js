import { Shield, Search, Trophy, Trees, BadgeCheck, Flame, Info } from 'lucide-react';
import FeatureCard from '../../components/dashboard/FeatureCard';
import { departments } from '../../data/departments';

const iconMap = {
  Shield,
  Search,
  Trophy,
  Trees,
  BadgeCheck,
  Flame
};

export default function DepartmentsPage() {
  const categories = [...new Set(departments.map(d => d.category))];

  return (
    <div className="max-w-5xl mx-auto animate-fade-in-up">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-white font-black text-2xl md:text-3xl mb-2">
            Departments
          </h1>
          <p className="text-gsrp-teal-light/40 text-sm">Explore and join the various departments of Georgia State Roleplay</p>
        </div>
        
        <div className="bg-gsrp-orange/10 border border-gsrp-orange/20 rounded-xl p-4 max-w-md">
          <div className="flex items-center gap-2 mb-2">
            <Info size={16} className="text-gsrp-orange" />
            <span className="text-gsrp-orange font-bold text-xs uppercase tracking-wider">Recruitment Info</span>
          </div>
          <p className="text-xs text-gsrp-teal-light/60 leading-relaxed">
            We are currently <strong>Accepting</strong> department Openings. Open a <strong>Department Ticket</strong> to apply. 
            You must be in the server for a minimum of <strong>2 Weeks</strong>.
          </p>
        </div>
      </div>

      <div className="space-y-12">
        {categories.map(category => (
          <section key={category}>
            <div className="flex items-center gap-4 mb-6">
              <h2 className="text-gsrp-teal-light font-bold uppercase tracking-[0.2em] text-xs whitespace-nowrap">
                {category} Departments
              </h2>
              <div className="h-px w-full bg-gradient-to-r from-gsrp-teal-light/20 to-transparent" />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {departments
                .filter(d => d.category === category)
                .map(dept => (
                  <FeatureCard
                    key={dept.id}
                    href={`/departments/${dept.id}`}
                    icon={iconMap[dept.icon] || Info}
                    title={dept.name}
                    description={dept.description}
                    badge={dept.stats.members > 0 ? `${dept.stats.members} members` : 'New'}
                  />
                ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
