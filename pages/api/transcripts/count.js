import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth-options';
import { rateLimit } from '../../../lib/rate-limiter';
import pool, { accessibleTranscriptsQuery } from '../../../lib/ticketdb';

const globalForTranscriptCount = globalThis;
const countCache = globalForTranscriptCount.__transcriptCountCache || new Map();
globalForTranscriptCount.__transcriptCountCache = countCache;
const COUNT_CACHE_TTL_MS = 15000;

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not authenticated' });

  const rl = rateLimit(req, res, 'transcript');
  if (rl.limited) return res.status(429).json({ error: 'Rate limited', retryAfter: rl.retryAfter });

  const currentUserId = String(session.user?.id || "");
  const { isFullAdmin } = require('../../../lib/admin-helper');
  const isAdmin = await isFullAdmin(currentUserId, session.user?.roles || []);
  const roles = session.user?.roles || [];
  const cacheKey = `${currentUserId}:${isAdmin ? 'admin' : 'user'}:${roles.map(String).sort().join(',')}`;
  const cached = countCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    res.setHeader('Cache-Control', 'private, max-age=15');
    return res.status(200).json({ count: cached.count });
  }

  if (!pool) {
    return res.status(200).json({ count: 0 });
  }

  try {
    const { where, params } = await accessibleTranscriptsQuery(isAdmin, currentUserId, roles);
    const [rows] = await pool.query(
      `SELECT COUNT(*) as count FROM transcripts WHERE ${where}`,
      params
    );
    const count = rows[0].count;
    countCache.set(cacheKey, { count, expiresAt: Date.now() + COUNT_CACHE_TTL_MS });
    res.setHeader('Cache-Control', 'private, max-age=15');
    return res.status(200).json({ count });
  } catch (e) {
    console.error('[Transcripts Count] DB error:', e.message);
    return res.status(200).json({ count: 0 });
  }
}
