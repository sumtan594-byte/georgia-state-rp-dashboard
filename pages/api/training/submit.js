import clientPromise from '../../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const WEBHOOK_URL = process.env.TRAINING_WEBHOOK_URL;
  const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
  const DISCORD_GUILD_ID = process.env.ALLOWED_GUILD_ID;
  const DISCORD_ROLE_ID = process.env.DISCORD_ROLE_ID;
  const COOLDOWN_HOURS = 6;

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const { userId, username, globalName, avatar, score, total, pct, pass, answers, timestamp } = body;

  if (!userId || score === undefined) return res.status(400).json({ error: 'Missing fields' });

  let db;
  try {
    const client = await clientPromise;
    db = client.db();
  } catch (err) {
    console.error('[MongoDB] Connection error:', err.message);
    return res.status(500).json({ error: 'Database connection failed' });
  }

  const attemptsCollection = db.collection('quiz_attempts');

  // ── Check cooldown before accepting attempt ───────────────────────────────
  try {
    const existingData = await attemptsCollection.findOne({ userId });
    
    if (existingData) {
      const cooldown = existingData.cooldownUntil ? new Date(existingData.cooldownUntil) : null;
      const now = new Date();
      if (cooldown && cooldown > now) {
        const remainingMs = cooldown - now;
        const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60 * 1000));
        return res.status(429).json({ 
          error: 'Cooldown active', 
          cooldownUntil: existingData.cooldownUntil,
          retryAfter: remainingHours 
        });
      }
      if (existingData.hasPassed) {
        return res.status(400).json({ error: 'Already passed' });
      }
    }
  } catch (err) {
    console.error('[Cooldown check] Error:', err.message);
  }

  // ── Save to MongoDB ───────────────────────────────────────────────────────
  try {
    const newAttempt = {
      attemptId: `${userId}_${Date.now()}`,
      userId, username, globalName, avatar,
      score, total, pct, pass,
      timestamp: timestamp || new Date().toISOString(),
      answers,
    };

    let cooldownUntil = null;
    let hasPassed = false;
    let hasPassedAt = null;

    if (!pass) {
      // Failed - set 6-hour cooldown from now
      const cooldownMs = COOLDOWN_HOURS * 60 * 60 * 1000;
      cooldownUntil = new Date(Date.now() + cooldownMs).toISOString();
    } else {
      // Passed - set hasPassed, clear cooldown
      hasPassed = true;
      hasPassedAt = timestamp || new Date().toISOString();
    }

    const updateDoc = {
      $push: { attempts: newAttempt }
    };
    
    if (pass) {
      updateDoc.$set = { hasPassed, hasPassedAt, cooldownUntil: null };
    } else {
      updateDoc.$set = { cooldownUntil };
      // Preserve existing hasPassed status if any (though checked above)
      updateDoc.$setOnInsert = { hasPassed: false, hasPassedAt: null };
    }

    await attemptsCollection.updateOne(
      { userId },
      updateDoc,
      { upsert: true }
    );
  } catch (err) {
    console.error('[MongoDB] Failed to save attempt:', err.message);
  }

  // ── Discord Webhook ─────────────────────────────────────────────────────
  try {
    const color = pass ? 0x22c55e : 0xef4444;
    const passMsg = pass 
      ? 'Congratulations! You have completed the SSD Training Quiz. You may now apply for staff positions.'
      : `You scored ${score}/${total}. A minimum of 17 correct answers is required. Try again in 6 hours.`;

    const webhookPayload = {
      embeds: [
        {
          title: pass ? '✅ Quiz Passed' : '❌ Quiz Failed',
          color,
          fields: [
            { name: 'User', value: `<@${userId}> (\`${username}\`)`, inline: true },
            { name: 'Score', value: `${score} / ${total} (${pct}%)`, inline: true },
            { name: 'Result', value: pass ? '**PASSED**' : '**FAILED**', inline: true },
            { name: 'Next Step', value: passMsg, inline: false },
          ],
          timestamp: new Date().toISOString(),
          footer: { text: 'GSRP SSD Training Quiz' },
          thumbnail: avatar ? { url: `https://cdn.discordapp.com/avatars/${userId}/${avatar}.png` } : undefined,
        }
      ]
    };

    if (WEBHOOK_URL) {
      const webhookRes = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload),
      });
      if (!webhookRes.ok) {
        console.error('[Webhook] Error sending:', webhookRes.status, await webhookRes.text());
      }
    } else {
      console.warn('[Webhook] No TRAINING_WEBHOOK_URL configured.');
    }
  } catch (err) {
    console.error('[Webhook] Failed:', err.message);
  }

  // ── Give Discord Role via Bot API ─────────────────────────────────────────
  if (pass && DISCORD_BOT_TOKEN && DISCORD_GUILD_ID && DISCORD_ROLE_ID) {
    try {
      const roleUrl = `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${userId}/roles/${DISCORD_ROLE_ID}`;
      const res = await fetch(roleUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) {
        const errorData = await res.json();
        console.error('[Role Give] Failed:', res.status, errorData);
      } else {
        console.log(`[Role Give] Successfully gave role ${DISCORD_ROLE_ID} to ${userId}`);
      }
    } catch (err) {
      console.error('[Role Give] Error:', err.message);
    }
  }

  res.status(200).json({ ok: true, pass, cooldownUntil: pass ? null : new Date(Date.now() + COOLDOWN_HOURS * 60 * 60 * 1000).toISOString() });
}