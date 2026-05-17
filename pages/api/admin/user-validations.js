import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth-options';
import clientPromise from '../../../lib/mongodb';

async function resolveDiscordUser(userId) {
  try {
    const res = await fetch(`https://discord.com/api/users/${userId}`, {
      headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
    });
    if (!res.ok) return null;
    const user = await res.json();
    return {
      username: user.global_name || user.username || userId,
      avatar: user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`
        : `https://cdn.discordapp.com/embed/avatars/${(BigInt(user.id) >> 22n) % 6n}.png`,
    };
  } catch {
    return null;
  }
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

    const [trainingProgress, quizAttempts] = await Promise.all([
      dbStaff.collection('training_progress').find({}).toArray(),
      dbDefault.collection('quiz_attempts').find({}).toArray(),
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
          scenarioCompleted: false,
          scenarioScore: null,
          scenarioPercentage: null,
          scenarioPassed: null,
          scenarioCompletedAt: null,
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

    const users = Object.values(userMap).sort((a, b) => {
      const aTime = String(a.lastHandbookUpdate || a.lastAttempt?.timestamp || '');
      const bTime = String(b.lastHandbookUpdate || b.lastAttempt?.timestamp || '');
      return bTime.localeCompare(aTime);
    });

    const userIds = users.map(u => u.userId);
    const resolved = await Promise.all(userIds.map(id => resolveDiscordUser(id)));
    resolved.forEach((info, i) => {
      if (info) {
        users[i].username = info.username;
        users[i].avatar = info.avatar;
      }
    });

    return res.status(200).json({ users });
  } catch (err) {
    console.error('[User Validations API] Error:', err.message);
    console.error('[User Validations API] Stack:', err.stack);
    return res.status(500).json({ error: 'Failed to fetch user validations: ' + err.message });
  }
}
