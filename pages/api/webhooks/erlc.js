import crypto from 'crypto';

/**
 * PRC Event Webhook Handler
 * Follows PRC API v2 Signature Verification Rules
 */

export const config = {
  api: {
    bodyParser: false, // Mandatory for signature verification (needs raw body)
  },
};

const PRC_PUBLIC_KEY_BASE64 = 'MCowBQYDK2VwAyEAjSICb9pp0kHizGQtdG8ySWsDChfGqi+gyFCttigBNOA=';
const TARGET_WEBHOOK_URL = 'https://discord.com/api/webhooks/1491210873023238284/qtrc7WAitcu5IXTSe57L3mwsv16N35QJ2HsyX8gZeDnbEhIo7stp_7J5FAFuuoZ7ge-A';

const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----\n${PRC_PUBLIC_KEY_BASE64}\n-----END PUBLIC KEY-----`;

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
    // 1. Capture Raw Body
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks);

    // 2. Build Message for Verification (timestamp + rawBody)
    const timestampBuffer = Buffer.from(timestamp, 'utf-8');
    const message = Buffer.concat([timestampBuffer, rawBody]);
    const signature = Buffer.from(signatureHex, 'hex');

    // 3. Verify ed25519 Signature
    const isVerified = crypto.verify(
      null,
      message,
      {
        key: PUBLIC_KEY_PEM,
        format: 'pem',
        type: 'spki',
      },
      signature
    );

    if (!isVerified) {
      console.warn('[ERLC Webhook] Invalid signature detected');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // 4. Parse and Process Data
    const data = JSON.parse(rawBody.toString());

    /**
     * Data Structure:
     * {
     *   "Type": "Chat",
     *   "Player": "Username:UserId",
     *   "Message": ";report target reason",
     *   "Timestamp": 123456789
     * }
     */
    if (data.Type === 'Chat' && data.Message.toLowerCase().startsWith(';report')) {
      const parts = data.Message.split(' ');
      const target = parts[1] || 'Unknown';
      const reason = parts.slice(2).join(' ') || 'No reason provided';
      const reporter = data.Player.split(':')[0] || data.Player;

      // Forward to Discord for bot to pick up
      const payload = {
        content: `REPORT_DATA:${reporter}:${target}:${reason}`,
        allowed_mentions: { parse: [] }
      };

      await fetch(TARGET_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      console.log(`[ERLC Webhook] Forwarded report from ${reporter} against ${target}`);
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[ERLC Webhook] Processing Error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
