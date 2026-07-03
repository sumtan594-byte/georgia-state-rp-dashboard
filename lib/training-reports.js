import getPool from './appdb'

let ensured = false

// Mirrors the bot's utils/database.js training_reports schema so a report can be
// persisted even if the dashboard writes before the bot has run initDB().
async function ensureTable(pool) {
  if (ensured) return
  await pool.query(`CREATE TABLE IF NOT EXISTS training_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    traineeId VARCHAR(255) NOT NULL,
    traineeRoblox VARCHAR(255),
    trainerId VARCHAR(255) NOT NULL,
    score INT NOT NULL,
    total INT NOT NULL,
    pct INT NOT NULL,
    passed BOOLEAN NOT NULL,
    notes TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_trainee (traineeId),
    INDEX idx_trainer_time (trainerId, timestamp)
  )`)
  ensured = true
}

/**
 * Persist a 1:1 training result to the shared s70223_Bots MySQL database.
 * Read back by the bot's /traininghistory command and the trainer-inactivity
 * auto-punisher. Returns the inserted row id, or null on failure (non-fatal —
 * the caller must not let a DB error break DM/channel delivery).
 */
export async function saveTrainingReport({ traineeId, traineeRoblox, trainerId, score, total, pct, passed, notes }) {
  const pool = getPool()
  if (!pool) {
    console.error('[TrainingReports] No DB pool available; report not persisted.')
    return null
  }
  await ensureTable(pool)
  const [r] = await pool.query(
    `INSERT INTO training_reports (traineeId, traineeRoblox, trainerId, score, total, pct, passed, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [traineeId, traineeRoblox || null, trainerId, score, total, pct, passed ? 1 : 0, notes || null]
  )
  return r.insertId
}
