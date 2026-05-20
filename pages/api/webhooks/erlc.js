import crypto from 'crypto';

export const config = {
  api: {
    bodyParser: false,
  },
};

const PRC_PUBLIC_KEY_BASE64 = 'MCowBQYDK2VwAyEAjSICb9pp0kHizGQtdG8ySWsDChfGqi+gyFCttigBNOA=';
const TARGET_WEBHOOK_URL = process.env.ERLC_WEBHOOK_URL;

const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----\n${PRC_PUBLIC_KEY_BASE64}\n-----END PUBLIC KEY-----`;
const DEV_MODE = process.env.NODE_ENV === 'development' || process.env.ERLC_WEBHOOK_DEV === 'true';

async function getRobloxUsername(userId) {
  try {
    const response = await fetch(`https://users.roblox.com/v1/users/${userId}`, {
      headers: { 'User-Agent': 'GSRP-Webhook' }
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.name || null;
  } catch (err) {
    return null;
  }
}

export default async function handler(req, res) {

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!TARGET_WEBHOOK_URL) {
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  const signatureHex = req.headers['x-signature-ed25519'] || req.headers['X-Signature-Ed25519'];
  const timestamp = req.headers['x-signature-timestamp'] || req.headers['X-Signature-Timestamp'];

  if (!signatureHex || !timestamp) {
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

    let isVerified = false;
    if (DEV_MODE) {
      isVerified = true;
    } else {
      isVerified = crypto.verify(
        null,
        message,
        { key: PUBLIC_KEY_PEM, format: 'pem', type: 'spki' },
        signature
      );
    }

    if (!isVerified) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const data = JSON.parse(rawBody.toString());

    const events = data.events || (data.event ? [data] : []);
    if (!events.length) {
      return res.status(200).json({ success: true });
    }

    for (const evt of events) {
      const eventType = evt.event || evt.type || '';
      const command = evt.data?.command?.toLowerCase() || evt.command?.toLowerCase() || evt.content?.toLowerCase() || '';
      const argument = evt.data?.argument || evt.argument || evt.args || '';
      const playerId = evt.data?.origin || evt.origin || evt.userId || evt.playerId || '';

      if (eventType === 'EmergencyCall' || eventType === '911' || eventType === 'emergency') {
        const commandUser = playerId ? await getRobloxUsername(playerId) : 'Unknown';
        const location = argument || evt.location || '';
        const description = evt.description || '';

        const payload = {
          content: `EMERGENCY_CALL:${commandUser}:${location}:${description}`,
          allowed_mentions: { parse: [] }
        };

        await fetch(TARGET_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        continue;
      }

      if (!command) continue;

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

        continue;
      }

      if (command.startsWith(';')) {
        const rawCommand = command.substring(1);
        const commandUser = playerId ? await getRobloxUsername(playerId) : 'Unknown';
        const targetUsername = argument.split(' ')[0] || '';
        const reason = argument.split(' ').slice(1).join(' ') || '';

        const payload = {
          content: `CUSTOM_COMMAND:${rawCommand}:${commandUser}:${targetUsername}:${reason}`,
          allowed_mentions: { parse: [] }
        };

        await fetch(TARGET_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        continue;
      }

      if (command && command !== 'pm') {
        const rawCommand = command;
        const commandUser = playerId ? await getRobloxUsername(playerId) : 'Unknown';
        const targetUsername = argument.split(' ')[0] || '';
        const reason = argument.split(' ').slice(1).join(' ') || '';

        const payload = {
          content: `CUSTOM_COMMAND:${rawCommand}:${commandUser}:${targetUsername}:${reason}`,
          allowed_mentions: { parse: [] }
        };

        await fetch(TARGET_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

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

        continue;
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}