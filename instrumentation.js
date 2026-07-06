// Runs once when the Next.js server process starts. On a self-hosted host
// (e.g. Pterodactyl) there's no external cron, so we run the 7-day trainee
// expiry sweep on an in-process interval instead.
export async function register() {
  // Only run in the Node.js server runtime, never on the edge runtime.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  const { startAutoMarkWorker } = await import('./lib/application-auto-marker')
  startAutoMarkWorker()

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
