import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth-options';
import clientPromise from '../../../../lib/mongodb';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not authenticated' });

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const userId = session.user.id;

  try {
    const client = await clientPromise;
    const db = client.db('gsrp_staff');

    const existing = await db.collection('scenario_training').findOne({ userId });

    if (existing?.completed) {
      return res.status(200).json({
        completed: true,
        data: {
          completedAt: existing.completedAt,
          totalScore: existing.totalScore,
          maxScore: existing.maxScore,
          percentage: existing.percentage,
          passed: existing.passed,
          scenariosCompleted: existing.scenariosCompleted,
        },
      });
    }

    return res.status(200).json({ completed: false });
  } catch (err) {
    console.error('[Scenario Status Error]', err.message);
    return res.status(500).json({ error: 'Failed to check status' });
  }
}
