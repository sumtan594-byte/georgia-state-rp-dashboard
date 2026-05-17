import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth-options';
import { ROLES, hasRole, isAdmin } from '../../../lib/auth';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not authenticated' });
  if (!hasRole(session, ROLES.PANEL) && !isAdmin(session)) {
    return res.status(403).json({ error: 'Panel access required' });
  }

  const ERLC_KEY = process.env.ERLC_API_KEY;
  if (!ERLC_KEY) {
    return res.status(500).json({ error: 'Missing ERLC_API_KEY' });
  }

  try {
    const playersRes = await fetch('https://api.erlc.gg/v2/server?Players=true&Staff=true&Queue=true', {
      headers: { 'server-key': ERLC_KEY },
    });

    if (!playersRes.ok) {
      return res.status(502).json({ error: 'ERLC API error', status: playersRes.status });
    }

    const data = await playersRes.json();

    const staff = data.Staff || {};
    const adminCount = Object.keys(staff.Admins || {}).length;
    const modCount = Object.keys(staff.Mods || {}).length;
    const helperCount = Object.keys(staff.Helpers || {}).length;
    const totalStaff = adminCount + modCount + helperCount;

    const queue = data.Queue || [];

    return res.status(200).json({
      playerCount: data.CurrentPlayers || 0,
      maxPlayers: data.MaxPlayers || 0,
      staffCount: totalStaff,
      adminCount,
      modCount,
      helperCount,
      queueCount: queue.length,
      serverName: data.Name || 'Unknown',
      joinKey: data.JoinKey || null,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Server Stats] Error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch server stats' });
  }
}
