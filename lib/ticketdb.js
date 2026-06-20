import { getPool } from './appdb';

const globalForTicketDb = globalThis;

let transcriptDenyReady = globalForTicketDb.__transcriptDenyReady || null;

export async function ensureTranscriptDenyTable() {
  const activePool = getPool();
  if (!activePool) return;

  if (!transcriptDenyReady) {
    transcriptDenyReady = activePool.query(`
      CREATE TABLE IF NOT EXISTS transcript_deny (
        id INT AUTO_INCREMENT PRIMARY KEY,
        transcript_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        denied_by VARCHAR(255) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_transcript_deny (transcript_id, user_id)
      )
    `).catch((error) => {
      transcriptDenyReady = null;
      globalForTicketDb.__transcriptDenyReady = null;
      throw error;
    });
    globalForTicketDb.__transcriptDenyReady = transcriptDenyReady;
  }

  await transcriptDenyReady;
}

export async function accessibleTranscriptsQuery(isAdmin, userId, userRoles = []) {
  await ensureTranscriptDenyTable();

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
