import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth-options';
import { ROLES } from '../../../../lib/auth';
import { requireAccess } from '../../../../lib/access-check';
import clientPromise from '../../../../lib/mongodb';
import { sendComponentsV2 } from '../../../../lib/discord-v2';

const RP_LOG_CHANNEL = '1374364814096207892';
const BASE_URL = process.env.NEXTAUTH_URL || 'https://join-gsrp.com';

async function getCol() {
  const client = await clientPromise;
  return client.db().collection('roleplay_logs');
}

function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not logged in' });
  const access = await requireAccess(session, ROLES.PANEL);
  if (!access.allowed) {
    return res.status(403).json({ error: 'Missing required Discord role' });
  }

  if (req.method === 'GET') {
    try {
      const col = await getCol();
      const logs = await col.find({ active: true }).sort({ createdAt: -1 }).toArray();
      return res.status(200).json(logs.map(l => ({ ...l, _id: l._id.toString() })));
    } catch (err) {
      console.error('[RP] List error:', err.message);
      return res.status(500).json({ error: 'Failed to fetch roleplay logs' });
    }
  }

  if (req.method === 'POST') {
    const { robloxUsername, robloxUserId, roleplayType, location, durationMs, pinX, pinY } = req.body || {};
    if (!robloxUsername || !roleplayType || !location || !durationMs) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      const col = await getCol();
      const rpId = `rp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const expiresAt = new Date(Date.now() + durationMs);

      const doc = {
        rpId,
        robloxUsername,
        robloxUserId: robloxUserId || null,
        roleplayType,
        location,
        pinX: pinX ?? null,
        pinY: pinY ?? null,
        durationMs,
        expiresAt,
        createdAt: new Date(),
        moderatorId: session.user.id,
        moderatorName: session.user.name,
        active: true,
        discordMessageId: null,
      };

      await col.insertOne(doc);

      // Discord notification
      try {
        const deepLink = `${BASE_URL}/panel/rp-${rpId}`;
        const msg = await sendComponentsV2(RP_LOG_CHANNEL, {
          components: [
            {
              type: 17,
              accent_color: 0xF97316,
              components: [
                { type: 10, content: '## Roleplay Logged' },
                { type: 14, divider: true, spacing: 1 },
                {
                  type: 10,
                  content: [
                    `**Player:** ${robloxUsername}`,
                    `**Type:** ${roleplayType}`,
                    `**Location:** ${location}`,
                    `**Duration:** ${formatDuration(durationMs)}`,
                    `**Logged by:** <@${session.user.id}>`,
                  ].join('\n'),
                },
                {
                  type: 1,
                  components: [
                    { type: 2, style: 5, label: 'View Info', url: deepLink },
                  ],
                },
              ],
            },
          ],
        });
        await col.updateOne({ rpId }, { $set: { discordMessageId: msg.id } });
      } catch (discordErr) {
        console.error('[RP] Discord notification failed:', discordErr.message);
      }

      const inserted = await col.findOne({ rpId });
      return res.status(201).json({ ...inserted, _id: inserted._id.toString() });
    } catch (err) {
      console.error('[RP] Create error:', err.message);
      return res.status(500).json({ error: 'Failed to create roleplay log' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
