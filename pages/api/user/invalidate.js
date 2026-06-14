import crypto from 'crypto';
import { invalidateUserRefreshCache } from './refresh';
import { clearAuthConfigCache } from '../../../lib/auth-config';

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ''), 'utf8');
  const right = Buffer.from(String(b || ''), 'utf8');
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const expectedSecret = process.env.ROLE_SYNC_SECRET;
  if (!expectedSecret) {
    return res.status(503).json({ error: 'Role sync not configured' });
  }

  const providedSecret = req.headers['x-role-sync-secret'];
  if (!safeEqual(providedSecret, expectedSecret)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
  const invalidateGuildRoles = body.invalidateGuildRoles === true;
  const invalidateAuthConfig = body.invalidateAuthConfig === true;

  if (!userId && !invalidateGuildRoles && !invalidateAuthConfig) {
    return res.status(400).json({ error: 'userId, invalidateGuildRoles, or invalidateAuthConfig is required' });
  }

  invalidateUserRefreshCache(userId || null, { guildRoles: invalidateGuildRoles });
  if (invalidateAuthConfig) clearAuthConfigCache();

  return res.status(200).json({ success: true, userId: userId || null, invalidateGuildRoles, invalidateAuthConfig });
}
