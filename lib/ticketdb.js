import mysql from 'mysql2/promise';

let pool = null;

function getPool() {
  if (pool) return pool;

  const host = process.env.DB_HOST;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME;

  if (!host || !user || !password || !database) {
    console.error('[MySQL] Missing required env vars: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME');
    return null;
  }

  pool = mysql.createPool({
    host,
    user,
    password,
    database,
    port: parseInt(process.env.DB_PORT || '3306'),
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
  });

  return pool;
}

export async function accessibleTranscriptsQuery(isAdmin, userId, userRoles = []) {
  if (pool) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transcript_deny (
        id INT AUTO_INCREMENT PRIMARY KEY,
        transcript_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        denied_by VARCHAR(255) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_transcript_deny (transcript_id, user_id)
      )
    `);
  }

  const denyClause = 'NOT EXISTS (SELECT 1 FROM transcript_deny td WHERE td.transcript_id = transcripts.id AND td.user_id = ?)';

  if (isAdmin) {
    return { where: denyClause, params: [userId] };
  }

  const rolePlaceholders = userRoles.map(() => '?').join(',');
  const clauses = ['owner_id = ?'];
  const params = [userId];

  if (rolePlaceholders) {
    clauses.push(`id IN (SELECT transcript_id FROM transcript_access WHERE (grantee_type = 'user' AND grantee_id = ?) OR (grantee_type = 'role' AND grantee_id IN (${rolePlaceholders})))`);
    params.push(userId, ...userRoles);
  } else {
    clauses.push(`id IN (SELECT transcript_id FROM transcript_access WHERE grantee_type = 'user' AND grantee_id = ?)`);
    params.push(userId);
  }

  return { where: `(${clauses.join(' OR ')}) AND ${denyClause}`, params: [...params, userId] };
}

export default getPool();
