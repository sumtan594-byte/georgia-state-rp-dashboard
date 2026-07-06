import { getPool, rowToApplication } from '../../../lib/appdb';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth-options";
import { canReviewApplications } from "../../../lib/admin-helper";
import { getApplicationAutoMark } from '../../../lib/application-auto-marker';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !await canReviewApplications(session)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const { id } = req.query;
  const requestId = String(req.headers['x-request-id'] || `server-${Date.now().toString(36)}`).slice(0, 80);
  const requestSource = String(req.headers['x-gsrp-request'] || 'unknown').slice(0, 40);

  try {
    const pool = getPool();
    if (!pool) return res.status(500).json({ message: 'Database connection failed' });

    if (req.method === 'GET') {
      const startedAt = Date.now();
      console.log(`[Application GET:${requestId}] start | id=${id} | source=${requestSource} | reviewer=${session.user.name}`);
      const [rows] = await pool.execute('SELECT * FROM applications WHERE id = ?', [id]);
      if (rows.length === 0) {
        console.warn(`[Application GET:${requestId}] not-found | id=${id} | ${Date.now() - startedAt}ms`);
        return res.status(404).json({ message: 'Application not found' });
      }
      const application = rowToApplication(rows[0]);
      application.autoMark = await getApplicationAutoMark(id);
      console.log(`[Application GET:${requestId}] complete | id=${id} | type=${application.typeName} | ${Date.now() - startedAt}ms`);
      return res.status(200).json(application);
    }

    if (req.method === 'DELETE') {
      const [result] = await pool.execute('DELETE FROM applications WHERE id = ?', [id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Application not found' });
      }
      console.log('[Application] DELETE:', id, 'by', session.user.name);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('[Application Error]', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
