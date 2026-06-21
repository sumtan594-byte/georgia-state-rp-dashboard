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
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!session) return;

    setLoading(true);
    setError(null);
    fetch('/api/applications/types')
        .then(r => r.json())
        .then(data => {
          if (!Array.isArray(data)) {
            setTypes([]);
            setError('Application types are temporarily unavailable.');
            return;
          }
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
            const blacklisted = Array.isArray(type.blacklistedRole)
              ? type.blacklistedRole
              : (type.blacklistedRole ? [type.blacklistedRole] : []);

            if (blacklisted.some(roleId => hasRole(session, roleId))) {
              return false;
            }

            if (!type.requiredRole || (Array.isArray(type.requiredRole) && type.requiredRole.length === 0)) return true;
            const required = Array.isArray(type.requiredRole) ? type.requiredRole : [type.requiredRole];
            return required.some(roleId => hasRole(session, roleId));
          });

          setTypes(visibleTypes);
        })
        .catch(() => {
          setTypes([]);
          setError('Failed to load applications. Please try again.');
        })
        .finally(() => setLoading(false));
  }, [session]);

  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-gsrp-orange" />
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gsrp-teal-light/40">Loading Applications</p>
        </div>
      </div>
    );
  }
  if (!session) return <LoginScreen />;

  return (
    <div className="max-w-4xl mx-auto py-12 px-6 animate-fade-in-up">
      <Head>
        <title>Apply | GSRP Dashboard</title>
      </Head>

      <div className="mb-10">
        <h1 className="font-display text-3xl font-extrabold text-white tracking-tight flex items-center gap-4">
          <UserPlus className="text-gsrp-orange" />
          Applications
        </h1>
        <p className="text-gsrp-teal-light/40 text-sm mt-1">Select an application type to begin the process.</p>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-gsrp-orange/20 bg-gsrp-orange/10 p-4 text-sm text-gsrp-orange/80">
          {error}
        </div>
      )}

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
              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-gsrp-orange transition-colors">{type.name}</h3>
              <p className="text-gsrp-teal-light/60 text-sm mb-6 leading-relaxed">
                {type.description || `Apply for the ${type.name} department and help our community grow.`}
              </p>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gsrp-orange">
                Start Application <ChevronRight size={14} />
              </div>
            </div>
          </Link>
        ))}
        {!error && types.length === 0 && (
          <div className="md:col-span-2 rounded-3xl border border-dashed border-gsrp-dark-border bg-gsrp-dark-card/50 p-10 text-center">
            <FileText className="mx-auto mb-4 h-10 w-10 text-white/15" />
            <h2 className="mb-2 text-lg font-bold text-white/70">No Applications Open</h2>
            <p className="text-sm text-gsrp-teal-light/35">There are no application forms available for your current Discord roles.</p>
          </div>
        )}
      </div>
    </div>
  );
}
