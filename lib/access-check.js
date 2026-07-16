import { ROLES } from './auth';

// 5s TTL ensures role revocations are detected within seconds (supports
// fast auto-kick). The inFlight Map dedupes concurrent requests for the same user.
let memberCache = new Map();
let guildRolesCache = null;
let guildRolesFetchedAt = 0;
const MEMBER_CACHE_TTL_MS = 5000;
const MEMBER_NEGATIVE_CACHE_TTL_MS = 10000;
const GUILD_ROLES_CACHE_TTL_MS = 30000;

function getMemberCached(userId) {
  const entry = memberCache.get(userId);
  if (!entry) return null;
  const ttl = entry.roles === null ? MEMBER_NEGATIVE_CACHE_TTL_MS : MEMBER_CACHE_TTL_MS;
  if (Date.now() - entry.ts > ttl) {
    memberCache.delete(userId);
    return null;
  }
  return entry;
}

function setMemberCached(userId, roles) {
  if (memberCache.size > 200) {
    const keys = [...memberCache.keys()].slice(0, 50);
    keys.forEach(k => memberCache.delete(k));
  }
  memberCache.set(userId, { roles, ts: Date.now() });
}

// In-flight dedupe: concurrent requests for the same user share one Discord call.
// Size-limited so the map can't grow uncontrollably under burst traffic.
const inFlight = new Map();
const INFLIGHT_MAX_SIZE = 500;

export async function fetchMemberRoles(userId) {
  const cached = getMemberCached(userId);
  if (cached) return cached.roles;

  if (inFlight.has(userId)) return inFlight.get(userId);

  if (inFlight.size > INFLIGHT_MAX_SIZE) {
    const keys = [...inFlight.keys()].slice(0, Math.floor(INFLIGHT_MAX_SIZE / 2));
    keys.forEach(k => inFlight.delete(k));
  }

  const promise = (async () => {
    try {
      const res = await fetch(
        `https://discord.com/api/guilds/${process.env.ALLOWED_GUILD_ID}/members/${userId}`,
        { headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` } }
      );

      if (!res.ok) {
        // Cache the failure briefly so rate-limited responses don't hammer Discord
        setMemberCached(userId, null);
        return null;
      }

      const member = await res.json();
      const roles = member.roles || [];
      setMemberCached(userId, roles);
      return roles;
    } catch {
      setMemberCached(userId, null);
      return null;
    } finally {
      inFlight.delete(userId);
    }
  })();

  inFlight.set(userId, promise);
  return promise;
}

// Ban lookups hit Discord on every appeal-page load, so cache briefly like
// member roles. Returns { banned: true, reason } on 200, { banned: false } on
// 404, and null when the check itself failed (never treat a failure as a
// ban verdict either way).
const banCache = new Map();
const BAN_CACHE_TTL_MS = 15000;

export async function fetchBanStatus(userId) {
  if (!userId || !process.env.ALLOWED_GUILD_ID || !process.env.DISCORD_BOT_TOKEN) return null;

  const cached = banCache.get(userId);
  if (cached && Date.now() - cached.ts < BAN_CACHE_TTL_MS) return cached.status;

  try {
    const res = await fetch(
      `https://discord.com/api/guilds/${process.env.ALLOWED_GUILD_ID}/bans/${userId}`,
      { headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` } }
    );

    let status = null;
    if (res.ok) {
      const ban = await res.json();
      status = { banned: true, reason: ban?.reason || null };
    } else if (res.status === 404) {
      status = { banned: false };
    } else {
      console.error('[BanCheck] Discord returned', res.status, 'for', userId);
    }

    if (banCache.size > 200) {
      const keys = [...banCache.keys()].slice(0, 50);
      keys.forEach(k => banCache.delete(k));
    }
    if (status) banCache.set(userId, { status, ts: Date.now() });
    return status;
  } catch (err) {
    console.error('[BanCheck] Lookup failed:', err.message);
    return null;
  }
}

export async function fetchGuildRoles() {
  const now = Date.now();
  if (guildRolesCache && now - guildRolesFetchedAt < GUILD_ROLES_CACHE_TTL_MS) {
    return guildRolesCache;
  }

  const res = await fetch(
    `https://discord.com/api/guilds/${process.env.ALLOWED_GUILD_ID}/roles`,
    { headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` } }
  );

  if (!res.ok) return [];

  const roles = await res.json();
  guildRolesCache = roles;
  guildRolesFetchedAt = now;
  return roles;
}

function sessionHasRole(session, roleId) {
  return session?.user?.roles?.includes(roleId) || false;
}

function sessionIsAdmin(session) {
  return session?.user?.isAdmin === true;
}

export async function requireAccess(session, requiredRoleId) {
  if (sessionIsAdmin(session)) return { allowed: true };

  if (sessionHasRole(session, requiredRoleId)) {
    return { allowed: true, source: 'session' };
  }

  const userId = session?.user?.id;
  if (!userId) return { allowed: false };

  try {
    const liveRoles = await fetchMemberRoles(userId);
    if (liveRoles && liveRoles.includes(requiredRoleId)) {
      return { allowed: true, source: 'live' };
    }
  } catch {
  }

  return { allowed: false };
}

export async function requireAnyAccess(session, requiredRoleIds) {
  for (const roleId of requiredRoleIds) {
    const result = await requireAccess(session, roleId);
    if (result.allowed) return result;
  }
  return { allowed: false };
}

export async function hasLiveRole(session, roleId) {
  const result = await requireAccess(session, roleId);
  return result.allowed;
}

export async function getLiveUserRoles(session) {
  const userId = session?.user?.id;
  if (!userId) return session?.user?.roles || [];

  const liveRoles = await fetchMemberRoles(userId);
  return liveRoles || session?.user?.roles || [];
}
