import { useEffect, useMemo, useState } from 'react';
import {
  Ban, Briefcase, CheckCircle2, Clock, Coffee, FileText, Gavel, Minus, Plus,
  Search, ShieldAlert, Square, UserRound, UsersRound,
} from 'lucide-react';

const ACTIONS = [
  { key: 'warn', label: 'Warn', icon: ShieldAlert, tone: 'amber' },
  { key: 'kick', label: 'Kick', icon: Gavel, tone: 'orange' },
  { key: 'ban', label: 'Ban', icon: Ban, tone: 'red' },
  { key: 'bolo', label: 'Ban BOLO', icon: FileText, tone: 'red' },
  { key: 'custom', label: 'Custom', icon: FileText, tone: 'teal' },
];

function parsePlayer(raw) {
  const value = String(raw?.Player || raw || '');
  const index = value.lastIndexOf(':');
  return {
    name: index === -1 ? value : value.slice(0, index),
    id: index === -1 ? '' : value.slice(index + 1),
    avatar: raw?.AvatarUrl || '',
  };
}

function minutesLabel(minutes = 0) {
  const safe = Math.max(0, Math.floor(minutes));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function isoAgeLabel(value) {
  if (!value) return 'now';
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m ago`;
}

export default function StaffPanel({ liveData, session }) {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [robloxResults, setRobloxResults] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [action, setAction] = useState('warn');
  const [reason, setReason] = useState('');
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [manageTarget, setManageTarget] = useState('');
  const [adjustMinutes, setAdjustMinutes] = useState(15);
  const [adjustReason, setAdjustReason] = useState('');

  const inGamePlayers = useMemo(() => (liveData?.Players || []).map(parsePlayer).filter(p => p.name), [liveData]);
  const filteredInGame = useMemo(() => {
    const q = query.toLowerCase();
    return inGamePlayers
      .filter(player => player.name.toLowerCase().includes(q) || player.id.includes(query))
      .slice(0, 8);
  }, [inGamePlayers, query]);

  async function load() {
    setError('');
    const res = await fetch('/api/panel/staff');
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || 'Failed to load staff panel');
    setState(body);
  }

  useEffect(() => {
    load().catch(err => setError(err.message)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const q = query.trim();
    setSelectedPlayer(prev => (prev && prev.name.toLowerCase() === q.toLowerCase() ? prev : null));
    if (q.length < 3) {
      setRobloxResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/panel/staff/roblox-search?q=${encodeURIComponent(q)}`);
      if (!res.ok) return;
      const body = await res.json().catch(() => ({}));
      setRobloxResults(body.users || []);
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  async function post(op, payload = {}) {
    setBusy(op);
    setError('');
    try {
      const res = await fetch('/api/panel/staff/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op, ...payload }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Action failed');
      setState(prev => ({ ...prev, ...body }));
      return body;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setBusy('');
    }
  }

  async function submitLog() {
    const target = selectedPlayer || { name: query.trim(), id: '' };
    const isInGame = inGamePlayers.some(player => player.name.toLowerCase() === target.name.toLowerCase());
    const body = await post('create_log', {
      action,
      reason,
      robloxUsername: target.name,
      robloxUserId: target.id,
      isInGame,
    });
    if (body?.success) {
      setReason('');
      setQuery('');
      setSelectedPlayer(null);
    }
  }

  const mySummary = state?.mySummary || {};
  const activeShift = state?.activeShift || mySummary.activeShift;
  const quotaMinutes = state?.config?.defaultQuotaMinutes || 30;
  const progress = Math.min(100, Math.round(((mySummary.totalMinutes || 0) / Math.max(1, quotaMinutes)) * 100));
  const isManager = !!state?.user?.isManager;

  const suggestions = [
    ...filteredInGame.map(player => ({ ...player, source: 'In game' })),
    ...robloxResults
      .filter(user => !filteredInGame.some(player => player.id === user.id || player.name.toLowerCase() === user.name.toLowerCase()))
      .map(user => ({ id: user.id, name: user.name, displayName: user.displayName, source: 'Roblox' })),
  ].slice(0, 10);

  if (loading) {
    return <div className="p-5 text-sm font-bold text-white/45">Loading staff panel...</div>;
  }

  return (
    <div className="staff-panel h-full min-h-0 overflow-y-auto p-3">
      {error && (
        <div className="mb-3 rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-200">
          {error}
        </div>
      )}

      <div className="grid gap-3 xl:grid-cols-[310px_1fr_360px]">
        <section className="staff-card">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/35">Staff Panel</p>
              <h2 className="text-xl font-black text-white">{state?.user?.name || session?.user?.name || 'Staff'}</h2>
            </div>
            <div className={`rounded-full px-3 py-1 text-xs font-black ${activeShift ? 'bg-green-400/15 text-green-300' : 'bg-red-400/15 text-red-300'}`}>
              {activeShift ? activeShift.status === 'break' ? 'On break' : 'On shift' : 'Off shift'}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {!activeShift ? (
              <button className="staff-primary col-span-2" disabled={!!busy} onClick={() => post('start_shift')}>
                <Briefcase size={16} /> Start Shift
              </button>
            ) : (
              <>
                <button className="staff-danger" disabled={!!busy} onClick={() => post('end_shift')}>
                  <Square size={15} /> Stop
                </button>
                {activeShift.status === 'break' ? (
                  <button className="staff-primary" disabled={!!busy} onClick={() => post('end_break')}>
                    <CheckCircle2 size={15} /> End Break
                  </button>
                ) : (
                  <button className="staff-secondary" disabled={!!busy} onClick={() => post('start_break')}>
                    <Coffee size={15} /> Break
                  </button>
                )}
              </>
            )}
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-xs font-black">
              <span className="text-white/45">My Activity</span>
              <span className="text-white/65">{minutesLabel(mySummary.totalMinutes || 0)} / {minutesLabel(quotaMinutes)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-green-400" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-xs font-semibold text-white/35">Wave {state?.wave?.number || 1} ends {state?.wave?.endsAt ? new Date(state.wave.endsAt).toLocaleString() : 'soon'}</p>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center gap-2 text-sm font-black text-white/70">
              <UsersRound size={16} className="text-green-300" /> Currently on shift
            </div>
            <div className="flex flex-wrap gap-2">
              {(state?.activeShifts || []).length === 0 ? (
                <p className="text-xs font-semibold text-white/30">No active staff shifts.</p>
              ) : state.activeShifts.map(shift => (
                <button
                  key={shift.id}
                  onClick={() => isManager && setSelectedStaff(shift)}
                  className="group cursor-pointer rounded-full border border-white/10 bg-white/[0.04] p-1 transition-colors hover:border-green-300/50"
                  title={shift.discord_name || shift.discord_id}
                >
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-700 text-xs font-black text-white">
                    {(shift.discord_name || shift.discord_id || '?').slice(0, 2).toUpperCase()}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {selectedStaff && (
            <div className="mt-4 rounded-lg border border-green-300/20 bg-green-300/10 p-3">
              <p className="text-sm font-black text-white">{selectedStaff.discord_name || selectedStaff.discord_id}</p>
              <p className="text-xs font-semibold text-white/45">{minutesLabel(selectedStaff.workedMinutes)} active, {selectedStaff.onBreak ? 'on break' : 'working'}</p>
              <div className="mt-3 flex gap-2">
                <button className="staff-danger flex-1" onClick={() => post('end_shift', { discordId: selectedStaff.discord_id, reason: 'Force ended from staff panel' }).then(() => setSelectedStaff(null))}>Force End</button>
                {selectedStaff.onBreak ? (
                  <button className="staff-secondary flex-1" onClick={() => post('end_break', { discordId: selectedStaff.discord_id }).then(() => setSelectedStaff(null))}>End Break</button>
                ) : (
                  <button className="staff-secondary flex-1" onClick={() => post('start_break', { discordId: selectedStaff.discord_id }).then(() => setSelectedStaff(null))}>Start Break</button>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="staff-card">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/35">Create New Log</p>
              <h3 className="text-lg font-black text-white">Player action</h3>
            </div>
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-black text-white/40">{inGamePlayers.length} in game</span>
          </div>

          <label className="text-xs font-black uppercase tracking-[0.16em] text-white/40">User</label>
          <div className="relative mt-2">
            <Search size={17} className="pointer-events-none absolute left-3 top-3 text-white/30" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search in-game or Roblox username"
              className="staff-input pl-9"
            />
            {query && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-[46px] z-20 overflow-hidden rounded-lg border border-white/10 bg-[#080d19] shadow-2xl">
                {suggestions.map(player => (
                  <button
                    key={`${player.source}-${player.id || player.name}`}
                    className="flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-white/[0.06]"
                    onClick={() => {
                      setSelectedPlayer(player);
                      setQuery(player.name);
                    }}
                  >
                    {player.avatar ? <img src={player.avatar} alt="" className="h-8 w-8 rounded-full" /> : <UserRound size={22} className="text-white/35" />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black text-white/80">{player.name}</span>
                      <span className="block truncate text-xs font-bold text-white/35">{player.source}{player.displayName ? ` - ${player.displayName}` : ''}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {ACTIONS.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  onClick={() => setAction(item.key)}
                  className={`staff-action ${action === item.key ? 'is-active' : ''}`}
                >
                  <Icon size={15} />
                  {item.label}
                </button>
              );
            })}
          </div>

          <label className="mt-4 block text-xs font-black uppercase tracking-[0.16em] text-white/40">Reason</label>
          <textarea
            value={reason}
            onChange={event => setReason(event.target.value)}
            placeholder="Evidence, context, rule broken, prior warnings..."
            className="staff-input mt-2 min-h-[120px] resize-none"
          />

          <button className="staff-primary mt-4 w-full justify-center" disabled={!!busy || !query.trim() || !reason.trim()} onClick={submitLog}>
            <FileText size={16} /> Submit Log
          </button>
        </section>

        <section className="space-y-3">
          <div className="staff-card">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-black text-white">Past Hour Logs</h3>
              <Clock size={17} className="text-white/35" />
            </div>
            <div className="space-y-2">
              {(state?.recentLogs || []).length === 0 ? (
                <p className="text-xs font-semibold text-white/30">No logs in the past hour.</p>
              ) : state.recentLogs.slice(0, 12).map(log => (
                <div key={log.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-black text-white">{log.roblox_username}</p>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-black uppercase text-white/55">{log.action}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs font-semibold text-white/45">{log.reason}</p>
                  <p className="mt-2 text-[11px] font-bold text-white/25">{log.staff_name || log.staff_discord_id} - {isoAgeLabel(log.created_at)}</p>
                </div>
              ))}
            </div>
          </div>

          {isManager && (
            <div className="staff-card">
              <h3 className="text-lg font-black text-white">Shift Management</h3>
              <p className="text-xs font-semibold text-white/35">Manage total quota or attach an adjustment to a specific shift ID.</p>
              <input className="staff-input mt-3" value={manageTarget} onChange={e => setManageTarget(e.target.value)} placeholder="Discord user ID" />
              <div className="mt-2 grid grid-cols-[1fr_auto_auto] gap-2">
                <input className="staff-input" type="number" value={adjustMinutes} onChange={e => setAdjustMinutes(Number(e.target.value))} />
                <button className="staff-secondary px-3" onClick={() => setAdjustMinutes(Math.abs(adjustMinutes || 15))}><Plus size={15} /></button>
                <button className="staff-secondary px-3" onClick={() => setAdjustMinutes(-Math.abs(adjustMinutes || 15))}><Minus size={15} /></button>
              </div>
              <input className="staff-input mt-2" value={adjustReason} onChange={e => setAdjustReason(e.target.value)} placeholder="Adjustment reason" />
              <button
                className="staff-primary mt-3 w-full justify-center"
                disabled={!manageTarget || !adjustMinutes}
                onClick={() => post('adjust_quota', { discordId: manageTarget, minutesDelta: adjustMinutes, reason: adjustReason || 'Manager adjustment' })}
              >
                Apply Adjustment
              </button>

              <div className="mt-4 space-y-2">
                {(state?.leaderboard || []).slice(0, 8).map((row, index) => (
                  <div key={row.discordId} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                    <span className="w-6 text-xs font-black text-white/35">#{index + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-black text-white/75">{row.discordName || row.discordId}</span>
                    <span className="text-xs font-black text-green-300">{minutesLabel(row.totalMinutes)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
