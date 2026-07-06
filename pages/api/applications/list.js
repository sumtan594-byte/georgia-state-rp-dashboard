import { getPool, rowToApplication } from '../../../lib/appdb';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth-options";
import { canReviewApplications } from "../../../lib/admin-helper";

export function invalidateAppListCache() {}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  const session = await getServerSession(req, res, authOptions);
  if (!session || !await canReviewApplications(session)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(250, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;
    const typeFilter = req.query.type || null;
    const statusFilter = req.query.status || null;

    if (statusFilter && !['pending', 'accepted', 'denied'].includes(statusFilter)) {
      return res.status(400).json({ message: 'Invalid application status filter' });
    }

    const pool = getPool();
    if (!pool) return res.status(500).json({ message: 'Database connection failed' });

    const whereParts = [];
    const params = [];

    if (typeFilter) {
      if (typeFilter === 'staff') {
        whereParts.push('(type = ? OR type IS NULL)');
        params.push('staff');
      } else {
        whereParts.push('type = ?');
        params.push(typeFilter);
      }
    }
    if (statusFilter) {
      whereParts.push('status = ?');
      params.push(statusFilter);
    }
    const whereClause = whereParts.length ? whereParts.join(' AND ') : '1=1';

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
      typeName: a.type_name,
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
