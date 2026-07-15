import { getPool } from '../../../lib/appdb';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth-options";
import { getAllAdminIds } from "../../../lib/admin-helper";
import { invalidateAppListCache } from './list';

const CONFIRM_PHRASE = 'DELETE ALL';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // System administrators only, the same set that populates session.user.isAdmin
  // (ADMIN_USER_IDS env + the admins collection). Deliberately NOT the broader
  // application-reviewer permission.
  const adminIds = await getAllAdminIds();
  if (!adminIds.includes(String(session.user.id))) {
    return res.status(403).json({ message: 'Forbidden, system administrators only' });
  }

  if (req.body?.confirm !== CONFIRM_PHRASE) {
    return res.status(400).json({ message: `Confirmation required. Type "${CONFIRM_PHRASE}".` });
  }

  try {
    const pool = getPool();
    if (!pool) return res.status(500).json({ message: 'Database connection failed' });

    // Clear auxiliary auto-mark records first (best-effort; table may not exist).
    let autoMarksDeleted = 0;
    try {
      const [am] = await pool.execute('DELETE FROM application_auto_marks');
      autoMarksDeleted = am.affectedRows;
    } catch (e) {
      console.warn('[Application Delete All] auto-marks clear skipped:', e.message);
    }

    const [result] = await pool.execute('DELETE FROM applications');
    invalidateAppListCache();

    console.log(`[Application Delete All] ${session.user.name} (${session.user.id}) deleted ${result.affectedRows} applications and ${autoMarksDeleted} auto-mark records`);
    return res.status(200).json({
      success: true,
      deletedCount: result.affectedRows,
      autoMarksDeleted,
    });
  } catch (error) {
    console.error('[Application Delete All] Error:', error.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
