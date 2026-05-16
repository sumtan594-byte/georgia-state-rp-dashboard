import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRefreshedUser } from '../../lib/UserRefreshContext';
import { ROLES, hasRole } from '../../lib/auth';
import { isFullAdmin } from '../../lib/admin-helper';
import { Server, Users, Activity, Clock, Loader2, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../lib/auth-options';

export default function ServerStatsPage() {
  const { status } = useSession();
  const { refreshedUser } = useRefreshedUser();
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const canAccess = hasRole({ user: refreshedUser }, ROLES.PANEL) || refreshedUser?.isAdmin;

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/panel/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        setHistory(prev => {
          const newEntry = {
            time: new Date(),
            players: data.playerCount || 0,
          };
          const updated = [...prev, newEntry].slice(-60);
          return updated;
        });
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  useEffect(() => {
    if (status === 'loading' || !canAccess) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchStats().then(() => setLoading(false));
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [status, canAccess]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-gsrp-orange animate-spin" />
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Server className="w-12 h-12 text-gray-500 mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Access Denied</h2>
        <p className="text-gray-400">Panel access required.</p>
      </div>
    );
  }

  const maxPlayers = history.length > 0 ? Math.max(...history.map(h => h.players), 1) : 1;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Server className="w-7 h-7 text-gsrp-orange" />
            Server Statistics
          </h1>
          <p className="text-gray-400 text-sm mt-1">Live server performance overview</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-gsrp-dark-card border border-gsrp-dark-border rounded-lg text-white hover:border-gsrp-orange/50 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {stats ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard icon={Users} label="Players Online" value={stats.playerCount || 0} color="text-blue-400" bg="bg-blue-500/10" />
            <StatCard icon={Activity} label="Staff Online" value={stats.staffCount || 0} color="text-emerald-400" bg="bg-emerald-500/10" />
            <StatCard icon={Clock} label="Server Uptime" value={stats.uptime || 'N/A'} color="text-purple-400" bg="bg-purple-500/10" />
            <StatCard icon={Server} label="Server Name" value={stats.serverName || 'N/A'} color="text-gsrp-orange" bg="bg-orange-500/10" truncate />
          </div>

          {history.length > 1 && (
            <div className="bg-gsrp-dark-card/50 border border-gsrp-dark-border/50 rounded-xl p-6">
              <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4" /> Player Count (Last 30 min)
              </h3>
              <div className="flex items-end gap-0.5 h-32">
                {history.map((entry, i) => {
                  const height = maxPlayers > 0 ? (entry.players / maxPlayers) * 100 : 0;
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-gsrp-orange/60 hover:bg-gsrp-orange rounded-t transition-colors min-w-[4px] cursor-pointer"
                      style={{ height: `${Math.max(height, 2)}%` }}
                      title={`${entry.players} players at ${entry.time.toLocaleTimeString()}`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>{history.length * 0.5} min ago</span>
                <span>Now</span>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Server className="w-12 h-12 text-gray-600 mb-4" />
          <p className="text-gray-400">Unable to fetch server statistics</p>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, bg, truncate }) {
  return (
    <div className="bg-gsrp-dark-card/50 border border-gsrp-dark-border/50 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <span className="text-sm text-gray-400">{label}</span>
      </div>
      <div className={`text-2xl font-bold text-white ${truncate ? 'truncate text-lg' : ''}`}>{value}</div>
    </div>
  );
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session) {
    return { redirect: { destination: '/login', permanent: false } };
  }

  return { props: {} };
}
