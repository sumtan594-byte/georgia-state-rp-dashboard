import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useSession } from 'next-auth/react';
import { 
  FileText, 
  ChevronRight, 
  Loader2, 
  UserPlus 
} from 'lucide-react';
import Link from 'next/link';
import LoginScreen from '../../components/auth/LoginScreen';

import { hasRole } from '../../lib/auth';

export default function ApplicationList() {
  const { data: session, status } = useSession();
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) {
      fetch('/api/applications/types')
        .then(r => r.json())
        .then(data => {
          if (!Array.isArray(data)) return;
          // If no staff app exists, add a placeholder
          const hasStaff = data.find(t => t.slug === 'staff');
          if (!hasStaff) {
             data.unshift({
                name: 'Staff Application',
                slug: 'staff',
                description: 'Apply to join the Georgia State Roleplay staff team'
             });
          }
          
          // Filter by role
          const visibleTypes = data.filter(type => {
            if (!type.requiredRole || (Array.isArray(type.requiredRole) && type.requiredRole.length === 0)) return true;
            const required = Array.isArray(type.requiredRole) ? type.requiredRole : [type.requiredRole];
            return required.some(roleId => hasRole(session, roleId));
          });

          setTypes(visibleTypes);
          setLoading(false);
        });
    }
  }, [session]);

  if (status === 'loading' || loading) return null;
  if (!session) return <LoginScreen />;

  return (
    <div className="max-w-4xl mx-auto py-12 px-6 animate-fade-in-up">
      <Head>
        <title>Apply | GSRP Dashboard</title>
      </Head>

      <div className="mb-10">
        <h1 className="text-3xl font-black text-white flex items-center gap-4">
          <UserPlus className="text-gsrp-orange" />
          Applications
        </h1>
        <p className="text-gsrp-teal-light/40 text-sm mt-1">Select an application type to begin the process.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {types.map(type => (
          <Link 
            key={type.slug} 
            href={`/apply/${type.slug}`}
            className="bg-gsrp-dark-card border border-white/10 rounded-3xl p-8 group hover:border-gsrp-orange transition-all relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-gsrp-orange/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-gsrp-orange/10 flex items-center justify-center text-gsrp-orange mb-6 group-hover:scale-110 transition-transform">
                <FileText />
              </div>
              <h3 className="text-xl font-black text-white mb-2 group-hover:text-gsrp-orange transition-colors">{type.name}</h3>
              <p className="text-gsrp-teal-light/60 text-sm mb-6 leading-relaxed">
                {type.description || `Apply for the ${type.name} department and help our community grow.`}
              </p>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gsrp-orange">
                Start Application <ChevronRight size={14} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
