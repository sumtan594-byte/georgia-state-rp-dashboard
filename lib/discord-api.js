const userCache = new Map();
const roleCache = new Map();

export async function enrichUserInfo(userId) {
  if (userCache.has(userId)) return userCache.get(userId);

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
    userCache.set(userId, result);
    return result;
  } catch {
    return { username: userId, avatarUrl: null };
  }
}

export async function enrichRoleInfo(roleId, guildId) {
  const cacheKey = `${guildId}:${roleId}`;
  if (roleCache.has(cacheKey)) return roleCache.get(cacheKey);

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
    roleCache.set(cacheKey, result);
    return result;
  } catch {
    return { name: roleId, color: null, iconUrl: null };
  }
}
