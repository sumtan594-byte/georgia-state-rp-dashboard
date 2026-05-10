import clientPromise from '../../../lib/mongodb';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth-options";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const guildId = process.env.ALLOWED_GUILD_ID;
    const botToken = process.env.DISCORD_BOT_TOKEN;

    // 1. Fetch current member data from Discord
    const memberRes = await fetch(
      `https://discord.com/api/guilds/${guildId}/members/${session.user.id}`,
      { headers: { Authorization: `Bot ${botToken}` } }
    );

    if (!memberRes.ok) {
      return res.status(memberRes.status).json({ message: 'Failed to fetch member from Discord' });
    }

    const member = await memberRes.json();
    const roles = member.roles || [];
    const nickname = member.nick || session.user.name;

    // 2. Fetch role details to determine the top display role
    const rolesRes = await fetch(
      `https://discord.com/api/guilds/${guildId}/roles`,
      { headers: { Authorization: `Bot ${botToken}` } }
    );

    let displayRole = 'User';
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
    }

    // 3. Update the session in the background (optional if using JWT)
    // Since we are returning this to the client, the client can update its local state 
    // or we can use a custom session update mechanism if available.

    return res.status(200).json({
      roles,
      nickname,
      displayRole,
      avatar: member.avatar ? `https://cdn.discordapp.com/avatars/${session.user.id}/${member.avatar}.png` : session.user.avatar
    });
  } catch (error) {
    console.error('[Sync Session Error]', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
