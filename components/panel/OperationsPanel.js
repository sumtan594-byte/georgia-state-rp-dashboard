import { AlertTriangle, Crosshair, Flame, Layers, Loader2, MapPinned, PhoneCall, Radio, Shield, Siren, Users } from 'lucide-react';
import { useMemo } from 'react';

const TEAM_BORDER = {
  Police: '#60A5FA', Fire: '#F87171', EMS: '#34D399',
  DOT: '#FB923C', Civilian: '#9CA3AF',
};

export default function OperationsPanel({
  players = [],
  emergencyCalls = [],
  roleplays = [],
  server,
  live,
  error,
  rateLimitUntil,
  loading = false,
}) {
  const teamCounts = useMemo(() => {
    return players.reduce((acc, player) => {
      const team = player.Team || 'Unknown';
      acc[team] = (acc[team] || 0) + 1;
      return acc;
    }, {});
  }, [players]);

  const activeUnits = useMemo(() => players.filter(p => p.Team && p.Team !== 'Civilian').length, [players]);
  const wantedCount = useMemo(() => players.filter(p => (p.WantedStars || 0) > 0).length, [players]);
  const rateLimitSeconds = rateLimitUntil ? Math.max(0, Math.ceil((rateLimitUntil - Date.now()) / 1000)) : 0;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Server status */}
      <div className="flex-shrink-0 border-b border-gsrp-dark-border/50">
        <div className="p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-gsrp-orange/80">
                <Radio size={12} /> Server Status
              </p>
              <h2 className="font-display truncate text-sm font-bold text-white tracking-tight">{server?.Name || 'ER:LC Server'}</h2>
            </div>
            <span className={`rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold flex-shrink-0 inline-flex items-center gap-1.5 ${
              live && !error ? 'border-green-400/20 bg-green-400/10 text-green-300' : 'border-gsrp-orange/20 bg-gsrp-orange/10 text-gsrp-orange'
            }`}>
              {live && !error && <span className="tac-live-dot" aria-hidden="true" />}
              {live && !error ? 'LIVE' : 'DEGRADED'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <Metric icon={Users} label="Players" value={`${server?.CurrentPlayers ?? players.length}/${server?.MaxPlayers ?? '?'}`} />
            <Metric icon={Shield} label="Units" value={activeUnits} />
            <Metric icon={PhoneCall} label="911" value={emergencyCalls.length} hot={emergencyCalls.length > 0} />
            <Metric icon={Siren} label="Wanted" value={wantedCount} hot={wantedCount > 0} />
          </div>

          {(error || rateLimitSeconds > 0) && (
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-gsrp-orange/20 bg-gsrp-orange/10 px-2.5 py-2 text-[11px] text-gsrp-orange/80">
              <AlertTriangle size={13} className="flex-shrink-0" />
              <span className="min-w-0">{rateLimitSeconds > 0 ? `Rate limited. Refresh resumes in ${rateLimitSeconds}s.` : error}</span>
            </div>
          )}
        </div>

        {/* Team Spread */}
        <div className="px-3 pb-3">
          <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
            <Layers size={12} /> Team Spread
          </p>
          <div className="space-y-1.5">
            {Object.entries(teamCounts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([team, count]) => (
              <div key={team} className="flex items-center gap-2 text-[11px]">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TEAM_BORDER[team] || TEAM_BORDER.Civilian }} />
                <span className="flex-1 truncate text-white/55">{team}</span>
                <span className="font-mono text-white/35">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active Incidents */}
      <div className="flex-1 min-h-0">
        <div className="p-3">
          <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
            <MapPinned size={12} /> Active Incidents
          </p>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-4 h-4 text-gsrp-orange animate-spin" />
            </div>
          ) : emergencyCalls.length === 0 && roleplays.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Crosshair className="w-5 h-5 text-white/10 mb-1.5" />
              <span className="text-white/20 text-[11px]">No active incidents</span>
            </div>
          ) : (
            <div className="space-y-2">
              {emergencyCalls.map(call => (
                <IncidentRow
                  key={`call-${call.CallNumber || call.StartedAt}`}
                  icon={PhoneCall}
                  title={`911 #${call.CallNumber || 'N/A'}`}
                  detail={call.Description || call.PositionDescriptor || call.Team || 'Emergency call'}
                  hot
                />
              ))}
              {roleplays.map(rp => (
                <IncidentRow
                  key={rp.rpId}
                  icon={Flame}
                  title={rp.roleplayType || 'Roleplay'}
                  detail={`${rp.robloxUsername || 'Unknown'} · ${rp.location || 'Pinned location'}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, hot = false }) {
  return (
    <div className={`rounded-xl border px-2 py-2 ${hot ? 'border-gsrp-sunset/25 bg-gsrp-sunset/10' : 'border-white/10 bg-black/25'}`}>
      <Icon size={13} className={hot ? 'mb-1 text-gsrp-sunset' : 'mb-1 text-gsrp-orange/70'} />
      <p className="font-mono text-[15px] font-bold leading-none text-white tabular">{value}</p>
      <p className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-white/35">{label}</p>
    </div>
  );
}

function IncidentRow({ icon: Icon, title, detail, hot = false }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-white/10 bg-black/20 px-2.5 py-2">
      <Icon size={13} className={hot ? 'mt-0.5 flex-shrink-0 text-gsrp-sunset' : 'mt-0.5 flex-shrink-0 text-gsrp-orange'} />
      <div className="min-w-0">
        <p className="truncate text-[11px] font-bold text-white/75">{title}</p>
        <p className="truncate text-[10px] text-white/35">{detail}</p>
      </div>
    </div>
  );
}
