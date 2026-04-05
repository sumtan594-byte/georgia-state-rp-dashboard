export default async function handler(req, res) {
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: 'No code provided' });

  const CLIENT_ID     = process.env.DISCORD_CLIENT_ID;
  const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
  const REDIRECT_URI  = process.env.NEXTAUTH_URL + '/api/callback';
  const REQUIRED_GUILD = process.env.ALLOWED_GUILD_ID;
  const REQUIRED_ROLE  = '1372476380096237609';
  const TRAINER_ROLE   = '1372482495035211908';

  try {
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return res.status(401).json({ error: 'Failed to get access token' });
    }

    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const user = await userRes.json();

    const memberRes = await fetch(`https://discord.com/api/users/@me/guilds/${REQUIRED_GUILD}/member`, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (memberRes.status !== 200) {
      return res.status(200).setHeader('Content-Type', 'text/html').send(errorPage(
        'Not in Server',
        'You must be a member of the Georgia State Roleplay Discord server to access this quiz.'
      ));
    }

    const member = await memberRes.json();

    const hasRequired = member.roles?.includes(REQUIRED_ROLE);
    const isTrainer   = member.roles?.includes(TRAINER_ROLE);

    if (!hasRequired && !isTrainer) {
      return res.status(200).setHeader('Content-Type', 'text/html').send(errorPage(
        'Access Denied',
        'You do not have the required Staff Development role to access this quiz.'
      ));
    }

    const userData = {
      id: user.id,
      username: user.username,
      global_name: user.global_name || user.username,
      avatar: user.avatar,
      isTrainer,
    };

    const encoded = encodeURIComponent(JSON.stringify(userData));
    res.setHeader('Set-Cookie', `gsrp_user=${encoded}; Path=/; Max-Age=86400; SameSite=Lax`);
    res.redirect(302, '/training');

  } catch (err) {
    console.error('OAuth error:', err);
    res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
}

function errorPage(title, message) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — GSRP Quiz</title>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#06101a;color:#e0eaf4;font-family:'DM Sans',sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;background-image:radial-gradient(ellipse at 20% 50%,rgba(30,100,180,0.1) 0%,transparent 60%)}
.card{text-align:center;max-width:460px;padding:3rem 2.5rem;background:rgba(255,255,255,0.04);border:1px solid rgba(100,180,255,0.2);border-radius:16px}
.icon{font-size:2.5rem;margin-bottom:1.5rem;color:#3b8fd4}
h1{font-family:'Syne',sans-serif;font-size:1.7rem;font-weight:800;color:#fff;margin-bottom:1rem}
p{color:#7a9bb5;line-height:1.7}
a{display:inline-block;margin-top:2rem;padding:.75rem 2rem;background:#1a6aad;color:#fff;border-radius:8px;text-decoration:none;font-family:'Syne',sans-serif;font-weight:700;font-size:.9rem}
</style></head><body>
<div class="card"><div class="icon">&#9888;</div><h1>${title}</h1><p>${message}</p><a href="/">&#8592; Return Home</a></div>
</body></html>`;
}
