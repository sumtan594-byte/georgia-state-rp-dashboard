import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth-options';
import clientPromise from '../../../lib/mongodb';
import { getAuthConfig, roleMapFromConfig } from '../../../lib/auth-config';

const dataCache = new Map();
const MEMBER_CACHE_TTL_MS = 5000;
const GUILD_ROLES_CACHE_TTL_MS = 60000;

function getCached(key, ttlMs) {
  const entry = dataCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > ttlMs) {
    dataCache.delete(key);
    return null;
  }
  return entry;
}

function setCached(key, data) {
  if (dataCache.size > 500) {
    const keys = [...dataCache.keys()].slice(0, 100);
    keys.forEach(k => dataCache.delete(k));
  }
  dataCache.set(key, { data, ts: Date.now() });
}

export function invalidateUserRefreshCache(userId, options = {}) {
  if (userId) {
    dataCache.delete(`member_${userId}`);
  }
  if (options.guildRoles) {
    dataCache.delete('guild_roles');
  }
}

function getRateLimit(res, status) {
  const remaining = res.headers.get('X-RateLimit-Remaining');
  const resetAfter = res.headers.get('X-RateLimit-Reset-After');
  const retryAfter = res.headers.get('Retry-After');
  const scope = res.headers.get('X-RateLimit-Scope');
  const isGlobal = res.headers.get('X-RateLimit-Global');
  return {
    remaining: remaining !== null ? parseInt(remaining, 10) : null,
    resetAfter: resetAfter !== null ? parseFloat(resetAfter) : null,
    retryAfter: retryAfter !== null ? parseFloat(retryAfter) : null,
    scope: scope || null,
    isGlobal: isGlobal === 'true',
    status,
  };
}

async function getDbAdminIds() {
  try {
    const client = await clientPromise;
    const db = client.db();
    const docs = await db.collection('admins').find({}).project({ userId: 1, _id: 0 }).toArray();
    return docs.map(d => d.userId).filter(Boolean);
  } catch {
    return [];
  }
}

async function fetchGuildRoles() {
  const cacheKey = 'guild_roles';
  const cached = getCached(cacheKey, GUILD_ROLES_CACHE_TTL_MS);
  if (cached) return { ...cached, cached: true, rateLimit: null };

  const res = await fetch(
    `https://discord.com/api/guilds/${process.env.ALLOWED_GUILD_ID}/roles`,
    { headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` } }
  );

  const rateLimit = getRateLimit(res, res.status);

  if (!res.ok) return { data: null, cached: false, rateLimit };
  const roles = await res.json();
  setCached(cacheKey, roles, res.headers);
  return { data: roles, cached: false, rateLimit };
}

async function fetchMember(userId) {
  const cacheKey = `member_${userId}`;
  const cached = getCached(cacheKey, MEMBER_CACHE_TTL_MS);
  if (cached) return { ...cached, cached: true, rateLimit: null };

  const res = await fetch(
    `https://discord.com/api/guilds/${process.env.ALLOWED_GUILD_ID}/members/${userId}`,
    { headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` } }
  );

  const rateLimit = getRateLimit(res, res.status);

  if (!res.ok) return { data: null, cached: false, rateLimit };
  const member = await res.json();
  setCached(cacheKey, member, res.headers);
  return { data: member, cached: false, rateLimit };
}

export default async function handler(req, res) {
  // Prevent any caching layer from serving stale role data, critical for fast auto-kick
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not logged in' });

  const userId = session.user.id;

  try {
    const [memberResult, rolesResult, authConfig] = await Promise.all([
      fetchMember(userId),
      fetchGuildRoles(),
      getAuthConfig(),
    ]);

    const member = memberResult?.data || null;
    const allRoles = rolesResult?.data || null;

    const liveRateLimits = [memberResult.rateLimit, rolesResult.rateLimit].filter(Boolean);
    const mostStrict = liveRateLimits.reduce((acc, rl) => {
      if (!acc) return rl;
      const accRem = acc.remaining ?? Infinity;
      const rlRem = rl.remaining ?? Infinity;
      return rlRem < accRem ? rl : acc;
    }, null);

    if (!member) {
      return res.status(200).json({
        error: 'Failed to fetch member',
        roles: [],
        displayRole: 'User',
        _ratelimit: mostStrict ? { remaining: mostStrict.remaining, resetAfter: mostStrict.resetAfter } : null,
      });
    }

    const roles = member.roles || [];
    let displayRole = 'User';
    let discordRoles = [];

    if (allRoles) {
      const userRoles = allRoles.filter(r => roles.includes(r.id));
      userRoles.sort((a, b) => b.position - a.position);

      for (const role of userRoles) {
        if (role.name.includes('────')) continue;
        if (role.id === '1391175328545636444') { displayRole = 'Donator +'; break; }
        if (role.id === '1372482493701165118') { displayRole = 'Donator'; break; }
        if (role.id === '1438063270631182376') { displayRole = 'Former foundation member'; break; }
        if (role.id === '1372481017436438579') { displayRole = 'Retired staff member'; break; }
        displayRole = role.name;
        break;
      }

      discordRoles = allRoles.filter(r => roles.includes(r.id)).map(r => ({
        id: r.id,
        name: r.name,
        color: r.color || 0,
        iconUrl: r.icon ? `https://cdn.discordapp.com/role-icons/${r.id}/${r.icon}.png?size=64` : null,
      }));
    }

    const envAdminIds = (process.env.ADMIN_USER_IDS || '').split(',').map(i => i.trim()).filter(Boolean);
    const dbAdminIds = await getDbAdminIds();
    const allAdminIds = [...new Set([...envAdminIds, ...dbAdminIds])];
    const isAdminUser = allAdminIds.includes(member.user?.id || userId);

    const roleMap = roleMapFromConfig(authConfig);
    if (allRoles) {
      for (const role of allRoles) {
        if (roleMap[role.id]) {
          roleMap[role.id] = {
            ...roleMap[role.id],
            name: role.name,
            color: role.color || 0,
            iconUrl: role.icon ? `https://cdn.discordapp.com/role-icons/${role.id}/${role.icon}.png?size=64` : null,
          };
        }
      }
    }

    return res.status(200).json({
      id: member.user?.id || userId,
      name: member.user?.global_name || member.user?.username || session.user.name,
      username: member.user?.username || '',
      avatar: member.user?.avatar
        ? `https://cdn.discordapp.com/avatars/${member.user.id}/${member.user.avatar}.png`
        : session.user.image,
      roles,
      displayRole,
      isAdmin: isAdminUser,
      discordRoles,
      authConfig,
      roleMap,
      _ratelimit: mostStrict ? { remaining: mostStrict.remaining, resetAfter: mostStrict.resetAfter } : null,
    });
  } catch (err) {
    console.error('[user/refresh] Error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
