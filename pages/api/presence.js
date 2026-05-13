import { getServerSession } from 'next-auth';
import { authOptions } from '../../lib/auth-options';

// Active window: 45 seconds without a heartbeat = offline
const ACTIVE_WINDOW_MS = 45_000;

// Global in-process store: userId -> { name, image, page, ts }
globalThis.__dashPresence ??= new Map();

function purge() {
  const now = Date.now();
  for (const [key, entry] of globalThis.__dashPresence.entries()) {
    if (now - entry.ts > ACTIVE_WINDOW_MS) globalThis.__dashPresence.delete(key);
  }
}

function getActiveViewers(page) {
  purge();
  const viewers = [];
  for (const entry of globalThis.__dashPresence.values()) {
    if (!page || entry.page === page) viewers.push(entry);
  }
  // Deduplicate by userId (keep most recent)
  const seen = new Map();
  for (const v of viewers) seen.set(v.userId, v);
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not logged in' });

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  const page = req.query.page || '/';

  if (req.method === 'POST') {
    // Heartbeat: register/refresh this user on the page
    globalThis.__dashPresence.set(session.user.id, {
      userId: session.user.id,
      name: session.user.name,
      image: session.user.image,
      page,
      ts: Date.now(),
    });
    return res.status(200).json({ ok: true, viewers: getActiveViewers(page) });
  }

  if (req.method === 'GET') {
    return res.status(200).json({ viewers: getActiveViewers(page) });
  }

  if (req.method === 'DELETE') {
    // Explicit leave (page unload)
    globalThis.__dashPresence.delete(session.user.id);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
