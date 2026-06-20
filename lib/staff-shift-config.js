export const STAFF_SHIFT_DEFAULTS = {
  managerRoleIds: ['1372491512709124106'],
  staffRoleIds: ['1372476381115453550'],
  defaultQuotaMinutes: 30,
  roleQuotas: {
    '1372491512709124106': 30,
  },
  waveAnchor: '2026-06-20T00:00:00.000Z',
  waveDurationDays: 7,
  weekStartsOn: 1,
  inGameLogRetentionMonths: 2,
};

export function mergeShiftConfig(config = {}) {
  return {
    ...STAFF_SHIFT_DEFAULTS,
    ...config,
    managerRoleIds: Array.isArray(config.managerRoleIds) ? config.managerRoleIds : STAFF_SHIFT_DEFAULTS.managerRoleIds,
    staffRoleIds: Array.isArray(config.staffRoleIds) ? config.staffRoleIds : STAFF_SHIFT_DEFAULTS.staffRoleIds,
    roleQuotas: {
      ...STAFF_SHIFT_DEFAULTS.roleQuotas,
      ...(config.roleQuotas || {}),
    },
  };
}

export function userHasAnyRole(session, roleIds = []) {
  if (session?.user?.isAdmin) return true;
  const roles = session?.user?.roles || [];
  return roleIds.some(roleId => roles.includes(roleId));
}
