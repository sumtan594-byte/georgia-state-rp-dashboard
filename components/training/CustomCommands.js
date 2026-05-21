import { useState, useEffect, useRef } from 'react';
import { Terminal, Search, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

const COMMANDS = [
  { cmd: ';rdm', label: 'Random Death Match', punishment: 'Warning → Kick → Ban' },
  { cmd: ';vdm', label: 'Vehicle Death Match', punishment: 'Warning → Kick → Ban' },
  { cmd: ';frp', label: 'Failing to Roleplay', punishment: 'Warning → Kick → Ban' },
  { cmd: ';nlr', label: 'New Life Rule', punishment: 'Warning → Kick → Ban' },
  { cmd: ';gta', label: 'GTA Driving', punishment: 'Warning → Kick → Ban' },
  { cmd: ';cuff', label: 'Cuff Rushing', punishment: 'Kick → Ban' },
  { cmd: ';cuff_rushing', label: 'Cuff Rushing (alt)', punishment: 'Kick → Ban' },
  { cmd: ';trolling', label: 'Trolling', punishment: 'Kick → Ban' },
  { cmd: ';troll', label: 'Trolling (alt)', punishment: 'Kick → Ban' },
  { cmd: ';sd', label: 'Staff Disrespect', punishment: 'Warning → Kick → Ban' },
  { cmd: ';staff_disrespect', label: 'Staff Disrespect (alt)', punishment: 'Warning → Kick → Ban' },
  { cmd: ';nitrp', label: 'No Intent to Roleplay', punishment: 'Kick → Ban' },
  { cmd: ';nointent', label: 'No Intent to RP (alt)', punishment: 'Kick → Ban' },
  { cmd: ';no-intent', label: 'No Intent to RP (alt2)', punishment: 'Kick → Ban' },
  { cmd: ';abusing_mod', label: 'Abusing !mod System', punishment: 'Verbal → Warning → Kick' },
  { cmd: ';abuse_mod', label: 'Abusing !mod (alt)', punishment: 'Verbal → Warning → Kick' },
  { cmd: ';staff_evasion', label: 'Staff Evasion', punishment: 'Kick → Ban' },
  { cmd: ';evasion', label: 'Staff Evasion (alt)', punishment: 'Kick → Ban' },
  { cmd: ';staff_vdm', label: 'Staff VDM / RDM', punishment: 'Kick → Ban' },
  { cmd: ';svdm', label: 'Staff VDM (alt)', punishment: 'Kick → Ban' },
  { cmd: ';mass_vdm', label: 'Mass VDM / RDM', punishment: 'Ban' },
  { cmd: ';safezone', label: 'Safezone RDM / VDM', punishment: 'Kick → Ban' },
  { cmd: ';reset_avoid', label: 'Reset to Avoid Punishment', punishment: 'Ban' },
  { cmd: ';rtap', label: 'RTAP / ST-TAP', punishment: 'Ban' },
  { cmd: ';leave_avoid', label: 'Leaving to Avoid Punishment', punishment: 'Ban' },
  { cmd: ';ltap', label: 'LTAP (alt)', punishment: 'Ban' },
  { cmd: ';nsfw', label: 'Not Safe for Work', punishment: 'Ban (Not Appealable)' },
  { cmd: ';tos', label: 'Terms of Service', punishment: 'Ban' },
  { cmd: ';staff_impersonation', label: 'Staff Impersonation', punishment: 'Ban' },
  { cmd: ';banned_rp', label: 'Banned Roleplays', punishment: 'Ban' },
  { cmd: ';hacking', label: 'Cheating / Exploiting', punishment: 'Ban (Not Appealable)' },
  { cmd: ';cheating', label: 'Cheating (alt)', punishment: 'Ban (Not Appealable)' },
  { cmd: ';mass_staff_evasion', label: 'Mass Staff Evasion', punishment: 'Ban' },
  { cmd: ';troll_username', label: 'Troll Username', punishment: 'Ban' },
  { cmd: ';bypassing', label: 'Bypassing', punishment: 'Ban' },
  { cmd: ';ta', label: 'Tool Abuse', punishment: 'Kick → Ban' },
  { cmd: ';tool', label: 'Tool Abuse (alt)', punishment: 'Kick → Ban' },
  { cmd: ';unrealistic', label: 'Unrealistic Avatar', punishment: 'Kick → Ban' },
  { cmd: ';avatar', label: 'Unrealistic Avatar (alt)', punishment: 'Kick → Ban' },
];

export default function CustomCommandsSection({ isVisible }) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [copied, setCopied] = useState(null);
  const [visibleCount, setVisibleCount] = useState(12);
  const sectionRef = useRef(null);

  const filtered = COMMANDS.filter(c =>
    c.cmd.toLowerCase().includes(search.toLowerCase()) ||
    c.label.toLowerCase().includes(search.toLowerCase())
  );

  const visibleCommands = filtered.slice(0, visibleCount);

  const copyCommand = (cmd) => {
    navigator.clipboard.writeText(cmd);
    setCopied(cmd);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div
      ref={sectionRef}
      className={`transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
    >
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gsrp-teal/10 border border-gsrp-teal/20">
          <Terminal size={22} className="text-gsrp-teal-light" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white">Custom Commands</h2>
          <p className="text-gsrp-teal-light/40 text-xs font-medium">In-game moderation command reference — {COMMANDS.length} commands</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6 group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gsrp-teal-light/30 group-focus-within:text-gsrp-orange transition-colors" size={18} />
        <input
          type="text"
          placeholder="Search commands..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setVisibleCount(12); }}
          className="w-full bg-gsrp-dark-card/50 border border-gsrp-dark-border/50 rounded-xl py-3 pl-12 pr-4 text-sm text-white placeholder-gsrp-teal-light/20 focus:outline-none focus:border-gsrp-orange/50 focus:ring-1 focus:ring-gsrp-orange/20 transition-all"
        />
      </div>

      {/* Command Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {visibleCommands.map((cmd, i) => (
          <div
            key={cmd.cmd}
            className="card-glass rounded-xl border border-gsrp-dark-border/50 hover:border-gsrp-orange/30 transition-all duration-300 group cursor-pointer"
            style={{ animationDelay: `${i * 0.05}s` }}
            onClick={() => setExpanded(expanded === cmd.cmd ? null : cmd.cmd)}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <code className="text-gsrp-orange font-mono text-sm font-bold">{cmd.cmd}</code>
                <button
                  onClick={(e) => { e.stopPropagation(); copyCommand(cmd.cmd); }}
                  className="p-1.5 rounded-lg text-gsrp-teal-light/30 hover:text-gsrp-teal-light hover:bg-gsrp-dark-surface/60 transition-all cursor-pointer"
                >
                  {copied === cmd.cmd ? <Check size={14} className="text-gsrp-teal-light" /> : <Copy size={14} />}
                </button>
              </div>
              <p className="text-white text-xs font-medium mb-2">{cmd.label}</p>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gsrp-teal-light/40 font-mono">{cmd.punishment}</span>
                {expanded === cmd.cmd ? (
                  <ChevronUp size={14} className="text-gsrp-teal-light/30" />
                ) : (
                  <ChevronDown size={14} className="text-gsrp-teal-light/30" />
                )}
              </div>
            </div>

            {/* Expanded details */}
            {expanded === cmd.cmd && (
              <div className="px-4 pb-4 border-t border-gsrp-dark-border/30 pt-3 animate-fade-in-up">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-gsrp-orange" />
                  <span className="text-[10px] text-gsrp-teal-light/50 font-bold uppercase tracking-wider">Escalation Path</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {cmd.punishment.split(' → ').map((step, idx, arr) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                        step.includes('Ban') && step.includes('Not')
                          ? 'bg-red-400/10 text-red-400 border border-red-400/20'
                          : step.includes('Ban')
                          ? 'bg-gsrp-sunset/10 text-gsrp-sunset border border-gsrp-sunset/20'
                          : step.includes('Kick')
                          ? 'bg-gsrp-orange/10 text-gsrp-orange border border-gsrp-orange/20'
                          : step.includes('Verbal')
                          ? 'bg-gsrp-teal/10 text-gsrp-teal-light border border-gsrp-teal/20'
                          : 'bg-gsrp-gold/10 text-gsrp-gold border border-gsrp-gold/20'
                      }`}>
                        {step}
                      </span>
                      {idx < arr.length - 1 && (
                        <span className="text-gsrp-teal-light/20 text-xs">→</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Show more */}
      {visibleCount < filtered.length && (
        <div className="flex justify-center mt-6">
          <button
            onClick={() => setVisibleCount(prev => prev + 12)}
            className="px-6 py-2.5 bg-gsrp-dark-surface/50 border border-gsrp-dark-border/50 rounded-xl text-gsrp-teal-light/50 text-sm font-bold hover:border-gsrp-orange/30 hover:text-gsrp-orange transition-all cursor-pointer"
          >
            Show {Math.min(12, filtered.length - visibleCount)} more commands
          </button>
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Search size={32} className="text-gsrp-teal-light/20 mb-3" />
          <p className="text-gsrp-teal-light/30 text-sm">No commands match &ldquo;{search}&rdquo;</p>
        </div>
      )}
    </div>
  );
}
