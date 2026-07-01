import { useState, useEffect, useRef } from 'react';
import {
  X, MapPin, Car, Shield, AlertTriangle, LogOut, Ban,
  MessageSquare, Package, Lock, Loader2, ChevronRight,
  Radio
} from 'lucide-react';

const NKZ_ROLE_ID = '1372468936867708988';
const BOLO_ROLE_ID = '1390835200145096734';
const BAN_ROLE_IDS = ['1372491512100950068', '1372479843677245520'];

function parseName(raw) {
  if (!raw) return { name: 'Unknown', id: '' };
  const ci = raw.lastIndexOf(':');
  if (ci === -1) return { name: raw, id: raw };
  return { name: raw.slice(0, ci), id: raw.slice(ci + 1) };
}

const TEAM_COLOR = {
  Police: '#60A5FA', Sheriff: '#A78BFA', Fire: '#F87171', EMS: '#34D399',
  DOT: '#FB923C', Civilian: '#9CA3AF',
};

export default function PlayerActionPanel({ player, vehicles = [], roleplays = [], session, onClose, data }) {
  const [view, setView] = useState('main'); // main | warn | kick | ban | bolo | message
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const panelRef = useRef(null);

  const { name, id: robloxId } = parseName(player?.Player);
  const sessionRoles = session?.user?.roles || [];
  const canBan = BAN_ROLE_IDS.some(r => sessionRoles.includes(r)) || session?.user?.isAdmin;
  const isNkz = sessionRoles.includes(NKZ_ROLE_ID) || session?.user?.isAdmin;
  const isBolo = sessionRoles.includes(BOLO_ROLE_ID) || session?.user?.isAdmin;

  const teamColor = TEAM_COLOR[player?.Team] || TEAM_COLOR.Civilian;

  useEffect(() => {
    setAvatarFailed(false);
  }, [robloxId, player?.AvatarUrl]);

  // Player's vehicles
  const playerVehicles = vehicles.filter(v =>
    v.Owner && v.Owner.toLowerCase() === name.toLowerCase()
  );

  // Player's active roleplays
  const playerRoleplays = roleplays.filter(rp =>
    rp.robloxUsername?.toLowerCase() === name.toLowerCase() && rp.active
  );

  const sendAction = async (action, extraReason) => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/panel/modactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          targetUsername: name,
          targetUserId: robloxId,
          reason: extraReason || reason,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setFeedback({ ok: true, msg: `${action} successful` });
        setTimeout(() => { setView('main'); setReason(''); setFeedback(null); }, 1500);
      } else {
        setFeedback({ ok: false, msg: body.error || `Error ${res.status}` });
      }
    } catch (err) {
      setFeedback({ ok: false, msg: 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  if (!player) return null;

  return (
    <div
      ref={panelRef}
      className="absolute top-4 right-4 w-80 z-[500] animate-fade-up"
      style={{ maxHeight: 'calc(100% - 2rem)' }}
    >
      <div className="gsrp-player-panel overflow-hidden rounded-2xl flex flex-col">

        {/* Header */}
        <div className="gsrp-player-panel-header flex-shrink-0 p-4 border-b border-gsrp-dark-border/50"
          style={{ borderLeft: `3px solid ${teamColor}` }}>
          <div className="flex items-start gap-3">
            <div className="relative flex-shrink-0">
              {player?.AvatarUrl && !avatarFailed
                ? <img src={player.AvatarUrl} onError={() => setAvatarFailed(true)}
                    className="w-12 h-12 rounded-full object-cover border-2"
                    style={{ borderColor: teamColor }} alt={name} />
                : <div className="w-12 h-12 rounded-full bg-gsrp-dark-surface border-2 flex items-center justify-center"
                    style={{ borderColor: teamColor }}>
                    <span className="text-lg font-bold text-white/40">{name[0]?.toUpperCase()}</span>
                  </div>
              }
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-gsrp-dark-card" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-bold text-sm truncate">{name}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: `${teamColor}20`, color: teamColor }}>
                  {player.Team || 'Civilian'}
                </span>
                {player.Callsign && (
                  <span className="text-xs text-white/30 font-mono">[{player.Callsign}]</span>
                )}
              </div>
              {robloxId && (
                <p className="text-[10px] text-white/20 font-mono mt-0.5">ID: {robloxId}</p>
              )}
            </div>
            <button onClick={onClose}
              className="gsrp-soft-icon-button text-white/35 hover:text-white/80 transition-colors cursor-pointer p-1 rounded-lg">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">

          {/* ─── MAIN VIEW ─── */}
          {view === 'main' && (
            <div className="p-3 space-y-3">

              {/* Location */}
              <Section title="Location" icon={MapPin}>
                {player.Location ? (
                  <div className="space-y-1">
                    {player.Location.StreetName && (
                      <InfoRow label="Street" value={player.Location.StreetName} />
                    )}
                    {player.Location.PostalCode && (
                      <InfoRow label="Postal" value={`#${player.Location.PostalCode}`} />
                    )}
                    {player.Location.BuildingNumber && (
                      <InfoRow label="Building" value={player.Location.BuildingNumber} />
                    )}
                    {player.WantedStars > 0 && (
                      <InfoRow label="Status"
                        value={`${'★'.repeat(player.WantedStars)} Wanted`}
                        valueClass="text-red-400" />
                    )}
                  </div>
                ) : <p className="text-white/30 text-xs">No location data</p>}
              </Section>

              {/* Ongoing Roleplays */}
              {playerRoleplays.length > 0 && (
                <Section title="Active Roleplays" icon={Radio}>
                  <div className="space-y-1.5">
                    {playerRoleplays.map(rp => (
                      <div key={rp.rpId} className="flex items-center gap-2 bg-gsrp-orange/10 border border-gsrp-orange/20 rounded-lg px-2.5 py-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-gsrp-orange animate-pulse" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-white/80 truncate">{rp.roleplayType}</p>
                          <p className="text-[10px] text-white/30 truncate">{rp.location}</p>
                        </div>
                        <RpTimer expiresAt={rp.expiresAt} />
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Vehicles */}
              {playerVehicles.length > 0 && (
                <Section title="Vehicles" icon={Car}>
                  <div className="space-y-1.5">
                    {playerVehicles.map((v, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <div className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: v.ColorHex || '#6B7280' }} />
                        <span className="text-white/70 truncate flex-1">{v.Name}</span>
                        <span className="text-white/30 font-mono text-[10px]">{v.Plate}</span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Actions */}
              <Section title="Actions" icon={Shield}>
                <div className="grid grid-cols-3 gap-1.5">
                  <ActionBtn label="Warn" icon={AlertTriangle} color="orange"
                    onClick={() => setView('warn')} />
                  {isNkz && (
                    <ActionBtn label="Kick" icon={LogOut} color="yellow"
                      onClick={() => setView('kick')} />
                  )}
                  {canBan
                    ? <ActionBtn label="Ban" icon={Ban} color="red"
                        onClick={() => setView('ban')} />
                    : isBolo
                      ? <ActionBtn label="Ban BOLO" icon={Ban} color="red"
                          onClick={() => setView('bolo')} />
                      : null
                  }
                  {isNkz && (
                    <ActionBtn label="Load" icon={Package} color="teal"
                      onClick={() => setView('load')} />
                  )}
                  {isNkz && (
                    <ActionBtn label="Jail" icon={Lock} color="purple"
                      onClick={() => setView('jail')} />
                  )}
                  <ActionBtn label="Message" icon={MessageSquare} color="blue"
                    onClick={() => setView('message')} />
                </div>
                {feedback && (
                  <p className={`text-[11px] mt-2 text-center font-medium ${feedback.ok ? 'text-green-400' : 'text-red-400'}`}>
                    {feedback.msg}
                  </p>
                )}
              </Section>
            </div>
          )}

          {/* ─── WARN VIEW ─── */}
          {view === 'warn' && (
            <ActionView
              title="Warn Player"
              subtitle={name}
              color="#F97316"
              reason={reason}
              onReasonChange={setReason}
              onSubmit={() => sendAction('warn')}
              onBack={() => { setView('main'); setReason(''); setFeedback(null); }}
              loading={loading}
              feedback={feedback}
              submitLabel="Warn Player"
            />
          )}

          {/* ─── KICK VIEW ─── */}
          {view === 'kick' && (
            <ActionView
              title="Kick Player"
              subtitle={name}
              color="#FBBF24"
              reason={reason}
              onReasonChange={setReason}
              onSubmit={() => sendAction('kick')}
              onBack={() => { setView('main'); setReason(''); setFeedback(null); }}
              loading={loading}
              feedback={feedback}
              submitLabel="Kick Player"
            />
          )}

          {/* ─── BAN VIEW ─── */}
          {view === 'ban' && (
            <ActionView
              title="Ban Player"
              subtitle={name}
              color="#EF4444"
              reason={reason}
              onReasonChange={setReason}
              onSubmit={() => sendAction('ban')}
              onBack={() => { setView('main'); setReason(''); setFeedback(null); }}
              loading={loading}
              feedback={feedback}
              submitLabel="Ban Player"
              dangerWarning="This will run an in-game ban and record the action."
            />
          )}

          {/* ─── MESSAGE VIEW ─── */}
          {view === 'message' && (
            <ActionView
              title="Send Message"
              subtitle={name}
              color="#60A5FA"
              reason={reason}
              onReasonChange={setReason}
              onSubmit={() => sendAction('message')}
              onBack={() => { setView('main'); setReason(''); setFeedback(null); }}
              loading={loading}
              feedback={feedback}
              submitLabel="Send Message"
              placeholder="Type your message..."
            />
          )}

          {/* ─── BOLO VIEW ─── */}
          {view === 'bolo' && (
            <ActionView
              title="Issue Ban BOLO"
              subtitle={name}
              color="#EF4444"
              reason={reason}
              onReasonChange={setReason}
              onSubmit={() => sendAction('bolo')}
              onBack={() => { setView('main'); setReason(''); setFeedback(null); }}
              loading={loading}
              feedback={feedback}
              submitLabel="Submit BOLO"
              dangerWarning="This will post a Ban BOLO in Discord for senior review."
            />
          )}

          {/* ─── LOAD VIEW ─── */}
          {view === 'load' && (
            <ActionView
              title="Load Player"
              subtitle={name}
              color="#14B8A6"
              reason={reason}
              onReasonChange={setReason}
              onSubmit={() => sendAction('load')}
              onBack={() => { setView('main'); setReason(''); setFeedback(null); }}
              loading={loading}
              feedback={feedback}
              submitLabel="Load Player"
            />
          )}

          {/* ─── JAIL VIEW ─── */}
          {view === 'jail' && (
            <ActionView
              title="Jail Player"
              subtitle={name}
              color="#8B5CF6"
              reason={reason}
              onReasonChange={setReason}
              onSubmit={() => sendAction('jail')}
              onBack={() => { setView('main'); setReason(''); setFeedback(null); }}
              loading={loading}
              feedback={feedback}
              submitLabel="Jail Player"
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon size={11} className="text-white/30" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-white/30">{title}</span>
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value, valueClass = '' }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-white/30">{label}</span>
      <span className={`text-white/70 font-medium ${valueClass}`}>{value}</span>
    </div>
  );
}

const ACTION_COLORS = {
  orange: { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/25', hover: 'hover:bg-orange-500/25' },
  yellow: { bg: 'bg-yellow-500/15', text: 'text-yellow-400', border: 'border-yellow-500/25', hover: 'hover:bg-yellow-500/25' },
  red: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/25', hover: 'hover:bg-red-500/25' },
  teal: { bg: 'bg-teal-500/15', text: 'text-teal-400', border: 'border-teal-500/25', hover: 'hover:bg-teal-500/25' },
  purple: { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/25', hover: 'hover:bg-purple-500/25' },
  blue: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/25', hover: 'hover:bg-blue-500/25' },
};

function ActionBtn({ label, icon: Icon, color, onClick, loading }) {
  const c = ACTION_COLORS[color] || ACTION_COLORS.blue;
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl border transition-all cursor-pointer ${c.bg} ${c.text} ${c.border} ${c.hover} disabled:opacity-40`}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />}
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  );
}

function ActionView({ title, subtitle, color, reason, onReasonChange, onSubmit, onBack, loading, feedback, submitLabel, placeholder, dangerWarning }) {
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="text-white/30 hover:text-white/70 transition-colors cursor-pointer">
          <ChevronRight size={16} className="rotate-180" />
        </button>
        <div>
          <h4 className="text-sm font-bold text-white">{title}</h4>
          <p className="text-xs text-white/40">{subtitle}</p>
        </div>
      </div>

      {dangerWarning && (
        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-2.5">
          <AlertTriangle size={13} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-red-300/80">{dangerWarning}</p>
        </div>
      )}

      <div>
        <label className="text-[11px] font-semibold text-white/40 block mb-1.5">Reason</label>
        <textarea
          value={reason}
          onChange={e => onReasonChange(e.target.value)}
          placeholder={placeholder || 'Enter reason...'}
          rows={3}
          className="w-full bg-black/40 border border-gsrp-dark-border/50 rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-gsrp-orange/40 transition-colors resize-none"
        />
      </div>

      {feedback && (
        <p className={`text-[11px] font-medium ${feedback.ok ? 'text-green-400' : 'text-red-400'}`}>
          {feedback.msg}
        </p>
      )}

      <button
        onClick={onSubmit}
        disabled={loading || !reason.trim()}
        className="w-full py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer disabled:opacity-30 flex items-center justify-center gap-2"
        style={{ background: `${color}25`, color, border: `1px solid ${color}40` }}
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : null}
        {submitLabel}
      </button>
    </div>
  );
}

function RpTimer({ expiresAt }) {
  const [remaining, setRemaining] = useState('');
  useEffect(() => {
    const update = () => {
      const ms = new Date(expiresAt) - Date.now();
      if (ms <= 0) { setRemaining('Expired'); return; }
      const s = Math.floor(ms / 1000);
      const m = Math.floor(s / 60);
      const h = Math.floor(m / 60);
      if (h > 0) setRemaining(`${h}h ${m % 60}m`);
      else if (m > 0) setRemaining(`${m}m ${s % 60}s`);
      else setRemaining(`${s}s`);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);
  return <span className="text-[10px] text-gsrp-orange/60 font-mono flex-shrink-0">{remaining}</span>;
}
