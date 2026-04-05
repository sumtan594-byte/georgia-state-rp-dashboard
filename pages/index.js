import { useSession, signIn, signOut } from "next-auth/react";
import { Octokit } from "@octokit/rest";
import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/router";
import {
  FileText, LogOut, ChevronRight, Inbox, ShieldCheck,
  Briefcase, Search, Calendar, Layers, Clock, Hash,
  Filter, ArrowUpRight, ChevronLeft, AlertTriangle, X,
  Sun, Sunset, Users, FileCheck, BarChart3, Sparkles
} from "lucide-react";

const LOGO = "https://i.imgur.com/70GfmYd.gif";
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

export default function Dashboard({ transcripts, isAdmin, currentSort }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("ALL");
  const [query, setQuery] = useState("");
  const [date, setDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => { setCurrentPage(1); }, [activeTab, query, date]);

  const handleSortChange = (newSort) => {
    router.push({ pathname: router.pathname, query: { ...router.query, sort: newSort } });
  };

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

  if (status === "loading") return (
    <div className="h-screen flex flex-col items-center justify-center bg-gsrp-dark relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-gsrp-dark via-gsrp-dark-card to-gsrp-dark-surface" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gsrp-orange/5 rounded-full blur-3xl animate-glow-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gsrp-teal/5 rounded-full blur-3xl animate-glow-pulse" style={{ animationDelay: '1s' }} />
      </div>
      <div className="relative flex flex-col items-center">
        <div className="relative w-16 h-16 mb-6 animate-float">
          <div className="absolute inset-0 bg-gradient-to-r from-gsrp-orange/30 to-gsrp-teal/30 rounded-2xl blur-xl" />
          <img src={LOGO} alt="GSRP" className="relative w-full h-full rounded-2xl border border-white/10 object-cover" />
        </div>
        <div className="w-10 h-10 border-2 border-gsrp-orange/20 border-t-gsrp-orange rounded-full animate-spin mb-4" />
        <span className="text-gsrp-teal-light/50 font-mono text-[9px] uppercase tracking-[0.3em]">Authenticating</span>
      </div>
    </div>
  );

  if (!session) return (
    <div className="h-screen flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0">
        <img src={BG_IMAGE} alt="" className="w-full h-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-gsrp-dark/80 via-gsrp-dark/90 to-gsrp-dark" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gsrp-orange/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[300px] bg-gsrp-teal/10 rounded-full blur-[100px]" />
      </div>
      <div className="relative card-glass rounded-[2rem] w-full max-w-sm p-10 shadow-2xl shadow-black/60 text-center animate-scale-in">
        <div className="relative w-20 h-20 mx-auto mb-8 animate-float">
          <div className="absolute inset-0 bg-gradient-to-r from-gsrp-orange/30 to-gsrp-teal/30 rounded-2xl blur-xl" />
          <img src={LOGO} alt="GSRP" className="relative w-full h-full rounded-2xl border border-white/10 object-cover" />
        </div>
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sun size={12} className="text-gsrp-gold" />
          <span className="text-[9px] font-black text-gsrp-orange-light uppercase tracking-[0.25em]">Georgia State Roleplay</span>
          <Sunset size={12} className="text-gsrp-orange" />
        </div>
        <h1 className="text-2xl font-black text-white mb-2 tracking-tight">Support Portal</h1>
        <p className="text-gsrp-teal-light/40 text-[10px] uppercase tracking-widest mb-8 font-medium">Authorized Personnel Only</p>
        <button
          onClick={() => signIn('discord')}
          className="w-full bg-gradient-to-r from-gsrp-orange to-gsrp-orange-light hover:from-gsrp-orange-light hover:to-gsrp-gold text-white py-3.5 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-3 shadow-lg shadow-gsrp-orange/20 hover:shadow-gsrp-orange/30 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          <svg width="20" height="20" viewBox="0 0 71 55" fill="currentColor"><path d="M60.1 4.9A58.5 58.5 0 0 0 45.6.7a.2.2 0 0 0-.2.1c-.6 1.1-1.3 2.6-1.8 3.7a54 54 0 0 0-16.4 0c-.5-1.1-1.2-2.6-1.8-3.7a.2.2 0 0 0-.2-.1A58.3 58.3 0 0 0 10.8 4.9a.2.2 0 0 0-.1.1C1.6 19 -1 32.7.3 46.2c0 .1.1.2.2.2a58.8 58.8 0 0 0 17.7 9 .2.2 0 0 0 .3-.1 42 42 0 0 0 3.6-5.9.2.2 0 0 0-.1-.3 38.7 38.7 0 0 1-5.5-2.6.2.2 0 0 1 0-.4c.4-.3.7-.6 1.1-.9a.2.2 0 0 1 .2 0c11.5 5.3 24 5.3 35.4 0a.2.2 0 0 1 .2 0l1.1.9c.1.1.1.3 0 .4a36 36 0 0 1-5.6 2.6.2.2 0 0 0-.1.3 47.1 47.1 0 0 0 3.6 5.9c.1.1.2.1.3.1a58.6 58.6 0 0 0 17.8-9c.1 0 .2-.1.2-.2 1.5-15.7-2.5-29.4-10.5-41.5a.2.2 0 0 0-.1 0ZM23.7 37.9c-3.5 0-6.4-3.2-6.4-7.2s2.9-7.2 6.4-7.2c3.6 0 6.5 3.3 6.4 7.2 0 4-2.8 7.2-6.4 7.2Zm23.7 0c-3.6 0-6.5-3.2-6.5-7.2s2.9-7.2 6.5-7.2c3.5 0 6.4 3.3 6.4 7.2 0 4-2.9 7.2-6.4 7.2Z" /></svg>
          Sign in with Discord
        </button>
      </div>
    </div>
  );

  const tabs = [
    { id: "ALL", label: "All", icon: Layers, count: stats.total },
    { id: "GENERAL", label: "General", icon: FileCheck, count: stats.GENERAL || 0 },
    { id: "DEPARTMENTAL", label: "Department", icon: Briefcase, count: stats.DEPARTMENTAL || 0 },
    { id: "MANAGEMENT", label: "Management", icon: ShieldCheck, count: stats.MANAGEMENT || 0 },
    ...(isAdmin ? [{ id: "DIRECTIVE", label: "Directive", icon: AlertTriangle, count: stats.DIRECTIVE || 0 }] : []),
  ];

  const totalShowing = Math.min(startIndex + TICKETS_PER_PAGE, filteredTranscripts.length);

  return (
    <div className="min-h-screen bg-gsrp-dark text-gray-300 relative">
      <div className="fixed inset-0">
        <img src={BG_IMAGE} alt="" className="w-full h-full object-cover opacity-[0.07]" />
        <div className="absolute inset-0 bg-gradient-to-b from-gsrp-dark/95 via-gsrp-dark/98 to-gsrp-dark" />
      </div>

      <nav className="sticky top-0 z-50 border-b border-gsrp-dark-border/50 bg-gsrp-dark/80 backdrop-blur-xl animate-fade-in-down">
        <div className="max-w-6xl mx-auto px-6 lg:px-10 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-gsrp-orange/30 to-gsrp-teal/30 rounded-xl blur-sm" />
              <img src={LOGO} alt="GSRP" className="relative w-9 h-9 rounded-xl border border-white/10 object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <Sparkles size={8} className="text-gsrp-gold" />
                <span className="text-[8px] font-black text-gsrp-orange-light uppercase tracking-[0.25em]">Georgia State Roleplay</span>
              </div>
              <div className="text-sm font-black text-white tracking-tight leading-none">Support Transcripts</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className={`text-[8px] font-black uppercase tracking-widest ${isAdmin ? 'text-gsrp-gold' : 'text-gsrp-teal-light'}`}>
                {isAdmin ? 'Administrator' : 'Verified'}
              </span>
              <span className="text-xs text-white font-semibold leading-none mt-0.5">{session.user.name}</span>
            </div>
            <div className="w-px h-6 bg-gsrp-dark-border/50" />
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 text-gray-500 hover:text-gsrp-sunset transition-colors text-[10px] font-bold uppercase tracking-widest cursor-pointer"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="relative max-w-6xl mx-auto px-6 lg:px-10 pt-12 pb-24">
        <div className="mb-10 animate-fade-in-up">
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
              <div className="flex items-center bg-gsrp-dark-card/60 border border-gsrp-dark-border/50 rounded-xl px-3.5 py-2.5 gap-2">
                <Clock size={12} className="text-gsrp-teal-light/40 flex-shrink-0" />
                <select
                  value={currentSort}
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
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

        <div className="relative mb-5 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
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

        <div className="flex items-center gap-1 mb-8 bg-gsrp-dark-card/40 border border-gsrp-dark-border/50 p-1 rounded-xl overflow-x-auto animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
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
      </main>
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

  const octokit = new Octokit({ auth: process.env.GITHUB_ACCESS_TOKEN });

  try {
    const { data } = await octokit.repos.getContent({
      owner: process.env.GITHUB_OWNER,
      repo: process.env.GITHUB_REPO,
      path: "transcripts"
    });

    const files = Array.isArray(data)
      ? data
          .filter(f => f.name.endsWith('.html'))
          .map(f => {
            const rawName = f.name.replace('.html', '');
            const p = rawName.split('__');
            
            if (p.length < 2) return null;

            return {
              rawName,
              type: p[0] || 'UNKNOWN',
              ownerId: p[1] || 'UNKNOWN',
              channelName: p[2] || 'Unknown',
              date: p[3] || '1970-01-01',
              reason: p[4] || 'NoReason',
              time: p[5] || '00-00-00',
            };
          })
          .filter(f => {
            if (!f) return false;
            if (!isAdmin && String(f.ownerId) !== currentUserId) return false;
            return true;
          })
          .sort((a, b) => {
            const safeTimeA = typeof a.time === 'string' ? a.time.replace(/-/g, ':') : '00:00:00';
            const safeTimeB = typeof b.time === 'string' ? b.time.replace(/-/g, ':') : '00:00:00';
            
            const tsA = new Date(`${a.date}T${safeTimeA}`).getTime() || 0;
            const tsB = new Date(`${b.date}T${safeTimeB}`).getTime() || 0;
            
            return sort === 'oldest' ? tsA - tsB : tsB - tsA;
          })
      : [];

    return { props: { transcripts: JSON.parse(JSON.stringify(files)), isAdmin, currentSort: sort } };
  } catch (e) {
    console.error('[Dashboard] GitHub fetch error:', e.message);
    return { props: { transcripts: [], isAdmin, currentSort: sort } };
  }
}
