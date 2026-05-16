import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { isFullAdmin } from '../lib/admin-helper';
import { useRefreshedUser } from '../lib/UserRefreshContext';
import { Shield, UserPlus, UserMinus, FileCheck, FileX, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { getServerSession } from 'next-auth';
import { authOptions } from '../lib/auth-options';

const ACTION_LABELS = {
  admin_add: { label: 'Admin Added', icon: UserPlus, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  admin_remove: { label: 'Admin Removed', icon: UserMinus, color: 'text-red-400', bg: 'bg-red-500/10' },
  application_accept: { label: 'Application Accepted', icon: FileCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  application_deny: { label: 'Application Denied', icon: FileX, color: 'text-red-400', bg: 'bg-red-500/10' },
};

export default function AuditLogsPage() {
  const { status } = useSession();
  const { refreshedUser } = useRefreshedUser();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const pageSize = 25;

  const isAdmin = refreshedUser?.isAdmin;

  useEffect(() => {
    if (status === 'loading') return;
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const params = new URLSearchParams({
      limit: String(pageSize),
      skip: String(page * pageSize),
    });
    if (filter !== 'all') params.set('action', filter);
    fetch(`/api/audit-logs?${params}`)
      .then(res => res.json())
      .then(data => {
        setLogs(data.logs || []);
        setTotal(data.total || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [status, isAdmin, page, filter]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-gsrp-orange animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Shield className="w-12 h-12 text-gray-500 mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Access Denied</h2>
        <p className="text-gray-400">You do not have permission to view audit logs.</p>
      </div>
    );
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Shield className="w-7 h-7 text-gsrp-orange" />
            Audit Logs
          </h1>
          <p className="text-gray-400 text-sm mt-1">Track all administrative actions</p>
        </div>
        <select
          value={filter}
          onChange={e => { setFilter(e.target.value); setPage(0); }}
          className="bg-gsrp-dark-card border border-gsrp-dark-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gsrp-orange/50"
        >
          <option value="all">All Actions</option>
          <option value="admin_add">Admin Added</option>
          <option value="admin_remove">Admin Removed</option>
          <option value="application_accept">Application Accepted</option>
          <option value="application_deny">Application Denied</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-gsrp-orange animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Shield className="w-12 h-12 text-gray-600 mb-4" />
          <p className="text-gray-400">No audit logs found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log, i) => {
            const actionInfo = ACTION_LABELS[log.action] || { label: log.action, icon: Shield, color: 'text-gray-400', bg: 'bg-gray-500/10' };
            const Icon = actionInfo.icon;
            return (
              <div key={i} className="flex items-start gap-4 p-4 bg-gsrp-dark-card/50 border border-gsrp-dark-border/50 rounded-xl hover:border-gsrp-dark-border transition-colors">
                <div className={`w-10 h-10 rounded-lg ${actionInfo.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${actionInfo.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-sm font-medium ${actionInfo.color}`}>{actionInfo.label}</span>
                  </div>
                  <p className="text-sm text-gray-300">
                    <span className="text-white font-medium">{log.actorName || log.actorId}</span>
                    {log.action === 'admin_add' && <> added <span className="text-white font-medium">{log.details?.addedUserId}</span> as admin</>}
                    {log.action === 'admin_remove' && <> removed <span className="text-white font-medium">{log.details?.removedUserId}</span> as admin</>}
                    {log.action === 'application_accept' && <> accepted <span className="text-white font-medium">{log.details?.applicantUserId}</span>'s {log.details?.applicationType || ''} application</>}
                    {log.action === 'application_deny' && <> denied <span className="text-white font-medium">{log.details?.applicantUserId}</span>'s {log.details?.applicationType || ''} application</>}
                  </p>
                  {log.details?.reason && (
                    <p className="text-xs text-gray-500 mt-1">Reason: {log.details.reason}</p>
                  )}
                </div>
                <div className="text-xs text-gray-500 flex-shrink-0">
                  {new Date(log.timestamp).toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="flex items-center gap-1 px-3 py-2 text-sm bg-gsrp-dark-card border border-gsrp-dark-border rounded-lg text-white disabled:opacity-30 disabled:cursor-not-allowed hover:border-gsrp-orange/50 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          <span className="text-sm text-gray-400">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="flex items-center gap-1 px-3 py-2 text-sm bg-gsrp-dark-card border border-gsrp-dark-border rounded-lg text-white disabled:opacity-30 disabled:cursor-not-allowed hover:border-gsrp-orange/50 transition-colors cursor-pointer"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session) {
    return { redirect: { destination: '/login', permanent: false } };
  }

  const isAdmin = await isFullAdmin(session.user?.id, session.user?.roles || []);

  if (!isAdmin) {
    return { redirect: { destination: '/', permanent: false } };
  }

  return { props: {} };
}
