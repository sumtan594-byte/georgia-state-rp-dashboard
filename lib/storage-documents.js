import { getPool } from './appdb';

export async function getStorageDocument(key, fallback = null) {
  const pool = getPool();
  if (!pool) {
    throw new Error('Database connection is not configured');
  }

  const [rows] = await pool.execute(
    `SELECT document_data
       FROM storage_documents
      WHERE document_key = ?
        AND (expires_at IS NULL OR expires_at > NOW(3))
      LIMIT 1`,
    [key]
  );

  if (rows.length === 0) return fallback;

  const value = rows[0].document_data;
  if (typeof value !== 'string') return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
