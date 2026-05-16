const userCache = new Map();
const roleCache = new Map();
const MAX_CACHE_SIZE = 1000;
const CACHE_TTL_MS = 300_000;

function getCachedWithTtl(cache, key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function setCacheWithTtl(cache, key, value) {
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
  cache.set(key, { value, at: Date.now() });
}

export async function enrichUserInfo(userId) {
  const cached = getCachedWithTtl(userCache, userId);
  if (cached) return cached;

  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return { username: userId, avatarUrl: null };

  try {
    const res = await fetch(`https://discord.com/api/users/${userId}`, {
      headers: { Authorization: `Bot ${token}` },
    });
    if (!res.ok) return { username: userId, avatarUrl: null };

    const user = await res.json();
    const avatarUrl = user.avatar
      ? `https://cdn.discordapp.com/avatars/${userId}/${user.avatar}.${user.avatar.startsWith('a_') ? 'gif' : 'png'}?size=64`
      : `https://cdn.discordapp.com/embed/avatars/${Number(user.discriminator) % 5}.png`;
    const result = { username: user.global_name || user.username || userId, avatarUrl };
    setCacheWithTtl(userCache, userId, result);
    return result;
  } catch {
    return { username: userId, avatarUrl: null };
  }
}

export async function enrichRoleInfo(roleId, guildId) {
  const cacheKey = `${guildId}:${roleId}`;
  const cached = getCachedWithTtl(roleCache, cacheKey);
  if (cached) return cached;

  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token || !guildId) return { name: roleId, color: null, iconUrl: null };

  try {
    const res = await fetch(`https://discord.com/api/guilds/${guildId}/roles`, {
      headers: { Authorization: `Bot ${token}` },
    });
    if (!res.ok) return { name: roleId, color: null, iconUrl: null };

    const roles = await res.json();
    const role = roles.find(r => r.id === roleId);
    if (!role) return { name: roleId, color: null, iconUrl: null };

    const color = role.color ? `#${role.color.toString(16).padStart(6, '0')}` : null;
    const iconUrl = role.icon
      ? `https://cdn.discordapp.com/role-icons/${roleId}/${role.icon}.png?size=64`
      : null;
    const result = { name: role.name, color, iconUrl };
    setCacheWithTtl(roleCache, cacheKey, result);
    return result;
  } catch {
    return { name: roleId, color: null, iconUrl: null };
  }
}
