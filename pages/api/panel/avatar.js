import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth-options';
import { ROLES } from '../../../lib/auth';
import { requireAccess } from '../../../lib/access-check';

const cache = new Map();
const fetching = new Map();
const CACHE_TTL_MS = 300_000; // 5 min for rate-limit safety; 24h for the actual redirect
const MAX_CACHE_SIZE = 500;

// Concurrency gate — max 5 simultaneous outbound Roblox fetches
const MAX_CONCURRENT = 5;
let activeFetches = 0;
const pendingQueue = [];

function acquireSlot() {
  return new Promise(resolve => {
    if (activeFetches < MAX_CONCURRENT) {
      activeFetches++;
      resolve();
    } else {
      pendingQueue.push(resolve);
    }
  });
}

function releaseSlot() {
  if (pendingQueue.length > 0) {
    const next = pendingQueue.shift();
    next();
  } else {
    activeFetches--;
  }
}

// Per-process rate-limit state for Roblox thumbnail API
let robloxRateLimitedUntil = 0;

async function fetchRobloxThumbnail(userId) {
  if (Date.now() < robloxRateLimitedUntil) {
    throw Object.assign(new Error('Roblox rate limited'), { status: 429 });
  }

  await acquireSlot();
  try {
    const url = `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=60x60&format=Png&isCircular=true`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    if (res.status === 429) {
      const retryAfter = parseFloat(res.headers.get('Retry-After') || '5');
      robloxRateLimitedUntil = Date.now() + retryAfter * 1000 + 500;
      throw Object.assign(new Error('Roblox rate limited'), { status: 429, retryAfter });
    }

    if (!res.ok) {
      throw Object.assign(new Error(`Roblox API error ${res.status}`), { status: res.status });
    }

    const body = await res.json();
    return body?.data?.[0]?.imageUrl || null;
  } finally {
    releaseSlot();
  }
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not authenticated' });
  const access = await requireAccess(session, ROLES.PANEL);
  if (!access.allowed) {
    return res.status(403).json({ error: 'Panel access required' });
  }

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing roblox userId' });
  if (!/^\d+$/.test(id)) {
    return res.status(400).json({ error: 'Invalid roblox userId format' });
  }

  const now = Date.now();
  const cached = cache.get(id);

  // Serve from cache if fresh enough, or stale if we're currently rate-limited
  if (cached) {
    if (now - cached.at < CACHE_TTL_MS) {
      return res.redirect(307, cached.url);
    }
    if (Date.now() < robloxRateLimitedUntil && cached.url) {
      return res.redirect(307, cached.url);
    }
  }

  // Deduplicate in-flight
  if (fetching.has(id)) {
    try {
      const url = await fetching.get(id);
      if (url) return res.redirect(307, url);
      return res.status(404).json({ error: 'Avatar not found' });
    } catch (e) {
      if (e.status === 429) {
        return res.status(429).json({ error: 'Avatar rate limited. Try again.' });
      }
      return res.status(502).json({ error: 'Failed to fetch avatar' });
    }
  }

  const fetchPromise = fetchRobloxThumbnail(id).then(url => {
    if (url) {
      if (cache.size >= MAX_CACHE_SIZE) {
        const oldestKey = cache.keys().next().value;
        cache.delete(oldestKey);
      }
      cache.set(id, { url, at: Date.now() });
    }
    return url;
  }).finally(() => {
    fetching.delete(id);
  });

  fetching.set(id, fetchPromise);

  try {
    const finalUrl = await fetchPromise;
    if (!finalUrl) {
      return res.status(404).json({ error: 'Avatar not found', robloxId: id });
    }
    return res.redirect(307, finalUrl);
  } catch (e) {
    fetching.delete(id);
    if (e.status === 429) {
      return res.status(429).json({ error: 'Avatar rate limited. Try again.' });
    }
    return res.status(502).json({ error: 'Failed to fetch avatar', detail: e.message });
  }
}
