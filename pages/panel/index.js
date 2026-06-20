import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  Loader2, Radio, Users, AlertTriangle, WifiOff, ArrowLeft, X, Clock, Server, MapPinned, Shield,
  Briefcase,
} from 'lucide-react';
import LoginScreen from '../../components/auth/LoginScreen';
import PanelLayout from '../../components/panel/PanelLayout';
import PlayerList from '../../components/panel/PlayerList';
import OperationsPanel from '../../components/panel/OperationsPanel';
import CommandBar from '../../components/panel/CommandBar';
import PlayerActionPanel from '../../components/panel/PlayerActionPanel';
import StaffPanel from '../../components/panel/staff/StaffPanel';
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
  const [loadStartedAt] = useState(() => Date.now());
  const hasConnected = useRef(false);
  const [replay, setReplay] = useState(null);
  const [replayLoading, setReplayLoading] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const [nowMs, setNowMs] = useState(Date.now());

  // Player selection
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  // Sidebar filters
  const [searchQuery, setSearchQuery] = useState('');
  const [teamFilter, setTeamFilter] = useState('All');

  // Mobile
  const [mobileView, setMobileView] = useState('map');
  const [moduleView, setModuleView] = useState('live');

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
    const es = new EventSource('/api/panel/events');
    evtSourceRef.current = es;

    es.addEventListener('players', (e) => {
      hasConnected.current = true;
      try {
        handleData(JSON.parse(e.data));
      } catch { /* ignore bad messages */ }
    });

    es.onerror = () => {
      if (!hasConnected.current) {
        handleError('Live map stream unavailable. Please refresh in a moment.');
      }
    };

    return () => { es.close(); evtSourceRef.current = null; };
  }, [handleData, handleError]);

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 500);
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

  const openReplay = useCallback(async (player) => {
    if (!player?.Player) return;
    const ci = player.Player.lastIndexOf(':');
    const id = ci !== -1 ? player.Player.slice(ci + 1) : player.Player;
    if (!/^\d+$/.test(id)) return;
    setSelectedPlayer(null);
    setReplayLoading(true);
    try {
      const res = await fetch(`/api/panel/replay/${id}`);
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        const snapshots = body.snapshots || [];
        setReplay({
          player,
          playerId: id,
          snapshots,
          snapshotsByPlayer: body.snapshotsByPlayer || {},
          participants: body.participants || [id],
          events: body.events || [],
        });
        setReplayIndex(Math.max(0, snapshots.length - 1));
        setLockedPlayerId(id);
      }
    } finally {
      setReplayLoading(false);
    }
  }, []);

  const closeReplay = useCallback(() => {
    setReplay(null);
    setReplayIndex(0);
  }, []);

  const replaySnapshot = replay?.snapshots?.[replayIndex] || null;
  const replayEvents = replay?.events || [];
  const replayPlayers = replay && replaySnapshot
    ? getReplayPlayersAt(replay, replaySnapshot.sampledAt)
    : [];
  const poll = data?._poll || null;
  const nextPollMs = poll?.nextPollAt ? Math.max(0, poll.nextPollAt - nowMs) : null;
  const initialLoadMs = nowMs - loadStartedAt;
  const initialLoadProgress = getInitialLoadProgress({
    status,
    hasRefreshed,
    hasData: !!data,
    hasError: !!error,
    elapsedMs: initialLoadMs,
  });

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
          <div className="hidden sm:flex rounded-lg border border-gsrp-dark-border/60 bg-black/20 p-1">
            <button
              onClick={() => setModuleView('live')}
              className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-black transition-colors ${moduleView === 'live' ? 'bg-gsrp-orange text-black' : 'text-white/45 hover:text-white'}`}
            >
              <MapPinned size={13} /> Live
            </button>
            <button
              onClick={() => setModuleView('staff')}
              className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-black transition-colors ${moduleView === 'staff' ? 'bg-green-400 text-black' : 'text-white/45 hover:text-white'}`}
            >
              <Briefcase size={13} /> Staff
            </button>
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

      {loading && !data && (
        <PanelLoadingState progress={initialLoadProgress} elapsedMs={initialLoadMs} />
      )}

      {data && (
        <PanelLayout
          mobileView={mobileView}
          setMobileView={setMobileView}
          moduleView={moduleView}
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
              {replay && (
                <ReplayBar
                  replay={replay}
                  index={replayIndex}
                  setIndex={setReplayIndex}
                  snapshot={replaySnapshot}
                  events={replayEvents}
                  onClose={closeReplay}
                />
              )}
              <LiveMap
                players={replay ? replayPlayers : (data.Players || [])}
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
                mapEvents={data.MapEvents || []}
                replayMode={!!replay}
                replaySnapshot={replaySnapshot}
                replayEvents={replayEvents}
              />

              {/* Player Action Panel — overlays on map */}
              {selectedPlayer && !replay && (
                <PlayerActionPanel
                  player={selectedPlayer}
                  vehicles={vehicles}
                  session={effectiveSession}
                  onReplay={() => openReplay(selectedPlayer)}
                  replayLoading={replayLoading}
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
          staffPanel={<StaffPanel liveData={data} session={effectiveSession} />}
          logPanel={null}
          commandBar={isNkz ? <CommandBar onSendCommand={handleSendCommand} recentCommands={recentCommands} /> : null}
        />
      )}
    </div>
  );
}

function getInitialLoadProgress({ status, hasRefreshed, hasData, hasError, elapsedMs }) {
  if (hasError) {
    return { percent: 100, title: 'Connection interrupted', detail: 'Waiting for the live stream to reconnect', icon: WifiOff };
  }
  if (hasData) {
    return { percent: 100, title: 'Live map ready', detail: 'Rendering players and patrol data', icon: Radio };
  }
  if (status === 'loading' || !hasRefreshed) {
    return { percent: 10, title: 'Checking access', detail: 'Authentating session and refreshing Discord roles', icon: Shield };
  }
  if (elapsedMs < 1000) {
    return { percent: 22, title: 'Opening live stream', detail: 'Establishing secure connection to the server feed', icon: Radio };
  }
  if (elapsedMs < 2200) {
    return { percent: 35, title: 'Authenticating stream', detail: 'Validating credentials and permissions with the feed service', icon: Shield };
  }
  if (elapsedMs < 4000) {
    return { percent: 48, title: 'Queueing request', detail: 'Waiting for rate-limit window to open on ER:LC API', icon: Clock };
  }
  if (elapsedMs < 6500) {
    return { percent: 60, title: 'Fetching server frame', detail: 'Requesting player list, kill logs, and command logs', icon: Server };
  }
  if (elapsedMs < 9000) {
    return { percent: 72, title: 'Polling complete data', detail: 'Received server frame; scanning kill/command logs', icon: Server };
  }
  if (elapsedMs < 12000) {
    return { percent: 85, title: 'Hydrating map data', detail: 'Loading players, avatars, vehicles, and patrol routes', icon: MapPinned };
  }
  return { percent: 95, title: 'Still connected', detail: 'Server is taking longer than expected; staying queued instead of spamming requests', icon: Clock };
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
              <p className="text-sm font-black uppercase tracking-[0.18em] text-white/75">{progress.title}</p>
              <p className="mt-1 text-xs font-semibold text-white/35">{progress.detail}</p>
            </div>
            <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-black text-white/45">
              {Math.floor(elapsedMs / 1000)}s
            </span>
          </div>
          <div className="gsrp-panel-loading-track">
            <div className="gsrp-panel-loading-fill" style={{ width: `${progress.percent}%` }} />
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {['Auth', 'Stream', 'Poll', 'Render'].map((step, index) => (
              <div key={step} className={`gsrp-panel-loading-step ${progress.percent >= (index + 1) * 22 ? 'is-active' : ''}`}>
                {step}
              </div>
            ))}
            <div className="mt-1.5 flex justify-between text-[10px] font-mono text-white/20">
              <span>{Math.floor(elapsedMs / 1000)}s elapsed</span>
              <span>{Math.min(100, Math.floor(elapsedMs / 120))}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatAgo(value) {
  if (!value) return 'now';
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s ago`;
}

function formatDuration(ms) {
  if (ms == null) return '--';
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function getReplayPlayersAt(replay, sampledAt) {
  const target = new Date(sampledAt).getTime();
  const players = [];
  for (const id of replay.participants || []) {
    const snapshots = replay.snapshotsByPlayer?.[id] || [];
    let closest = null;
    let bestDelta = Infinity;
    for (const snapshot of snapshots) {
      const delta = Math.abs(new Date(snapshot.sampledAt).getTime() - target);
      if (delta < bestDelta) {
        bestDelta = delta;
        closest = snapshot;
      }
    }
    if (closest?.player && bestDelta <= 20_000) {
      players.push({
        ...closest.player,
        AvatarUrl: closest.avatarUrl || closest.player.AvatarUrl,
      });
    }
  }
  return players;
}

function eventTextForReplay(event, subjectId) {
  if (event.type === 'kill') {
    if (String(event.playerId) === String(subjectId)) return `Killed ${event.relatedPlayerName || 'player'}`;
    if (String(event.relatedPlayerId) === String(subjectId)) return `Killed by ${event.playerName || 'player'}`;
  }
  if (event.type === 'command') {
    if (String(event.relatedPlayerId) === String(subjectId)) return `${event.playerName || 'Staff'} ran ${event.summary}`;
    return event.summary;
  }
  if (event.type === 'team_change') return event.summary;
  return event.summary;
}

function ReplayBar({ replay, index, setIndex, snapshot, events, onClose }) {
  const nearbyEvents = events.filter(event => {
    if (!snapshot?.sampledAt) return true;
    return Math.abs(new Date(event.at).getTime() - new Date(snapshot.sampledAt).getTime()) <= 20_000;
  });
  return (
    <div className="gsrp-replay-bar absolute left-3 right-3 top-3 z-[650] p-3">
      <div className="mb-2 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-gsrp-orange" />
            <p className="truncate text-sm font-black text-white">{replay.player?.Player?.split(':')?.[0] || 'Player'} replay</p>
            <span className="text-xs font-bold text-white/35">{formatAgo(snapshot?.sampledAt)}</span>
          </div>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {nearbyEvents.length > 0 ? nearbyEvents.map(event => (
              <span key={event.id} className="gsrp-replay-chip shrink-0 px-2.5 py-1 text-[11px] font-bold text-white/70">
                {event.type === 'kill' ? 'Kill' : event.type === 'team_change' ? 'Team' : event.type}: {eventTextForReplay(event, replay.playerId)}
              </span>
            )) : (
              <span className="text-xs text-white/35">No logged events at this moment</span>
            )}
          </div>
        </div>
        <button onClick={onClose} className="gsrp-soft-icon-button rounded-lg p-1 text-white/45 transition-colors hover:text-white">
          <X size={16} />
        </button>
      </div>
      <input
        type="range"
        min="0"
        max={Math.max(0, (replay.snapshots?.length || 1) - 1)}
        value={index}
        onChange={event => setIndex(Number(event.target.value))}
        className="gsrp-replay-range w-full accent-gsrp-orange"
      />
    </div>
  );
}
