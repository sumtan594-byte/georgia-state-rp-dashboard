import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../lib/auth-options';
import LoginScreen from '../../components/auth/LoginScreen';
import AccessDenied from '../../components/auth/AccessDenied';
import { useRefreshedUser } from '../../lib/UserRefreshContext';
import { Loader2, Save, ShieldCheck, X } from 'lucide-react';

function RolePill({ role, onRemove }) {
  const color = role?.color ? `#${role.color.toString(16).padStart(6, '0')}` : '#94a3b8';
  return (
    <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-bold text-white">
      {role?.iconUrl ? <img src={role.iconUrl} alt="" className="h-4 w-4 rounded-sm" /> : <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />}
      {role?.name || 'Unknown role'}
      <button onClick={onRemove} className="text-white/35 hover:text-red-400"><X size={12} /></button>
    </span>
  );
}

export default function AuthorizationPage({ canAccess }) {
  const { data: session, status } = useSession();
  const { hasRefreshed, accessDenied, refreshNow } = useRefreshedUser();
  const [resources, setResources] = useState([]);
  const [roles, setRoles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const rolesById = useMemo(() => Object.fromEntries(roles.map(role => [role.id, role])), [roles]);

  useEffect(() => {
    if (status !== 'authenticated' || !hasRefreshed || accessDenied) return;
    fetch('/api/admin/authorization')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setResources(data.config?.resources || []);
          setRoles(data.roles || []);
        }
      })
      .finally(() => setLoading(false));
  }, [status, hasRefreshed, accessDenied]);

  function updateResource(key, updater) {
    setResources(prev => prev.map(resource => resource.key === key ? updater(resource) : resource));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/authorization', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resources }),
      });
      if (!res.ok) throw new Error('Failed to save authorization config');
      const data = await res.json();
      setResources(data.config?.resources || []);
      setRoles(data.roles || []);
      refreshNow?.();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (status === 'loading' || !hasRefreshed || loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-gsrp-orange" /></div>;
  }
  if (!session) return <LoginScreen />;
  if (accessDenied) return <AccessDenied {...accessDenied} />;
  if (!canAccess) return <AccessDenied roleId="ADMIN" />;

  return (
    <div className="mx-auto max-w-7xl animate-fade-in-up">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-black text-white">
            <ShieldCheck className="text-gsrp-orange" /> Authorisation Manager
          </h1>
          <p className="mt-1 text-sm text-gsrp-teal-light/40">Discord-backed website access rules. Changes sync to active users on the next live refresh.</p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gsrp-orange px-5 py-3 text-sm font-black text-white transition hover:bg-gsrp-orange/90 disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Changes
        </button>
      </div>

      <div className="space-y-4">
        {resources.map(resource => (
          <div key={resource.key} className="rounded-xl border border-gsrp-dark-border/50 bg-gsrp-dark-card/70 p-5">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-black text-white">{resource.label}</h2>
                <p className="mt-1 text-xs text-gsrp-teal-light/35">{resource.paths?.length ? resource.paths.join(', ') : 'Internal capability'}</p>
              </div>
              <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gsrp-teal-light/40">
                <input
                  type="checkbox"
                  checked={resource.adminOnly === true}
                  onChange={e => updateResource(resource.key, r => ({ ...r, adminOnly: e.target.checked }))}
                />
                Admin only
              </label>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {(resource.roleIds || []).map(roleId => (
                <RolePill
                  key={roleId}
                  role={rolesById[roleId] || { id: roleId, name: roleId }}
                  onRemove={() => updateResource(resource.key, r => ({ ...r, roleIds: r.roleIds.filter(id => id !== roleId) }))}
                />
              ))}
              {(!resource.roleIds || resource.roleIds.length === 0) && !resource.adminOnly && (
                <span className="text-xs text-gsrp-teal-light/30">No Discord roles assigned</span>
              )}
            </div>

            <select
              value=""
              onChange={e => {
                const roleId = e.target.value;
                if (!roleId) return;
                updateResource(resource.key, r => ({ ...r, roleIds: [...new Set([...(r.roleIds || []), roleId])] }));
              }}
              className="w-full rounded-xl border border-gsrp-dark-border bg-gsrp-dark px-3 py-2 text-sm text-white outline-none focus:border-gsrp-orange/50 md:max-w-md"
            >
              <option value="">Add Discord role...</option>
              {roles.filter(role => !(resource.roleIds || []).includes(role.id)).map(role => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session) return { redirect: { destination: '/login', permanent: false } };
  const { canManageAuthorization } = await import('../../lib/admin-helper');
  return { props: { canAccess: await canManageAuthorization(session) } };
}
