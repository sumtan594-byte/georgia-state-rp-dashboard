export default async function handler(req, res) {
  const GITHUB_TOKEN = process.env.GITHUB_ACCESS_TOKEN;
  const GITHUB_REPO  = process.env.GITHUB_OWNER + '/' + process.env.GITHUB_REPO;

  // GET - Check cooldown status for a user
  if (req.method === 'GET') {
    const userId = req.query.userId || req.headers['x-user-id'];

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    if (!GITHUB_TOKEN || !GITHUB_REPO) {
      return res.status(500).json({ error: 'GitHub not configured' });
    }

    try {
      const filePath = `attempts/${userId}.json`;
      const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`;

      const fetchExisting = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github+json',
        },
      });

      if (!fetchExisting.ok) {
        // User has no data - no cooldown, hasn't passed
        return res.status(200).json({
          userId,
          cooldownUntil: null,
          isOnCooldown: false,
          hasPassed: false,
          hasPassedAt: null,
          lastAttempt: null,
        });
      }

      const existing = await fetchExisting.json();
      let userData = { attempts: [], cooldownUntil: null, hasPassed: false, hasPassedAt: null };
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
        }
      } catch { userData = { attempts: [], cooldownUntil: null, hasPassed: false, hasPassedAt: null }; }

      const now = new Date();
      const cooldown = userData.cooldownUntil ? new Date(userData.cooldownUntil) : null;
      const isOnCooldown = cooldown && cooldown > now;

      res.status(200).json({
        userId,
        cooldownUntil: userData.cooldownUntil,
        isOnCooldown,
        hasPassed: userData.hasPassed || false,
        hasPassedAt: userData.hasPassedAt,
        lastAttempt: userData.attempts?.[userData.attempts.length - 1] || null,
      });
    } catch (err) {
      console.error('[cooldown/get] Error:', err.message);
      res.status(500).json({ error: err.message });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}