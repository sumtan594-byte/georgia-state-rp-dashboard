import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth-options';
import { ROLES } from '../../../../lib/auth';
import { requireAccess } from '../../../../lib/access-check';
import clientPromise from '../../../../lib/mongodb';

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const RP_LOG_CHANNEL = '1374364814096207892';

async function getCol() {
  const client = await clientPromise;
  return client.db().collection('roleplay_logs');
}

async function editDiscordMessage(messageId, channelId, components) {
  if (!messageId || !DISCORD_BOT_TOKEN) return;
  await fetch(`https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ flags: 1 << 15, components }),
  });
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not logged in' });
  const access = await requireAccess(session, ROLES.PANEL);
  if (!access.allowed) {
    return res.status(403).json({ error: 'Missing required Discord role' });
  }

  const { id } = req.query;
  const col = await getCol();

  if (req.method === 'GET') {
    const log = await col.findOne({ rpId: id });
    if (!log) return res.status(404).json({ error: 'Not found' });
    return res.status(200).json({ ...log, _id: log._id.toString() });
  }

  if (req.method === 'PATCH') {
    const { action, durationMs, pinX, pinY, location } = req.body || {};
    const log = await col.findOne({ rpId: id });
    if (!log) return res.status(404).json({ error: 'Not found' });

    if (action === 'end') {
      await col.updateOne({ rpId: id }, { $set: { active: false, endedAt: new Date() } });
      if (log.discordMessageId) {
        await editDiscordMessage(log.discordMessageId, RP_LOG_CHANNEL, [
          {
            type: 17,
            accent_color: 0x6B7280,
            components: [
              {
                type: 10,
                content: `## ~~Roleplay Ended~~\n**Player:** ${log.robloxUsername}\n**Type:** ${log.roleplayType}\n**Ended by:** <@${session.user.id}>`,
              },
            ],
          },
        ]);
      }
      return res.status(200).json({ success: true });
    }

    if (action === 'expire') {
      await col.updateOne({ rpId: id }, { $set: { active: false, endedAt: new Date(), status: 'expired' } });
      if (log.discordMessageId) {
        await editDiscordMessage(log.discordMessageId, RP_LOG_CHANNEL, [
          {
            type: 17,
            accent_color: 0x6B7280,
            components: [
              {
                type: 10,
                content: `## ⌛ Roleplay Expired\n**Player:** ${log.robloxUsername}\n**Type:** ${log.roleplayType}\n**Status:** Naturally expired`,
              },
            ],
          },
        ]);
      }
      return res.status(200).json({ success: true });
    }

    if (action === 'extend' && durationMs) {
      const currentExpiry = new Date(log.expiresAt);
      const base = currentExpiry > new Date() ? currentExpiry : new Date();
      const newExpires = new Date(base.getTime() + durationMs);
      await col.updateOne({ rpId: id }, { $set: { expiresAt: newExpires } });
      return res.status(200).json({ success: true, expiresAt: newExpires });
    }

    if (action === 'move' && pinX !== undefined && pinY !== undefined) {
      await col.updateOne({ rpId: id }, { $set: { pinX, pinY, location: location || log.location } });
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
