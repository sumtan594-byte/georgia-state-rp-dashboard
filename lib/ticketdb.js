import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'db0.fps.ms',
  user: process.env.DB_USER || 'u70223_eY1Luivp9c',
  password: process.env.DB_PASSWORD || 'fp+9sN..uudmcE52lSlv.KNe',
  database: process.env.DB_NAME || 's70223_Bots',
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
});

export async function accessibleTranscriptsQuery(isAdmin, userId, userRoles = []) {
  const params = [];

  if (isAdmin) {
    // Admins see all except transcripts they are explicitly denied from
    params.push(userId);
    return { where: 'id NOT IN (SELECT transcript_id FROM transcript_deny WHERE user_id = ?)', params };
  }

  const rolePlaceholders = userRoles.map(() => '?').join(',');
  const clauses = ['owner_id = ?'];
  params.push(userId);

  if (rolePlaceholders) {
    clauses.push(`id IN (SELECT transcript_id FROM transcript_access WHERE (grantee_type = 'user' AND grantee_id = ?) OR (grantee_type = 'role' AND grantee_id IN (${rolePlaceholders})))`);
    params.push(userId, ...userRoles);
  } else {
    clauses.push(`id IN (SELECT transcript_id FROM transcript_access WHERE grantee_type = 'user' AND grantee_id = ?)`);
    params.push(userId);
  }

  // Exclude denied
  params.push(userId);
  clauses.push('id NOT IN (SELECT transcript_id FROM transcript_deny WHERE user_id = ?)');

  return { where: clauses.join(' OR '), params };
}

export default pool;
