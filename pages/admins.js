import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { ShieldCheck, Loader2, Trash2, Plus, X, Users, AlertCircle } from 'lucide-react';
import { canManageAdmins } from '../lib/auth';
import { useRefreshedUser } from '../lib/UserRefreshContext';
import LoginScreen from '../components/auth/LoginScreen';

export default function AdminsPage() {
  const { data: session, status } = useSession();
  const { session: refreshedSession } = useRefreshedUser();
  const effectiveSession = refreshedSession || session;
  const router = useRouter();

  const [admins, setAdmins] = useState([]);
  const [envAdmins, setEnvAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newUserId, setNewUserId] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchAdmins = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admins');
      if (res.ok) {
        const data = await res.json();
        setAdmins(data.admins);
        setEnvAdmins(data.envAdmins);
      } else {
        const body = await res.json();
        setError(body.error || 'Failed to fetch');
        if (res.status === 403) router.push('/');
      }
    } catch {
      setError('Network error');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (status === 'authenticated' && effectiveSession) {
      if (!canManageAdmins(effectiveSession)) {
        router.push('/');
        return;
      }
      fetchAdmins();
    }
  }, [status, effectiveSession]);

  const handleAdd = async () => {
    if (!newUserId.trim()) return;
    setAdding(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: newUserId.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewUserId('');
        setSuccess('Admin added successfully');
        await fetchAdmins();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to add admin');
      }
    } catch {
      setError('Network error');
    }
    setAdding(false);
  };

  const handleRemove = async (userId) => {
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admins', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Admin removed');
        await fetchAdmins();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to remove admin');
      }
    } catch {
      setError('Network error');
    }
  };

  if (status === 'loading') return null;
  if (!session) return <LoginScreen />;

  return (
    <div className="max-w-3xl mx-auto animate-fade-in-up">
      <Head>
        <title>Edit Admins | GSRP Dashboard</title>
      </Head>

      <div className="mb-8">
        <h1 className="text-white font-black text-2xl md:text-3xl mb-2 flex items-center gap-3">
          <ShieldCheck className="text-gsrp-orange" size={28} />
          Edit Admins List
        </h1>
        <p className="text-white/40 text-sm">Manage system administrators for the dashboard.</p>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
          <AlertCircle size={14} />
          {success}
        </div>
      )}

      {envAdmins.length > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-br from-gsrp-orange/10 to-gsrp-gold/5 border border-gsrp-orange/20">
          <p className="text-[10px] font-black uppercase tracking-widest text-gsrp-orange/70 mb-2 flex items-center gap-2">
            <ShieldCheck size={12} /> Env-Configured Admins
          </p>
          <p className="text-xs text-white/50">
            These admins are configured via environment variables and cannot be removed from this panel: <span className="text-white/80 font-mono">{envAdmins.join(', ')}</span>
          </p>
        </div>
      )}

      <div className="mb-8 p-4 rounded-xl bg-black border border-gsrp-orange/20">
        <p className="text-[10px] font-black uppercase tracking-widest text-gsrp-orange/60 mb-3 flex items-center gap-2">
          <Plus size={12} /> Add New Admin
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter Discord User ID"
            value={newUserId}
            onChange={e => setNewUserId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            className="flex-1 bg-black/60 border border-gsrp-orange/30 rounded-lg px-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-gsrp-orange/60 transition-colors font-mono"
          />
          <button
            onClick={handleAdd}
            disabled={adding || !newUserId.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-gsrp-orange to-gsrp-gold text-black text-xs font-bold hover:opacity-90 transition-all disabled:opacity-30 shadow-lg shadow-orange-900/30"
          >
            {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Add
          </button>
        </div>
      </div>

      <div className="rounded-xl bg-black border border-gsrp-orange/20 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gsrp-orange/20">
          <span className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
            <Users size={12} /> Configured Admins ({admins.length})
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="text-gsrp-orange animate-spin" />
          </div>
        ) : admins.length === 0 ? (
          <div className="py-12 text-center">
            <Users size={24} className="text-white/15 mx-auto mb-3" />
            <p className="text-white/25 text-sm">No admins have been added yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gsrp-orange/10">
            {admins.map(admin => (
              <div key={admin.userId} className="flex items-center gap-3 px-4 py-3 hover:bg-gradient-to-r hover:from-gsrp-orange/5 hover:to-transparent transition-colors">
                <div className="flex-shrink-0">
                  {admin.avatar ? (
                    <img src={admin.avatar} alt="" className="w-10 h-10 rounded-full border-2 border-gsrp-orange/30 object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gsrp-orange/20 to-gsrp-gold/10 border-2 border-gsrp-orange/30 flex items-center justify-center text-gsrp-orange font-black text-xs">
                      {admin.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{admin.name}</p>
                  <p className="text-[10px] font-mono text-white/40 truncate">{admin.userId}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[9px] text-white/30">Added by {admin.addedByName}</p>
                  <p className="text-[9px] text-white/20">{admin.addedAt ? new Date(admin.addedAt).toLocaleDateString() : ''}</p>
                </div>
                <button
                  onClick={() => handleRemove(admin.userId)}
                  className="p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  title="Remove admin"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
