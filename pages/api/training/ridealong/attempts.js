import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth-options'
import clientPromise from '../../../../lib/mongodb'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Not authenticated' })

  const hasRole = session.user?.roles?.includes('1372482495035211908')
  const isAdmin = session.user?.isAdmin

  if (!hasRole && !isAdmin) {
    return res.status(403).json({ error: 'Not authorized' })
  }

  let db
  try {
    const client = await clientPromise
    db = client.db()
  } catch (err) {
    return res.status(500).json({ error: 'Database connection failed' })
  }

  const attemptsCollection = db.collection('ridealong_attempts')
  const allDocs = await attemptsCollection.find({}).toArray()

  const attempts = allDocs.flatMap(doc => {
    return (doc.attempts || []).map(a => ({
      ...a,
      userId: doc.userId,
      hasPassed: doc.hasPassed,
      cooldownUntil: doc.cooldownUntil,
    }))
  })

  attempts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

  const users = {}
  for (const doc of allDocs) {
    users[doc.userId] = {
      hasPassed: doc.hasPassed || false,
      cooldownUntil: doc.cooldownUntil || null,
      discordRolesApplied: doc.discordRolesApplied || false,
    }
  }

  res.status(200).json({ attempts, users })
}
