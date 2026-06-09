export const config = { runtime: 'nodejs' };

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send initial keepalive
  res.write(':ok\n\n');

  const cache = globalThis.__gsrpErlcCache ??= { subscribers: new Set() };
  cache.subscribers.add(res);

  // Keepalive ping every 15s
  const keepalive = setInterval(() => {
    try { res.write(':ping\n\n'); } catch { clearInterval(keepalive); }
  }, 15000);

  req.on('close', () => {
    clearInterval(keepalive);
    cache.subscribers.delete(res);
  });
}
