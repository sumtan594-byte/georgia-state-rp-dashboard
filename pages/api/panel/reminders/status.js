import { getServerSession } from 'next-auth';
import { authOptions } from "../../../lib/auth-options";

const REMINDERS_ROLE_ID = '1394297547597680670';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not logged in' });
  if (!session.user.roles.includes(REMINDERS_ROLE_ID)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  // Get state from the global worker instance
  const state = globalThis.__gsrpReminderState || {
    status: 'offline',
    nextReminder: null,
    nextRunAt: 0,
    playerCount: 0,
    lastError: null,
  };

  return res.status(200).json(state);
}
