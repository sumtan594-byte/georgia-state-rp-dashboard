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

export function hasRole(session, roleId) {
  if (!session?.user?.roles) return false;
  return session.user.roles.includes(roleId);
}

export function hasAnyRole(session, roleIds) {
  return roleIds.some(roleId => hasRole(session, roleId));
}

export function isAdmin(session) {
  if (session?.user?.isAdmin) return true;
  return false;
}

export function canManageAdmins(session) {
  return isAdmin(session) || hasRole(session, ROLES.ADMIN_MANAGER);
}

export function canViewAllTranscripts(session) {
  return hasRole(session, ROLES.ALL_TRANSCRIPTS) || isAdmin(session);
}

export function canAccessPanel(session) {
  return hasRole(session, ROLES.PANEL) || isAdmin(session);
}

export function canAccessHandbook(session) {
  return hasRole(session, ROLES.HANDBOOK) || hasRole(session, ROLES.TRAINEE) || isAdmin(session);
}

export function canAccessTraining(session) {
  return hasRole(session, ROLES.TRAINEE) || isAdmin(session);
}

export function canViewAttempts(session) {
  return hasRole(session, ROLES.TRAINER) || isAdmin(session);
}

export function canReviewApplications(session) {
  return hasRole(session, ROLES.APPLICATION_STAFF) || isAdmin(session);
}
