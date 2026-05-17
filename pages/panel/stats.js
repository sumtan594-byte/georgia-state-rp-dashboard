import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRefreshedUser } from '../../lib/UserRefreshContext';
import { ROLES, hasRole } from '../../lib/auth';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../lib/auth-options';
import {
  Server, Users, Activity, Clock, Loader2, RefreshCw,
  TrendingUp, TrendingDown, Minus, UserCheck, ListOrdered,
} from 'lucide-react';

const HISTORY_KEY = 'gsrp_stats_history';
const MAX_HISTORY = 120;
const REFRESH_INTERVAL = 30000;

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return parsed.map(e => ({ ...e, time: new Date(e.time) }));
  } catch {
    return [];
  }
}

function saveHistory(history) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    // ignore
  }
}

export default function ServerStatsPage() {
  const { status } = useSession();
  const { refreshedUser } = useRefreshedUser();
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [chartHover, setChartHover] = useState(null);
  const svgRef = useRef(null);

  const canAccess = hasRole({ user: refreshedUser }, ROLES.PANEL) || refreshedUser?.isAdmin;

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/panel/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        setLastUpdated(new Date());
        setHistory(prev => {
          const entry = { time: new Date(), players: data.playerCount, maxPlayers: data.maxPlayers, staff: data.staffCount, queue: data.queueCount };
          const updated = [...prev, entry].slice(-MAX_HISTORY);
          saveHistory(updated);
          return updated;
        });
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  useEffect(() => {
    if (status === 'loading' || !canAccess) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const saved = loadHistory();
    setHistory(saved);
    fetchStats().then(() => setLoading(false));
    const interval = setInterval(fetchStats, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [status, canAccess, fetchStats]);

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

  const currentPlayers = stats?.playerCount ?? 0;
  const maxPlayers = stats?.maxPlayers ?? 0;
  const staffCount = stats?.staffCount ?? 0;
  const queueCount = stats?.queueCount ?? 0;

  const prevPlayers = history.length >= 2 ? history[history.length - 2].players : currentPlayers;
  const playerDiff = currentPlayers - prevPlayers;
  const playerTrend = playerDiff > 0 ? 'up' : playerDiff < 0 ? 'down' : 'stable';

  const firstPlayers = history.length > 0 ? history[0].players : currentPlayers;
  const sessionDiff = currentPlayers - firstPlayers;

  const capacityPercent = maxPlayers > 0 ? Math.round((currentPlayers / maxPlayers) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Server className="w-7 h-7 text-gsrp-orange" />
            Server Statistics
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {stats?.serverName || 'Server'} &middot; {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Loading...'}
          </p>
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
            <StatCard
              icon={Users}
              label="Players Online"
              value={currentPlayers}
              subtitle={`of ${maxPlayers} capacity (${capacityPercent}%)`}
              trend={playerTrend}
              trendValue={playerDiff}
              color="text-blue-400"
              bg="bg-blue-500/10"
            />
            <StatCard
              icon={UserCheck}
              label="Staff Online"
              value={staffCount}
              subtitle={`${stats.adminCount} admin${stats.adminCount !== 1 ? 's' : ''} · ${stats.modCount} mod${stats.modCount !== 1 ? 's' : ''} · ${stats.helperCount} helper${stats.helperCount !== 1 ? 's' : ''}`}
              color="text-emerald-400"
              bg="bg-emerald-500/10"
            />
            <StatCard
              icon={ListOrdered}
              label="In Queue"
              value={queueCount}
              subtitle={queueCount > 0 ? 'Waiting to join' : 'No queue'}
              color="text-yellow-400"
              bg="bg-yellow-500/10"
            />
            <StatCard
              icon={Activity}
              label="Session Change"
              value={sessionDiff > 0 ? `+${sessionDiff}` : sessionDiff}
              subtitle={`Since page load (${history.length} data points)`}
              trend={sessionDiff > 0 ? 'up' : sessionDiff < 0 ? 'down' : 'stable'}
              trendValue={sessionDiff}
              color="text-purple-400"
              bg="bg-purple-500/10"
            />
          </div>

          <div className="bg-gsrp-dark-card/50 border border-gsrp-dark-border/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <Activity className="w-4 h-4" /> Player Count Trend
              </h3>
              {history.length > 1 && (
                <span className="text-xs text-gray-500">
                  {history.length} samples &middot; {formatTimeRange(history[0].time, history[history.length - 1].time)}
                </span>
              )}
            </div>

            {history.length >= 2 ? (
              <PlayerLineChart
                data={history}
                hover={chartHover}
                onHover={setChartHover}
                svgRef={svgRef}
              />
            ) : (
              <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
                Collecting data points... (updates every 30s)
              </div>
            )}
          </div>
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

function PlayerLineChart({ data, hover, onHover, svgRef }) {
  const [dimensions, setDimensions] = useState({ width: 800, height: 250 });
  const containerRef = useRef(null);

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        setDimensions({ width: w, height: Math.min(280, Math.max(180, w * 0.3)) });
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const { width, height } = dimensions;
  const padding = { top: 20, right: 20, bottom: 35, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const players = data.map(d => d.players);
  const minVal = Math.max(0, Math.min(...players) - 2);
  const maxVal = Math.max(...players) + 2;
  const range = maxVal - minVal || 1;

  const xScale = (i) => padding.left + (i / Math.max(data.length - 1, 1)) * chartW;
  const yScale = (v) => padding.top + chartH - ((v - minVal) / range) * chartH;

  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xScale(i).toFixed(1)},${yScale(d.players).toFixed(1)}`).join(' ');
  const areaPath = linePath + ` L${xScale(data.length - 1).toFixed(1)},${(padding.top + chartH).toFixed(1)} L${xScale(0).toFixed(1)},${(padding.top + chartH).toFixed(1)} Z`;

  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) => minVal + (range * i) / yTicks);

  const xTickCount = Math.min(6, data.length);
  const xTickIndices = Array.from({ length: xTickCount }, (_, i) => Math.round((i / (xTickCount - 1)) * (data.length - 1)));

  const handleMouseMove = (e) => {
    if (!svgRef?.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    let closest = 0;
    let closestDist = Infinity;
    for (let i = 0; i < data.length; i++) {
      const dist = Math.abs(xScale(i) - mouseX);
      if (dist < closestDist) {
        closestDist = dist;
        closest = i;
      }
    }
    onHover(closest);
  };

  const handleMouseLeave = () => onHover(null);

  const hoverIdx = hover !== null && hover < data.length ? hover : null;
  const hoverData = hoverIdx !== null ? data[hoverIdx] : null;

  return (
    <div ref={containerRef} className="w-full">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="select-none"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#F97316" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#FB923C" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F97316" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#F97316" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {yTickValues.map((v, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              y1={yScale(v)}
              x2={width - padding.right}
              y2={yScale(v)}
              stroke="#1E2A4A"
              strokeWidth="1"
              strokeDasharray={i === 0 ? '0' : '4,4'}
            />
            <text
              x={padding.left - 8}
              y={yScale(v) + 4}
              textAnchor="end"
              fill="#6B7280"
              fontSize="11"
            >
              {Math.round(v)}
            </text>
          </g>
        ))}

        {xTickIndices.map((idx, i) => (
          <text
            key={i}
            x={xScale(idx)}
            y={height - 8}
            textAnchor="middle"
            fill="#6B7280"
            fontSize="10"
          >
            {formatTime(data[idx].time)}
          </text>
        ))}

        <path d={areaPath} fill="url(#areaGrad)" />
        <path d={linePath} fill="none" stroke="url(#lineGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {data.map((d, i) => (
          <circle
            key={i}
            cx={xScale(i)}
            cy={yScale(d.players)}
            r={hoverIdx === i ? 5 : 2}
            fill={hoverIdx === i ? '#F97316' : '#F97316'}
            opacity={hoverIdx === null || hoverIdx === i ? 1 : 0.3}
            className="transition-all duration-150"
          />
        ))}

        {hoverData && hoverIdx !== null && (
          <>
            <line
              x1={xScale(hoverIdx)}
              y1={padding.top}
              x2={xScale(hoverIdx)}
              y2={padding.top + chartH}
              stroke="#F97316"
              strokeWidth="1"
              strokeDasharray="3,3"
              opacity="0.5"
            />
            <rect
              x={Math.min(xScale(hoverIdx) - 55, width - padding.right - 110)}
              y={Math.max(yScale(hoverData.players) - 42, padding.top)}
              width="110"
              height="34"
              rx="6"
              fill="#0F1629"
              stroke="#1E2A4A"
              strokeWidth="1"
            />
            <text
              x={Math.min(xScale(hoverIdx), width - padding.right - 55)}
              y={Math.max(yScale(hoverData.players) - 22, padding.top + 14)}
              textAnchor="middle"
              fill="#F97316"
              fontSize="13"
              fontWeight="bold"
            >
              {hoverData.players} players
            </text>
            <text
              x={Math.min(xScale(hoverIdx), width - padding.right - 55)}
              y={Math.max(yScale(hoverData.players) - 8, padding.top + 28)}
              textAnchor="middle"
              fill="#6B7280"
              fontSize="10"
            >
              {formatDateTime(hoverData.time)}
            </text>
          </>
        )}
      </svg>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, subtitle, trend, trendValue, color, bg }) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-gray-500';

  return (
    <div className="bg-gsrp-dark-card/50 border border-gsrp-dark-border/50 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
          <span className="text-sm text-gray-400">{label}</span>
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs ${trendColor}`}>
            <TrendIcon className="w-3 h-3" />
            <span>{trendValue > 0 ? `+${trendValue}` : trendValue}</span>
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
    </div>
  );
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatTimeRange(start, end) {
  const diffMs = end - start;
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 60) return `Last ${diffMin} min`;
  const diffHr = Math.floor(diffMin / 60);
  const remMin = diffMin % 60;
  return `Last ${diffHr}h ${remMin}m`;
}

export async function getServerSideProps(context) {
  const { isFullAdmin } = await import('../../lib/admin-helper');
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session) {
    return { redirect: { destination: '/login', permanent: false } };
  }

  return { props: {} };
}
