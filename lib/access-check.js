import { ROLES } from './auth';

let memberCache = new Map();
let guildRolesCache = null;
let guildRolesFetchedAt = 0;
const MEMBER_CACHE_TTL_MS = 10000;
const GUILD_ROLES_CACHE_TTL_MS = 60000;

function getMemberCached(userId) {
  const entry = memberCache.get(userId);
  if (!entry) return null;
  if (Date.now() - entry.ts > MEMBER_CACHE_TTL_MS) {
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

async function fetchMemberRoles(userId) {
  const cached = getMemberCached(userId);
  if (cached) return cached.roles;

  const res = await fetch(
    `https://discord.com/api/guilds/${process.env.ALLOWED_GUILD_ID}/members/${userId}`,
    { headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` } }
  );

  if (!res.ok) return null;

  const member = await res.json();
  const roles = member.roles || [];
  setMemberCached(userId, roles);
  return roles;
}

async function fetchGuildRoles() {
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
