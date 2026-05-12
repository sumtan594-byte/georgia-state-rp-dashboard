import { useState } from 'react';
import { Search } from 'lucide-react';

const TEAMS = ['All', 'Police', 'Fire', 'EMS', 'DOT', 'Civilian'];
const TEAM_COLORS = {
  Police: 'text-blue-400', Fire: 'text-red-400', EMS: 'text-green-400',
  DOT: 'text-orange-400', Civilian: 'text-gray-400',
};
const TEAM_BG = {
  Police: 'bg-blue-500/10 border-blue-500/20', Fire: 'bg-red-500/10 border-red-500/20',
  EMS: 'bg-green-500/10 border-green-500/20', DOT: 'bg-orange-500/10 border-orange-500/20',
  Civilian: 'bg-gray-500/10 border-gray-500/20',
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
      <div className="flex-shrink-0 p-2 border-b border-gsrp-dark-border/50">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gsrp-teal-light/30" />
          <input
            type="text" placeholder="Search players..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full bg-gsrp-dark-surface/60 border border-gsrp-dark-border/50 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gsrp-teal-light/20 outline-none focus:border-gsrp-orange/50 transition-colors"
          />
        </div>
      </div>

      <div className="flex-shrink-0 flex gap-1 p-2 pb-1 overflow-x-auto">
        {TEAMS.map(t => (
          <button key={t} onClick={() => onTeamChange(t)}
            className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
              teamFilter === t
                ? 'bg-gsrp-orange/20 text-gsrp-orange border border-gsrp-orange/30'
                : 'bg-gsrp-dark-surface/40 text-gsrp-teal-light/40 border border-transparent hover:text-white hover:bg-gsrp-dark-surface/60'
            }`}
          >
            {t}{t === 'All' ? ` (${players.length})` : ''}
          </button>
        ))}
      </div>

      <div className="flex-shrink-0 px-3 py-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gsrp-teal-light/30">
          {filtered.length} / {players.length} players
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
        {filtered.map((p, i) => {
          const { name } = parseName(p.Player);
          const sel = selectedPlayer?.Player === p.Player;
          return (
            <button key={p.Player + i} onClick={() => onSelectPlayer(sel ? null : p)}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-all border ${
                sel
                  ? 'bg-gsrp-orange/10 border-gsrp-orange/30 text-white'
                  : 'border-transparent hover:bg-gsrp-dark-surface/40 text-gsrp-teal-light/60 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${TEAM_BG[p.Team] || TEAM_BG.Civilian}`}>
                  <span className={TEAM_COLORS[p.Team] || TEAM_COLORS.Civilian}>
                    {p.Team === 'Police' ? 'P' : p.Team === 'Fire' ? 'F' : p.Team === 'EMS' ? 'E' : p.Team === 'DOT' ? 'D' : 'C'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold truncate">{name}</span>
                    {p.Callsign && <span className="text-[9px] text-gsrp-teal-light/30 font-mono">[{p.Callsign}]</span>}
                  </div>
                  <div className="flex items-center gap-2 text-[9px] text-gsrp-teal-light/30">
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
          <div className="flex items-center justify-center h-32 text-gsrp-teal-light/20 text-xs">No players found</div>
        )}
      </div>

      {/* Selected player detail bar */}
      {selectedPlayer && (
        <div className="flex-shrink-0 border-t border-gsrp-dark-border/50 p-2 bg-gsrp-dark-surface/30">
          <div className="flex items-start gap-2">
            <div className={`w-2 h-2 rounded-full mt-1 ${TEAM_COLORS[selectedPlayer.Team] || TEAM_COLORS.Civilian}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white">{parseName(selectedPlayer.Player).name}</p>
              <div className="text-[10px] text-gsrp-teal-light/50 space-y-0.5 mt-0.5">
                {selectedPlayer.Callsign && <p>Callsign: {selectedPlayer.Callsign}</p>}
                {selectedPlayer.Location?.StreetName && <p>{selectedPlayer.Location.StreetName} #{selectedPlayer.Location.BuildingNumber || ''}</p>}
                {selectedPlayer.Location?.PostalCode && <p>Postal #{selectedPlayer.Location.PostalCode}</p>}
                {selectedPlayer.Permission && <p>{selectedPlayer.Permission}</p>}
                {selectedPlayer.WantedStars > 0 && <p className="text-gsrp-sunset">{'★'.repeat(selectedPlayer.WantedStars)} Wanted</p>}
              </div>
            </div>
            <button onClick={() => onSelectPlayer(null)} className="text-gsrp-teal-light/30 hover:text-white text-xs px-1">&times;</button>
          </div>
        </div>
      )}
    </div>
  );
}
