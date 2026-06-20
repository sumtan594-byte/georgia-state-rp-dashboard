import mysql from 'mysql2/promise';

const globalForAppDb = globalThis;

let pool = globalForAppDb.__appDbPool || null;

function getPool() {
  if (pool) return pool;

  const host = process.env.DB_HOST;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME;

  if (!host || !user || !password || !database) {
    console.error('[AppDB] Missing required env vars: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME');
    return null;
  }

  pool = mysql.createPool({
    host,
    user,
    password,
    database,
    port: parseInt(process.env.DB_PORT || '3306'),
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '1', 10),
    maxIdle: parseInt(process.env.DB_MAX_IDLE || '1', 10),
    idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT_MS || '30000', 10),
    queueLimit: parseInt(process.env.DB_QUEUE_LIMIT || '50', 10),
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  });
  globalForAppDb.__appDbPool = pool;

  return pool;
}

function rowToApplication(row) {
  return {
    _id: row.id,
    type: row.type,
    typeName: row.type_name,
    username: row.username,
    userId: row.user_id,
    userImage: row.user_image,
    answers: row.answers ? JSON.parse(row.answers) : {},
    keystrokeData: row.keystroke_data ? JSON.parse(row.keystroke_data) : {},
    pasteData: row.paste_data ? JSON.parse(row.paste_data) : {},
    monitoringData: row.monitoring_data ? JSON.parse(row.monitoring_data) : {},
    sessionTabOuts: row.session_tab_outs ? JSON.parse(row.session_tab_outs) : [],
    sessionMouseLeaves: row.session_mouse_leaves ? JSON.parse(row.session_mouse_leaves) : [],
    userAgent: row.user_agent || '',
    osDetected: row.os_detected || '',
    ip: row.ip || '',
    timezone: row.timezone || '',
    status: row.status,
    submittedAt: row.submitted_at,
    reason: row.reason || null,
    reviewedBy: row.reviewed_by || null,
    reviewedByName: row.reviewed_by_name || null,
    reviewedAt: row.reviewed_at || null,
  };
}

export { getPool, rowToApplication };
export default getPool;
