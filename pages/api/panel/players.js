import { getServerSession } from 'next-auth';
import { authOptions } from "../../../lib/auth-options";
import { ROLES } from '../../../lib/auth';
import { requireAccess } from '../../../lib/access-check';
import { recordPanelFrame } from '../../../lib/panel-replay-store';

const MIN_POLL_INTERVAL_MS = 1200;
const DEFAULT_POLL_INTERVAL_MS = 2500;
const MAX_POLL_INTERVAL_MS = 10000;
const AVATAR_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const AVATAR_BATCH_SIZE = 100;
const AVATAR_DATA_URI_MAX_BYTES = 80_000;

globalThis.__gsrpErlcCache ??= {
  data: null,
  fetchedAt: 0,
  fetching: null,
  nextAllowedFetch: 0,
  subscribers: new Set(),
  pollTimer: null,
  avatarCache: new Map(),
  avatarFetching: null,
  avatarRateLimitedUntil: 0,
};

export function getCache() {
  return globalThis.__gsrpErlcCache;
}

function canFetch(cache) {
  return Date.now() >= cache.nextAllowedFetch;
}

function updateRateLimit(cache, response) {
  const remaining = parseInt(response.headers.get('x-ratelimit-remaining'));
  const limit = parseInt(response.headers.get('x-ratelimit-limit'));
  const resetEpoch = parseFloat(response.headers.get('x-ratelimit-reset'));
  const bucket = response.headers.get('x-ratelimit-bucket') || 'unknown';
  const resetMs = resetEpoch ? resetEpoch * 1000 : 0;
  const now = Date.now();
  const minimumNext = now + MIN_POLL_INTERVAL_MS;

  if (Number.isFinite(remaining) && remaining <= 1 && resetMs) {
    cache.nextAllowedFetch = Math.max(resetMs + 500, minimumNext);
  } else {
    cache.nextAllowedFetch = Math.max(minimumNext, now + DEFAULT_POLL_INTERVAL_MS);
  }
  cache.lastRateLimit = {
    bucket,
    limit: Number.isFinite(limit) ? limit : null,
    remaining: Number.isFinite(remaining) ? remaining : null,
    resetAt: resetMs || null,
  };
}

function updateRateLimitFromError(cache, headers, retryAfter) {
  const now = Date.now();
  const resetEpoch = headers?.['x-ratelimit-reset'];
  const resetMs = resetEpoch ? parseFloat(resetEpoch) * 1000 : 0;
  const raMs = retryAfter ? parseFloat(retryAfter) * 1000 : 0;

  if (resetMs > now) {
    cache.nextAllowedFetch = resetMs + 500;
  } else if (raMs > 0) {
    cache.nextAllowedFetch = now + raMs + 500;
  } else {
    cache.nextAllowedFetch = now + 5000;
  }
}

function broadcastToSubscribers(data) {
  const msg = JSON.stringify(withPollMetadata(globalThis.__gsrpErlcCache, data));
  for (const sub of globalThis.__gsrpErlcCache.subscribers) {
    try { sub.write(`event: players\ndata: ${msg}\n\n`); } catch { globalThis.__gsrpErlcCache.subscribers.delete(sub); }
  }
}

function withPollMetadata(cache, data) {
  const now = Date.now();
  const nextPollAt = cache.nextAllowedFetch || now;
  return {
    ...data,
    _poll: {
      fetchedAt: cache.fetchedAt || null,
      nextPollAt,
      intervalMs: Math.max(0, nextPollAt - now),
      rateLimit: cache.lastRateLimit || null,
    },
  };
}

function parsePlayerId(raw) {
  if (!raw) return '';
  const ci = String(raw).lastIndexOf(':');
  const id = ci === -1 ? String(raw) : String(raw).slice(ci + 1);
  return /^\d+$/.test(id) ? id : '';
}

function getCachedAvatar(cache, id) {
  const entry = cache.avatarCache.get(id);
  if (!entry) return null;
  if (Date.now() - entry.at > AVATAR_CACHE_TTL_MS) return null;
  return entry.url || null;
}

async function hydratePlayerAvatars(cache, data) {
  if (!Array.isArray(data?.Players) || data.Players.length === 0) return data;

  const now = Date.now();
  const ids = [...new Set(data.Players.map(p => parsePlayerId(p.Player)).filter(Boolean))];
  const missing = ids.filter(id => !getCachedAvatar(cache, id));

  if (missing.length > 0 && now >= cache.avatarRateLimitedUntil) {
    if (!cache.avatarFetching) {
      cache.avatarFetching = (async () => {
        for (let i = 0; i < missing.length; i += AVATAR_BATCH_SIZE) {
          const batch = missing.slice(i, i + AVATAR_BATCH_SIZE);
          const url = `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${batch.join(',')}&size=60x60&format=Png&isCircular=true`;
          const response = await fetch(url, { headers: { Accept: 'application/json' } });

          if (response.status === 429) {
            const retryAfter = parseFloat(response.headers.get('retry-after') || '30');
            cache.avatarRateLimitedUntil = Date.now() + retryAfter * 1000 + 1000;
            return;
          }

          if (!response.ok) return;

          const body = await response.json().catch(() => ({}));
          for (const item of body?.data || []) {
            if (item?.targetId) {
              let dataUri = '';
              if (item.imageUrl) {
                try {
                  const imageResponse = await fetch(item.imageUrl);
                  const contentType = imageResponse.headers.get('content-type') || 'image/png';
                  const bytes = await imageResponse.arrayBuffer();
                  if (imageResponse.ok && bytes.byteLength <= AVATAR_DATA_URI_MAX_BYTES) {
                    dataUri = `data:${contentType};base64,${Buffer.from(bytes).toString('base64')}`;
                  }
                } catch {
                  dataUri = '';
                }
              }
              cache.avatarCache.set(String(item.targetId), {
                url: dataUri,
                at: Date.now(),
              });
            }
          }
        }
      })().finally(() => {
        cache.avatarFetching = null;
      });
    }

    await cache.avatarFetching.catch(() => {});
  }

  data.Players = data.Players.map(player => {
    const id = parsePlayerId(player.Player);
    const avatarUrl = id ? getCachedAvatar(cache, id) : null;
    return avatarUrl ? { ...player, AvatarUrl: avatarUrl } : player;
  });

  return data;
}

export async function refreshFromErlc(cache, key) {
  if (cache.fetching) return cache.fetching;

  cache.fetching = (async () => {
    const url = 'https://api.erlc.gg/v2/server?Players=true&Staff=true&JoinLogs=true&Queue=true&KillLogs=true&CommandLogs=true&ModCalls=true&Vehicles=true&EmergencyCalls=true';
    const response = await fetch(url, { headers: { 'server-key': key } });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const err = new Error(`ERLC error ${response.status}`);
      err.status = response.status;
      err.body = body;
      err.headers = {
        'x-ratelimit-bucket': response.headers.get('x-ratelimit-bucket'),
        'x-ratelimit-limit': response.headers.get('x-ratelimit-limit'),
        'x-ratelimit-remaining': response.headers.get('x-ratelimit-remaining'),
        'x-ratelimit-reset': response.headers.get('x-ratelimit-reset'),
        'retry-after': response.headers.get('retry-after'),
      };

      if (response.status === 429) {
        const retryAfter = body.retry_after ?? err.headers['retry-after'] ?? 5;
        updateRateLimitFromError(cache, err.headers, retryAfter);
      }

      throw err;
    }

    const data = await hydratePlayerAvatars(cache, await response.json());
    const mapEvents = await recordPanelFrame(cache, data);
    if (mapEvents.length > 0) data.MapEvents = mapEvents;
    cache.data = data;
    cache.fetchedAt = Date.now();
    updateRateLimit(cache, response);
    broadcastToSubscribers(data);
    return data;
  })();

  try {
    return await cache.fetching;
  } finally {
    cache.fetching = null;
  }
}

/* ── SSE subscriber lifecycle ────────────────────────────────── */

export function addSubscriber(res) {
  const cache = getCache();
  cache.subscribers.add(res);

  if (cache.data) {
    const msg = JSON.stringify(withPollMetadata(cache, cache.data));
    try { res.write(`event: players\ndata: ${msg}\n\n`); } catch { cache.subscribers.delete(res); }
  }

  ensurePoller(cache);
}

export function removeSubscriber(res) {
  const cache = getCache();
  cache.subscribers.delete(res);

  if (cache.subscribers.size === 0 && cache.pollTimer) {
    clearTimeout(cache.pollTimer);
    cache.pollTimer = null;
  }
}

function ensurePoller(cache) {
  if (cache.pollTimer) return;

  async function tick() {
    if (cache.subscribers.size === 0) {
      if (cache.pollTimer) {
        clearTimeout(cache.pollTimer);
        cache.pollTimer = null;
      }
      return;
    }

    if (canFetch(cache)) {
      const key = process.env.ERLC_API_KEY;
      if (key) {
        try {
          await refreshFromErlc(cache, key);
        } catch {
          // rate-limit backoff handled inside refreshFromErlc
        }
      }
    }

    const now = Date.now();
    const delay = Math.min(
      MAX_POLL_INTERVAL_MS,
      Math.max(MIN_POLL_INTERVAL_MS, cache.nextAllowedFetch > now ? cache.nextAllowedFetch - now : DEFAULT_POLL_INTERVAL_MS)
    );
    cache.pollTimer = setTimeout(tick, delay);
  }

  cache.pollTimer = setTimeout(tick, 0);
}

/* ── HTTP route handler ──────────────────────────────────────── */

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not logged in' });
  const access = await requireAccess(session, ROLES.PANEL);
  if (!access.allowed) {
    return res.status(403).json({ error: 'Missing required Discord role' });
  }

  const { rateLimit } = require('../../../lib/rate-limiter');
  const rl = rateLimit(req, res);
  if (rl.limited) return res.status(429).json({ error: 'Rate limited', retryAfter: rl.retryAfter });

  const ERLC_KEY = process.env.ERLC_API_KEY;
  if (!ERLC_KEY) {
    return res.status(500).json({ error: 'Missing ERLC_API_KEY env var' });
  }

  const cache = getCache();
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  // If we already have cached data, return it immediately — no ERLC call.
  if (cache.data) {
    return res.status(200).json(withPollMetadata(cache, cache.data));
  }

  // No cache at all yet — cold start.
  if (cache.fetching) {
    try {
      await cache.fetching;
    } catch {
    }
    if (cache.data) return res.status(200).json(withPollMetadata(cache, cache.data));
    return res.status(503).json({ error: 'Initial ERLC fetch failed. Please retry.' });
  }

  try {
    await refreshFromErlc(cache, ERLC_KEY);
  } catch (error) {
    if (error.headers) {
      if (error.headers['x-ratelimit-bucket']) res.setHeader('X-RateLimit-Bucket', error.headers['x-ratelimit-bucket']);
      if (error.headers['x-ratelimit-limit']) res.setHeader('X-RateLimit-Limit', error.headers['x-ratelimit-limit']);
      if (error.headers['x-ratelimit-remaining']) res.setHeader('X-RateLimit-Remaining', error.headers['x-ratelimit-remaining']);
      if (error.headers['x-ratelimit-reset']) res.setHeader('X-RateLimit-Reset', error.headers['x-ratelimit-reset']);
      if (error.headers['retry-after']) res.setHeader('Retry-After', error.headers['retry-after']);
    }

    if (error.status === 429) {
      const retryAfter = error.body?.retry_after ?? error.headers?.['retry-after'] ?? 5;
      updateRateLimitFromError(cache, error.headers, retryAfter);
      if (!res.getHeader('Retry-After')) res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({ error: 'ERLC rate limited', retry_after: Number(retryAfter), ...(error.body || {}) });
    }
    console.error('[Panel Players] ERLC fetch error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch ER:LC data' });
  }

  return res.status(200).json(withPollMetadata(cache, cache.data));
}
