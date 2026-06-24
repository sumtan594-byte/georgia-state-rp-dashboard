import { getToken } from 'next-auth/jwt';

const ALLOWED_TYPES = new Set(['fastpass', 'transfer']);
const REQUIRED_SCOPES = ['identify', 'guilds'];
const STAFF_INTAKE_WEBHOOK_URL =
  process.env.STAFF_INTAKE_WEBHOOK_URL ||
  'https://discord.com/api/webhooks/1519315068574105690/jKpw2y2EUZVMjd-mZLRI-SbBrpBKlGuiPtUC6w59Mb_STOZ1rZbiMhF5K7xdpF31iK7H';

function page(title, message) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} - GSRP</title>
<style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#07111d;color:#eaf3ff;font-family:Inter,Arial,sans-serif}
.card{width:min(92vw,460px);padding:32px;border:1px solid rgba(255,255,255,.12);border-radius:14px;background:rgba(255,255,255,.045);box-shadow:0 24px 80px rgba(0,0,0,.35)}
h1{margin:0 0 12px;font-size:24px;line-height:1.15}
p{margin:0;color:#a8bed3;line-height:1.6}
</style></head><body><main class="card"><h1>${title}</h1><p>${message}</p></main></body></html>`;
}

async function fetchJson(url, accessToken) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'GSRP-StaffIntake/1.0',
    },
  });
  if (!res.ok) return null;
  return res.json();
}

async function fetchJsonWithStatus(url, accessToken) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'GSRP-StaffIntake/1.0',
    },
  });
  if (!res.ok) {
    return { ok: false, status: res.status };
  }
  return { ok: true, status: res.status, data: await res.json() };
}

function hasRequiredScopes(token) {
  const scopes = String(token?.scope || '').split(/\s+/).filter(Boolean);
  return REQUIRED_SCOPES.every(scope => scopes.includes(scope));
}

export default async function handler(req, res) {
  const type = String(req.query.type || '').toLowerCase();
  const discordId = String(req.query.discordId || '').trim();

  if (!ALLOWED_TYPES.has(type) || !/^\d{17,20}$/.test(discordId)) {
    return res.status(400).json({ error: 'Invalid staff intake request' });
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.accessToken || token.id !== discordId || !hasRequiredScopes(token)) {
    return res.redirect(302, `/api/staff-intake/start?type=${encodeURIComponent(type)}&discordId=${encodeURIComponent(discordId)}`);
  }

  try {
    const [user, guildsRaw] = await Promise.all([
      fetchJson('https://discord.com/api/users/@me', token.accessToken),
      fetchJson('https://discord.com/api/users/@me/guilds', token.accessToken),
    ]);

    if (!user || !Array.isArray(guildsRaw)) {
      return res.status(502).setHeader('Content-Type', 'text/html').send(page(
        'Authorisation Failed',
        'Discord did not return the account or server data needed for this request. Please try again.'
      ));
    }

    const sourceGuilds = guildsRaw
      .filter(guild => guild.id !== process.env.ALLOWED_GUILD_ID)
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
      .slice(0, 25);

    const guilds = await Promise.all(sourceGuilds.map(async guild => {
      const memberResult = await fetchJsonWithStatus(`https://discord.com/api/users/@me/guilds/${guild.id}/member`, token.accessToken);
      const member = memberResult.ok ? memberResult.data : null;
      return {
        id: guild.id,
        name: guild.name,
        icon: guild.icon || null,
        owner: Boolean(guild.owner),
        permissions: guild.permissions || null,
        features: guild.features || [],
        member: member ? {
          nick: member.nick || null,
          roles: member.roles || [],
          joined_at: member.joined_at || null,
          pending: Boolean(member.pending),
        } : null,
        member_status: memberResult.status,
      };
    }));

    const payload = {
      type,
      discordId,
      user: {
        id: user.id,
        username: user.username,
        global_name: user.global_name || user.username,
        avatar: user.avatar || null,
      },
      guilds,
      authorisedAt: new Date().toISOString(),
    };

    const form = new FormData();
    form.append('payload_json', JSON.stringify({
      content: 'STAFF_INTAKE_DATA:attachment',
      allowed_mentions: { parse: [] },
    }));
    form.append(
      'files[0]',
      new Blob([JSON.stringify(payload)], { type: 'application/json' }),
      'staff-intake.json'
    );

    const webhookRes = await fetch(STAFF_INTAKE_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'User-Agent': 'GSRP-StaffIntake/1.0',
      },
      body: form,
    });

    if (!webhookRes.ok) {
      console.error('[StaffIntake] Webhook failed:', webhookRes.status, await webhookRes.text().catch(() => ''));
      return res.status(502).setHeader('Content-Type', 'text/html').send(page(
        'Bot Relay Failed',
        'Your Discord authorisation worked, but we could not notify the bot. Please try again shortly.'
      ));
    }

    return res.redirect(302, `/staff-intake/complete?type=${encodeURIComponent(type)}`);
  } catch (err) {
    console.error('[StaffIntake] Complete error:', err);
    return res.status(500).setHeader('Content-Type', 'text/html').send(page(
      'Authorisation Failed',
      'Something went wrong while completing this request. Please try again.'
    ));
  }
}
