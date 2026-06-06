import clientPromise from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth-options";
import { canReviewApplications } from "../../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ message: 'Application ID is required' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session || !canReviewApplications(session)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    const client = await clientPromise;
    const db = client.db("gsrp_staff");

    // 1. Get the application to find the userId or stored ip
    const app = await db.collection("applications").findOne({ _id: new ObjectId(id) });
    if (!app) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // If application already has a valid IANA timezone, return it
    if (app.timezone && app.timezone.includes('/')) {
      return res.status(200).json({ timezone: app.timezone });
    }

    // 2. Try to find the IP from the application or user profile
    let ip = app.ip;
    if (!ip && app.userId) {
      const profile = await db.collection("visitor_profiles").findOne({ _id: app.userId });
      if (profile && profile.ip) {
        ip = profile.ip;
      } else if (profile && profile.ips && profile.ips.length > 0) {
        ip = profile.ips[0];
      }
    }

    if (!ip || ip === 'unknown' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
      return res.status(404).json({ message: 'No resolvable IP found for this applicant' });
    }

    // 3. Resolve timezone from IP using ip-api.com
    const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=status,timezone`);
    const geoData = await geoRes.json();

    if (geoData.status === 'success' && geoData.timezone) {
      return res.status(200).json({ timezone: geoData.timezone });
    }

    return res.status(404).json({ message: 'Could not resolve timezone from IP' });
  } catch (error) {
    console.error('[Timezone API] Error:', error.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
}


  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ message: 'Application ID is required' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session || !canReviewApplications(session)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    const client = await clientPromise;
    const db = client.db("gsrp_staff");

    // 1. Get the application to find the userId or stored ip
    const app = await db.collection("applications").findOne({ _id: id }); // This might need ObjectId if stored as ObjectId
    // Wait, in submit.js it's inserted without an explicit _id, so MongoDB generates an ObjectId.
    // But the query here uses 'id' from req.query, which is a string.
    // I need to use ObjectId from mongodb.
  } catch (error) {
    // ...
  }
}
