import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth-options';
import { ROLES } from '../../../lib/auth';
import { requireAccess } from '../../../lib/access-check';

const cache = new Map();
const fetching = new Map();
const CACHE_TTL_MS = 86_400_000;
const MAX_CACHE_SIZE = 500;

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
  if (cached && now - cached.at < CACHE_TTL_MS) {
    return res.redirect(307, cached.url);
  }

  if (fetching.has(id)) {
    return await fetching.get(id).then(url => {
      if (url) return res.redirect(307, url);
      return res.status(404).json({ error: 'Avatar not found' });
    });
  }

  const fetchPromise = (async () => {
    try {
      const thumb = await fetch(
        `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${id}&size=60x60&format=Png&isCircular=true`
      );
      const body = await thumb.json();
      const url = body?.data?.[0]?.imageUrl;

      if (url) {
        if (cache.size >= MAX_CACHE_SIZE) {
          const oldestKey = cache.keys().next().value;
          cache.delete(oldestKey);
        }
        cache.set(id, { url, at: Date.now() });
      }
      return url;
    } finally {
      fetching.delete(id);
    }
  })();

  fetching.set(id, fetchPromise);
  try {
    const finalUrl = await fetchPromise;

    if (!finalUrl) {
      return res.status(404).json({ error: 'Avatar not found', robloxId: id });
    }

    return res.redirect(307, finalUrl);
  } catch (e) {
  fetching.delete(id);
  return res.status(502).json({ error: 'Failed to fetch avatar', detail: e.message });
}
}
