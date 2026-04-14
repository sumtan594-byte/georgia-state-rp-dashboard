import crypto from 'crypto';

export const config = {
  api: {
    bodyParser: false,
  },
};

const PRC_PUBLIC_KEY_BASE64 = 'MCowBQYDK2VwAyEAjSICb9pp0kHizGQtdG8ySWsDChfGqi+gyFCttigBNOA=';
const TARGET_WEBHOOK_URL = 'https://discord.com/api/webhooks/1491210873023238284/qtrc7WAitcu5IXTSe57L3mwsv16N35QJ2HsyX8gZeDnbEhIo7stp_7J5FAFuuoZ7ge-A';

const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----\n${PRC_PUBLIC_KEY_BASE64}\n-----END PUBLIC KEY-----`;

async function getRobloxUsername(userId) {
  try {
    const response = await fetch(`https://users.roblox.com/v1/users/${userId}`, {
      headers: { 'User-Agent': 'GSRP-Webhook' }
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.name || null;
  } catch (err) {
    console.error('[ERLC Webhook] Error getting Roblox username:', err.message);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const signatureHex = req.headers['x-signature-ed25519'];
  const timestamp = req.headers['x-signature-timestamp'];

  if (!signatureHex || !timestamp) {
    console.error('[ERLC Webhook] Missing signature headers');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks);

    const timestampBuffer = Buffer.from(timestamp, 'utf-8');
    const message = Buffer.concat([timestampBuffer, rawBody]);
    const signature = Buffer.from(signatureHex, 'hex');

    const isVerified = crypto.verify(
      null,
      message,
      { key: PUBLIC_KEY_PEM, format: 'pem', type: 'spki' },
      signature
    );

    if (!isVerified) {
      console.warn('[ERLC Webhook] Invalid signature detected');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const data = JSON.parse(rawBody.toString());
    console.log('[ERLC Webhook] Parsed data:', JSON.stringify(data));

    if (!data.events || !Array.isArray(data.events)) {
      return res.status(200).json({ success: true });
    }

    for (const evt of data.events) {
      if (evt.event !== 'CustomCommand') continue;

      const command = evt.data?.command?.toLowerCase() || '';
      const argument = evt.data?.argument || '';
      const playerId = evt.data?.origin || evt.origin || '';

      console.log('[ERLC Webhook] Command:', command, 'Argument:', argument);

      if (command === 'kick' || command === 'ban') {
        const commandUser = playerId ? await getRobloxUsername(playerId) : 'Unknown';
        const parts = argument.split(' ');
        const target = parts[0] || '';
        const reason = parts.slice(1).join(' ') || '';

        const payload = {
          content: `${command.toUpperCase()}_DATA:${commandUser}:${target}:${reason}`,
          allowed_mentions: { parse: [] }
        };

        await fetch(TARGET_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        console.log(`[ERLC Webhook] Forwarded ${command} from ${commandUser} for ${target}`);
        continue;
      }

      const KNOWN_OFFENCES = ['rdm', 'vdm', 'frp', 'nlr', 'gta', 'cuff', 'cuff_rushing', 'trolling', 'sd', 'staff_disrespect', 'nitrp', 'no_intent_rp', 'abusing_mod', 'staff_evasion', 'staff_vdm', 'mass_vdm', 'safezone', 'reset_avoid', 'leave_avoid', 'ltap', 'nsfw', 'tos', 'staff_impersonation', 'banned_rp', 'rtap', 'hacking', 'cheating', 'mass_staff_evasion', 'troll_username', 'bypassing'];

      const isOffenceCommand = command.startsWith(';') || KNOWN_OFFENCES.includes(command.toLowerCase());
      if (isOffenceCommand) {
        const rawOffence = command.startsWith(';') ? command.substring(1).toLowerCase() : command.toLowerCase();
        const commandUser = playerId ? await getRobloxUsername(playerId) : 'Unknown';
        const targetUsername = argument.split(' ')[0] || '';

        if (!targetUsername) continue;

        const payload = {
          content: `${rawOffence.toUpperCase()}_DATA:${commandUser}:${targetUsername}:`,
          allowed_mentions: { parse: [] }
        };

        await fetch(TARGET_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        console.log(`[ERLC Webhook] Forwarded ${rawOffence} from ${commandUser} for ${targetUsername}`);
        continue;
      }

      if (command === 'pm' && argument.toLowerCase().startsWith('staff')) {
        const commandUser = playerId ? await getRobloxUsername(playerId) : 'Unknown';
        const content = argument.substring(5).trim() || '';

        const payload = {
          content: `PMSTAFF_DATA:${commandUser}:${content}`,
          allowed_mentions: { parse: [] }
        };

        await fetch(TARGET_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        console.log(`[ERLC Webhook] PM Staff from ${commandUser}: ${content}`);
        continue;
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[ERLC Webhook] Processing Error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}