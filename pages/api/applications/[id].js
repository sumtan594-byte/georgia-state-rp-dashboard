import { getPool, rowToApplication } from '../../../lib/appdb';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth-options";
import { canReviewApplications } from "../../../lib/auth";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !canReviewApplications(session)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const { id } = req.query;

  try {
    const pool = getPool();
    if (!pool) return res.status(500).json({ message: 'Database connection failed' });

    if (req.method === 'GET') {
      const [rows] = await pool.execute('SELECT * FROM applications WHERE id = ?', [id]);
      if (rows.length === 0) {
        return res.status(404).json({ message: 'Application not found' });
      }
      const application = rowToApplication(rows[0]);
      console.log('[Application] GET:', id, '|', application.typeName, '| by', session.user.name);
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
