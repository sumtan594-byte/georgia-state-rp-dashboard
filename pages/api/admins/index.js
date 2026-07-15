import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth-options';
import clientPromise from '../../../lib/mongodb';
import { logAuditEvent } from '../../../lib/audit-log';

const ADMIN_MANAGER_ROLE = '1486826723210428496';

function isEnvAdmin(session) {
  const adminIds = (process.env.ADMIN_USER_IDS || '').split(',').map(i => i.trim()).filter(Boolean);
  return adminIds.includes(session?.user?.id);
}

async function getDbAdmins() {
  try {
    const client = await clientPromise;
    const db = client.db();
    const docs = await db.collection('admins').find({}).project({ userId: 1, _id: 0 }).toArray();
    return docs.map(d => d.userId).filter(Boolean);
  } catch {
    return [];
  }
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not logged in' });

  const userRoles = session.user?.roles || [];
  const isAdmin = isEnvAdmin(session);
  const canManage = isAdmin || userRoles.includes(ADMIN_MANAGER_ROLE);

  if (!canManage) {
    return res.status(403).json({ error: 'You do not have permission to manage admins' });
  }

  if (req.method === 'GET') {
    try {
      const client = await clientPromise;
      const db = client.db();
      const docs = await db.collection('admins').find({}).sort({ addedAt: -1 }).toArray();

      const enriched = await Promise.all(docs.map(async (doc) => {
        let name = doc.userId;
        let avatar = null;
        try {
          const userRes = await fetch(`https://discord.com/api/users/${doc.userId}`, {
            headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
          });
          if (userRes.ok) {
            const user = await userRes.json();
            name = user.global_name || user.username || doc.userId;
            avatar = user.avatar
              ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
              : null;
          }
        } catch {}

        let addedByName = 'Unknown';
        if (doc.addedBy) {
          try {
            const aRes = await fetch(`https://discord.com/api/users/${doc.addedBy}`, {
              headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
            });
            if (aRes.ok) {
              const aUser = await aRes.json();
              addedByName = aUser.global_name || aUser.username || doc.addedBy;
            }
          } catch {}
        }

        return {
          userId: doc.userId,
          name,
          avatar,
          addedBy: doc.addedBy,
          addedByName,
          addedAt: doc.addedAt,
        };
      }));

      return res.status(200).json({ admins: enriched, envAdmins: (process.env.ADMIN_USER_IDS || '').split(',').map(i => i.trim()).filter(Boolean) });
    } catch (err) {
      console.error('[admins] GET error:', err.message);
      return res.status(500).json({ error: 'Failed to fetch admins' });
    }
  }

  if (req.method === 'POST') {
    const { userId } = req.body;
    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const cleanId = userId.trim();

    try {
      const userRes = await fetch(`https://discord.com/api/users/${cleanId}`, {
        headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
      });
      if (!userRes.ok) {
        return res.status(400).json({ error: 'Invalid Discord user ID, user not found' });
      }

      const client = await clientPromise;
      const db = client.db();

      const existing = await db.collection('admins').findOne({ userId: cleanId });
      if (existing) {
        return res.status(409).json({ error: 'User is already an admin' });
      }

      await db.collection('admins').insertOne({
        userId: cleanId,
        addedBy: session.user.id,
        addedAt: new Date().toISOString(),
      });

      await logAuditEvent({
        action: 'admin_add',
        actorId: session.user.id,
        actorName: session.user.name,
        targetType: 'admin',
        targetId: cleanId,
        details: { addedUserId: cleanId },
        ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress,
      });

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('[admins] POST error:', err.message);
      return res.status(500).json({ error: 'Failed to add admin' });
    }
  }

  if (req.method === 'DELETE') {
    const { userId } = req.body;
    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const cleanId = userId.trim();

    const envAdminIds = (process.env.ADMIN_USER_IDS || '').split(',').map(i => i.trim()).filter(Boolean);
    if (envAdminIds.includes(cleanId)) {
      return res.status(403).json({ error: 'Cannot remove env-configured admins via this panel' });
    }

    try {
      const client = await clientPromise;
      const db = client.db();
      const result = await db.collection('admins').deleteOne({ userId: cleanId });

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Admin not found' });
      }

      await logAuditEvent({
        action: 'admin_remove',
        actorId: session.user.id,
        actorName: session.user.name,
        targetType: 'admin',
        targetId: cleanId,
        details: { removedUserId: cleanId },
        ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress,
      });

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('[admins] DELETE error:', err.message);
      return res.status(500).json({ error: 'Failed to remove admin' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
