import { useState } from 'react';
import { LogIn, Swords, Terminal, MessageSquare, FileText } from 'lucide-react';

const TABS = [
  { key: 'joinleave', icon: LogIn, label: 'Join' },
  { key: 'kills', icon: Swords, label: 'Kills' },
  { key: 'commands', icon: Terminal, label: 'Cmds' },
  { key: 'modcalls', icon: MessageSquare, label: 'Calls' },
];

function parseName(raw) {
  if (!raw) return { name: 'Unknown', id: '' };
  const ci = raw.lastIndexOf(':');
  if (ci === -1) return { name: raw, id: raw };
  return { name: raw.slice(0, ci), id: raw.slice(ci + 1) };
}

function fmt(ts) {
  return new Date(ts * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function InfoPanel({ joinLogs = [], killLogs = [], commandLogs = [], modCalls = [] }) {
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
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold tracking-wider transition-all flex-shrink-0 cursor-pointer ${
                tab === t.key
                  ? 'text-gsrp-orange border-b-2 border-gsrp-orange'
                  : 'text-white/30 hover:text-white/60'
              }`}
            >
              <t.icon size={13} />
              {t.label}
              {count > 0 && <span className="font-mono text-[10px] text-white/25">{count}</span>}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'joinleave' && (joinLogs.length === 0 ? <EmptyState activeTab={tab} /> : joinLogs.slice(-100).reverse().map((log, i) => {
          const { name } = parseName(log.Player);
          return (
            <div key={i} className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-white/[0.03] transition-colors">
              {log.Join
                ? <LogIn size={12} className="text-green-400/60 flex-shrink-0" />
                : <LogOutIcon size={12} className="text-red-400/60 flex-shrink-0" />}
              <span className="text-white/70 flex-1 truncate font-medium">{name}</span>
              <span className="font-mono text-white/30 flex-shrink-0 text-[10px]">{fmt(log.Timestamp)}</span>
            </div>
          );
        }))}

        {tab === 'kills' && (killLogs.length === 0 ? <EmptyState activeTab={tab} /> : killLogs.slice(-100).reverse().map((log, i) => {
          const { name: k } = parseName(log.Killer);
          const { name: d } = parseName(log.Killed);
          return (
            <div key={i} className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-white/[0.03] transition-colors">
              <Swords size={12} className="text-gsrp-sunset/60 flex-shrink-0" />
              <span className="text-white/70 truncate font-medium max-w-[90px] truncate">{k}</span>
              <span className="text-white/20 text-[10px]">→</span>
              <span className="text-white/50 truncate flex-1">{d}</span>
              <span className="font-mono text-white/30 flex-shrink-0 text-[10px]">{fmt(log.Timestamp)}</span>
            </div>
          );
        }))}

        {tab === 'commands' && (commandLogs.length === 0 ? <EmptyState activeTab={tab} /> : commandLogs.slice(-100).reverse().map((log, i) => {
          const { name } = parseName(log.Player);
          return (
            <div key={i} className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-white/[0.03] transition-colors">
              <Terminal size={12} className="text-cyan-400/50 flex-shrink-0" />
              <span className="text-white/60 font-mono text-[11px] truncate flex-1">{log.Command}</span>
              <span className="font-mono text-white/30 flex-shrink-0 text-[10px]">{fmt(log.Timestamp)}</span>
            </div>
          );
        }))}

        {tab === 'modcalls' && (modCalls.length === 0 ? <EmptyState activeTab={tab} /> : modCalls.slice(-100).reverse().map((log, i) => {
          const { name: c } = parseName(log.Caller);
          const { name: m } = parseName(log.Moderator);
          return (
            <div key={i} className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-white/[0.03] transition-colors">
              <MessageSquare size={12} className="text-gsrp-orange/60 flex-shrink-0" />
              <span className="text-white/70 truncate font-medium">{c}</span>
              {m && <span className="text-white/30 text-[10px]">→ {m}</span>}
              <span className="font-mono text-white/30 flex-shrink-0 text-[10px] ml-auto">{fmt(log.Timestamp)}</span>
            </div>
          );
        }))}
      </div>
    </div>
  );
}

function EmptyState({ activeTab }) {
  const messages = {
    joinleave: 'No join/leave activity yet',
    kills: 'No kills recorded yet',
    commands: 'No commands executed yet',
    modcalls: 'No mod calls received yet',
  };
  return (
    <div className="flex flex-col items-center justify-center h-20 text-center">
      <FileText className="w-5 h-5 text-white/10 mb-1.5" />
      <span className="text-white/20 text-[11px]">{messages[activeTab] || 'No entries'}</span>
    </div>
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
