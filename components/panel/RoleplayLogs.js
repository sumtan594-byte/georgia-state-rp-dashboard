import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Plus, Radio, MapPin, Clock, ChevronRight,
  Loader2, AlertTriangle, User, Timer, CheckCircle,
  Move, XCircle
} from 'lucide-react';

const RP_TYPES = [
  'Traffic Stop', 'Pursuit', 'Medical Emergency', 'Fire Response',
  'Crime Scene', 'Arrest', 'Patrol', 'Robbery', 'Hostage Situation',
  'Vehicle Accident', 'Foot Chase', 'DOT Operation', 'Other',
];

function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

function parseName(raw) {
  if (!raw) return { name: 'Unknown', id: '' };
  const ci = raw.lastIndexOf(':');
  if (ci === -1) return { name: raw, id: raw };
  return { name: raw.slice(0, ci), id: raw.slice(ci + 1) };
}

export default function RoleplayLogs({
  open, onClose, players, roleplays, onRolepayCreated,
  onRoleplayUpdated, onRoleplayEnded,
  onRequestPlayerSelect, pendingPlayerSelect,
  onRequestLocationSelect, pendingLocationSelect,
  myLocation,
}) {
  const [view, setView] = useState('list'); // list | create
  const [form, setForm] = useState({
    robloxUsername: '', robloxUserId: '', avatarUrl: '',
    roleplayType: '', location: '', pinX: null, pinY: null,
    durationValue: 30, durationUnit: 'm',
  });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [extending, setExtending] = useState(null); // rpId
  const [extendValue, setExtendValue] = useState(10);
  const [extendUnit, setExtendUnit] = useState('m');

  // Receive player selected on map
  useEffect(() => {
    if (!pendingPlayerSelect) return;
    const { name, id, avatarUrl } = pendingPlayerSelect;
    setForm(f => ({ ...f, robloxUsername: name, robloxUserId: id, avatarUrl: avatarUrl || '' }));
  }, [pendingPlayerSelect]);

  // Receive location selected on map
  useEffect(() => {
    if (!pendingLocationSelect) return;
    const { location, pinX, pinY } = pendingLocationSelect;
    setForm(f => ({ ...f, location, pinX, pinY }));
  }, [pendingLocationSelect]);

  // Use my current location
  const useMyLocation = () => {
    if (myLocation) {
      setForm(f => ({
        ...f,
        location: myLocation.location,
        pinX: myLocation.pinX,
        pinY: myLocation.pinY,
      }));
    }
  };

  const resetForm = () => {
    setForm({
      robloxUsername: '', robloxUserId: '', avatarUrl: '',
      roleplayType: '', location: '', pinX: null, pinY: null,
      durationValue: 30, durationUnit: 'm',
    });
    setFeedback(null);
  };

  const getDurationMs = () => {
    const v = parseInt(form.durationValue, 10) || 1;
    const mult = form.durationUnit === 'h' ? 3600000 : form.durationUnit === 'm' ? 60000 : 1000;
    return v * mult;
  };

  const submitCreate = async () => {
    if (!form.robloxUsername || !form.roleplayType || !form.location || !form.durationValue) {
      setFeedback({ ok: false, msg: 'Please fill in all fields.' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/panel/roleplays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          robloxUsername: form.robloxUsername,
          robloxUserId: form.robloxUserId || null,
          roleplayType: form.roleplayType,
          location: form.location,
          durationMs: getDurationMs(),
          pinX: form.pinX,
          pinY: form.pinY,
        }),
      });
      const body = await res.json();
      if (res.ok) {
        onRolepayCreated?.(body);
        resetForm();
        setView('list');
        setFeedback(null);
      } else {
        setFeedback({ ok: false, msg: body.error || `Error ${res.status}` });
      }
    } catch (err) {
      setFeedback({ ok: false, msg: 'Network error' });
    } finally {
      setSubmitting(false);
    }
  };

  const endRoleplay = async (rpId) => {
    await fetch(`/api/panel/roleplays/${rpId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'end' }),
    });
    onRoleplayEnded?.(rpId);
  };

  const extendRoleplay = async (rpId) => {
    const v = parseInt(extendValue, 10) || 1;
    const mult = extendUnit === 'h' ? 3600000 : extendUnit === 'm' ? 60000 : 1000;
    const durationMs = v * mult;
    const res = await fetch(`/api/panel/roleplays/${rpId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'extend', durationMs }),
    });
    const body = await res.json();
    if (res.ok) {
      onRoleplayUpdated?.({ rpId, expiresAt: body.expiresAt });
      setExtending(null);
    }
  };

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-[400] flex items-start justify-end pointer-events-none">
      <div className="m-4 w-96 max-h-[calc(100%-2rem)] pointer-events-auto flex flex-col animate-slide-in-right"
        style={{ filter: 'drop-shadow(0 8px 32px rgba(0,0,0,0.7))' }}>
        <div className="bg-gsrp-dark-card border border-gsrp-dark-border/70 rounded-2xl overflow-hidden flex flex-col max-h-full"
          style={{ backdropFilter: 'blur(20px)', background: 'rgba(15,22,41,0.97)' }}>

          {/* Header */}
          <div className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-b border-gsrp-dark-border/50">
            {view === 'create' && (
              <button onClick={() => { setView('list'); resetForm(); }}
                className="text-white/30 hover:text-white/70 transition-colors cursor-pointer">
                <ChevronRight size={16} className="rotate-180" />
              </button>
            )}
            <Radio size={14} className="text-gsrp-orange" />
            <h3 className="text-sm font-bold text-white flex-1">
              {view === 'list' ? 'Roleplay Logs' : 'New Roleplay Log'}
            </h3>
            {view === 'list' && (
              <button
                onClick={() => { setView('create'); setFeedback(null); }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gsrp-orange/20 text-gsrp-orange border border-gsrp-orange/30 text-xs font-bold hover:bg-gsrp-orange/30 transition-all cursor-pointer">
                <Plus size={12} /> New
              </button>
            )}
            <button onClick={onClose}
              className="text-white/30 hover:text-white/70 transition-colors cursor-pointer p-1 rounded-lg hover:bg-white/5">
              <X size={15} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">

            {/* LIST VIEW */}
            {view === 'list' && (
              <div className="p-3 space-y-2">
                {roleplays.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Radio size={28} className="text-white/10 mb-3" />
                    <p className="text-white/30 text-sm font-medium">No active roleplays</p>
                    <p className="text-white/20 text-xs mt-1">Click "New" to log one</p>
                  </div>
                )}
                {roleplays.map(rp => (
                  <RoleplayCard
                    key={rp.rpId}
                    rp={rp}
                    extending={extending}
                    extendValue={extendValue}
                    extendUnit={extendUnit}
                    onExtendValueChange={setExtendValue}
                    onExtendUnitChange={setExtendUnit}
                    onExtend={() => extendRoleplay(rp.rpId)}
                    onToggleExtend={() => setExtending(extending === rp.rpId ? null : rp.rpId)}
                    onEnd={() => endRoleplay(rp.rpId)}
                    onMoveLocation={() => onRequestLocationSelect?.(rp.rpId)}
                  />
                ))}
              </div>
            )}

            {/* CREATE VIEW */}
            {view === 'create' && (
              <div className="p-4 space-y-4">

                {/* Roblox Username */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-white/40 block mb-1.5">
                    Roblox Username
                  </label>
                  {form.robloxUsername ? (
                    <div className="flex items-center gap-2 bg-gsrp-orange/10 border border-gsrp-orange/25 rounded-xl px-3 py-2">
                      {form.avatarUrl
                        ? <img src={form.avatarUrl} className="w-7 h-7 rounded-full object-cover" alt="" />
                        : <div className="w-7 h-7 rounded-full bg-gsrp-dark-surface flex items-center justify-center">
                            <User size={14} className="text-white/30" />
                          </div>
                      }
                      <span className="text-sm font-semibold text-white flex-1">{form.robloxUsername}</span>
                      <button onClick={() => setForm(f => ({ ...f, robloxUsername: '', robloxUserId: '', avatarUrl: '' }))}
                        className="text-white/30 hover:text-white/60 cursor-pointer">
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Roblox username"
                        value={form.robloxUsername}
                        onChange={e => setForm(f => ({ ...f, robloxUsername: e.target.value }))}
                        className="flex-1 bg-black/40 border border-gsrp-dark-border/50 rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-gsrp-orange/40 transition-colors"
                      />
                       <button
                         onClick={() => onRequestLocationSelect?.()}
                         className="px-3 py-2 rounded-xl bg-white/5 border border-gsrp-dark-border/50 text-white/40 hover:text-white hover:bg-white/10 text-xs font-bold transition-all cursor-pointer whitespace-nowrap">
                         <MapPin size={13} />
                       </button>

                    </div>
                  )}
                </div>

                {/* Roleplay Type */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-white/40 block mb-1.5">
                    Roleplay Type
                  </label>
                  <select
                    value={form.roleplayType}
                    onChange={e => setForm(f => ({ ...f, roleplayType: e.target.value }))}
                    className="w-full bg-black/40 border border-gsrp-dark-border/50 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-gsrp-orange/40 transition-colors cursor-pointer"
                  >
                    <option value="">Select type...</option>
                    {RP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                {/* Location */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-white/40 block mb-1.5">
                    Location
                  </label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Street name, postal code..."
                      value={form.location}
                      onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                      className="w-full bg-black/40 border border-gsrp-dark-border/50 rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-gsrp-orange/40 transition-colors"
                    />
                    <div className="flex gap-2">
                       <button
                         onClick={() => onRequestLocationSelect?.()}
                         className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/5 border border-gsrp-dark-border/50 text-white/40 hover:text-white hover:bg-white/10 text-xs font-bold transition-all cursor-pointer">
                         <MapPin size={12} /> Select on Map
                       </button>

                      {myLocation && (
                        <button
                          onClick={useMyLocation}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gsrp-teal/10 border border-gsrp-teal/25 text-gsrp-teal text-xs font-bold hover:bg-gsrp-teal/20 transition-all cursor-pointer">
                          <MapPin size={12} /> Where I Am
                        </button>
                      )}
                    </div>
                    {form.pinX !== null && (
                      <p className="text-[10px] text-gsrp-orange/60 flex items-center gap-1">
                        <CheckCircle size={10} /> Pin dropped on map
                      </p>
                    )}
                  </div>
                </div>

                {/* Duration */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-white/40 block mb-1.5">
                    Duration
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      value={form.durationValue}
                      onChange={e => setForm(f => ({ ...f, durationValue: e.target.value }))}
                      className="flex-1 bg-black/40 border border-gsrp-dark-border/50 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-gsrp-orange/40 transition-colors"
                    />
                    {['s', 'm', 'h'].map(u => (
                      <button key={u}
                        onClick={() => setForm(f => ({ ...f, durationUnit: u }))}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                          form.durationUnit === u
                            ? 'bg-gsrp-orange/20 text-gsrp-orange border border-gsrp-orange/30'
                            : 'bg-white/5 text-white/40 border border-gsrp-dark-border/50 hover:text-white/70 hover:bg-white/10'
                        }`}>
                        {u}
                      </button>
                    ))}
                  </div>
                </div>

                {feedback && (
                  <p className={`text-xs font-medium ${feedback.ok ? 'text-green-400' : 'text-red-400'}`}>
                    {feedback.msg}
                  </p>
                )}

                <button
                  onClick={submitCreate}
                  disabled={submitting}
                  className="w-full py-3 rounded-xl text-sm font-bold bg-gsrp-orange/20 text-gsrp-orange border border-gsrp-orange/30 hover:bg-gsrp-orange/30 transition-all cursor-pointer disabled:opacity-30 flex items-center justify-center gap-2">
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <Radio size={14} />}
                  Log Roleplay
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RoleplayCard({ rp, extending, extendValue, extendUnit, onExtendValueChange, onExtendUnitChange, onExtend, onToggleExtend, onEnd, onMoveLocation }) {
  const isExtending = extending === rp.rpId;

  return (
    <div className="bg-black/30 border border-gsrp-dark-border/40 rounded-xl overflow-hidden">
      <div className="p-3">
        <div className="flex items-start gap-2.5">
          <div className="w-2 h-2 rounded-full bg-gsrp-orange animate-pulse mt-1.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-white truncate">{rp.robloxUsername}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gsrp-orange/15 text-gsrp-orange border border-gsrp-orange/25 font-semibold">
                {rp.roleplayType}
              </span>
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin size={10} className="text-white/25" />
              <p className="text-[11px] text-white/40 truncate">{rp.location}</p>
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <Clock size={10} className="text-white/25" />
              <RpCountdown expiresAt={rp.expiresAt} />
            </div>
          </div>
        </div>

        <div className="flex gap-1.5 mt-2.5">
          <button onClick={onToggleExtend}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
              isExtending
                ? 'bg-gsrp-teal/20 text-gsrp-teal border border-gsrp-teal/30'
                : 'bg-white/5 text-white/40 border border-gsrp-dark-border/40 hover:text-white/70 hover:bg-white/10'
            }`}>
            <Timer size={10} /> Extend
          </button>
          <button onClick={onMoveLocation}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-white/5 text-white/40 border border-gsrp-dark-border/40 text-[10px] font-bold hover:text-white/70 hover:bg-white/10 transition-all cursor-pointer">
            <Move size={10} /> Move
          </button>
          <button onClick={onEnd}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold hover:bg-red-500/20 transition-all cursor-pointer ml-auto">
            <XCircle size={10} /> End
          </button>
        </div>
      </div>

      {isExtending && (
        <div className="border-t border-gsrp-dark-border/40 p-2.5 bg-black/20 flex gap-2 items-center">
          <input type="number" min="1" value={extendValue}
            onChange={e => onExtendValueChange(e.target.value)}
            className="w-16 bg-black/40 border border-gsrp-dark-border/50 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-gsrp-teal/40 transition-colors" />
          {['s', 'm', 'h'].map(u => (
            <button key={u} onClick={() => onExtendUnitChange(u)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                extendUnit === u
                  ? 'bg-gsrp-teal/20 text-gsrp-teal border border-gsrp-teal/30'
                  : 'bg-white/5 text-white/30 border border-gsrp-dark-border/40'
              }`}>{u}</button>
          ))}
          <button onClick={onExtend}
            className="ml-auto px-3 py-1.5 rounded-lg bg-gsrp-teal/20 text-gsrp-teal border border-gsrp-teal/30 text-xs font-bold hover:bg-gsrp-teal/30 transition-all cursor-pointer">
            Apply
          </button>
        </div>
      )}
    </div>
  );
}

function RpCountdown({ expiresAt }) {
  const [remaining, setRemaining] = useState('');
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const update = () => {
      const ms = new Date(expiresAt) - Date.now();
      if (ms <= 0) { setRemaining('Expired'); setExpired(true); return; }
      const s = Math.floor(ms / 1000);
      const m = Math.floor(s / 60);
      const h = Math.floor(m / 60);
      if (h > 0) setRemaining(`${h}h ${m % 60}m remaining`);
      else if (m > 0) setRemaining(`${m}m ${s % 60}s remaining`);
      else setRemaining(`${s}s remaining`);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);

  return (
    <span className={`text-[10px] font-mono ${expired ? 'text-red-400/60' : 'text-white/35'}`}>
      {remaining}
    </span>
  );
}
