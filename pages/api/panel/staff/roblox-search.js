import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth-options';
import { ROLES } from '../../../../lib/auth';
import { requireAccess } from '../../../../lib/access-check';

function cleanQuery(value) {
  return String(value || '').replace(/[^A-Za-z0-9_]/g, '').slice(0, 20);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not logged in' });
  const access = await requireAccess(session, ROLES.PANEL);
  if (!access.allowed) return res.status(403).json({ error: 'Missing required Discord role' });

  const q = cleanQuery(req.query.q);
  if (q.length < 3) return res.status(200).json({ users: [] });

  try {
    const response = await fetch('https://users.roblox.com/v1/usernames/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ usernames: [q], excludeBannedUsers: false }),
    });
    const body = await response.json().catch(() => ({}));
    const exact = Array.isArray(body.data) ? body.data : [];

    return res.status(200).json({
      users: exact.map(user => ({
        id: String(user.id),
        name: user.name,
        displayName: user.displayName,
      })),
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to search Roblox users' });
  }
}
