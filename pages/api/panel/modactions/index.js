import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth-options';
import { ROLES, hasRole, isAdmin } from '../../../../lib/auth';
import { sendComponentsV2 } from '../../../../lib/discord-v2';

const NKZ_ROLE_ID = '1372468936867708988';
const SENIOR_ROLES = ['1372491512709124106', '1372491512100950068', '1372479843677245520'];
const BOLO_ROLE_ID = '1390835200145096734';
// Channel for warn logs
const WARN_LOG_CHANNEL = '1474893431686959205';
// Channel for BOLO posts (confirm with user — using the RP log channel as placeholder)
const BOLO_CHANNEL = '1374364814096207892';
const BOLO_PING = '1372479843677245520'; // role ping — use <@&ROLE_ID>

const ERLC_API = 'https://api.erlc.gg';
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const ROBLOX_USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;

function cleanReason(value) {
  return String(value || 'No reason provided')
    .replace(/[\r\n\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'No reason provided';
}

async function sendErlcCommand(command) {
  const ERLC_KEY = process.env.ERLC_API_KEY;
  const res = await fetch(`${ERLC_API}/v2/server/command`, {
    method: 'POST',
    headers: { 'server-key': ERLC_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ command }),
  });
  return res;
}

async function sendDiscordMessage(channelId, payload) {
  const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return res.ok ? res.json() : null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not logged in' });
  if (!hasRole(session, ROLES.PANEL) && !isAdmin(session)) {
    return res.status(403).json({ error: 'Missing required Discord role' });
  }

  const { action, targetUserId, targetUsername, reason } = req.body || {};
  if (!action || !targetUsername) {
    return res.status(400).json({ error: 'Missing action or targetUsername' });
  }

  if (!ROBLOX_USERNAME_RE.test(targetUsername)) {
    return res.status(400).json({ error: 'Invalid Roblox username' });
  }

  if (targetUserId && !/^\d{2,20}$/.test(String(targetUserId))) {
    return res.status(400).json({ error: 'Invalid Roblox user ID' });
  }

  const safeReason = cleanReason(reason);

  const sessionRoles = session.user?.roles || [];
  const isSenior = SENIOR_ROLES.some(r => sessionRoles.includes(r)) || isAdmin(session);
  const isNkz = sessionRoles.includes(NKZ_ROLE_ID) || isAdmin(session);

  try {
    switch (action) {
      case 'warn': {
        // Send in-game PM
        const warnText = safeReason;
        const pmCmd = `:pm ${targetUsername} You are being warned for ${warnText}`;
        const r = await sendErlcCommand(pmCmd);

        // Send warn log to Discord channel
        try {
          await sendDiscordMessage(WARN_LOG_CHANNEL, {
            content: [
              `**⚠️ Player Warning Issued**`,
              `**Player:** ${targetUsername}${targetUserId ? ` (ID: ${targetUserId})` : ''}`,
              `**Reason:** ${warnText}`,
              `**Warned by:** <@${session.user.id}>`,
              `**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`,
            ].join('\n'),
          });
        } catch (discordErr) {
          console.error('[Warn] Discord log failed:', discordErr.message);
        }

        return res.status(r.status === 204 ? 200 : r.status).json({ success: r.ok });
      }

      case 'kick': {
        if (!isNkz) return res.status(403).json({ error: 'Insufficient permissions' });
        const r = await sendErlcCommand(`:kick ${targetUsername} ${safeReason}`);
        return res.status(r.status === 204 ? 200 : r.status).json({ success: r.ok });
      }

      case 'ban': {
        if (!isSenior) return res.status(403).json({ error: 'Senior role required for ban' });
        const id = targetUserId || targetUsername;
        const r = await sendErlcCommand(`:ban ${id}`);
        return res.status(r.status === 204 ? 200 : r.status).json({ success: r.ok });
      }

      case 'bolo': {
        // Only BOLO role holders who are NOT senior can submit BOLOs
        const canBolo = sessionRoles.includes(BOLO_ROLE_ID) && !isSenior;
        if (!canBolo && !isAdmin(session)) {
          return res.status(403).json({ error: 'BOLO role required' });
        }

        // Send Components V2 BOLO message — note: <@&ROLE_ID> for role pings
        const boloMsg = await sendComponentsV2(BOLO_CHANNEL, {
          content: `<@&${BOLO_PING}>`,
          components: [
            {
              type: 17,
              accent_color: 0xEF4444,
              components: [
                {
                  type: 10,
                  content: `## Ban BOLO by <@${session.user.id}>\n**Against:** ${targetUsername}\n**For:** ${safeReason}`,
                },
                { type: 14, divider: true, spacing: 1 },
                {
                  type: 1,
                  components: [
                    {
                      type: 2,
                      style: 3,
                      label: 'Complete',
                      custom_id: `bolo_complete:${targetUserId || targetUsername}:PLACEHOLDER`,
                    },
                    {
                      type: 2,
                      style: 4,
                      label: 'Invalidate',
                      custom_id: `bolo_invalidate:${targetUserId || targetUsername}:PLACEHOLDER`,
                    },
                  ],
                },
              ],
            },
          ],
        });

        // Patch the message to put the real message ID in custom_ids
        if (boloMsg?.id) {
          await fetch(`https://discord.com/api/v10/channels/${BOLO_CHANNEL}/messages/${boloMsg.id}`, {
            method: 'PATCH',
            headers: {
              Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              flags: 1 << 15,
              components: [
                {
                  type: 17,
                  accent_color: 0xEF4444,
                  components: [
                    {
                      type: 10,
                      content: `## Ban BOLO by <@${session.user.id}>\n**Against:** ${targetUsername}\n**For:** ${safeReason}`,
                    },
                    { type: 14, divider: true, spacing: 1 },
                    {
                      type: 1,
                      components: [
                        {
                          type: 2,
                          style: 3,
                          label: 'Complete',
                          custom_id: `bolo_complete:${targetUserId || targetUsername}:${boloMsg.id}`,
                        },
                        {
                          type: 2,
                          style: 4,
                          label: 'Invalidate',
                          custom_id: `bolo_invalidate:${targetUserId || targetUsername}:${boloMsg.id}`,
                        },
                      ],
                    },
                  ],
                },
              ],
            }),
          });
        }

        return res.status(200).json({ success: true, messageId: boloMsg?.id });
      }

      case 'message': {
        const r = await sendErlcCommand(`:m ${targetUsername} ${safeReason}`);
        return res.status(r.status === 204 ? 200 : r.status).json({ success: r.ok });
      }

      case 'load': {
        if (!isNkz) return res.status(403).json({ error: 'Insufficient permissions' });
        const r = await sendErlcCommand(`:load ${targetUsername}`);
        return res.status(r.status === 204 ? 200 : r.status).json({ success: r.ok });
      }

      case 'jail': {
        if (!isNkz) return res.status(403).json({ error: 'Insufficient permissions' });
        const r = await sendErlcCommand(`:jail ${targetUsername}`);
        return res.status(r.status === 204 ? 200 : r.status).json({ success: r.ok });
      }

      default:
        return res.status(400).json({ error: 'Unknown action' });
    }
  } catch (err) {
    console.error('[ModAction]', err);
    return res.status(500).json({ error: 'Failed to process moderation action' });
  }
}
