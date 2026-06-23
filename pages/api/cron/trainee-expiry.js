import clientPromise from '../../../lib/mongodb'
import { processExpiredTrainees } from '../../../lib/trainee-tracking'

// Manual trigger for the 7-day trainee expiry sweep. The app also runs this
// automatically on an interval (see instrumentation.js); this route lets you
// kick it off by hand. Protected by CRON_SECRET when that env var is set.
export default async function handler(req, res) {
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

  const results = await processExpiredTrainees(db)
  console.log(`[Trainee Expiry] Processed ${results.length} expired trainee(s).`)
  return res.status(200).json({ ok: true, processed: results.length, results })
}
