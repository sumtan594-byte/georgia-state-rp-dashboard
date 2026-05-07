import { getServerSession } from "next-auth/next";
import { authOptions } from "../../lib/auth-options";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const discordId = session.user.id;
  const githubToken = process.env.GITHUB_ACCESS_TOKEN;
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL || 'https://discord.com/api/webhooks/1426165224200732683/xV1wiTsLw43gr4MIUuzbOQhHPEfgAUWLyclPgt3gqXQCebzUn0qNkFIvqTQ6DDVJHMm_';

  const githubApiRequest = async (path, method = 'GET', body = null) => {
    const url = `https://api.github.com/repos/sumtan594-byte/gsrp-management/contents/${path}`;
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'GSRP-Dashboard-App',
      'Authorization': `token ${githubToken}`
    };
    
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);
    
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText} (${response.status})`);
    }
    return response.json();
  };

  try {
    // 1. Get current usernames.json to find the entry and its SHA
    const fileData = await githubApiRequest('usernames.json');
    const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
    const db = JSON.parse(content);

    if (!db[discordId]) {
      return res.status(404).json({ error: 'No linked account found to unlink.' });
    }

    // 2. Remove the entry
    delete db[discordId];

    // 3. Update usernames.json on GitHub
    await githubApiRequest('usernames.json', 'PUT', {
      message: `unlink: remove roblox link for discord user ${discordId}`,
      content: Buffer.from(JSON.stringify(db, null, 2)).toString('base64'),
      sha: fileData.sha
    });

    // 4. Send signal to Discord bot via webhook
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `UNLINK_DATA:${discordId}`,
        allowed_mentions: { parse: [] }
      })
    });

    return res.status(200).json({ success: true, message: 'Successfully unlinked account.' });

  } catch (error) {
    console.error('Unlink Error:', error);
    return res.status(500).json({ error: 'Failed to unlink account. Please try again later.' });
  }
}
