import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth-options';
import { ROLES, isAdmin } from '../../../../lib/auth';
import { requireAccess } from '../../../../lib/access-check';
import {
  getCurrentWave,
  getLeaderboard,
  getQuotaArchive,
  getStaffShiftConfig,
  updateStaffShiftConfig,
} from '../../../../lib/staff-shift-db';
import { userHasAnyRole } from '../../../../lib/staff-shift-config';

async function assertManager(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return { status: 401, error: 'Not logged in' };
  const panelAccess = await requireAccess(session, ROLES.PANEL);
  if (!panelAccess.allowed) return { status: 403, error: 'Missing required Discord role' };
  const config = await getStaffShiftConfig();
  if (!isAdmin(session) && !userHasAnyRole(session, config.managerRoleIds)) {
    return { status: 403, error: 'Manager role required' };
  }
  return { session, config };
}

export default async function handler(req, res) {
  const guard = await assertManager(req, res);
  if (guard.error) return res.status(guard.status).json({ error: guard.error });

  if (!['GET', 'PUT'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });

  try {
    if (req.method === 'PUT') {
      const updated = await updateStaffShiftConfig({
        ...guard.config,
        ...(req.body?.config || {}),
      });
      return res.status(200).json({ success: true, config: updated });
    }

    const archiveNumber = req.query.archive ? Number(req.query.archive) : null;
    if (archiveNumber) {
      const archive = await getQuotaArchive(archiveNumber);
      if (!archive) return res.status(404).json({ error: 'Archive not found' });
      return res.status(200).json({ archive });
    }

    const wave = await getCurrentWave(guard.config);
    const leaderboard = await getLeaderboard({ waveNumber: Number(req.query.wave || wave.number), limit: 500 });
    return res.status(200).json({ config: guard.config, wave, leaderboard });
  } catch (error) {
    console.error('[StaffPanel] management failed:', error);
    return res.status(500).json({ error: error.message || 'Failed to load management data' });
  }
}
