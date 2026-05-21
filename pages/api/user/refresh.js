import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth-options';
import clientPromise from '../../../lib/mongodb';

async function getDbAdminIds() {
  try {
    const client = await clientPromise;
    const db = client.db();
    const docs = await db.collection('admins').find({}).project({ userId: 1, _id: 0 }).toArray();
    return docs.map(d => d.userId).filter(Boolean);
  } catch {
    return [];
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not logged in' });

  const userId = session.user.id;

  try {
    const memberRes = await fetch(
      `https://discord.com/api/guilds/${process.env.ALLOWED_GUILD_ID}/members/${userId}`,
      { headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` } }
    );

    if (!memberRes.ok) {
      return res.status(200).json({ error: 'Failed to fetch member', roles: [], displayRole: 'User' });
    }

    const member = await memberRes.json();
    const roles = member.roles || [];

    let displayRole = 'User';
    const rolesRes = await fetch(
      `https://discord.com/api/guilds/${process.env.ALLOWED_GUILD_ID}/roles`,
      { headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` } }
    );

    if (rolesRes.ok) {
      const allRoles = await rolesRes.json();
      const userRoles = allRoles.filter(r => roles.includes(r.id));
      userRoles.sort((a, b) => b.position - a.position);

      for (const role of userRoles) {
        if (role.name.includes('────')) continue;
        if (role.id === '1391175328545636444') { displayRole = 'Donator +'; break; }
        if (role.id === '1372482493701165118') { displayRole = 'Donator'; break; }
        if (role.id === '1438063270631182376') { displayRole = 'Former foundation member'; break; }
        if (role.id === '1372481017436438579') { displayRole = 'Retired staff member'; break; }
        displayRole = role.name;
        break;
      }

      const discordRoles = allRoles.filter(r => roles.includes(r.id)).map(r => ({ id: r.id, name: r.name }));
    } else {
      var discordRoles = [];
    }

    res.setHeader('Cache-Control', 'no-store, max-age=0');

    const envAdminIds = (process.env.ADMIN_USER_IDS || '').split(',').map(i => i.trim()).filter(Boolean);
    const dbAdminIds = await getDbAdminIds();
    const allAdminIds = [...new Set([...envAdminIds, ...dbAdminIds])];
    const isAdminUser = allAdminIds.includes(member.user?.id || userId);

    return res.status(200).json({
      id: member.user?.id || userId,
      name: member.user?.global_name || member.user?.username || session.user.name,
      username: member.user?.username || '',
      avatar: member.user?.avatar
        ? `https://cdn.discordapp.com/avatars/${member.user.id}/${member.user.avatar}.png`
        : session.user.image,
      roles,
      displayRole,
      isAdmin: isAdminUser,
      discordRoles: typeof discordRoles !== 'undefined' ? discordRoles : [],
    });
  } catch (err) {
    console.error('[user/refresh] Error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
