import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth-options';
import clientPromise from '../../../lib/mongodb';
import { isFullAdmin } from '../../../lib/admin-helper';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not authenticated' });

  const TRAINER_ROLE = '1372482495035211908';

  let db;
  try {
    const client = await clientPromise;
    db = client.db();
  } catch (err) {
    console.error('[MongoDB] Connection error:', err.message);
    return res.status(500).json({ error: 'Database connection failed' });
  }

  const attemptsCollection = db.collection('quiz_attempts');

  if (req.method === 'GET') {
    const includeUserData = req.query.userData === 'true';

    try {
      const docs = await attemptsCollection.find({}).toArray();
      const allAttempts = [];
      const userDataMap = {};

      for (const doc of docs) {
        const uid = doc.userId;
        const attemptsArray = doc.attempts || [];

        userDataMap[uid] = {
          cooldownUntil: doc.cooldownUntil || null,
          hasPassed: doc.hasPassed || false,
          hasPassedAt: doc.hasPassedAt || null,
        };

        if (attemptsArray.length > 0) {
          allAttempts.push(...attemptsArray);
        }
      }

      allAttempts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      if (includeUserData) {
        return res.status(200).json({ attempts: allAttempts, users: userDataMap });
      } else {
        return res.status(200).json(allAttempts);
      }
    } catch (err) {
      console.error('[attempts/list] Error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    const { action, userId: targetUserId } = req.body || {};

    const userRoles = session.user?.roles || [];
    const isTrainer = userRoles.includes(TRAINER_ROLE);
    const isAdmin = await isFullAdmin(session.user?.id, userRoles);

    if (!isTrainer && !isAdmin) {
      return res.status(403).json({ error: 'Trainer role required' });
    }

    try {
      const existing = await attemptsCollection.findOne({ userId: targetUserId });

      let userData = { attempts: [], cooldownUntil: null, hasPassed: false, hasPassedAt: null };
      if (existing) {
        userData = {
          attempts: existing.attempts || [],
          cooldownUntil: existing.cooldownUntil || null,
          hasPassed: existing.hasPassed || false,
          hasPassedAt: existing.hasPassedAt || null,
        };
      }

      if (action === 'check') {
        const now = new Date();
        const cooldown = userData.cooldownUntil ? new Date(userData.cooldownUntil) : null;
        const isOnCooldown = cooldown && cooldown > now;

        return res.status(200).json({
          userId: targetUserId,
          cooldownUntil: userData.cooldownUntil,
          isOnCooldown,
          hasPassed: userData.hasPassed,
          hasPassedAt: userData.hasPassedAt,
          lastAttempt: userData.attempts?.[userData.attempts.length - 1] || null,
        });
      }

      if (action === 'revoke') {
        await attemptsCollection.updateOne(
          { userId: targetUserId },
          { $set: { cooldownUntil: null } }
        );

        return res.status(200).json({ ok: true, message: 'Cooldown revoked', userId: targetUserId });
      }

      return res.status(400).json({ error: 'Invalid action' });
    } catch (err) {
      console.error('[attempts/post] Error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
