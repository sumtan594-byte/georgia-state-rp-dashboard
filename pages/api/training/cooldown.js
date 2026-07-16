import clientPromise from '../../../lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth-options';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Identity comes from the session only; a client can never read another
    // user's cooldown/pass state by naming their ID.
    const userId = String(session.user.id);

    try {
      const client = await clientPromise;
      const db = client.db();
      const existing = await db.collection('quiz_attempts').findOne({ userId });

      if (!existing) {
        // User has no data - no cooldown, hasn't passed
        return res.status(200).json({
          userId,
          cooldownUntil: null,
          isOnCooldown: false,
          hasPassed: false,
          hasPassedAt: null,
          lastAttempt: null,
        });
      }

      const now = new Date();
      const cooldown = existing.cooldownUntil ? new Date(existing.cooldownUntil) : null;
      const isOnCooldown = cooldown && cooldown > now;

      return res.status(200).json({
        userId,
        cooldownUntil: existing.cooldownUntil,
        isOnCooldown,
        hasPassed: existing.hasPassed || false,
        hasPassedAt: existing.hasPassedAt,
        lastAttempt: existing.attempts?.[existing.attempts.length - 1] || null,
      });
    } catch (err) {
      console.error('[cooldown/get] Error:', err.message);
      return res.status(500).json({ error: 'Failed to fetch cooldown' });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
