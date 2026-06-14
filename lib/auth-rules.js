export const AUTH_RESOURCES = [
  { key: 'panel', label: 'Live Panel', paths: ['/panel', '/panel/stats'], roleIds: ['1372476381115453550'], allowAdmins: true },
  { key: 'staffHandbook', label: 'Staff Handbook', paths: ['/staff-handbook'], roleIds: ['1372476381115453550', '1372476380096237609'], allowAdmins: true },
  { key: 'training', label: 'Training Quiz', paths: ['/training', '/training/handbook', '/training/ridealong'], roleIds: ['1372476380096237609'], allowAdmins: true },
  { key: 'trainingReview', label: 'Training Review', paths: ['/training/attempts', '/training/analytics', '/training/ridealong/attempts', '/training/ridealong/analytics'], roleIds: ['1372482495035211908'], allowAdmins: true },
  { key: 'applicationsReview', label: 'Applications Review', paths: ['/applications', '/applications/manage'], roleIds: ['1372491512709124106'], allowAdmins: true },
  { key: 'transcriptsAll', label: 'All Transcripts', paths: [], roleIds: ['1372482492132626432'], allowAdmins: true },
  { key: 'adminManager', label: 'Admin Manager', paths: ['/admins'], roleIds: ['1486826723210428496'], allowAdmins: true },
  { key: 'auditLogs', label: 'Audit Logs', paths: ['/audit-logs'], roleIds: [], adminOnly: true, allowAdmins: true },
  { key: 'userValidations', label: 'User Validations', paths: ['/admin/user-validations'], roleIds: [], adminOnly: true, allowAdmins: true },
  { key: 'visitorTracking', label: 'Visitor Tracking', paths: ['/admin/users', '/admin/users/all-visits', '/admin/analytics'], roleIds: [], userIds: ['901075576943673416', '1115966197100458107', '654799559498661888', '1258366303899619381'], allowAdmins: true },
  { key: 'authorizationManager', label: 'Authorisation Manager', paths: ['/admin/authorization'], roleIds: ['1486826723210428496'], allowAdmins: true },
  { key: 'panelNkz', label: 'NKZ Panel Tools', paths: [], roleIds: ['1372468936867708988'], allowAdmins: true },
  { key: 'panelSenior', label: 'Senior Panel Tools', paths: [], roleIds: ['1372491512709124106', '1372491512100950068', '1372479843677245520'], allowAdmins: true },
  { key: 'panelBolo', label: 'BOLO Panel Tools', paths: [], roleIds: ['1390835200145096734'], allowAdmins: true },
];

export const DEFAULT_AUTH_CONFIG = {
  version: 1,
  resources: AUTH_RESOURCES,
};

export function getResource(config, key) {
  return config?.resources?.find(r => r.key === key) || null;
}

export function roleMapFromConfig(config) {
  const map = {};
  for (const resource of config?.resources || []) {
    for (const roleId of resource.roleIds || []) {
      if (!map[roleId]) map[roleId] = { name: roleId, requiredFor: [] };
      map[roleId].requiredFor.push(...(resource.paths || []));
    }
  }
  return map;
}

export function userCanAccessResource(user, resource) {
  if (!resource) return false;
  const userId = String(user?.id || '');
  const userRoles = user?.roles || [];
  if (resource.allowAdmins && user?.isAdmin) return true;
  if (resource.adminOnly) return false;
  if ((resource.userIds || []).includes(userId)) return true;
  return (resource.roleIds || []).some(roleId => userRoles.includes(roleId));
}

function pathMatches(rulePath, pathname) {
  if (!rulePath || !pathname) return false;
  return pathname === rulePath || pathname.startsWith(`${rulePath}/`);
}

export function getRouteAccess(config, pathname, user) {
  const matches = (config?.resources || [])
    .filter(resource => (resource.paths || []).some(path => pathMatches(path, pathname)))
    .sort((a, b) => Math.max(...b.paths.map(p => p.length)) - Math.max(...a.paths.map(p => p.length)));

  const resource = matches[0];
  if (!resource) return { allowed: true, resource: null };
  const allowed = userCanAccessResource(user, resource);
  return {
    allowed,
    resource,
    requiredRoleId: resource.roleIds?.[0] || (resource.adminOnly ? 'ADMIN' : null),
  };
}
