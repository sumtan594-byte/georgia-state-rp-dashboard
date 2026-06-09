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
const MAX_WEBHOOK_BODY_BYTES = 256 * 1024;
const MAX_WEBHOOK_EVENTS = 50;
const MAX_SIGNATURE_AGE_MS = 5 * 60 * 1000;

let lastInvalidSigTime = 0;
let invalidSigCount = 0;

async function getRobloxUsername(userId) {
  try {
    const response = await fetch(`https://users.roblox.com/v1/users/${userId}`, {
      headers: { 'User-Agent': 'GSRP-Webhook' }
    });
    if (!response.ok) {
      console.error('[ERLC] getRobloxUsername: Roblox API returned', response.status, 'for userId', userId);
      return null;
    }
    const data = await response.json();
    return data.name || null;
  } catch (err) {
    console.error('[ERLC] getRobloxUsername: fetch error for userId', userId, ':', err.message);
    return null;
  }
}

function isFreshTimestamp(timestamp) {
  const timestampMs = Number(timestamp) * 1000;
  return Number.isFinite(timestampMs) && Math.abs(Date.now() - timestampMs) <= MAX_SIGNATURE_AGE_MS;
}

function isValidSignature(signatureHex) {
  return typeof signatureHex === 'string' && /^[a-f0-9]{128}$/i.test(signatureHex);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!TARGET_WEBHOOK_URL) {
    console.error('[ERLC] Missing ERLC_WEBHOOK_URL env var — cannot forward');
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  const signatureHex = req.headers['x-signature-ed25519'] || req.headers['X-Signature-Ed25519'];
  const timestamp = req.headers['x-signature-timestamp'] || req.headers['X-Signature-Timestamp'];

  if (!signatureHex || !timestamp) {
    console.error('[ERLC] Missing signature headers');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!isValidSignature(signatureHex) || !isFreshTimestamp(timestamp)) {
    console.error('[ERLC] Invalid signature metadata');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const chunks = [];
    let bodySize = 0;
    for await (const chunk of req) {
      bodySize += chunk.length;
      if (bodySize > MAX_WEBHOOK_BODY_BYTES) {
        return res.status(413).json({ error: 'Payload too large' });
      }
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
      const now = Date.now();
      invalidSigCount++;
      if (lastInvalidSigTime > 0) {
        const interval = now - lastInvalidSigTime;
        console.error(`[ERLC] Invalid signature (#${invalidSigCount}, +${interval}ms since last)`);
      } else {
        console.error(`[ERLC] Invalid signature (#${invalidSigCount}, first occurrence)`);
      }
      lastInvalidSigTime = now;
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const bodyStr = rawBody.toString('utf8');
    const data = JSON.parse(bodyStr);

    const events = data.events || (data.event ? [data] : []);

    if (!events.length) {
      return res.status(200).json({ success: true });
    }

    if (!Array.isArray(events) || events.length > MAX_WEBHOOK_EVENTS) {
      return res.status(400).json({ error: 'Invalid event batch' });
    }

    for (let i = 0; i < events.length; i++) {
      const evt = events[i];

      const eventType = evt.event || evt.type || '';
      const command = evt.data?.command?.toLowerCase() || evt.command?.toLowerCase() || evt.content?.toLowerCase() || '';
      const argument = evt.data?.argument || evt.argument || evt.args || '';
      const playerId = evt.data?.origin || evt.origin || evt.userId || evt.playerId || '';

      if (eventType === 'EmergencyCall' || eventType === '911' || eventType === 'emergency') {
        const commandUser = playerId ? await getRobloxUsername(playerId) : 'Unknown';
        const location = argument || evt.location || '';
        const description = evt.description || '';

        const payloadContent = `EMERGENCY_CALL:${commandUser}:${location}:${description}`;

        const payload = {
          content: payloadContent,
          allowed_mentions: { parse: [] }
        };

        try {
          const fRes = await fetch(TARGET_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (!fRes.ok) {
            const fBody = await fRes.text().catch(() => '');
            console.error('[ERLC] Emergency call forward error:', fRes.status, fBody.substring(0, 200));
          }
        } catch (fetchErr) {
          console.error('[ERLC] Emergency call forward network error:', fetchErr.message);
        }

        continue;
      }

      if (!command) {
        continue;
      }

      if (command === 'kick' || command === 'ban') {
        const commandUser = playerId ? await getRobloxUsername(playerId) : 'Unknown';
        const parts = argument.split(' ');
        const target = parts[0] || '';
        const reason = parts.slice(1).join(' ') || '';

        const payloadContent = `${command.toUpperCase()}_DATA:${commandUser}:${target}:${reason}`;

        const payload = {
          content: payloadContent,
          allowed_mentions: { parse: [] }
        };

        try {
          const fRes = await fetch(TARGET_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (!fRes.ok) {
            const fBody = await fRes.text().catch(() => '');
            console.error('[ERLC]', command, 'forward error:', fRes.status, fBody.substring(0, 200));
          }
        } catch (fetchErr) {
          console.error('[ERLC]', command, 'forward network error:', fetchErr.message);
        }

        continue;
      }

      if (command.startsWith(';')) {
        const rawCommand = command.substring(1);
        const commandUser = playerId ? await getRobloxUsername(playerId) : 'Unknown';
        const targetUsername = argument.split(' ')[0] || '';
        const reason = argument.split(' ').slice(1).join(' ') || '';

        const payloadContent = `CUSTOM_COMMAND:${rawCommand}:${commandUser}:${targetUsername}:${reason}`;

        const payload = {
          content: payloadContent,
          allowed_mentions: { parse: [] }
        };

        try {
          const fRes = await fetch(TARGET_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (!fRes.ok) {
            const fBody = await fRes.text().catch(() => '');
            console.error('[ERLC] ;command forward error:', fRes.status, fBody.substring(0, 200));
          }
        } catch (fetchErr) {
          console.error('[ERLC] ;command forward network error:', fetchErr.message);
        }

        continue;
      }

      if (command && command !== 'pm') {
        const rawCommand = command;
        const commandUser = playerId ? await getRobloxUsername(playerId) : 'Unknown';
        const targetUsername = argument.split(' ')[0] || '';
        const reason = argument.split(' ').slice(1).join(' ') || '';

        const payloadContent = `CUSTOM_COMMAND:${rawCommand}:${commandUser}:${targetUsername}:${reason}`;

        const payload = {
          content: payloadContent,
          allowed_mentions: { parse: [] }
        };

        try {
          const fRes = await fetch(TARGET_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (!fRes.ok) {
            const fBody = await fRes.text().catch(() => '');
            console.error('[ERLC] catch-all forward error:', fRes.status, fBody.substring(0, 200));
          }
        } catch (fetchErr) {
          console.error('[ERLC] catch-all forward network error:', fetchErr.message);
        }

        continue;
      }

      if (command === 'pm' && argument.toLowerCase().startsWith('staff')) {
        const commandUser = playerId ? await getRobloxUsername(playerId) : 'Unknown';
        const content = argument.substring(5).trim() || '';

        const payloadContent = `PMSTAFF_DATA:${commandUser}:${content}`;

        const payload = {
          content: payloadContent,
          allowed_mentions: { parse: [] }
        };

        try {
          const fRes = await fetch(TARGET_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (!fRes.ok) {
            const fBody = await fRes.text().catch(() => '');
            console.error('[ERLC] pm staff forward error:', fRes.status, fBody.substring(0, 200));
          }
        } catch (fetchErr) {
          console.error('[ERLC] pm staff forward network error:', fetchErr.message);
        }

        continue;
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[ERLC] Error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
