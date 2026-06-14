import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth-options';
import { canManageAuthorization } from '../../../lib/admin-helper';
import { fetchDiscordRoles, getAuthConfig, saveAuthConfig } from '../../../lib/auth-config';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not authenticated' });

  const allowed = await canManageAuthorization(session);
  if (!allowed) return res.status(403).json({ error: 'Not authorized' });

  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method === 'GET') {
    const [config, roles] = await Promise.all([
      getAuthConfig({ force: true }),
      fetchDiscordRoles(),
    ]);
    return res.status(200).json({ config, roles });
  }

  if (req.method === 'PUT') {
    const resources = Array.isArray(req.body?.resources) ? req.body.resources : null;
    if (!resources) return res.status(400).json({ error: 'resources array required' });

    const config = await saveAuthConfig(resources, session.user?.id);
    const roles = await fetchDiscordRoles();
    return res.status(200).json({ config, roles });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
