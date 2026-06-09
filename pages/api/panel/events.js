export const config = { runtime: 'nodejs' };

import { addSubscriber, removeSubscriber } from './players';

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-store',
  });

  res.write(':ok\n\n');

  addSubscriber(res);

  const keepalive = setInterval(() => {
    try { res.write(':ping\n\n'); } catch { clearInterval(keepalive); }
  }, 15000);

  req.on('close', () => {
    clearInterval(keepalive);
    removeSubscriber(res);
  });
}
