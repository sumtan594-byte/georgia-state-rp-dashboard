import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth-options";
import { deleteLinkedRobloxUser } from "../../../lib/linked-roblox-user";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const discordId = session.user.id;
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  try {
    const deleted = await deleteLinkedRobloxUser(discordId);

    if (!deleted) {
      return res.status(404).json({ error: 'No linked account found to unlink.' });
    }

    if (webhookUrl) {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `UNLINK_DATA:${discordId}`,
          allowed_mentions: { parse: [] }
        })
      });
    }

    return res.status(200).json({ success: true, message: 'Successfully unlinked account.' });

  } catch (error) {
    console.error('Unlink Error:', error);
    return res.status(500).json({ error: 'Failed to unlink account. Please try again later.' });
  }
}
