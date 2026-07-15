import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth-options';
import { ROLES } from '../../../lib/auth';
import { requireAccess } from '../../../lib/access-check';
import { getCache, refreshFromErlc } from './players';

function buildStats(data, cache, fromCache) {
  const staff = data.Staff || {};
  const adminCount = Object.keys(staff.Admins || {}).length;
  const modCount = Object.keys(staff.Mods || {}).length;
  const helperCount = Object.keys(staff.Helpers || {}).length;
  const queue = data.Queue || [];

  return {
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
    _fromCache: fromCache,
    _cacheAge: cache.fetchedAt ? Math.round((Date.now() - cache.fetchedAt) / 1000) : null,
  };
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not authenticated' });
  const access = await requireAccess(session, ROLES.PANEL);
  if (!access.allowed) {
    return res.status(403).json({ error: 'Panel access required' });
  }

  const cache = getCache();

  // If we have cached data, derive stats from it, no extra ERLC call
  if (cache.data) {
    return res.status(200).json(buildStats(cache.data, cache, true));
  }

  // No cache yet, warm the same process cache directly, no HTTP self-call.
  const ERLC_KEY = process.env.ERLC_API_KEY;
  if (!ERLC_KEY) return res.status(500).json({ error: 'Missing ERLC_API_KEY' });

  try {
    const data = await refreshFromErlc(cache, ERLC_KEY);
    return res.status(200).json(buildStats(data, cache, false));
  } catch (err) {
    console.error('[Server Stats] Error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch server stats' });
  }
}
