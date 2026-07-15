import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth-options';
import clientPromise from '../../../lib/mongodb';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not authenticated' });

  const { isFullAdmin } = await import('../../../lib/admin-helper');
  const isAdmin = await isFullAdmin(session.user?.id, session.user?.roles || []);
  if (!isAdmin) return res.status(403).json({ error: 'Admin only' });

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const client = await clientPromise;
    const dbStaff = client.db('gsrp_staff');
    const dbDefault = client.db();

    // Project only the fields this aggregation reads, these collections are
    // loaded whole, and un-projected quiz attempt docs carry full answer
    // payloads that balloon memory as the collections grow.
    const [trainingProgress, quizAttempts, ridealongData, traineeTracking] = await Promise.all([
      dbStaff.collection('training_progress').find({}).project({
        _id: 0, userId: 1, handbookCompleted: 1, completedSections: 1, lastUpdated: 1,
      }).toArray(),
      dbDefault.collection('quiz_attempts').find({}).project({
        _id: 0, userId: 1, hasPassed: 1, hasPassedAt: 1, cooldownUntil: 1, traineeRoleRemoved: 1,
        'attempts.score': 1, 'attempts.total': 1, 'attempts.pct': 1, 'attempts.pass': 1, 'attempts.timestamp': 1,
      }).toArray(),
      dbDefault.collection('ridealong_attempts').find({}).project({
        _id: 0, userId: 1, hasPassed: 1, cooldownUntil: 1,
      }).toArray(),
      dbDefault.collection('trainee_tracking').find({}).project({
        _id: 0, userId: 1, status: 1, startedAt: 1, deadline: 1, removedAt: 1, removeReason: 1,
      }).toArray(),
    ]);

    const userMap = {};

    for (const tp of trainingProgress) {
      if (!userMap[tp.userId]) {
        userMap[tp.userId] = {
          userId: tp.userId,
          username: null,
          avatar: null,
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
          ridealongPassed: false,
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
          username: null,
          avatar: null,
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
          ridealongPassed: false,
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
      userMap[qa.userId].failedAttempts = attempts.filter(a => !a.pass).length;
      userMap[qa.userId].traineeRoleRemoved = qa.traineeRoleRemoved || false;
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

    for (const ra of ridealongData) {
      if (!userMap[ra.userId]) {
        userMap[ra.userId] = {
          userId: ra.userId,
          username: null,
          avatar: null,
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
          ridealongPassed: false,
        };
      }
      userMap[ra.userId].ridealongPassed = ra.hasPassed || false;
      userMap[ra.userId].ridealongCooldownUntil = ra.cooldownUntil || null;
      const raCooldown = ra.cooldownUntil ? new Date(ra.cooldownUntil) : null;
      userMap[ra.userId].ridealongOnCooldown = !!(raCooldown && raCooldown > new Date());
    }

    for (const tt of traineeTracking) {
      if (!userMap[tt.userId]) {
        userMap[tt.userId] = {
          userId: tt.userId,
          username: null,
          avatar: null,
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
          ridealongPassed: false,
        };
      }
      const u = userMap[tt.userId];
      u.traineeStatus = tt.status || null;
      u.traineeStartedAt = tt.startedAt || null;
      u.traineeDeadline = tt.deadline || null;
      u.traineeRemovedAt = tt.removedAt || null;
      u.traineeRemoveReason = tt.removeReason || null;
    }

    const users = Object.values(userMap).sort((a, b) => {
      const aTime = String(a.lastHandbookUpdate || a.lastAttempt?.timestamp || '');
      const bTime = String(b.lastHandbookUpdate || b.lastAttempt?.timestamp || '');
      return bTime.localeCompare(aTime);
    });

    // Attach any already-cached Discord info in a single bulk query so the
    // response is fast. Usernames that aren't cached (or were poisoned by a
    // failed lookup that stored the raw ID) are left null and resolved
    // on-demand per page by /api/admin/user-validations-resolve.
    const userIds = users.map(u => u.userId);
    const cachedDocs = await dbDefault
      .collection('discord_user_cache')
      .find({ userId: { $in: userIds } })
      .project({ _id: 0, userId: 1, username: 1, avatar: 1, updatedAt: 1 })
      .toArray();
    const cacheMap = {};
    for (const doc of cachedDocs) {
      const fresh = Date.now() - doc.updatedAt < 86_400_000;
      const poisoned = doc.username === doc.userId; // failed lookup stored the raw ID
      if (fresh && !poisoned) {
        cacheMap[doc.userId] = { username: doc.username, avatar: doc.avatar };
      }
    }
    for (const u of users) {
      const info = cacheMap[u.userId];
      if (info) {
        u.username = info.username;
        u.avatar = info.avatar;
      }
    }

    return res.status(200).json({ users });
  } catch (err) {
    console.error('[User Validations API] Error:', err.message);
    console.error('[User Validations API] Stack:', err.stack);
    return res.status(500).json({ error: 'Failed to fetch user validations: ' + err.message });
  }
}
