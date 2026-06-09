export const config = { runtime: 'nodejs' };

import { getCache, refreshFromErlc } from './players';

const ERLC_KEY = process.env.ERLC_API_KEY;
const POLL_INTERVAL_MS = 5000;
let _pollTimer = null;

function ensurePoller() {
  if (_pollTimer) return;

  async function tick() {
    const cache = getCache();
    if (!cache || cache.subscribers.size === 0) {
      clearInterval(_pollTimer);
      _pollTimer = null;
      return;
    }

    if (Date.now() < (cache.nextAllowedFetch || 0)) return;

    try {
      await refreshFromErlc(cache, ERLC_KEY);
    } catch {
      // players.js handles rate-limit backoff; retry next tick
    }
  }

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

  const cache = getCache();
  cache.subscribers.add(res);

  if (cache.data) {
    const msg = JSON.stringify({ type: 'players', data: cache.data });
    try { res.write(`data: ${msg}\n\n`); } catch { /* client already gone */ }
  }

  ensurePoller();

  const keepalive = setInterval(() => {
    try { res.write(':ping\n\n'); } catch { clearInterval(keepalive); }
  }, 15000);

  req.on('close', () => {
    clearInterval(keepalive);
    cache.subscribers.delete(res);
  });
}
