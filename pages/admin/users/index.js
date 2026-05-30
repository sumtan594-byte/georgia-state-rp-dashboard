import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth-options';
import LoginScreen from '../../../components/auth/LoginScreen';
import { useRefreshedUser } from '../../../lib/UserRefreshContext';
import AccessDenied from '../../../components/auth/AccessDenied';
import Link from 'next/link';
import {
  Users, Globe, Monitor, Search, UserCheck, HelpCircle,
  Loader2, RefreshCw, ChevronDown, ChevronUp, Clock, Wifi, ExternalLink,
} from 'lucide-react';

export default function UsersPage({ canAccess }) {
  const { data: session, status } = useSession();
  const { refreshedUser, hasRefreshed, accessDenied } = useRefreshedUser();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({ totalProfiles: 0, onlineNow: 0 });
  const [expanded, setExpanded] = useState(null);
  const [activeTab, setActiveTab] = useState('discord');

  useEffect(() => {
    if (status === 'unauthenticated') return;
    if (!hasRefreshed || accessDenied) return;
    fetchData();
  }, [status, hasRefreshed, accessDenied]);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch('/api/tracking/logs');
      if (res.ok) {
        const data = await res.json();
        setProfiles(data.profiles || []);
        setStats(data.stats || { totalProfiles: 0, onlineNow: 0 });
      }
    } catch (err) {
      console.error('Failed to fetch:', err);
    } finally {
      setLoading(false);
    }
  }

  const discordUsers = profiles.filter(p => p.userId);
  const anonymousIPs = profiles.filter(p => !p.userId);

  const filteredDiscord = discordUsers.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (p.username || '').toLowerCase().includes(q)
      || p.userId?.includes(q)
      || (p.ips || []).some(ip => ip.includes(q));
  });

  const filteredAnonymous = anonymousIPs.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.ip?.toLowerCase().includes(q)
      || p.device?.toLowerCase().includes(q)
      || (p.ips || []).some(ip => ip.includes(q));
  });

  const displayList = activeTab === 'discord' ? filteredDiscord : filteredAnonymous;

  const onlineNow = (p) => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    return new Date(p.lastSeen) >= fiveMinAgo;
  };

  if (status === 'loading' || !hasRefreshed) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-gsrp-orange animate-spin" />
      </div>
    );
  }

  if (!session) return <LoginScreen />;
  if (accessDenied) return <AccessDenied roleId={accessDenied.roleId} />;
  if (!canAccess) return <AccessDenied roleId="ADMIN" />;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Users className="w-7 h-7 text-gsrp-orange" />
            Users
          </h1>
          <p className="text-gray-400 text-sm mt-1">Visitor profiles grouped by Discord account or IP address</p>
        </div>
        <Link
          href="/admin/users/all-visits"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-gsrp-dark-card border border-gsrp-dark-border text-gray-400 hover:text-white hover:border-gsrp-orange/30 transition-colors"
        >
          <Globe className="w-3.5 h-3.5" />
          All Visits
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-gsrp-dark-card/50 border border-gsrp-dark-border/50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{stats.onlineNow}</p>
          <p className="text-xs text-gray-500 mt-1">Online Now</p>
        </div>
        <div className="bg-gsrp-dark-card/50 border border-gsrp-dark-border/50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{discordUsers.length}</p>
          <p className="text-xs text-gray-500 mt-1">Discord Users</p>
        </div>
        <div className="bg-gsrp-dark-card/50 border border-gsrp-dark-border/50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{anonymousIPs.length}</p>
          <p className="text-xs text-gray-500 mt-1">Anonymous IPs</p>
        </div>
        <div className="bg-gsrp-dark-card/50 border border-gsrp-dark-border/50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{stats.totalProfiles}</p>
          <p className="text-xs text-gray-500 mt-1">Total Profiles</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={activeTab === 'discord' ? 'Search by username, user ID, or IP...' : 'Search by IP address or device...'}
            className="w-full bg-gsrp-dark-card border border-gsrp-dark-border rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-gsrp-orange/50 text-sm"
          />
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-gsrp-dark-card border border-gsrp-dark-border text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => { setActiveTab('discord'); setExpanded(null); }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'discord'
              ? 'bg-gsrp-orange text-white'
              : 'bg-gsrp-dark-card border border-gsrp-dark-border text-gray-400 hover:text-white'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          Discord Users ({filteredDiscord.length})
        </button>
        <button
          onClick={() => { setActiveTab('anonymous'); setExpanded(null); }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'anonymous'
              ? 'bg-gsrp-orange text-white'
              : 'bg-gsrp-dark-card border border-gsrp-dark-border text-gray-400 hover:text-white'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          Anonymous IPs ({filteredAnonymous.length})
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-gsrp-orange animate-spin" />
        </div>
      ) : displayList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users className="w-12 h-12 text-gray-600 mb-4" />
          <p className="text-gray-400">No {activeTab === 'discord' ? 'users' : 'anonymous IPs'} found</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-gray-500 mb-2">{displayList.length} {activeTab === 'discord' ? 'user' : 'IP'}{displayList.length !== 1 ? 's' : ''}</p>
          {displayList.map(p => (
            <div
              key={p._id || (p.userId || p.ip)}
              className="bg-gsrp-dark-card/50 border border-gsrp-dark-border/50 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setExpanded(expanded === (p.userId || p.ip) ? null : (p.userId || p.ip))}
                className="w-full flex items-center gap-4 p-4 text-left hover:border-gsrp-orange/30 transition-colors cursor-pointer"
              >
                {activeTab === 'discord' ? (
                  <img
                    src={p.avatar || `https://cdn.discordapp.com/embed/avatars/0.png`}
                    alt=""
                    className="w-10 h-10 rounded-full flex-shrink-0 object-cover"
                    onError={e => { e.target.src = `https://cdn.discordapp.com/embed/avatars/0.png`; }}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gsrp-dark-surface flex items-center justify-center flex-shrink-0">
                    <HelpCircle className="w-5 h-5 text-gray-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white truncate">
                      {activeTab === 'discord' ? (p.username || p.userId) : p.ip}
                    </p>
                    {onlineNow(p) && (
                      <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" title="Online now" />
                    )}
                    <span className="text-[10px] bg-gsrp-dark-surface text-gray-500 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <Wifi className="w-2.5 h-2.5" />
                      {p.visitCount || 1} visits
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Monitor className="w-3 h-3" />
                      {p.device || 'Unknown'}
                    </span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      {(p.ips || []).length} IP{(p.ips || []).length !== 1 ? 's' : ''}
                    </span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Last: {new Date(p.lastSeen).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {expanded === (p.userId || p.ip) ? <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />}
              </button>

              {expanded === (p.userId || p.ip) && (
                <div className="border-t border-gsrp-dark-border/50 p-4 bg-gsrp-dark-surface/30">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gsrp-dark-card/50 rounded-lg p-3">
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5" />
                        IP Addresses
                      </h3>
                      <div className="space-y-1.5">
                        {(p.ips && p.ips.length > 0 ? p.ips : [p.ip || 'Unknown']).map((ip, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <span className="text-sm font-mono text-white">{ip}</span>
                          </div>
                        ))}
                        {(!p.ips || p.ips.length === 0) && (
                          <span className="text-sm text-gray-500">No IPs recorded</span>
                        )}
                      </div>
                    </div>

                    <div className="bg-gsrp-dark-card/50 rounded-lg p-3">
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Monitor className="w-3.5 h-3.5" />
                        Device Info
                      </h3>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Device</span>
                          <span className="text-white">{p.device || 'Unknown'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">User Agent</span>
                          <span className="text-white text-xs font-mono truncate max-w-[200px]" title={p.userAgent}>{p.userAgent || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                    <div>
                      <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">First Seen</p>
                      <p className="text-white text-xs">{p.firstSeen ? new Date(p.firstSeen).toLocaleString() : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Last Seen</p>
                      <p className="text-white text-xs">{new Date(p.lastSeen).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Last Page</p>
                      <p className="text-white text-xs">{p.lastPage || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Total Visits</p>
                      <p className="text-white text-xs">{p.visitCount || 1}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session) return { redirect: { destination: '/login', permanent: false } };

  const { isTrackingViewer } = await import('../../../lib/admin-helper');
  const canAccess = isTrackingViewer(session.user?.id);

  return { props: { canAccess } };
}
