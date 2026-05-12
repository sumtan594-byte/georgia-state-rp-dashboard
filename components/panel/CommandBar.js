import { useState, useRef } from 'react';
import { Terminal, Send, Clock, ChevronDown } from 'lucide-react';

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
    <div className="p-3">
      <div className="flex items-center gap-1.5 mb-2.5">
        <Terminal size={12} className="text-gsrp-orange/40" />
        <span className="text-[10px] font-semibold tracking-wider text-white/40">Console</span>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <input ref={ref} type="text" value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder=":h Hello world"
            className="w-full bg-black/40 border border-gsrp-dark-border/50 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-white/20 outline-none focus:border-gsrp-orange/40 transition-colors" />
        </div>
        <button onClick={send} disabled={sending || !input.trim()}
          className="px-3 py-2 rounded-lg bg-gsrp-orange/20 text-gsrp-orange border border-gsrp-orange/30 hover:bg-gsrp-orange/30 transition-all disabled:opacity-20 cursor-pointer">
          <Send size={14} />
        </button>
        <div className="relative">
          <button onClick={() => setOpen(!open)}
            className="px-2.5 py-2 rounded-lg bg-white/5 border border-gsrp-dark-border/50 text-white/30 hover:text-white/60 hover:bg-white/10 transition-all cursor-pointer">
            <ChevronDown size={14} />
          </button>
          {open && (
            <div className="absolute bottom-full right-0 mb-2 w-56 bg-gsrp-dark-card border border-gsrp-dark-border/70 rounded-xl shadow-2xl p-2 max-h-60 overflow-y-auto z-50">
              {CATS.map(c => (
                <div key={c.label} className="mb-2 last:mb-0">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-gsrp-orange/50 px-1.5 mb-1">{c.label}</p>
                  <div className="flex flex-wrap gap-1">
                    {c.cmds.map(cmd => (
                      <button key={cmd} onClick={() => { setInput(cmd + ' '); setOpen(false); ref.current?.focus(); }}
                        className="px-2 py-0.5 text-[10px] font-mono bg-black/40 border border-gsrp-dark-border/50 rounded text-white/40 hover:text-white hover:bg-gsrp-orange/20 hover:border-gsrp-orange/30 transition-all cursor-pointer">
                        {cmd}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {fb && (
        <div className={`mt-1.5 text-[10px] font-medium ${fb.ok ? 'text-green-400/70' : 'text-red-400/70'}`}>
          {fb.msg}
        </div>
      )}

      {recentCommands.length > 0 && (
        <div className="mt-2 flex items-center gap-1 overflow-x-auto">
          <Clock size={10} className="text-white/20 flex-shrink-0" />
          {recentCommands.slice(-5).reverse().map((cmd, i) => (
            <button key={i} onClick={() => { setInput(cmd); ref.current?.focus(); }}
              className="text-[9px] font-mono text-white/25 hover:text-white/60 bg-black/30 border border-gsrp-dark-border/40 px-1.5 py-0.5 rounded whitespace-nowrap transition-colors cursor-pointer">
              {cmd}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
