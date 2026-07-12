import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth-options'
import clientPromise from '../../../../lib/mongodb'
import { isFullAdmin } from '../../../../lib/admin-helper'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Not authenticated' })

  const TRAINER_ROLE = '1372482495035211908'
  const userRoles = session.user?.roles || []
  const isTrainer = userRoles.includes(TRAINER_ROLE)
  const isAdmin = await isFullAdmin(session.user?.id, userRoles)

  if (!isTrainer && !isAdmin) {
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
  const allDocs = await attemptsCollection.find({}).project({
    _id: 0, userId: 1,
    'attempts.pass': 1, 'attempts.score': 1,
    'attempts.scenarios.correct': 1, 'attempts.scenarios.scenarioId': 1,
  }).toArray()

  const allAttempts = allDocs.flatMap(doc => (doc.attempts || []).map(a => ({ ...a, userId: doc.userId })))

  const totalAttempts = allAttempts.length
  const passed = allAttempts.filter(a => a.pass).length
  const passRate = totalAttempts > 0 ? Math.round((passed / totalAttempts) * 100) : 0
  const avgScore = totalAttempts > 0 ? Math.round(allAttempts.reduce((s, a) => s + a.score, 0) / totalAttempts) : 0

  const scenarioFailCounts = {}
  for (const a of allAttempts) {
    for (const s of (a.scenarios || [])) {
      if (!s.correct) {
        const key = s.scenarioId || 'unknown'
        scenarioFailCounts[key] = (scenarioFailCounts[key] || 0) + 1
      }
    }
  }

  const mostMissed = Object.entries(scenarioFailCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([id, count]) => ({ id, count }))

  const uniqueUsers = new Set(allDocs.map(d => d.userId)).size

  res.status(200).json({
    totalAttempts,
    passed,
    failed: totalAttempts - passed,
    passRate,
    avgScore,
    uniqueUsers,
    mostMissed,
  })
}
