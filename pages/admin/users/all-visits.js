import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth-options';
import LoginScreen from '../../../components/auth/LoginScreen';
import { useRefreshedUser } from '../../../lib/UserRefreshContext';
import AccessDenied from '../../../components/auth/AccessDenied';
import Link from 'next/link';
import {
  Globe, Monitor, Smartphone, Search,
  Loader2, RefreshCw, Clock, ArrowLeft, Trash2,
} from 'lucide-react';

export default function AllVisitsPage({ canAccess }) {
  const { data: session, status } = useSession();
  const { refreshedUser, hasRefreshed, accessDenied } = useRefreshedUser();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({ totalVisits: 0, today: 0 });

  useEffect(() => {
    if (status === 'unauthenticated') return;
    if (!hasRefreshed || accessDenied) return;
    fetchLogs();
  }, [status, hasRefreshed, accessDenied]);

  async function fetchLogs() {
    setLoading(true);
    try {
      const res = await fetch('/api/tracking/logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setStats(data.stats || { totalVisits: 0, today: 0 });
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoading(false);
    }
  }

  async function clearLogs() {
    if (!confirm('Clear all raw visit logs? Profile data will be kept.')) return;
    try {
      await fetch('/api/tracking/logs?type=logs', { method: 'DELETE' });
      setLogs([]);
      setStats(prev => ({ ...prev, totalVisits: 0, today: 0 }));
    } catch (err) {
      console.error('Failed to clear logs:', err);
    }
  }

  const filtered = logs.filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    return l.ip?.includes(q) || l.device?.toLowerCase().includes(q)
      || l.page?.includes(q) || (l.username || '').toLowerCase().includes(q);
  });

  if (status === 'loading' || !hasRefreshed) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-gsrp-orange animate-spin" />
      </div>
    );
  }

  if (!session) return <LoginScreen />;
  if (accessDenied) return <AccessDenied roleId={accessDenied.roleId} />;
  if (!canAccess) return <AccessDenied roleId="ADMIN" />;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white mb-3 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Users
        </Link>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Globe className="w-7 h-7 text-gsrp-orange" />
          All Visits
        </h1>
        <p className="text-gray-400 text-sm mt-1">Raw chronological visitor log — includes authenticated and anonymous visitors</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gsrp-dark-card/50 border border-gsrp-dark-border/50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{stats.totalVisits}</p>
          <p className="text-xs text-gray-500 mt-1">Recent Visits</p>
        </div>
        <div className="bg-gsrp-dark-card/50 border border-gsrp-dark-border/50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{stats.today}</p>
          <p className="text-xs text-gray-500 mt-1">Today</p>
        </div>
        <div className="bg-gsrp-dark-card/50 border border-gsrp-dark-border/50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{logs.filter(l => new Date(l.timestamp) >= new Date(Date.now() - 5 * 60 * 1000)).length}</p>
          <p className="text-xs text-gray-500 mt-1">Last 5 min</p>
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search IP, device, page, or username..."
            className="w-full bg-gsrp-dark-card border border-gsrp-dark-border rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-gsrp-orange/50 text-sm"
          />
        </div>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-gsrp-dark-card border border-gsrp-dark-border text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
        <button
          onClick={clearLogs}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-red-400/10 text-red-400 hover:bg-red-400/20 border border-red-400/20 transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-gsrp-orange animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Globe className="w-12 h-12 text-gray-600 mb-4" />
          <p className="text-gray-400">No visits recorded yet</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          <p className="text-sm text-gray-500 mb-2">{filtered.length} visit{filtered.length !== 1 ? 's' : ''}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-gsrp-dark-border/50">
                  <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wider">User</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wider">IP</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wider">Device</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wider">Page</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wider">Time</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log, i) => (
                  <tr key={log._id || i} className="border-b border-gsrp-dark-border/30 hover:bg-gsrp-dark-surface/30 transition-colors">
                    <td className="py-2.5 px-3">
                      {log.username ? (
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium text-xs">{log.username}</span>
                          <span className="text-[9px] bg-gsrp-orange/10 text-gsrp-orange px-1 py-0.5 rounded font-semibold">AUTH</span>
                        </div>
                      ) : (
                        <span className="text-gray-500 text-xs">Anonymous</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-white font-mono text-xs">{log.ip}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        {log.device === 'Desktop' ? (
                          <Monitor className="w-3 h-3 text-gray-500" />
                        ) : (
                          <Smartphone className="w-3 h-3 text-gray-500" />
                        )}
                        <span className="text-gray-400 text-xs">{log.device || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-gray-400 text-xs">{log.page || '/'}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-600" />
                        <span className="text-gray-400 text-xs whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session) return { redirect: { destination: '/login', permanent: false } };

  const { isFullAdmin } = await import('../../../lib/admin-helper');
  const canAccess = await isFullAdmin(session.user?.id, session.user?.roles || []);

  return { props: { canAccess } };
}
