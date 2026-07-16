import { getServerSession } from 'next-auth';
import { authOptions } from "../../../lib/auth-options";
import pool, { ensureTranscriptDenyTable } from '../../../lib/ticketdb';

// Runs the given statements as a single atomic transaction so a mid-delete
// failure can't leave orphaned rows (e.g. transcript_messages pointing at an
// already-deleted transcript). `work(conn)` receives a dedicated connection.
async function withTransaction(work) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (err) {
    try { await conn.rollback(); } catch {}
    throw err;
  } finally {
    conn.release();
  }
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not logged in' });

  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const currentUserId = String(session.user?.id || '');
  const { isFullAdmin } = require('../../../lib/admin-helper');
  const isAdmin = await isFullAdmin(currentUserId, session.user?.roles || []);

  if (!pool) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    if (req.method === 'DELETE') {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'Missing transcript id' });

      if (!isAdmin) {
        await ensureTranscriptDenyTable();

        const [rows] = await pool.query(
          'SELECT owner_id FROM transcripts WHERE id = ? LIMIT 1',
          [id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Transcript not found' });
        const [denyRows] = await pool.query(
          'SELECT 1 FROM transcript_deny WHERE transcript_id = ? AND user_id = ? LIMIT 1',
          [id, currentUserId]
        );
        if (denyRows.length > 0) {
          return res.status(403).json({ error: 'Your access to this transcript has been revoked' });
        }
        if (String(rows[0].owner_id) !== currentUserId) {
          return res.status(403).json({ error: 'You can only delete your own transcripts' });
        }
      }

      await withTransaction(async (conn) => {
        await conn.query('DELETE FROM transcript_access WHERE transcript_id = ?', [id]);
        await conn.query('DELETE FROM transcript_deny WHERE transcript_id = ?', [id]);
        await conn.query('DELETE FROM transcript_messages WHERE transcript_id = ?', [id]);
        await conn.query('DELETE FROM transcripts WHERE id = ?', [id]);
      });

      return res.status(200).json({ success: true, deleted: [id] });
    }

    if (req.method === 'POST') {
      const { ids, clearAll } = req.body;

      if (clearAll) {
        if (!isAdmin) return res.status(403).json({ error: 'Only admins can clear all transcripts' });

        await pool.query('DELETE FROM transcript_access');
        await pool.query('DELETE FROM transcript_deny');
        await pool.query('DELETE FROM transcript_messages');
        const [result] = await pool.query('DELETE FROM transcripts');

        return res.status(200).json({ success: true, deleted: [], count: result.affectedRows });
      }

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'Missing ids array' });
      }

      const placeholders = ids.map(() => '?').join(',');

      if (!isAdmin) {
        await ensureTranscriptDenyTable();

        const [ownerRows] = await pool.query(
          `SELECT id, owner_id FROM transcripts WHERE id IN (${placeholders})`,
          ids
        );
        const [denyRows] = await pool.query(
          `SELECT transcript_id FROM transcript_deny WHERE user_id = ? AND transcript_id IN (${placeholders})`,
          [currentUserId, ...ids]
        );
        if (denyRows.length > 0) {
          return res.status(403).json({
            error: 'Your access to one or more selected transcripts has been revoked',
            offendingId: denyRows[0].transcript_id,
          });
        }
        for (const row of ownerRows) {
          if (String(row.owner_id) !== currentUserId) {
            return res.status(403).json({
              error: 'You can only delete your own transcripts',
              offendingId: row.id,
            });
          }
        }
      }

      await pool.query(`DELETE FROM transcript_access WHERE transcript_id IN (${placeholders})`, ids);
      await pool.query(`DELETE FROM transcript_deny WHERE transcript_id IN (${placeholders})`, ids);
      await pool.query(`DELETE FROM transcript_messages WHERE transcript_id IN (${placeholders})`, ids);
      const [result] = await pool.query(`DELETE FROM transcripts WHERE id IN (${placeholders})`, ids);

      return res.status(200).json({ success: true, deleted: ids, count: result.affectedRows });
    }
  } catch (e) {
    console.error('[Transcripts Delete] Error:', e.message);
    return res.status(500).json({ error: 'Failed to delete transcripts' });
  }
}
