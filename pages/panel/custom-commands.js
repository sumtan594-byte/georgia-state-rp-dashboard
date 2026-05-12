import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { Loader2, Plus, Pencil, Trash2, X, Save, Terminal, Search, AlertTriangle, Gavel, Swords } from 'lucide-react';

const REQUIRED_ROLE = '1366688108296273926';

const DEFAULT_COMMAND = {
  name: '',
  aliases: [],
  punishments: { 1: 'Warning', 2: 'Kick', 3: 'Ban' },
  description: ''
};

const punishmentColors = {
  'Warning': 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  'Verbal Warning': 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  'Kick': 'text-red-400 bg-red-400/10 border-red-400/20',
  'Ban': 'text-red-600 bg-red-600/10 border-red-600/20',
};

export default function CustomCommandsPage() {
  const { data: session, status } = useSession();
  const [commands, setCommands] = useState({});
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [formData, setFormData] = useState(DEFAULT_COMMAND);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const hasRequiredRole = session?.user?.roles?.includes(REQUIRED_ROLE);

  useEffect(() => {
    if (status === 'unauthenticated') {
      signIn('discord', { callbackUrl: '/panel/custom-commands' });
    }
  }, [status]);

  useEffect(() => {
    if (session && hasRequiredRole) {
      fetch('/api/panel/custom-commands')
        .then(r => r.json())
        .then(setCommands)
        .finally(() => setLoading(false));
    }
  }, [session, hasRequiredRole]);

  const openAdd = () => {
    setEditingKey(null);
    setFormData({ ...DEFAULT_COMMAND });
    setModalOpen(true);
  };

  const openEdit = (key) => {
    setEditingKey(key);
    setFormData({ ...commands[key] });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const action = editingKey ? 'edit' : 'add';
    const key = editingKey || formData.key || formData.name.toLowerCase().replace(/ /g, '_');

    try {
      const res = await fetch('/api/panel/custom-commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, key, data: { ...formData, key } })
      });

      if (res.ok) {
        const updated = await res.json();
        setCommands(updated.commands);
        setModalOpen(false);
      }
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  const handleDelete = async (key) => {
    if (!confirm(`Delete "${commands[key].name}"?`)) return;

    const res = await fetch('/api/panel/custom-commands', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove', key })
    });

    if (res.ok) {
      const updated = await res.json();
      setCommands(updated.commands);
    }
  };

  const filteredEntries = Object.entries(commands).filter(([key, cmd]) =>
    !search || cmd.name?.toLowerCase().includes(search.toLowerCase()) ||
    key.toLowerCase().includes(search.toLowerCase()) ||
    cmd.aliases?.some(a => a.toLowerCase().includes(search.toLowerCase()))
  );

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center">
          <Loader2 className="w-8 h-8 text-gsrp-orange animate-spin mb-4" />
          <span className="text-gsrp-teal-light/40 font-mono text-[9px] uppercase tracking-[0.3em]">Loading Commands</span>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <button
          onClick={() => signIn('discord')}
          className="bg-gsrp-orange hover:bg-gsrp-orange-light text-white px-8 py-3 rounded-xl font-black text-sm transition-all shadow-lg shadow-gsrp-orange/20 cursor-pointer"
        >
          Sign in with Discord
        </button>
      </div>
    );
  }

  if (!hasRequiredRole) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center animate-fade-in-up">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-black text-white mb-2">Access Denied</h1>
          <p className="text-gsrp-teal-light/40 text-sm">You need the Server Administrator role to manage custom commands.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-white font-black text-2xl md:text-3xl mb-2 flex items-center gap-3">
            <Terminal className="text-gsrp-orange" />
            Custom Commands
          </h1>
          <p className="text-gsrp-teal-light/40 text-sm">Manage offense-based punishment commands for server moderation</p>
        </div>

        <button
          onClick={openAdd}
          className="bg-gsrp-orange hover:bg-gsrp-orange-light text-white px-6 py-3 rounded-xl font-black text-sm transition-all flex items-center gap-2 shadow-lg shadow-gsrp-orange/20 cursor-pointer"
        >
          <Plus size={18} />
          Add Command
        </button>
      </div>

      {Object.keys(commands).length > 0 && (
        <div className="relative mb-6">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gsrp-teal-light/30" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search commands..."
            className="w-full bg-gsrp-dark-card border border-white/5 rounded-xl pl-11 pr-4 py-3 text-white text-sm focus:border-gsrp-orange/50 focus:outline-none transition-colors"
          />
        </div>
      )}

      {filteredEntries.length === 0 && Object.keys(commands).length > 0 && (
        <div className="text-center py-16">
          <Search size={32} className="mx-auto text-gsrp-teal-light/20 mb-3" />
          <p className="text-gsrp-teal-light/40 text-sm">No commands match your search</p>
        </div>
      )}

      {Object.keys(commands).length === 0 ? (
        <div className="text-center py-20 animate-fade-in-up stagger-1">
          <div className="w-16 h-16 rounded-2xl bg-gsrp-orange/10 flex items-center justify-center mx-auto mb-4">
            <Terminal className="w-8 h-8 text-gsrp-orange" />
          </div>
          <h3 className="text-white font-black text-lg mb-1">No Custom Commands Yet</h3>
          <p className="text-gsrp-teal-light/40 text-sm mb-6">Create your first moderation command to get started.</p>
          <button
            onClick={openAdd}
            className="bg-gsrp-orange hover:bg-gsrp-orange-light text-white px-6 py-3 rounded-xl font-black text-sm transition-all inline-flex items-center gap-2 shadow-lg shadow-gsrp-orange/20 cursor-pointer"
          >
            <Plus size={18} />
            Create Command
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredEntries.map(([key, cmd], idx) => (
            <div
              key={key}
              className={`card-glass rounded-2xl p-6 hover:border-gsrp-orange/30 transition-all duration-300 group animate-fade-in-up stagger-${Math.min(idx + 1, 6)}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-black text-white text-lg group-hover:text-gsrp-orange-light transition-colors truncate">{cmd.name}</h3>
                    <span className="text-[10px] font-mono text-gsrp-teal-light/30 bg-gsrp-dark-surface px-2 py-0.5 rounded-md flex-shrink-0">
                      /{key}
                    </span>
                  </div>
                  {cmd.description && (
                    <p className="text-gsrp-teal-light/40 text-sm leading-relaxed">{cmd.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    {cmd.aliases?.map(alias => (
                      <span key={alias} className="text-[10px] font-mono font-bold text-gsrp-teal-light/50 bg-gsrp-dark-surface border border-gsrp-dark-border/50 px-2 py-1 rounded-md flex items-center gap-1">
                        <Swords size={10} className="text-gsrp-teal-light/30" />
                        ;{alias}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Gavel size={12} className="text-gsrp-teal-light/30" />
                    {[1, 2, 3].map(offense => (
                      <span
                        key={offense}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${punishmentColors[cmd.punishments?.[offense]] || 'text-white/40 bg-white/5 border-white/10'}`}
                      >
                        #{offense}: {cmd.punishments?.[offense]}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => openEdit(key)}
                    className="p-2 rounded-lg hover:bg-gsrp-dark-surface text-gsrp-teal-light/30 hover:text-gsrp-orange transition-all cursor-pointer"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(key)}
                    className="p-2 rounded-lg hover:bg-gsrp-dark-surface text-gsrp-teal-light/30 hover:text-red-500 transition-all cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative bg-gsrp-dark-card border border-white/10 rounded-3xl p-6 md:p-8 w-full max-w-lg animate-scale-in shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Terminal size={20} className="text-gsrp-orange" />
                {editingKey ? 'Edit' : 'Add'} Command
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 rounded-lg hover:bg-gsrp-dark-surface text-gsrp-teal-light/30 hover:text-white transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Command Key</label>
                <input
                  type="text"
                  value={formData.key || formData.name?.toLowerCase().replace(/ /g, '_') || ''}
                  onChange={e => setFormData({ ...formData, key: e.target.value })}
                  className="w-full bg-gsrp-dark-surface border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-gsrp-orange/50 focus:outline-none transition-colors disabled:opacity-40"
                  disabled={!!editingKey}
                  placeholder="rdm"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Display Name</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-gsrp-dark-surface border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-gsrp-orange/50 focus:outline-none transition-colors"
                  placeholder="Random Death Match"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Aliases (comma separated)</label>
                <input
                  type="text"
                  value={formData.aliases?.join(', ') || ''}
                  onChange={e => setFormData({
                    ...formData,
                    aliases: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  })}
                  className="w-full bg-gsrp-dark-surface border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-gsrp-orange/50 focus:outline-none transition-colors"
                  placeholder="rdm, random death match"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-gsrp-dark-surface border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-gsrp-orange/50 focus:outline-none transition-colors resize-none"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">Punishments by Offense</label>
                <div className="grid grid-cols-3 gap-3">
                  {[1, 2, 3].map(offense => (
                    <div key={offense} className="bg-gsrp-dark-surface border border-white/5 rounded-xl p-3">
                      <label className="block text-[9px] font-black uppercase tracking-wider text-white/30 mb-2">#{offense}</label>
                      <select
                        value={formData.punishments?.[offense] || 'Warning'}
                        onChange={e => setFormData({
                          ...formData,
                          punishments: { ...formData.punishments, [offense]: e.target.value }
                        })}
                        className="w-full bg-gsrp-dark border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:border-gsrp-orange/50 focus:outline-none transition-colors"
                      >
                        <option>Warning</option>
                        <option>Verbal Warning</option>
                        <option>Kick</option>
                        <option>Ban</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-white/5">
              <button
                onClick={() => setModalOpen(false)}
                className="px-6 py-2.5 rounded-xl text-xs font-black text-white/40 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-gsrp-orange hover:bg-gsrp-orange-light disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-2 shadow-lg shadow-gsrp-orange/20 cursor-pointer disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Command
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
