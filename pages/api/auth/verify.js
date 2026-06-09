import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth-options';
import { ROLES } from '../../../lib/auth';
import { requireAccess } from '../../../lib/access-check';

export async function verifyPanelSession(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return { ok: false, status: 401, error: 'Not logged in' };

  const access = await requireAccess(session, ROLES.PANEL);
  if (!access.allowed) {
    return { ok: false, status: 403, error: 'Missing required Discord role' };
  }

  return { ok: true, status: 200, user: session.user };
}

export async function verifyTrainerSession(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return { ok: false, status: 401, error: 'Not logged in' };

  const access = await requireAccess(session, ROLES.TRAINER);
  if (!access.allowed) {
    return { ok: false, status: 403, error: 'Missing required Discord role' };
  }

  return { ok: true, status: 200, user: session.user };
}

export async function verifyNkzSession(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return { ok: false, status: 401, error: 'Not logged in' };

  const access = await requireAccess(session, ROLES.NKZ);
  if (!access.allowed) {
    return { ok: false, status: 403, error: 'Missing NKZ management role' };
  }

  return { ok: true, status: 200, user: session.user };
}
