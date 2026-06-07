import clientPromise from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth-options";
import { canReviewApplications } from "../../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session || !canReviewApplications(session)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'No IDs provided' });
    }

    const client = await clientPromise;
    const db = client.db("gsrp_staff");

    const objectIds = ids.map(id => new ObjectId(id));
    const result = await db.collection("applications").deleteMany({
      _id: { $in: objectIds }
    });

    console.log(`[Application Batch Delete] Deleted ${result.deletedCount} applications by ${session.user.name}`);
    return res.status(200).json({ success: true, deletedCount: result.deletedCount });
  } catch (error) {
    console.error('[Application Batch Delete] Error:', error.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
