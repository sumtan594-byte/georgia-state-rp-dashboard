import mysql from 'mysql2/promise';

let sessionsPool = null;

function getSessionsPool() {
  if (sessionsPool) return sessionsPool;

  sessionsPool = mysql.createPool({
    host: process.env.SESSIONS_DB_HOST || process.env.GSRP_DB_HOST || 'db0.fps.ms',
    port: parseInt(process.env.SESSIONS_DB_PORT || process.env.GSRP_DB_PORT || '3306', 10),
    user: process.env.SESSIONS_DB_USER || process.env.GSRP_DB_USER || 'u70886_0Vt5lUiQag',
    password: process.env.SESSIONS_DB_PASSWORD || process.env.GSRP_DB_PASSWORD || '^h^G@85K=q@4tdazzGBIb+7P',
    database: process.env.SESSIONS_DB_NAME || process.env.GSRP_DB_NAME || 's70886_GSRP',
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
  });

  return sessionsPool;
}

export async function ensureStaffOffencesTable() {
  const pool = getSessionsPool();
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

