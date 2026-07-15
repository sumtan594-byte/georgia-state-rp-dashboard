import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Loader2, Users, Search, Filter, ChevronDown, ChevronUp, Clock, RotateCcw } from 'lucide-react';
import LoginScreen from '../../components/auth/LoginScreen';
import { useRefreshedUser } from '../../lib/UserRefreshContext';
import AccessDenied from '../../components/auth/AccessDenied';
import { PageSkeleton } from '../../components/SkeletonLoader';

function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatCooldown(cooldownUntil) {
  if (!cooldownUntil) return null;
  const until = new Date(cooldownUntil);
  const now = new Date();
  if (until <= now) return null;
  const mins = Math.max(0, Math.ceil((until - now) / 60000));
  const hours = Math.floor(mins / 60);
  const minsLeft = mins % 60;
  if (hours > 0) return `${hours}h ${minsLeft}m`;
  return `${minsLeft}m`;
}

export default function AttemptsPage() {
  const { data: session, status } = useSession();
  const { session: refreshedSession, hasRefreshed, accessDenied } = useRefreshedUser();
  const effectiveSession = refreshedSession || session;
  const router = useRouter();
  const [tab, setTab] = useState('quiz');
  const [attempts, setAttempts] = useState([]);
  const [ridealongAttempts, setRidealongAttempts] = useState([]);
  const [userData, setUserData] = useState({});
  const [ridealongUserData, setRidealongUserData] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [resultFilter, setResultFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [expanded, setExpanded] = useState(null);
  const [revoking, setRevoking] = useState(null);

  useEffect(() => {
    if (status === 'unauthenticated') return;
    if (!hasRefreshed || accessDenied) return;

    Promise.all([
      fetch('/api/training/attempts?userData=true').then(r => r.json()),
      fetch('/api/training/ridealong/attempts').then(r => r.json()).catch(() => ({ attempts: [], users: {} })),
    ]).then(([quizData, ridealongData]) => {
      if (Array.isArray(quizData)) {
        setAttempts(quizData);
      } else if (quizData.attempts) {
        setAttempts(quizData.attempts);
        setUserData(quizData.users || {});
      }
      setRidealongAttempts(ridealongData.attempts || []);
      setRidealongUserData(ridealongData.users || {});
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [status, hasRefreshed, accessDenied]);

  const handleRevoke = async (userId) => {
    if (!confirm('Revoke cooldown for this user? They will be able to retake immediately.')) return;
    setRevoking(userId);
    try {
      const res = await fetch('/api/training/attempts', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': effectiveSession.user.id,
          'x-user-roles': JSON.stringify(effectiveSession.user.roles || []),
        },
        body: JSON.stringify({ action: 'revoke', userId }),
      });
      if (res.ok) {
        setUserData(prev => ({
          ...prev,
          [userId]: { ...prev[userId], cooldownUntil: null },
        }));
      }
    } catch {}
    setRevoking(null);
  };

  if (status === 'loading' || !hasRefreshed || loading) {
    return <PageSkeleton variant="table" rows={8} />;
  }

  if (!session) return <LoginScreen />;

  if (accessDenied) {
    return <AccessDenied roleId={accessDenied.roleId} />;
  }

  let filtered = [...attempts];
  let ridealongFiltered = [...ridealongAttempts];
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(a =>
      (a.username || '').toLowerCase().includes(q) ||
      (a.globalName || '').toLowerCase().includes(q) ||
      (a.userId || '').includes(q)
    );
    ridealongFiltered = ridealongFiltered.filter(a =>
      (a.username || '').toLowerCase().includes(q) ||
      (a.globalName || '').toLowerCase().includes(q) ||
      (a.userId || '').includes(q)
    );
  }
  if (resultFilter === 'pass') {
    filtered = filtered.filter(a => a.pass);
    ridealongFiltered = ridealongFiltered.filter(a => a.pass);
  }
  if (resultFilter === 'fail') {
    filtered = filtered.filter(a => !a.pass);
    ridealongFiltered = ridealongFiltered.filter(a => !a.pass);
  }

  if (sort === 'newest') {
    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    ridealongFiltered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }
  if (sort === 'oldest') {
    filtered.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    ridealongFiltered.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }
  if (sort === 'score-high') {
    filtered.sort((a, b) => b.pct - a.pct);
    ridealongFiltered.sort((a, b) => b.pct - a.pct);
  }
  if (sort === 'score-low') {
    filtered.sort((a, b) => a.pct - b.pct);
    ridealongFiltered.sort((a, b) => a.pct - b.pct);
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Training Attempts</h1>
          <p className="text-gsrp-teal-light/40 text-[10px] uppercase tracking-widest mt-1">
            {tab === 'quiz'
              ? `${filtered.length} quiz attempt${filtered.length !== 1 ? 's' : ''}`
              : `${ridealongFiltered.length} ridealong session${ridealongFiltered.length !== 1 ? 's' : ''}`
            }
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gsrp-dark-surface/50 rounded-xl p-1 w-fit">
        <button
          onClick={() => { setTab('quiz'); setExpanded(null); }}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            tab === 'quiz'
              ? 'bg-gsrp-orange text-white'
              : 'text-gsrp-teal-light/40 hover:text-gsrp-teal-light/60'
          }`}
        >
          Quiz Attempts
        </button>
        <button
          onClick={() => { setTab('ridealong'); setExpanded(null); }}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            tab === 'ridealong'
              ? 'bg-gsrp-orange text-white'
              : 'text-gsrp-teal-light/40 hover:text-gsrp-teal-light/60'
          }`}
        >
          Ridealong Sessions
        </button>
      </div>

      {tab === 'quiz' ? (
        <>
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gsrp-teal-light/30" size={14} />
              <input
                type="text"
                placeholder="Search by username or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-gsrp-dark-card/60 border border-gsrp-dark-border/50 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-gsrp-orange/40 placeholder:text-gsrp-teal-light/20"
              />
            </div>
            <select
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value)}
              className="bg-gsrp-dark-card/60 border border-gsrp-dark-border/50 rounded-xl px-4 py-2.5 text-sm text-gsrp-teal-light/70 outline-none cursor-pointer"
            >
              <option value="all">All Results</option>
              <option value="pass">Pass Only</option>
              <option value="fail">Fail Only</option>
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="bg-gsrp-dark-card/60 border border-gsrp-dark-border/50 rounded-xl px-4 py-2.5 text-sm text-gsrp-teal-light/70 outline-none cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="score-high">Score High → Low</option>
              <option value="score-low">Score Low → High</option>
            </select>
          </div>

          <div className="card-glass rounded-2xl overflow-hidden">
            {filtered.length === 0 ? (
              <div className="py-16 text-center">
                <Users className="mx-auto text-gsrp-dark-border mb-4" size={32} />
                <p className="text-gsrp-teal-light/30 text-xs">No attempts found</p>
              </div>
            ) : (
              <div className="divide-y divide-gsrp-dark-border/50">
                {filtered.map((a, i) => {
                  const avUrl = a.avatar
                    ? `https://cdn.discordapp.com/avatars/${a.userId}/${a.avatar}.png?size=32`
                    : `https://cdn.discordapp.com/embed/avatars/0.png`;
                  const dateStr = a.timestamp ? new Date(a.timestamp).toLocaleString() : '-';
                  return (
                    <div key={a.attemptId || i}>
                      <button
                        onClick={() => setExpanded(expanded === i ? null : i)}
                        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors cursor-pointer text-left"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <img src={avUrl} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-white text-sm font-medium truncate">{a.globalName || a.username}</p>
                            <p className="text-[10px] text-gsrp-teal-light/30 font-mono">{a.userId}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                          {(() => {
                            const ud = userData[a.userId] || {};
                            const cooldown = formatCooldown(ud.cooldownUntil);
                            return (
                              <>
                                {cooldown && (
                                  <div className="flex items-center gap-1.5 text-orange-400 text-[10px] font-medium bg-orange-400/10 px-2 py-1 rounded-lg">
                                    <Clock size={10} />
                                    <span>{cooldown}</span>
                                  </div>
                                )}
                                {ud.hasPassed && (
                                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-green-400/10 text-green-400 border border-green-400/20">
                                    PASSED
                                  </span>
                                )}
                                {cooldown && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleRevoke(a.userId); }}
                                    disabled={revoking === a.userId}
                                    className="flex items-center gap-1 text-[9px] text-gsrp-teal-light/50 hover:text-cyan-400 px-2 py-0.5 rounded border border-gsrp-dark-border/30 hover:border-cyan-400/30 transition-colors disabled:opacity-50"
                                  >
                                    <RotateCcw size={10} />
                                    {revoking === a.userId ? '...' : 'Revoke'}
                                  </button>
                                )}
                              </>
                            );
                          })()}
                          <div className="text-right hidden sm:block">
                            <p className="text-[10px] text-gsrp-teal-light/30">{dateStr}</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-bold ${a.pass ? 'text-green-400' : 'text-red-400'}`}>{a.pct}%</p>
                            <p className="text-[10px] text-gsrp-teal-light/30">{a.score}/{a.total}</p>
                          </div>
                          <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${a.pass ? 'bg-green-400/10 text-green-400 border border-green-400/20' : 'bg-red-400/10 text-red-400 border border-red-400/20'}`}>
                            {a.pass ? 'PASS' : 'FAIL'}
                          </span>
                          {expanded === i ? <ChevronUp size={14} className="text-gsrp-teal-light/30" /> : <ChevronDown size={14} className="text-gsrp-teal-light/30" />}
                        </div>
                      </button>
                      {expanded === i && a.answers && (
                        <div className="px-5 pb-5 bg-black/20">
                          <p className="text-[10px] uppercase tracking-widest text-gsrp-teal-light/30 font-medium pt-3 pb-2">Answer Breakdown</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {a.answers.map((ans, j) => (
                              <div key={j} className={`p-3 rounded-lg text-xs border ${ans.correct ? 'bg-green-400/5 border-green-400/15' : 'bg-red-400/5 border-red-400/15'}`}>
                                <p className="text-gsrp-teal-light/50 mb-1.5 leading-relaxed line-clamp-2">{ans.question || '-'}</p>
                                <p className={ans.correct ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>
                                  {ans.correct ? '✓' : '✗'} {ans.chosen || '-'}
                                </p>
                                {!ans.correct && <p className="text-green-400/60 mt-0.5">Correct: {ans.answer || ''}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="card-glass rounded-2xl overflow-hidden">
            {ridealongFiltered.length === 0 ? (
              <div className="py-16 text-center">
                <Users className="mx-auto text-gsrp-dark-border mb-4" size={32} />
                <p className="text-gsrp-teal-light/30 text-xs">No ridealong sessions found</p>
              </div>
            ) : (
              <div className="divide-y divide-gsrp-dark-border/50">
                {ridealongFiltered.map((a, i) => {
                  const avUrl = a.avatar
                    ? `https://cdn.discordapp.com/avatars/${a.userId}/${a.avatar}.png?size=32`
                    : `https://cdn.discordapp.com/embed/avatars/0.png`;
                  const dateStr = a.timestamp ? new Date(a.timestamp).toLocaleString() : '-';
                  const ud = ridealongUserData[a.userId] || {};
                  return (
                    <div key={a.attemptId || i}>
                      <button
                        onClick={() => setExpanded(expanded === i ? null : i)}
                        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors cursor-pointer text-left"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <img src={avUrl} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-white text-sm font-medium truncate">{a.globalName || a.username}</p>
                            <p className="text-[10px] text-gsrp-teal-light/30 font-mono">{a.userId}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                          {ud.hasPassed && (
                            <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-green-400/10 text-green-400 border border-green-400/20">
                              PASSED
                            </span>
                          )}
                          {ud.discordRolesApplied && (
                            <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-gsrp-teal/10 text-gsrp-teal-light border border-gsrp-teal/20">
                              ROLES SET
                            </span>
                          )}
                          <div className="text-right hidden sm:block">
                            <p className="text-[10px] text-gsrp-teal-light/30">{dateStr}</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-bold ${a.pass ? 'text-green-400' : 'text-red-400'}`}>{a.pct}%</p>
                            <p className="text-[10px] text-gsrp-teal-light/30">{a.score}/{a.total}</p>
                          </div>
                          <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${a.pass ? 'bg-green-400/10 text-green-400 border border-green-400/20' : 'bg-red-400/10 text-red-400 border border-red-400/20'}`}>
                            {a.pass ? 'PASS' : 'FAIL'}
                          </span>
                          {expanded === i ? <ChevronUp size={14} className="text-gsrp-teal-light/30" /> : <ChevronDown size={14} className="text-gsrp-teal-light/30" />}
                        </div>
                      </button>
                      {expanded === i && a.scenarios && (
                        <div className="px-5 pb-5 bg-black/20">
                          <p className="text-[10px] uppercase tracking-widest text-gsrp-teal-light/30 font-medium pt-3 pb-2">Scenario Breakdown</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {a.scenarios.map((s, j) => (
                              <div key={j} className={`p-3 rounded-lg text-xs border ${s.correct ? 'bg-green-400/5 border-green-400/15' : 'bg-red-400/5 border-red-400/15'}`}>
                                <p className="text-gsrp-teal-light/40 mb-1 text-[10px] uppercase tracking-wider">Scenario {j + 1}</p>
                                <p className={s.correct ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>
                                  {s.correct ? '✓ Correct' : '✗ Incorrect'}
                                </p>
                                <p className="text-gsrp-teal-light/40 text-[10px] mt-1">
                                  Evidence: {s.evidenceViewed ? '✅' : '❌'} {s.correctCommand && `| Command: ;${s.correctCommand}`}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export async function getServerSideProps(context) {
  const { getServerSession } = require('next-auth');
  const { authOptions } = require('../../lib/auth-options');
  const session = await getServerSession(context.req, context.res, authOptions);
  return { props: {} };
}
