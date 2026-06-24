const ALLOWED_TYPES = new Set(['fastpass', 'transfer']);

export default function handler(req, res) {
  const type = String(req.query.type || '').toLowerCase();
  const discordId = String(req.query.discordId || '').trim();

  if (!ALLOWED_TYPES.has(type)) {
    return res.status(400).json({ error: 'Invalid staff intake type' });
  }

  if (!/^\d{17,20}$/.test(discordId)) {
    return res.status(400).json({ error: 'Invalid Discord ID' });
  }

  const callbackUrl = `/api/staff-intake/complete?type=${encodeURIComponent(type)}&discordId=${encodeURIComponent(discordId)}`;
  const signinUrl = `/api/auth/signin/discord?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  return res.redirect(302, signinUrl);
}
