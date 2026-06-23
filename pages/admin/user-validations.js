import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../lib/auth-options';
import LoginScreen from '../../components/auth/LoginScreen';
import { useRefreshedUser } from '../../lib/UserRefreshContext';
import AccessDenied from '../../components/auth/AccessDenied';
import {
  Users, Search, Loader2, BookOpen, FileText, Clock, CheckCircle, XCircle,
  RefreshCw, Shield, ChevronDown, ChevronRight, AlertTriangle,
  BarChart3, Ban, Undo2, Trash2, Copy, ChevronLeft, Hourglass, Timer, UserMinus
} from 'lucide-react';

const PAGE_SIZE = 10;

// Format a millisecond duration as a compact "3d 4h" / "5h 12m" / "<1m" string.
function fmtDuration(ms) {
  if (ms <= 0) return null;
  const totalMin = Math.floor(ms / 60000);
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m && !d) parts.push(`${m}m`); // drop minutes once we're over a day
  if (parts.length === 0) return '<1m';
  return parts.join(' ');
}

// Derive the trainee-deadline display state for a user given "now".
function traineeState(user, now) {
  const status = user.traineeStatus;
  if (!status) return null;
  if (status === 'completed') {
    return { kind: 'completed', label: 'Training complete', tone: 'green' };
  }
  if (status === 'expired') {
    return { kind: 'removed', label: 'Role removed — expired', tone: 'gray' };
  }
  if (status === 'failed') {
    return { kind: 'removed', label: 'Role removed — failed quiz', tone: 'red' };
  }
  // active
  if (!user.traineeDeadline) return { kind: 'active', label: 'In training', tone: 'orange' };
  const remaining = new Date(user.traineeDeadline).getTime() - now;
  if (remaining <= 0) {
    return { kind: 'overdue', label: 'Deadline passed', tone: 'red' };
  }
  const left = fmtDuration(remaining);
  return {
    kind: 'active',
    label: `${left} left`,
    tone: remaining < 24 * 60 * 60 * 1000 ? 'red' : 'orange',
    remaining,
  };
}

const TONES = {
  green: 'bg-green-400/10 text-green-400',
  red: 'bg-red-400/10 text-red-400',
  orange: 'bg-gsrp-orange/15 text-gsrp-orange',
  gray: 'bg-gray-400/10 text-gray-400',
};

export default function UserValidationsPage({ canAccess: serverCanAccess, userIsAdmin: serverIsAdmin }) {
  const { data: session, status } = useSession();
  const { refreshedUser, hasRefreshed, accessDenied } = useRefreshedUser();
  const isAdmin = refreshedUser?.isAdmin || serverIsAdmin;
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [expandedUser, setExpandedUser] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [toast, setToast] = useState(null);
  const [page, setPage] = useState(1);
  const [now, setNow] = useState(Date.now());

  // Tick once a minute so all countdown timers stay live without re-fetching.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') return;
    if (!hasRefreshed || accessDenied) return;
    fetchUsers();
  }, [status, hasRefreshed, accessDenied]);

  async function fetchUsers(isManual) {
    if (isManual) setRefreshing(true); else setLoading(true);
    try {
      const res = await fetch('/api/admin/user-validations');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setNow(Date.now());
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleAction(userId, action, confirmMsg) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setActionLoading(prev => ({ ...prev, [`${userId}_${action}`]: true }));
    try {
      const res = await fetch('/api/admin/user-validations-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action }),
      });
      const data = await res.json();
      if (res.ok) {
        setToast({ type: 'success', message: data.message });
        await fetchUsers(true);
      } else {
        setToast({ type: 'error', message: data.error });
      }
    } catch (err) {
      setToast({ type: 'error', message: 'Action failed' });
    } finally {
      setActionLoading(prev => ({ ...prev, [`${userId}_${action}`]: false }));
    }
  }

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchesSearch = !search ||
      u.userId.toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q);
    if (filter === 'all') return matchesSearch;
    if (filter === 'passed') return matchesSearch && u.hasPassed;
    if (filter === 'failed') return matchesSearch && !u.hasPassed && u.totalAttempts > 0;
    if (filter === 'handbook_done') return matchesSearch && u.handbookCompleted;
    if (filter === 'handbook_pending') return matchesSearch && !u.handbookCompleted;
    if (filter === 'cooldown') return matchesSearch && (u.isOnCooldown || u.ridealongOnCooldown);
    if (filter === 'in_training') return matchesSearch && u.traineeStatus === 'active';
    return matchesSearch;
  });

  // Summary counts across all users (not just the filtered/paged subset).
  const stats = {
    total: users.length,
    inTraining: users.filter(u => u.traineeStatus === 'active').length,
    passed: users.filter(u => u.hasPassed).length,
    cooldown: users.filter(u => u.isOnCooldown || u.ridealongOnCooldown).length,
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageUsers = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, filter]);

  // Resolve Discord usernames/avatars for the visible page only, on demand.
  useEffect(() => {
    const missing = pageUsers.filter(u => !u.username).map(u => u.userId);
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/user-validations-resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userIds: missing }),
        });
        if (!res.ok) return;
        const data = await res.json();
        const resolved = data.resolved || {};
        if (cancelled || Object.keys(resolved).length === 0) return;
        setUsers(prev => prev.map(u =>
          resolved[u.userId]
            ? { ...u, username: resolved[u.userId].username, avatar: resolved[u.userId].avatar }
            : u
        ));
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [currentPage, filter, search, users]);

  if (status === 'loading' || !hasRefreshed) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-gsrp-orange animate-spin" />
      </div>
    );
  }

  if (!session) return <LoginScreen />;
  if (accessDenied) return <AccessDenied roleId={accessDenied.roleId} />;
  if (!serverCanAccess) return <AccessDenied roleId="ADMIN" />;

  return (
    <div className="max-w-7xl mx-auto">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg animate-slide-left ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Users className="w-7 h-7 text-gsrp-orange" />
            User Validations
          </h1>
          <p className="text-gray-400 text-sm mt-1">Handbook progress, quiz stats, training deadlines, and cooldowns</p>
        </div>
        <button
          onClick={() => fetchUsers(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-gsrp-dark-card border border-gsrp-dark-border text-gray-300 hover:text-white hover:border-gsrp-orange/40 transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Users} label="Total Users" value={stats.total} tone="gray" />
        <StatCard icon={Hourglass} label="In Training" value={stats.inTraining} tone="orange" />
        <StatCard icon={CheckCircle} label="Quiz Passed" value={stats.passed} tone="green" />
        <StatCard icon={Clock} label="On Cooldown" value={stats.cooldown} tone="red" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by username or user ID..."
            className="w-full bg-gsrp-dark-card border border-gsrp-dark-border rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-gsrp-orange/50 text-sm"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'all', label: 'All', icon: Users },
            { key: 'in_training', label: 'In Training', icon: Hourglass },
            { key: 'passed', label: 'Passed', icon: CheckCircle },
            { key: 'failed', label: 'Failed', icon: XCircle },
            { key: 'handbook_done', label: 'Handbook Done', icon: BookOpen },
            { key: 'handbook_pending', label: 'Handbook Pending', icon: FileText },
            { key: 'cooldown', label: 'On Cooldown', icon: Clock },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filter === f.key
                  ? 'bg-gsrp-orange text-white'
                  : 'bg-gsrp-dark-card border border-gsrp-dark-border text-gray-400 hover:text-white hover:border-gsrp-orange/30'
              }`}
            >
              <f.icon className="w-3.5 h-3.5" />
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-gsrp-orange animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users className="w-12 h-12 text-gray-600 mb-4" />
          <p className="text-gray-400">No users found</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-gray-500 mb-2">
            {filtered.length} user{filtered.length !== 1 ? 's' : ''}
            {filtered.length > PAGE_SIZE && (
              <span className="text-gray-600"> · showing {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filtered.length)}</span>
            )}
          </p>
          {pageUsers.map(user => (
            <UserCard
              key={user.userId}
              user={user}
              now={now}
              isExpanded={expandedUser === user.userId}
              onToggle={() => setExpandedUser(expandedUser === user.userId ? null : user.userId)}
              onAction={handleAction}
              actionLoading={actionLoading}
              isAdmin={isAdmin}
            />
          ))}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold bg-gsrp-dark-card border border-gsrp-dark-border text-gray-400 hover:text-white hover:border-gsrp-orange/30 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Prev
              </button>
              <span className="text-xs text-gray-400 px-2">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold bg-gsrp-dark-card border border-gsrp-dark-border text-gray-400 hover:text-white hover:border-gsrp-orange/30 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone }) {
  return (
    <div className="bg-gsrp-dark-card/50 border border-gsrp-dark-border/50 rounded-xl p-3.5 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${TONES[tone]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold text-white leading-tight">{value}</p>
        <p className="text-[11px] text-gray-400 truncate">{label}</p>
      </div>
    </div>
  );
}

function UserCard({ user, now, isExpanded, onToggle, onAction, actionLoading, isAdmin }) {
  const lastAttempt = user.lastAttempt;
  const lastAttemptDate = lastAttempt?.timestamp ? new Date(lastAttempt.timestamp).toLocaleDateString() : '—';

  const ts = traineeState(user, now);
  const quizCooldownMs = user.isOnCooldown && user.cooldownUntil ? new Date(user.cooldownUntil).getTime() - now : 0;
  const raCooldownMs = user.ridealongOnCooldown && user.ridealongCooldownUntil ? new Date(user.ridealongCooldownUntil).getTime() - now : 0;

  return (
    <div className="bg-gsrp-dark-card/50 border border-gsrp-dark-border/50 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-4 text-left hover:border-gsrp-orange/30 transition-colors cursor-pointer"
      >
        <img
          src={user.avatar || `https://cdn.discordapp.com/embed/avatars/0.png`}
          alt=""
          className="w-10 h-10 rounded-full flex-shrink-0 object-cover"
          onError={e => { e.target.src = `https://cdn.discordapp.com/embed/avatars/0.png`; }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-white truncate">{user.username || 'Unknown User'}</p>
            <button
              onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(user.userId); }}
              className="p-1 hover:bg-gsrp-dark-surface rounded transition-colors cursor-pointer"
              title="Copy user ID"
            >
              <Copy className="w-3 h-3 text-gray-500" />
            </button>
          </div>
          <p className="text-xs font-mono text-gray-500 mt-0.5">{user.userId}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <StatusBadge icon={BookOpen} label={user.handbookCompleted ? 'Handbook' : 'Handbook Pending'} active={user.handbookCompleted} />
            <StatusBadge icon={FileText} label={user.hasPassed ? 'Quiz Passed' : 'Quiz Pending'} active={user.hasPassed} />
            <StatusBadge icon={Shield} label={user.ridealongPassed ? 'Ridealong' : 'Ridealong Pending'} active={user.ridealongPassed} />
            {ts && (
              <span className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 font-medium ${TONES[ts.tone]}`}>
                <Timer className="w-3 h-3" />
                {ts.label}
              </span>
            )}
            {quizCooldownMs > 0 && (
              <span className="text-xs text-red-400 bg-red-400/10 px-2 py-0.5 rounded flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Quiz cooldown {fmtDuration(quizCooldownMs)}
              </span>
            )}
            {raCooldownMs > 0 && (
              <span className="text-xs text-red-400 bg-red-400/10 px-2 py-0.5 rounded flex items-center gap-1">
                <Clock className="w-3 h-3" />
                RA cooldown {fmtDuration(raCooldownMs)}
              </span>
            )}
            {user.totalAttempts > 0 && (
              <span className="text-xs text-gray-500 bg-gsrp-dark-surface px-2 py-0.5 rounded flex items-center gap-1">
                <BarChart3 className="w-3 h-3" />
                {user.totalAttempts} attempt{user.totalAttempts !== 1 ? 's' : ''}
              </span>
            )}
            {lastAttempt && (
              <span className="text-xs text-gray-500">
                Last: {lastAttempt.score}/{lastAttempt.total} ({lastAttempt.pct}%) — {lastAttemptDate}
              </span>
            )}
          </div>
        </div>
        {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />}
      </button>

      {isExpanded && (
        <div className="border-t border-gsrp-dark-border/50 p-4 bg-gsrp-dark-surface/30">
          {/* Admin actions moved to the top for quick access */}
          {isAdmin && (
            <div className="bg-gsrp-dark-card/50 rounded-lg p-3 mb-4">
              <h3 className="text-xs font-semibold text-gsrp-orange uppercase tracking-wider mb-3 flex items-center gap-2">
                <Shield className="w-3.5 h-3.5" />
                Admin Actions
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                <ActionButton
                  label="Reset Handbook" icon={RefreshCw}
                  loading={actionLoading[`${user.userId}_reset_handbook`]}
                  onClick={() => onAction(user.userId, 'reset_handbook', 'Reset handbook progress for this user?')}
                  variant="warning"
                />
                <ActionButton
                  label="Complete Handbook" icon={CheckCircle}
                  loading={actionLoading[`${user.userId}_complete_handbook`]}
                  onClick={() => onAction(user.userId, 'complete_handbook', 'Mark handbook as completed for this user?')}
                  variant="success"
                />
                <ActionButton
                  label="Grant Quiz Pass" icon={CheckCircle}
                  loading={actionLoading[`${user.userId}_grant_quiz_pass`]}
                  onClick={() => onAction(user.userId, 'grant_quiz_pass', 'Grant quiz pass to this user?')}
                  variant="success" disabled={user.hasPassed}
                />
                <ActionButton
                  label="Revoke Quiz Pass" icon={Ban}
                  loading={actionLoading[`${user.userId}_revoke_quiz_pass`]}
                  onClick={() => onAction(user.userId, 'revoke_quiz_pass', 'Revoke quiz pass for this user?')}
                  variant="danger" disabled={!user.hasPassed}
                />
                <ActionButton
                  label="Clear Quiz Cooldown" icon={Undo2}
                  loading={actionLoading[`${user.userId}_clear_cooldown`]}
                  onClick={() => onAction(user.userId, 'clear_cooldown', 'Clear quiz cooldown for this user?')}
                  variant="warning" disabled={!user.isOnCooldown}
                />
                <ActionButton
                  label="Clear RA Cooldown" icon={Undo2}
                  loading={actionLoading[`${user.userId}_clear_ridealong_cooldown`]}
                  onClick={() => onAction(user.userId, 'clear_ridealong_cooldown', 'Clear ridealong cooldown for this user?')}
                  variant="warning" disabled={!user.ridealongOnCooldown}
                />
                <ActionButton
                  label="Revoke Ridealong" icon={Ban}
                  loading={actionLoading[`${user.userId}_revoke_ridealong_pass`]}
                  onClick={() => onAction(user.userId, 'revoke_ridealong_pass', 'Revoke ridealong pass for this user?')}
                  variant="danger" disabled={!user.ridealongPassed}
                />
                <ActionButton
                  label="Reset Quiz" icon={Trash2}
                  loading={actionLoading[`${user.userId}_reset_quiz`]}
                  onClick={() => onAction(user.userId, 'reset_quiz', 'Reset all quiz data for this user?')}
                  variant="danger"
                />
                <ActionButton
                  label="Reset All" icon={AlertTriangle}
                  loading={actionLoading[`${user.userId}_reset_all`]}
                  onClick={() => onAction(user.userId, 'reset_all', 'Reset ALL validations for this user? This cannot be undone.')}
                  variant="danger"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Training deadline */}
            <div className="bg-gsrp-dark-card/50 rounded-lg p-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Hourglass className="w-3.5 h-3.5" />
                Training Deadline
              </h3>
              <div className="space-y-1.5 text-sm">
                {ts ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status</span>
                      <span className={`font-medium ${ts.tone === 'green' ? 'text-green-400' : ts.tone === 'red' ? 'text-red-400' : ts.tone === 'orange' ? 'text-gsrp-orange' : 'text-gray-400'}`}>
                        {ts.label}
                      </span>
                    </div>
                    {user.traineeStartedAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Started</span>
                        <span className="text-white">{new Date(user.traineeStartedAt).toLocaleString()}</span>
                      </div>
                    )}
                    {user.traineeDeadline && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Deadline</span>
                        <span className="text-white">{new Date(user.traineeDeadline).toLocaleString()}</span>
                      </div>
                    )}
                    {user.traineeRemovedAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Role Removed</span>
                        <span className="text-red-400">{new Date(user.traineeRemovedAt).toLocaleString()}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-gray-500">Not currently tracked as a trainee.</p>
                )}
              </div>
            </div>

            {/* Handbook */}
            <div className="bg-gsrp-dark-card/50 rounded-lg p-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5" />
                Handbook Progress
              </h3>
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Status</span>
                  <span className={user.handbookCompleted ? 'text-green-400' : 'text-red-400'}>
                    {user.handbookCompleted ? 'Completed' : 'Incomplete'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Sections</span>
                  <span className="text-white">{user.completedSections.length} / 11</span>
                </div>
                {user.lastHandbookUpdate && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Last Updated</span>
                    <span className="text-white">{new Date(user.lastHandbookUpdate).toLocaleDateString()}</span>
                  </div>
                )}
                {user.completedSections.length > 0 && (
                  <div className="mt-2">
                    <span className="text-xs text-gray-500">Completed sections:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {user.completedSections.map(s => (
                        <span key={s} className="text-[10px] bg-green-400/10 text-green-400 px-1.5 py-0.5 rounded">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quiz */}
            <div className="bg-gsrp-dark-card/50 rounded-lg p-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" />
                Quiz & Ridealong
              </h3>
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Quiz Passed</span>
                  <span className={user.hasPassed ? 'text-green-400' : 'text-red-400'}>{user.hasPassed ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Attempts</span>
                  <span className="text-white">{user.totalAttempts}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Failed Attempts</span>
                  <span className={user.failedAttempts >= 2 ? 'text-red-400' : 'text-white'}>{user.failedAttempts ?? 0} / 2</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Best Score</span>
                  <span className="text-white">{user.bestScore}</span>
                </div>
                {quizCooldownMs > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Quiz Cooldown</span>
                    <span className="text-red-400">{fmtDuration(quizCooldownMs)} left</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Ridealong Passed</span>
                  <span className={user.ridealongPassed ? 'text-green-400' : 'text-red-400'}>{user.ridealongPassed ? 'Yes' : 'No'}</span>
                </div>
                {raCooldownMs > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">RA Cooldown</span>
                    <span className="text-red-400">{fmtDuration(raCooldownMs)} left</span>
                  </div>
                )}
                {user.traineeRoleRemoved && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Trainee Role</span>
                    <span className="text-red-400 flex items-center gap-1"><UserMinus className="w-3 h-3" /> Removed</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {user.attempts.length > 0 && (
            <div className="bg-gsrp-dark-card/50 rounded-lg p-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <BarChart3 className="w-3.5 h-3.5" />
                Attempt History
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500 border-b border-gsrp-dark-border/50">
                      <th className="text-left py-1.5 px-2">#</th>
                      <th className="text-left py-1.5 px-2">Score</th>
                      <th className="text-left py-1.5 px-2">%</th>
                      <th className="text-left py-1.5 px-2">Result</th>
                      <th className="text-left py-1.5 px-2">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {user.attempts.map((a, i) => (
                      <tr key={i} className="border-b border-gsrp-dark-border/30">
                        <td className="py-1.5 px-2 text-gray-400">{i + 1}</td>
                        <td className="py-1.5 px-2 text-white">{a.score}/{a.total}</td>
                        <td className="py-1.5 px-2 text-white">{a.pct}%</td>
                        <td className="py-1.5 px-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            a.pass ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'
                          }`}>
                            {a.pass ? 'PASS' : 'FAIL'}
                          </span>
                        </td>
                        <td className="py-1.5 px-2 text-gray-400">{new Date(a.timestamp).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ icon: Icon, label, active }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 ${
      active ? 'bg-green-400/10 text-green-400' : 'bg-gray-400/10 text-gray-400'
    }`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

function ActionButton({ label, icon: Icon, loading, onClick, variant, disabled }) {
  const colors = {
    warning: 'bg-yellow-400/10 text-yellow-400 hover:bg-yellow-400/20 border-yellow-400/20',
    success: 'bg-green-400/10 text-green-400 hover:bg-green-400/20 border-green-400/20',
    danger: 'bg-red-400/10 text-red-400 hover:bg-red-400/20 border-red-400/20',
  };

  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${colors[variant]} ${
        loading || disabled ? 'opacity-40 cursor-not-allowed' : ''
      }`}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
      {label}
    </button>
  );
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session) return { redirect: { destination: '/login', permanent: false } };

  const { isFullAdmin } = await import('../../lib/admin-helper');
  const isAdmin = await isFullAdmin(session.user?.id, session.user?.roles || []);

  let quizPassed = false;
  try {
    const clientPromise = (await import('../../lib/mongodb')).default;
    const client = await clientPromise;
    const db = client.db();
    const quizData = await db.collection('quiz_attempts').findOne({ userId: session.user.id });
    quizPassed = quizData?.hasPassed === true;
  } catch {}

  const canAccess = isAdmin || quizPassed;
  if (!canAccess) return { redirect: { destination: '/', permanent: false } };

  return { props: { canAccess, userIsAdmin: isAdmin } };
}
