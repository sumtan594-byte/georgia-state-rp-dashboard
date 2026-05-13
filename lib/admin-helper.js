import clientPromise from './mongodb';

export const TRANSCRIPT_VIEW_ROLES = [
  '1372482492132626432', // ALL_TRANSCRIPTS
  '1372468936867708988', // User provided
  '1372491512709124106', // User provided
  '1372491512100950068', // User provided
];

export async function isFullAdmin(userId, userRoles = []) {
  if (!userId) return false;
  
  // 1. Check env admins
  const envAdmins = (process.env.ADMIN_USER_IDS || '').split(',').map(i => String(i).trim()).filter(Boolean);
  if (envAdmins.includes(String(userId))) return true;

  // 2. Check roles
  if (userRoles.some(role => TRANSCRIPT_VIEW_ROLES.includes(String(role)))) return true;

  // 3. Check DB admins
  try {
    const client = await clientPromise;
    const db = client.db();
    const adminDoc = await db.collection('admins').findOne({ userId: String(userId) });
    if (adminDoc) return true;
  } catch (e) {
    console.error('[AdminHelper] DB error:', e.message);
  }

  return false;
}

export async function getAllAdminIds() {
  const envAdmins = (process.env.ADMIN_USER_IDS || '').split(',').map(i => String(i).trim()).filter(Boolean);
  let dbAdmins = [];
  try {
    const client = await clientPromise;
    const db = client.db();
    const docs = await db.collection('admins').find({}).project({ userId: 1, _id: 0 }).toArray();
    dbAdmins = docs.map(d => d.userId).filter(Boolean);
  } catch (e) {
    console.error('[AdminHelper] DB fetch error:', e.message);
  }
  return [...new Set([...envAdmins, ...dbAdmins])];
}
