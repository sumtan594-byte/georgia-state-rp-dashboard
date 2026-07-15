import { ObjectId } from 'mongodb';
import clientPromise from './mongodb';
import {
  PRODUCTS as STATIC_PRODUCTS,
  DONATION_PERKS,
  SHOP_SUPPORT_CHANNEL_URL,
} from './shop-catalog';

export { SHOP_SUPPORT_CHANNEL_URL };

const COLLECTION = 'shop_products';

// Canonical category order + friendly labels used by the storefront tabs.
// New categories created by admins fall back to a title-cased label.
export const CATEGORY_ORDER = ['premium', 'advertisements', 'donations'];
export const CATEGORY_LABELS = {
  premium: 'Premium',
  advertisements: 'Paid Advertisements',
  donations: 'Donations',
};

export const REWARD_TYPES = ['none', 'support', 'roles'];

let seedPromise = null;

async function getCollection() {
  const client = await clientPromise;
  return client.db().collection(COLLECTION);
}

function buildSeedDocs() {
  const now = new Date();
  const docs = [];
  Object.entries(STATIC_PRODUCTS).forEach(([category, products]) => {
    products.forEach((p, index) => {
      docs.push({
        productId: p.id,
        category,
        name: p.name,
        description: p.description || '',
        price: Number(p.price) || 0,
        perks: Array.isArray(p.perks)
          ? p.perks
          : category === 'donations'
            ? [...DONATION_PERKS]
            : [],
        link: p.link && p.link !== '#' ? p.link : '',
        gamePassId: p.gamePassId ? String(p.gamePassId) : '',
        iconName: p.iconName || 'heart',
        featured: Boolean(p.featured),
        overlay: p.overlay || '',
        rewardType: p.rewardType || 'none',
        roleIds: Array.isArray(p.roleIds) ? p.roleIds.map(String) : [],
        enabled: true,
        order: index,
        createdAt: now,
        updatedAt: now,
      });
    });
  });
  return docs;
}

// Seed the collection from the legacy hardcoded catalog exactly once, only
// when it is empty. Concurrent callers share a single seed attempt.
export async function ensureSeeded() {
  const col = await getCollection();
  const count = await col.countDocuments({}, { limit: 1 });
  if (count > 0) return;

  if (!seedPromise) {
    seedPromise = (async () => {
      const docs = buildSeedDocs();
      if (docs.length) {
        await col.insertMany(docs, { ordered: false });
      }
    })().catch(err => {
      console.error('[shop-products-db] seed failed:', err.message);
    }).finally(() => {
      seedPromise = null;
    });
  }
  await seedPromise;
}

function serialize(doc) {
  if (!doc) return null;
  return {
    _id: doc._id ? String(doc._id) : undefined,
    productId: doc.productId,
    category: doc.category,
    name: doc.name || '',
    description: doc.description || '',
    price: Number(doc.price) || 0,
    perks: Array.isArray(doc.perks) ? doc.perks : [],
    link: doc.link || '',
    gamePassId: doc.gamePassId ? String(doc.gamePassId) : '',
    iconName: doc.iconName || 'heart',
    featured: Boolean(doc.featured),
    overlay: doc.overlay || '',
    rewardType: doc.rewardType || 'none',
    roleIds: Array.isArray(doc.roleIds) ? doc.roleIds.map(String) : [],
    enabled: doc.enabled !== false,
    order: Number.isFinite(doc.order) ? doc.order : 0,
  };
}

// Full flat list for the admin editor (includes disabled products).
export async function getAllProducts() {
  await ensureSeeded();
  const col = await getCollection();
  const docs = await col
    .find({})
    .sort({ category: 1, order: 1, _id: 1 })
    .toArray();
  return docs.map(serialize);
}

// Enabled products grouped by category for the public storefront.
export async function getPublicProducts() {
  await ensureSeeded();
  const col = await getCollection();
  const docs = await col
    .find({ enabled: { $ne: false } })
    .sort({ order: 1, _id: 1 })
    .toArray();

  const grouped = {};
  for (const doc of docs) {
    const item = serialize(doc);
    (grouped[item.category] ||= []).push(item);
  }

  const presentCategories = Object.keys(grouped);
  const orderedCategories = [
    ...CATEGORY_ORDER.filter(c => presentCategories.includes(c)),
    ...presentCategories.filter(c => !CATEGORY_ORDER.includes(c)).sort(),
  ];

  return {
    products: grouped,
    categories: orderedCategories.map(key => ({
      key,
      label: CATEGORY_LABELS[key] || titleCase(key),
    })),
  };
}

// Flat list of enabled products, used by the purchase-verification API.
export async function getProductList() {
  await ensureSeeded();
  const col = await getCollection();
  const docs = await col.find({ enabled: { $ne: false } }).toArray();
  return docs.map(serialize);
}

export async function findProductById(productId) {
  if (!productId) return null;
  await ensureSeeded();
  const col = await getCollection();
  const doc = await col.findOne({ productId: String(productId), enabled: { $ne: false } });
  return serialize(doc);
}

function titleCase(str) {
  return String(str || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}

// ---- Admin mutations -------------------------------------------------------

function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

// Normalise + validate an incoming product payload. Returns { value } or { error }.
function normalizeInput(body, { partial = false } = {}) {
  const out = {};

  if (body.name !== undefined || !partial) {
    const name = String(body.name ?? '').trim();
    if (!name) return { error: 'Name is required.' };
    out.name = name.slice(0, 120);
  }
  if (body.category !== undefined || !partial) {
    const category = slugify(body.category ?? '');
    if (!category) return { error: 'Category is required.' };
    out.category = category;
  }
  if (body.price !== undefined || !partial) {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 0) return { error: 'Price must be a non-negative number.' };
    out.price = Math.round(price);
  }
  if (body.description !== undefined) out.description = String(body.description).slice(0, 1000);
  if (body.perks !== undefined) {
    const perks = Array.isArray(body.perks) ? body.perks : [];
    out.perks = perks.map(p => String(p).trim()).filter(Boolean).slice(0, 20);
  }
  if (body.link !== undefined) {
    const link = String(body.link).trim();
    if (link && !/^https?:\/\//i.test(link)) return { error: 'Redirect link must start with http:// or https://' };
    out.link = link.slice(0, 500);
  }
  if (body.gamePassId !== undefined) {
    const gp = String(body.gamePassId).trim();
    if (gp && !/^\d+$/.test(gp)) return { error: 'Game Pass ID must be numeric.' };
    out.gamePassId = gp;
  }
  if (body.iconName !== undefined) out.iconName = slugify(body.iconName) || 'heart';
  if (body.featured !== undefined) out.featured = Boolean(body.featured);
  if (body.overlay !== undefined) out.overlay = String(body.overlay).trim().slice(0, 40);
  if (body.rewardType !== undefined || !partial) {
    const rewardType = String(body.rewardType || 'none');
    if (!REWARD_TYPES.includes(rewardType)) return { error: `Reward type must be one of: ${REWARD_TYPES.join(', ')}` };
    out.rewardType = rewardType;
  }
  if (body.roleIds !== undefined) {
    const roleIds = Array.isArray(body.roleIds) ? body.roleIds : [];
    const clean = roleIds.map(String).filter(id => /^\d+$/.test(id));
    out.roleIds = [...new Set(clean)];
  }
  if (body.enabled !== undefined) out.enabled = Boolean(body.enabled);
  if (body.order !== undefined) {
    const order = Number(body.order);
    out.order = Number.isFinite(order) ? Math.round(order) : 0;
  }

  return { value: out };
}

export async function createProduct(body) {
  const { value, error } = normalizeInput(body, { partial: false });
  if (error) return { error };

  const col = await getCollection();
  const now = new Date();

  // Derive a stable, unique productId from the requested id or the name.
  let base = slugify(body.productId || value.name) || 'product';
  let productId = base;
  let suffix = 1;
  while (await col.findOne({ productId })) {
    productId = `${base}-${suffix++}`;
  }

  const doc = {
    productId,
    category: value.category,
    name: value.name,
    description: value.description || '',
    price: value.price ?? 0,
    perks: value.perks || [],
    link: value.link || '',
    gamePassId: value.gamePassId || '',
    iconName: value.iconName || 'heart',
    featured: value.featured || false,
    overlay: value.overlay || '',
    rewardType: value.rewardType || 'none',
    roleIds: value.roleIds || [],
    enabled: value.enabled !== undefined ? value.enabled : true,
    order: value.order ?? 999,
    createdAt: now,
    updatedAt: now,
  };

  const result = await col.insertOne(doc);
  return { product: serialize({ ...doc, _id: result.insertedId }) };
}

export async function updateProduct(id, body) {
  if (!id || !ObjectId.isValid(id)) return { error: 'Invalid product id.' };
  const { value, error } = normalizeInput(body, { partial: true });
  if (error) return { error };

  const col = await getCollection();
  value.updatedAt = new Date();

  const result = await col.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: value },
    { returnDocument: 'after' },
  );

  const doc = result?.value || result; // driver version compatibility
  if (!doc) return { error: 'Product not found.' };
  return { product: serialize(doc) };
}

export async function deleteProduct(id) {
  if (!id || !ObjectId.isValid(id)) return { error: 'Invalid product id.' };
  const col = await getCollection();
  const result = await col.deleteOne({ _id: new ObjectId(id) });
  if (!result.deletedCount) return { error: 'Product not found.' };
  return { deleted: true };
}
