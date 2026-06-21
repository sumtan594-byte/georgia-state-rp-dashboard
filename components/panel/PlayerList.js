import { Search, X, Users } from 'lucide-react';

const TEAMS = ['All', 'Police', 'Fire', 'EMS', 'DOT', 'Civilian'];
const TEAM_DOT = {
  Police: 'bg-blue-400', Fire: 'bg-red-400', EMS: 'bg-green-400',
  DOT: 'bg-orange-400', Civilian: 'bg-gray-500',
};

function parseName(raw) {
  const ci = typeof raw === 'string' ? raw.lastIndexOf(':') : -1;
  if (ci === -1) return { name: raw || 'Unknown', id: raw || '' };
  return { name: raw.slice(0, ci), id: raw.slice(ci + 1) };
}

export default function PlayerList({ players = [], searchQuery, onSearchChange, teamFilter, onTeamChange, selectedPlayer, onSelectPlayer }) {
  const filtered = players.filter(p => {
    const { name } = parseName(p.Player);
    if (teamFilter !== 'All' && p.Team !== teamFilter) return false;
    if (searchQuery && !name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 flex items-center justify-between px-3 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <Users size={14} className="text-gsrp-orange" />
          <h2 className="font-display text-sm font-bold text-white tracking-tight">Players</h2>
        </div>
        <span className="flex items-center gap-1.5 tac-chip text-gsrp-teal-light/70">
          <span className="tac-live-dot" aria-hidden="true" /> {players.length} online
        </span>
      </div>
      <div className="flex-shrink-0 px-2 pb-1.5">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text" placeholder="Search players..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full bg-black/40 border border-gsrp-dark-border/50 rounded-lg pl-8 pr-2.5 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-gsrp-orange/40 transition-colors"
          />
        </div>
      </div>

      <div className="flex-shrink-0 flex items-center gap-1 p-2 pb-1.5 overflow-x-auto">
        {TEAMS.map(t => (
          <button key={t} onClick={() => onTeamChange(t)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              teamFilter === t
                ? 'bg-gsrp-orange/20 text-gsrp-orange border border-gsrp-orange/30'
                : 'text-white/40 bg-white/5 border border-transparent hover:text-white/70 hover:bg-white/10'
            }`}
          >
            {t}{t === 'All' ? <span className="font-mono ml-1 opacity-70">{players.length}</span> : ''}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
        {filtered.map((p, i) => {
          const { name } = parseName(p.Player);
          const sel = selectedPlayer?.Player === p.Player;
          return (
            <button key={p.Player + i} onClick={() => onSelectPlayer(sel ? null : p)}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition-all cursor-pointer ${
                sel
                  ? 'bg-gsrp-orange/15 border border-gsrp-orange/25'
                  : 'border border-transparent hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${TEAM_DOT[p.Team] || TEAM_DOT.Civilian}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold truncate ${sel ? 'text-white' : 'text-white/80'}`}>{name}</span>
                    {p.Callsign && <span className="text-[11px] text-gsrp-gold/50 font-mono">[{p.Callsign}]</span>}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/35">
                    {p.Team && <span>{p.Team}</span>}
                    {p.Location?.PostalCode && <span className="font-mono text-white/30">#{p.Location.PostalCode}</span>}
                    {p.WantedStars > 0 && <span className="text-gsrp-sunset">★{p.WantedStars}</span>}
                  </div>
                </div>
              </div>

              {sel && (
                <div className="mt-2.5 pt-2.5 border-t border-gsrp-dark-border/50 space-y-1">
                  {selectedPlayer.Callsign && <DetailRow label="Callsign" value={selectedPlayer.Callsign} mono />}
                  {selectedPlayer.Location?.StreetName && (
                    <DetailRow label="Location" value={`${selectedPlayer.Location.StreetName} #${selectedPlayer.Location.BuildingNumber || ''}`} />
                  )}
                  {selectedPlayer.Location?.PostalCode && <DetailRow label="Postal" value={`#${selectedPlayer.Location.PostalCode}`} mono />}
                  {selectedPlayer.Permission && <DetailRow label="Permission" value={selectedPlayer.Permission} />}
                  {selectedPlayer.WantedStars > 0 && (
                    <DetailRow label="Status" value={`${'★'.repeat(selectedPlayer.WantedStars)} Wanted`} className="text-gsrp-sunset" />
                  )}
                </div>
              )}
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <Users className="w-8 h-8 text-gray-600 mb-2" />
            <p className="text-white/30 text-xs">
              {searchQuery ? 'No players match your search' : 'No players online'}
            </p>
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="mt-2 text-[10px] text-gsrp-orange hover:underline cursor-pointer"
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value, className = '', mono = false }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-white/30">{label}</span>
      <span className={`text-white/80 font-medium ${mono ? 'font-mono' : ''} ${className}`}>{value}</span>
    </div>
  );
}
