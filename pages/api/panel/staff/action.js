import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth-options';
import { ROLES, isAdmin } from '../../../../lib/auth';
import { requireAccess } from '../../../../lib/access-check';
import { enqueueErlcCommand } from '../../../../lib/erlc-command-queue';
import {
  addStaffLog,
  adjustQuota,
  endBreak,
  endShift,
  getAllActiveShifts,
  getCurrentWave,
  getLeaderboard,
  getRecentStaffLogs,
  getStaffShiftConfig,
  getUserShiftSummary,
  startBreak,
  startShift,
} from '../../../../lib/staff-shift-db';
import { userHasAnyRole } from '../../../../lib/staff-shift-config';

const ROBLOX_USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;
const ACTIONS = new Set(['warn', 'kick', 'ban', 'bolo', 'custom']);

function cleanText(value, max = 500) {
  return String(value || '')
    .replace(/[\r\n\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function staffName(session) {
  return cleanText(session.user?.global_name || session.user?.name || session.user?.username || session.user?.id, 255);
}

async function managerAllowed(session, config) {
  return isAdmin(session) || userHasAnyRole(session, config.managerRoleIds || []);
}

async function sendModerationCommand(action, targetUsername, reason) {
  const key = process.env.ERLC_API_KEY;
  if (!key) return { skipped: true, error: 'Missing ERLC_API_KEY' };
  if (action === 'custom' || action === 'bolo') return { skipped: true };

  const command = action === 'warn'
    ? `:pm ${targetUsername} You are being warned for ${reason}`
    : action === 'kick'
      ? `:kick ${targetUsername} ${reason}`
      : `:ban ${targetUsername}`;

  const response = await enqueueErlcCommand(command, key);
  return { ok: response.ok, status: response.status };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not logged in' });

  const panelAccess = await requireAccess(session, ROLES.PANEL);
  if (!panelAccess.allowed) return res.status(403).json({ error: 'Missing required Discord role' });

  try {
    const config = await getStaffShiftConfig();
    const body = req.body || {};
    const op = body.op;
    const actorId = session.user.id;
    const targetDiscordId = cleanText(body.discordId || actorId, 32);
    const isSelf = targetDiscordId === actorId;
    const isManager = await managerAllowed(session, config);

    if (!isSelf && !isManager) return res.status(403).json({ error: 'Manager role required' });

    if (op === 'start_shift') {
      await startShift({ discordId: targetDiscordId, discordName: isSelf ? staffName(session) : cleanText(body.discordName || targetDiscordId, 255) });
    } else if (op === 'end_shift') {
      await endShift({ discordId: targetDiscordId, actorId, force: !isSelf, reason: cleanText(body.reason || '', 255) || null });
    } else if (op === 'start_break') {
      await startBreak({ discordId: targetDiscordId });
    } else if (op === 'end_break') {
      await endBreak({ discordId: targetDiscordId, actorId });
    } else if (op === 'adjust_quota') {
      if (!isManager) return res.status(403).json({ error: 'Manager role required' });
      const minutesDelta = Number(body.minutesDelta);
      if (!Number.isFinite(minutesDelta) || minutesDelta === 0) return res.status(400).json({ error: 'minutesDelta is required' });
      await adjustQuota({
        discordId: targetDiscordId,
        shiftId: body.shiftId || null,
        minutesDelta,
        reason: cleanText(body.reason || 'Manager adjustment', 500),
        actorId,
      });
    } else if (op === 'create_log') {
      const action = cleanText(body.action, 24);
      const targetUsername = cleanText(body.robloxUsername, 255);
      const reason = cleanText(body.reason, 1000);
      if (!ACTIONS.has(action)) return res.status(400).json({ error: 'Invalid log action' });
      if (!ROBLOX_USERNAME_RE.test(targetUsername)) return res.status(400).json({ error: 'Invalid Roblox username' });
      if (!reason) return res.status(400).json({ error: 'Reason is required' });

      const erlc = await sendModerationCommand(action, targetUsername, reason);
      await addStaffLog({
        staffDiscordId: actorId,
        staffName: staffName(session),
        robloxUserId: body.robloxUserId ? cleanText(body.robloxUserId, 32) : null,
        robloxUsername: targetUsername,
        action,
        reason,
        source: 'website',
        isInGame: !!body.isInGame,
      });
      if (erlc?.error) res.setHeader('X-ERLC-Warning', erlc.error);
    } else {
      return res.status(400).json({ error: 'Unknown operation' });
    }

    const wave = await getCurrentWave(config);
    const [activeShift, mySummary, activeShifts, recentLogs, leaderboard] = await Promise.all([
      getUserShiftSummary(actorId, wave.number).then(summary => summary.activeShift),
      getUserShiftSummary(actorId, wave.number),
      getAllActiveShifts(),
      getRecentStaffLogs({ minutes: 60, limit: 80 }),
      getLeaderboard({ waveNumber: wave.number, limit: 100 }),
    ]);

    return res.status(200).json({ success: true, activeShift, mySummary, activeShifts, recentLogs, leaderboard });
  } catch (error) {
    console.error('[StaffPanel] action failed:', error);
    return res.status(500).json({ error: error.message || 'Failed to update staff panel' });
  }
}
