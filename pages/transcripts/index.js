import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import {
  FileText, ChevronRight, Briefcase, Search, Calendar, Layers, Clock, Hash,
  Filter, ArrowUpRight, ChevronLeft, AlertTriangle, X,
  Sun, Sunset, Users, FileCheck, BarChart3, Sparkles, ShieldCheck, RefreshCw
} from "lucide-react";

const BG_IMAGE = "https://i.imgur.com/QVVQSK2.png";
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
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${cfg.color} ${cfg.bg} border ${cfg.border}`}>
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

  useEffect(() => { setCurrentPage(1); }, [activeTab, query, date]);

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
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center">
        <div className="w-10 h-10 border-2 border-gsrp-orange/20 border-t-gsrp-orange rounded-full animate-spin mb-4" />
        <span className="text-gsrp-teal-light/50 font-mono text-[9px] uppercase tracking-[0.3em]">Loading Transcripts</span>
      </div>
    </div>
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
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">Ticket Records</h1>
            <p className="text-gsrp-teal-light/40 text-[10px] font-bold uppercase tracking-widest mt-1">
              {filteredTranscripts.length > 0
                ? `Showing ${startIndex + 1}–${totalShowing} of ${filteredTranscripts.length} records`
                : 'No records found'}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchTranscripts}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gsrp-dark-card/60 border border-gsrp-dark-border/50 text-gsrp-teal-light/70 text-[10px] font-bold uppercase tracking-wider hover:bg-gsrp-dark-surface/60 hover:border-gsrp-teal/30 hover:text-gsrp-teal-light transition-all duration-200 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              Refresh
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
                className="bg-transparent outline-none text-[10px] font-bold text-gsrp-teal-light/70"
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
                <div className="text-[9px] font-black text-gsrp-teal-light/40 uppercase tracking-widest">{s.label}</div>
              </div>
              <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
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
            <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-black ${activeTab === id ? 'bg-white/20 text-white' : 'bg-gsrp-dark-surface/50 text-gsrp-teal-light/30'}`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {paginatedTranscripts.length === 0 ? (
          <div className="py-24 text-center border border-dashed border-gsrp-dark-border/50 rounded-2xl animate-scale-in">
            <FileText className="mx-auto text-gsrp-dark-border mb-4" size={36} />
            <p className="text-gsrp-teal-light/30 text-[10px] font-black uppercase tracking-widest">No records match your filters</p>
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
          <Link
            href={`/transcript/${t.rawName}`}
            key={t.rawName}
            className="ticket-row group flex items-center justify-between bg-gsrp-dark-card/40 border border-gsrp-dark-border/50 hover:border-gsrp-orange/30 hover:bg-gsrp-dark-surface/60 p-4 rounded-xl transition-all duration-200 cursor-pointer"
            style={{ animationDelay: `${i * 0.03}s` }}
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
                <div className="flex items-center gap-4 mt-1">
                  <span className="flex items-center gap-1 text-[9px] font-bold text-gsrp-teal-light/30 uppercase tracking-widest">
                    <Calendar size={8} /> {t.date}
                  </span>
                  <span className="flex items-center gap-1 text-[9px] font-bold text-gsrp-teal-light/30 uppercase tracking-widest">
                    <Hash size={8} /> {t.ownerId}
                  </span>
                  {t.reason && t.reason !== 'NoReason' && (
                    <span className="hidden md:flex items-center gap-1 text-[9px] font-bold text-gsrp-teal-light/20 uppercase tracking-widest truncate max-w-[200px]">
                      <Filter size={8} /> {t.reason}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <ArrowUpRight size={14} className="text-gsrp-dark-border group-hover:text-gsrp-orange-light transition-all duration-200 flex-shrink-0 ml-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        ))}
      </div>

      <PaginationControls />
    </div>
  );
}

export async function getServerSideProps(context) {
  const { getSession } = require("next-auth/react");
  const session = await getSession(context);
  const { sort = 'latest' } = context.query;

  if (!session) return { props: { transcripts: [], isAdmin: false, currentSort: sort } };

  const currentUserId = String(session.user?.id || "");
  const adminIds = (process.env.ADMIN_USER_IDS || "").split(',').map(id => String(id).trim()).filter(Boolean);
  const isAdmin = adminIds.includes(currentUserId);

  const pool = (await import('../../lib/ticketdb')).default;
  const { accessibleTranscriptsQuery } = (await import('../../lib/ticketdb'));

  try {
    const { where, params } = await accessibleTranscriptsQuery(isAdmin, currentUserId, session.user?.roles || []);

    const [rows] = await pool.query(
      `SELECT id, type, owner_id, channel_name, close_reason,
              DATE_FORMAT(closed_at, '%Y-%m-%d') as date,
              DATE_FORMAT(closed_at, '%H:%i:%s') as time
       FROM transcripts
       WHERE ${where}
       ORDER BY closed_at ${sort === 'oldest' ? 'ASC' : 'DESC'}`,
      params
    );

    const files = rows.map(r => ({
      rawName: r.id,
      type: r.type || 'UNKNOWN',
      ownerId: r.owner_id || 'UNKNOWN',
      channelName: r.channel_name || 'Unknown',
      date: r.date || '1970-01-01',
      reason: r.close_reason || 'NoReason',
      time: r.time || '00:00:00',
    }));

    return { props: { transcripts: JSON.parse(JSON.stringify(files)), isAdmin, currentSort: sort } };
  } catch (e) {
    console.error('[Dashboard] DB fetch error:', e.message);
    return { props: { transcripts: [], isAdmin, currentSort: sort } };
  }
}
