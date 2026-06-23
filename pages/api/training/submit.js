import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth-options';
import clientPromise from '../../../lib/mongodb';
import { rateLimit } from '../../../lib/rate-limiter';
import { MAX_QUIZ_FAILS, removeTraineeRole } from '../../../lib/trainee-tracking';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not authenticated' });

  const rl = rateLimit(req, res, 'submit');
  if (rl.limited) {
    return res.status(429).json({ error: 'Rate limited', retryAfter: rl.retryAfter });
  }

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

  const { username, globalName, avatar, score, total, pct, pass, answers, timestamp } = body;

  const userId = session.user.id;

  if (score === undefined) return res.status(400).json({ error: 'Missing fields' });

  let db;
  try {
    const client = await clientPromise;
    db = client.db();
  } catch (err) {
    console.error('[MongoDB] Connection error:', err.message);
    return res.status(500).json({ error: 'Database connection failed' });
  }

  const attemptsCollection = db.collection('quiz_attempts');

  const existingData = await attemptsCollection.findOne({ userId });

  if (existingData) {
    if (existingData.hasPassed) {
      return res.status(400).json({ error: 'Already passed' });
    }
    const cooldown = existingData.cooldownUntil ? new Date(existingData.cooldownUntil) : null;
    const now = new Date();
    if (cooldown && cooldown > now) {
      const remainingMs = cooldown - now;
      const remainingMinutes = Math.ceil(remainingMs / (1000 * 60));
      const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));
      return res.status(429).json({
        error: 'Cooldown active',
        cooldownUntil: existingData.cooldownUntil,
        retryAfterMinutes: remainingMinutes,
        retryAfterHours: remainingHours,
      });
    }
  }

  const newAttempt = {
    attemptId: `${userId}_${Date.now()}`,
    userId,
    username: username || session.user.name,
    globalName,
    avatar,
    score, total, pct, pass,
    timestamp: timestamp || new Date().toISOString(),
    answers,
  };

  let cooldownUntil = null;
  let hasPassed = false;
  let hasPassedAt = null;

  if (!pass) {
    const cooldownMs = COOLDOWN_HOURS * 60 * 60 * 1000;
    cooldownUntil = new Date(Date.now() + cooldownMs).toISOString();
  } else {
    hasPassed = true;
    hasPassedAt = timestamp || new Date().toISOString();
  }

  const updateDoc = {
    $push: { attempts: newAttempt },
  };

  if (pass) {
    updateDoc.$set = { hasPassed, hasPassedAt, cooldownUntil: null };
  } else {
    updateDoc.$set = { cooldownUntil };
    updateDoc.$setOnInsert = { hasPassed: false, hasPassedAt: null };
  }

  await attemptsCollection.updateOne(
    { userId },
    updateDoc,
    { upsert: true }
  );

  // Enforce the quiz fail cap: after MAX_QUIZ_FAILS failed attempts, strip the
  // trainee role and DM the user to reapply.
  let roleRemovedForFails = false;
  if (!pass) {
    const updated = await attemptsCollection.findOne({ userId });
    const failCount = (updated?.attempts || []).filter((a) => !a.pass).length;
    if (failCount >= MAX_QUIZ_FAILS && !updated?.traineeRoleRemoved) {
      try {
        await removeTraineeRole(db, userId, { reason: 'failed-quiz', dm: true });
        await attemptsCollection.updateOne(
          { userId },
          { $set: { traineeRoleRemoved: true, traineeRoleRemovedAt: new Date().toISOString() } }
        );
        roleRemovedForFails = true;
      } catch (err) {
        console.error('[Quiz Submit] Failed to remove trainee role after fail cap:', err.message);
      }
    }
  }

  try {
    const color = pass ? 0x22c55e : 0xef4444;
    const passMsg = pass
      ? 'Congratulations! You have completed the Staff Orientation Quiz. You may now apply for staff positions.'
      : `You scored ${score}/${total}. A minimum of 17 correct answers is required. Try again in 6 hours.`;

    const webhookPayload = {
      embeds: [
        {
          title: pass ? 'Quiz Passed' : 'Quiz Failed',
          color,
          fields: [
            { name: 'User', value: `<@${userId}> (\`${username || session.user.name}\`)`, inline: true },
            { name: 'Score', value: `${score} / ${total} (${pct}%)`, inline: true },
            { name: 'Result', value: pass ? '**PASSED**' : '**FAILED**', inline: true },
            { name: 'Next Step', value: passMsg, inline: false },
          ],
          timestamp: new Date().toISOString(),
          footer: { text: 'GSRP Staff Orientation Quiz' },
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

  if (pass && DISCORD_BOT_TOKEN && DISCORD_GUILD_ID && DISCORD_ROLE_ID) {
    try {
      const roleUrl = `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${userId}/roles/${DISCORD_ROLE_ID}`;
      const roleRes = await fetch(roleUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });
      if (!roleRes.ok) {
        const errorData = await roleRes.json().catch(() => ({}));
        console.error('[Role Give] Failed:', roleRes.status, errorData);
      } else {
        console.log(`[Role Give] Successfully gave role ${DISCORD_ROLE_ID} to ${userId}`);
      }
    } catch (err) {
      console.error('[Role Give] Error:', err.message);
    }
  }

  res.status(200).json({
    ok: true,
    pass,
    cooldownUntil: pass ? null : cooldownUntil,
    traineeRoleRemoved: roleRemovedForFails,
  });
}
