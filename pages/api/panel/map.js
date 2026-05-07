import { getServerSession } from 'next-auth';
import { authOptions } from "../../../lib/auth-options";
import { ROLES, hasRole, isAdmin } from '../../../lib/auth';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not logged in' });
  if (!hasRole(session, ROLES.PANEL) && !isAdmin(session)) {
    return res.status(403).json({ error: 'Missing required Discord role' });
  }

  try {
    const response = await fetch('https://api.erlc.gg/maps/fall_postals.png');

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch map image' });
    }

    const buffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'private, max-age=86400');
    return res.status(200).send(Buffer.from(buffer));
  } catch (error) {
    return res.status(500).json({
      error: 'Map proxy error',
      detail: error.message
    });
  }
}
