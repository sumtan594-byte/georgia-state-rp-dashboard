import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { hasRole, isAdmin } from '../../../lib/auth';

const NKZ_ROLE_ID = '1372468936867708988';

// In-memory store (persists within Vercel function lifetime)
// For true persistence across deployments, swap this with a KV store or DB
globalThis.__gsrpZones ??= [];

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not logged in' });

  res.setHeader('Cache-Control', 'no-store');

  // GET — return all zones (any authed user can read)
  if (req.method === 'GET') {
    return res.status(200).json({ zones: globalThis.__gsrpZones });
  }

  // All write operations require the NKZ role
  if (!hasRole(session, ROLES.NKZ) && !isAdmin(session)) {
    return res.status(403).json({ error: 'Missing NKZ management role' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

  // POST — create zone
  if (req.method === 'POST') {
    const { name, color, studBounds, actions } = body;
    if (!studBounds || typeof studBounds !== 'object') {
      return res.status(400).json({ error: 'studBounds required' });
    }
    const zone = {
      id: `nkz_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: (name || 'Unnamed Zone').slice(0, 60),
      color: color || '#ef4444',
      studBounds, // { minX, maxX, minZ, maxZ } in Roblox stud coords
      actions: actions || { punish: 'warn', warnMsg: '', kickReason: '', jailEnabled: false },
      createdBy: session.user.username,
      createdAt: Date.now(),
    };
    globalThis.__gsrpZones.push(zone);
    return res.status(201).json({ zone });
  }

  // PATCH — update zone
  if (req.method === 'PATCH') {
    const { id, ...updates } = body;
    const idx = globalThis.__gsrpZones.findIndex(z => z.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Zone not found' });
    const allowed = ['name', 'color', 'studBounds', 'actions'];
    for (const k of allowed) {
      if (updates[k] !== undefined) globalThis.__gsrpZones[idx][k] = updates[k];
    }
    globalThis.__gsrpZones[idx].updatedAt = Date.now();
    return res.status(200).json({ zone: globalThis.__gsrpZones[idx] });
  }

  // DELETE — remove zone
  if (req.method === 'DELETE') {
    const { id } = body;
    const before = globalThis.__gsrpZones.length;
    globalThis.__gsrpZones = globalThis.__gsrpZones.filter(z => z.id !== id);
    if (globalThis.__gsrpZones.length === before) return res.status(404).json({ error: 'Zone not found' });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
