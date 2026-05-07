import { getServerSession } from 'next-auth';
import { authOptions } from "../../../lib/auth-options";
import { ROLES, hasRole, isAdmin } from '../../../lib/auth';

const ZONES_KEY = 'panel_zones';

globalThis.__gsrpZones ??= new Map();

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not logged in' });
  if (!hasRole(session, ROLES.PANEL) && !isAdmin(session)) {
    return res.status(403).json({ error: 'Missing required Discord role' });
  }

  const store = globalThis.__gsrpZones;

  if (req.method === 'GET') {
    const zones = Array.from(store.values());
    return res.status(200).json(zones);
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const zone = body?.zone;
    if (!zone || !zone.id) return res.status(400).json({ error: 'zone with id required' });
    store.set(zone.id, zone);
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const id = body?.id;
    if (!id) return res.status(400).json({ error: 'id required' });
    store.delete(id);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
