import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth-options'
import clientPromise from '../../../../lib/mongodb'
import { rateLimit } from '../../../../lib/rate-limiter'
import { markTraineeCompleted } from '../../../../lib/trainee-tracking'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Not authenticated' })

  const rl = rateLimit(req, res, 'ridealong-complete')
  if (rl.limited) {
    return res.status(429).json({ error: 'Rate limited', retryAfter: rl.retryAfter })
  }

  const guildId = process.env.ALLOWED_GUILD_ID
  if (!guildId) return res.status(500).json({ error: 'Discord guild is not configured' })

  const userId = session.user.id

  let db
  try {
    const client = await clientPromise
    db = client.db()
  } catch (err) {
    console.error('[Ridealong Complete] MongoDB connection error:', err.message)
    return res.status(500).json({ error: 'Database connection failed' })
  }

  const attemptsCollection = db.collection('ridealong_attempts')
  const existingData = await attemptsCollection.findOne({ userId })

  if (!existingData?.hasPassed) {
    return res.status(403).json({ error: 'Ridealong has not been passed' })
  }

  if (existingData.orientationCompleted) {
    return res.status(200).json({ ok: true, orientationCompleted: true, alreadyApplied: true })
  }

  // The ridealong is no longer the final step toward becoming a full moderator.
  // Completing the orientation no longer grants any staff roles, removes the
  // trainee role, or changes the user's nickname, they must still be trained
  // 1:1 by a human trainer before advancing. We only record that they've
  // finished the orientation so they don't have to repeat it.
  try {
    await attemptsCollection.updateOne(
      { userId },
      {
        $set: {
          orientationCompleted: true,
          orientationCompletedAt: new Date().toISOString(),
        },
      }
    )
    // Mark the trainee tracking as completed so the 7-day expiry cron leaves
    // them alone while they wait to be picked up for human 1:1 training.
    await markTraineeCompleted(db, userId)
  } catch (err) {
    console.error('[Ridealong Complete] Failed to record orientation completion:', err.message)
    return res.status(500).json({ error: 'Failed to record completion' })
  }

  return res.status(200).json({
    ok: true,
    orientationCompleted: true,
  })
}
