import { getServerSession } from 'next-auth';
import { authOptions } from '../../lib/auth-options';
import { isFullAdmin } from '../../lib/admin-helper';
import { getAuditLogs } from '../../lib/audit-log';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not authenticated' });

  const isAdmin = await isFullAdmin(session.user?.id, session.user?.roles || []);
  if (!isAdmin) return res.status(403).json({ error: 'Admin access required' });

  const { limit = '50', skip = '0', action } = req.query;

  const result = await getAuditLogs({
    limit: parseInt(limit),
    skip: parseInt(skip),
    action: action || undefined,
  });

  return res.status(200).json(result);
}
