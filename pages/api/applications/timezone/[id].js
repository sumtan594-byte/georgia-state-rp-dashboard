import { getPool, rowToApplication } from '../../../../lib/appdb';
import clientPromise from '../../../../lib/mongodb';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth-options";
import { canReviewApplications } from "../../../../lib/admin-helper";

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ message: 'Application ID is required' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session || !await canReviewApplications(session)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    const pool = getPool();
    if (!pool) return res.status(500).json({ message: 'Database connection failed' });

    const [rows] = await pool.execute('SELECT * FROM applications WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Application not found' });
    }
    const app = rowToApplication(rows[0]);

    if (app.timezone && app.timezone.includes('/')) {
      return res.status(200).json({ timezone: app.timezone });
    }

    let ip = app.ip;
    if (!ip && app.userId) {
      const client = await clientPromise;
      const db = client.db("gsrp_staff");
      const profile = await db.collection("visitor_profiles").findOne({ _id: app.userId });
      if (profile && profile.ip) {
        ip = profile.ip;
      } else if (profile && profile.ips && profile.ips.length > 0) {
        ip = profile.ips[0];
      }
    }

    if (!ip || ip === 'unknown' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
      return res.status(404).json({ message: 'No resolvable IP found for this applicant' });
    }

    const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=status,timezone`);
    const geoData = await geoRes.json();

    if (geoData.status === 'success' && geoData.timezone) {
      return res.status(200).json({ timezone: geoData.timezone });
    }

    return res.status(404).json({ message: 'Could not resolve timezone from IP' });
  } catch (error) {
    console.error('[Timezone API] Error:', error.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
