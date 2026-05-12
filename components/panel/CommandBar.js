import { useState, useRef } from 'react';
import { Terminal, Send, Clock } from 'lucide-react';

const COMMAND_CATEGORIES = [
  {
    label: 'Moderation',
    commands: [':kill', ':down', ':tp', ':bring', ':to', ':jail', ':kick', ':refresh', ':respawn', ':heal', ':view', ':wanted', ':unwanted'],
  },
  {
    label: 'Admin',
    commands: [':weather', ':time', ':startfire', ':startnearfire', ':stopfire', ':prty', ':pt', ':tocar', ':toatv', ':h', ':m'],
  },
  {
    label: 'Info',
    commands: [':logs', ':killlogs', ':bans', ':admins', ':mods', ':commands'],
  },
];

export default function CommandBar({ onSendCommand, recentCommands = [] }) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef(null);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    setFeedback(null);
    try {
      const res = await onSendCommand(input.trim());
      if (res.ok) {
        setFeedback({ type: 'success', message: 'Command sent' });
        setInput('');
      } else {
        const body = await res.json().catch(() => ({}));
        setFeedback({ type: 'error', message: body.error || `Error ${res.status}` });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error' });
    } finally {
      setSending(false);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const pickCommand = (cmd) => {
    setInput(prev => {
      const parts = prev.split(/\s+/);
      parts[0] = cmd;
      return parts.join(' ') + ' ';
    });
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  return (
    <div className="p-2">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Terminal size={12} className="text-gsrp-teal-light/30" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-gsrp-teal-light/30">Command Console</span>
      </div>

      {/* Command dropdown */}
      <div className="relative mb-1.5">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="text-[10px] text-gsrp-teal-light/40 hover:text-white transition-colors"
        >
          {showDropdown ? '▼' : '▶'} Quick Commands
        </button>
        {showDropdown && (
          <div className="absolute top-full left-0 z-50 mt-1 w-56 bg-gsrp-dark-card border border-gsrp-dark-border/50 rounded-xl shadow-2xl p-2 max-h-60 overflow-y-auto">
            {COMMAND_CATEGORIES.map(cat => (
              <div key={cat.label} className="mb-2">
                <p className="text-[9px] font-bold uppercase tracking-wider text-gsrp-teal-light/30 px-1.5 mb-1">{cat.label}</p>
                <div className="flex flex-wrap gap-1">
                  {cat.commands.map(cmd => (
                    <button
                      key={cmd}
                      onClick={() => pickCommand(cmd)}
                      className="px-2 py-0.5 text-[10px] font-mono bg-gsrp-dark-surface/40 rounded text-gsrp-teal-light/60 hover:text-white hover:bg-gsrp-orange/20 transition-colors"
                    >
                      {cmd}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input row */}
      <div className="flex gap-1.5">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder=":h Hello world"
          className="flex-1 bg-gsrp-dark-surface/60 border border-gsrp-dark-border/50 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white placeholder-gsrp-teal-light/20 outline-none focus:border-gsrp-orange/50 transition-colors"
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          className="px-2.5 py-1.5 rounded-lg bg-gsrp-orange/20 text-gsrp-orange border border-gsrp-orange/30 hover:bg-gsrp-orange/30 transition-colors disabled:opacity-30"
        >
          <Send size={14} />
        </button>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`mt-1 text-[10px] ${feedback.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
          {feedback.message}
        </div>
      )}

      {/* Recent */}
      {recentCommands.length > 0 && (
        <div className="mt-1.5 flex items-center gap-1 overflow-x-auto">
          <Clock size={10} className="text-gsrp-teal-light/20 flex-shrink-0" />
          {recentCommands.slice(-5).reverse().map((cmd, i) => (
            <button
              key={i}
              onClick={() => { setInput(cmd); inputRef.current?.focus(); }}
              className="text-[9px] font-mono text-gsrp-teal-light/30 hover:text-white bg-gsrp-dark-surface/20 px-1.5 py-0.5 rounded whitespace-nowrap transition-colors"
            >
              {cmd}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
