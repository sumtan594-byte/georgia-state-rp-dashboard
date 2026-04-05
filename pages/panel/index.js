import { useEffect, useState, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Loader2, Users, MapPin, Terminal, Radio, Eye, EyeOff, AlertTriangle, Shield } from 'lucide-react';

const MAP_URL = '/api/panel/map';
const PLAYERS_URL = '/api/panel/players';
const COMMAND_URL = '/api/panel/command';
const PRESENCE_URL = '/api/panel/presence';

export default function PanelPage() {
  const { data: session, status } = useSession();
  const [serverData, setServerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [monitoring, setMonitoring] = useState(false);
  const [command, setCommand] = useState('');
  const [commandResult, setCommandResult] = useState(null);
  const [commandLoading, setCommandLoading] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const presenceTimer = useRef(null);
  const pollTimer = useRef(null);

  const fetchServer = useCallback(async () => {
    try {
      const res = await fetch(PLAYERS_URL);
      if (!res.ok) throw new Error('Failed to fetch server data');
      const data = await res.json();
      setServerData(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetchServer();
  }, [status, fetchServer]);

  useEffect(() => {
    if (!monitoring || status !== 'authenticated') return;

    pollTimer.current = setInterval(fetchServer, 2000);
    return () => clearInterval(pollTimer.current);
  }, [monitoring, status, fetchServer]);

  useEffect(() => {
    if (status !== 'authenticated') return;

    const heartbeat = async () => {
      try {
        await fetch(PRESENCE_URL, { method: 'POST' });
      } catch {}
    };
    heartbeat();
    presenceTimer.current = setInterval(heartbeat, 10000);
    return () => clearInterval(presenceTimer.current);
  }, [status]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && pollTimer.current) {
        clearInterval(pollTimer.current);
        pollTimer.current = null;
      } else if (monitoring && !pollTimer.current) {
        pollTimer.current = setInterval(fetchServer, 2000);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [monitoring, fetchServer]);

  const handleCommand = async (e) => {
    e.preventDefault();
    if (!command.trim() || commandLoading) return;
    setCommandLoading(true);
    setCommandResult(null);
    try {
      const res = await fetch(COMMAND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: command.trim() }),
      });
      const data = await res.json();
      setCommandResult({ status: res.status, data });
    } catch (err) {
      setCommandResult({ status: 500, data: { error: err.message } });
    } finally {
      setCommandLoading(false);
    }
  };

  const handleTeleport = (playerName) => {
    setCommand(`:tp ${playerName}`);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center">
          <Loader2 className="w-8 h-8 text-gsrp-orange animate-spin mb-4" />
          <span className="text-gsrp-teal-light/40 font-mono text-[9px] uppercase tracking-[0.3em]">Loading Panel</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="card-glass rounded-2xl p-8 text-center max-w-md animate-scale-in">
          <AlertTriangle size={32} className="text-gsrp-sunset mx-auto mb-4" />
          <h2 className="text-white font-bold text-lg mb-2">Connection Error</h2>
          <p className="text-gsrp-teal-light/40 text-sm mb-4">{error}</p>
          <button onClick={fetchServer} className="bg-gsrp-orange hover:bg-gsrp-orange-light text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors cursor-pointer">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const players = serverData?.players || [];
  const staff = serverData?.staff || [];
  const joinLogs = serverData?.joinLogs || [];
  const killLogs = serverData?.killLogs || [];
  const commandLogs = serverData?.commandLogs || [];

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Live Panel</h1>
          <p className="text-gsrp-teal-light/40 text-[10px] uppercase tracking-widest mt-1">
            {players.length} players online
          </p>
        </div>
        <button
          onClick={() => setMonitoring(!monitoring)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer ${
            monitoring
              ? 'bg-gsrp-sunset/20 text-gsrp-sunset border border-gsrp-sunset/30 hover:bg-gsrp-sunset/30'
              : 'bg-gsrp-teal/20 text-gsrp-teal-light border border-gsrp-teal/30 hover:bg-gsrp-teal/30'
          }`}
        >
          {monitoring ? <EyeOff size={14} /> : <Eye size={14} />}
          {monitoring ? 'Stop Monitoring' : 'Start Monitoring'}
        </button>
      </div>

      {monitoring && (
        <div className="flex items-center gap-2 bg-gsrp-teal/10 border border-gsrp-teal/20 rounded-xl px-4 py-2">
          <Radio size={12} className="text-gsrp-teal-light animate-pulse" />
          <span className="text-gsrp-teal-light/60 text-xs font-medium">Live — refreshing every 2 seconds</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card-glass rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <MapPin size={16} className="text-gsrp-orange" />
              <h2 className="text-white font-bold text-sm">Server Map</h2>
            </div>
            <div className="rounded-xl overflow-hidden bg-gsrp-dark-surface/50 border border-gsrp-dark-border/50">
              <img src={MAP_URL} alt="ERLC Map" className="w-full h-auto" />
            </div>
          </div>

          <div className="card-glass rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Terminal size={16} className="text-gsrp-teal-light" />
              <h2 className="text-white font-bold text-sm">Execute Command</h2>
            </div>
            <form onSubmit={handleCommand} className="flex gap-2">
              <input
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="Enter command..."
                className="flex-1 bg-gsrp-dark-surface/50 border border-gsrp-dark-border/50 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-gsrp-orange/40 placeholder:text-gsrp-teal-light/20"
              />
              <button
                type="submit"
                disabled={commandLoading}
                className="bg-gsrp-orange hover:bg-gsrp-orange-light disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors cursor-pointer"
              >
                {commandLoading ? <Loader2 size={14} className="animate-spin" /> : 'Send'}
              </button>
            </form>
            {commandResult && (
              <div className={`mt-3 p-3 rounded-xl text-xs font-mono ${commandResult.status === 204 || commandResult.status === 200 ? 'bg-gsrp-teal/10 text-gsrp-teal-light border border-gsrp-teal/20' : 'bg-gsrp-sunset/10 text-gsrp-sunset border border-gsrp-sunset/20'}`}>
                {commandResult.data?.error || (commandResult.status === 204 ? 'Command executed successfully' : JSON.stringify(commandResult.data))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card-glass rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users size={16} className="text-gsrp-cyan" />
              <h2 className="text-white font-bold text-sm">Players ({players.length})</h2>
            </div>
            <div className="space-y-1.5 max-h-96 overflow-y-auto">
              {players.length === 0 ? (
                <p className="text-gsrp-teal-light/30 text-xs text-center py-8">No players online</p>
              ) : (
                players.map((p, i) => (
                  <div
                    key={i}
                    onClick={() => setSelectedPlayer(selectedPlayer === p ? null : p)}
                    className="flex items-center justify-between bg-gsrp-dark-surface/40 rounded-lg px-3 py-2 hover:bg-gsrp-dark-surface/60 transition-colors cursor-pointer"
                  >
                    <div className="min-w-0">
                      <p className="text-white text-xs font-medium truncate">{p.name}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleTeleport(p.name); }}
                      className="text-[10px] text-gsrp-orange hover:text-gsrp-orange-light font-bold transition-colors flex-shrink-0 ml-2"
                    >
                      TP
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {staff.length > 0 && (
            <div className="card-glass rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Shield size={16} className="text-gsrp-gold" />
                <h2 className="text-white font-bold text-sm">Staff ({staff.length})</h2>
              </div>
              <div className="space-y-1.5">
                {staff.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 bg-gsrp-dark-surface/40 rounded-lg px-3 py-2">
                    <div className="w-2 h-2 rounded-full bg-gsrp-gold" />
                    <span className="text-white text-xs font-medium truncate">{s.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export async function getServerSideProps(context) {
  const { getSession } = require("next-auth/react");
  const session = await getSession(context);
  if (!session) return { props: {} };

  const hasRole = session.user?.roles?.includes('1372476381115453550');
  const isAdmin = (process.env.ADMIN_USER_IDS || '').split(',').includes(session.user?.id);
  if (!hasRole && !isAdmin) return { redirect: { destination: '/', permanent: false } };

  return { props: {} };
}
