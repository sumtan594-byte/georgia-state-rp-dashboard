export default async function handler(req, res) {
  const GITHUB_TOKEN = process.env.GITHUB_ACCESS_TOKEN;
  const GITHUB_REPO  = process.env.GITHUB_OWNER + '/' + process.env.GITHUB_REPO;
  const TRAINER_ROLE = '1372482495035211908';

  // GET - List all attempts (with user data for trainers)
  if (req.method === 'GET') {
    const includeUserData = req.query.userData === 'true';
    
    if (!GITHUB_TOKEN || !GITHUB_REPO) {
      return res.status(500).json({ error: 'GitHub not configured' });
    }

    try {
      const listRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/attempts`, {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github+json',
        },
      });

      if (!listRes.ok) {
        if (listRes.status === 404) return res.status(200).json({ attempts: [], users: {} });
        return res.status(500).json({ error: 'Failed to list attempts' });
      }

      const files = await listRes.json();
      const allAttempts = [];
      const userDataMap = {};

      const fetches = files
        .filter(f => f.name.endsWith('.json'))
        .map(async f => {
          try {
            const fileRes = await fetch(f.download_url);
            const data = await fileRes.json();
            // Handle both old format (direct array) and new format (object with attempts array)
            let attemptsArray = null;
            let userData = { cooldownUntil: null, hasPassed: false, hasPassedAt: null };
            
            if (Array.isArray(data)) {
              // Old format: data IS the attempts array
              attemptsArray = data;
              userData.hasPassed = data.some(a => a.pass === true);
            } else if (data.attempts && Array.isArray(data.attempts)) {
              // New format: data.attempts
              attemptsArray = data.attempts;
              userData.cooldownUntil = data.cooldownUntil || null;
              userData.hasPassed = data.hasPassed || false;
              userData.hasPassedAt = data.hasPassedAt || null;
            }
            
            const userId = f.name.replace('.json', '');
            userDataMap[userId] = userData;
            
            if (attemptsArray && attemptsArray.length > 0) {
              allAttempts.push(...attemptsArray);
            }
          } catch { /* skip corrupt files */ }
        });

      await Promise.all(fetches);
      allAttempts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      if (includeUserData) {
        res.status(200).json({ attempts: allAttempts, users: userDataMap });
      } else {
        res.status(200).json(allAttempts);
      }
    } catch (err) {
      console.error('[attempts/list] Error:', err.message);
      res.status(500).json({ error: err.message });
    }
    return;
  }

  // POST - Check cooldown status or revoke cooldown
  if (req.method === 'POST') {
    const { action, userId, userId: targetUserId } = req.body || {};

    // Check if requester is a trainer or admin
    const sessionUserId = req.headers['x-user-id'] || req.headers['x-user-id'];
    const userRoles = req.headers['x-user-roles'] ? JSON.parse(req.headers['x-user-roles']) : [];
    const isTrainer = userRoles.includes(TRAINER_ROLE);
    const adminIds = (process.env.ADMIN_USER_IDS || '').split(',').map(i => i.trim()).filter(Boolean);
    const isAdmin = adminIds.includes(sessionUserId);

    if (!isTrainer && !isAdmin) {
      return res.status(403).json({ error: 'Trainer role required' });
    }

    if (!GITHUB_TOKEN || !GITHUB_REPO) {
      return res.status(500).json({ error: 'GitHub not configured' });
    }

    try {
      const filePath = `attempts/${targetUserId}.json`;
      const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`;

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
            // Old format: convert to new format
            userData = {
              attempts: rawData,
              cooldownUntil: null,
              hasPassed: rawData.some(a => a.pass === true),
              hasPassedAt: null,
            };
          } else {
            // New format
            userData = rawData;
            if (!userData.attempts) userData.attempts = [];
          }
        } catch { userData = { attempts: [], cooldownUntil: null, hasPassed: false, hasPassedAt: null }; }
      }

      // Handle different actions
      if (action === 'check') {
        // Return cooldown status for a user
        const now = new Date();
        const cooldown = userData.cooldownUntil ? new Date(userData.cooldownUntil) : null;
        const isOnCooldown = cooldown && cooldown > now;
        const hasPassed = userData.hasPassed || false;
        
        res.status(200).json({
          userId: targetUserId,
          cooldownUntil: userData.cooldownUntil,
          isOnCooldown,
          hasPassed,
          hasPassedAt: userData.hasPassedAt,
          lastAttempt: userData.attempts?.[userData.attempts.length - 1] || null,
        });
        return;
      }

      if (action === 'revoke') {
        // Revoke cooldown - set to now so they can retake immediately
        userData.cooldownUntil = null;

        const content = Buffer.from(JSON.stringify(userData, null, 2)).toString('base64');
        const putBody = {
          message: `Cooldown revoked for user ${targetUserId} by trainer ${sessionUserId}`,
          content,
          sha,
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

        res.status(200).json({ ok: true, message: 'Cooldown revoked', userId: targetUserId });
        return;
      }

      res.status(400).json({ error: 'Invalid action' });
    } catch (err) {
      console.error('[attempts/post] Error:', err.message);
      res.status(500).json({ error: err.message });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}