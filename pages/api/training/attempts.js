export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_REPO  = process.env.GITHUB_REPO;

  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    return res.status(500).json({ error: 'GitHub not configured' });
  }

  try {
    // List all files in /attempts/
    const listRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/attempts`, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
      },
    });

    if (!listRes.ok) {
      if (listRes.status === 404) return res.status(200).json([]);
      return res.status(500).json({ error: 'Failed to list attempts' });
    }

    const files = await listRes.json();
    const allAttempts = [];

    // Fetch each file in parallel
    const fetches = files
      .filter(f => f.name.endsWith('.json'))
      .map(async f => {
        try {
          const fileRes = await fetch(f.download_url);
          const attempts = await fileRes.json();
          if (Array.isArray(attempts)) allAttempts.push(...attempts);
        } catch { /* skip corrupt files */ }
      });

    await Promise.all(fetches);

    // Sort newest first
    allAttempts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.status(200).json(allAttempts);
  } catch (err) {
    console.error('[attempts/list] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
}
