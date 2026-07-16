import { DEFAULT_AUTH_CONFIG, getResource, userCanAccessResource } from './auth-rules';

// CLIENT-ONLY authorization helpers.
//
// isAdmin(), canAccessResource(), and the canX() wrappers below read
// session.user.isAdmin and session.user.authConfig. Those fields are populated
// ONLY client-side by UserRefreshContext — the NextAuth session callback never
// sets them. Server-side (API routes, getServerSession, getServerSideProps)
// these read undefined and the checks silently fail closed, which is a latent
// privilege bug.
//
// For any server-side authorization use the async, DB/config-backed helpers in
// lib/admin-helper.js (isFullAdmin, canReviewApplications, canViewTracking,
// canManageAuthorization) or lib/access-check.js (requireAccess, requireAnyAccess).
//
// ROLES and TRAINER_HANDBOOK_ROLES are plain constants and are safe to import
// anywhere.

export const ROLES = {
  ALL_TRANSCRIPTS: '1372482492132626432',
  PANEL: '1372476381115453550',
  TRAINEE: '1372476380096237609',
  TRAINER: '1372482495035211908',
  NKZ: '1372468936867708988',
  HANDBOOK: '1372476381115453550',
  APPLICATION_STAFF: '1372491512709124106',
  ADMIN_MANAGER: '1486826723210428496',
};

function getConfig(session) {
  return session?.user?.authConfig || session?.authConfig || DEFAULT_AUTH_CONFIG;
}

export function hasRole(session, roleId) {
  if (!session?.user?.roles) return false;
  return session.user.roles.includes(roleId);
}

export function hasAnyRole(session, roleIds) {
  return roleIds.some(roleId => hasRole(session, roleId));
}

export function isAdmin(session) {
  return session?.user?.isAdmin === true;
}

export function canAccessResource(session, key) {
  const config = getConfig(session);
  const resource = getResource(config, key);
  if (resource) return userCanAccessResource(session?.user, resource);

  return false;
}

export function canManageAdmins(session) {
  return canAccessResource(session, 'adminManager') || isAdmin(session);
}

export function canViewAllTranscripts(session) {
  return canAccessResource(session, 'transcriptsAll') || isAdmin(session);
}

export function canAccessPanel(session) {
  return canAccessResource(session, 'panel') || isAdmin(session);
}

export function canAccessHandbook(session) {
  return canAccessResource(session, 'staffHandbook') || isAdmin(session);
}

export function canAccessTraining(session) {
  return canAccessResource(session, 'training') || isAdmin(session);
}

export function canViewAttempts(session) {
  return canAccessResource(session, 'trainingReview') || isAdmin(session);
}

// Roles permitted to view the trainer handbook / run 1:1 trainings.
// Restricted to exactly these two roles, admins do NOT get implicit access.
export const TRAINER_HANDBOOK_ROLES = [
  '1372491512100950068',
  '1520638906645614674',
];

export function canAccessTrainerHandbook(session) {
  return hasAnyRole(session, TRAINER_HANDBOOK_ROLES);
}

export function canReviewApplications(session) {
  return canAccessResource(session, 'applicationsReview') || isAdmin(session);
}

export function canViewTracking(session) {
  return canAccessResource(session, 'visitorTracking') || isAdmin(session);
}

export function canManageAuthorization(session) {
  return canAccessResource(session, 'authorizationManager') || isAdmin(session);
}
