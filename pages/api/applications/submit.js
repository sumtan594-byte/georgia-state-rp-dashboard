import clientPromise from '../../../lib/mongodb';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth-options";
import { sendComponentsV2 } from "../../../lib/discord-v2";
import { rateLimit } from '../../../lib/rate-limiter';

const MAX_PAYLOAD_SIZE = 2 * 1024 * 1024;

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

    const client = await clientPromise;
    const db = client.db("gsrp_staff");

    const existingPending = await db.collection("applications").findOne({
      userId: session.user.id,
      type: application.type,
      status: 'pending',
    });
    if (existingPending) {
      console.log('[Application API] Replacing existing pending application:', existingPending._id, 'for', session.user.id);
      await db.collection("applications").deleteOne({ _id: existingPending._id });
    }

    console.log('[Application API] New submission:', session.user.name, '|', application.typeName, '|', Object.keys(application.answers).length, 'fields');

    const sanitizedMonitoring = sanitizeMonitoringData(application.monitoringData);

    const result = await db.collection("applications").insertOne({
      type: application.type,
      typeName: application.typeName || "Staff Application",
      username: application.username || session.user.name,
      userId: session.user.id,
      userImage: application.userImage || session.user.image,
      answers: application.answers,
      keystrokeData: application.keystrokeData || {},
      pasteData: application.pasteData || {},
      monitoringData: sanitizedMonitoring,
      sessionTabOuts: application.sessionTabOuts || [],
      sessionMouseLeaves: application.sessionMouseLeaves || [],
      userAgent: application.userAgent || '',
      osDetected: application.osDetected || '',
      status: 'pending',
      submittedAt: new Date(),
    });

    console.log('[Application API] Saved to DB, ID:', result.insertedId);

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
                  url: `https://join-gsrp.com/applications/${result.insertedId}`
                }
              ]
            }
          ]
        }
      ]
    });

    console.log('[Application API] Discord notification sent');
    return res.status(200).json({ success: true, id: result.insertedId });
  } catch (error) {
    console.error('[Application API] Submission error:', error.message);
    return res.status(500).json({ message: 'Failed to submit application. Please try again.' });
  }
}
