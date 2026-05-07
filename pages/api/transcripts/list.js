import { getServerSession } from 'next-auth';
import { authOptions } from "../../../lib/auth-options";
import { Octokit } from '@octokit/rest';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not logged in' });

  const currentUserId = String(session.user?.id || '');
  const adminIds = (process.env.ADMIN_USER_IDS || '').split(',').map(id => String(id).trim()).filter(Boolean);
  const isAdmin = adminIds.includes(currentUserId);
  const { sort = 'latest' } = req.query;

  const octokit = new Octokit({ auth: process.env.GITHUB_ACCESS_TOKEN });

  try {
    // Use Git Trees API to bypass the 1,000 files limit
    const repoInfo = await octokit.repos.get({
      owner: process.env.GITHUB_OWNER,
      repo: process.env.GITHUB_REPO,
    });
    
    const { data: branchData } = await octokit.repos.getBranch({
      owner: process.env.GITHUB_OWNER,
      repo: process.env.GITHUB_REPO,
      branch: repoInfo.data.default_branch,
    });

    const { data: treeData } = await octokit.git.getTree({
      owner: process.env.GITHUB_OWNER,
      repo: process.env.GITHUB_REPO,
      tree_sha: branchData.commit.commit.tree.sha,
      recursive: true,
    });

    const data = treeData.tree
      .filter(f => f.path.startsWith('transcripts/') && f.path.endsWith('.html'))
      .map(f => ({ name: f.path.replace('transcripts/', '') }));

    const files = Array.isArray(data)
      ? data
          .filter(f => f.name.endsWith('.html'))
          .map(f => {
            const rawName = f.name.replace('.html', '');
            const p = rawName.split('__');
            if (p.length < 2) return null;
            return {
              rawName,
              type: p[0] || 'UNKNOWN',
              ownerId: p[1] || 'UNKNOWN',
              channelName: p[2] || 'Unknown',
              date: p[3] || '1970-01-01',
              reason: p[4] || 'NoReason',
              time: p[5] || '00-00-00',
            };
          })
          .filter(f => {
            if (!f) return false;
            if (!isAdmin && String(f.ownerId) !== currentUserId) return false;
            return true;
          })
          .sort((a, b) => {
            const safeTimeA = typeof a.time === 'string' ? a.time.replace(/-/g, ':') : '00:00:00';
            const safeTimeB = typeof b.time === 'string' ? b.time.replace(/-/g, ':') : '00:00:00';
            const tsA = new Date(`${a.date}T${safeTimeA}`).getTime() || 0;
            const tsB = new Date(`${b.date}T${safeTimeB}`).getTime() || 0;
            return sort === 'oldest' ? tsA - tsB : tsB - tsA;
          })
      : [];

    res.status(200).json({ transcripts: files, isAdmin });
  } catch (e) {
    console.error('[Transcripts API] GitHub fetch error:', e.message);
    res.status(500).json({ error: e.message, transcripts: [] });
  }
}
