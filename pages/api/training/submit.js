export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const GITHUB_TOKEN = process.env.GITHUB_ACCESS_TOKEN;
  const GITHUB_REPO  = process.env.GITHUB_OWNER + '/' + process.env.GITHUB_REPO;
  const WEBHOOK_URL  = process.env.TRAINING_WEBHOOK_URL;
  const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
  const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;
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

  // ── Check cooldown before accepting attempt ───────────────────────────────
  try {
    const filePath = `attempts/${userId}.json`;
    const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`;
    const fetchExisting = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
      },
    });
    if (fetchExisting.ok) {
      const existing = await fetchExisting.json();
      try {
        const rawData = JSON.parse(Buffer.from(existing.content, 'base64').toString('utf8'));
        let existingData;
        if (Array.isArray(rawData)) {
          existingData = { attempts: rawData, cooldownUntil: null, hasPassed: false };
        } else {
          existingData = rawData;
        }
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
      } catch {}
    }
  } catch (err) {
    console.error('[Cooldown check] Error:', err.message);
  }

  // ── Save to GitHub ───────────────────────────────────────────────────────
  if (GITHUB_TOKEN && GITHUB_REPO) {
    try {
      const filePath = `attempts/${userId}.json`;
      const apiUrl   = `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`;

      let userData = { attempts: [], cooldownUntil: null, hasPassed: false, hasPassedAt: null };
      let sha = null;
      const fetchExisting = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github+json',
        },
      });
      if (fetchExisting.ok) {
        const existing = await fetchExisting.json();
        sha = existing.sha;
        try {
          const rawData = JSON.parse(Buffer.from(existing.content, 'base64').toString('utf8'));
          // Handle both old format (direct array) and new format (object)
          if (Array.isArray(rawData)) {
            userData = {
              attempts: rawData,
              cooldownUntil: null,
              hasPassed: rawData.some(a => a.pass === true),
              hasPassedAt: null,
            };
          } else {
            userData = rawData;
            if (!userData.attempts) userData.attempts = [];
            if (userData.hasPassed === undefined) userData.hasPassed = false;
            if (!userData.cooldownUntil) userData.cooldownUntil = null;
          }
        } catch { userData = { attempts: [], cooldownUntil: null, hasPassed: false, hasPassedAt: null }; }
      }

      // Add new attempt
      const newAttempt = {
        attemptId: `${userId}_${Date.now()}`,
        userId, username, globalName, avatar,
        score, total, pct, pass,
        timestamp: timestamp || new Date().toISOString(),
        answers,
      };
      userData.attempts.push(newAttempt);

      // Update cooldown and pass status
      if (!pass) {
        // Failed - set 6-hour cooldown from now
        const cooldownMs = COOLDOWN_HOURS * 60 * 60 * 1000;
        userData.cooldownUntil = new Date(Date.now() + cooldownMs).toISOString();
      } else {
        // Passed - set hasPassed, clear cooldown
        userData.hasPassed = true;
        userData.hasPassedAt = timestamp || new Date().toISOString();
        userData.cooldownUntil = null;
      }

      const content = Buffer.from(JSON.stringify(userData, null, 2)).toString('base64');
      const putBody = {
        message: pass 
          ? `Quiz PASSED by ${username} (${userId})`
          : `Quiz attempt failed by ${username} (${userId})`,
        content,
        ...(sha ? { sha } : {}),
      };

      await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(putBody),
      });
    } catch (err) {
      console.error('[GitHub] Failed to save attempt:', err.message);
    }
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

    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookPayload),
    });
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