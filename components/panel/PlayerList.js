import { useState } from 'react';
import { Search } from 'lucide-react';

const TEAMS = ['All', 'Police', 'Fire', 'EMS', 'DOT', 'Civilian'];
const TEAM_COLORS = {
  Police: 'text-blue-400', Fire: 'text-red-400', EMS: 'text-green-400',
  DOT: 'text-orange-400', Civilian: 'text-gray-400',
};
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
      <div className="flex-shrink-0 p-2 border-b border-gsrp-orange/20">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gsrp-orange/50" />
          <input
            type="text" placeholder="Search players..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full bg-black border border-gsrp-orange/30 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-white/30 outline-none focus:border-gsrp-orange/60 transition-colors"
          />
        </div>
      </div>

      <div className="flex-shrink-0 flex gap-1 p-2 pb-1 overflow-x-auto">
        {TEAMS.map(t => (
          <button key={t} onClick={() => onTeamChange(t)}
            className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
              teamFilter === t
                ? 'bg-gradient-to-r from-gsrp-orange to-gsrp-gold text-white shadow-lg shadow-orange-900/30'
                : 'bg-black/60 text-white/40 border border-gsrp-orange/15 hover:text-white hover:border-gsrp-orange/40'
            }`}
          >
            {t}{t === 'All' ? ` (${players.length})` : ''}
          </button>
        ))}
      </div>

      <div className="flex-shrink-0 px-3 py-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
          {filtered.length} / {players.length} players
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
        {filtered.map((p, i) => {
          const { name } = parseName(p.Player);
          const sel = selectedPlayer?.Player === p.Player;
          return (
            <button key={p.Player + i} onClick={() => onSelectPlayer(sel ? null : p)}
              className={`w-full text-left px-2.5 py-2 rounded-lg transition-all border ${
                sel
                  ? 'bg-gradient-to-r from-gsrp-orange/25 to-gsrp-gold/10 border-gsrp-orange/40 text-white shadow-inner shadow-orange-900/20'
                  : 'border-transparent hover:bg-gradient-to-r hover:from-gsrp-orange/10 hover:to-transparent text-white/50 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${TEAM_DOT[p.Team] || TEAM_DOT.Civilian}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-semibold truncate ${sel ? 'text-white' : 'text-white/90'}`}>{name}</span>
                    {p.Callsign && <span className="text-[9px] text-gsrp-gold/60 font-mono">[{p.Callsign}]</span>}
                  </div>
                  <div className="flex items-center gap-2 text-[9px] text-white/40">
                    {p.Team && <span>{p.Team}</span>}
                    {p.Location?.PostalCode && <span>#{p.Location.PostalCode}</span>}
                    {p.WantedStars > 0 && <span className="text-gsrp-sunset">★{p.WantedStars}</span>}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="flex items-center justify-center h-32 text-white/25 text-xs">No players found</div>
        )}
      </div>

      {selectedPlayer && (
        <div className="flex-shrink-0 border-t border-gsrp-orange/20 p-2 bg-gradient-to-r from-black to-black/95">
          <div className="flex items-start gap-2">
            <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${TEAM_DOT[selectedPlayer.Team] || TEAM_DOT.Civilian}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white">{parseName(selectedPlayer.Player).name}</p>
              <div className="text-[10px] text-white/50 space-y-0.5 mt-0.5">
                {selectedPlayer.Callsign && <p>Callsign: {selectedPlayer.Callsign}</p>}
                {selectedPlayer.Location?.StreetName && <p>{selectedPlayer.Location.StreetName} #{selectedPlayer.Location.BuildingNumber || ''}</p>}
                {selectedPlayer.Location?.PostalCode && <p>Postal #{selectedPlayer.Location.PostalCode}</p>}
                {selectedPlayer.Permission && <p>{selectedPlayer.Permission}</p>}
                {selectedPlayer.WantedStars > 0 && <p className="text-gsrp-sunset">{'★'.repeat(selectedPlayer.WantedStars)} Wanted</p>}
              </div>
            </div>
            <button onClick={() => onSelectPlayer(null)} className="text-white/30 hover:text-white/90 text-xs px-1">&times;</button>
          </div>
        </div>
      )}
    </div>
  );
}
