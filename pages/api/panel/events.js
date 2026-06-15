export const config = { runtime: 'nodejs' };

import { getServerSession } from 'next-auth';
import { authOptions } from "../../../lib/auth-options";
import { ROLES } from '../../../lib/auth';
import { requireAccess } from '../../../lib/access-check';
import { addSubscriber, removeSubscriber } from './players';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).end();
  const access = await requireAccess(session, ROLES.PANEL);
  if (!access.allowed) return res.status(403).end();

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-store',
    'Connection': 'keep-alive',
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
