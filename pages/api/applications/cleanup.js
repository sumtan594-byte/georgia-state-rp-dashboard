import { getPool } from '../../../lib/appdb';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth-options";
import { canReviewApplications } from "../../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session || !canReviewApplications(session)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    const pool = getPool();
    if (!pool) return res.status(500).json({ message: 'Database connection failed' });

    const [result] = await pool.execute(
      `DELETE FROM applications WHERE submitted_at < DATE_SUB(NOW(), INTERVAL 7 DAY) AND status != 'pending'`
    );

    console.log(`[Application Cleanup] Deleted ${result.affectedRows} old non-pending applications`);
    return res.status(200).json({
      success: true,
      deletedCount: result.affectedRows
    });
  } catch (error) {
    console.error('[Application Cleanup] Error:', error.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
