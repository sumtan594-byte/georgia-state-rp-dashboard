import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth-options';
import clientPromise from '../../../lib/mongodb';
import { isFullAdmin } from '../../../lib/admin-helper';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not authenticated' });

  const TRAINER_ROLE = '1372482495035211908';
  const hasTrainer = session.user?.roles?.includes(TRAINER_ROLE);
  const isAdmin = await isFullAdmin(session.user?.id, session.user?.roles || []);

  if (!hasTrainer && !isAdmin) {
    return res.status(403).json({ error: 'Trainer access required' });
  }

  try {
    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection('quiz_attempts');

    const docs = await collection.find({}).toArray();

    let totalAttempts = 0;
    let passedCount = 0;
    let failedCount = 0;
    const scores = [];
    const recentAttempts = [];

    for (const doc of docs) {
      const attempts = doc.attempts || [];
      totalAttempts += attempts.length;

      for (const attempt of attempts) {
        if (attempt.pass) {
          passedCount++;
        } else {
          failedCount++;
        }
        if (attempt.pct !== undefined) {
          scores.push(attempt.pct);
        }
        recentAttempts.push(attempt);
      }
    }

    recentAttempts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const avgScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

    const sortedScores = [...scores].sort((a, b) => a - b);
    const highestScore = sortedScores.length > 0 ? sortedScores[sortedScores.length - 1] : 0;
    const lowestScore = sortedScores.length > 0 ? sortedScores[0] : 0;
    const medianScore = sortedScores.length > 0
      ? sortedScores[Math.floor(sortedScores.length / 2)]
      : 0;

    return res.status(200).json({
      totalUsers: docs.length,
      totalAttempts,
      passedCount,
      failedCount,
      avgScore,
      highestScore,
      lowestScore,
      medianScore,
      recentAttempts: recentAttempts.slice(0, 20),
    });
  } catch (err) {
    console.error('[Quiz Analytics] Error:', err.message);
    return res.status(500).json({ error: 'Failed to compute analytics' });
  }
}
