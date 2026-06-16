import clientPromise from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth-options";
import { canReviewApplications } from "../../../lib/auth";

const typesCache = { data: null, ts: 0 };
const CACHE_TTL = 30000;

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const client = await clientPromise;
  const db = client.db("gsrp_staff");

  if (req.method === 'GET') {
    if (Date.now() - typesCache.ts < CACHE_TTL && typesCache.data) {
      const types = typesCache.data;
      if (!canReviewApplications(session)) {
        return res.status(200).json(types.map(t => ({
          name: t.name,
          slug: t.slug,
          description: t.description,
          requiredRole: t.requiredRole,
          blacklistedRole: t.blacklistedRole,
          fields: t.fields,
        })));
      }
      return res.status(200).json(types);
    }

    const types = await db.collection("application_types").find({}).toArray();
    typesCache.data = types;
    typesCache.ts = Date.now();
    if (!canReviewApplications(session)) {
      return res.status(200).json(types.map(t => ({
        name: t.name,
        slug: t.slug,
        description: t.description,
        requiredRole: t.requiredRole,
        fields: t.fields,
      })));
    }
    return res.status(200).json(types);
  }

  // Only staff can manage types (POST/DELETE)
  if (!canReviewApplications(session)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  if (req.method === 'POST') {
    const { 
      name, slug, description, requiredRole, blacklistedRole, 
      roleAddAccepted, roleRemoveAccepted, 
      roleAddDenied, roleRemoveDenied,
      fields, blockedTimezones
    } = req.body;
    
    if (!name || !slug) return res.status(400).json({ message: 'Name and Slug are required' });

    const result = await db.collection("application_types").updateOne(
      { slug },
      { 
        $set: { 
          name, slug, description, requiredRole, blacklistedRole, 
          roleAddAccepted, roleRemoveAccepted, 
          roleAddDenied, roleRemoveDenied,
          fields, blockedTimezones: blockedTimezones || [],
          updatedAt: new Date() 
        } 
      },
      { upsert: true }
    );
    typesCache.data = null;
    typesCache.ts = 0;
    console.log('[Application Types] POST:', name, 'saved (upserted:', !!result.upsertedId, ')');
    return res.status(200).json({ success: true, id: result.upsertedId || slug });
  }

  if (req.method === 'DELETE') {
    const { slug } = req.query;
    await db.collection("application_types").deleteOne({ slug });
    typesCache.data = null;
    typesCache.ts = 0;
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
