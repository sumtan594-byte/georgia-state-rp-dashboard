import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  Loader2, Pause, Play, Users, AlertTriangle, WifiOff, ArrowLeft, Radio,
} from 'lucide-react';
import LoginScreen from '../../components/auth/LoginScreen';
import PanelLayout from '../../components/panel/PanelLayout';
import PlayerList from '../../components/panel/PlayerList';
import InfoPanel from '../../components/panel/InfoPanel';
import CommandBar from '../../components/panel/CommandBar';
import PlayerActionPanel from '../../components/panel/PlayerActionPanel';
import RoleplayLogs from '../../components/panel/RoleplayLogs';
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
  const [live, setLive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

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

  // Roleplay logs state
  const [roleplays, setRoleplays] = useState([]);
  const [rpLogsOpen, setRpLogsOpen] = useState(false);

  // Map interaction modes
  const [playerSelectMode, setPlayerSelectMode] = useState(false);
  const [locationSelectMode, setLocationSelectMode] = useState(false);
  const [pendingPlayerSelect, setPendingPlayerSelect] = useState(null);
  const [pendingLocationSelect, setPendingLocationSelect] = useState(null);
  // For "move location" on an existing RP
  const [movingRpId, setMovingRpId] = useState(null);

  const isNkz = effectiveSession?.user?.roles?.includes(NKZ_ROLE_ID) || effectiveSession?.user?.isAdmin;

  // Vehicles from data
  const vehicles = data?.Vehicles || [];

  /* ── Fetch ERLC data ────────────────────────────────────────────────── */
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/panel/players');
      if (res.ok) {
        setData(await res.json());
        setError(null);
      } else if (res.status !== 429) {
        setError(`Server error: ${res.status}`);
      }
    } catch {
      setError('Network error — server may be offline');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    if (live) intervalRef.current = setInterval(fetchData, 2500);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [live, fetchData]);

  /* ── Fetch active roleplays ─────────────────────────────────────────── */
  const fetchRoleplays = useCallback(async () => {
    try {
      const res = await fetch('/api/panel/roleplays');
      if (res.ok) setRoleplays(await res.json());
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchRoleplays();
    const t = setInterval(fetchRoleplays, 10000);
    return () => clearInterval(t);
  }, [fetchRoleplays]);

  /* ── Auto-expire roleplays ──────────────────────────────────────────── */
  useEffect(() => {
    const t = setInterval(() => {
      const now = Date.now();
      setRoleplays(prev => prev.map(rp =>
        rp.active && new Date(rp.expiresAt) < now ? { ...rp, active: false } : rp
      ));
    }, 5000);
    return () => clearInterval(t);
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

  /* ── Map mode: player select ──────────────────────────────────────────── */
  const handleRequestPlayerSelect = useCallback(() => {
    setPlayerSelectMode(true);
    setLocationSelectMode(false);
  }, []);

  const handlePlayerSelected = useCallback((info) => {
    setPlayerSelectMode(false);
    setPendingPlayerSelect(info);
    setTimeout(() => setPendingPlayerSelect(null), 100);
  }, []);

  /* ── Map mode: location select (create or move) ────────────────────────── */
  const handleRequestLocationSelect = useCallback((rpId = null) => {
    const actualId = (rpId && typeof rpId === 'string') ? rpId : null;
    setLocationSelectMode(true);
    setPlayerSelectMode(false);
    setMovingRpId(actualId);
  }, []);

  const handleLocationSelected = useCallback(async ({ location, pinX, pinY }) => {
    console.log('[Panel] Location Selected. movingRpId:', movingRpId);
    setLocationSelectMode(false);
      if (movingRpId) {
        const rpIdString = typeof movingRpId === 'object' ? movingRpId.rpId : movingRpId;
        if (!rpIdString) return;
        // Moving an existing RP pin
        await fetch(`/api/panel/roleplays/${rpIdString}`, {

        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'move', pinX, pinY, location }),
      });
      setRoleplays(prev => prev.map(rp =>
        rp.rpId === movingRpId ? { ...rp, pinX, pinY, location } : rp
      ));
      setMovingRpId(null);
    } else {
      // New RP location select
      setPendingLocationSelect({ location, pinX, pinY });
      setTimeout(() => setPendingLocationSelect(null), 100);
    }
  }, [movingRpId]);

  /* ── "Where I Am" location for current moderator ─────────────────────── */
  const myLocationData = useCallback(() => {
    if (!effectiveSession?.user?.name || !data?.Players) return null;
    const me = data.Players.find(p => {
      const ci = (p.Player || '').lastIndexOf(':');
      const name = ci !== -1 ? p.Player.slice(0, ci) : p.Player;
      return name.toLowerCase() === effectiveSession.user.name.toLowerCase();
    });
    if (!me?.Location) return null;
    const { toPixel } = require('../../components/panel/LiveMap'); // We export these
    // Inline pixel calc here instead of dynamic require:
    const MAP_PX = 3120, OFFSET_X = 11, OFFSET_Z = -17, SPAN_X = 3142, SPAN_Z = 3089;
    const lx = me.Location.LocationX || 0;
    const lz = me.Location.LocationZ || 0;
    const pinX = ((lx + OFFSET_X) / SPAN_X) * MAP_PX;
    const pinY = MAP_PX - ((lz + OFFSET_Z) / SPAN_Z) * MAP_PX;
    const loc = me.Location;
    const location = [loc.StreetName, loc.PostalCode ? `Postal #${loc.PostalCode}` : ''].filter(Boolean).join(', ') || `${Math.round(lx)}, ${Math.round(lz)}`;
    return { location, pinX, pinY };
  }, [effectiveSession, data]);

  /* ── Roleplay CRUD handlers ──────────────────────────────────────────── */
  const handleRoleplayCreated = useCallback((rp) => {
    setRoleplays(prev => [rp, ...prev]);
  }, []);

  const handleRoleplayUpdated = useCallback(({ rpId, expiresAt }) => {
    setRoleplays(prev => prev.map(rp => rp.rpId === rpId ? { ...rp, expiresAt } : rp));
  }, []);

  const handleRoleplayEnded = useCallback((rpId) => {
    setRoleplays(prev => prev.map(rp => rp.rpId === rpId ? { ...rp, active: false } : rp));
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

  const activeRoleplays = roleplays.filter(r => r.active);

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
          {/* Roleplay Logs button */}
          <button
            onClick={() => setRpLogsOpen(v => !v)}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
              rpLogsOpen
                ? 'bg-gsrp-orange/15 text-gsrp-orange border-gsrp-orange/30'
                : 'bg-white/5 text-white/40 border-gsrp-dark-border/50 hover:text-white/70 hover:border-white/20'
            }`}
          >
            <Radio size={14} />
            Roleplay Logs
            {activeRoleplays.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-gsrp-orange text-black text-[10px] font-bold leading-none">
                {activeRoleplays.length}
              </span>
            )}
          </button>

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

          <button
            onClick={() => setLive(!live)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold tracking-wider transition-all border cursor-pointer ${
              live
                ? 'bg-gsrp-orange/15 text-gsrp-orange border-gsrp-orange/30'
                : 'bg-white/5 text-white/30 border-gsrp-dark-border/50 hover:text-white/60 hover:border-white/20'
            }`}
          >
            {live ? <Play size={14} /> : <Pause size={14} />}
            <span className="hidden sm:inline">{live ? 'Live' : 'Paused'}</span>
          </button>
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
                roleplays={activeRoleplays}
                playerSelectMode={playerSelectMode}
                onPlayerSelected={handlePlayerSelected}
                locationSelectMode={locationSelectMode}
                onLocationSelected={handleLocationSelected}
                lockedPlayerId={lockedPlayerId}
                onLockPlayer={setLockedPlayerId}
              />

              {/* Player Action Panel — overlays on map */}
              {selectedPlayer && (
                <PlayerActionPanel
                  player={selectedPlayer}
                  vehicles={vehicles}
                  roleplays={activeRoleplays}
                  session={effectiveSession}
                  onClose={() => { setSelectedPlayer(null); setLockedPlayerId(null); }}
                />
              )}

              {/* Roleplay Logs overlay on map */}
              <RoleplayLogs
                open={rpLogsOpen}
                onClose={() => setRpLogsOpen(false)}
                players={data.Players || []}
                roleplays={activeRoleplays}
                onRolepayCreated={handleRoleplayCreated}
                onRoleplayUpdated={handleRoleplayUpdated}
                onRoleplayEnded={handleRoleplayEnded}
                onRequestPlayerSelect={handleRequestPlayerSelect}
                pendingPlayerSelect={pendingPlayerSelect}
                onRequestLocationSelect={handleRequestLocationSelect}
                pendingLocationSelect={pendingLocationSelect}
                myLocation={myLocationData()}
              />

              {/* Roleplay Logs button on map (top-right) for mobile / always visible */}
              <button
                onClick={() => setRpLogsOpen(v => !v)}
                className={`absolute top-3 right-3 z-[200] flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold shadow-lg transition-all border cursor-pointer sm:hidden ${
                  rpLogsOpen
                    ? 'bg-gsrp-orange/20 text-gsrp-orange border-gsrp-orange/30'
                    : 'bg-gsrp-dark-card/90 text-white/50 border-gsrp-dark-border/50'
                }`}
              >
                <Radio size={13} />
                RP Logs
                {activeRoleplays.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-gsrp-orange text-black text-[10px] font-bold leading-none">
                    {activeRoleplays.length}
                  </span>
                )}
              </button>
            </div>
          }
          infoPanel={
            <InfoPanel
              joinLogs={data.JoinLogs || []}
              killLogs={data.KillLogs || []}
              commandLogs={data.CommandLogs || []}
              modCalls={data.ModCalls || []}
            />
          }
          logPanel={null}
          commandBar={isNkz ? <CommandBar onSendCommand={handleSendCommand} recentCommands={recentCommands} /> : null}
        />
      )}
    </div>
  );
}
