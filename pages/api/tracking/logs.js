import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth-options';
import clientPromise from '../../../lib/mongodb';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not authenticated' });

  const { isFullAdmin } = await import('../../../lib/admin-helper');
  const isAdmin = await isFullAdmin(session.user?.id, session.user?.roles || []);
  if (!isAdmin) return res.status(403).json({ error: 'Admin only' });

  try {
    const client = await clientPromise;
    const db = client.db();

    if (req.method === 'DELETE') {
      const { type } = req.query;
      if (type === 'profiles') {
        await db.collection('visitor_profiles').deleteMany({});
      } else if (type === 'logs') {
        await db.collection('visitor_logs').deleteMany({});
      } else {
        await db.collection('visitor_profiles').deleteMany({});
        await db.collection('visitor_logs').deleteMany({});
      }
      return res.status(200).json({ ok: true });
    }

    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const [profiles, recentLogs] = await Promise.all([
      db.collection('visitor_profiles')
        .find({})
        .sort({ lastSeen: -1 })
        .toArray(),
      db.collection('visitor_logs')
        .find({})
        .sort({ timestamp: -1 })
        .limit(200)
        .toArray(),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const uniqueIPs = new Set(recentLogs.map(l => l.ip));
    const todayCount = recentLogs.filter(l => new Date(l.timestamp) >= today).length;
    const totalProfiles = profiles.length;
    const onlineNow = profiles.filter(p => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
      return new Date(p.lastSeen) >= fiveMinAgo;
    }).length;

    return res.status(200).json({
      profiles,
      logs: recentLogs,
      stats: {
        totalProfiles,
        totalVisits: recentLogs.length,
        uniqueIPs: uniqueIPs.size,
        today: todayCount,
        onlineNow,
      },
    });
  } catch (err) {
    console.error('[Tracking Logs] Error:', err);
    return res.status(500).json({ error: 'Failed to fetch logs' });
  }
}
