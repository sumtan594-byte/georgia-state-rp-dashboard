import { getToken } from 'next-auth/jwt';

const ALLOWED_TYPES = new Set(['fastpass', 'transfer']);
const REQUIRED_SCOPES = ['identify', 'guilds'];

function hasRequiredScopes(token) {
  const scopes = String(token?.scope || '').split(/\s+/).filter(Boolean);
  return REQUIRED_SCOPES.every(scope => scopes.includes(scope));
}

export default async function handler(req, res) {
  const type = String(req.query.type || '').toLowerCase();
  const discordId = String(req.query.discordId || '').trim();

  if (!ALLOWED_TYPES.has(type)) {
    return res.status(400).json({ error: 'Invalid staff intake type' });
  }

  if (!/^\d{17,20}$/.test(discordId)) {
    return res.status(400).json({ error: 'Invalid Discord ID' });
  }

  const callbackUrl = `/api/staff-intake/complete?type=${encodeURIComponent(type)}&discordId=${encodeURIComponent(discordId)}`;
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (token?.accessToken && token.id === discordId && hasRequiredScopes(token)) {
    return res.redirect(302, callbackUrl);
  }

  const signinUrl = `/api/auth/signin/discord?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  return res.redirect(302, signinUrl);
}
