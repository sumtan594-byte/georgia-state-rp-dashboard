import pool, { accessibleTranscriptsQuery } from '../../../lib/ticketdb';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { getSession } = require("next-auth/react");
  const session = await getSession({ req });
  if (!session) return res.status(401).json({ error: 'Not authenticated' });

  const currentUserId = String(session.user?.id || "");
  const adminIds = (process.env.ADMIN_USER_IDS || "").split(',').map(id => String(id).trim()).filter(Boolean);
  const isAdmin = adminIds.includes(currentUserId);

  try {
    const { where, params } = await accessibleTranscriptsQuery(isAdmin, currentUserId, session.user?.roles || []);
    const [rows] = await pool.query(
      `SELECT COUNT(*) as count FROM transcripts WHERE ${where}`,
      params
    );
    return res.status(200).json({ count: rows[0].count });
  } catch (e) {
    console.error('[Transcripts Count] DB error:', e.message);
    return res.status(200).json({ count: 0 });
  }
}
