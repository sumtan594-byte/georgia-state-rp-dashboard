import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth-options';
import clientPromise from '../../../lib/mongodb';
import { getPool } from '../../../lib/appdb';

// Right-to-erasure endpoint. Given a Discord user ID (or a bare IP for
// anonymous visitors), remove every piece of that person's stored data across
// all backends. Each store is deleted independently so that a missing table or
// a single failure never leaves the erasure half-done silently — we collect and
// report what happened per store.

async function purgeMongo(db, { userId, ip }) {
  const results = {};
  const run = async (label, fn) => {
    try {
      const r = await fn();
      results[label] = r?.deletedCount ?? 0;
    } catch (err) {
      results[label] = `error: ${err.message}`;
    }
  };

  if (userId) {
    const uid = String(userId);
    await run('visitor_profiles', () => db.collection('visitor_profiles').deleteOne({ _id: uid }));
    await run('visitor_logs', () => db.collection('visitor_logs').deleteMany({ userId: uid }));
    await run('quiz_attempts', () => db.collection('quiz_attempts').deleteMany({ userId: uid }));
    await run('ridealong_attempts', () => db.collection('ridealong_attempts').deleteMany({ userId: uid }));
    await run('training_progress', () => db.collection('training_progress').deleteMany({ userId: uid }));
    await run('trainee_tracking', () => db.collection('trainee_tracking').deleteMany({ userId: uid }));
    await run('discord_user_cache', () => db.collection('discord_user_cache').deleteMany({ userId: uid }));
    await run('proxy_whitelist', () => db.collection('proxy_whitelist').deleteMany({ userId: uid }));
  } else {
    await run('visitor_profiles', () => db.collection('visitor_profiles').deleteOne({ _id: `ip_${ip}` }));
    await run('visitor_logs', () => db.collection('visitor_logs').deleteMany({ ip: String(ip) }));
    await run('proxy_whitelist', () => db.collection('proxy_whitelist').deleteMany({ ip: String(ip) }));
  }

  return results;
}

async function purgeMysql({ userId }) {
  const results = {};
  const pool = getPool();
  if (!pool || !userId) return results;

  const uid = String(userId);
  const deletes = [
    ['applications', 'DELETE FROM applications WHERE user_id = ?'],
    ['shop_claims', 'DELETE FROM shop_claims WHERE discord_id = ?'],
    ['usernames', 'DELETE FROM usernames WHERE discord_id = ?'],
  ];

  for (const [label, sql] of deletes) {
    try {
      const [r] = await pool.execute(sql, [uid]);
      results[label] = r?.affectedRows ?? 0;
    } catch (err) {
      // Missing table (ER_NO_SUCH_TABLE) just means nothing to erase there.
      results[label] = err.code === 'ER_NO_SUCH_TABLE' ? 0 : `error: ${err.message}`;
    }
  }

  return results;
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not authenticated' });

  const { canViewTracking } = await import('../../../lib/admin-helper');
  if (!(await canViewTracking(session))) return res.status(403).json({ error: 'Admin only' });

  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = req.query.userId ? String(req.query.userId).trim() : '';
  const ip = req.query.ip ? String(req.query.ip).trim() : '';

  if (!userId && !ip) {
    return res.status(400).json({ error: 'Need userId or ip' });
  }
  if (userId && !/^\d{17,20}$/.test(userId)) {
    return res.status(400).json({ error: 'Invalid userId' });
  }

  try {
    const client = await clientPromise;
    const db = client.db();

    const mongo = await purgeMongo(db, { userId, ip });
    const mysql = await purgeMysql({ userId });

    console.log('[Purge User]', session.user?.id, 'erased', userId || `ip:${ip}`, { mongo, mysql });

    return res.status(200).json({ ok: true, target: userId || ip, mongo, mysql });
  } catch (err) {
    console.error('[Purge User] Error:', err);
    return res.status(500).json({ error: 'Failed to delete stored data' });
  }
}
