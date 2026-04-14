import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { Loader2, Plus, Pencil, Trash2, X, Save } from 'lucide-react';

const REQUIRED_ROLE = '1366688108296273926';

const DEFAULT_COMMAND = {
  name: '',
  aliases: [],
  punishments: { 1: 'Warning', 2: 'Kick', 3: 'Ban' },
  description: ''
};

export default function CustomCommandsPage() {
  const { data: session, status } = useSession();
  const [commands, setCommands] = useState({});
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [formData, setFormData] = useState(DEFAULT_COMMAND);
  const [saving, setSaving] = useState(false);

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
    setFormData(DEFAULT_COMMAND);
    setModalOpen(true);
  };

  const openEdit = (key) => {
    setEditingKey(key);
    setFormData(commands[key]);
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

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-gsrp-orange animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <button onClick={() => signIn('discord')} className="btn-primary">
          Sign in with Discord
        </button>
      </div>
    );
  }

  if (!hasRequiredRole) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-2">Access Denied</h1>
          <p className="text-gsrp-teal-light/60">You need the Server Administrator role to manage custom commands.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Custom Commands</h1>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Command
        </button>
      </div>

      <div className="grid gap-4">
        {Object.entries(commands).map(([key, cmd]) => (
          <div key={key} className="bg-gsrp-dark/50 border border-gsrp-teal/20 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-gsrp-teal">{cmd.name}</h3>
                <p className="text-sm text-gsrp-teal-light/60">{cmd.description}</p>
                <div className="flex gap-2 mt-2">
                  {cmd.aliases?.map(alias => (
                    <span key={alias} className="text-xs bg-gsrp-dark px-2 py-1 rounded">
                      ;{alias}
                    </span>
                  ))}
                </div>
                <div className="text-xs text-gsrp-teal-light/40 mt-2">
                  1st: {cmd.punishments?.[1]} | 2nd: {cmd.punishments?.[2]} | 3rd: {cmd.punishments?.[3]}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(key)} className="p-2 hover:bg-gsrp-dark rounded">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(key)} className="p-2 hover:bg-gsrp-dark rounded text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gsrp-dark border border-gsrp-teal/30 rounded-lg p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{editingKey ? 'Edit' : 'Add'} Command</h2>
              <button onClick={() => setModalOpen(false)}><X className="w-5 h-5" /></button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Key (command name)</label>
                <input
                  type="text"
                  value={formData.key || formData.name?.toLowerCase().replace(/ /g, '_') || ''}
                  onChange={e => setFormData({ ...formData, key: e.target.value })}
                  className="w-full bg-black/30 border border-gsrp-teal/30 rounded px-3 py-2"
                  disabled={!!editingKey}
                  placeholder="rdm"
                />
              </div>
              
              <div>
                <label className="block text-sm mb-1">Display Name</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-black/30 border border-gsrp-teal/30 rounded px-3 py-2"
                  placeholder="Random Death Match"
                />
              </div>
              
              <div>
                <label className="block text-sm mb-1">Aliases (comma separated)</label>
                <input
                  type="text"
                  value={formData.aliases?.join(', ') || ''}
                  onChange={e => setFormData({ 
                    ...formData, 
                    aliases: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  })}
                  className="w-full bg-black/30 border border-gsrp-teal/30 rounded px-3 py-2"
                  placeholder="rdm, random death match"
                />
              </div>
              
              <div>
                <label className="block text-sm mb-1">Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-black/30 border border-gsrp-teal/30 rounded px-3 py-2"
                  rows={2}
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm mb-1">1st Offense</label>
                  <select
                    value={formData.punishments?.[1] || 'Warning'}
                    onChange={e => setFormData({
                      ...formData,
                      punishments: { ...formData.punishments, 1: e.target.value }
                    })}
                    className="w-full bg-black/30 border border-gsrp-teal/30 rounded px-3 py-2"
                  >
                    <option>Warning</option>
                    <option>Verbal Warning</option>
                    <option>Kick</option>
                    <option>Ban</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">2nd Offense</label>
                  <select
                    value={formData.punishments?.[2] || 'Kick'}
                    onChange={e => setFormData({
                      ...formData,
                      punishments: { ...formData.punishments, 2: e.target.value }
                    })}
                    className="w-full bg-black/30 border border-gsrp-teal/30 rounded px-3 py-2"
                  >
                    <option>Warning</option>
                    <option>Verbal Warning</option>
                    <option>Kick</option>
                    <option>Ban</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">3rd Offense</label>
                  <select
                    value={formData.punishments?.[3] || 'Ban'}
                    onChange={e => setFormData({
                      ...formData,
                      punishments: { ...formData.punishments, 3: e.target.value }
                    })}
                    className="w-full bg-black/30 border border-gsrp-teal/30 rounded px-3 py-2"
                  >
                    <option>Warning</option>
                    <option>Verbal Warning</option>
                    <option>Kick</option>
                    <option>Ban</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setModalOpen(false)} className="btn-ghost">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}