import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth-options';
import clientPromise from '../../../lib/mongodb';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not authenticated' });

  const { canViewTracking } = await import('../../../lib/admin-helper');
  if (!(await canViewTracking(session))) return res.status(403).json({ error: 'Admin only' });

  try {
    const client = await clientPromise;
    const db = client.db();

    if (req.method === 'GET') {
      const whitelist = await db.collection('proxy_whitelist').find({}).sort({ createdAt: -1 }).toArray();
      return res.status(200).json(whitelist);
    }

    if (req.method === 'POST') {
      const { userId, username, ip } = req.body;
      if (!userId && !ip) return res.status(400).json({ error: 'Need userId or ip' });

      const filter = userId ? { userId: String(userId) } : { ip };
      const existing = await db.collection('proxy_whitelist').findOne(filter);
      if (existing) return res.status(200).json({ ok: true });
      await db.collection('proxy_whitelist').insertOne({
        ...filter,
        username: username || '',
        createdAt: new Date(),
        addedBy: session.user?.id,
      });
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const { userId, ip } = req.query;
      if (!userId && !ip) return res.status(400).json({ error: 'Need userId or ip' });

      const filter = userId ? { userId: String(userId) } : { ip };
      await db.collection('proxy_whitelist').deleteOne(filter);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[Whitelist] Error:', err);
    return res.status(500).json({ error: 'Failed' });
  }
}
