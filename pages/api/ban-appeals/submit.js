import { getPool } from '../../../lib/appdb';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth-options";
import { fetchBanStatus } from '../../../lib/access-check';
import { sendComponentsV2, sendDM } from "../../../lib/discord-v2";
import { rateLimit } from '../../../lib/rate-limiter';
import { invalidateAppListCache } from '../applications/list';
import { sanitizeTypingTimeline, sanitizeMonitoringData, ensureTypingColumn } from '../applications/submit';

const MAX_PAYLOAD_SIZE = 2 * 1024 * 1024;
const MAX_ANSWER_LENGTH = 4000;

export const APPEAL_FIELDS = [
  { id: 'discord_user', label: 'Discord username', type: 'text' },
  { id: 'why_banned', label: 'Why were you banned?', type: 'textarea' },
  { id: 'why_unban', label: 'Why should we unban you?', type: 'textarea' },
];

function countWords(value) {
  return String(value || '').trim().split(/\s+/).filter(Boolean).length;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const rl = rateLimit(req, res, 'submit');
  if (rl.limited) {
    console.warn('[Ban Appeal API] Rate limited:', session.user.id);
    return res.status(429).json({ message: 'Rate limited. Please wait before submitting again.', retryAfter: rl.retryAfter });
  }

  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ message: 'Request body is empty' });
    }

    const bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    if (bodyStr.length > MAX_PAYLOAD_SIZE) {
      console.error('[Ban Appeal API] Payload too large:', bodyStr.length);
      return res.status(413).json({ message: 'Appeal too large' });
    }

    let appeal;
    try {
      appeal = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (parseErr) {
      return res.status(400).json({ message: 'Invalid request body' });
    }

    const whyBanned = String(appeal.answers?.why_banned || '').trim();
    const whyUnban = String(appeal.answers?.why_unban || '').trim();
    if (countWords(whyBanned) < 5 || countWords(whyUnban) < 5) {
      return res.status(400).json({ message: 'Please answer both questions properly before submitting.' });
    }
    if (whyBanned.length > MAX_ANSWER_LENGTH || whyUnban.length > MAX_ANSWER_LENGTH) {
      return res.status(400).json({ message: 'Answers are too long.' });
    }

    // The eligibility gate: only users Discord confirms as banned may appeal.
    // A failed lookup is never treated as banned.
    const banStatus = await fetchBanStatus(session.user.id);
    if (!banStatus) {
      return res.status(503).json({ message: 'Could not verify your ban status right now. Please try again shortly.' });
    }
    if (!banStatus.banned) {
      console.warn('[Ban Appeal API] Non-banned user attempted appeal:', session.user.id);
      return res.status(403).json({ message: 'You are not banned from the Discord server.' });
    }

    const pool = getPool();
    if (!pool) return res.status(500).json({ message: 'Database connection failed' });

    const [existing] = await pool.execute(
      "SELECT id FROM applications WHERE user_id = ? AND type = 'ban_appeal' AND status = 'pending' LIMIT 1",
      [session.user.id]
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: 'You already have a pending ban appeal. Please wait for it to be reviewed.' });
    }

    invalidateAppListCache();
    console.log('[Ban Appeal API] New appeal from', session.user.name, `(${session.user.id})`);

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
      || req.headers['x-real-ip']
      || req.socket?.remoteAddress
      || 'unknown';

    let timezone = '';
    if (ip && ip !== 'unknown' && ip !== '::1' && !ip.startsWith('192.168.') && !ip.startsWith('10.') && !ip.startsWith('172.')) {
      try {
        const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=status,timezone`);
        const geoData = await geoRes.json();
        if (geoData.status === 'success' && geoData.timezone) {
          timezone = geoData.timezone;
        }
      } catch (_) {}
    }

    const sanitizedMonitoring = sanitizeMonitoringData(appeal.monitoringData);
    const sanitizedTimeline = sanitizeTypingTimeline(appeal.typingTimeline);

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const hasTypingColumn = await ensureTypingColumn(pool);

    const answers = {
      discord_user: session.user.name || '',
      why_banned: whyBanned,
      why_unban: whyUnban,
    };

    const columns = ['id', 'type', 'type_name', 'username', 'user_id', 'user_image', 'answers', 'keystroke_data', 'paste_data', 'monitoring_data', 'session_tab_outs', 'session_mouse_leaves', 'user_agent', 'os_detected', 'ip', 'timezone'];
    const values = [
      id,
      'ban_appeal',
      'Ban Appeal',
      session.user.name,
      session.user.id,
      session.user.image || '',
      JSON.stringify(answers),
      JSON.stringify(appeal.keystrokeData || {}),
      JSON.stringify(appeal.pasteData || {}),
      JSON.stringify(sanitizedMonitoring),
      JSON.stringify(appeal.sessionTabOuts || []),
      JSON.stringify(appeal.sessionMouseLeaves || []),
      appeal.userAgent || '',
      appeal.osDetected || '',
      ip,
      timezone,
    ];

    if (hasTypingColumn) {
      columns.push('typing_timeline');
      values.push(JSON.stringify(sanitizedTimeline));
    }

    const placeholders = columns.map(() => '?').join(', ');
    await pool.execute(
      `INSERT INTO applications (${columns.join(', ')}, status, submitted_at) VALUES (${placeholders}, 'pending', NOW())`,
      values
    );

    console.log('[Ban Appeal API] Saved to DB, ID:', id);

    const notificationChannel = "1389202990555988071";
    const banReasonLine = banStatus.reason ? `\n\n**Ban reason on record:**\n${String(banStatus.reason).slice(0, 500)}` : '';

    await sendComponentsV2(notificationChannel, {
      allowed_mentions: { parse: [] },
      components: [
        {
          type: 17,
          accent_color: 0xEF4444,
          components: [
            {
              type: 10,
              content: `# New Ban Appeal\nSent by <@${session.user.id}>\n\nA **ban appeal** has been submitted.${banReasonLine}`
            },
            {
              type: 1,
              components: [
                {
                  type: 2,
                  style: 5,
                  label: "View Ban Appeal",
                  url: `https://join-gsrp.com/applications/${id}`
                }
              ]
            }
          ]
        }
      ]
    });

    console.log('[Ban Appeal API] Discord notification sent');

    // Banned users share no guild with the bot unless they're in another
    // mutual server, so this DM can legitimately fail - never fail the
    // submission over it.
    let dmDelivered = true;
    try {
      await sendDM(session.user.id, {
        components: [
          {
            type: 17,
            accent_color: 0xF97316,
            components: [
              {
                type: 10,
                content: `# Ban Appeal Received\nDear <@${session.user.id}>,\n\nYour **ban appeal** for Georgia State Roleplay has been received and is awaiting review.\n\nYou will be notified once a decision has been made. Submitting additional appeals or asking for updates will not speed up the process.`
              }
            ]
          }
        ]
      });
      console.log('[Ban Appeal API] Confirmation DM sent');
    } catch (dmError) {
      dmDelivered = false;
      console.error('[Ban Appeal API] Could not DM user:', dmError.message);
    }

    return res.status(200).json({ success: true, id, dmDelivered });
  } catch (error) {
    console.error('[Ban Appeal API] Submission error:', error.message);
    return res.status(500).json({ message: 'Failed to submit ban appeal. Please try again.' });
  }
}
