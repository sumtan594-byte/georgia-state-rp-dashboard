import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth-options';
import { ROLES } from '../../../../lib/auth';
import { requireAccess } from '../../../../lib/access-check';
import { fetchPlayerReplay } from '../../../../lib/panel-replay-store';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not authenticated' });
  const access = await requireAccess(session, ROLES.PANEL);
  if (!access.allowed) return res.status(403).json({ error: 'Panel access required' });

  const id = String(req.query.id || '').trim();
  if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'Invalid player id' });

  try {
    const replay = await fetchPlayerReplay(id);
    return res.status(200).json(replay);
  } catch (error) {
    console.error('[Panel Replay] Fetch error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch replay' });
  }
}
