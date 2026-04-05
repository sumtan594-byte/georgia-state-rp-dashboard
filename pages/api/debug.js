export default async function handler(req, res) {
  const checks = {};

  // Check env vars
  checks.DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID ? 'SET (length: ' + process.env.DISCORD_CLIENT_ID.length + ')' : 'MISSING';
  checks.DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET ? 'SET (length: ' + process.env.DISCORD_CLIENT_SECRET.length + ')' : 'MISSING';
  checks.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET ? 'SET (length: ' + process.env.NEXTAUTH_SECRET.length + ')' : 'MISSING';
  checks.NEXTAUTH_URL = process.env.NEXTAUTH_URL || 'MISSING';
  checks.ALLOWED_GUILD_ID = process.env.ALLOWED_GUILD_ID || 'MISSING';

  // Test Discord token exchange
  const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
  const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
  const REDIRECT_URI = process.env.NEXTAUTH_URL + '/api/auth/callback/discord';

  checks.redirect_uri = REDIRECT_URI;

  // Try a dummy token exchange to see if credentials work
  const tokenTest = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'client_credentials',
    }),
  });

  checks.discord_token_test_status = tokenTest.status;
  if (!tokenTest.ok) {
    checks.discord_token_test_error = await tokenTest.text();
  }

  res.status(200).json(checks);
}
