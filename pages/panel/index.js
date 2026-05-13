import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  Loader2, Pause, Play, Users, AlertTriangle, WifiOff, ArrowLeft,
} from 'lucide-react';
import LoginScreen from '../../components/auth/LoginScreen';
import PanelLayout from '../../components/panel/PanelLayout';
import PlayerList from '../../components/panel/PlayerList';
import InfoPanel from '../../components/panel/InfoPanel';
import CommandBar from '../../components/panel/CommandBar';
import { useRefreshedUser } from '../../lib/UserRefreshContext';

const LiveMap = dynamic(() => import('../../components/panel/LiveMap'), { ssr: false });

export async function getServerSideProps(context) {
  const { getServerSession } = require('next-auth');
  const { authOptions } = require('../../lib/auth-options');
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session) return { props: {} };

  const hasRole = session.user?.roles?.includes('1372476381115453550');
  const { isFullAdmin } = require('../../lib/admin-helper');
  const isAdmin = await isFullAdmin(session.user?.id, session.user?.roles || []);
  
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

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/panel/players');
      if (res.ok) {
        const d = await res.json();
        setData(d);
        setError(null);
      } else if (res.status === 429) {
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
          <span className="text-white/40 font-mono text-xs uppercase tracking-[0.3em]">Loading Panel</span>
        </div>
      </div>
    );
  }

  if (!session) return <LoginScreen />;

  return (
    <div className="h-full flex flex-col">
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
            <button onClick={fetchData} className="px-4 py-2 rounded-lg bg-gsrp-orange/20 text-gsrp-orange border border-gsrp-orange/30 text-xs font-semibold hover:bg-gsrp-orange/30 transition-all cursor-pointer">
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
