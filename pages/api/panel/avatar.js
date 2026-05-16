import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth-options';
import { ROLES, hasRole, isAdmin } from '../../../lib/auth';

const cache = new Map();
const CACHE_TTL_MS = 300_000;
const MAX_CACHE_SIZE = 500;

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not authenticated' });
  if (!hasRole(session, ROLES.PANEL) && !isAdmin(session)) {
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

  try {
    const thumb = await fetch(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${id}&size=60x60&format=Png&isCircular=true`
    );
    const body = await thumb.json();
    const url = body?.data?.[0]?.imageUrl;

    if (!url) {
      return res.status(404).json({ error: 'Avatar not found', robloxId: id });
    }

    if (cache.size >= MAX_CACHE_SIZE) {
      const oldestKey = cache.keys().next().value;
      cache.delete(oldestKey);
    }
    cache.set(id, { url, at: now });
    return res.redirect(307, url);
  } catch (e) {
    return res.status(502).json({ error: 'Failed to fetch avatar', detail: e.message });
  }
}
