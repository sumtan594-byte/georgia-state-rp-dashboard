import { useState, useRef } from 'react';
import { Terminal, Send, Clock } from 'lucide-react';

const CATS = [
  { label: 'Moderation', cmds: [':kill', ':down', ':tp', ':bring', ':to', ':jail', ':kick', ':refresh', ':respawn', ':heal', ':view', ':wanted', ':unwanted'] },
  { label: 'Admin', cmds: [':weather', ':time', ':startfire', ':startnearfire', ':stopfire', ':prty', ':pt', ':tocar', ':toatv', ':h', ':m'] },
  { label: 'Info', cmds: [':logs', ':killlogs', ':bans', ':admins', ':mods', ':commands'] },
];

export default function CommandBar({ onSendCommand, recentCommands = [] }) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [fb, setFb] = useState(null);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const send = async () => {
    if (!input.trim() || sending) return;
    setSending(true); setFb(null);
    try {
      const res = await onSendCommand(input.trim());
      if (res.ok) { setFb({ ok: true, msg: 'Command sent' }); setInput(''); }
      else { const b = await res.json().catch(() => ({})); setFb({ ok: false, msg: b.error || `Error ${res.status}` }); }
    } catch { setFb({ ok: false, msg: 'Network error' }); }
    finally { setSending(false); setTimeout(() => setFb(null), 3000); }
  };

  return (
    <div className="p-2">
      <div className="flex items-center gap-1.5 mb-2">
        <Terminal size={12} className="text-gsrp-orange/50" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-gsrp-orange/60">Command Console</span>
      </div>

      <div className="relative mb-1.5">
        <button onClick={() => setOpen(!open)}
          className="text-[10px] text-white/40 hover:text-gsrp-orange transition-colors font-medium">
          {open ? '▼' : '▶'} Quick Commands
        </button>
        {open && (
          <div className="absolute top-full left-0 z-50 mt-1 w-56 bg-black border border-gsrp-orange/30 rounded-xl shadow-2xl shadow-orange-900/30 p-2 max-h-60 overflow-y-auto">
            {CATS.map(c => (
              <div key={c.label} className="mb-2 last:mb-0">
                <p className="text-[9px] font-bold uppercase tracking-wider text-gsrp-orange/50 px-1.5 mb-1">{c.label}</p>
                <div className="flex flex-wrap gap-1">
                  {c.cmds.map(cmd => (
                    <button key={cmd} onClick={() => { setInput(cmd + ' '); setOpen(false); ref.current?.focus(); }}
                      className="px-2 py-0.5 text-[10px] font-mono bg-black/60 border border-gsrp-orange/15 rounded text-white/50 hover:text-white hover:bg-gradient-to-r hover:from-gsrp-orange/40 hover:to-gsrp-gold/20 hover:border-gsrp-orange/40 transition-all">
                      {cmd}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-1.5">
        <input ref={ref} type="text" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder=":h Hello world"
          className="flex-1 bg-black border border-gsrp-orange/30 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white placeholder-white/30 outline-none focus:border-gsrp-orange/60 transition-colors" />
        <button onClick={send} disabled={sending || !input.trim()}
          className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-gsrp-orange to-gsrp-gold text-black font-bold text-xs hover:opacity-90 transition-all disabled:opacity-20 shadow-lg shadow-orange-900/30">
          <Send size={14} />
        </button>
      </div>

      {fb && (
        <div className={`mt-1 text-[10px] font-medium ${fb.ok ? 'text-green-400/90' : 'text-red-400/90'}`}>
          {fb.msg}
        </div>
      )}

      {recentCommands.length > 0 && (
        <div className="mt-1.5 flex items-center gap-1 overflow-x-auto">
          <Clock size={10} className="text-gsrp-orange/30 flex-shrink-0" />
          {recentCommands.slice(-5).reverse().map((cmd, i) => (
            <button key={i} onClick={() => { setInput(cmd); ref.current?.focus(); }}
              className="text-[9px] font-mono text-white/30 hover:text-gsrp-orange bg-black/40 border border-gsrp-orange/10 px-1.5 py-0.5 rounded whitespace-nowrap transition-colors">
              {cmd}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
