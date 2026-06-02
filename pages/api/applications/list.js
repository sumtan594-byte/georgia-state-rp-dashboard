import clientPromise from '../../../lib/mongodb';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth-options";
import { canReviewApplications } from "../../../lib/auth";

export function invalidateAppListCache() {}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !canReviewApplications(session)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;
    const typeFilter = req.query.type || null;

    const query = typeFilter
      ? (typeFilter === 'staff' ? { $or: [{ type: 'staff' }, { type: { $exists: false } }] } : { type: typeFilter })
      : {};

    const projection = {
      _id: 1, username: 1, userId: 1, userImage: 1,
      status: 1, type: 1, submittedAt: 1,
    };

    const client = await clientPromise;
    const db = client.db("gsrp_staff");
    const collection = db.collection("applications");

    const [applications, total, counts] = await Promise.all([
      collection.find(query, { projection })
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      collection.countDocuments(query),
      collection.aggregate([
        { $group: { _id: { $ifNull: ['$type', 'staff'] }, count: { $sum: 1 } } }
      ]).toArray(),
    ]);

    const countsMap = {};
    counts.forEach(c => { countsMap[c._id] = c.count; });

    return res.status(200).json({
      applications,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      counts: countsMap,
    });
  } catch (error) {
    console.error('[Application List Error]', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
