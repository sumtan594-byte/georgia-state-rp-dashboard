import { getServerSession } from 'next-auth';
import { authOptions } from "../../../lib/auth-options";
import pool, { accessibleTranscriptsQuery } from '../../../lib/ticketdb';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not logged in' });

  const currentUserId = String(session.user?.id || '');
  const adminIds = (process.env.ADMIN_USER_IDS || '').split(',').map(id => String(id).trim()).filter(Boolean);
  const isAdmin = adminIds.includes(currentUserId);
  const { sort = 'latest' } = req.query;

  try {
    const { where, params } = await accessibleTranscriptsQuery(isAdmin, currentUserId, session.user?.roles || []);

    const [rows] = await pool.query(
      `SELECT id, type, owner_id, channel_name, close_reason,
              DATE_FORMAT(closed_at, '%Y-%m-%d') as date,
              DATE_FORMAT(closed_at, '%H:%i:%s') as time
       FROM transcripts
       WHERE ${where}
       ORDER BY closed_at ${sort === 'oldest' ? 'ASC' : 'DESC'}`,
      params
    );

    const transcripts = rows.map(r => ({
      rawName: r.id,
      type: r.type || 'UNKNOWN',
      ownerId: r.owner_id || 'UNKNOWN',
      channelName: r.channel_name || 'Unknown',
      date: r.date || '1970-01-01',
      reason: r.close_reason || 'NoReason',
      time: r.time || '00:00:00',
    }));

    res.status(200).json({ transcripts, isAdmin });
  } catch (e) {
    console.error('[Transcripts API] DB fetch error:', e.message);
    res.status(500).json({ error: e.message, transcripts: [] });
  }
}
