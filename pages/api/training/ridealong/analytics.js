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
