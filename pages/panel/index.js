import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import {
  Loader2, Pause, Play, Users, AlertTriangle, WifiOff,
} from 'lucide-react';
import LoginScreen from '../../components/auth/LoginScreen';
import PanelLayout from '../../components/panel/PanelLayout';
import PlayerList from '../../components/panel/PlayerList';
import InfoPanel from '../../components/panel/InfoPanel';
import LogPanel from '../../components/panel/LogPanel';
import CommandBar from '../../components/panel/CommandBar';
import { useRefreshedUser } from '../../lib/UserRefreshContext';

const LiveMap = dynamic(() => import('../../components/panel/LiveMap'), { ssr: false });

export async function getServerSideProps(context) {
  const { getSession } = require('next-auth/react');
  const session = await getSession(context);
  if (!session) return { props: {} };
  const hasRole = session.user?.roles?.includes('1372476381115453550');
  const isAdmin = (process.env.ADMIN_USER_IDS || '').split(',').includes(session.user?.id);
  if (!hasRole && !isAdmin) return { redirect: { destination: '/', permanent: false } };
  return { props: {} };
}

const NKZ_ROLE_ID = '1372468936867708988';

export default function PanelPage() {
  const { data: session, status } = useSession();
  const { session: refreshedSession } = useRefreshedUser();
  const router = useRouter();
  const effectiveSession = refreshedSession || session;
  const [data, setData] = useState(null);
  const [live, setLive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [teamFilter, setTeamFilter] = useState('All');
  const [mobileView, setMobileView] = useState('map');
  const [recentCommands, setRecentCommands] = useState([]);
  const intervalRef = useRef(null);

  const isNkz = effectiveSession?.user?.roles?.includes(NKZ_ROLE_ID);
  const hasPanelAccess = effectiveSession?.user?.roles?.includes('1372476381115453550');

  useEffect(() => {
    if (status === 'authenticated' && effectiveSession && !hasPanelAccess) {
      router.push('/');
    }
  }, [status, effectiveSession, hasPanelAccess, router]);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/panel/players');
      if (res.ok) {
        const d = await res.json();
        setData(d);
        setError(null);
      } else if (res.status === 429) {
        /* rate limited, keep stale data */
      } else {
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
    if (live) {
      intervalRef.current = setInterval(fetchData, 2500);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [live, fetchData]);

  const alerts = [];
  if (data) {
    if (data.CurrentPlayers < 10) {
      alerts.push({ type: 'critical', icon: AlertTriangle, message: `Server critically low: ${data.CurrentPlayers} players` });
    } else if (data.CurrentPlayers < 30) {
      alerts.push({ type: 'warning', icon: Users, message: `Low player count: ${data.CurrentPlayers} players` });
    }
    if ((data.KillLogs || []).length > 5) {
      alerts.push({ type: 'danger', icon: AlertTriangle, message: `High kill rate: ${data.KillLogs.length} kills since last check` });
    }
  }

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

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center">
          <Loader2 className="w-8 h-8 text-gsrp-orange animate-spin mb-4" />
          <span className="text-gsrp-orange/60 font-mono text-[9px] uppercase tracking-[0.3em]">Loading Panel</span>
        </div>
      </div>
    );
  }

  if (!session) return <LoginScreen />;

  return (
    <div className="h-full flex flex-col">
      {/* Server status bar */}
      <div className="flex-shrink-0 flex items-center gap-3 px-3 md:px-4 py-2 bg-black border-b border-gsrp-orange/20">
        <div className={`w-2 h-2 rounded-full ${data ? 'bg-green-500 animate-pulse-glow' : 'bg-red-500'}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white truncate">{data?.Name || 'Connecting...'}</span>
            {data && (
              <span className="text-[11px] font-mono text-gsrp-orange/60">
                {data.CurrentPlayers}/{data.MaxPlayers}
              </span>
            )}
          </div>
          {alerts.map((a, i) => (
            <div key={i} className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider mt-0.5 ${
              a.type === 'critical' ? 'text-gsrp-sunset' : a.type === 'danger' ? 'text-red-400' : 'text-gsrp-orange'
            }`}>
              <a.icon size={10} />
              {a.message}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {error && (
            <div className="flex items-center gap-1 text-[10px] text-gsrp-sunset/60">
              <WifiOff size={10} />
              <span className="hidden sm:inline">Disconnected</span>
            </div>
          )}
          <button
            onClick={() => setLive(!live)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
              live
                ? 'bg-gradient-to-r from-gsrp-orange/20 to-gsrp-gold/10 text-gsrp-orange border-gsrp-orange/40 shadow-sm shadow-orange-900/20'
                : 'bg-black/60 text-white/40 border-gsrp-orange/15 hover:text-white hover:border-gsrp-orange/40'
            }`}
          >
            {live ? <Play size={12} /> : <Pause size={12} />}
            <span className="hidden sm:inline">{live ? 'Live' : 'Paused'}</span>
          </button>
        </div>
      </div>

      {/* Error overlay */}
      {error && !data && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <WifiOff size={32} className="text-gsrp-sunset/40 mx-auto mb-3" />
            <p className="text-white/60 text-sm">{error}</p>
            <button onClick={fetchData} className="mt-3 px-4 py-2 rounded-lg bg-gradient-to-r from-gsrp-orange to-gsrp-gold text-black text-xs font-bold hover:opacity-90 transition-all shadow-lg shadow-orange-900/30">
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && !data && (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-gsrp-orange animate-spin" />
        </div>
      )}

      {/* Panel grid */}
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
              onSelectPlayer={setSelectedPlayer}
            />
          }
          liveMap={
            <LiveMap
              players={data.Players || []}
              emergencyCalls={data.EmergencyCalls || []}
              selectedPlayer={selectedPlayer}
              onSelectPlayer={setSelectedPlayer}
              isNkz={isNkz}
              onTeleport={handleTeleport}
            />
          }
          infoPanel={
            <InfoPanel
              vehicles={data.Vehicles || []}
              staff={data.Staff || {}}
              emergencyCalls={data.EmergencyCalls || []}
            />
          }
          logPanel={
            <LogPanel
              joinLogs={data.JoinLogs || []}
              killLogs={data.KillLogs || []}
              commandLogs={data.CommandLogs || []}
              modCalls={data.ModCalls || []}
            />
          }
          commandBar={isNkz ? <CommandBar onSendCommand={handleSendCommand} recentCommands={recentCommands} /> : null}
        />
      )}
    </div>
  );
}
