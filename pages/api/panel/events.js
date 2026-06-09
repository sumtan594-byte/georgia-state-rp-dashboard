export const config = { runtime: 'nodejs' };

// How often the server-side poller hits ERLC (ms).
// With 35 req/s global limit and a 2s minimum between fetches in players.js,
// 5s is safe even with multiple SSE clients connected.
const POLL_INTERVAL_MS = 5000;

// Module-level timer reference so only ONE interval runs regardless of how
// many SSE connections are open.
let _pollTimer = null;

function ensurePoller(protocol, host, cookie) {
  if (_pollTimer) return; // already running

  async function tick() {
    const cache = globalThis.__gsrpErlcCache;
    if (!cache || cache.subscribers.size === 0) {
      // No one is listening — stop the poller until someone reconnects
      clearInterval(_pollTimer);
      _pollTimer = null;
      return;
    }

    // canFetch check: respect rate limit backoff set by players.js
    if (Date.now() < (cache.nextAllowedFetch || 0)) return;

    try {
      await fetch(`${protocol}://${host}/api/panel/players`, {
        headers: { cookie: cookie || '' },
      });
      // players.js handles the ERLC call, caches it, and broadcasts to subscribers
    } catch {
      // Network error — will retry next tick
    }
  }

  // Fire immediately, then on interval
  tick();
  _pollTimer = setInterval(tick, POLL_INTERVAL_MS);
}

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  res.write(':ok\n\n');

  const cache = globalThis.__gsrpErlcCache ??= {
    data: null,
    fetchedAt: 0,
    fetching: null,
    nextAllowedFetch: 0,
    subscribers: new Set(),
  };

  cache.subscribers.add(res);

  // Send any existing cached data immediately so the new tab doesn't wait
  if (cache.data) {
    const msg = JSON.stringify({ type: 'players', data: cache.data });
    try { res.write(`data: ${msg}\n\n`); } catch { /* client already gone */ }
  }

  // Start the server-side poller if it isn't running yet.
  // Pass the cookie so the internal fetch passes auth.
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers.host;
  ensurePoller(protocol, host, req.headers.cookie);

  // Keep-alive ping every 15s to prevent proxy timeouts
  const keepalive = setInterval(() => {
    try { res.write(':ping\n\n'); } catch { clearInterval(keepalive); }
  }, 15000);

  req.on('close', () => {
    clearInterval(keepalive);
    cache.subscribers.delete(res);
    // Poller will self-stop on next tick if no subscribers remain
  });
}
