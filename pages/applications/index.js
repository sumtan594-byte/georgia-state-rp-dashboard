import { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';
import { useSession } from 'next-auth/react';
import { Users, Search, Calendar, ChevronRight, ChevronLeft, Loader2, Trash2, CheckSquare, Square, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { canReviewApplications } from '../../lib/auth';
import LoginScreen from '../../components/auth/LoginScreen';
import { useRefreshedUser } from '../../lib/UserRefreshContext';
import AccessDenied from '../../components/auth/AccessDenied';
import { createPortal } from 'react-dom';
import { PageSkeleton, SkeletonTable } from '../../components/SkeletonLoader';

const PAGE_SIZE = 10;

export default function ApplicationsList() {
  const { data: session, status } = useSession();
  const { session: refreshedSession, hasRefreshed, accessDenied } = useRefreshedUser();
  const effectiveSession = refreshedSession || session;
  const [applications, setApplications] = useState([]);
  const [types, setTypes] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
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
  const fetchedRef = useRef(false);
  const listRequestRef = useRef(0);

  const fetchPage = useCallback(async (p, type, { background = false } = {}) => {
    const requestSequence = ++listRequestRef.current;
    if (!background) {
      setLoading(true);
      setError(null);
      setSelected(new Set());
    }
    const params = new URLSearchParams({ page: p, limit: PAGE_SIZE });
    if (type && type !== 'all') params.set('type', type);
    try {
      const [listResponse, typesResponse] = await Promise.all([
        fetch(`/api/applications/list?${params}`, { cache: 'no-store' }),
        fetch('/api/applications/types'),
      ]);
      if (!listResponse.ok || !typesResponse.ok) throw new Error('Failed to refresh applications');
      const [data, returnedTypes] = await Promise.all([listResponse.json(), typesResponse.json()]);
      if (requestSequence !== listRequestRef.current) return;
      setApplications(Array.isArray(data.applications) ? data.applications : []);
      setPage(data.page);
      setTotalPages(data.totalPages);
      setCounts(data.counts);

      const appTypes = Array.isArray(returnedTypes) ? [...returnedTypes] : [];
      const hasStaff = appTypes.find(t => t.slug === 'staff');
      if (!hasStaff) {
        appTypes.unshift({ name: 'Staff Application', slug: 'staff' });
      }
      setTypes([{ name: 'All Applications', slug: 'all' }, ...appTypes.filter(type => type.slug !== 'all')]);
    } catch (err) {
      if (requestSequence === listRequestRef.current && !background) setError(err.message);
    } finally {
      if (requestSequence === listRequestRef.current && !background) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status !== 'authenticated') return;
    if (!hasRefreshed || !canReviewApplications(effectiveSession)) return;
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchPage(page, activeTab);
  }, [status, hasRefreshed, effectiveSession, fetchPage]);

  useEffect(() => {
    if (status !== 'authenticated' || !hasRefreshed || !canReviewApplications(effectiveSession)) return;

    const refreshList = () => {
      if (document.visibilityState === 'visible') {
        fetchPage(page, activeTab, { background: true });
      }
    };
    const interval = window.setInterval(refreshList, 15000);
    window.addEventListener('focus', refreshList);
    document.addEventListener('visibilitychange', refreshList);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshList);
      document.removeEventListener('visibilitychange', refreshList);
    };
  }, [status, hasRefreshed, effectiveSession, page, activeTab, fetchPage]);

  const handleDelete = async (appId) => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/applications/${appId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setDeleteTarget(null);
      await fetchPage(applications.length === 1 && page > 1 ? page - 1 : page, activeTab);
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
      setShowBatchDelete(false);
      const remainingOnPage = applications.filter(app => !selected.has(app._id)).length;
      await fetchPage(remainingOnPage === 0 && page > 1 ? page - 1 : page, activeTab);
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

  if (status === 'loading' || !hasRefreshed) {
    return <PageSkeleton variant="table" rows={7} />;
  }
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
            <h1 className="font-display text-white font-extrabold text-3xl tracking-tight mb-2 flex items-center gap-3">
              <Users className="text-gsrp-orange" />
              Review Applications
            </h1>
            <p className="text-gsrp-teal-light/60 font-medium">
              Manage and review staff applications from the community.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gsrp-teal-light/30 w-4 h-4" />
              <input
                type="text"
                placeholder="Search applicants..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-gsrp-dark-surface border border-gsrp-dark-border/50 rounded-xl pl-11 pr-4 py-2.5 text-white text-sm focus:border-gsrp-orange/50 focus:outline-none transition-colors w-full md:w-64 font-medium"
              />
            </div>
            <button
              type="button"
              onClick={() => fetchPage(page, activeTab)}
              disabled={loading}
              aria-label="Refresh applications"
              title="Refresh applications"
              className="p-2.5 rounded-xl bg-gsrp-dark-surface border border-gsrp-dark-border/50 text-gsrp-teal-light/50 hover:text-white hover:border-gsrp-orange/50 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
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
              className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all duration-200 active:scale-[0.97] motion-reduce:transform-none border
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
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition-all text-xs uppercase tracking-widest"
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
          <div className="p-4"><SkeletonTable rows={7} cols={5} /></div>
        ) : error ? (
          <div className="p-20 text-center">
            <p className="text-red-500 font-bold">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-20 text-center">
            <p className="text-gsrp-teal-light/40 font-medium">No {activeTab === 'all' ? '' : `${activeTab} `}applications found.</p>
          </div>
        ) : (
          <>
          {/* Mobile cards, visible on small screens */}
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
                  <div className="w-10 h-10 rounded-full bg-gsrp-dark-surface border border-gsrp-dark-border/50 flex items-center justify-center text-gsrp-teal-light font-bold text-xs flex-shrink-0">
                    {app.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm truncate">{app.username}</p>
                  <p className="text-[10px] text-gsrp-teal-light/30 font-mono truncate">{app.userId}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border
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
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-gsrp-dark-surface border border-gsrp-dark-border/50 text-xs font-bold text-gsrp-teal-light hover:text-white hover:border-gsrp-orange/50 transition-all duration-200 active:scale-[0.97] motion-reduce:transform-none"
                  >
                    Review <ChevronRight size={13} />
                  </Link>
                  <button
                    onClick={() => setDeleteTarget(app)}
                    className="p-2 rounded-lg bg-gsrp-dark-surface border border-gsrp-dark-border/50 text-gsrp-teal-light/30 hover:text-red-500 hover:border-red-500/30 transition-all duration-200 active:scale-90 motion-reduce:transform-none"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table, hidden on small screens */}
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
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-gsrp-teal-light/40">Applicant</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-gsrp-teal-light/40">Submitted At</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-gsrp-teal-light/40 text-center">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-gsrp-teal-light/40 text-right">Action</th>
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
                          <div className="w-10 h-10 rounded-full bg-gsrp-dark-surface border border-gsrp-dark-border/50 flex items-center justify-center text-gsrp-teal-light font-bold text-xs">
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
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border
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
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gsrp-dark-surface border border-gsrp-dark-border/50 text-xs font-bold text-gsrp-teal-light hover:text-white hover:border-gsrp-orange/50 transition-all duration-200 active:scale-[0.97] motion-reduce:transform-none group-hover:bg-gsrp-dark-surface/80"
                        >
                          Review
                          <ChevronRight size={14} />
                        </Link>
                        <button
                          onClick={() => setDeleteTarget(app)}
                          className="p-2 rounded-lg bg-gsrp-dark-surface border border-gsrp-dark-border/50 text-gsrp-teal-light/30 hover:text-red-500 hover:border-red-500/30 transition-all duration-200 active:scale-90 motion-reduce:transform-none"
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
              <h3 className="text-white font-bold text-xl">Delete Application</h3>
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
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
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
              <h3 className="text-white font-bold text-xl">Delete Applications</h3>
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
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
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
