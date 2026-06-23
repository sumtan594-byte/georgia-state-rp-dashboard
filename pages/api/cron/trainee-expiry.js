import clientPromise from '../../../lib/mongodb'
import { traineeTrackingCollection, removeTraineeRole } from '../../../lib/trainee-tracking'

// Runs on a schedule (see vercel.json). Removes the trainee role from anyone
// whose 7-day completion window has elapsed without finishing the modules.
export default async function handler(req, res) {
  // Authorize: Vercel Cron sends the CRON_SECRET as a Bearer token.
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.authorization || ''
    if (auth !== `Bearer ${secret}`) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
  }

  let db
  try {
    const client = await clientPromise
    db = client.db()
  } catch (err) {
    console.error('[Trainee Expiry] MongoDB connection error:', err.message)
    return res.status(500).json({ error: 'Database connection failed' })
  }

  const now = new Date().toISOString()
  const expired = await traineeTrackingCollection(db)
    .find({ status: 'active', deadline: { $lte: now } })
    .toArray()

  const results = []
  for (const trainee of expired) {
    try {
      const removed = await removeTraineeRole(db, trainee.userId, { reason: 'expired', dm: false })
      results.push({ userId: trainee.userId, removed })
    } catch (err) {
      console.error('[Trainee Expiry] Failed to process', trainee.userId, err.message)
      results.push({ userId: trainee.userId, removed: false, error: err.message })
    }
  }

  console.log(`[Trainee Expiry] Processed ${results.length} expired trainee(s).`)
  return res.status(200).json({ ok: true, processed: results.length, results })
}
