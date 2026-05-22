import clientPromise from '../../../lib/mongodb';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth-options";
import { canReviewApplications } from "../../../lib/auth";

const listCache = { data: null, ts: 0 };
const CACHE_TTL = 15000;

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !canReviewApplications(session)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    if (Date.now() - listCache.ts < CACHE_TTL && listCache.data) {
      return res.status(200).json(listCache.data);
    }

    const client = await clientPromise;
    const db = client.db("gsrp_staff");
    
    const applications = await db.collection("applications")
      .find({})
      .sort({ submittedAt: -1 })
      .toArray();

    listCache.data = applications;
    listCache.ts = Date.now();
    return res.status(200).json(applications);
  } catch (error) {
    console.error('[Application List Error]', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
