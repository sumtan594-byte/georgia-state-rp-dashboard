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
    const playersRes = await fetch('https://api.erlc.gg/v2/server?Players=true&Staff=true', {
      headers: { 'server-key': ERLC_KEY },
    });

    if (!playersRes.ok) {
      return res.status(502).json({ error: 'ERLC API error', status: playersRes.status });
    }

    const data = await playersRes.json();

    const players = data.Players || [];
    const staff = data.Staff || [];

    return res.status(200).json({
      playerCount: players.length,
      staffCount: staff.length,
      serverName: data.Name || 'Unknown',
      uptime: data.Uptime || null,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Server Stats] Error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch server stats' });
  }
}
