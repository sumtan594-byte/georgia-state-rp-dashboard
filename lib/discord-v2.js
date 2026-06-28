const DISCORD_API_BASE = 'https://discord.com/api/v10'
const MAX_DISCORD_RETRIES = 4

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function getRetryDelayMs(res, body, attempt) {
  const retryAfterSeconds = Number(body?.retry_after)
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return Math.ceil(retryAfterSeconds * 1000) + 250
  }

  const retryAfterHeader = Number(res.headers.get('retry-after'))
  if (Number.isFinite(retryAfterHeader) && retryAfterHeader > 0) {
    return Math.ceil(retryAfterHeader * 1000) + 250
  }

  return Math.min(1000 * 2 ** attempt, 8000)
}

async function discordFetch(url, options = {}, label = 'Discord request') {
  let lastBody = null

  for (let attempt = 0; attempt <= MAX_DISCORD_RETRIES; attempt++) {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        ...(options.headers || {}),
      },
    })

    const body = await res.json().catch(() => ({}))
    lastBody = body

    if (res.ok) return { ok: true, status: res.status, body }

    const shouldRetry = res.status === 429 || res.status >= 500
    if (!shouldRetry || attempt === MAX_DISCORD_RETRIES) {
      console.error(`[Discord API Error] ${label}:`, body)
      return { ok: false, status: res.status, body }
    }

    const delayMs = getRetryDelayMs(res, body, attempt)
    console.warn(`[Discord API Retry] ${label} failed with ${res.status}; retrying in ${delayMs}ms (${attempt + 1}/${MAX_DISCORD_RETRIES})`)
    await sleep(delayMs)
  }

  return { ok: false, status: 0, body: lastBody || {} }
}

export async function sendComponentsV2(channelId, payload) {
  const result = await discordFetch(`${DISCORD_API_BASE}/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...payload,
      flags: 1 << 15, // IS_COMPONENTS_V2
    }),
  }, `Failed to send components message to channel ${channelId}`);

  if (!result.ok) {
    throw new Error(`Discord API error: ${JSON.stringify(result.body)}`);
  }

  return result.body;
}

export async function sendDM(userId, payload) {
  // Create DM channel
  const dmChannelResult = await discordFetch(`${DISCORD_API_BASE}/users/@me/channels`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ recipient_id: userId }),
  }, `Failed to create DM channel for ${userId}`);

  if (!dmChannelResult.ok) throw new Error('Failed to create DM channel');

  // Send message
  return sendComponentsV2(dmChannelResult.body.id, payload);
}
export async function addMemberRole(guildId, userId, roleId) {
  const result = await discordFetch(
    `${DISCORD_API_BASE}/guilds/${guildId}/members/${userId}/roles/${roleId}`,
    { method: 'PUT' },
    `Failed to add role ${roleId} to ${userId}`
  );

  return result.ok;
}

export async function removeMemberRole(guildId, userId, roleId) {
  const result = await discordFetch(
    `${DISCORD_API_BASE}/guilds/${guildId}/members/${userId}/roles/${roleId}`,
    { method: 'DELETE' },
    `Failed to remove role ${roleId} from ${userId}`
  );

  return result.ok;
}

export async function getGuildMember(guildId, userId) {
  const result = await discordFetch(
    `${DISCORD_API_BASE}/guilds/${guildId}/members/${userId}`,
    {},
    `Failed to get member ${userId}`
  );

  if (!result.ok) return null;

  return result.body;
}

export async function searchGuildMembers(guildId, query, limit = 25) {
  const params = new URLSearchParams({ query, limit: String(Math.min(Math.max(limit, 1), 100)) })
  const result = await discordFetch(
    `${DISCORD_API_BASE}/guilds/${guildId}/members/search?${params.toString()}`,
    {},
    `Failed to search members in ${guildId}`
  );

  if (!result.ok || !Array.isArray(result.body)) return [];

  return result.body.map(m => ({
    id: m.user?.id,
    username: m.user?.username,
    globalName: m.user?.global_name || null,
    nick: m.nick || null,
    displayName: m.nick || m.user?.global_name || m.user?.username || 'Unknown',
    avatar: m.user?.avatar
      ? `https://cdn.discordapp.com/avatars/${m.user.id}/${m.user.avatar}.png?size=64`
      : `https://cdn.discordapp.com/embed/avatars/${(Number(m.user?.id || 0) >> 22) % 6}.png`,
  })).filter(m => m.id);
}

export async function modifyGuildMember(guildId, userId, data) {
  const result = await discordFetch(`${DISCORD_API_BASE}/guilds/${guildId}/members/${userId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  }, `Failed to modify member ${userId}`);

  if (!result.ok) return null;

  return result.body;
}
