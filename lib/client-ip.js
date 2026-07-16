// Resolves the real client IP behind trusted reverse proxies.
//
// `x-forwarded-for` is a client-controllable header: an attacker can prepend
// arbitrary values ("1.1.1.1, <realclient>"). Only the entries appended by our
// own trusted proxies can be believed. We therefore count TRUSTED_PROXY_HOPS
// from the RIGHT of the XFF chain (the hops our infrastructure added) rather
// than taking the leftmost, attacker-controlled entry.
//
// Set TRUSTED_PROXY_HOPS to the number of reverse proxies in front of the app
// (default 1 — a single edge/reverse proxy such as Vercel or the bundled
// proxy.js). Getting this right is what makes IP-based rate limiting real.
const TRUSTED_PROXY_HOPS = Math.max(1, parseInt(process.env.TRUSTED_PROXY_HOPS || '1', 10) || 1);

export function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (xff) {
    const parts = String(xff).split(',').map(p => p.trim()).filter(Boolean);
    if (parts.length) {
      const idx = Math.max(0, parts.length - TRUSTED_PROXY_HOPS);
      return parts[idx];
    }
  }
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}
