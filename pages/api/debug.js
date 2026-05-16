import { getServerSession } from 'next-auth';
import { authOptions } from '../../lib/auth-options';
import { isFullAdmin } from '../../lib/admin-helper';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not authenticated' });

  const isAdmin = await isFullAdmin(session.user?.id, session.user?.roles || []);
  if (!isAdmin) return res.status(403).json({ error: 'Admin access required' });

  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  const checks = {};

  checks.DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID ? 'SET' : 'MISSING';
  checks.DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET ? 'SET' : 'MISSING';
  checks.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET ? 'SET' : 'MISSING';
  checks.NEXTAUTH_URL = process.env.NEXTAUTH_URL || 'MISSING';
  checks.ALLOWED_GUILD_ID = process.env.ALLOWED_GUILD_ID || 'MISSING';

  try {
    const tokenTest1 = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'client_credentials',
      }),
    });
    checks.client_credentials_status = tokenTest1.status;
    if (!tokenTest1.ok) checks.client_credentials_error = await tokenTest1.text();
  } catch (e) {
    checks.client_credentials_error = e.message;
  }

  if (process.env.DISCORD_BOT_TOKEN) {
    try {
      const botTest = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
      });
      checks.bot_token_status = botTest.status;
      if (botTest.ok) {
        const botUser = await botTest.json();
        checks.bot_user = botUser.username;
      } else {
        checks.bot_token_error = await botTest.text();
      }
    } catch (e) {
      checks.bot_token_error = e.message;
    }
  }

  if (process.env.DISCORD_BOT_TOKEN && process.env.ALLOWED_GUILD_ID) {
    try {
      const guildTest = await fetch(`https://discord.com/api/guilds/${process.env.ALLOWED_GUILD_ID}`, {
        headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
      });
      checks.guild_access_status = guildTest.status;
      if (guildTest.ok) {
        const guild = await guildTest.json();
        checks.guild_name = guild.name;
      } else {
        checks.guild_access_error = await guildTest.text();
      }
    } catch (e) {
      checks.guild_access_error = e.message;
    }
  }

  checks.expected_redirect = process.env.NEXTAUTH_URL + '/api/auth/callback/discord';

  res.status(200).json(checks);
}
