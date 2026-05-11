import { getServerSession } from 'next-auth';
import { authOptions } from "../../../lib/auth-options";
import pool from '../../../lib/ticketdb';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not logged in' });

  const currentUserId = String(session.user?.id || '');
  const adminIds = (process.env.ADMIN_USER_IDS || '').split(',').map(id => String(id).trim()).filter(Boolean);
  const isAdmin = adminIds.includes(currentUserId);

  const { transcriptId } = req.query;
  if (!transcriptId) return res.status(400).json({ error: 'Missing transcriptId' });

  // Verify the caller is owner or admin
  const [ownerRows] = await pool.query('SELECT owner_id FROM transcripts WHERE id = ? LIMIT 1', [transcriptId]);
  if (ownerRows.length === 0) return res.status(404).json({ error: 'Transcript not found' });

  const isOwner = String(ownerRows[0].owner_id) === currentUserId;
  if (!isAdmin && !isOwner) return res.status(403).json({ error: 'Not authorized to manage access' });

  if (req.method === 'GET') {
    const [rows] = await pool.query(
      'SELECT id, grantee_id, grantee_type, created_at FROM transcript_access WHERE transcript_id = ? ORDER BY created_at DESC',
      [transcriptId]
    );
    return res.status(200).json({ accesses: rows });
  }

  const { granteeId, granteeType } = req.body;

  if (req.method === 'POST') {
    if (!granteeId || !granteeType) return res.status(400).json({ error: 'Missing granteeId or granteeType' });
    if (!['user', 'role'].includes(granteeType)) return res.status(400).json({ error: 'granteeType must be user or role' });

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

  if (req.method === 'DELETE') {
    if (!granteeId) return res.status(400).json({ error: 'Missing granteeId' });

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
