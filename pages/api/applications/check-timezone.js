import clientPromise from '../../../lib/mongodb';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth-options";

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { type: typeSlug } = req.query;
  if (!typeSlug) {
    return res.status(400).json({ message: 'Application type slug is required' });
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || req.socket?.remoteAddress
    || 'unknown';

  // Resolve browser timezone
  const browserTz = req.headers['x-timezone'] || '';

  // Resolve IP-based timezone
  let ipTimezone = '';
  if (ip && ip !== 'unknown' && ip !== '::1' && !ip.startsWith('192.168.') && !ip.startsWith('10.') && !ip.startsWith('172.')) {
    try {
      const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=status,timezone`);
      const geoData = await geoRes.json();
      if (geoData.status === 'success' && geoData.timezone) {
        ipTimezone = geoData.timezone;
      }
    } catch (_) {}
  }

  // Fetch application type config
  try {
    const client = await clientPromise;
    const db = client.db("gsrp_staff");
    const appType = await db.collection("application_types").findOne({ slug: typeSlug });

    if (!appType) {
      return res.status(200).json({ blocked: false, browserTimezone: browserTz, ipTimezone });
    }

    const blockedPatterns = Array.isArray(appType.blockedTimezones) ? appType.blockedTimezones : [];

    if (blockedPatterns.length === 0) {
      return res.status(200).json({ blocked: false, browserTimezone: browserTz, ipTimezone, blockedPatterns: [] });
    }

    // Check against blocked patterns — prefer IP timezone (can't be spoofed), fall back to browser TZ
    let blocked = false;
    let blockedBy = '';
    const effectiveTz = ipTimezone || browserTz;
    const blockedSource = ipTimezone ? 'ip' : 'browser';

    if (effectiveTz) {
      for (const pattern of blockedPatterns) {
        if (effectiveTz.startsWith(pattern)) {
          blocked = true;
          blockedBy = pattern;
          break;
        }
      }
    }

    console.log(`[TimezoneCheck] user=${session.user.id} type=${typeSlug} ip=${ip} browserTz=${browserTz} ipTz=${ipTimezone} src=${blockedSource} blocked=${blocked} pattern=${blockedBy}`);

    return res.status(200).json({
      blocked,
      blockedBy,
      blockedSource,
      browserTimezone: browserTz,
      ipTimezone,
      blockedPatterns,
    });
  } catch (error) {
    console.error('[TimezoneCheck] Error:', error.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
