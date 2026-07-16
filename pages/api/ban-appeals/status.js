import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth-options";
import { fetchBanStatus } from '../../../lib/access-check';
import { getPool } from '../../../lib/appdb';

// Reports whether the signed-in user is banned from the guild and the state
// of their latest ban appeal. Ban status always comes from Discord live -
// the session flag only controls routing, never eligibility.
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 'private, no-store, max-age=0');

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const banStatus = await fetchBanStatus(session.user.id);
  if (!banStatus) {
    return res.status(503).json({ message: 'Could not verify your ban status right now. Please try again shortly.' });
  }

  let appeal = null;
  try {
    const pool = getPool();
    if (pool) {
      const [rows] = await pool.execute(
        "SELECT id, status, submitted_at, reason, reviewed_at FROM applications WHERE user_id = ? AND type = 'ban_appeal' ORDER BY submitted_at DESC LIMIT 1",
        [session.user.id]
      );
      if (rows.length > 0) {
        appeal = {
          id: rows[0].id,
          status: rows[0].status,
          submittedAt: rows[0].submitted_at,
          reason: rows[0].reason || null,
          reviewedAt: rows[0].reviewed_at || null,
        };
      }
    }
  } catch (err) {
    console.error('[Ban Appeal Status] Appeal lookup failed:', err.message);
  }

  return res.status(200).json({
    banned: banStatus.banned,
    banReason: banStatus.banned ? (banStatus.reason || null) : null,
    username: session.user.name || '',
    userId: session.user.id,
    userImage: session.user.image || null,
    appeal,
  });
}
