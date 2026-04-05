export default async function handler(req, res) {
  const checks = {};

  // Check env vars
  checks.DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID ? 'SET' : 'MISSING';
  checks.DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET ? 'SET' : 'MISSING';
  checks.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET ? 'SET' : 'MISSING';
  checks.NEXTAUTH_URL = process.env.NEXTAUTH_URL || 'MISSING';
  checks.ALLOWED_GUILD_ID = process.env.ALLOWED_GUILD_ID || 'MISSING';

  // Test 1: Discord OAuth2 token exchange with client_credentials
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

  // Test 2: Discord API with bot token
  if (process.env.DISCORD_BOT_TOKEN) {
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
  }

  // Test 3: Check guild membership with bot token
  if (process.env.DISCORD_BOT_TOKEN && process.env.ALLOWED_GUILD_ID) {
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
  }

  // Test 4: Verify redirect URI format
  checks.expected_redirect = process.env.NEXTAUTH_URL + '/api/auth/callback/discord';

  // Test 5: Check if NextAuth secret is usable
  try {
    const crypto = require('crypto');
    const secret = process.env.NEXTAUTH_SECRET;
    const hash = crypto.createHmac('sha256', secret).update('test').digest('hex');
    checks.secret_valid = true;
    checks.secret_hash_preview = hash.substring(0, 16) + '...';
  } catch (e) {
    checks.secret_valid = false;
    checks.secret_error = e.message;
  }

  res.status(200).json(checks);
}
