import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth-options';
import clientPromise from '../../../lib/mongodb';

export default async function handler(req, res) {
  console.log('[User Validations API] Request received');

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    console.log('[User Validations API] No session');
    return res.status(401).json({ error: 'Not authenticated' });
  }
  console.log('[User Validations API] Session user:', session.user?.id);

  let isAdmin;
  try {
    const { isFullAdmin } = await import('../../../lib/admin-helper');
    isAdmin = await isFullAdmin(session.user?.id, session.user?.roles || []);
    console.log('[User Validations API] isAdmin:', isAdmin);
  } catch (e) {
    console.error('[User Validations API] isFullAdmin error:', e.message, e.stack);
    return res.status(500).json({ error: 'Admin check failed: ' + e.message });
  }

  if (!isAdmin) return res.status(403).json({ error: 'Admin only' });

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    console.log('[User Validations API] Connecting to MongoDB...');
    const client = await clientPromise;
    console.log('[User Validations API] Connected. Getting databases...');
    const dbStaff = client.db('gsrp_staff');
    const dbDefault = client.db();
    console.log('[User Validations API] DBs: staff=', dbStaff.databaseName, 'default=', dbDefault.databaseName);

    console.log('[User Validations API] Fetching training_progress...');
    const trainingProgress = await dbStaff.collection('training_progress').find({}).toArray();
    console.log('[User Validations API] training_progress count:', trainingProgress.length);

    console.log('[User Validations API] Fetching quiz_attempts...');
    const quizAttempts = await dbDefault.collection('quiz_attempts').find({}).toArray();
    console.log('[User Validations API] quiz_attempts count:', quizAttempts.length);

    const userMap = {};

    for (const tp of trainingProgress) {
      if (!userMap[tp.userId]) {
        userMap[tp.userId] = {
          userId: tp.userId,
          handbookCompleted: false,
          completedSections: [],
          lastHandbookUpdate: null,
          hasPassed: false,
          hasPassedAt: null,
          cooldownUntil: null,
          isOnCooldown: false,
          attempts: [],
          totalAttempts: 0,
          bestScore: 0,
          lastAttempt: null,
        };
      }
      userMap[tp.userId].handbookCompleted = tp.handbookCompleted || false;
      userMap[tp.userId].completedSections = tp.completedSections || [];
      userMap[tp.userId].lastHandbookUpdate = tp.lastUpdated || null;
    }

    for (const qa of quizAttempts) {
      if (!userMap[qa.userId]) {
        userMap[qa.userId] = {
          userId: qa.userId,
          handbookCompleted: false,
          completedSections: [],
          lastHandbookUpdate: null,
          hasPassed: false,
          hasPassedAt: null,
          cooldownUntil: null,
          isOnCooldown: false,
          attempts: [],
          totalAttempts: 0,
          bestScore: 0,
          lastAttempt: null,
        };
      }
      userMap[qa.userId].hasPassed = qa.hasPassed || false;
      userMap[qa.userId].hasPassedAt = qa.hasPassedAt || null;
      userMap[qa.userId].cooldownUntil = qa.cooldownUntil || null;

      const now = new Date();
      const cooldown = qa.cooldownUntil ? new Date(qa.cooldownUntil) : null;
      userMap[qa.userId].isOnCooldown = !!(cooldown && cooldown > now);

      const attempts = qa.attempts || [];
      userMap[qa.userId].totalAttempts = attempts.length;
      userMap[qa.userId].attempts = attempts.map(a => ({
        score: a.score,
        total: a.total,
        pct: a.pct,
        pass: a.pass,
        timestamp: a.timestamp,
      }));

      if (attempts.length > 0) {
        userMap[qa.userId].bestScore = Math.max(...attempts.map(a => a.score || 0));
        userMap[qa.userId].lastAttempt = attempts[attempts.length - 1];
      }
    }

    console.log('[User Validations API] Built userMap, sorting...');
    const users = Object.values(userMap).sort((a, b) => {
      const aTime = String(a.lastHandbookUpdate || a.lastAttempt?.timestamp || '');
      const bTime = String(b.lastHandbookUpdate || b.lastAttempt?.timestamp || '');
      return bTime.localeCompare(aTime);
    });

    console.log('[User Validations API] Returning', users.length, 'users');
    return res.status(200).json({ users });
  } catch (err) {
    console.error('[User Validations API] Error:', err.message);
    console.error('[User Validations API] Stack:', err.stack);
    return res.status(500).json({ error: 'Failed to fetch user validations: ' + err.message });
  }
}
