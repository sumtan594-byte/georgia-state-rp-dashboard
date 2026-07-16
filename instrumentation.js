// Runs once when the Next.js server process starts. On a self-hosted host
// (e.g. Pterodactyl) there's no external cron, so we run the 7-day trainee
// expiry sweep on an in-process interval instead.
export async function register() {
  // Only run in the Node.js server runtime, never on the edge runtime.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  const { startAutoMarkWorker } = await import('./lib/application-auto-marker')
  startAutoMarkWorker()

  // Ensure the visitor-tracking TTL indexes exist exactly once at boot rather
  // than on every /api/tracking/log request. These enforce the 7-day retention
  // promised in the privacy policy, so a failure is logged, not swallowed.
  try {
    const { default: clientPromise } = await import('./lib/mongodb')
    const db = (await clientPromise).db()
    await Promise.all([
      db.collection('visitor_logs').createIndex({ timestamp: 1 }, { expireAfterSeconds: 604800 }),
      db.collection('visitor_profiles').createIndex({ lastSeen: 1 }, { expireAfterSeconds: 604800 }),
    ])
  } catch (err) {
    console.error('[Tracking] Failed to ensure TTL indexes:', err.message)
  }

  // Guard against double-registration (e.g. dev hot reload / multiple workers).
  if (globalThis.__traineeExpiryStarted) return
  globalThis.__traineeExpiryStarted = true

  const INTERVAL_MS = 60 * 60 * 1000 // hourly

  const sweep = async () => {
    try {
      const [{ default: clientPromise }, { processExpiredTrainees }] = await Promise.all([
        import('./lib/mongodb'),
        import('./lib/trainee-tracking'),
      ])
      const client = await clientPromise
      const results = await processExpiredTrainees(client.db())
      if (results.length) {
        console.log(`[Trainee Expiry] Auto-sweep removed ${results.length} expired trainee(s).`)
      }
    } catch (err) {
      console.error('[Trainee Expiry] Auto-sweep failed:', err.message)
    }
  }

  // Kick one off shortly after boot, then on a fixed interval.
  setTimeout(sweep, 30 * 1000)
  const timer = setInterval(sweep, INTERVAL_MS)
  if (typeof timer.unref === 'function') timer.unref()
}
