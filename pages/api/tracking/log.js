import clientPromise from '../../../lib/mongodb';
import { enrichUserInfo } from '../../../lib/discord-api';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth-options';
import { getClientIp } from '../../../lib/client-ip';

const BLOCKED_IDS = [];
const BLOCKED_USERNAMES = [];
const BLOCKED_IPS = ['122.148.185.222'];

const geoCache = new Map();

// Cache server-resolved Discord profiles so we don't enrich on every hit.
const profileCache = new Map();
const PROFILE_CACHE_TTL_MS = 10 * 60 * 1000;

async function resolveProfile(id) {
  const cached = profileCache.get(id);
  if (cached && Date.now() - cached.ts < PROFILE_CACHE_TTL_MS) return cached.info;
  const info = await enrichUserInfo(id);
  if (profileCache.size > 500) {
    [...profileCache.keys()].slice(0, 100).forEach(k => profileCache.delete(k));
  }
  profileCache.set(id, { info, ts: Date.now() });
  return info;
}

function isBlocked(userId, username, ip) {
  if (userId && BLOCKED_IDS.includes(String(userId))) return true;
  if (username && BLOCKED_USERNAMES.some(n => n.toLowerCase() === username.toLowerCase())) return true;
  if (ip && BLOCKED_IPS.includes(ip)) return true;
  return false;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const client = await clientPromise;
    const db = client.db();

    const ip = getClientIp(req);

    // `userAgent`, `device`, and `page` are non-authoritative display hints and
    // are safe to take from the body. Identity (userId/username/avatar) is NOT
    // trusted from the client — a caller could otherwise forge attributed log
    // entries. We resolve it server-side from the session, or from the
    // regex-gated Discord ID for pre-auth Roblox verification visitors.
    const { userAgent, device, page, discordId: rawDiscordId } = req.body || {};

    let userId = null;
    let username = '';
    let avatar = '';

    const session = await getServerSession(req, res, authOptions);
    if (session?.user?.id) {
      userId = String(session.user.id);
    } else {
      // Roblox verification visitors arrive without a session but carry a Discord
      // ID in the URL state param. Resolve their Discord info server-side so they
      // get logged as identified users rather than anonymous IPs.
      const candidate = String(rawDiscordId || '').trim();
      if (/^\d{17,20}$/.test(candidate)) userId = candidate;
    }

    if (userId) {
      const info = await resolveProfile(userId);
      if (info && info.username && info.username !== userId) {
        username = info.username;
        avatar = info.avatarUrl || '';
      } else {
        // Could not verify the identity against Discord; don't attribute it.
        userId = null;
      }
    }

    if (isBlocked(userId, username, ip)) {
      return res.status(200).json({ ok: true, skipped: true });
    }

    const ua = userAgent || req.headers['user-agent'] || '';
    const dev = device || parseDevice(ua);
    const now = new Date();
    const key = userId || `ip_${ip}`;

    // resolve geolocation + proxy detection once per unique IP
    let geo = geoCache.get(ip);
    if (!geo && ip && ip !== 'unknown' && ip !== '::1' && !ip.startsWith('192.168.') && !ip.startsWith('10.') && !ip.startsWith('172.')) {
      try {
        const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=status,hostname,isp,org,as,asname,country,regionName,city,lat,lon,proxy,hosting,mobile`);
        const geoData = await geoRes.json();
        if (geoData.status === 'success') {
          geo = {
            hostname: geoData.hostname || '',
            isp: geoData.isp || '',
            org: geoData.org || '',
            as: geoData.as || '',
            asname: geoData.asname || '',
            country: geoData.country || '',
            region: geoData.regionName || '',
            city: geoData.city || '',
            lat: geoData.lat || null,
            lon: geoData.lon || null,
            proxy: !!geoData.proxy,
            hosting: !!geoData.hosting,
            mobile: !!geoData.mobile,
          };
          geoCache.set(ip, geo);
        }
      } catch (_) {}
    }

    // proxy / VPN block check
    if (geo && geo.proxy) {
      const whitelistQuery = [{ ip }];
      if (userId) {
        whitelistQuery.push({ userId: String(userId) });
      } else {
        const profileByIp = await db.collection('visitor_profiles').findOne(
          { ips: ip, userId: { $exists: true, $ne: '' } },
          { projection: { userId: 1 } },
        );
        if (profileByIp?.userId) {
          whitelistQuery.push({ userId: String(profileByIp.userId) });
        }
      }
      const whitelisted = await db.collection('proxy_whitelist').findOne({ $or: whitelistQuery });
      if (!whitelisted) {
        return res.status(200).json({ ok: false, blocked: true, reason: 'proxy' });
      }
      // whitelisted, don't label as proxy in profile (ip-api false positives)
      geo = { ...geo, proxy: false };
    }

    // upsert profile (one doc per user or per IP)
    const setFields = {
      ...(userId ? { userId, username, avatar } : { ip }),
      device: dev,
      userAgent: ua,
      lastSeen: now,
      lastPage: page || '',
    };
    if (geo) setFields.geo = geo;

    await db.collection('visitor_profiles').updateOne(
      { _id: key },
      {
        $set: setFields,
        $setOnInsert: { firstSeen: now },
        $addToSet: { ips: ip },
        $inc: { visitCount: 1 },
      },
      { upsert: true },
    );

    // insert lightweight time-series entry (TTL index auto-clears after 7 days)
    await db.collection('visitor_logs').insertOne({
      ...(userId ? { userId, username, avatar } : {}),
      ip,
      device: dev,
      userAgent: ua,
      page: page || '',
      timestamp: now,
      ...(geo ? { geo } : {}),
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[Tracking] Error:', err);
    return res.status(500).json({ error: 'Tracking failed' });
  }
}

function parseDevice(ua) {
  if (!ua) return 'Unknown';
  if (ua.includes('iPhone')) return 'iPhone';
  if (ua.includes('iPad')) return 'iPad';
  if (ua.includes('Android')) return ua.includes('Mobile') ? 'Android Phone' : 'Android Tablet';
  if (ua.includes('Mobile')) return 'Mobile';
  return 'Desktop';
}
