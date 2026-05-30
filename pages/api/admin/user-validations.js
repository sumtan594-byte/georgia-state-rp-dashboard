import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth-options';
import clientPromise from '../../../lib/mongodb';
import { enrichUserInfo } from '../../../lib/discord-api';

const BATCH_SIZE = 20;

async function getCachedUserInfo(db, userId) {
  const doc = await db.collection('discord_user_cache').findOne({ userId });
  if (doc && Date.now() - doc.updatedAt < 86_400_000) {
    return { username: doc.username, avatar: doc.avatar };
  }
  return null;
}

async function setCachedUserInfo(db, userId, info) {
  await db.collection('discord_user_cache').updateOne(
    { userId },
    { $set: { username: info.username, avatar: info.avatar, updatedAt: Date.now() } },
    { upsert: true }
  );
}

async function resolveDiscordUser(db, userId) {
  const cached = await getCachedUserInfo(db, userId);
  if (cached) return cached;

  const raw = await enrichUserInfo(userId);
  if (!raw) return null;

  const info = { username: raw.username, avatar: raw.avatarUrl };
  await setCachedUserInfo(db, userId, info);
  return info;
}

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

    const [trainingProgress, quizAttempts, ridealongData] = await Promise.all([
      dbStaff.collection('training_progress').find({}).toArray(),
      dbDefault.collection('quiz_attempts').find({}).toArray(),
      dbDefault.collection('ridealong_attempts').find({}).toArray(),
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

    const users = Object.values(userMap).sort((a, b) => {
      const aTime = String(a.lastHandbookUpdate || a.lastAttempt?.timestamp || '');
      const bTime = String(b.lastHandbookUpdate || b.lastAttempt?.timestamp || '');
      return bTime.localeCompare(aTime);
    });

    const userIds = users.map(u => u.userId);
    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
      const batch = userIds.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(uid => resolveDiscordUser(dbDefault, uid))
      );
      for (let j = 0; j < results.length; j++) {
        const info = results[j].status === 'fulfilled' ? results[j].value : null;
        if (info) {
          users[i + j].username = info.username;
          users[i + j].avatar = info.avatar;
        }
      }
    }

    return res.status(200).json({ users });
  } catch (err) {
    console.error('[User Validations API] Error:', err.message);
    console.error('[User Validations API] Stack:', err.stack);
    return res.status(500).json({ error: 'Failed to fetch user validations: ' + err.message });
  }
}
