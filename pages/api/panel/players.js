import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { ROLES, hasRole, isAdmin } from '../../../lib/auth';

const CACHE_TTL_MS = 2000;

globalThis.__gsrpErlcCache ??= {
  data: null,
  fetchedAt: 0,
  fetching: null,
};

function getCache() {
  return globalThis.__gsrpErlcCache;
}

function isFresh(cache) {
  return cache.data && (Date.now() - cache.fetchedAt) < CACHE_TTL_MS;
}

async function refreshFromErlc(cache, key) {
  if (cache.fetching) return cache.fetching;

  cache.fetching = (async () => {
    const url = 'https://api.policeroleplay.community/v2/server?Players=true&Staff=true&JoinLogs=true&KillLogs=true&CommandLogs=true&ModCalls=true&Vehicles=true';
    const response = await fetch(url, { headers: { 'server-key': key } });

    if (response.status === 429) {
      const body = await response.json().catch(() => ({}));
      throw Object.assign(new Error('ERLC rate limited'), { status: 429, body });
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw Object.assign(new Error(`ERLC error ${response.status}`), {
        status: response.status,
        body: { error: `ERLC error ${response.status}`, detail: text }
      });
    }

    const data = await response.json();
    cache.data = data;
    cache.fetchedAt = Date.now();
    return data;
  })();

  try {
    return await cache.fetching;
  } finally {
    cache.fetching = null;
  }
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not logged in' });
  if (!hasRole(session, ROLES.PANEL) && !isAdmin(session)) {
    return res.status(403).json({ error: 'Missing required Discord role' });
  }

  const ERLC_KEY = process.env.ERLC_API_KEY;
  if (!ERLC_KEY) {
    return res.status(500).json({ error: 'Missing ERLC_API_KEY env var' });
  }

  const cache = getCache();
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  if (!isFresh(cache)) {
    try {
      await refreshFromErlc(cache, ERLC_KEY);
    } catch (error) {
      if (error.status === 429) {
        return res.status(429).json(error.body || { error: 'ERLC rate limited' });
      }
      if (cache.data) {
        return res.status(200).json({ ...cache.data, _stale: true });
      }
      return res.status(500).json({ error: 'Failed to fetch ER:LC data', detail: error.message });
    }
  }

  return res.status(200).json(cache.data);
}
