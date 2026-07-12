import { getPool, rowToApplication } from '../../../lib/appdb';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth-options";
import { sendComponentsV2 } from "../../../lib/discord-v2";
import { rateLimit } from '../../../lib/rate-limiter';
import { invalidateAppListCache } from './list';
import { enqueueApplicationMark, isAutoMarkEligible } from '../../../lib/application-auto-marker';

const MAX_PAYLOAD_SIZE = 2 * 1024 * 1024;

const MAX_TIMELINE_EVENTS_PER_FIELD = 20000;

// Keep the typing timeline compact and well-formed. Unlike the other monitoring
// arrays we truncate from the END (keeping the start), because reconstruction
// depends on replaying diffs from the very first edit.
function sanitizeTypingTimeline(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
  const sanitized = {};
  for (const [fieldId, events] of Object.entries(data)) {
    if (!Array.isArray(events)) continue;
    const cleaned = [];
    for (const event of events) {
      if (!event || typeof event !== 'object') continue;
      const t = Number(event.t);
      const p = Number(event.p);
      const d = Number(event.d);
      if (!Number.isFinite(t) || !Number.isFinite(p) || !Number.isFinite(d)) continue;
      cleaned.push({
        t,
        p: Math.max(0, Math.floor(p)),
        d: Math.max(0, Math.floor(d)),
        i: typeof event.i === 'string' ? event.i : '',
      });
      if (cleaned.length >= MAX_TIMELINE_EVENTS_PER_FIELD) break;
    }
    if (cleaned.length > 0) sanitized[fieldId] = cleaned;
  }
  return sanitized;
}

let typingColumnEnsured = false;
// The applications table is provisioned outside this repo, so add the replay
// column lazily and idempotently (mirrors the CREATE TABLE IF NOT EXISTS pattern
// used by the auto-marker). Returns whether the column is available.
async function ensureTypingColumn(pool) {
  if (typingColumnEnsured) return true;
  try {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'applications' AND COLUMN_NAME = 'typing_timeline'`
    );
    if (!rows[0] || rows[0].c === 0) {
      await pool.execute('ALTER TABLE applications ADD COLUMN typing_timeline LONGTEXT NULL');
      console.log('[Application API] Added typing_timeline column');
    }
    typingColumnEnsured = true;
    return true;
  } catch (err) {
    console.error('[Application API] Could not ensure typing_timeline column:', err.message);
    return false;
  }
}

function sanitizeMonitoringData(data) {
  if (!data || typeof data !== 'object') return {};
  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'object') {
      sanitized[key] = {
        tabOuts: Array.isArray(value.tabOuts) ? value.tabOuts.slice(-20) : [],
        rightClicks: Array.isArray(value.rightClicks) ? value.rightClicks.slice(-20) : [],
        wpmSpikes: Array.isArray(value.wpmSpikes) ? value.wpmSpikes.slice(-10) : [],
        idlePeriods: Array.isArray(value.idlePeriods) ? value.idlePeriods.slice(-10) : [],
      };
    }
  }
  return sanitized;
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
    console.warn('[Application API] Rate limited:', session.user.id);
    return res.status(429).json({ message: 'Rate limited. Please wait before submitting again.', retryAfter: rl.retryAfter });
  }

  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      console.error('[Application API] Empty body from', session.user.id, 'ua:', req.headers['user-agent'], 'ref:', req.headers['referer']);
      return res.status(400).json({ message: 'Request body is empty' });
    }

    const bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    if (bodyStr.length > MAX_PAYLOAD_SIZE) {
      console.error('[Application API] Payload too large:', bodyStr.length);
      return res.status(413).json({ message: 'Application too large' });
    }

    let application;
    try {
      application = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (parseErr) {
      console.error('[Application API] Invalid JSON body - first 200:', bodyStr.substring(0, 200));
      return res.status(400).json({ message: 'Invalid request body' });
    }

    if (!application.type || !application.answers || typeof application.answers !== 'object') {
      console.error('[Application API] Missing required fields, type:', application.type);
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (Object.keys(application.answers).length === 0) {
      console.error('[Application API] Empty answers');
      return res.status(400).json({ message: 'No answers provided' });
    }

    const pool = getPool();
    if (!pool) return res.status(500).json({ message: 'Database connection failed' });

    const [existing] = await pool.execute(
      'SELECT id FROM applications WHERE user_id = ? AND type = ? AND status = ? LIMIT 1',
      [session.user.id, application.type, 'pending']
    );
    if (existing.length > 0) {
      console.log('[Application API] Replacing existing pending application:', existing[0].id, 'for', session.user.id);
      await pool.execute('DELETE FROM applications WHERE id = ?', [existing[0].id]);
    }

    invalidateAppListCache();
    console.log('[Application API] New submission:', session.user.name, '|', application.typeName, '|', Object.keys(application.answers).length, 'fields');

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

    const sanitizedMonitoring = sanitizeMonitoringData(application.monitoringData);
    const sanitizedTimeline = sanitizeTypingTimeline(application.typingTimeline);

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const hasTypingColumn = await ensureTypingColumn(pool);

    const columns = ['id', 'type', 'type_name', 'username', 'user_id', 'user_image', 'answers', 'keystroke_data', 'paste_data', 'monitoring_data', 'session_tab_outs', 'session_mouse_leaves', 'user_agent', 'os_detected', 'ip', 'timezone'];
    const values = [
      id,
      application.type,
      application.typeName || "Staff Application",
      application.username || session.user.name,
      session.user.id,
      application.userImage || session.user.image,
      JSON.stringify(application.answers),
      JSON.stringify(application.keystrokeData || {}),
      JSON.stringify(application.pasteData || {}),
      JSON.stringify(sanitizedMonitoring),
      JSON.stringify(application.sessionTabOuts || []),
      JSON.stringify(application.sessionMouseLeaves || []),
      application.userAgent || '',
      application.osDetected || '',
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

    console.log('[Application API] Saved to DB, ID:', id);

    if (isAutoMarkEligible(application)) {
      try {
        await enqueueApplicationMark(id);
        console.log('[Application API] Automatic marking queued:', id);
      } catch (markQueueError) {
        console.error('[Application API] Could not queue automatic marking:', markQueueError.message);
      }
    }

    const notificationChannel = "1389202990555988071";
    const typeName = application.typeName || "Staff Application";

    await sendComponentsV2(notificationChannel, {
      components: [
        {
          type: 17,
          accent_color: 0xF97316,
          components: [
            {
              type: 10,
              content: `# New ${typeName}\nSent by <@${session.user.id}>\n\nAn application for **${typeName}** has been submitted.`
            },
            {
              type: 1,
              components: [
                {
                  type: 2,
                  style: 5,
                  label: "View Application",
                  url: `https://join-gsrp.com/applications/${id}`
                }
              ]
            }
          ]
        }
      ]
    });

    console.log('[Application API] Discord notification sent');
    return res.status(200).json({ success: true, id });
  } catch (error) {
    console.error('[Application API] Submission error:', error.message);
    return res.status(500).json({ message: 'Failed to submit application. Please try again.' });
  }
}
