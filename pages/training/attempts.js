import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Loader2, Users, Search, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import LoginScreen from '../../components/auth/LoginScreen';

function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

export default function AttemptsPage() {
  const { data: session, status } = useSession();
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [resultFilter, setResultFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/training/attempts')
        .then(r => r.json())
        .then(data => {
          setAttempts(Array.isArray(data) ? data : []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [status]);

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center">
          <Loader2 className="w-8 h-8 text-gsrp-orange animate-spin mb-4" />
          <span className="text-gsrp-teal-light/40 font-mono text-[9px] uppercase tracking-[0.3em]">Loading Attempts</span>
        </div>
      </div>
    );
  }

  if (!session) return <LoginScreen />;

  let filtered = [...attempts];
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(a =>
      (a.username || '').toLowerCase().includes(q) ||
      (a.globalName || '').toLowerCase().includes(q) ||
      (a.userId || '').includes(q)
    );
  }
  if (resultFilter === 'pass') filtered = filtered.filter(a => a.pass);
  if (resultFilter === 'fail') filtered = filtered.filter(a => !a.pass);

  if (sort === 'newest') filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  if (sort === 'oldest') filtered.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  if (sort === 'score-high') filtered.sort((a, b) => b.pct - a.pct);
  if (sort === 'score-low') filtered.sort((a, b) => a.pct - b.pct);

  return (
    <div className="max-w-6xl mx-auto animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Quiz Attempts</h1>
          <p className="text-gsrp-teal-light/40 text-[10px] uppercase tracking-widest mt-1">
            {filtered.length} attempt{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

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
            {filtered.map((a, i) => (
              <div key={a.attemptId || i}>
                <button
                  onClick={() => setExpanded(expanded === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gsrp-dark-surface/40 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gsrp-dark-surface flex-shrink-0">
                      {a.avatar ? (
                        <img src={`https://cdn.discordapp.com/avatars/${a.userId}/${a.avatar}.png?size=32`} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gsrp-dark-border" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">{a.globalName || a.username}</p>
                      <p className="text-[10px] text-gsrp-teal-light/30 font-mono">{a.userId}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
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
                  <div className="px-5 pb-4 bg-gsrp-dark-surface/30">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                      {a.answers.map((ans, j) => (
                        <div key={j} className={`p-3 rounded-lg text-xs border ${ans.correct ? 'bg-green-400/5 border-green-400/20' : 'bg-red-400/5 border-red-400/20'}`}>
                          <p className="text-gsrp-teal-light/40 mb-1 truncate">{esc(ans.question || '').substring(0, 80)}</p>
                          <p className={ans.correct ? 'text-green-400' : 'text-red-400'}>
                            {ans.correct ? '✓' : '✗'} {esc(ans.chosen || '—')}
                          </p>
                          {!ans.correct && <p className="text-green-400/70 mt-0.5">✓ {esc(ans.answer || '')}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export async function getServerSideProps(context) {
  const { getSession } = require("next-auth/react");
  const session = await getSession(context);
  if (!session) return { props: {} };

  const hasRole = session.user?.roles?.includes('1372482495035211908');
  const isAdmin = (process.env.ADMIN_USER_IDS || '').split(',').includes(session.user?.id);
  if (!hasRole && !isAdmin) return { redirect: { destination: '/', permanent: false } };

  return { props: {} };
}
