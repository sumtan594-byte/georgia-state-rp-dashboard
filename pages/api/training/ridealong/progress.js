import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth-options'
import clientPromise from '../../../../lib/mongodb'

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Not authenticated' })

  const userId = session.user.id

  let db
  try {
    const client = await clientPromise
    db = client.db()
  } catch (err) {
    return res.status(500).json({ error: 'Database connection failed' })
  }

  if (req.method === 'GET') {
    const doc = await db.collection('ridealong_attempts').findOne({ userId })

    return res.status(200).json({
      hasPassed: doc?.hasPassed || false,
      hasPassedAt: doc?.hasPassedAt || null,
      cooldownUntil: doc?.cooldownUntil || null,
      discordRolesApplied: doc?.discordRolesApplied || false,
    })
  }

  if (req.method === 'POST') {
    // Save progress (for future resume functionality — currently unused but stubbed)
    return res.status(200).json({ ok: true })
  }

  if (req.method === 'DELETE') {
    // Clear any saved progress
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
