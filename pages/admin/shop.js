import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../lib/auth-options';
import LoginScreen from '../../components/auth/LoginScreen';
import AccessDenied from '../../components/auth/AccessDenied';
import { useRefreshedUser } from '../../lib/UserRefreshContext';
import { PageSkeleton } from '../../components/SkeletonLoader';
import { SHOP_ICON_OPTIONS, getShopIcon } from '../../lib/shop-icons';
import {
  AlertCircle, Check, ChevronDown, Loader2, Plus, RefreshCw, Save, ShoppingCart, Star, Trash2, X,
} from 'lucide-react';

const REWARD_TYPE_LABELS = {
  none: 'None (donation / thank-you only)',
  support: 'Support channel (advertisements)',
  roles: 'Grant Discord role(s)',
};

const CATEGORY_LABELS = {
  premium: 'Premium',
  advertisements: 'Paid Advertisements',
  donations: 'Donations',
};

function roleColorHex(role) {
  return role?.color ? `#${role.color.toString(16).padStart(6, '0')}` : '#94a3b8';
}

function RolePill({ role, onRemove }) {
  const color = roleColorHex(role);
  return (
    <span
      className="inline-flex items-center gap-2 rounded-lg border px-2.5 py-1 text-xs font-bold"
      style={{ borderColor: `${color}55`, backgroundColor: `${color}1a`, color: role?.color ? color : '#cbd5e1' }}
    >
      {role?.iconUrl
        ? <img src={role.iconUrl} alt="" className="h-4 w-4 rounded-sm" />
        : <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />}
      {role?.name || 'Unknown role'}
      {onRemove && <button onClick={onRemove} className="text-current/60 hover:text-red-400"><X size={12} /></button>}
    </span>
  );
}

// Searchable role selector rendering each role with its colour + icon.
function RolePicker({ roles, selectedIds, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rolesById = useMemo(() => Object.fromEntries(roles.map(r => [r.id, r])), [roles]);
  const available = roles.filter(
    r => !selectedIds.includes(r.id) && r.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-2">
        {selectedIds.length === 0 && <span className="text-xs text-gsrp-teal-light/30">No roles assigned</span>}
        {selectedIds.map(id => (
          <RolePill
            key={id}
            role={rolesById[id] || { id, name: id }}
            onRemove={() => onChange(selectedIds.filter(x => x !== id))}
          />
        ))}
      </div>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex w-full items-center justify-between rounded-xl border border-gsrp-dark-border bg-gsrp-dark px-3 py-2 text-sm text-white"
        >
          <span className="text-gsrp-teal-light/60">Add Discord role…</span>
          <ChevronDown size={16} className={`transition ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="absolute z-30 mt-2 max-h-72 w-full overflow-auto rounded-xl border border-gsrp-dark-border bg-gsrp-dark-card p-2 shadow-2xl">
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search roles…"
              className="mb-2 w-full rounded-lg border border-gsrp-dark-border bg-gsrp-dark px-3 py-2 text-sm text-white outline-none focus:border-gsrp-orange/50"
            />
            {available.length === 0 && <p className="px-2 py-3 text-xs text-gsrp-teal-light/40">No matching roles.</p>}
            {available.map(role => (
              <button
                key={role.id}
                type="button"
                onClick={() => { onChange([...selectedIds, role.id]); setQuery(''); setOpen(false); }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-white hover:bg-white/5"
              >
                {role.iconUrl
                  ? <img src={role.iconUrl} alt="" className="h-4 w-4 rounded-sm" />
                  : <span className="h-3 w-3 rounded-full" style={{ backgroundColor: roleColorHex(role) }} />}
                <span style={{ color: role.color ? roleColorHex(role) : undefined }}>{role.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-gsrp-teal-light/40">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-gsrp-teal-light/30">{hint}</span>}
    </label>
  );
}

const inputCls = 'w-full rounded-xl border border-gsrp-dark-border bg-gsrp-dark px-3 py-2 text-sm text-white outline-none focus:border-gsrp-orange/50';

function PerksEditor({ perks, onChange }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    onChange([...perks, v]);
    setDraft('');
  };
  return (
    <div className="space-y-2">
      {perks.map((perk, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={perk}
            onChange={e => onChange(perks.map((p, idx) => idx === i ? e.target.value : p))}
            className={inputCls}
          />
          <button onClick={() => onChange(perks.filter((_, idx) => idx !== i))} className="text-gsrp-teal-light/40 hover:text-red-400">
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="Add a perk / feature line…"
          className={inputCls}
        />
        <button onClick={add} className="rounded-xl border border-gsrp-dark-border bg-gsrp-dark px-3 py-2 text-gsrp-teal-light hover:text-white">
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

function ProductCard({ product, roles, categories, onSaved, onDeleted }) {
  const [draft, setDraft] = useState(product);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [status, setStatus] = useState(null); // { type, text }

  const set = (key, value) => setDraft(d => ({ ...d, [key]: value }));
  const isNew = !product._id;
  const dirty = JSON.stringify(draft) !== JSON.stringify(product);
  const Icon = getShopIcon(draft.iconName);

  async function save() {
    setSaving(true);
    setStatus(null);
    try {
      const method = isNew ? 'POST' : 'PUT';
      const res = await fetch('/api/admin/shop-products', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setStatus({ type: 'success', text: 'Saved' });
      onSaved(data.product, product);
      setDraft(data.product);
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
      setTimeout(() => setStatus(null), 2500);
    }
  }

  async function remove() {
    if (isNew) return onDeleted(product);
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/shop-products?id=${product._id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      onDeleted(product);
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
      setDeleting(false);
    }
  }

  return (
    <div className={`rounded-2xl border p-5 ${draft.enabled === false ? 'border-gsrp-dark-border/40 bg-gsrp-dark-card/30 opacity-70' : 'border-gsrp-dark-border/60 bg-gsrp-dark-card/70'}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gsrp-orange/10 p-2.5 text-gsrp-orange"><Icon className="h-5 w-5" /></div>
          <div>
            <div className="flex items-center gap-2 font-bold text-white">
              {draft.name || 'Untitled product'}
              {draft.featured && <Star size={14} className="text-gsrp-orange" fill="currentColor" />}
            </div>
            <div className="text-xs text-gsrp-teal-light/40">R$ {draft.price} · {isNew ? 'new' : draft.productId}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status && (
            <span className={`inline-flex items-center gap-1 text-xs font-bold ${status.type === 'success' ? 'text-gsrp-teal' : 'text-red-400'}`}>
              {status.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}{status.text}
            </span>
          )}
          <button
            onClick={save}
            disabled={saving || (!dirty && !isNew)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gsrp-orange px-3 py-1.5 text-xs font-bold text-white transition hover:bg-gsrp-orange/90 disabled:opacity-40"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}{isNew ? 'Create' : 'Save'}
          </button>
          <button onClick={remove} disabled={deleting} className="rounded-lg border border-gsrp-dark-border p-1.5 text-gsrp-teal-light/40 hover:text-red-400">
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Name"><input value={draft.name} onChange={e => set('name', e.target.value)} className={inputCls} /></Field>
        <Field label="Price (R$)"><input type="number" min="0" value={draft.price} onChange={e => set('price', e.target.value)} className={inputCls} /></Field>

        <Field label="Category">
          <input
            list="shop-categories"
            value={draft.category}
            onChange={e => set('category', e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Icon">
          <div className="flex items-center gap-2">
            <select value={draft.iconName} onChange={e => set('iconName', e.target.value)} className={inputCls}>
              {SHOP_ICON_OPTIONS.map(opt => <option key={opt.name} value={opt.name}>{opt.label}</option>)}
            </select>
            <div className="rounded-xl border border-gsrp-dark-border bg-gsrp-dark p-2 text-gsrp-orange"><Icon className="h-5 w-5" /></div>
          </div>
        </Field>

        <div className="md:col-span-2">
          <Field label="Description" hint="Optional short subtitle.">
            <input value={draft.description} onChange={e => set('description', e.target.value)} className={inputCls} />
          </Field>
        </div>

        <div className="md:col-span-2">
          <Field label="Perks / feature list">
            <PerksEditor perks={draft.perks || []} onChange={v => set('perks', v)} />
          </Field>
        </div>

        <Field label="Redirect / purchase link" hint="Where 'Purchase' sends the buyer.">
          <input value={draft.link} onChange={e => set('link', e.target.value)} placeholder="https://www.roblox.com/game-pass/…" className={inputCls} />
        </Field>
        <Field label="Roblox Game Pass ID" hint="Used to verify ownership.">
          <input value={draft.gamePassId} onChange={e => set('gamePassId', e.target.value)} placeholder="1288437153" className={inputCls} />
        </Field>

        <Field label="Reward on verified purchase">
          <select value={draft.rewardType} onChange={e => set('rewardType', e.target.value)} className={inputCls}>
            {Object.entries(REWARD_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Overlay badge" hint="e.g. 'Sold Out'. Leave blank for none.">
          <input value={draft.overlay} onChange={e => set('overlay', e.target.value)} className={inputCls} />
        </Field>

        {draft.rewardType === 'roles' && (
          <div className="md:col-span-2 rounded-xl border border-gsrp-dark-border/50 bg-gsrp-dark/40 p-4">
            <Field label="Roles granted on purchase">
              <RolePicker roles={roles} selectedIds={draft.roleIds || []} onChange={v => set('roleIds', v)} />
            </Field>
          </div>
        )}

        <div className="md:col-span-2 flex flex-wrap items-center gap-6 pt-1">
          <label className="flex items-center gap-2 text-sm font-semibold text-gsrp-teal-light/70">
            <input type="checkbox" checked={!!draft.featured} onChange={e => set('featured', e.target.checked)} /> Featured (“Most Popular”)
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-gsrp-teal-light/70">
            <input type="checkbox" checked={draft.enabled !== false} onChange={e => set('enabled', e.target.checked)} /> Visible in store
          </label>
        </div>
      </div>
    </div>
  );
}

export default function ShopAdminPage({ canAccess }) {
  const { data: session, status } = useSession();
  const { hasRefreshed, accessDenied } = useRefreshedUser();
  const [products, setProducts] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    try {
      const res = await fetch('/api/admin/shop-products');
      if (!res.ok) throw new Error('Failed to load shop products');
      const data = await res.json();
      setProducts(data.products || []);
      setRoles(data.roles || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status !== 'authenticated' || !hasRefreshed || accessDenied || !canAccess) return;
    load();
  }, [status, hasRefreshed, accessDenied, canAccess]);

  const categories = useMemo(() => {
    const set = new Set(['premium', 'advertisements', 'donations']);
    products.forEach(p => set.add(p.category));
    return [...set];
  }, [products]);

  const grouped = useMemo(() => {
    const map = {};
    products.forEach(p => { (map[p.category] ||= []).push(p); });
    return map;
  }, [products]);

  function onSaved(saved, previous) {
    setProducts(prev => {
      const idx = prev.findIndex(p => (p._id && p._id === previous._id) || p === previous || p.__tmp === previous.__tmp);
      if (idx === -1) return [...prev, saved];
      const next = [...prev];
      next[idx] = saved;
      return next;
    });
  }

  function onDeleted(target) {
    setProducts(prev => prev.filter(p => p !== target && !(p._id && p._id === target._id)));
  }

  function addProduct(category) {
    setProducts(prev => [...prev, {
      __tmp: `tmp-${Date.now()}`,
      name: '', category, price: 0, description: '', perks: [], link: '',
      gamePassId: '', iconName: category === 'premium' ? 'crown' : category === 'advertisements' ? 'zap' : 'heart',
      featured: false, overlay: '', rewardType: category === 'donations' ? 'none' : category === 'advertisements' ? 'support' : 'roles',
      roleIds: [], enabled: true,
    }]);
  }

  if (status === 'loading' || !hasRefreshed || (loading && canAccess)) return <PageSkeleton variant="form" />;
  if (!session) return <LoginScreen />;
  if (accessDenied) return <AccessDenied {...accessDenied} />;
  if (!canAccess) return <AccessDenied roleId="ADMIN" />;

  return (
    <div className="mx-auto max-w-5xl animate-fade-in-up pb-16">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-white">
            <ShoppingCart className="text-gsrp-orange" /> Shop Manager
          </h1>
          <p className="mt-1 text-sm text-gsrp-teal-light/40">
            Configure every store item — prices, descriptions, links, roles and more. Changes appear on the store within seconds.
          </p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-gsrp-dark-border bg-gsrp-dark-card px-4 py-2.5 text-sm font-bold text-gsrp-teal-light/70 hover:text-white">
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {error && <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

      <datalist id="shop-categories">
        {categories.map(c => <option key={c} value={c} />)}
      </datalist>

      <div className="space-y-10">
        {categories.map(category => (
          <section key={category}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold capitalize text-white">{CATEGORY_LABELS[category] || category}</h2>
              <button
                onClick={() => addProduct(category)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gsrp-orange/40 bg-gsrp-orange/10 px-3 py-1.5 text-xs font-bold text-gsrp-orange hover:bg-gsrp-orange/20"
              >
                <Plus size={14} /> Add item
              </button>
            </div>
            <div className="space-y-4">
              {(grouped[category] || []).length === 0 && (
                <p className="rounded-xl border border-dashed border-gsrp-dark-border/60 py-8 text-center text-sm text-gsrp-teal-light/30">
                  No items yet — click “Add item”.
                </p>
              )}
              {(grouped[category] || []).map(product => (
                <ProductCard
                  key={product._id || product.__tmp}
                  product={product}
                  roles={roles}
                  categories={categories}
                  onSaved={onSaved}
                  onDeleted={onDeleted}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session) return { redirect: { destination: '/login', permanent: false } };
  const { getAllAdminIds } = await import('../../lib/admin-helper');
  const adminIds = await getAllAdminIds();
  return { props: { canAccess: adminIds.includes(String(session.user.id)) } };
}
