import { Octokit } from "@octokit/rest";

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { getSession } = require("next-auth/react");
  const session = await getSession({ req });
  if (!session) return res.status(401).json({ error: 'Not authenticated' });

  const currentUserId = String(session.user?.id || "");
  const adminIds = (process.env.ADMIN_USER_IDS || "").split(',').map(id => String(id).trim()).filter(Boolean);
  const isAdmin = adminIds.includes(currentUserId);

  const octokit = new Octokit({ auth: process.env.GITHUB_ACCESS_TOKEN });

  try {
    const { data } = await octokit.repos.getContent({
      owner: process.env.GITHUB_OWNER,
      repo: process.env.GITHUB_REPO,
      path: "transcripts"
    });

    const files = Array.isArray(data) ? data.filter(f => f.name.endsWith('.html')) : [];
    const count = isAdmin
      ? files.length
      : files.filter(f => {
          const rawName = f.name.replace('.html', '');
          const parts = rawName.split('__');
          return parts[1] === currentUserId;
        }).length;

    return res.status(200).json({ count });
  } catch {
    return res.status(200).json({ count: 0 });
  }
}
