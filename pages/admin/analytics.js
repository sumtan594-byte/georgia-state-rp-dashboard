import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { getServerSession } from 'next-auth';
import { BarChart3, Globe, Loader2, Monitor, ShieldAlert, Users } from 'lucide-react';
import { authOptions } from '../../lib/auth-options';
import LoginScreen from '../../components/auth/LoginScreen';
import AccessDenied from '../../components/auth/AccessDenied';
import { useRefreshedUser } from '../../lib/UserRefreshContext';
import { PageSkeleton } from '../../components/SkeletonLoader';

function Stat({ icon: Icon, label, value, tone = 'text-white' }) {
  return (
    <div className="rounded-xl border border-gsrp-dark-border/50 bg-gsrp-dark-card/55 p-4">
      <div className="mb-3 flex items-center gap-2 text-gsrp-teal-light/35">
        <Icon size={15} />
        <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
      </div>
      <p className={`font-mono tabular text-3xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}

function ListBlock({ title, items }) {
  return (
    <div className="rounded-xl border border-gsrp-dark-border/50 bg-gsrp-dark-card/55 p-5">
      <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.25em] text-gsrp-orange">{title}</h2>
      <div className="space-y-3">
        {(items || []).map(item => (
          <div key={item.label} className="flex items-center gap-3">
            <span className="min-w-0 flex-1 truncate text-sm text-gsrp-teal-light/70">{item.label}</span>
            <span className="font-mono text-xs font-bold text-white">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsPage({ canAccess }) {
  const { data: session, status } = useSession();
  const { hasRefreshed, accessDenied } = useRefreshedUser();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (status !== 'authenticated' || !hasRefreshed || accessDenied) return;
    fetch('/api/tracking/analytics')
      .then(r => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => setData(null));
  }, [status, hasRefreshed, accessDenied]);

  if (status === 'loading' || !hasRefreshed) {
    return <PageSkeleton />;
  }
  if (!session) return <LoginScreen />;
  if (accessDenied) return <AccessDenied {...accessDenied} />;
  if (!canAccess) return <AccessDenied roleId="ADMIN" />;
  if (!data) return <PageSkeleton />;

  const stats = data.stats || {};

  return (
    <div className="mx-auto max-w-7xl animate-fade-in-up">
      <div className="mb-8">
        <h1 className="flex items-center gap-3 text-3xl font-bold text-white">
          <BarChart3 className="text-gsrp-orange" /> Analytics
        </h1>
        <p className="mt-1 text-sm text-gsrp-teal-light/40">Seven-day visitor activity, auto-pruned weekly.</p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={Globe} label="Visits 7d" value={stats.visits7d || 0} />
        <Stat icon={Users} label="Today" value={stats.visitsToday || 0} tone="text-gsrp-orange" />
        <Stat icon={Users} label="Unique Users" value={stats.uniqueUsers || 0} />
        <Stat icon={Monitor} label="Online Now" value={stats.onlineNow || 0} tone="text-green-400" />
        <Stat icon={Globe} label="Unique IPs" value={stats.uniqueIps || 0} />
        <Stat icon={Users} label="Authenticated" value={stats.authenticated || 0} />
        <Stat icon={Users} label="Anonymous" value={stats.anonymous || 0} />
        <Stat icon={ShieldAlert} label="Proxy Flags" value={stats.proxyFlags || 0} tone="text-red-400" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <ListBlock title="Top Pages" items={data.topPages} />
        <ListBlock title="Devices" items={data.devices} />
        <ListBlock title="Countries" items={data.countries} />
      </div>
    </div>
  );
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session) return { redirect: { destination: '/login', permanent: false } };
  const { canViewTracking } = await import('../../lib/admin-helper');
  return { props: { canAccess: await canViewTracking(session) } };
}
