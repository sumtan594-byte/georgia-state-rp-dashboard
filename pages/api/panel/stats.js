import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth-options';
import { ROLES } from '../../../lib/auth';
import { requireAccess } from '../../../lib/access-check';

// Reuse the same shared cache as players.js — no direct ERLC calls here
function getCache() {
  globalThis.__gsrpErlcCache ??= {
    data: null,
    fetchedAt: 0,
    fetching: null,
    nextAllowedFetch: 0,
    subscribers: new Set(),
  };
  return globalThis.__gsrpErlcCache;
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not authenticated' });
  const access = await requireAccess(session, ROLES.PANEL);
  if (!access.allowed) {
    return res.status(403).json({ error: 'Panel access required' });
  }

  const cache = getCache();

  // If we have cached data, derive stats from it — no extra ERLC call
  if (cache.data) {
    const data = cache.data;
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
      _fromCache: true,
      _cacheAge: Math.round((Date.now() - cache.fetchedAt) / 1000),
    });
  }

  // No cache yet — trigger a players fetch to warm it, then return what we get
  const ERLC_KEY = process.env.ERLC_API_KEY;
  if (!ERLC_KEY) return res.status(500).json({ error: 'Missing ERLC_API_KEY' });

  try {
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host;
    const r = await fetch(`${protocol}://${host}/api/panel/players`, {
      headers: { cookie: req.headers.cookie || '' },
    });
    if (!r.ok) return res.status(r.status).json({ error: 'ERLC API error', status: r.status });

    const data = await r.json();
    const staff = data.Staff || {};
    const adminCount = Object.keys(staff.Admins || {}).length;
    const modCount = Object.keys(staff.Mods || {}).length;
    const helperCount = Object.keys(staff.Helpers || {}).length;
    const queue = data.Queue || [];

    return res.status(200).json({
      playerCount: data.CurrentPlayers || 0,
      maxPlayers: data.MaxPlayers || 0,
      staffCount: adminCount + modCount + helperCount,
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
