import clientPromise from '../../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const client = await clientPromise;
    const db = client.db();

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
      || req.headers['x-real-ip']
      || req.socket?.remoteAddress
      || 'unknown';

    // ensure TTL index on the logs collection (7-day auto-clean)
    db.collection('visitor_logs').createIndex(
      { timestamp: 1 },
      { expireAfterSeconds: 604800 },
    ).catch(() => {});

    const { userId, username, avatar, userAgent, device, page } = req.body || {};
    const ua = userAgent || req.headers['user-agent'] || '';
    const dev = device || parseDevice(ua);
    const now = new Date();
    const key = userId || `ip_${ip}`;

    // upsert profile (one doc per user or per IP)
    await db.collection('visitor_profiles').updateOne(
      { _id: key },
      {
        $set: {
          ...(userId ? { userId, username, avatar } : { ip }),
          device: dev,
          userAgent: ua,
          lastSeen: now,
          lastPage: page || '',
        },
        $setOnInsert: { firstSeen: now },
        $addToSet: { ips: ip },
        $inc: { visitCount: 1 },
      },
      { upsert: true },
    );

    // insert lightweight time-series entry (TTL index auto-clears after 7 days)
    await db.collection('visitor_logs').insertOne({
      ...(userId ? { userId, username, avatar } : {}),
      ip,
      device: dev,
      userAgent: ua,
      page: page || '',
      timestamp: now,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[Tracking] Error:', err);
    return res.status(500).json({ error: 'Tracking failed' });
  }
}

function parseDevice(ua) {
  if (!ua) return 'Unknown';
  if (ua.includes('iPhone')) return 'iPhone';
  if (ua.includes('iPad')) return 'iPad';
  if (ua.includes('Android')) return ua.includes('Mobile') ? 'Android Phone' : 'Android Tablet';
  if (ua.includes('Mobile')) return 'Mobile';
  return 'Desktop';
}
