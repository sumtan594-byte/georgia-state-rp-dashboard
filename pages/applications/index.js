import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useSession } from 'next-auth/react';
import { Users, Search, Calendar, ChevronRight, ChevronLeft, Loader2, Trash2, CheckSquare, Square } from 'lucide-react';
import Link from 'next/link';
import { canReviewApplications } from '../../lib/auth';
import LoginScreen from '../../components/auth/LoginScreen';
import { useRefreshedUser } from '../../lib/UserRefreshContext';
import AccessDenied from '../../components/auth/AccessDenied';
import { createPortal } from 'react-dom';

const PAGE_SIZE = 10;

export default function ApplicationsList() {
  const { data: session, status } = useSession();
  const { session: refreshedSession, hasRefreshed, accessDenied } = useRefreshedUser();
  const effectiveSession = refreshedSession || session;
  const [applications, setApplications] = useState([]);
  const [types, setTypes] = useState([]);
  const [activeTab, setActiveTab] = useState('staff');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [counts, setCounts] = useState({});
  const [selected, setSelected] = useState(new Set());
  const [showBatchDelete, setShowBatchDelete] = useState(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);

  const fetchPage = (p, type) => {
    setLoading(true);
    setSelected(new Set());
    const params = new URLSearchParams({ page: p, limit: PAGE_SIZE });
    if (type) params.set('type', type);
    Promise.all([
      fetch(`/api/applications/list?${params}`).then(r => r.ok ? r.json() : { applications: [], total: 0, page: 1, totalPages: 1, counts: {} }),
      fetch('/api/applications/types').then(r => r.ok ? r.json() : [])
    ])
    .then(([data, appTypes]) => {
      setApplications(data.applications);
      setPage(data.page);
      setTotalPages(data.totalPages);
      setCounts(data.counts);

      const hasStaff = appTypes.find(t => t.slug === 'staff');
      if (!hasStaff) {
        appTypes.unshift({ name: 'Staff Application', slug: 'staff' });
      }
      setTypes(appTypes);
      setLoading(false);
    })
    .catch(err => {
      setError(err.message);
      setLoading(false);
    });
  };

  useEffect(() => {
    if (status !== 'authenticated') return;
    if (!hasRefreshed || !canReviewApplications(effectiveSession)) return;
    fetchPage(1, activeTab);
  }, [status, hasRefreshed, effectiveSession]);

  const handleDelete = async (appId) => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/applications/${appId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setApplications(prev => prev.filter(a => a._id !== appId));
      setDeleteTarget(null);
      setSelected(prev => { const next = new Set(prev); next.delete(appId); return next; });
    } catch (err) {
      alert(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBatchDelete = async () => {
    setIsBatchDeleting(true);
    try {
      const ids = Array.from(selected);
      const res = await fetch('/api/applications/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error('Failed to delete applications');
      setApplications(prev => prev.filter(a => !selected.has(a._id)));
      setSelected(new Set());
      setShowBatchDelete(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsBatchDeleting(false);
    }
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(a => a._id)));
    }
  };

  if (status === 'loading' || !hasRefreshed) return null;
  if (!session) return <LoginScreen />;
  if (accessDenied) return <AccessDenied roleId={accessDenied.roleId} />;
  if (!canReviewApplications(effectiveSession)) {
    return <AccessDenied roleId="1372491512709124106" />;
  }

  const filtered = applications.filter(app => {
    const matchesSearch = app.username.toLowerCase().includes(search.toLowerCase()) || app.userId.includes(search);
    return matchesSearch;
  });

  return (
    <div className="max-w-6xl mx-auto animate-fade-in-up">
      <Head>
        <title>Review Applications | GSRP Dashboard</title>
      </Head>

      <div className="mb-8 p-8 rounded-2xl bg-card-gradient border border-gsrp-dark-border/50 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-gsrp-orange/5 to-gsrp-teal/5 opacity-50" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-white font-black text-3xl mb-2 flex items-center gap-3">
              <Users className="text-gsrp-orange" />
              Review Applications
            </h1>
            <p className="text-gsrp-teal-light/60 font-medium">
              Manage and review staff applications from the community.
            </p>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gsrp-teal-light/30 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search applicants..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-gsrp-dark-surface border border-gsrp-dark-border/50 rounded-xl pl-11 pr-4 py-2.5 text-white text-sm focus:border-gsrp-orange/50 focus:outline-none transition-colors w-full md:w-64 font-medium"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {types.map(type => {
          const count = counts[type.slug] || 0;
          return (
            <button
              key={type.slug}
              onClick={() => { setActiveTab(type.slug); fetchPage(1, type.slug); }}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border
                ${activeTab === type.slug 
                  ? 'bg-gsrp-orange text-white border-gsrp-orange shadow-lg shadow-gsrp-orange/20 scale-105' 
                  : 'bg-gsrp-dark-card text-gsrp-teal-light/40 border-gsrp-dark-border/50 hover:text-white hover:border-gsrp-orange/30'}
              `}
            >
              {type.name}
              {count > 0 && <span className="ml-2 opacity-50">({count})</span>}
            </button>
          );
        })}
      </div>

      {selected.size > 0 && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
          <span className="text-sm font-bold text-red-400">{selected.size} application{selected.size > 1 ? 's' : ''} selected</span>
          <button
            onClick={() => setShowBatchDelete(true)}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-black rounded-lg transition-all text-xs uppercase tracking-widest"
          >
            <Trash2 size={14} />
            Delete Selected
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="px-3 py-2 text-gsrp-teal-light/40 hover:text-gsrp-teal-light text-xs font-bold transition-colors"
          >
            Clear Selection
          </button>
        </div>
      )}

      <div className="bg-gsrp-dark-card/60 backdrop-blur-md rounded-2xl border border-gsrp-dark-border/50 overflow-hidden">
        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-gsrp-orange animate-spin mb-4" />
            <span className="text-gsrp-teal-light/40 font-mono text-[9px] uppercase tracking-[0.3em]">Loading Applications</span>
          </div>
        ) : error ? (
          <div className="p-20 text-center">
            <p className="text-red-500 font-bold">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-20 text-center">
            <p className="text-gsrp-teal-light/40 font-medium">No {activeTab} applications found.</p>
          </div>
        ) : (
          <>
          {/* Mobile cards — visible on small screens */}
          <div className="block md:hidden divide-y divide-gsrp-dark-border/30">
            {filtered.map((app) => (
              <div key={app._id} className="p-4 flex items-center gap-3">
                <button onClick={() => toggleSelect(app._id)} className="flex-shrink-0">
                  {selected.has(app._id) ? (
                    <CheckSquare size={18} className="text-gsrp-orange" />
                  ) : (
                    <Square size={18} className="text-gsrp-teal-light/20 hover:text-gsrp-teal-light/40 transition-colors" />
                  )}
                </button>
                {app.userImage ? (
                  <img src={app.userImage} alt="" className="w-10 h-10 rounded-full border border-gsrp-dark-border/50 object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gsrp-dark-surface border border-gsrp-dark-border/50 flex items-center justify-center text-gsrp-teal-light font-black text-xs flex-shrink-0">
                    {app.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm truncate">{app.username}</p>
                  <p className="text-[10px] text-gsrp-teal-light/30 font-mono truncate">{app.userId}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border
                      ${app.status === 'pending' ? 'bg-gsrp-orange/10 text-gsrp-orange border-gsrp-orange/20' :
                        app.status === 'accepted' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                        'bg-red-500/10 text-red-500 border-red-500/20'}
                    `}>{app.status}</span>
                    <span className="text-[10px] text-gsrp-teal-light/30">{new Date(app.submittedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link
                    href={`/applications/${app._id}`}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-gsrp-dark-surface border border-gsrp-dark-border/50 text-xs font-bold text-gsrp-teal-light hover:text-white hover:border-gsrp-orange/50 transition-all"
                  >
                    Review <ChevronRight size={13} />
                  </Link>
                  <button
                    onClick={() => setDeleteTarget(app)}
                    className="p-2 rounded-lg bg-gsrp-dark-surface border border-gsrp-dark-border/50 text-gsrp-teal-light/30 hover:text-red-500 hover:border-red-500/30 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table — hidden on small screens */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gsrp-dark-border/50 bg-gsrp-dark-surface/30">
                  <th className="px-4 py-4 w-12">
                    <button onClick={toggleSelectAll} className="flex items-center justify-center">
                      {selected.size === filtered.length && filtered.length > 0 ? (
                        <CheckSquare size={16} className="text-gsrp-orange" />
                      ) : (
                        <Square size={16} className="text-gsrp-teal-light/20 hover:text-gsrp-teal-light/40 transition-colors" />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gsrp-teal-light/40">Applicant</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gsrp-teal-light/40">Submitted At</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gsrp-teal-light/40 text-center">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gsrp-teal-light/40 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((app) => (
                  <tr key={app._id} className={`border-b border-gsrp-dark-border/30 hover:bg-white/5 transition-colors group ${selected.has(app._id) ? 'bg-gsrp-orange/5' : ''}`}>
                    <td className="px-4 py-4">
                      <button onClick={() => toggleSelect(app._id)} className="flex items-center justify-center">
                        {selected.has(app._id) ? (
                          <CheckSquare size={16} className="text-gsrp-orange" />
                        ) : (
                          <Square size={16} className="text-gsrp-teal-light/20 hover:text-gsrp-teal-light/40 transition-colors" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {app.userImage ? (
                          <img src={app.userImage} alt="" className="w-10 h-10 rounded-full border border-gsrp-dark-border/50 object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gsrp-dark-surface border border-gsrp-dark-border/50 flex items-center justify-center text-gsrp-teal-light font-black text-xs">
                            {app.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="text-white font-bold text-sm">{app.username}</p>
                          <p className="text-[10px] text-gsrp-teal-light/30 font-mono">{app.userId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gsrp-teal-light/60">
                        <Calendar size={14} className="opacity-40" />
                        <span className="text-xs font-medium">{new Date(app.submittedAt).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border
                          ${app.status === 'pending' ? 'bg-gsrp-orange/10 text-gsrp-orange border-gsrp-orange/20' :
                            app.status === 'accepted' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                            'bg-red-500/10 text-red-500 border-red-500/20'}
                        `}>
                          {app.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/applications/${app._id}`}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gsrp-dark-surface border border-gsrp-dark-border/50 text-xs font-bold text-gsrp-teal-light hover:text-white hover:border-gsrp-orange/50 transition-all group-hover:bg-gsrp-dark-surface/80"
                        >
                          Review
                          <ChevronRight size={14} />
                        </Link>
                        <button
                          onClick={() => setDeleteTarget(app)}
                          className="p-2 rounded-lg bg-gsrp-dark-surface border border-gsrp-dark-border/50 text-gsrp-teal-light/30 hover:text-red-500 hover:border-red-500/30 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6 pb-2">
          <button
            onClick={() => fetchPage(page - 1, activeTab)}
            disabled={page <= 1}
            className="p-2 rounded-lg bg-gsrp-dark-card border border-gsrp-dark-border/50 text-gsrp-teal-light/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-xs font-mono text-gsrp-teal-light/50">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => fetchPage(page + 1, activeTab)}
            disabled={page >= totalPages}
            className="p-2 rounded-lg bg-gsrp-dark-card border border-gsrp-dark-border/50 text-gsrp-teal-light/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {deleteTarget && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ position: 'fixed' }}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => !isDeleting && setDeleteTarget(null)} />
          <div className="relative bg-gsrp-dark-card border border-red-500/30 rounded-2xl p-8 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <Trash2 size={20} className="text-red-500" />
              </div>
              <h3 className="text-white font-black text-xl">Delete Application</h3>
            </div>
            <p className="text-gsrp-teal-light/60 text-sm mb-2">
              Permanently delete <span className="text-white font-bold">{deleteTarget.username}</span>'s application?
            </p>
            <p className="text-red-400/80 text-xs mb-6 font-medium">This cannot be undone.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteTarget(null)} 
                disabled={isDeleting}
                className="flex-1 py-3 bg-gsrp-dark-surface border border-white/10 text-gsrp-teal-light font-bold rounded-xl hover:text-white transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleDelete(deleteTarget._id)}
                disabled={isDeleting}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-black rounded-xl transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showBatchDelete && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ position: 'fixed' }}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowBatchDelete(false)} />
          <div className="relative bg-gsrp-dark-card border border-red-500/30 rounded-2xl p-8 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <Trash2 size={20} className="text-red-500" />
              </div>
              <h3 className="text-white font-black text-xl">Delete Applications</h3>
            </div>
            <p className="text-gsrp-teal-light/60 text-sm mb-2">
              Permanently delete <span className="text-white font-bold">{selected.size}</span> selected application{selected.size > 1 ? 's' : ''}?
            </p>
            <p className="text-red-400/80 text-xs mb-6 font-medium">This cannot be undone.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowBatchDelete(false)} 
                disabled={isBatchDeleting}
                className="flex-1 py-3 bg-gsrp-dark-surface border border-white/10 text-gsrp-teal-light font-bold rounded-xl hover:text-white transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleBatchDelete}
                disabled={isBatchDeleting}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-black rounded-xl transition-colors disabled:opacity-50"
              >
                {isBatchDeleting ? 'Deleting...' : `Delete ${selected.size}`}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
