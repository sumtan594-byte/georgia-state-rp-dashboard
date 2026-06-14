import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth-options';
import clientPromise from '../../../lib/mongodb';
import { canViewTracking } from '../../../lib/admin-helper';

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function countBy(items, getter) {
  const counts = {};
  for (const item of items) {
    const key = getter(item) || 'Unknown';
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not authenticated' });
  if (!(await canViewTracking(session))) return res.status(403).json({ error: 'Admin only' });

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const client = await clientPromise;
  const db = client.db();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const today = startOfDay(new Date());

  await db.collection('visitor_logs').createIndex({ timestamp: 1 }, { expireAfterSeconds: 604800 }).catch(() => {});
  await db.collection('visitor_profiles').createIndex({ lastSeen: 1 }, { expireAfterSeconds: 604800 }).catch(() => {});

  const [logs, profiles] = await Promise.all([
    db.collection('visitor_logs').find({ timestamp: { $gte: since } }).sort({ timestamp: -1 }).limit(5000).toArray(),
    db.collection('visitor_profiles').find({}).sort({ lastSeen: -1 }).limit(500).toArray(),
  ]);

  const uniqueUsers = new Set(logs.map(l => l.userId).filter(Boolean));
  const uniqueIps = new Set(logs.map(l => l.ip).filter(Boolean));
  const hourly = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));
  for (const log of logs) hourly[new Date(log.timestamp).getHours()].count++;

  return res.status(200).json({
    stats: {
      visits7d: logs.length,
      visitsToday: logs.filter(l => new Date(l.timestamp) >= today).length,
      uniqueUsers: uniqueUsers.size,
      uniqueIps: uniqueIps.size,
      authenticated: logs.filter(l => l.userId).length,
      anonymous: logs.filter(l => !l.userId).length,
      proxyFlags: logs.filter(l => l.geo?.proxy || l.geo?.hosting).length,
      onlineNow: profiles.filter(p => new Date(p.lastSeen) >= new Date(Date.now() - 5 * 60 * 1000)).length,
    },
    topPages: countBy(logs, l => l.page).slice(0, 10),
    devices: countBy(logs, l => l.device).slice(0, 8),
    countries: countBy(logs, l => l.geo?.country).slice(0, 8),
    hourly,
    recent: logs.slice(0, 30),
  });
}
