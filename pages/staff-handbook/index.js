import { useState, useMemo, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Search, 
  ChevronRight, 
  Book, 
  Shield, 
  AlertCircle, 
  Clock, 
  MapPin, 
  UserPlus, 
  Clipboard, 
  Navigation, 
  Gavel,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info
} from 'lucide-react';
import { canAccessHandbook } from '../../lib/auth';
import { useRefreshedUser } from '../../lib/UserRefreshContext';
import AccessDenied from '../../components/auth/AccessDenied';
import { HANDBOOK_CONTENT } from '../../data/handbook';

export default function StaffHandbookPage() {
  const { data: session, status: sessionStatus } = useSession();
  const { session: refreshedSession, hasRefreshed, accessDenied } = useRefreshedUser();
  const effectiveSession = refreshedSession || session;
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChapterId, setActiveChapterId] = useState(HANDBOOK_CONTENT[0].id);

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      window.location.href = '/login';
    }
  }, [sessionStatus]);

  // Search logic
  const filteredContent = useMemo(() => {
    if (!searchQuery) return HANDBOOK_CONTENT;

    const query = searchQuery.toLowerCase();
    return HANDBOOK_CONTENT.map(chapter => {
      const filteredSections = chapter.sections.filter(section => 
        section.title.toLowerCase().includes(query) || 
        section.content.toLowerCase().includes(query)
      );

      if (filteredSections.length > 0 || chapter.title.toLowerCase().includes(query)) {
        return { ...chapter, sections: filteredSections.length > 0 ? filteredSections : chapter.sections };
      }
      return null;
    }).filter(Boolean);
  }, [searchQuery]);

  if (sessionStatus === 'loading' || !hasRefreshed) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gsrp-orange animate-pulse">Checking access...</div>
      </div>
    );
  }

  if (accessDenied) {
    return <AccessDenied roleId={accessDenied.roleId} />;
  }

  if (!session || !canAccessHandbook(effectiveSession)) {
    return <AccessDenied roleId="1372476380096237609" />;
  }

  const activeChapter = HANDBOOK_CONTENT.find(c => c.id === activeChapterId) || HANDBOOK_CONTENT[0];

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gsrp-dark-border/50 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Book className="text-gsrp-orange" size={32} />
            Staff Handbook
          </h1>
          <p className="text-gsrp-teal-light/40 text-sm mt-1">Official GSRP operational guidelines & protocols</p>
        </div>

        <div className="relative group w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gsrp-teal-light/30 group-focus-within:text-gsrp-orange transition-colors" size={18} />
          <input
            type="text"
            placeholder="Search guidelines, rules, ranks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gsrp-dark-card/50 border border-gsrp-dark-border/50 rounded-xl py-3 pl-12 pr-4 text-sm text-white placeholder-gsrp-teal-light/20 focus:outline-none focus:border-gsrp-orange/50 focus:ring-1 focus:ring-gsrp-orange/20 transition-all backdrop-blur-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-3 space-y-2 sticky top-[100px]">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-gsrp-teal-light/30 px-3 mb-4">Chapters</h3>
          <div className="flex flex-col gap-1">
            {HANDBOOK_CONTENT.map((chapter) => (
              <button
                key={chapter.id}
                onClick={() => {
                  setActiveChapterId(chapter.id);
                  setSearchQuery(''); // Clear search when switching chapters for better UX
                }}
                className={`flex items-center justify-between w-full text-left px-4 py-3 rounded-xl transition-all duration-200 group ${
                  activeChapterId === chapter.id && !searchQuery
                    ? 'bg-gsrp-orange/10 text-gsrp-orange border border-gsrp-orange/20'
                    : 'text-gsrp-teal-light/50 hover:bg-white/5 hover:text-white border border-transparent'
                }`}
              >
                <span className="text-sm font-bold truncate pr-2">{chapter.title.split(': ')[1] || chapter.title}</span>
                <ChevronRight size={16} className={`transition-transform duration-200 ${activeChapterId === chapter.id ? 'translate-x-1 opacity-100' : 'opacity-0'}`} />
              </button>
            ))}
          </div>
          
          <div className="mt-8 p-4 rounded-2xl bg-gsrp-dark-surface/30 border border-gsrp-dark-border/30">
            <div className="flex items-center gap-2 mb-2">
              <Shield size={14} className="text-gsrp-teal" />
              <span className="text-xs font-bold text-gsrp-teal uppercase tracking-tight">Authorized Access</span>
            </div>
            <p className="text-[10px] leading-relaxed text-gsrp-teal-light/30 italic">
              Sharing this documentation with unauthorized personnel results in immediate blacklisted termination.
            </p>
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-9 space-y-8 animate-scale-in">
          {searchQuery ? (
            <div className="space-y-12">
              {filteredContent.length > 0 ? (
                filteredContent.map(chapter => (
                  <div key={chapter.id} className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="h-[1px] flex-1 bg-gsrp-dark-border/30"></div>
                      <h2 className="text-gsrp-orange font-black uppercase tracking-[0.2em] text-xs px-2">{chapter.title}</h2>
                      <div className="h-[1px] flex-1 bg-gsrp-dark-border/30"></div>
                    </div>
                    {chapter.sections.map(section => (
                      <SearchResultSection key={section.id} section={section} />
                    ))}
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gsrp-dark-surface border border-gsrp-dark-border flex items-center justify-center mb-4">
                    <Search className="text-gsrp-teal-light/20" size={32} />
                  </div>
                  <h3 className="text-white font-bold text-lg">No results found</h3>
                  <p className="text-gsrp-teal-light/30 text-sm mt-1 max-w-xs">Double check your spelling or try searching for a different keyword.</p>
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="mt-6 text-gsrp-orange text-sm font-bold hover:underline"
                  >
                    Clear search filter
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-10 animate-fade-up">
              <div className="space-y-2">
                <span className="text-gsrp-orange font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                   {activeChapter.id.toUpperCase()}
                </span>
                <h2 className="text-4xl font-black text-white leading-tight">{activeChapter.title.split(': ')[1] || activeChapter.title}</h2>
                <div className="w-20 h-1.5 bg-gsrp-orange rounded-full mt-4"></div>
              </div>

              <div className="grid gap-6">
                {activeChapter.sections.map((section, idx) => (
                  <HandbookSectionCard key={section.id} section={section} index={idx} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HandbookSectionCard({ section, index }) {
  return (
    <div 
      className="card-glass rounded-3xl p-8 border-l-4 border-l-gsrp-orange/50 hover:border-l-gsrp-orange transition-all duration-300 group"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {section.title && section.title !== section.id && (
        <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gsrp-dark-surface flex items-center justify-center text-[10px] text-gsrp-orange font-black border border-gsrp-dark-border group-hover:bg-gsrp-orange group-hover:text-white transition-colors">
            {section.id}
          </div>
          {section.title}
        </h3>
      )}

      <div className="text-gsrp-teal-light/70 leading-relaxed text-sm whitespace-pre-line font-medium max-w-none">
        {formatContent(section.content)}
      </div>
    </div>
  );
}

function SearchResultSection({ section }) {
  return (
    <div className="bg-gsrp-dark-card/30 border border-gsrp-dark-border/50 rounded-2xl p-6 hover:bg-gsrp-dark-card/50 transition-colors">
      <h3 className="text-white font-bold flex items-center gap-2 mb-4">
        <span className="text-gsrp-orange text-[10px] font-black">{section.id}</span>
        {section.title}
      </h3>
      <div className="text-xs text-gsrp-teal-light/50 leading-relaxed max-h-32 overflow-hidden relative">
        {formatContent(section.content)}
        <div className="absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-gsrp-dark/50 to-transparent"></div>
      </div>
    </div>
  );
}

function formatContent(content) {
  // Check if content is a table
  if (content.includes('|') && content.includes('\n| :---')) {
    const lines = content.trim().split('\n');
    const headers = lines[0].split('|').filter(Boolean).map(h => h.trim());
    const data = lines.slice(2).map(line => line.split('|').filter(Boolean).map(c => c.trim()));

    return (
      <div className="overflow-x-auto my-6 rounded-xl border border-gsrp-dark-border">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gsrp-dark-surface">
              {headers.map((h, i) => (
                <th key={i} className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-gsrp-orange border-b border-gsrp-dark-border">
                  {h.replace(/\*\*/g, '')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="hover:bg-white/5 border-b border-gsrp-dark-border/30 last:border-0 transition-colors">
                {row.map((cell, j) => (
                  <td key={j} className="px-4 py-3 text-xs align-top">
                    {cell.startsWith('**') ? <strong className="text-white font-bold">{cell.replace(/\*\*/g, '')}</strong> : cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Handle lists with bullets
  if (content.includes('\n- ')) {
    const parts = content.split('\n- ');
    const intro = parts[0];
    const items = parts.slice(1);

    return (
      <>
        {intro && <p className="mb-4">{intro}</p>}
        <ul className="grid gap-3 list-none">
          {items.map((item, i) => (
            <li key={i} className="flex gap-3">
              <CheckCircle2 size={16} className="text-gsrp-teal-light shrink-0 mt-0.5" />
              <span>{formatInlineMarkdown(item)}</span>
            </li>
          ))}
        </ul>
      </>
    );
  }

  return formatInlineMarkdown(content);
}

function formatInlineMarkdown(text) {
  if (!text) return '';
  
  // Highlight bold items
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-white font-extrabold">{part.replace(/\*\*/g, '')}</strong>;
    }
    return part;
  });
}
