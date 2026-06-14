import { getAuthConfig, getResource, userCanAccessResource } from './auth-config';

export const TRANSCRIPT_VIEW_ROLES = [
  '1372482492132626432',
  '1372468936867708988',
  '1372491512709124106',
  '1372491512100950068',
];

export const TRACKING_VIEWER_IDS = [
  '901075576943673416',
  '1115966197100458107',
  '654799559498661888',
  '1258366303899619381',
];

export function isTrackingViewer(userId) {
  if (!userId) return false;
  return TRACKING_VIEWER_IDS.includes(String(userId));
}

export async function canViewTracking(sessionOrUserId) {
  const user = typeof sessionOrUserId === 'object'
    ? (sessionOrUserId.user || sessionOrUserId)
    : { id: sessionOrUserId, roles: [] };
  if (!user?.id) return false;

  try {
    const config = await getAuthConfig();
    const resource = getResource(config, 'visitorTracking');
    if (userCanAccessResource(user, resource)) return true;
  } catch (e) {
    console.error('[AdminHelper] Tracking config error:', e.message);
  }

  return isTrackingViewer(user.id);
}

export async function isFullAdmin(userId, userRoles = []) {
  if (!userId) return false;

  const envAdmins = (process.env.ADMIN_USER_IDS || '').split(',').map(i => String(i).trim()).filter(Boolean);
  if (envAdmins.includes(String(userId))) return true;

  if (userRoles.some(role => TRANSCRIPT_VIEW_ROLES.includes(String(role)))) return true;

  try {
    const clientPromise = (await import('./mongodb')).default;
    const client = await clientPromise;
    const db = client.db();
    const adminDoc = await db.collection('admins').findOne({ userId: String(userId) });
    if (adminDoc) return true;
  } catch (e) {
    console.error('[AdminHelper] DB error:', e.message);
  }

  return false;
}

export async function canManageAuthorization(session) {
  const user = session?.user || session;
  if (!user?.id) return false;
  if (await isFullAdmin(user.id, user.roles || [])) return true;

  try {
    const config = await getAuthConfig();
    const resource = getResource(config, 'authorizationManager');
    return userCanAccessResource(user, resource);
  } catch (e) {
    console.error('[AdminHelper] Authorization config error:', e.message);
    return false;
  }
}

export async function getAllAdminIds() {
  const envAdmins = (process.env.ADMIN_USER_IDS || '').split(',').map(i => String(i).trim()).filter(Boolean);
  let dbAdmins = [];
  try {
    const clientPromise = (await import('./mongodb')).default;
    const client = await clientPromise;
    const db = client.db();
    const docs = await db.collection('admins').find({}).project({ userId: 1, _id: 0 }).toArray();
    dbAdmins = docs.map(d => d.userId).filter(Boolean);
  } catch (e) {
    console.error('[AdminHelper] DB fetch error:', e.message);
  }
  return [...new Set([...envAdmins, ...dbAdmins])];
}
