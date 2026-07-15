import { getServerSession } from 'next-auth';
import { authOptions } from "../../../lib/auth-options";
import pool, { ensureTranscriptDenyTable } from '../../../lib/ticketdb';
import { enrichUserInfo, enrichRoleInfo } from '../../../lib/discord-api';

const ADMIN_REMOVER_ROLE = '1486826723210428496';
const GUILD_ID = process.env.ALLOWED_GUILD_ID;

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not logged in' });

  const currentUserId = String(session.user?.id || '');
  const { isFullAdmin, getAllAdminIds } = require('../../../lib/admin-helper');
  const isAdmin = await isFullAdmin(currentUserId, session.user?.roles || []);
  const adminIds = await getAllAdminIds();
  const userRoles = session.user?.roles || [];
  const canRemoveAdmins = userRoles.includes(ADMIN_REMOVER_ROLE);

  const { transcriptId } = req.query;

  if (!pool) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  await ensureTranscriptDenyTable();

  if (req.method === 'GET') {
    // Quick access check, used by the polling interval on the viewer page
    if (req.query.check === '1') {
      let hasAccess = isAdmin;

      if (!hasAccess) {
        // Check if user is the ticket owner
        const [ticketRows] = await pool.query(
          'SELECT owner_id FROM transcripts WHERE id = ? LIMIT 1',
          [transcriptId]
        );
        if (ticketRows.length > 0 && String(ticketRows[0].owner_id) === currentUserId) {
          hasAccess = true;
        }
      }

      if (!hasAccess) {
        // Check custom access grants
        const rolePlaceholders = userRoles.map(() => '?').join(',');
        if (rolePlaceholders) {
          const [accessRows] = await pool.query(
            `SELECT 1 FROM transcript_access WHERE transcript_id = ? AND ((grantee_type = 'user' AND grantee_id = ?) OR (grantee_type = 'role' AND grantee_id IN (${rolePlaceholders}))) LIMIT 1`,
            [transcriptId, currentUserId, ...userRoles]
          );
          if (accessRows.length > 0) hasAccess = true;
        }
      }

      // Check transcript_deny table, denied admins lose access
      if (hasAccess) {
        try {
          const [denyRows] = await pool.query(
            'SELECT 1 FROM transcript_deny WHERE transcript_id = ? AND user_id = ? LIMIT 1',
            [transcriptId, currentUserId]
          );
          if (denyRows.length > 0) hasAccess = false;
        } catch (e) {
          if (e.code !== 'ER_NO_SUCH_TABLE') console.error('[Access] deny check error:', e.message);
        }
      }

      return res.status(200).json({ hasAccess });
    }

    const [accessRows] = await pool.query(
      'SELECT id, grantee_id, grantee_type, created_at FROM transcript_access WHERE transcript_id = ? ORDER BY created_at DESC',
      [transcriptId]
    );

    const [ticketRows] = await pool.query(
      'SELECT owner_id FROM transcripts WHERE id = ? LIMIT 1',
      [transcriptId]
    );
    const ownerId = ticketRows?.[0]?.owner_id ? String(ticketRows[0].owner_id) : null;

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

    const owner = ownerId ? await (async () => {
      const user = await enrichUserInfo(ownerId);
      return {
        id: ownerId,
        name: user.username || ownerId,
        avatarUrl: user.avatarUrl,
        isDenied: enrichedDenies.some(d => String(d.user_id) === ownerId),
      };
    })() : null;

    // Enrich admins with Discord info
    const enrichedAdmins = await Promise.all(adminIds.map(async id => {
      const user = await enrichUserInfo(id);
      return { id, name: user.username || id, avatarUrl: user.avatarUrl, isDenied: enrichedDenies.some(d => d.user_id === id) };
    }));

    return res.status(200).json({
      accesses: enrichedAccesses,
      denies: enrichedDenies,
      admins: enrichedAdmins,
      owner,
      isAdmin,
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

    const [ticketRows] = await pool.query(
      'SELECT owner_id FROM transcripts WHERE id = ? LIMIT 1',
      [transcriptId]
    );
    const ownerId = ticketRows?.[0]?.owner_id ? String(ticketRows[0].owner_id) : null;

    if (ownerId && String(granteeId) === ownerId) {
      if (!isAdmin) {
        return res.status(403).json({ error: 'Only admins can remove or restore the ticket owner.' });
      }

      if (req.body.restore) {
        await pool.query(
          'DELETE FROM transcript_deny WHERE transcript_id = ? AND user_id = ?',
          [transcriptId, ownerId]
        );
        return res.status(200).json({ success: true });
      }

      await pool.query(
        'INSERT IGNORE INTO transcript_deny (transcript_id, user_id, denied_by) VALUES (?, ?, ?)',
        [transcriptId, ownerId, currentUserId]
      );
      await pool.query(
        'DELETE FROM transcript_access WHERE transcript_id = ? AND grantee_id = ?',
        [transcriptId, ownerId]
      );
      return res.status(200).json({ success: true });
    }

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
