import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth-options";
import { canReviewApplications } from "../../../lib/admin-helper";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !await canReviewApplications(session)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const guildId = process.env.ALLOWED_GUILD_ID || "1251347648351506485";

  try {
    const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
      headers: {
        'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Discord Roles API Error] Discord responded with:', response.status, errorData);
      return res.status(response.status).json({ message: 'Failed to fetch roles from Discord' });
    }

    const roles = await response.json();
    
    // Sort roles by position (descending)
    roles.sort((a, b) => b.position - a.position);

    // Filter out @everyone and managed roles
    const assignableRoles = roles.filter(role => role.name !== '@everyone' && !role.managed);

    return res.status(200).json(assignableRoles);
  } catch (error) {
    console.error('[Discord Roles API Error] Unexpected error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
