import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth-options';
import { ROLES, isAdmin } from '../../../../lib/auth';
import { requireAccess } from '../../../../lib/access-check';
import {
  archiveFinishedWaves,
  getActiveShift,
  getAllActiveShifts,
  getCurrentWave,
  getLeaderboard,
  getRecentStaffLogs,
  getStaffShiftConfig,
  getUserShiftSummary,
} from '../../../../lib/staff-shift-db';
import { userHasAnyRole } from '../../../../lib/staff-shift-config';

function displayName(session) {
  return session?.user?.global_name || session?.user?.name || session?.user?.username || session?.user?.id || 'Staff';
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not logged in' });

  const panelAccess = await requireAccess(session, ROLES.PANEL);
  if (!panelAccess.allowed) return res.status(403).json({ error: 'Missing required Discord role' });

  try {
    await archiveFinishedWaves();
    const config = await getStaffShiftConfig();
    const wave = await getCurrentWave(config);
    const discordId = session.user.id;
    const activeShift = await getActiveShift(discordId);
    const mySummary = await getUserShiftSummary(discordId, wave.number);
    const activeShifts = await getAllActiveShifts();
    const recentLogs = await getRecentStaffLogs({ minutes: 60, limit: 80 });
    const leaderboard = await getLeaderboard({ waveNumber: wave.number, limit: 100 });

    return res.status(200).json({
      user: {
        discordId,
        name: displayName(session),
        avatar: session.user.image || null,
        roles: session.user.roles || [],
        isManager: isAdmin(session) || userHasAnyRole(session, config.managerRoleIds),
      },
      config,
      wave,
      activeShift,
      mySummary,
      activeShifts,
      recentLogs,
      leaderboard,
    });
  } catch (error) {
    console.error('[StaffPanel] overview failed:', error);
    return res.status(500).json({ error: error.message || 'Failed to load staff panel' });
  }
}
