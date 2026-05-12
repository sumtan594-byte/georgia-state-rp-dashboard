import { useState } from 'react';
import { LogIn, LogOut, Swords, Terminal, MessageSquare } from 'lucide-react';

const TABS = [
  { key: 'joinleave', icon: LogIn, label: 'Join/Leave' },
  { key: 'kills', icon: Swords, label: 'Kills' },
  { key: 'commands', icon: Terminal, label: 'Commands' },
  { key: 'modcalls', icon: MessageSquare, label: 'ModCalls' },
];

function parsePlayerName(raw) {
  if (!raw) return { name: 'Unknown', id: '' };
  const colonIdx = raw.lastIndexOf(':');
  if (colonIdx === -1) return { name: raw, id: raw };
  return { name: raw.slice(0, colonIdx), id: raw.slice(colonIdx + 1) };
}

function formatTime(ts) {
  const d = new Date(ts * 1000);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

export default function LogPanel({ joinLogs = [], killLogs = [], commandLogs = [], modCalls = [] }) {
  const [tab, setTab] = useState('joinleave');

  const activeLogs = {
    joinleave: joinLogs,
    kills: killLogs,
    commands: commandLogs,
    modcalls: modCalls,
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex-shrink-0 flex border-b border-gsrp-dark-border/50 overflow-x-auto">
        {TABS.map(t => {
          const count = activeLogs[t.key].length;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors flex-shrink-0 ${
                tab === t.key
                  ? 'text-gsrp-orange border-b-2 border-gsrp-orange'
                  : 'text-gsrp-teal-light/40 hover:text-white'
              }`}
            >
              <t.icon size={12} />
              {t.label}
              <span className="text-[9px] opacity-50">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Log feed */}
      <div className="flex-1 overflow-y-auto p-1">
        {tab === 'joinleave' && joinLogs.slice(-100).reverse().map((log, i) => {
          const { name } = parsePlayerName(log.Player);
          return (
            <div key={i} className="flex items-center gap-2 px-2 py-1 text-[11px] hover:bg-gsrp-dark-surface/20 rounded">
              {log.Join ? (
                <LogIn size={11} className="text-green-400 flex-shrink-0" />
              ) : (
                <LogOut size={11} className="text-red-400 flex-shrink-0" />
              )}
              <span className="text-white flex-1 truncate">{name}</span>
              <span className="text-gsrp-teal-light/30 flex-shrink-0">{formatTime(log.Timestamp)}</span>
            </div>
          );
        })}

        {tab === 'kills' && killLogs.slice(-100).reverse().map((log, i) => {
          const { name: killer } = parsePlayerName(log.Killer);
          const { name: killed } = parsePlayerName(log.Killed);
          return (
            <div key={i} className="flex items-center gap-2 px-2 py-1 text-[11px] hover:bg-gsrp-dark-surface/20 rounded">
              <Swords size={11} className="text-gsrp-sunset flex-shrink-0" />
              <span className="text-white truncate">{killer}</span>
              <span className="text-gsrp-teal-light/40">→</span>
              <span className="text-white truncate flex-1">{killed}</span>
              <span className="text-gsrp-teal-light/30 flex-shrink-0">{formatTime(log.Timestamp)}</span>
            </div>
          );
        })}

        {tab === 'commands' && commandLogs.slice(-100).reverse().map((log, i) => {
          const { name } = parsePlayerName(log.Player);
          return (
            <div key={i} className="flex items-center gap-2 px-2 py-1 text-[11px] hover:bg-gsrp-dark-surface/20 rounded">
              <Terminal size={11} className="text-gsrp-cyan flex-shrink-0" />
              <span className="text-white font-mono text-[10px] truncate flex-1">{log.Command}</span>
              <span className="text-gsrp-teal-light/40 flex-shrink-0">{name}</span>
              <span className="text-gsrp-teal-light/30 flex-shrink-0 ml-1">{formatTime(log.Timestamp)}</span>
            </div>
          );
        })}

        {tab === 'modcalls' && modCalls.slice(-100).reverse().map((log, i) => {
          const { name: caller } = parsePlayerName(log.Caller);
          const { name: mod } = parsePlayerName(log.Moderator);
          return (
            <div key={i} className="flex items-center gap-2 px-2 py-1 text-[11px] hover:bg-gsrp-dark-surface/20 rounded">
              <MessageSquare size={11} className="text-gsrp-orange flex-shrink-0" />
              <span className="text-white truncate">{caller}</span>
              {mod && <span className="text-gsrp-teal-light/40">→ {mod}</span>}
              <span className="text-gsrp-teal-light/30 flex-shrink-0 ml-auto">{formatTime(log.Timestamp)}</span>
            </div>
          );
        })}

        {activeLogs[tab].length === 0 && (
          <div className="flex items-center justify-center h-24 text-gsrp-teal-light/20 text-[11px]">
            No entries
          </div>
        )}
      </div>
    </div>
  );
}
