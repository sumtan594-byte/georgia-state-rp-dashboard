import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRefreshedUser } from '../../lib/UserRefreshContext';
import { BarChart3, Users, CheckCircle, XCircle, Clock, TrendingUp, Loader2, Award, Shield } from 'lucide-react';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../lib/auth-options';
import AccessDenied from '../../components/auth/AccessDenied';

export default function QuizAnalyticsPage() {
  const { status } = useSession();
  const { refreshedUser, hasRefreshed, accessDenied } = useRefreshedUser();
  const [stats, setStats] = useState(null);
  const [ridealongStats, setRidealongStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const TRAINER_ROLE = '1372482495035211908';
  const isTrainer = refreshedUser?.roles?.includes(TRAINER_ROLE);
  const isAdmin = refreshedUser?.isAdmin;
  const canView = isTrainer || isAdmin;

  useEffect(() => {
    if (status === 'loading') return;
    if (!hasRefreshed || accessDenied) {
      setLoading(false);
      return;
    }
    if (!canView) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      fetch('/api/training/analytics').then(r => r.json()),
      fetch('/api/training/ridealong/analytics').then(r => r.json()).catch(() => null),
    ])
      .then(([quizData, ridealongData]) => {
        setStats(quizData);
        setRidealongStats(ridealongData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [status, hasRefreshed, accessDenied, canView]);

  if (status === 'loading' || !hasRefreshed || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-gsrp-orange animate-spin" />
      </div>
    );
  }

  if (accessDenied) {
    return <AccessDenied roleId={accessDenied.roleId} />;
  }

  if (!canView) {
    return <AccessDenied roleId={TRAINER_ROLE} />;
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <BarChart3 className="w-12 h-12 text-gray-600 mb-4" />
        <p className="text-gray-400">Failed to load analytics data</p>
      </div>
    );
  }

  const passRate = stats.totalAttempts > 0
    ? Math.round((stats.passedCount / stats.totalAttempts) * 100)
    : 0;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <BarChart3 className="w-7 h-7 text-gsrp-orange" />
          Quiz Analytics
        </h1>
        <p className="text-gray-400 text-sm mt-1">Training quiz performance overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users} label="Total Users" value={stats.totalUsers} color="text-blue-400" bg="bg-blue-500/10" />
        <StatCard icon={BarChart3} label="Total Attempts" value={stats.totalAttempts} color="text-purple-400" bg="bg-purple-500/10" />
        <StatCard icon={CheckCircle} label="Passed" value={stats.passedCount} color="text-emerald-400" bg="bg-emerald-500/10" />
        <StatCard icon={XCircle} label="Failed" value={stats.failedCount} color="text-red-400" bg="bg-red-500/10" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <div className="bg-gsrp-dark-card/50 border border-gsrp-dark-border/50 rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Pass Rate
          </h3>
          <div className="flex items-end gap-3">
            <span className="text-4xl font-bold text-white">{passRate}%</span>
            <span className="text-sm text-gray-500 mb-1">
              {stats.passedCount} of {stats.totalAttempts} attempts
            </span>
          </div>
          <div className="mt-4 h-3 bg-gsrp-dark rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${passRate}%` }}
            />
          </div>
        </div>

        <div className="bg-gsrp-dark-card/50 border border-gsrp-dark-border/50 rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2">
            <Award className="w-4 h-4" /> Average Score
          </h3>
          <div className="flex items-end gap-3">
            <span className="text-4xl font-bold text-white">{stats.avgScore}%</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-xs text-gray-500">Highest</div>
              <div className="text-lg font-semibold text-emerald-400">{stats.highestScore}%</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Lowest</div>
              <div className="text-lg font-semibold text-red-400">{stats.lowestScore}%</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Median</div>
              <div className="text-lg font-semibold text-blue-400">{stats.medianScore}%</div>
            </div>
          </div>
        </div>
      </div>

      {stats.recentAttempts?.length > 0 && (
        <div className="bg-gsrp-dark-card/50 border border-gsrp-dark-border/50 rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Recent Attempts
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs uppercase tracking-wider">
                  <th className="text-left pb-3 font-medium">User</th>
                  <th className="text-left pb-3 font-medium">Score</th>
                  <th className="text-left pb-3 font-medium">Result</th>
                  <th className="text-left pb-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gsrp-dark-border/30">
                {stats.recentAttempts.map((attempt, i) => (
                  <tr key={i} className="text-gray-300">
                    <td className="py-2.5 font-mono text-xs">{attempt.username || attempt.userId}</td>
                    <td className="py-2.5">{attempt.score}/{attempt.total} ({attempt.pct}%)</td>
                    <td className="py-2.5">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${attempt.pass ? 'text-emerald-400' : 'text-red-400'}`}>
                        {attempt.pass ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {attempt.pass ? 'Passed' : 'Failed'}
                      </span>
                    </td>
                    <td className="py-2.5 text-gray-500 text-xs">
                      {new Date(attempt.timestamp).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ridealong Analytics */}
      {ridealongStats && (
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3 mb-6">
            <Shield className="w-7 h-7 text-gsrp-orange" />
            Ridealong Analytics
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard icon={Users} label="Total Users" value={ridealongStats.uniqueUsers} color="text-blue-400" bg="bg-blue-500/10" />
            <StatCard icon={BarChart3} label="Total Sessions" value={ridealongStats.totalAttempts} color="text-purple-400" bg="bg-purple-500/10" />
            <StatCard icon={CheckCircle} label="Passed" value={ridealongStats.passed} color="text-emerald-400" bg="bg-emerald-500/10" />
            <StatCard icon={XCircle} label="Failed" value={ridealongStats.failed} color="text-red-400" bg="bg-red-500/10" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
            <div className="bg-gsrp-dark-card/50 border border-gsrp-dark-border/50 rounded-xl p-6">
              <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Ridealong Pass Rate
              </h3>
              <div className="flex items-end gap-3">
                <span className="text-4xl font-bold text-white">{ridealongStats.passRate}%</span>
                <span className="text-sm text-gray-500 mb-1">
                  {ridealongStats.passed} of {ridealongStats.totalAttempts} sessions
                </span>
              </div>
              <div className="mt-4 h-3 bg-gsrp-dark rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${ridealongStats.passRate}%` }}
                />
              </div>
            </div>

            <div className="bg-gsrp-dark-card/50 border border-gsrp-dark-border/50 rounded-xl p-6">
              <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2">
                <Award className="w-4 h-4" /> Average Score
              </h3>
              <div className="flex items-end gap-3">
                <span className="text-4xl font-bold text-white">{ridealongStats.avgScore}</span>
                <span className="text-sm text-gray-500 mb-1">out of 5</span>
              </div>
            </div>
          </div>

          {ridealongStats.mostMissed?.length > 0 && (
            <div className="bg-gsrp-dark-card/50 border border-gsrp-dark-border/50 rounded-xl p-6">
              <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2">
                <XCircle className="w-4 h-4" /> Most Missed Scenarios
              </h3>
              <div className="space-y-2">
                {ridealongStats.mostMissed.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gsrp-dark/30 rounded-lg">
                    <span className="text-xs text-gray-300 font-mono">{item.id}</span>
                    <span className="text-xs text-red-400 font-bold">{item.count} misses</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div className="bg-gsrp-dark-card/50 border border-gsrp-dark-border/50 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <span className="text-sm text-gray-400">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
}

export async function getServerSideProps(context) {
  const { isFullAdmin } = await import('../../lib/admin-helper');
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session) {
    return { redirect: { destination: '/login', permanent: false } };
  }

  const TRAINER_ROLE = '1372482495035211908';
  const hasTrainer = session.user?.roles?.includes(TRAINER_ROLE);
  const isAdmin = await isFullAdmin(session.user?.id, session.user?.roles || []);

  if (!hasTrainer && !isAdmin) {
    return { redirect: { destination: '/', permanent: false } };
  }

  return { props: {} };
}
