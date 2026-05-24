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

export default async function handler(req, res) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  console.log('[ERLC] ===== REQUEST RECEIVED =====');
  console.log('[ERLC] Method:', req.method);
  console.log('[ERLC] IP:', ip);
  console.log('[ERLC] URL:', req.url);
  console.log('[ERLC] Headers:', JSON.stringify(req.headers));

  if (req.method !== 'POST') {
    console.log('[ERLC] Rejecting non-POST request (method:', req.method + ')');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('[ERLC] TARGET_WEBHOOK_URL present:', !!TARGET_WEBHOOK_URL);
  if (!TARGET_WEBHOOK_URL) {
    console.error('[ERLC] Missing ERLC_WEBHOOK_URL env var — cannot forward');
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  const signatureHex = req.headers['x-signature-ed25519'] || req.headers['X-Signature-Ed25519'];
  const timestamp = req.headers['x-signature-timestamp'] || req.headers['X-Signature-Timestamp'];

  console.log('[ERLC] x-signature-ed25519 present:', !!signatureHex);
  console.log('[ERLC] x-signature-timestamp present:', !!timestamp);

  if (!signatureHex || !timestamp) {
    console.error('[ERLC] Missing signature headers — sig:', !!signatureHex, 'ts:', !!timestamp);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks);
    console.log('[ERLC] Raw body length:', rawBody.length, 'bytes');
    console.log('[ERLC] Raw body (first 500 chars):', rawBody.toString('utf8').substring(0, 500));

    const timestampBuffer = Buffer.from(timestamp, 'utf-8');
    const message = Buffer.concat([timestampBuffer, rawBody]);
    const signature = Buffer.from(signatureHex, 'hex');

    console.log('[ERLC] Attempting signature verification...');
    console.log('[ERLC] DEV_MODE:', DEV_MODE);

    let isVerified = false;
    if (DEV_MODE) {
      console.log('[ERLC] DEV_MODE enabled — skipping signature verification');
      isVerified = true;
    } else {
      isVerified = crypto.verify(
        null,
        message,
        { key: PUBLIC_KEY_PEM, format: 'pem', type: 'spki' },
        signature
      );
      console.log('[ERLC] Signature verification result:', isVerified);
    }

    if (!isVerified) {
      console.error('[ERLC] INVALID SIGNATURE — full raw body:', rawBody.toString('utf8'));
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const bodyStr = rawBody.toString('utf8');
    console.log('[ERLC] Parsing JSON body...');
    const data = JSON.parse(bodyStr);
    console.log('[ERLC] Parsed body keys:', Object.keys(data));
    console.log('[ERLC] Full parsed body:', JSON.stringify(data));

    const events = data.events || (data.event ? [data] : []);
    console.log('[ERLC] Events array length:', events.length);

    if (!events.length) {
      console.log('[ERLC] No events found in payload — returning 200');
      return res.status(200).json({ success: true });
    }

    for (let i = 0; i < events.length; i++) {
      const evt = events[i];
      console.log(`[ERLC] --- Processing event ${i + 1}/${events.length} ---`);
      console.log('[ERLC] Raw event:', JSON.stringify(evt));

      const eventType = evt.event || evt.type || '';
      const command = evt.data?.command?.toLowerCase() || evt.command?.toLowerCase() || evt.content?.toLowerCase() || '';
      const argument = evt.data?.argument || evt.argument || evt.args || '';
      const playerId = evt.data?.origin || evt.origin || evt.userId || evt.playerId || '';

      console.log('[ERLC] Parsed fields — eventType:', eventType, 'command:', command, 'argument:', argument, 'playerId:', playerId);

      if (eventType === 'EmergencyCall' || eventType === '911' || eventType === 'emergency') {
        console.log('[ERLC] Matched EmergencyCall branch');
        const commandUser = playerId ? await getRobloxUsername(playerId) : 'Unknown';
        const location = argument || evt.location || '';
        const description = evt.description || '';

        const payloadContent = `EMERGENCY_CALL:${commandUser}:${location}:${description}`;
        console.log('[ERLC] Forwarding emergency call payload:', payloadContent);

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
          console.log('[ERLC] Emergency call forward response status:', fRes.status);
          if (!fRes.ok) {
            const fBody = await fRes.text().catch(() => '');
            console.error('[ERLC] Emergency call forward error body:', fBody.substring(0, 500));
          }
        } catch (fetchErr) {
          console.error('[ERLC] Emergency call forward network error:', fetchErr.message);
        }

        continue;
      }

      if (!command) {
        console.log('[ERLC] No command field found — skipping to next event');
        continue;
      }

      if (command === 'kick' || command === 'ban') {
        console.log('[ERLC] Matched', command, 'branch');
        const commandUser = playerId ? await getRobloxUsername(playerId) : 'Unknown';
        const parts = argument.split(' ');
        const target = parts[0] || '';
        const reason = parts.slice(1).join(' ') || '';

        const payloadContent = `${command.toUpperCase()}_DATA:${commandUser}:${target}:${reason}`;
        console.log('[ERLC] Forwarding', command, 'payload:', payloadContent);

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
          console.log('[ERLC]', command, 'forward response status:', fRes.status);
          if (!fRes.ok) {
            const fBody = await fRes.text().catch(() => '');
            console.error('[ERLC]', command, 'forward error body:', fBody.substring(0, 500));
          }
        } catch (fetchErr) {
          console.error('[ERLC]', command, 'forward network error:', fetchErr.message);
        }

        continue;
      }

      if (command.startsWith(';')) {
        console.log('[ERLC] Matched ;command branch');
        const rawCommand = command.substring(1);
        const commandUser = playerId ? await getRobloxUsername(playerId) : 'Unknown';
        const targetUsername = argument.split(' ')[0] || '';
        const reason = argument.split(' ').slice(1).join(' ') || '';

        const payloadContent = `CUSTOM_COMMAND:${rawCommand}:${commandUser}:${targetUsername}:${reason}`;
        console.log('[ERLC] Forwarding ;command payload:', payloadContent);

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
          console.log('[ERLC] ;command forward response status:', fRes.status);
          if (!fRes.ok) {
            const fBody = await fRes.text().catch(() => '');
            console.error('[ERLC] ;command forward error body:', fBody.substring(0, 500));
          }
        } catch (fetchErr) {
          console.error('[ERLC] ;command forward network error:', fetchErr.message);
        }

        continue;
      }

      if (command && command !== 'pm') {
        console.log('[ERLC] Matched catch-all command branch (command:', command + ')');
        const rawCommand = command;
        const commandUser = playerId ? await getRobloxUsername(playerId) : 'Unknown';
        const targetUsername = argument.split(' ')[0] || '';
        const reason = argument.split(' ').slice(1).join(' ') || '';

        const payloadContent = `CUSTOM_COMMAND:${rawCommand}:${commandUser}:${targetUsername}:${reason}`;
        console.log('[ERLC] Forwarding catch-all payload:', payloadContent);

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
          console.log('[ERLC] catch-all forward response status:', fRes.status);
          if (!fRes.ok) {
            const fBody = await fRes.text().catch(() => '');
            console.error('[ERLC] catch-all forward error body:', fBody.substring(0, 500));
          }
        } catch (fetchErr) {
          console.error('[ERLC] catch-all forward network error:', fetchErr.message);
        }

        continue;
      }

      if (command === 'pm' && argument.toLowerCase().startsWith('staff')) {
        console.log('[ERLC] Matched pm staff branch');
        const commandUser = playerId ? await getRobloxUsername(playerId) : 'Unknown';
        const content = argument.substring(5).trim() || '';

        const payloadContent = `PMSTAFF_DATA:${commandUser}:${content}`;
        console.log('[ERLC] Forwarding pm staff payload:', payloadContent);

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
          console.log('[ERLC] pm staff forward response status:', fRes.status);
          if (!fRes.ok) {
            const fBody = await fRes.text().catch(() => '');
            console.error('[ERLC] pm staff forward error body:', fBody.substring(0, 500));
          }
        } catch (fetchErr) {
          console.error('[ERLC] pm staff forward network error:', fetchErr.message);
        }

        continue;
      }

      console.log('[ERLC] Event did not match any branch — eventType:', eventType, 'command:', command);
    }

    console.log('[ERLC] ===== ALL EVENTS PROCESSED — returning 200 =====');
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[ERLC] ===== CATCH BLOCK =====');
    console.error('[ERLC] Error message:', err.message);
    console.error('[ERLC] Error stack:', err.stack);
    return res.status(500).json({ error: 'Internal server error' });
  }
}