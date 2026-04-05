export default async function handler(req, res) {
  try {
    const username = String(req.query.username || '').trim();

    if (!username) {
      return res.status(400).json({ error: 'Missing username' });
    }

    const userRes = await fetch('https://users.roblox.com/v1/usernames/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        usernames: [username],
        excludeBannedUsers: false
      })
    });

    if (!userRes.ok) {
      return res.status(502).json({ error: 'Failed to resolve Roblox user' });
    }

    const userData = await userRes.json();
    const userId = userData?.data?.[0]?.id;

    if (!userId) {
      return res.status(200).json({ imageUrl: null });
    }

    const thumbRes = await fetch(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=60x60&format=Png&isCircular=true`
    );

    if (!thumbRes.ok) {
      return res.status(502).json({ error: 'Failed to fetch Roblox thumbnail' });
    }

    const thumbData = await thumbRes.json();
    const imageUrl = thumbData?.data?.[0]?.imageUrl || null;

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=43200');
    return res.status(200).json({ imageUrl });
  } catch (err) {
    console.error('roblox-avatar error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
