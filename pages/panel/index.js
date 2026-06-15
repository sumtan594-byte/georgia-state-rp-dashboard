import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  Loader2, Radio, Users, AlertTriangle, WifiOff, ArrowLeft,
} from 'lucide-react';
import LoginScreen from '../../components/auth/LoginScreen';
import PanelLayout from '../../components/panel/PanelLayout';
import PlayerList from '../../components/panel/PlayerList';
import OperationsPanel from '../../components/panel/OperationsPanel';
import CommandBar from '../../components/panel/CommandBar';
import PlayerActionPanel from '../../components/panel/PlayerActionPanel';
import { useRefreshedUser } from '../../lib/UserRefreshContext';
import AccessDenied from '../../components/auth/AccessDenied';

const LiveMap = dynamic(() => import('../../components/panel/LiveMap'), { ssr: false });

export async function getServerSideProps(context) {
  const { getServerSession } = require('next-auth');
  const { authOptions } = require('../../lib/auth-options');
  await getServerSession(context.req, context.res, authOptions);
  return { props: {} };
}

const NKZ_ROLE_ID = '1372468936867708988';

export default function PanelPage() {
  const { data: session, status } = useSession();
  const { session: refreshedSession, hasRefreshed, accessDenied } = useRefreshedUser();
  const effectiveSession = refreshedSession || session;

  // Core data
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rateLimitUntil, setRateLimitUntil] = useState(null);
  const intervalRef = useRef(null);
  const dataRef = useRef(null);
  const rateLimitUntilRef = useRef(null);
  const hasFetched = useRef(false);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Player selection
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  // Sidebar filters
  const [searchQuery, setSearchQuery] = useState('');
  const [teamFilter, setTeamFilter] = useState('All');

  // Mobile
  const [mobileView, setMobileView] = useState('map');

  // Command bar
  const [recentCommands, setRecentCommands] = useState([]);

  // Camera lock
  const [lockedPlayerId, setLockedPlayerId] = useState(null);

  const isNkz = effectiveSession?.user?.roles?.includes(NKZ_ROLE_ID) || effectiveSession?.user?.isAdmin;

  // Vehicles from data
  const vehicles = data?.Vehicles || [];

  /* ── Fetch ERLC data via SSE + polling fallback ──────────────────────── */
  const evtSourceRef = useRef(null);

  const handleData = useCallback((newData) => {
    setData(newData);
    setError(null);
    setRateLimitUntil(null);
    rateLimitUntilRef.current = null;
    setLoading(false);
  }, []);

  const handleError = useCallback((errMsg, until) => {
    setError(errMsg);
    if (until) {
      setRateLimitUntil(until);
      rateLimitUntilRef.current = until;
    }
    setLoading(false);
  }, []);

  // SSE subscription
  const lastSseRef = useRef(0);

  useEffect(() => {
    const es = new EventSource('/api/panel/events');
    evtSourceRef.current = es;

    es.addEventListener('players', (e) => {
      lastSseRef.current = Date.now();
      try {
        handleData(JSON.parse(e.data));
      } catch { /* ignore bad messages */ }
    });

    es.onerror = () => {};

    return () => { es.close(); evtSourceRef.current = null; };
  }, [handleData]);

  // Polling fallback — only fires if SSE has been quiet for 5+ seconds
  const fetchData = useCallback(async () => {
    if (Date.now() - lastSseRef.current < 5000) return;
    if (rateLimitUntilRef.current && Date.now() < rateLimitUntilRef.current) return;
    try {
      const res = await fetch('/api/panel/players');
      if (res.ok) {
        const json = await res.json();
        if (!json._stale) handleData(json);
      } else if (res.status === 429) {
        const retryAfter = Number(res.headers.get('Retry-After') || 5);
        handleError(dataRef.current ? 'ER:LC API rate limited. Showing latest cached data.' : `ER:LC API rate limited. Retrying in ${retryAfter}s.`, Date.now() + retryAfter * 1000);
      } else {
        handleError(`Server error: ${res.status}`);
      }
    } catch {
      handleError('Network error — server may be offline');
    } finally {
      setLoading(false);
    }
  }, [handleData, handleError]);

  // Initial fetch + polling interval
  useEffect(() => {
    if (!hasFetched.current) { hasFetched.current = true; fetchData(); }
    intervalRef.current = setInterval(fetchData, 4000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchData]);

  /* ── ERLC alerts ─────────────────────────────────────────────────────── */
  const alerts = [];
  if (data) {
    if (data.CurrentPlayers < 10)
      alerts.push({ type: 'critical', icon: AlertTriangle, message: `Server critically low: ${data.CurrentPlayers} players` });
    else if (data.CurrentPlayers < 30)
      alerts.push({ type: 'warning', icon: Users, message: `Low player count: ${data.CurrentPlayers} players` });
    if ((data.KillLogs || []).length > 5)
      alerts.push({ type: 'danger', icon: AlertTriangle, message: `High kill rate: ${data.KillLogs.length} kills` });
  }

  /* ── Teleport handler ─────────────────────────────────────────────────── */
  const handleTeleport = useCallback(async (srcName, tgtName) => {
    try {
      await fetch('/api/panel/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: `:tp ${srcName} ${tgtName}` }),
      });
      setRecentCommands(prev => [...prev, `:tp ${srcName} ${tgtName}`].slice(-10));
    } catch { /* ignore */ }
  }, []);

  /* ── Command bar handler ──────────────────────────────────────────────── */
  const handleSendCommand = useCallback(async (cmd) => {
    const res = await fetch('/api/panel/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: cmd }),
    });
    if (res.ok || res.status === 204) {
      setRecentCommands(prev => [cmd, ...prev.filter(c => c !== cmd)].slice(-10));
    }
    return res;
  }, []);

  /* ── Player selection: clicking blip also locks camera ───────────────── */
  const handleSelectPlayer = useCallback((p) => {
    setSelectedPlayer(prev => {
      if (prev?.Player === p?.Player) {
        setLockedPlayerId(null);
        return null;
      }
      // Lock camera to clicked player
      if (p) {
        const ci = (p.Player || '').lastIndexOf(':');
        const id = ci !== -1 ? p.Player.slice(ci + 1) : p.Player;
        setLockedPlayerId(id);
      }
      return p;
    });
  }, []);

  /* ── Loading / auth states ───────────────────────────────────────────── */
  if (status === 'loading' || !hasRefreshed) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center">
          <Loader2 className="w-8 h-8 text-gsrp-orange animate-spin mb-4" />
          <span className="text-white/40 font-mono text-xs uppercase tracking-[0.3em]">Loading Panel</span>
        </div>
      </div>
    );
  }

  if (!session) return <LoginScreen />;
  if (accessDenied) return <AccessDenied roleId={accessDenied.roleId} />;

  return (
    <div className="h-full flex flex-col">
      {/* Top bar */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 card-glass rounded-none border-b border-gsrp-dark-border/50">
        <div className={`w-2.5 h-2.5 rounded-full ${data ? 'bg-green-500 animate-glow-pulse' : 'bg-red-500'}`} />
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-base font-semibold text-white/80 truncate">{data?.Name || 'Connecting...'}</span>
          {data && (
            <span className="text-xs font-mono text-white/30">
              <span className="text-gsrp-orange/70">{data.CurrentPlayers}</span>/{data.MaxPlayers}
            </span>
          )}
        </div>

        {alerts.length > 0 && (
          <div className="hidden sm:flex items-center gap-3 ml-2">
            {alerts.map((a, i) => (
              <span key={i} className={`flex items-center gap-1 text-xs font-medium ${
                a.type === 'critical' ? 'text-gsrp-sunset' : a.type === 'danger' ? 'text-red-400' : 'text-gsrp-orange'
              }`}>
                <a.icon size={12} />
                {a.message}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 ml-auto">
          <Link href="/"
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white/30 border border-gsrp-dark-border/50 hover:text-white/60 hover:border-white/20 transition-all cursor-pointer">
            <ArrowLeft size={14} />
            Dashboard
          </Link>

          {error && (
            <div className="flex items-center gap-1 text-xs text-gsrp-sunset/50">
              <WifiOff size={12} />
              <span className="hidden sm:inline">Disconnected</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 rounded-lg border border-green-400/20 bg-green-400/10 px-3 py-2 text-xs font-semibold tracking-wider text-green-300">
            <Radio size={14} className="animate-pulse" />
            <span className="hidden sm:inline">Live</span>
          </div>
        </div>
      </div>

      {error && !data && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <WifiOff size={32} className="text-gsrp-sunset/30 mx-auto mb-3" />
            <p className="text-white/50 text-sm mb-3">{error}</p>
            <button onClick={fetchData}
              className="px-4 py-2 rounded-lg bg-gsrp-orange/20 text-gsrp-orange border border-gsrp-orange/30 text-xs font-semibold hover:bg-gsrp-orange/30 transition-all cursor-pointer">
              Retry
            </button>
          </div>
        </div>
      )}

      {loading && !data && (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-gsrp-orange animate-spin" />
        </div>
      )}

      {data && (
        <PanelLayout
          mobileView={mobileView}
          setMobileView={setMobileView}
          playerList={
            <PlayerList
              players={data.Players || []}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              teamFilter={teamFilter}
              onTeamChange={setTeamFilter}
              selectedPlayer={selectedPlayer}
              onSelectPlayer={handleSelectPlayer}
            />
          }
          liveMap={
            <div className="relative w-full h-full">
              <LiveMap
                players={data.Players || []}
                emergencyCalls={data.EmergencyCalls || []}
                selectedPlayer={selectedPlayer}
                onSelectPlayer={handleSelectPlayer}
                isNkz={isNkz}
                onTeleport={handleTeleport}
                teamFilter={teamFilter}
                lockedPlayerId={lockedPlayerId}
                onLockPlayer={setLockedPlayerId}
                server={data}
                live
                error={error}
                rateLimitUntil={rateLimitUntil}
              />

              {/* Player Action Panel — overlays on map */}
              {selectedPlayer && (
                <PlayerActionPanel
                  player={selectedPlayer}
                  vehicles={vehicles}
                  session={effectiveSession}
                  onClose={() => { setSelectedPlayer(null); setLockedPlayerId(null); }}
                />
              )}
            </div>
          }
          infoPanel={
            <OperationsPanel
              players={data.Players || []}
              emergencyCalls={data.EmergencyCalls || []}
              server={data}
              live
              error={error}
              rateLimitUntil={rateLimitUntil}
              loading={loading}
            />
          }
          logPanel={null}
          commandBar={isNkz ? <CommandBar onSendCommand={handleSendCommand} recentCommands={recentCommands} /> : null}
        />
      )}
    </div>
  );
}
