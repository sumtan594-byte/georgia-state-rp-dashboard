export async function sendComponentsV2(channelId, payload) {
  const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...payload,
      flags: 1 << 15, // IS_COMPONENTS_V2
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    console.error('[Discord API Error]', error);
    throw new Error(`Discord API error: ${JSON.stringify(error)}`);
  }

  return res.json();
}

export async function sendDM(userId, payload) {
  // Create DM channel
  const dmChannelRes = await fetch(`https://discord.com/api/v10/users/@me/channels`, {
    method: 'POST',
    headers: {
      'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ recipient_id: userId }),
  });

  if (!dmChannelRes.ok) throw new Error('Failed to create DM channel');
  const dmChannel = await dmChannelRes.json();

  // Send message
  return sendComponentsV2(dmChannel.id, payload);
}
export async function addMemberRole(guildId, userId, roleId) {
  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}/roles/${roleId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    console.error(`[Discord Role Error] Failed to add role ${roleId} to ${userId}:`, error);
  }
}

export async function removeMemberRole(guildId, userId, roleId) {
  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}/roles/${roleId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    console.error(`[Discord Role Error] Failed to remove role ${roleId} from ${userId}:`, error);
  }
}
