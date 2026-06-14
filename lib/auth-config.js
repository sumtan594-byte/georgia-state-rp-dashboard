export { getResource, getRouteAccess, roleMapFromConfig, userCanAccessResource } from './auth-rules';
import { AUTH_RESOURCES } from './auth-rules';

const CONFIG_ID = 'website-auth-config';
const CACHE_TTL_MS = 5000;
let cachedConfig = null;
let cachedAt = 0;

function normalizeResource(resource) {
  const normalized = {
    key: String(resource.key || '').trim(),
    label: String(resource.label || resource.key || '').trim(),
    paths: Array.isArray(resource.paths) ? resource.paths.map(String).filter(Boolean) : [],
    roleIds: Array.isArray(resource.roleIds) ? resource.roleIds.map(String).filter(Boolean) : [],
    userIds: Array.isArray(resource.userIds) ? resource.userIds.map(String).filter(Boolean) : [],
    adminOnly: resource.adminOnly === true,
    allowAdmins: resource.allowAdmins !== false,
  };

  if (normalized.key === 'transcriptsAll') {
    normalized.paths = [];
  }

  return normalized;
}

function normalizeConfig(config) {
  const resources = Array.isArray(config?.resources) ? config.resources : AUTH_RESOURCES;
  const byKey = new Map(resources.map(r => [r.key, normalizeResource(r)]));

  for (const fallback of AUTH_RESOURCES) {
    if (!byKey.has(fallback.key)) byKey.set(fallback.key, normalizeResource(fallback));
  }

  return {
    version: Number(config?.version || 1),
    resources: [...byKey.values()].filter(r => r.key),
    updatedAt: config?.updatedAt || null,
    updatedBy: config?.updatedBy || null,
  };
}

export function clearAuthConfigCache() {
  cachedConfig = null;
  cachedAt = 0;
}

export async function getAuthConfig({ force = false } = {}) {
  if (!force && cachedConfig && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedConfig;
  }

  const clientPromise = (await import('./mongodb')).default;
  const client = await clientPromise;
  const db = client.db();
  const collection = db.collection('auth_config');
  const now = new Date();
  const existing = await collection.findOne({ _id: CONFIG_ID });

  if (!existing) {
    const seeded = normalizeConfig({ resources: AUTH_RESOURCES, updatedAt: now });
    await collection.insertOne({ _id: CONFIG_ID, ...seeded, createdAt: now });
    cachedConfig = seeded;
    cachedAt = Date.now();
    return seeded;
  }

  const normalized = normalizeConfig(existing);
  cachedConfig = normalized;
  cachedAt = Date.now();
  return normalized;
}

export async function saveAuthConfig(resources, actorId) {
  const clientPromise = (await import('./mongodb')).default;
  const client = await clientPromise;
  const db = client.db();
  const collection = db.collection('auth_config');
  const now = new Date();
  const normalized = normalizeConfig({ resources, updatedAt: now, updatedBy: actorId });

  await collection.updateOne(
    { _id: CONFIG_ID },
    {
      $set: {
        version: Date.now(),
        resources: normalized.resources,
        updatedAt: now,
        updatedBy: actorId || null,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );

  clearAuthConfigCache();
  return getAuthConfig({ force: true });
}

export async function fetchDiscordRoles() {
  const res = await fetch(
    `https://discord.com/api/guilds/${process.env.ALLOWED_GUILD_ID}/roles`,
    { headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` } },
  );
  if (!res.ok) return [];
  const roles = await res.json();
  return roles
    .filter(role => role.name !== '@everyone')
    .sort((a, b) => b.position - a.position)
    .map(role => ({
      id: role.id,
      name: role.name,
      color: role.color || 0,
      icon: role.icon || null,
      iconUrl: role.icon ? `https://cdn.discordapp.com/role-icons/${role.id}/${role.icon}.png?size=64` : null,
      position: role.position || 0,
    }));
}
