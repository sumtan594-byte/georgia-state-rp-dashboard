import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { canReviewApplications } from "../../../lib/auth";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !canReviewApplications(session)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const guildId = "1251347648351506485"; // GSRP Guild ID

  try {
    const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
      headers: {
        'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch roles from Discord');
    }

    const roles = await response.json();
    
    // Sort roles by position (descending)
    roles.sort((a, b) => b.position - a.position);

    // Filter out @everyone if needed, but usually helpful to keep for reference? 
    // Actually, @everyone can't be assigned/removed easily, so filter it.
    const assignableRoles = roles.filter(role => role.name !== '@everyone' && !role.managed);

    return res.status(200).json(assignableRoles);
  } catch (error) {
    console.error('[Discord Roles API Error]', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
