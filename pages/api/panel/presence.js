import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { ROLES, hasRole, isAdmin } from '../../../lib/auth';

// Widened to 45 s so a couple of missed heartbeats (sent every ~10 s)
// don't suddenly drop the viewer count to 0 and halt server-side refreshes.
const ACTIVE_WINDOW_MS = 45000;

globalThis.__gsrpPresence ??= new Map();

function getStore() {
  return globalThis.__gsrpPresence;
}

export function getActiveViewerCount() {
  const now = Date.now();
  const store = getStore();
  for (const [key, ts] of store.entries()) {
    if (now - ts > ACTIVE_WINDOW_MS) store.delete(key);
  }
  return store.size;
}

export function hasActiveViewers() {
  return getActiveViewerCount() > 0;
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not logged in' });
  if (!hasRole(session, ROLES.PANEL) && !isAdmin(session)) {
    return res.status(403).json({ error: 'Missing required Discord role' });
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const store = getStore();
  const key = `${session.user.id}:${req.headers['user-agent'] || 'ua'}`;

  if (req.method === 'POST') {
    store.set(key, Date.now());
  }

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  return res.status(200).json({ ok: true, activeViewers: getActiveViewerCount() });
}
