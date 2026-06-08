import { getPool, rowToApplication } from '../../../lib/appdb';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth-options";
import { canReviewApplications } from "../../../lib/auth";

export function invalidateAppListCache() {}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !canReviewApplications(session)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;
    const typeFilter = req.query.type || null;

    const pool = getPool();
    if (!pool) return res.status(500).json({ message: 'Database connection failed' });

    let whereClause = '1=1';
    const params = [];

    if (typeFilter) {
      if (typeFilter === 'staff') {
        whereClause = '(type = ? OR type IS NULL)';
        params.push('staff');
      } else {
        whereClause = 'type = ?';
        params.push(typeFilter);
      }
    }

    const [applications] = await pool.execute(
      `SELECT id, type, type_name, username, user_id, user_image, status, submitted_at FROM applications WHERE ${whereClause} ORDER BY submitted_at DESC LIMIT ? OFFSET ?`,
      [...params, String(limit), String(skip)]
    );

    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM applications WHERE ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    const [counts] = await pool.execute(
      `SELECT COALESCE(type, 'staff') as app_type, COUNT(*) as count FROM applications GROUP BY app_type`
    );

    const countsMap = {};
    counts.forEach(c => { countsMap[c.app_type] = c.count; });

    const mapped = applications.map(a => ({
      _id: a.id,
      username: a.username,
      userId: a.user_id,
      userImage: a.user_image,
      status: a.status,
      type: a.type,
      submittedAt: a.submitted_at,
    }));

    return res.status(200).json({
      applications: mapped,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      counts: countsMap,
    });
  } catch (error) {
    console.error('[Application List Error]', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
