import mysql from 'mysql2/promise';

const globalForSessionsDb = globalThis;

let sessionsPool = globalForSessionsDb.__sessionsDbPool || null;

function getSessionsPool() {
  if (sessionsPool) return sessionsPool;

  const host = process.env.SESSIONS_DB_HOST;
  const port = process.env.SESSIONS_DB_PORT || '3306';
  const user = process.env.SESSIONS_DB_USER;
  const password = process.env.SESSIONS_DB_PASSWORD;
  const database = process.env.SESSIONS_DB_NAME;

  if (!host || !user || !password || !database) {
    console.error('[SessionsDB] Missing required env vars: SESSIONS_DB_HOST, SESSIONS_DB_USER, SESSIONS_DB_PASSWORD, SESSIONS_DB_NAME');
    return null;
  }

  sessionsPool = mysql.createPool({
    host,
    port: parseInt(port, 10),
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: parseInt(process.env.SESSIONS_DB_CONNECTION_LIMIT || process.env.DB_CONNECTION_LIMIT || '1', 10),
    maxIdle: parseInt(process.env.SESSIONS_DB_MAX_IDLE || process.env.DB_MAX_IDLE || '1', 10),
    idleTimeout: parseInt(process.env.SESSIONS_DB_IDLE_TIMEOUT_MS || process.env.DB_IDLE_TIMEOUT_MS || '30000', 10),
    queueLimit: parseInt(process.env.SESSIONS_DB_QUEUE_LIMIT || process.env.DB_QUEUE_LIMIT || '50', 10),
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  });
  globalForSessionsDb.__sessionsDbPool = sessionsPool;

  return sessionsPool;
}

export async function ensureStaffOffencesTable() {
  const pool = getSessionsPool();
  if (!pool) {
    throw new Error('Sessions database connection is not configured.');
  }

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS staff_offences (
      id INT AUTO_INCREMENT PRIMARY KEY,
      player_name VARCHAR(255) NOT NULL,
      offence_key VARCHAR(100) NOT NULL,
      offence_name VARCHAR(255) DEFAULT NULL,
      action_taken VARCHAR(50) DEFAULT NULL,
      evidence TEXT DEFAULT NULL,
      issued_by VARCHAR(255) DEFAULT NULL,
      module VARCHAR(50) NOT NULL DEFAULT 'structured',
      timestamp DATETIME(3) NOT NULL,
      INDEX idx_player (player_name),
      INDEX idx_offence (player_name, offence_key)
    )
  `);
}

export async function addPanelPlayerOffence({
  playerName,
  offenceKey,
  offenceName,
  actionTaken,
  evidence,
  issuedBy,
}) {
  const pool = getSessionsPool();
  if (!pool) {
    throw new Error('Sessions database connection is not configured.');
  }

  await ensureStaffOffencesTable();
  await pool.execute(
    `INSERT INTO staff_offences
      (player_name, offence_key, offence_name, action_taken, evidence, issued_by, module, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      String(playerName || '').toLowerCase(),
      String(offenceKey || 'panel_action').toLowerCase(),
      offenceName || null,
      actionTaken || null,
      evidence || null,
      issuedBy || null,
      'panel',
      new Date(),
    ]
  );
}
