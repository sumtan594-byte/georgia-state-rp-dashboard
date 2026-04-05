export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const GITHUB_TOKEN = process.env.GITHUB_ACCESS_TOKEN;
  const GITHUB_REPO  = process.env.GITHUB_OWNER + '/' + process.env.GITHUB_REPO;
  const WEBHOOK_URL  = process.env.TRAINING_WEBHOOK_URL;

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const { userId, username, globalName, avatar, score, total, pct, pass, answers, timestamp } = body;

  if (!userId || score === undefined) return res.status(400).json({ error: 'Missing fields' });

  // ── Save to GitHub ───────────────────────────────────────────────────────
  if (GITHUB_TOKEN && GITHUB_REPO) {
    try {
      const filePath = `attempts/${userId}.json`;
      const apiUrl   = `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`;

      // Fetch existing file (to get SHA for update)
      let existingAttempts = [];
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
          existingAttempts = JSON.parse(Buffer.from(existing.content, 'base64').toString('utf8'));
        } catch { existingAttempts = []; }
      }

      const newAttempt = {
        attemptId: `${userId}_${Date.now()}`,
        userId, username, globalName, avatar,
        score, total, pct, pass,
        timestamp: timestamp || new Date().toISOString(),
        answers,
      };
      existingAttempts.push(newAttempt);

      const content = Buffer.from(JSON.stringify(existingAttempts, null, 2)).toString('base64');
      const putBody = {
        message: `Add attempt for ${username} (${userId})`,
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

    const webhookPayload = {
      embeds: [
        {
          title: pass ? '✅ Quiz Passed' : '❌ Quiz Failed',
          color,
          fields: [
            { name: 'User', value: `<@${userId}> (\`${username}\`)`, inline: true },
            { name: 'Score', value: `${score} / ${total} (${pct}%)`, inline: true },
            { name: 'Result', value: pass ? '**PASSED**' : '**FAILED**', inline: true },
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

  res.status(200).json({ ok: true });
}
