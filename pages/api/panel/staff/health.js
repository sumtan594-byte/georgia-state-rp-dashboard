import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth-options';
import { ROLES } from '../../../../lib/auth';
import { requireAccess } from '../../../../lib/access-check';
import { checkStaffShiftDatabase } from '../../../../lib/staff-shift-db';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not logged in' });

  const panelAccess = await requireAccess(session, ROLES.PANEL);
  if (!panelAccess.allowed) return res.status(403).json({ error: 'Missing required Discord role' });

  const result = await checkStaffShiftDatabase({ logPrefix: '[StaffPanelDB]' });
  return res.status(result.ok ? 200 : 503).json(result);
}
