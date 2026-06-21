import { useState } from 'react';
import { LogIn, Swords, Terminal, MessageSquare } from 'lucide-react';

const TABS = [
  { key: 'joinleave', icon: LogIn, label: 'Join/Leave' },
  { key: 'kills', icon: Swords, label: 'Kills' },
  { key: 'commands', icon: Terminal, label: 'Commands' },
  { key: 'modcalls', icon: MessageSquare, label: 'ModCalls' },
];

function parseName(raw) {
  if (!raw) return { name: 'Unknown', id: '' };
  const ci = raw.lastIndexOf(':');
  if (ci === -1) return { name: raw, id: raw };
  return { name: raw.slice(0, ci), id: raw.slice(ci + 1) };
}

function fmt(ts) {
  return new Date(ts * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

export default function LogPanel({ joinLogs = [], killLogs = [], commandLogs = [], modCalls = [] }) {
  const [tab, setTab] = useState('joinleave');

  const logs = { joinleave: joinLogs, kills: killLogs, commands: commandLogs, modcalls: modCalls };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 flex border-b border-gsrp-dark-border/50 overflow-x-auto">
        {TABS.map(t => {
          const count = logs[t.key].length;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-semibold tracking-wider transition-all flex-shrink-0 cursor-pointer ${
                tab === t.key
                  ? 'text-gsrp-orange border-b-2 border-gsrp-orange'
                  : 'text-white/30 hover:text-white/60'
              }`}
            >
              <t.icon size={12} />
              {t.label}
              {count > 0 && <span className="font-mono text-[9px] text-white/25">{count}</span>}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto px-1 py-0.5">
        {tab === 'joinleave' && joinLogs.length === 0 && <EmptyState />}
        {tab === 'kills' && killLogs.length === 0 && <EmptyState />}
        {tab === 'commands' && commandLogs.length === 0 && <EmptyState />}
        {tab === 'modcalls' && modCalls.length === 0 && <EmptyState />}

        {tab === 'joinleave' && joinLogs.slice(-150).reverse().map((log, i) => {
          const { name } = parseName(log.Player);
          return (
            <div key={i} className="flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-white/[0.03] rounded-lg transition-colors">
              {log.Join
                ? <LogIn size={11} className="text-green-400/60 flex-shrink-0" />
                : <LogOutIcon size={11} className="text-red-400/60 flex-shrink-0" />}
              <span className="text-white/70 flex-1 truncate font-medium">{name}</span>
              <span className="font-mono text-white/30 flex-shrink-0 text-[10px]">{fmt(log.Timestamp)}</span>
            </div>
          );
        })}

        {tab === 'kills' && killLogs.slice(-150).reverse().map((log, i) => {
          const { name: k } = parseName(log.Killer);
          const { name: d } = parseName(log.Killed);
          return (
            <div key={i} className="flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-white/[0.03] rounded-lg transition-colors">
              <Swords size={11} className="text-gsrp-sunset/60 flex-shrink-0" />
              <span className="text-white/70 truncate font-medium">{k}</span>
              <span className="text-white/20 text-[10px]">→</span>
              <span className="text-white/50 truncate flex-1">{d}</span>
              <span className="font-mono text-white/30 flex-shrink-0 text-[10px]">{fmt(log.Timestamp)}</span>
            </div>
          );
        })}

        {tab === 'commands' && commandLogs.slice(-150).reverse().map((log, i) => {
          const { name } = parseName(log.Player);
          return (
            <div key={i} className="flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-white/[0.03] rounded-lg transition-colors">
              <Terminal size={11} className="text-cyan-400/50 flex-shrink-0" />
              <span className="text-white/60 font-mono text-[10px] truncate flex-1">{log.Command}</span>
              <span className="text-white/30 flex-shrink-0 text-[10px]">{name}</span>
              <span className="font-mono text-white/30 flex-shrink-0 text-[10px]">{fmt(log.Timestamp)}</span>
            </div>
          );
        })}

        {tab === 'modcalls' && modCalls.slice(-150).reverse().map((log, i) => {
          const { name: c } = parseName(log.Caller);
          const { name: m } = parseName(log.Moderator);
          return (
            <div key={i} className="flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-white/[0.03] rounded-lg transition-colors">
              <MessageSquare size={11} className="text-gsrp-orange/60 flex-shrink-0" />
              <span className="text-white/70 truncate font-medium">{c}</span>
              {m && <span className="text-white/30 text-[10px]">→ {m}</span>}
              <span className="font-mono text-white/30 flex-shrink-0 text-[10px] ml-auto">{fmt(log.Timestamp)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center h-16 text-white/15 text-[11px]">No entries</div>
  );
}

function LogOutIcon({ size, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
