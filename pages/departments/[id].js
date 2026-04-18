import { useRouter } from 'next/router';
import { 
  Shield, Search, Trophy, Trees, BadgeCheck, Flame, 
  ExternalLink, Users, Wifi, Clock, ArrowLeft, Info,
  ChevronRight, CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import { departments } from '../../data/departments';

const iconMap = {
  Shield,
  Search,
  Trophy,
  Trees,
  BadgeCheck,
  Flame
};

export default function DepartmentDashboard() {
  const router = useRouter();
  const { id } = router.query;

  const department = departments.find(d => d.id === id);

  if (!department) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Info className="w-12 h-12 text-gsrp-orange mb-4" />
        <h2 className="text-white text-xl font-bold">Department Not Found</h2>
        <Link href="/departments" className="mt-4 text-gsrp-orange hover:underline flex items-center gap-2">
          <ArrowLeft size={16} /> Back to Departments
        </Link>
      </div>
    );
  }

  const Icon = iconMap[department.icon] || Info;

  return (
    <div className="max-w-5xl mx-auto animate-fade-in-up">
      <Link 
        href="/departments" 
        className="inline-flex items-center gap-2 text-gsrp-teal-light/40 hover:text-gsrp-orange transition-colors mb-6 group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        <span className="text-xs uppercase tracking-widest font-bold">Back to Departments</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card-glass rounded-3xl p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Icon size={120} />
            </div>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gsrp-orange/20 to-gsrp-teal/20 border border-gsrp-orange/30 flex items-center justify-center">
                <Icon size={32} className="text-gsrp-orange" />
              </div>
              <div>
                <span className="text-gsrp-orange font-bold text-[10px] uppercase tracking-[0.3em] mb-1 block">
                  {department.category} Department
                </span>
                <h1 className="text-white font-black text-3xl md:text-4xl">{department.name}</h1>
              </div>
            </div>

            <p className="text-gsrp-teal-light/60 text-lg leading-relaxed mb-8">
              {department.description}
            </p>

            {department.details && (
              <div className="space-y-4">
                <h3 className="text-white font-bold uppercase tracking-wider text-xs flex items-center gap-2">
                  <ChevronRight size={14} className="text-gsrp-orange" />
                  Key Features & Divisions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {department.details.map((detail, index) => (
                    <div key={index} className="flex items-start gap-3 bg-gsrp-dark-surface/40 p-3 rounded-xl border border-gsrp-dark-border/30">
                      <CheckCircle2 size={16} className="text-gsrp-orange mt-0.5 flex-shrink-0" />
                      <span className="text-gsrp-teal-light/80 text-sm">{detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="card-glass rounded-3xl p-8">
            <h3 className="text-white font-bold text-lg mb-4">Requirements</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-gsrp-teal-light/60 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-gsrp-orange" />
                Must be a member of GSRP for at least 2 weeks
              </li>
              <li className="flex items-center gap-3 text-gsrp-teal-light/60 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-gsrp-orange" />
                No active disciplinary record
              </li>
              <li className="flex items-center gap-3 text-gsrp-teal-light/60 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-gsrp-orange" />
                Professionalism and dedication to roleplay
              </li>
            </ul>
          </div>
        </div>

        {/* Sidebar / Stats */}
        <div className="space-y-6">
          <div className="card-glass rounded-3xl p-6 border-gsrp-orange/20">
            <h3 className="text-white font-bold uppercase tracking-widest text-xs mb-6 text-center">Server Information</h3>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-center justify-between p-4 bg-gsrp-dark-surface/60 rounded-2xl border border-gsrp-dark-border/30">
                <div className="flex items-center gap-3">
                  <Users size={18} className="text-gsrp-orange" />
                  <span className="text-gsrp-teal-light/60 text-sm">Members</span>
                </div>
                <span className="text-white font-bold">{department.stats.members || '--'}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-gsrp-dark-surface/60 rounded-2xl border border-gsrp-dark-border/30">
                <div className="flex items-center gap-3">
                  <Wifi size={18} className="text-green-500" />
                  <span className="text-gsrp-teal-light/60 text-sm">Online</span>
                </div>
                <span className="text-white font-bold">{department.stats.online || '--'}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-gsrp-dark-surface/60 rounded-2xl border border-gsrp-dark-border/30">
                <div className="flex items-center gap-3">
                  <Clock size={18} className="text-gsrp-orange" />
                  <span className="text-gsrp-teal-light/60 text-sm">Established</span>
                </div>
                <span className="text-white font-bold">2025</span>
              </div>
            </div>

            <a 
              href={department.invite} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 w-full py-4 bg-gsrp-orange hover:bg-gsrp-orange-light text-white font-bold rounded-2xl transition-all duration-300 shadow-lg shadow-gsrp-orange/20 group"
            >
              <span>Join Department</span>
              <ExternalLink size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </a>
            
            <p className="text-[10px] text-gsrp-teal-light/30 text-center mt-4 uppercase tracking-[0.2em]">
              Permanent Invite Link
            </p>
          </div>

          <div className="card-glass rounded-3xl p-6 bg-gradient-to-br from-gsrp-dark-card to-gsrp-dark-surface/30">
            <div className="flex items-center gap-3 mb-4">
              <Info size={18} className="text-gsrp-orange" />
              <h3 className="text-white font-bold text-sm">Application Note</h3>
            </div>
            <p className="text-xs text-gsrp-teal-light/50 leading-relaxed">
              Those who already lead Departments have a lower chance of being accepted. Application requires a department ticket.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
