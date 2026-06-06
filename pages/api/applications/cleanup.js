import clientPromise from '../../../lib/mongodb';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth-options";
import { canReviewApplications } from "../../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session || !canReviewApplications(session)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    const client = await clientPromise;
    const db = client.db("gsrp_staff");

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const result = await db.collection("applications").deleteMany({
      submittedAt: { $lt: oneWeekAgo },
      status: { $ne: 'pending' },
    });

    console.log(`[Application Cleanup] Deleted ${result.deletedCount} old non-pending applications`);
    return res.status(200).json({ 
      success: true, 
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    console.error('[Application Cleanup] Error:', error.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
