import clientPromise from '../../../lib/mongodb';

export default async function handler(req, res) {
  const client = await clientPromise;
  const db = client.db('gsrp');
  const collection = db.collection('quiz_sessions');

  if (req.method === 'POST') {
    const { userId, data } = req.body;
    if (!userId || !data) return res.status(400).json({ error: 'Missing userId or data' });

    await collection.updateOne(
      { userId },
      { $set: { data, updatedAt: new Date() } },
      { upsert: true }
    );
    return res.json({ ok: true });
  }

  if (req.method === 'GET') {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    const session = await collection.findOne({ userId });
    if (!session) return res.json({ data: null });

    // Expire after 24 hours
    if (new Date() - new Date(session.updatedAt) > 24 * 60 * 60 * 1000) {
      await collection.deleteOne({ userId });
      return res.json({ data: null });
    }

    return res.json({ data: session.data });
  }

  if (req.method === 'DELETE') {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    await collection.deleteOne({ userId });
    return res.json({ ok: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
