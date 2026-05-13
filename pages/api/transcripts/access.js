import { getServerSession } from 'next-auth';
import { authOptions } from "../../../lib/auth-options";
import pool from '../../../lib/ticketdb';
import { enrichUserInfo, enrichRoleInfo } from '../../../lib/discord-api';

const ADMIN_REMOVER_ROLE = '1486826723210428496';
const GUILD_ID = process.env.ALLOWED_GUILD_ID;

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not logged in' });

  const currentUserId = String(session.user?.id || '');
  const adminIds = (process.env.ADMIN_USER_IDS || '').split(',').map(id => String(id).trim()).filter(Boolean);
  const isAdmin = adminIds.includes(currentUserId);
  const userRoles = session.user?.roles || [];
  const canRemoveAdmins = userRoles.includes(ADMIN_REMOVER_ROLE);

  const { transcriptId } = req.query;
  if (!transcriptId) return res.status(400).json({ error: 'Missing transcriptId' });

  // Verify transcript exists
  const [ownerRows] = await pool.query('SELECT owner_id FROM transcripts WHERE id = ? LIMIT 1', [transcriptId]);
  if (ownerRows.length === 0) return res.status(404).json({ error: 'Transcript not found' });

  const isOwner = String(ownerRows[0].owner_id) === currentUserId;
  const canManage = isAdmin || isOwner;

  // ── CHECK endpoint: anyone can see if they themselves have access ──
  if (req.method === 'GET' && req.query.check === '1') {
    // Check deny first (applies to everyone, including admins)
    let isDenied = false;
    try {
      const [denyRows] = await pool.query(
        'SELECT 1 FROM transcript_deny WHERE transcript_id = ? AND user_id = ? LIMIT 1',
        [transcriptId, currentUserId]
      );
      isDenied = denyRows.length > 0;
    } catch (e) {
      if (e.code !== 'ER_NO_SUCH_TABLE') console.error('[Access] check deny error:', e.message);
    }
    if (isDenied) return res.status(200).json({ hasAccess: false });

    if (isAdmin) return res.status(200).json({ hasAccess: true });
    if (isOwner) return res.status(200).json({ hasAccess: true });

    const rolePlaceholders = userRoles.map(() => '?').join(',');
    let accessSql, accessParams;
    if (rolePlaceholders) {
      accessSql = `SELECT 1 FROM transcript_access WHERE transcript_id = ? AND ((grantee_type = 'user' AND grantee_id = ?) OR (grantee_type = 'role' AND grantee_id IN (${rolePlaceholders}))) LIMIT 1`;
      accessParams = [transcriptId, currentUserId, ...userRoles];
    } else {
      accessSql = `SELECT 1 FROM transcript_access WHERE transcript_id = ? AND grantee_type = 'user' AND grantee_id = ? LIMIT 1`;
      accessParams = [transcriptId, currentUserId];
    }
    const [accessRows] = await pool.query(accessSql, accessParams);
    return res.status(200).json({ hasAccess: accessRows.length > 0 });
  }

  // All other methods require manage permission
  if (!canManage) return res.status(403).json({ error: 'Not authorized' });

  // ── GET: list grants + admins + denies ──
  if (req.method === 'GET') {
    const [accessRows] = await pool.query(
      'SELECT id, grantee_id, grantee_type, created_at FROM transcript_access WHERE transcript_id = ? ORDER BY created_at DESC',
      [transcriptId]
    );

    let denyRows = [];
    try {
      [denyRows] = await pool.query(
        'SELECT id, user_id, created_at FROM transcript_deny WHERE transcript_id = ? ORDER BY created_at DESC',
        [transcriptId]
      );
    } catch (e) {
      if (e.code !== 'ER_NO_SUCH_TABLE') console.error('[Access] GET denies error:', e.message);
    }

    // Enrich grantees with Discord info
    const enrichedAccesses = await Promise.all(accessRows.map(async a => {
      if (a.grantee_type === 'role') {
        const role = await enrichRoleInfo(a.grantee_id, GUILD_ID);
        return { ...a, name: role.name, color: role.color, iconUrl: role.iconUrl };
      }
      const user = await enrichUserInfo(a.grantee_id);
      return { ...a, name: user.username || a.grantee_id, avatarUrl: user.avatarUrl };
    }));

    // Enrich denies with Discord info
    const enrichedDenies = await Promise.all(denyRows.map(async d => {
      const user = await enrichUserInfo(d.user_id);
      return { ...d, name: user.username || d.user_id, avatarUrl: user.avatarUrl };
    }));

    // Enrich admins with Discord info
    const enrichedAdmins = await Promise.all(adminIds.map(async id => {
      const user = await enrichUserInfo(id);
      return { id, name: user.username || id, avatarUrl: user.avatarUrl, isDenied: enrichedDenies.some(d => d.user_id === id) };
    }));

    return res.status(200).json({
      accesses: enrichedAccesses,
      denies: enrichedDenies,
      admins: enrichedAdmins,
      canManage,
      canRemoveAdmins,
    });
  }

  const { granteeId, granteeType } = req.body;

  // ── POST: grant access ──
  if (req.method === 'POST') {
    if (!granteeId || !granteeType) return res.status(400).json({ error: 'Missing granteeId or granteeType' });
    if (granteeType === 'user' && adminIds.includes(granteeId) && !canRemoveAdmins) {
      return res.status(403).json({ error: 'You cannot add an admin. Only users with the required role can manage admin access.' });
    }

    try {
      await pool.query(
        'INSERT INTO transcript_access (transcript_id, grantee_id, grantee_type, granted_by) VALUES (?, ?, ?, ?)',
        [transcriptId, granteeId, granteeType, currentUserId]
      );
      return res.status(200).json({ success: true });
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Access already granted' });
      console.error('[Access] POST error:', e.message);
      return res.status(500).json({ error: 'Failed to grant access' });
    }
  }

  // ── DELETE: revoke access ──
  if (req.method === 'DELETE') {
    if (!granteeId) return res.status(400).json({ error: 'Missing granteeId' });

    // Admin restore: remove from transcript_deny
    if (adminIds.includes(granteeId) && req.body.restore) {
      if (!canRemoveAdmins) {
        return res.status(403).json({ error: 'You cannot restore an admin. Only users with the required role can manage admin access.' });
      }
      try {
        await pool.query(
          'DELETE FROM transcript_deny WHERE transcript_id = ? AND user_id = ?',
          [transcriptId, granteeId]
        );
        return res.status(200).json({ success: true });
      } catch (e) {
        if (e.code === 'ER_NO_SUCH_TABLE') return res.status(200).json({ success: true });
        console.error('[Access] DELETE restore error:', e.message);
        return res.status(500).json({ error: 'Failed to restore admin access' });
      }
    }

    // Admin deny: add to transcript_deny
    if (adminIds.includes(granteeId)) {
      if (!canRemoveAdmins) {
        return res.status(403).json({ error: 'You cannot remove an admin. Only users with the required role can manage admin access.' });
      }
      try {
        await pool.query(
          'INSERT IGNORE INTO transcript_deny (transcript_id, user_id, denied_by) VALUES (?, ?, ?)',
          [transcriptId, granteeId, currentUserId]
        );
      } catch (e) {
        if (e.code !== 'ER_NO_SUCH_TABLE') {
          console.error('[Access] DELETE admin deny error:', e.message);
          return res.status(500).json({ error: 'Failed to revoke admin access' });
        }
      }
      // Also clean up any explicit transcript_access entry
      try {
        await pool.query(
          'DELETE FROM transcript_access WHERE transcript_id = ? AND grantee_id = ?',
          [transcriptId, granteeId]
        );
        return res.status(200).json({ success: true });
      } catch (e) {
        console.error('[Access] DELETE admin cleanup error:', e.message);
        return res.status(500).json({ error: 'Failed to revoke admin access' });
      }
    }

    // Non-admin: delete from transcript_access
    try {
      await pool.query(
        'DELETE FROM transcript_access WHERE transcript_id = ? AND grantee_id = ?',
        [transcriptId, granteeId]
      );
      return res.status(200).json({ success: true });
    } catch (e) {
      console.error('[Access] DELETE error:', e.message);
      return res.status(500).json({ error: 'Failed to revoke access' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
