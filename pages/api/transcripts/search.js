import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth-options';
import pool from '../../../lib/ticketdb';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not logged in' });

  const { q, limit = '20', offset = '0' } = req.query;

  if (!q || typeof q !== 'string' || q.trim().length < 2) {
    return res.status(400).json({ error: 'Search query must be at least 2 characters' });
  }

  const searchTerm = `%${q.trim()}%`;
  const lim = Math.min(parseInt(limit) || 20, 100);
  const off = Math.max(parseInt(offset) || 0, 0);

  try {
    const [rows] = await pool.query(
      `SELECT DISTINCT t.id, t.channel_name, t.closed_at, t.type
       FROM transcripts t
       INNER JOIN transcript_messages tm ON tm.transcript_id = t.id
       WHERE tm.message_data LIKE ?
       ORDER BY t.closed_at DESC
       LIMIT ${lim} OFFSET ${off}`,
      [searchTerm]
    );

    const [countRows] = await pool.query(
      `SELECT COUNT(DISTINCT t.id) as total
       FROM transcripts t
       INNER JOIN transcript_messages tm ON tm.transcript_id = t.id
       WHERE tm.message_data LIKE ?`,
      [searchTerm]
    );

    return res.status(200).json({
      results: rows,
      total: countRows[0]?.total || 0,
    });
  } catch (err) {
    console.error('[Transcript Search] Error:', err.message);
    return res.status(500).json({ error: 'Search failed' });
  }
}
