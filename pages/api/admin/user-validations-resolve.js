import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth-options';
import clientPromise from '../../../lib/mongodb';
import { enrichUserInfo } from '../../../lib/discord-api';

const MAX_IDS = 20;

async function setCachedUserInfo(db, userId, info) {
  await db.collection('discord_user_cache').updateOne(
    { userId },
    { $set: { username: info.username, avatar: info.avatar, updatedAt: Date.now() } },
    { upsert: true }
  );
}

// Resolve Discord info for a single user. Returns null when the lookup fails
// (or only echoes back the raw ID) so we never poison the cache with the ID.
async function resolveDiscordUser(db, userId) {
  const raw = await enrichUserInfo(userId);
  if (!raw || !raw.username || raw.username === userId) return null;

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

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ids = Array.isArray(req.body?.userIds) ? req.body.userIds : [];
  const userIds = [...new Set(ids.filter(id => typeof id === 'string'))].slice(0, MAX_IDS);
  if (userIds.length === 0) return res.status(200).json({ resolved: {} });

  try {
    const client = await clientPromise;
    const db = client.db();

    const results = await Promise.allSettled(
      userIds.map(uid => resolveDiscordUser(db, uid))
    );

    const resolved = {};
    for (let i = 0; i < results.length; i++) {
      const info = results[i].status === 'fulfilled' ? results[i].value : null;
      if (info) resolved[userIds[i]] = info;
    }

    return res.status(200).json({ resolved });
  } catch (err) {
    console.error('[User Validations Resolve API] Error:', err.message);
    return res.status(500).json({ error: 'Failed to resolve users' });
  }
}
