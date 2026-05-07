import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useSession } from 'next-auth/react';
import { Users, Search, Filter, Calendar, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { canReviewApplications } from '../../lib/auth';
import LoginScreen from '../../components/auth/LoginScreen';

export default function ApplicationsList() {
  const { data: session, status } = useSession();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (session && canReviewApplications(session)) {
      fetch('/api/applications/list')
        .then(r => {
          if (!r.ok) throw new Error('Failed to fetch applications');
          return r.json();
        })
        .then(data => {
          setApplications(data);
          setLoading(false);
        })
        .catch(err => {
          setError(err.message);
          setLoading(false);
        });
    }
  }, [session]);

  if (status === 'loading') return null;
  if (!session) return <LoginScreen />;
  if (!canReviewApplications(session)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in-up">
        <AlertCircle className="w-16 h-16 text-red-500/20 mb-4" />
        <h1 className="text-2xl font-black text-white mb-2">Access Denied</h1>
        <p className="text-gsrp-teal-light/40">You do not have permission to view staff applications.</p>
      </div>
    );
  }

  const filtered = applications.filter(app => 
    app.username.toLowerCase().includes(search.toLowerCase()) ||
    app.userId.includes(search)
  );

  return (
    <div className="max-w-6xl mx-auto animate-fade-in-up">
      <Head>
        <title>Review Applications | GSRP Dashboard</title>
      </Head>

      <div className="mb-8 p-8 rounded-2xl bg-card-gradient border border-gsrp-dark-border/50 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-gsrp-orange/5 to-gsrp-teal/5 opacity-50" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-white font-black text-3xl mb-2 flex items-center gap-3">
              <Users className="text-gsrp-orange" />
              Review Applications
            </h1>
            <p className="text-gsrp-teal-light/60 font-medium">
              Manage and review staff applications from the community.
            </p>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gsrp-teal-light/30 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search applicants..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-gsrp-dark-surface border border-gsrp-dark-border/50 rounded-xl pl-11 pr-4 py-2.5 text-white text-sm focus:border-gsrp-orange/50 focus:outline-none transition-colors w-full md:w-64 font-medium"
            />
          </div>
        </div>
      </div>

      <div className="bg-gsrp-dark-card/60 backdrop-blur-md rounded-2xl border border-gsrp-dark-border/50 overflow-hidden">
        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-gsrp-orange animate-spin mb-4" />
            <span className="text-gsrp-teal-light/40 font-mono text-[9px] uppercase tracking-[0.3em]">Loading Applications</span>
          </div>
        ) : error ? (
          <div className="p-20 text-center">
            <p className="text-red-500 font-bold">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-20 text-center">
            <p className="text-gsrp-teal-light/40 font-medium">No applications found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gsrp-dark-border/50 bg-gsrp-dark-surface/30">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gsrp-teal-light/40">Applicant</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gsrp-teal-light/40">Submitted At</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gsrp-teal-light/40 text-center">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gsrp-teal-light/40 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((app) => (
                  <tr key={app._id} className="border-b border-gsrp-dark-border/30 hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {app.userImage ? (
                          <img src={app.userImage} alt="" className="w-10 h-10 rounded-full border border-gsrp-dark-border/50 object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gsrp-dark-surface border border-gsrp-dark-border/50 flex items-center justify-center text-gsrp-teal-light font-black text-xs">
                            {app.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="text-white font-bold text-sm">{app.username}</p>
                          <p className="text-[10px] text-gsrp-teal-light/30 font-mono">{app.userId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gsrp-teal-light/60">
                        <Calendar size={14} className="opacity-40" />
                        <span className="text-xs font-medium">{new Date(app.submittedAt).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border
                          ${app.status === 'pending' ? 'bg-gsrp-orange/10 text-gsrp-orange border-gsrp-orange/20' : 
                            app.status === 'accepted' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                            'bg-red-500/10 text-red-500 border-red-500/20'}
                        `}>
                          {app.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        href={`/applications/${app._id}`}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gsrp-dark-surface border border-gsrp-dark-border/50 text-xs font-bold text-gsrp-teal-light hover:text-white hover:border-gsrp-orange/50 transition-all group-hover:bg-gsrp-dark-surface/80"
                      >
                        View Profile
                        <ChevronRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
