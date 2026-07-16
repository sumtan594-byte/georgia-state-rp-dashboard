import clientPromise from '../../../lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth-options';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Identity is always taken from the authenticated session, never the request
  // body/query. Coercing to a string also prevents Mongo operator injection
  // (e.g. { $ne: null }) via a client-supplied object.
  const userId = String(session.user.id);

  const client = await clientPromise;
  const db = client.db('gsrp');
  const collection = db.collection('quiz_sessions');

  if (req.method === 'POST') {
    const { data } = req.body || {};
    if (!data) return res.status(400).json({ error: 'Missing data' });

    await collection.updateOne(
      { userId },
      { $set: { data, updatedAt: new Date() } },
      { upsert: true }
    );
    return res.json({ ok: true });
  }

  if (req.method === 'GET') {
    const stored = await collection.findOne({ userId });
    if (!stored) return res.json({ data: null });

    // Expire after 24 hours
    if (new Date() - new Date(stored.updatedAt) > 24 * 60 * 60 * 1000) {
      await collection.deleteOne({ userId });
      return res.json({ data: null });
    }

    return res.json({ data: stored.data });
  }

  if (req.method === 'DELETE') {
    await collection.deleteOne({ userId });
    return res.json({ ok: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
