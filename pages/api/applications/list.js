import clientPromise from '../../../lib/mongodb';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { canReviewApplications } from "../../../lib/auth";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !canReviewApplications(session)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    const client = await clientPromise;
    const db = client.db("gsrp_staff");
    
    const applications = await db.collection("applications")
      .find({})
      .sort({ submittedAt: -1 })
      .toArray();

    return res.status(200).json(applications);
  } catch (error) {
    console.error('[Application List Error]', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
