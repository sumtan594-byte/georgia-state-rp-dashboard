import { useState } from 'react';
import { LogIn, LogOut, Swords, Terminal, MessageSquare } from 'lucide-react';

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
      <div className="flex-shrink-0 flex border-b border-gsrp-orange/20 overflow-x-auto">
        {TABS.map(t => {
          const count = logs[t.key].length;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-all flex-shrink-0 ${
                tab === t.key
                  ? 'text-white bg-gradient-to-b from-gsrp-orange/20 to-transparent border-b-2 border-gsrp-orange'
                  : 'text-white/30 hover:text-white/70'
              }`}
            >
              <t.icon size={12} />
              {t.label}
              <span className="text-[9px] text-white/30">({count})</span>
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto px-1">
        {tab === 'joinleave' && joinLogs.slice(-150).reverse().map((log, i) => {
          const { name } = parseName(log.Player);
          return (
            <div key={i} className="flex items-center gap-2 px-2 py-1 text-[11px] hover:bg-gradient-to-r hover:from-gsrp-orange/10 hover:to-transparent rounded">
              {log.Join
                ? <LogIn size={11} className="text-green-400/80 flex-shrink-0" />
                : <LogOut size={11} className="text-red-400/80 flex-shrink-0" />}
              <span className="text-white/90 flex-1 truncate font-medium">{name}</span>
              <span className="text-white/30 flex-shrink-0 text-[10px]">{fmt(log.Timestamp)}</span>
            </div>
          );
        })}

        {tab === 'kills' && killLogs.slice(-150).reverse().map((log, i) => {
          const { name: k } = parseName(log.Killer);
          const { name: d } = parseName(log.Killed);
          return (
            <div key={i} className="flex items-center gap-2 px-2 py-1 text-[11px] hover:bg-gradient-to-r hover:from-gsrp-orange/10 hover:to-transparent rounded">
              <Swords size={11} className="text-gsrp-sunset/80 flex-shrink-0" />
              <span className="text-white/90 truncate font-medium">{k}</span>
              <span className="text-white/30 text-[10px]">→</span>
              <span className="text-white/70 truncate flex-1">{d}</span>
              <span className="text-white/30 flex-shrink-0 text-[10px]">{fmt(log.Timestamp)}</span>
            </div>
          );
        })}

        {tab === 'commands' && commandLogs.slice(-150).reverse().map((log, i) => {
          const { name } = parseName(log.Player);
          return (
            <div key={i} className="flex items-center gap-2 px-2 py-1 text-[11px] hover:bg-gradient-to-r hover:from-gsrp-orange/10 hover:to-transparent rounded">
              <Terminal size={11} className="text-cyan-400/70 flex-shrink-0" />
              <span className="text-white/80 font-mono text-[10px] truncate flex-1">{log.Command}</span>
              <span className="text-white/40 flex-shrink-0 text-[10px]">{name}</span>
              <span className="text-white/30 flex-shrink-0 text-[10px] ml-0.5">{fmt(log.Timestamp)}</span>
            </div>
          );
        })}

        {tab === 'modcalls' && modCalls.slice(-150).reverse().map((log, i) => {
          const { name: c } = parseName(log.Caller);
          const { name: m } = parseName(log.Moderator);
          return (
            <div key={i} className="flex items-center gap-2 px-2 py-1 text-[11px] hover:bg-gradient-to-r hover:from-gsrp-orange/10 hover:to-transparent rounded">
              <MessageSquare size={11} className="text-gsrp-orange/80 flex-shrink-0" />
              <span className="text-white/90 truncate font-medium">{c}</span>
              {m && <span className="text-white/40 text-[10px]">→ {m}</span>}
              <span className="text-white/30 flex-shrink-0 text-[10px] ml-auto">{fmt(log.Timestamp)}</span>
            </div>
          );
        })}

        {logs[tab].length === 0 && (
          <div className="flex items-center justify-center h-20 text-white/25 text-[11px]">No entries</div>
        )}
      </div>
    </div>
  );
}
