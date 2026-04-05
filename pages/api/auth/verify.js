import { getServerSession } from 'next-auth';
import { authOptions } from './[...nextauth]';
import { ROLES, hasRole, isAdmin } from '../../../lib/auth';

export async function verifyPanelSession(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return { ok: false, status: 401, error: 'Not logged in' };

  if (!hasRole(session, ROLES.PANEL) && !isAdmin(session)) {
    return { ok: false, status: 403, error: 'Missing required Discord role' };
  }

  return { ok: true, status: 200, user: session.user };
}

export async function verifyTrainerSession(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return { ok: false, status: 401, error: 'Not logged in' };

  if (!hasRole(session, ROLES.TRAINER) && !isAdmin(session)) {
    return { ok: false, status: 403, error: 'Missing required Discord role' };
  }

  return { ok: true, status: 200, user: session.user };
}

export async function verifyNkzSession(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return { ok: false, status: 401, error: 'Not logged in' };

  if (!hasRole(session, ROLES.NKZ) && !isAdmin(session)) {
    return { ok: false, status: 403, error: 'Missing NKZ management role' };
  }

  return { ok: true, status: 200, user: session.user };
}
