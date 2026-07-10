import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  Loader2, Radio, Users, AlertTriangle, WifiOff, ArrowLeft, Clock, Server, MapPinned, Shield,
} from 'lucide-react';
import LoginScreen from '../../components/auth/LoginScreen';
import PanelLayout from '../../components/panel/PanelLayout';
import PlayerList from '../../components/panel/PlayerList';
import OperationsPanel from '../../components/panel/OperationsPanel';
import CommandBar from '../../components/panel/CommandBar';
import PlayerActionPanel from '../../components/panel/PlayerActionPanel';
import { useRefreshedUser } from '../../lib/UserRefreshContext';
import AccessDenied from '../../components/auth/AccessDenied';
import { PanelSkeleton } from '../../components/SkeletonLoader';

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
  const [loadStartedAt] = useState(() => Date.now());
  const [loadStage, setLoadStage] = useState('auth');
  const hasConnected = useRef(false);
  const [nowMs, setNowMs] = useState(Date.now());

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

  /* ── Shared ERLC data stream ─────────────────────────────────────────── */
  const evtSourceRef = useRef(null);

  const handleData = useCallback((newData) => {
    setData(newData);
    setError(null);
    setRateLimitUntil(null);
    setLoading(false);
  }, []);

  const handleError = useCallback((errMsg, until) => {
    setError(errMsg);
    if (until) {
      setRateLimitUntil(until);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let retryTimer = null;
    let retryDelay = 2000;

    const connect = () => {
      if (cancelled) return;
      const es = new EventSource('/api/panel/events');
      evtSourceRef.current = es;

      es.onopen = () => {
        retryDelay = 2000;
        setLoadStage(s => s === 'auth' || s === 'stream' ? 'poll' : s);
      };

      es.addEventListener('players', (e) => {
        hasConnected.current = true;
        setLoadStage('render');
        try {
          handleData(JSON.parse(e.data));
        } catch { /* ignore bad messages */ }
      });

      es.onerror = () => {
        // A fatal error (e.g. 401/403) closes the stream; reconnect ourselves
        // with backoff instead of asking the user to refresh.
        if (es.readyState === EventSource.CLOSED) {
          es.close();
          if (evtSourceRef.current === es) evtSourceRef.current = null;
          if (!hasConnected.current) {
            handleError('Connecting to live map…');
          }
          retryTimer = setTimeout(connect, retryDelay);
          retryDelay = Math.min(retryDelay * 2, 15000);
        }
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (evtSourceRef.current) { evtSourceRef.current.close(); evtSourceRef.current = null; }
    };
  }, [handleData, handleError]);

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 100);
    return () => clearInterval(timer);
  }, []);

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

  const poll = data?._poll || null;
  const nextPollMs = poll?.fetchedAt && poll?.intervalMs
    ? Math.max(0, (poll.fetchedAt + poll.intervalMs) - nowMs)
    : null;
  const initialLoadMs = nowMs - loadStartedAt;
  useEffect(() => {
    if (status !== 'loading' && hasRefreshed) {
      setLoadStage(s => s === 'auth' ? 'stream' : s);
    }
  }, [status, hasRefreshed]);

  const initialLoadProgress = getInitialLoadProgress({
    loadStage,
    hasData: !!data,
    hasError: !!error,
  });

  /* ── Loading / auth states ───────────────────────────────────────────── */
  if (status === 'loading' || !hasRefreshed) {
    return <PanelSkeleton />;
  }

  if (!session) return <LoginScreen />;
  if (accessDenied) return <AccessDenied roleId={accessDenied.roleId} />;
  if (loading && !data && !error) return <PanelSkeleton />;

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
          <Link href="/dashboard"
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
          {poll && (
            <div className="hidden md:flex items-center gap-2 rounded-lg border border-gsrp-dark-border/60 bg-black/20 px-3 py-2 text-xs font-semibold text-white/45">
              <Clock size={13} className="text-gsrp-orange/70" />
              <span>Next poll {formatDuration(nextPollMs)}</span>
              {poll.rateLimit && (
                <span className="font-mono text-white/30">
                  {poll.rateLimit.remaining ?? '?'}/{poll.rateLimit.limit ?? '?'} {poll.rateLimit.bucket || ''}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {error && !data && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <WifiOff size={32} className="text-gsrp-sunset/30 mx-auto mb-3" />
            <p className="text-white/50 text-sm mb-3">{error}</p>
            <button onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-gsrp-orange/20 text-gsrp-orange border border-gsrp-orange/30 text-xs font-semibold hover:bg-gsrp-orange/30 transition-all cursor-pointer">
              Retry
            </button>
          </div>
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

function getInitialLoadProgress({ loadStage, hasData, hasError }) {
  if (hasError) {
    return { percent: 100, stage: 4, title: 'Connection interrupted', detail: 'Waiting for the live stream to reconnect', icon: WifiOff };
  }
  if (hasData) {
    return { percent: 100, stage: 4, title: 'Live map ready', detail: 'Rendering players and patrol data', icon: Radio };
  }
  switch (loadStage) {
    case 'auth':
      return { percent: 15, stage: 0, title: 'Authenticating', detail: 'Checking session and Discord roles', icon: Shield };
    case 'stream':
      return { percent: 40, stage: 1, title: 'Connecting stream', detail: 'Opening SSE connection to server', icon: Radio };
    case 'poll':
      return { percent: 65, stage: 2, title: 'Fetching data', detail: 'Waiting for first ER:LC server frame', icon: Server };
    case 'render':
      return { percent: 90, stage: 3, title: 'Rendering map', detail: 'Drawing players and patrol data', icon: MapPinned };
    default:
      return { percent: 5, stage: 0, title: 'Initializing', detail: 'Starting up', icon: Clock };
  }
}

function PanelLoadingState({ progress, elapsedMs }) {
  const Icon = progress.icon || Loader2;
  return (
    <div className="gsrp-panel-loading flex-1 flex items-center justify-center px-4">
      <div className="gsrp-panel-loading-card">
        <div className="gsrp-panel-loading-orbit">
          <div className="gsrp-panel-loading-ring" />
          <Icon size={28} className="relative z-10 text-gsrp-orange" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/75">{progress.title}</p>
              <p className="mt-1 text-xs font-semibold text-white/35">{progress.detail}</p>
            </div>
            <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold text-white/45">
              {Math.floor(elapsedMs / 1000)}s
            </span>
          </div>
          <div className="gsrp-panel-loading-track">
            <div className="gsrp-panel-loading-fill" style={{ width: `${progress.percent}%` }} />
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {['Auth', 'Stream', 'Poll', 'Render'].map((step, index) => (
              <div key={step} className={`gsrp-panel-loading-step ${index <= (progress.stage ?? 0) ? 'is-active' : ''}`}>
                {step}
              </div>
            ))}
            <div className="mt-1.5 flex justify-between text-[10px] font-mono text-white/20">
              <span>{Math.floor(elapsedMs / 1000)}s elapsed</span>
              <span>{progress.percent}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDuration(ms) {
  if (ms == null) return '--';
  if (ms <= 0) return '0.0s';
  if (ms < 1000) return `0.${Math.ceil(ms / 100)}s`;
  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
