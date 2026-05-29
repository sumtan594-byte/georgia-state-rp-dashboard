import { useSession } from 'next-auth/react';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { Loader2, ArrowLeft, CheckCircle2, Circle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import LoginScreen from '../../components/auth/LoginScreen';
import { useRefreshedUser } from '../../lib/UserRefreshContext';
import AccessDenied from '../../components/auth/AccessDenied';
import { HANDBOOK_CONTENT } from '../../data/handbook';

const ALL_SECTIONS = HANDBOOK_CONTENT.flatMap(ch => ch.sections);

function parseContent(text) {
  const lines = text.split('\n');
  const blocks = [];
  let current = [];
  let inTable = false;

  for (const line of lines) {
    const isTable = line.trim().startsWith('|') && line.trim().endsWith('|') && (line.match(/\|/g) || []).length >= 3;
    if (isTable) {
      if (!inTable && current.length) {
        blocks.push({ type: 'text', content: current.join('\n') });
        current = [];
      }
      inTable = true;
      current.push(line);
    } else {
      if (inTable && current.length) {
        blocks.push({ type: 'table', content: [...current] });
        current = [];
        inTable = false;
      }
      current.push(line);
    }
  }
  if (current.length) {
    blocks.push({ type: inTable ? 'table' : 'text', content: current });
  }

  return blocks.map((block, i) => {
    if (block.type === 'text') {
      const content = Array.isArray(block.content) ? block.content.join('\n') : block.content;
      const allLines = content.split('\n');
      const isBulletList = allLines.filter(l => l.trim().length > 0).every(l => l.trim().startsWith('- ')) && allLines.some(l => l.trim().startsWith('- '));
      if (isBulletList) {
        return (
          <ul key={i} className="space-y-3 text-gsrp-teal-light/60 text-sm">
            {allLines.filter(l => l.trim()).map((line, j) => {
              const text = line.trim().replace(/^- /, '');
              return (
                <li key={j} className="flex items-start gap-2">
                  <span className="text-gsrp-orange shrink-0 mt-1">•</span>
                  <span className="leading-relaxed">{text}</span>
                </li>
              );
            })}
          </ul>
        );
      }
      return (
        <div key={i} className="whitespace-pre-wrap text-gsrp-teal-light/60 text-sm leading-relaxed">
          {content.trim() ? content : '\u00A0'}
        </div>
      );
    }

    const rows = block.content.filter(l => l.trim().startsWith('|'));
    if (rows.length < 2) return null;
    const headerCells = rows[0].split('|').filter(c => c.trim()).map(c => c.trim().replace(/\*\*/g, ''));
    const dataRows = rows.slice(2);

    return (
      <div key={i} className="overflow-x-auto my-4">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-gsrp-dark-border/50">
              {headerCells.map((h, j) => (
                <th key={j} className="text-left py-2 pr-3 text-gsrp-teal-light/40 font-mono uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row, j) => {
              const cells = row.split('|').filter(c => c.trim()).map(c => c.trim().replace(/\*\*/g, ''));
              return (
                <tr key={j} className="border-b border-gsrp-dark-border/30 hover:bg-white/[0.02]">
                  {cells.map((cell, k) => (
                    <td key={k} className={`py-2 pr-3 ${k === 0 ? 'text-gsrp-teal-light font-mono' : 'text-gsrp-teal-light/60'}`}>{cell}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  });
}

export default function HandbookPage() {
  const { data: session, status } = useSession();
  const { session: refreshedSession, hasRefreshed, accessDenied } = useRefreshedUser();
  const effectiveSession = refreshedSession || session;
  const router = useRouter();
  const [activeSection, setActiveSection] = useState(ALL_SECTIONS[0]?.id || '');
  const [progress, setProgress] = useState({ completedSections: [], handbookCompleted: false });
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [showCompletion, setShowCompletion] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const bottomBarRef = useRef(null);

  const pageEntryTime = useRef(Date.now());
  const checkTimestamps = useRef({});

  useEffect(() => {
    if (status === 'unauthenticated') return;
    if (!hasRefreshed || accessDenied) return;
    async function fetchProgress() {
      try {
        const res = await fetch('/api/training/progress');
        const data = await res.json();
        setProgress(data);
        if (data.completedSections?.length) {
          for (const id of data.completedSections) {
            if (!checkTimestamps.current[id]) {
              checkTimestamps.current[id] = Date.now();
            }
          }
        }
      } catch (e) {
        console.error('Failed to fetch progress', e);
      } finally {
        setLoadingProgress(false);
      }
    }
    if (effectiveSession) fetchProgress();
  }, [status, hasRefreshed, accessDenied, effectiveSession]);

  const toggleSection = async (sectionId) => {
    if (!checkTimestamps.current[sectionId]) {
      checkTimestamps.current[sectionId] = Date.now();
    }
    try {
      const res = await fetch('/api/training/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionId })
      });
      const data = await res.json();
      setProgress(data);
    } catch (e) {
      console.error('Failed to update progress', e);
    }
  };

  useEffect(() => {
    if (progress.handbookCompleted && !loadingProgress) {
      setShowCompletion(true);
      setTimeout(() => {
        bottomBarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [progress.handbookCompleted, loadingProgress]);

  useEffect(() => {
    const hash = router.asPath.split('#')[1];
    if (hash && ALL_SECTIONS.find(s => s.id === hash)) {
      setActiveSection(hash);
      setTimeout(() => {
        document.getElementById('hb-' + hash)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [router.asPath]);

  useEffect(() => {
    const handleScroll = () => {
      const sectionEls = ALL_SECTIONS.map(s => document.getElementById('hb-' + s.id)).filter(Boolean);
      let active = null;
      sectionEls.forEach(el => {
        if (el.getBoundingClientRect().top < 120) active = el.id.replace('hb-', '');
      });
      if (active) setActiveSection(active);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleGoToQuiz = () => {
    const totalTime = (Date.now() - pageEntryTime.current) / 1000;
    if (totalTime < 75) {
      setWarningMessage('Actually read it, not just pressing the read button. :)');
      setShowWarning(true);
      return;
    }
    router.push('/training');
  };

  const handleGoBackAndRead = () => {
    setProgress({ completedSections: [], handbookCompleted: false });
    setShowCompletion(false);
    setShowWarning(false);
    pageEntryTime.current = Date.now();
    checkTimestamps.current = {};
    fetch('/api/training/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resetAll: true })
    }).catch(e => console.error('Failed to reset progress', e));
  };

  if (status === 'loading' || !hasRefreshed) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center">
          <Loader2 className="w-8 h-8 text-gsrp-orange animate-spin mb-4" />
          <span className="text-gsrp-teal-light/40 font-mono text-[9px] uppercase tracking-[0.3em]">Loading Handbook</span>
        </div>
      </div>
    );
  }

  if (!session) return <LoginScreen />;
  if (accessDenied) return <AccessDenied roleId={accessDenied.roleId} />;
  if (!effectiveSession?.user?.roles?.includes('1372476380096237609') && !effectiveSession?.user?.isAdmin) {
    return <AccessDenied roleId="1372476380096237609" />;
  }

  const mainContent = (
    <div className="max-w-6xl mx-auto animate-fade-in-up">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/training" className="p-2 rounded-lg hover:bg-gsrp-dark-surface/60 text-gsrp-teal-light/40 hover:text-white transition-colors cursor-pointer">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-white">Staff Handbook</h1>
          <p className="text-gsrp-teal-light/40 text-[10px] uppercase tracking-widest">GSRP Staff Standards & Development</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="card-glass rounded-2xl p-4 sticky top-20">
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-[10px] font-black text-gsrp-teal-light/40 uppercase tracking-widest">Progress</h3>
                <span className="text-[10px] font-mono text-gsrp-orange font-bold">
                  {Math.round((progress.completedSections.length / ALL_SECTIONS.length) * 100)}%
                </span>
              </div>
              <div className="h-1 w-full bg-gsrp-dark-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-gsrp-orange transition-all duration-500"
                  style={{ width: `${(progress.completedSections.length / ALL_SECTIONS.length) * 100}%` }}
                />
              </div>
            </div>

            {HANDBOOK_CONTENT.map(chapter => (
              <div key={chapter.id} className="mb-3">
                <h4 className="text-[10px] font-black text-gsrp-teal-light/30 uppercase tracking-widest mb-1.5 px-3">
                  {chapter.title}
                </h4>
                <nav className="space-y-0.5">
                  {chapter.sections.map(s => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setActiveSection(s.id);
                        router.push(router.asPath.split('#')[0] + '#' + s.id, undefined, { shallow: true });
                        document.getElementById('hb-' + s.id)?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-all duration-200 cursor-pointer flex items-center gap-2 ${
                        activeSection === s.id
                          ? 'bg-gsrp-teal/10 text-gsrp-teal-light border border-gsrp-teal/20'
                          : 'text-gsrp-teal-light/40 hover:text-white hover:bg-gsrp-dark-surface/40'
                      }`}
                    >
                      {progress.completedSections.includes(s.id) ? (
                        <CheckCircle2 size={10} className="text-gsrp-orange shrink-0" />
                      ) : (
                        <Circle size={10} className="text-gsrp-teal-light/20 shrink-0" />
                      )}
                      <span className="truncate">{s.title}</span>
                    </button>
                  ))}
                </nav>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3 space-y-8">
          {ALL_SECTIONS.map(s => {
            const chapter = HANDBOOK_CONTENT.find(ch => ch.sections.some(sec => sec.id === s.id));
            const chapterTitle = chapter?.title || '';
            return (
              <div key={s.id} id={'hb-' + s.id} className="card-glass rounded-2xl p-6 scroll-mt-24 relative group">
                <div className="absolute top-4 right-4 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  {(effectiveSession?.user?.roles?.includes('1372476380096237609') || effectiveSession?.user?.isAdmin) && (
                    <button
                      onClick={() => toggleSection(s.id)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 ${
                        progress.completedSections.includes(s.id)
                          ? 'bg-gsrp-teal/20 text-gsrp-teal-light border border-gsrp-teal/30'
                          : 'bg-gsrp-orange/20 text-gsrp-orange border border-gsrp-orange/30 hover:bg-gsrp-orange/30'
                      }`}
                    >
                      {progress.completedSections.includes(s.id) ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                      {progress.completedSections.includes(s.id) ? 'Completed' : 'Mark as Read'}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      const url = window.location.origin + '/training/handbook#' + s.id;
                      navigator.clipboard.writeText(url);
                    }}
                    className="text-xs text-gsrp-teal-light/40 hover:text-gsrp-teal-light px-2 py-1 rounded bg-gsrp-dark-surface/50 border border-gsrp-dark-border/50"
                  >
                    Copy Link
                  </button>
                </div>
                <div className="text-[10px] font-black text-gsrp-teal-light/30 uppercase tracking-widest mb-1">{chapterTitle}</div>
                <h2 className="text-white font-bold text-lg mb-4 pb-3 border-b border-gsrp-dark-border/50">{s.title}</h2>
                <div className="text-gsrp-teal-light/60 text-sm leading-relaxed">{parseContent(s.content)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {showCompletion && (
        <div ref={bottomBarRef} className="mt-6 p-4 bg-gsrp-teal/10 border border-gsrp-teal/30 rounded-2xl flex items-center justify-between animate-fade-in-up">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={20} className="text-gsrp-teal-light" />
            <div>
              <p className="text-white font-bold text-sm">All sections completed!</p>
              <p className="text-gsrp-teal-light/60 text-xs">You can now do the SSD quiz</p>
            </div>
          </div>
          <button
            onClick={handleGoToQuiz}
            className="px-5 py-2 bg-gsrp-orange text-white text-sm font-bold rounded-lg hover:bg-gsrp-orange/90 transition-all"
          >
            Go to Quiz →
          </button>
        </div>
      )}

    </div>
  );

  return (
    <>
      {mainContent}
      {showWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="card-glass rounded-2xl p-8 max-w-md mx-4 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gsrp-gold/20 flex items-center justify-center">
              <AlertTriangle size={32} className="text-gsrp-gold" />
            </div>
            <h2 className="text-white font-bold text-xl mb-3">Hold up!</h2>
            <p className="text-gsrp-teal-light/60 text-sm mb-6">{warningMessage}</p>
            <button
              onClick={handleGoBackAndRead}
              className="px-6 py-2.5 bg-gsrp-orange text-white text-sm font-bold rounded-lg hover:bg-gsrp-orange/90 transition-all"
            >
              Go back and read
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export async function getServerSideProps(context) {
  const { getServerSession } = require('next-auth');
  const { authOptions } = require('../../lib/auth-options');
  const session = await getServerSession(context.req, context.res, authOptions);
  return { props: {} };
}
