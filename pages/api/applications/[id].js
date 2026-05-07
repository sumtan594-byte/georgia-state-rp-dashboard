import clientPromise from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth-options";
import { canReviewApplications } from "../../../lib/auth";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !canReviewApplications(session)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const { id } = req.query;

  try {
    const client = await clientPromise;
    const db = client.db("gsrp_staff");
    
    const application = await db.collection("applications").findOne({ _id: new ObjectId(id) });

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    return res.status(200).json(application);
  } catch (error) {
    console.error('[Application Fetch Error]', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
