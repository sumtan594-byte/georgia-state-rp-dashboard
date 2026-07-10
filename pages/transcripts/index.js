import { useSession } from "next-auth/react";
import Link from "next/link";
import { PageSkeleton } from '../../components/SkeletonLoader';
import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import {
  FileText, ChevronRight, Briefcase, Search, Calendar, Layers, Clock, Hash,
  Filter, ArrowUpRight, ChevronLeft, AlertTriangle, X,
  Sun, Sunset, Users, FileCheck, BarChart3, Sparkles, ShieldCheck, RefreshCw,
  Trash2
} from "lucide-react";

const BG_IMAGE = "/media/Background.png";
const TICKETS_PER_PAGE = 15;

const TYPE_CONFIG = {
  GENERAL:      { label: "General",      color: "text-gsrp-teal-light",   border: "border-gsrp-teal/40",  bg: "bg-gsrp-teal/10",  dot: "bg-gsrp-teal-light", icon: FileCheck },
  DEPARTMENTAL: { label: "Departmental", color: "text-gsrp-cyan",         border: "border-gsrp-cyan/40",  bg: "bg-gsrp-cyan/10",  dot: "bg-gsrp-cyan", icon: Briefcase },
  MANAGEMENT:   { label: "Management",   color: "text-gsrp-orange-light", border: "border-gsrp-orange/40", bg: "bg-gsrp-orange/10", dot: "bg-gsrp-orange-light", icon: ShieldCheck },
  DIRECTIVE:    { label: "Directive",    color: "text-gsrp-gold",         border: "border-gsrp-gold/40",  bg: "bg-gsrp-gold/10",  dot: "bg-gsrp-gold", icon: AlertTriangle },
};

function TypeBadge({ type }) {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.GENERAL;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest ${cfg.color} ${cfg.bg} border ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} animate-pulse-glow`} />
      {cfg.label}
    </span>
  );
}

export default function Transcripts({ transcripts: initialTranscripts, isAdmin: initialIsAdmin, currentSort }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [transcripts, setTranscripts] = useState(initialTranscripts || []);
  const [isAdmin, setIsAdmin] = useState(initialIsAdmin || false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("ALL");
  const [query, setQuery] = useState("");
  const [date, setDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [confirmAction, setConfirmAction] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { setCurrentPage(1); setSelectedIds(new Set()); }, [activeTab, query, date]);

  const fetchTranscripts = useCallback(async () => {
    setLoading(true);
    try {
      const sort = router.query.sort || currentSort || 'latest';
      const res = await fetch(`/api/transcripts/list?sort=${sort}&_t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setTranscripts(data.transcripts || []);
        setIsAdmin(data.isAdmin || false);
      }
    } catch (e) {
      console.error('[Transcripts] Fetch error:', e);
    }
    setLoading(false);
  }, [router.query.sort, currentSort]);

  const handleSortChange = (newSort) => {
    router.push({ pathname: router.pathname, query: { ...router.query, sort: newSort } });
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const pageIds = paginatedTranscripts.map(t => t.rawName);
    const allSelected = pageIds.every(id => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pageIds));
    }
  };

  const handleDelete = async (ids, clearAll = false) => {
    setDeleting(true);
    try {
      const body = clearAll ? { clearAll: true } : { ids };
      const res = await fetch('/api/transcripts/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setConfirmAction(null);
        setSelectedIds(new Set());
        await fetchTranscripts();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete');
      }
    } catch (e) {
      alert('Network error');
    }
    setDeleting(false);
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchTranscripts();
    }
  }, [status, fetchTranscripts]);

  const filteredTranscripts = useMemo(() => {
    if (!Array.isArray(transcripts)) return [];
    return transcripts.filter(t => {
      if (activeTab !== "ALL" && t.type !== activeTab) return false;
      if (date && t.date !== date) return false;
      const q = query.toLowerCase();
      return (
        (t.channelName || "").toLowerCase().includes(q) ||
        (t.ownerId || "").includes(q) ||
        (t.reason || "").toLowerCase().includes(q) ||
        (t.rawName || "").toLowerCase().includes(q)
      );
    });
  }, [transcripts, activeTab, query, date]);

  const stats = useMemo(() => {
    if (!Array.isArray(transcripts)) return {};
    const out = { total: transcripts.length };
    for (const t of transcripts) {
      out[t.type] = (out[t.type] || 0) + 1;
    }
    return out;
  }, [transcripts]);

  const totalPages = Math.ceil(filteredTranscripts.length / TICKETS_PER_PAGE);
  const startIndex = (currentPage - 1) * TICKETS_PER_PAGE;
  const paginatedTranscripts = filteredTranscripts.slice(startIndex, startIndex + TICKETS_PER_PAGE);

  const ConfirmModal = () => {
    if (!confirmAction) return null;
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setConfirmAction(null)}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div className="relative bg-gsrp-dark-card border border-gsrp-dark-border/60 rounded-2xl w-full max-w-sm shadow-2xl animate-scale-in p-6" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gsrp-sunset/10 border border-gsrp-sunset/20 flex items-center justify-center">
              <Trash2 size={16} className="text-gsrp-sunset" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">{confirmAction.title}</h3>
              <p className="text-gsrp-teal-light/40 text-[10px] font-bold uppercase tracking-widest mt-0.5">{confirmAction.description}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmAction(null)}
              className="flex-1 px-4 py-2.5 rounded-xl bg-gsrp-dark-surface/60 border border-gsrp-dark-border/50 text-gsrp-teal-light/70 text-[10px] font-bold uppercase tracking-wider hover:bg-gsrp-dark-surface transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => handleDelete(confirmAction.ids, confirmAction.clearAll)}
              disabled={deleting}
              className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-gsrp-sunset to-red-700 text-white text-[10px] font-bold uppercase tracking-wider hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {deleting ? <><RefreshCw size={10} className="animate-spin" /> Deleting</> : <>Delete{confirmAction.clearAll ? ' All' : ''}</>}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const PaginationControls = () => {
    if (totalPages <= 1) return null;
    const pages = [];
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);
    for (let i = start; i <= end; i++) pages.push(i);

    return (
      <div className="flex justify-center items-center gap-2 mt-10 animate-fade-in-up">
        <button
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gsrp-dark-card/60 border border-gsrp-dark-border/50 text-gsrp-teal-light/70 text-[10px] font-bold uppercase tracking-wider hover:bg-gsrp-dark-surface/60 hover:border-gsrp-teal/30 hover:text-gsrp-teal-light transition-all duration-200 disabled:opacity-30 cursor-pointer"
        >
          <ChevronLeft size={12} /> Prev
        </button>
        {start > 1 && <><button onClick={() => setCurrentPage(1)} className="w-9 h-9 rounded-xl bg-gsrp-dark-card/60 border border-gsrp-dark-border/50 text-gsrp-teal-light/70 text-xs font-bold hover:bg-gsrp-dark-surface/60 hover:border-gsrp-teal/30 transition-all duration-200 cursor-pointer">1</button><span className="text-gsrp-dark-border text-xs">…</span></>}
        {pages.map(p => (
          <button key={p} onClick={() => setCurrentPage(p)} className={`w-9 h-9 rounded-xl text-xs font-bold border transition-all duration-200 cursor-pointer ${currentPage === p ? 'bg-gradient-to-r from-gsrp-orange to-gsrp-gold border-gsrp-orange/50 text-white shadow-lg shadow-gsrp-orange/20' : 'bg-gsrp-dark-card/60 border-gsrp-dark-border/50 text-gsrp-teal-light/70 hover:bg-gsrp-dark-surface/60 hover:border-gsrp-teal/30'}`}>{p}</button>
        ))}
        {end < totalPages && <><span className="text-gsrp-dark-border text-xs">…</span><button onClick={() => setCurrentPage(totalPages)} className="w-9 h-9 rounded-xl bg-gsrp-dark-card/60 border border-gsrp-dark-border/50 text-gsrp-teal-light/70 text-xs font-bold hover:bg-gsrp-dark-surface/60 hover:border-gsrp-teal/30 transition-all duration-200 cursor-pointer">{totalPages}</button></>}
        <button
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gsrp-dark-card/60 border border-gsrp-dark-border/50 text-gsrp-teal-light/70 text-[10px] font-bold uppercase tracking-wider hover:bg-gsrp-dark-surface/60 hover:border-gsrp-teal/30 hover:text-gsrp-teal-light transition-all duration-200 disabled:opacity-30 cursor-pointer"
        >
          Next <ChevronRight size={12} />
        </button>
      </div>
    );
  };

  if (status === "loading" || loading && transcripts.length === 0) return (
    <PageSkeleton variant="table" rows={7} />
  );

  if (!session) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <a href="/api/auth/signin" className="inline-flex items-center gap-2 bg-[#5865F2] hover:bg-[#4752c4] text-white px-6 py-3 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer">
        Sign in with Discord
      </a>
    </div>
  );

  const tabs = [
    { id: "ALL", label: "All", icon: Layers, count: stats.total },
    { id: "GENERAL", label: "General", icon: FileCheck, count: stats.GENERAL || 0 },
    { id: "DEPARTMENTAL", label: "Department", icon: Briefcase, count: stats.DEPARTMENTAL || 0 },
    { id: "MANAGEMENT", label: "Management", icon: Users, count: stats.MANAGEMENT || 0 },
    ...(isAdmin ? [{ id: "DIRECTIVE", label: "Directive", icon: AlertTriangle, count: stats.DIRECTIVE || 0 }] : []),
  ];

  const totalShowing = Math.min(startIndex + TICKETS_PER_PAGE, filteredTranscripts.length);

  return (
    <div className="max-w-6xl mx-auto animate-fade-in-up">
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-extrabold text-white tracking-tight">Ticket Records</h1>
            <p className="text-gsrp-teal-light/50 text-xs mt-1.5">
              {filteredTranscripts.length > 0
                ? <>Showing <span className="font-mono text-gsrp-teal-light/70">{startIndex + 1}–{totalShowing}</span> of <span className="font-mono text-gsrp-teal-light/70">{filteredTranscripts.length}</span> records</>
                : 'No records found'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {selectedIds.size > 0 && (
              <button
                onClick={() => setConfirmAction({ title: 'Delete Selected', description: `${selectedIds.size} transcript(s) will be permanently deleted.`, ids: [...selectedIds] })}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gsrp-sunset/15 border border-gsrp-sunset/30 text-gsrp-sunset text-[10px] font-bold uppercase tracking-wider hover:bg-gsrp-sunset/25 transition-all duration-200 cursor-pointer"
              >
                <Trash2 size={12} /> Delete {selectedIds.size > 1 ? `(${selectedIds.size})` : ''}
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => setConfirmAction({ title: 'Clear All Transcripts', description: 'ALL transcripts will be permanently deleted. This cannot be undone.', ids: [], clearAll: true })}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gsrp-sunset/10 border border-gsrp-sunset/20 text-gsrp-sunset/70 text-[10px] font-bold uppercase tracking-wider hover:bg-gsrp-sunset/20 hover:text-gsrp-sunset transition-all duration-200 cursor-pointer"
              >
                <Trash2 size={12} /> Clear All
              </button>
            )}
            <button
              onClick={fetchTranscripts}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gsrp-dark-card/60 border border-gsrp-dark-border/50 text-gsrp-teal-light/70 text-[10px] font-bold uppercase tracking-wider hover:bg-gsrp-dark-surface/60 hover:border-gsrp-teal/30 hover:text-gsrp-teal-light transition-all duration-200 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <div className="flex items-center bg-gsrp-dark-card/60 border border-gsrp-dark-border/50 rounded-xl px-3.5 py-2.5 gap-2">
              <Clock size={12} className="text-gsrp-teal-light/40 flex-shrink-0" />
              <select
                value={currentSort || router.query.sort || 'latest'}
                onChange={(e) => handleSortChange(e.target.value)}
                className="bg-transparent outline-none text-[10px] font-bold text-gsrp-teal-light/70 uppercase tracking-wider cursor-pointer"
              >
                <option value="latest" className="bg-gsrp-dark-card">Newest First</option>
                <option value="oldest" className="bg-gsrp-dark-card">Oldest First</option>
              </select>
            </div>
            <div className="relative flex items-center bg-gsrp-dark-card/60 border border-gsrp-dark-border/50 rounded-xl px-3.5 py-2.5 gap-2">
              <Calendar size={12} className="text-gsrp-teal-light/40 flex-shrink-0" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-transparent outline-none text-[10px] font-bold text-gsrp-teal-light/70 max-w-[130px]"
              />
              {date && (
                <button onClick={() => setDate('')} className="ml-1 text-gsrp-dark-border hover:text-gsrp-teal-light/50 transition-colors cursor-pointer">
                  <X size={10} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Total", value: stats.total || 0, color: "text-white", gradient: "from-gsrp-orange/10 to-gsrp-gold/10", border: "border-gsrp-orange/20", icon: BarChart3 },
            { label: "General", value: stats.GENERAL || 0, color: "text-gsrp-teal-light", gradient: "from-gsrp-teal/10 to-gsrp-cyan/10", border: "border-gsrp-teal/20", icon: FileCheck },
            { label: "Departmental", value: stats.DEPARTMENTAL || 0, color: "text-gsrp-cyan", gradient: "from-gsrp-cyan/10 to-gsrp-sky/10", border: "border-gsrp-cyan/20", icon: Users },
            { label: "Management", value: stats.MANAGEMENT || 0, color: "text-gsrp-orange-light", gradient: "from-gsrp-orange/10 to-gsrp-sunset/10", border: "border-gsrp-orange/20", icon: ShieldCheck },
          ].map((s, i) => (
            <div key={s.label} className={`bg-gradient-to-br ${s.gradient} border ${s.border} rounded-2xl px-5 py-4 animate-fade-in-up`} style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="flex items-center gap-2 mb-2">
                <s.icon size={12} className="text-gsrp-teal-light/40" />
                <div className="text-[10px] font-semibold text-gsrp-teal-light/45 tracking-wide">{s.label}</div>
              </div>
              <div className={`font-mono text-[26px] font-bold tabular ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="relative mb-5">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gsrp-teal-light/30" size={15} />
        <input
          type="text"
          placeholder="Search channel, user ID, or reason…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-gsrp-dark-card/60 border border-gsrp-dark-border/50 rounded-xl py-3.5 pl-12 pr-4 outline-none focus:border-gsrp-orange/40 focus:bg-gsrp-dark-surface/60 transition-all duration-200 text-sm text-gray-200 placeholder:text-gsrp-teal-light/20"
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gsrp-dark-border hover:text-gsrp-teal-light/50 transition-colors cursor-pointer">
            <X size={14} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 mb-8 bg-gsrp-dark-card/40 border border-gsrp-dark-border/50 p-1 rounded-xl overflow-x-auto">
        {tabs.map(({ id, label, icon: Icon, count }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all duration-200 flex-shrink-0 cursor-pointer ${
              activeTab === id
                ? 'bg-gradient-to-r from-gsrp-orange/20 to-gsrp-teal/20 text-white shadow-sm border border-gsrp-orange/20'
                : 'text-gsrp-teal-light/40 hover:text-gsrp-teal-light/70 hover:bg-gsrp-dark-surface/40'
            }`}
          >
            <Icon size={12} />
            <span className="hidden sm:inline">{label}</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${activeTab === id ? 'bg-white/20 text-white' : 'bg-gsrp-dark-surface/50 text-gsrp-teal-light/30'}`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {paginatedTranscripts.length > 0 && selectedIds.size > 0 && (
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer" onClick={(e) => { e.preventDefault(); toggleSelectAll(); }}>
              <input
                type="checkbox"
                checked={paginatedTranscripts.every(t => selectedIds.has(t.rawName)) && selectedIds.size > 0}
                onChange={() => {}}
                className="w-3.5 h-3.5 accent-gsrp-orange cursor-pointer"
              />
              <span className="text-[9px] font-bold text-gsrp-teal-light/60 uppercase tracking-widest">
                {paginatedTranscripts.every(t => selectedIds.has(t.rawName)) ? 'Deselect All' : 'Select All Page'}
              </span>
            </label>
          </div>
          <span className="text-[9px] font-bold text-gsrp-teal-light/30 uppercase tracking-widest">{selectedIds.size} selected</span>
        </div>
      )}

      <div className="space-y-2">
        {paginatedTranscripts.length === 0 ? (
          <div className="py-24 text-center border border-dashed border-gsrp-dark-border/50 rounded-2xl animate-scale-in">
            <FileText className="mx-auto text-gsrp-dark-border mb-4" size={36} />
            <p className="text-gsrp-teal-light/30 text-[10px] font-bold uppercase tracking-widest">No records match your filters</p>
            {(query || date || activeTab !== 'ALL') && (
              <button
                onClick={() => { setQuery(''); setDate(''); setActiveTab('ALL'); }}
                className="mt-4 text-gsrp-orange-light hover:text-gsrp-gold text-[10px] font-bold uppercase tracking-widest transition-colors cursor-pointer"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : paginatedTranscripts.map((t, i) => (
          <div key={t.rawName} className="flex items-stretch gap-0" style={{ animationDelay: `${i * 0.03}s` }}>
            <label
              className="flex items-center justify-center w-10 flex-shrink-0 bg-gsrp-dark-card/40 border border-r-0 border-gsrp-dark-border/50 rounded-l-xl cursor-pointer hover:bg-gsrp-dark-surface/40 transition-colors"
              onClick={(e) => { e.preventDefault(); toggleSelect(t.rawName); }}
            >
              <input
                type="checkbox"
                checked={selectedIds.has(t.rawName)}
                onChange={() => {}}
                className="w-3.5 h-3.5 accent-gsrp-orange cursor-pointer"
              />
            </label>
            <Link
              href={`/transcript/${t.rawName}`}
              className="ticket-row group flex items-center justify-between flex-1 bg-gsrp-dark-card/40 border border-gsrp-dark-border/50 hover:border-gsrp-orange/30 hover:bg-gsrp-dark-surface/60 p-4 rounded-r-xl transition-all duration-200 cursor-pointer border-l-0"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-gsrp-dark-surface/50 border border-gsrp-dark-border/50 group-hover:border-gsrp-orange/30 group-hover:bg-gsrp-orange/10 flex items-center justify-center text-gsrp-teal-light/30 group-hover:text-gsrp-orange-light transition-all duration-200 flex-shrink-0">
                  <FileText size={16} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-bold text-sm text-white group-hover:text-gsrp-orange-light transition-colors duration-200 truncate">
                      {t.channelName}
                    </span>
                    <TypeBadge type={t.type} />
                  </div>
                  <div className="flex items-center gap-3.5 mt-1.5">
                    <span className="flex items-center gap-1.5 font-mono text-[11px] text-gsrp-teal-light/40">
                      <Calendar size={10} className="text-gsrp-teal-light/30" /> {t.date}
                    </span>
                    <span className="flex items-center gap-1.5 font-mono text-[11px] text-gsrp-teal-light/40">
                      <Hash size={10} className="text-gsrp-teal-light/30" /> {t.ownerId}
                    </span>
                    {t.reason && t.reason !== 'NoReason' && (
                      <span className="hidden md:flex items-center gap-1.5 text-[11px] text-gsrp-teal-light/35 truncate max-w-[200px]">
                        <Filter size={10} className="text-gsrp-teal-light/25" /> {t.reason}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <ArrowUpRight size={14} className="text-gsrp-dark-border group-hover:text-gsrp-orange-light transition-all duration-200 flex-shrink-0 ml-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>
        ))}
      </div>

      <PaginationControls />
      <ConfirmModal />
    </div>
  );
}

export async function getServerSideProps(context) {
  const { getServerSession } = require('next-auth');
  const { authOptions } = require('../../lib/auth-options');
  const session = await getServerSession(context.req, context.res, authOptions);
  const { sort = 'latest' } = context.query;

  // Only check auth server-side — the actual transcript list is fetched
  // client-side via /api/transcripts/list to avoid the 210kB page data warning.
  if (!session) return { props: { transcripts: [], isAdmin: false, currentSort: sort } };

  return { props: { transcripts: [], isAdmin: false, currentSort: sort } };
}
