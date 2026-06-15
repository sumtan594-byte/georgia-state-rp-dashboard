import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth-options';
import { ROLES, isAdmin } from '../../../../lib/auth';
import { requireAccess } from '../../../../lib/access-check';
import { sendComponentsV2 } from '../../../../lib/discord-v2';
import { addPanelPlayerOffence } from '../../../../lib/sessions-offences-db';

const NKZ_ROLE_ID = '1372468936867708988';
const BAN_ROLE_IDS = ['1372479843677245520', '1372491512100950068'];
const BOLO_ROLE_ID = '1390835200145096734';
const MODERATION_LOG_CHANNEL = '1491721430876815400';
const BOLO_CHANNEL = '1516048196944658432';
const BOLO_PING = '1372479843677245520';

const ERLC_API = 'https://api.erlc.gg';
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const ROBLOX_USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;

function cleanReason(value) {
  return String(value || '')
    .replace(/[\r\n\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);
}

function cleanDiscordText(value, fallback = 'Unknown') {
  return String(value || fallback)
    .replace(/[\r\n\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300) || fallback;
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

function staffDisplayName(session) {
  return cleanDiscordText(
    session.user?.global_name ||
    session.user?.name ||
    session.user?.username ||
    session.user?.email ||
    session.user?.id,
    'Panel Staff'
  );
}

const ACTION_LOG_META = {
  warn: { key: 'panel_warn', name: 'Panel Warning', taken: 'Warning', color: 0xF59E0B },
  kick: { key: 'panel_kick', name: 'Panel Kick', taken: 'Kick', color: 0xFBBF24 },
  ban: { key: 'panel_ban', name: 'Panel Ban', taken: 'Ban', color: 0xEF4444 },
  bolo: { key: 'panel_ban_bolo', name: 'Panel Ban BOLO', taken: 'Ban BOLO', color: 0xEF4444 },
  message: { key: 'panel_message', name: 'Panel Message', taken: 'Message', color: 0x60A5FA },
  load: { key: 'panel_load', name: 'Panel Load', taken: 'Load', color: 0x14B8A6 },
  jail: { key: 'panel_jail', name: 'Panel Jail', taken: 'Jail', color: 0x8B5CF6 },
};

async function recordPanelModeration({ session, action, targetUsername, targetUserId, reason, erlcOk, erlcStatus, messageId }) {
  const meta = ACTION_LOG_META[action];
  if (!meta) return;

  const staffName = staffDisplayName(session);
  const evidence = [
    reason ? `Reason: ${reason}` : null,
    targetUserId ? `Roblox ID: ${targetUserId}` : null,
    messageId ? `Discord message: ${messageId}` : null,
    erlcStatus ? `ERLC status: ${erlcStatus}` : null,
    erlcOk === false ? 'ERLC command failed' : null,
  ].filter(Boolean).join(' | ');

  await addPanelPlayerOffence({
    playerName: targetUsername,
    offenceKey: meta.key,
    offenceName: meta.name,
    actionTaken: meta.taken,
    evidence,
    issuedBy: staffName,
  });

  await sendComponentsV2(MODERATION_LOG_CHANNEL, {
    allowed_mentions: { parse: [] },
    components: [
      {
        type: 17,
        accent_color: meta.color,
        components: [
          { type: 10, content: `## Player Moderation: ${meta.taken}` },
          {
            type: 10,
            content: [
              `**Player:** ${targetUsername}${targetUserId ? ` (${targetUserId})` : ''}`,
              `**Staff:** ${staffName} (<@${session.user.id}>)`,
              reason ? `**Reason:** ${reason}` : '**Reason:** Not required for this action',
              `**Source:** Website panel`,
              `**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`,
            ].join('\n'),
          },
        ],
      },
    ],
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not logged in' });
  const panelAccess = await requireAccess(session, ROLES.PANEL);
  if (!panelAccess.allowed) {
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
  if (action !== 'message' && !safeReason) {
    return res.status(400).json({ error: 'Reason required' });
  }

  const sessionRoles = session.user?.roles || [];
  const canBan = BAN_ROLE_IDS.some(r => sessionRoles.includes(r)) || isAdmin(session);
  const canBolo = sessionRoles.includes(BOLO_ROLE_ID) || isAdmin(session);
  const isNkz = sessionRoles.includes(NKZ_ROLE_ID) || isAdmin(session);

  try {
    switch (action) {
      case 'warn': {
        // Send in-game PM
        const warnText = safeReason;
        const pmCmd = `:pm ${targetUsername} You are being warned for ${warnText}`;
        const r = await sendErlcCommand(pmCmd);
        await recordPanelModeration({ session, action, targetUsername, targetUserId, reason: warnText, erlcOk: r.ok, erlcStatus: r.status });

        return res.status(r.status === 204 ? 200 : r.status).json({ success: r.ok });
      }

      case 'kick': {
        if (!isNkz) return res.status(403).json({ error: 'Insufficient permissions' });
        const r = await sendErlcCommand(`:kick ${targetUsername} ${safeReason}`);
        await recordPanelModeration({ session, action, targetUsername, targetUserId, reason: safeReason, erlcOk: r.ok, erlcStatus: r.status });
        return res.status(r.status === 204 ? 200 : r.status).json({ success: r.ok });
      }

      case 'ban': {
        if (!canBan) return res.status(403).json({ error: 'Ban role required' });
        const id = targetUserId || targetUsername;
        const r = await sendErlcCommand(`:ban ${id}`);
        await recordPanelModeration({ session, action, targetUsername, targetUserId, reason: safeReason, erlcOk: r.ok, erlcStatus: r.status });
        return res.status(r.status === 204 ? 200 : r.status).json({ success: r.ok });
      }

      case 'bolo': {
        if (!canBolo) {
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

        await recordPanelModeration({ session, action, targetUsername, targetUserId, reason: safeReason, messageId: boloMsg?.id });
        return res.status(200).json({ success: true, messageId: boloMsg?.id });
      }

      case 'message': {
        const r = await sendErlcCommand(`:m ${targetUsername} ${safeReason}`);
        await recordPanelModeration({ session, action, targetUsername, targetUserId, reason: safeReason, erlcOk: r.ok, erlcStatus: r.status });
        return res.status(r.status === 204 ? 200 : r.status).json({ success: r.ok });
      }

      case 'load': {
        if (!isNkz) return res.status(403).json({ error: 'Insufficient permissions' });
        const r = await sendErlcCommand(`:load ${targetUsername}`);
        await recordPanelModeration({ session, action, targetUsername, targetUserId, reason: safeReason, erlcOk: r.ok, erlcStatus: r.status });
        return res.status(r.status === 204 ? 200 : r.status).json({ success: r.ok });
      }

      case 'jail': {
        if (!isNkz) return res.status(403).json({ error: 'Insufficient permissions' });
        const r = await sendErlcCommand(`:jail ${targetUsername}`);
        await recordPanelModeration({ session, action, targetUsername, targetUserId, reason: safeReason, erlcOk: r.ok, erlcStatus: r.status });
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
