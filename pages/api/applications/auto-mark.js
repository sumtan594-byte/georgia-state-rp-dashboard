import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth-options';
import { canReviewApplications } from '../../../lib/admin-helper';
import { enqueueApplicationMark, getApplicationAutoMark } from '../../../lib/application-auto-marker';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !await canReviewApplications(session)) return res.status(403).json({ message: 'Forbidden' });

  const id = String(req.method === 'GET' ? req.query?.id : req.body?.id || '');
  if (!id || id.length > 100) return res.status(400).json({ message: 'A valid application ID is required.' });

  try {
    if (req.method === 'GET') {
      return res.status(200).json({ autoMark: await getApplicationAutoMark(id) });
    }
    if (req.method === 'POST') {
      await enqueueApplicationMark(id);
      return res.status(202).json({ success: true, autoMark: await getApplicationAutoMark(id) });
    }
    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('[Auto Mark API]', error.message);
    return res.status(500).json({ message: 'Unable to load automatic marking status.' });
  }
}
