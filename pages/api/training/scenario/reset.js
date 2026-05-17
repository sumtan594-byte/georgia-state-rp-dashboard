import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth-options';
import clientPromise from '../../../../lib/mongodb';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not authenticated' });

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const userId = session.user.id;

  try {
    const client = await clientPromise;
    const db = client.db('gsrp_staff');

    await db.collection('scenario_training').deleteOne({ userId });

    return res.status(200).json({ ok: true, message: 'Scenario training reset' });
  } catch (err) {
    console.error('[Scenario Reset Error]', err.message);
    return res.status(500).json({ error: 'Failed to reset scenario training' });
  }
}
