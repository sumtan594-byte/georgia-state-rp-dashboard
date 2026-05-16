import clientPromise from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth-options";
import { canReviewApplications } from "../../../lib/auth";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  // Only staff can manage types
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const client = await clientPromise;
  const db = client.db("gsrp_staff");

  if (req.method === 'GET') {
    const types = await db.collection("application_types").find({}).toArray();
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
      name, slug, description, requiredRole, 
      roleAddAccepted, roleRemoveAccepted, 
      roleAddDenied, roleRemoveDenied,
      fields 
    } = req.body;
    
    if (!name || !slug) return res.status(400).json({ message: 'Name and Slug are required' });

    const result = await db.collection("application_types").updateOne(
      { slug },
      { 
        $set: { 
          name, slug, description, requiredRole, 
          roleAddAccepted, roleRemoveAccepted, 
          roleAddDenied, roleRemoveDenied,
          fields, 
          updatedAt: new Date() 
        } 
      },
      { upsert: true }
    );
    
    return res.status(200).json({ success: true, id: result.upsertedId || slug });
  }

  if (req.method === 'DELETE') {
    const { slug } = req.query;
    await db.collection("application_types").deleteOne({ slug });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
