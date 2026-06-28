import { getServerSession } from 'next-auth'
import { authOptions } from '../../../lib/auth-options'
import { rateLimit } from '../../../lib/rate-limiter'
import { canAccessTrainerHandbook } from '../../../lib/auth'
import { searchGuildMembers } from '../../../lib/discord-v2'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Not authenticated' })

  if (!canAccessTrainerHandbook(session)) {
    return res.status(403).json({ error: 'Not authorized' })
  }

  const rl = rateLimit(req, res, 'discord-members-search')
  if (rl.limited) {
    return res.status(429).json({ error: 'Rate limited', retryAfter: rl.retryAfter })
  }

  const guildId = process.env.ALLOWED_GUILD_ID
  if (!guildId) return res.status(500).json({ error: 'Discord guild is not configured' })

  const query = (req.query.q || '').toString().trim()
  if (query.length < 1) return res.status(200).json({ members: [] })

  try {
    const members = await searchGuildMembers(guildId, query, 25)
    return res.status(200).json({ members })
  } catch (err) {
    console.error('[Discord Members] Search failed:', err.message)
    return res.status(502).json({ error: 'Discord member search failed' })
  }
}
