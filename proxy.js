import { NextResponse } from 'next/server';

const WINDOW_MS = 60_000;
const stores = new Map();

const RATE_LIMITS = [
  { pattern: /^\/api\/auth\//, key: 'auth', max: 30, windowMs: 5 * WINDOW_MS },
  { pattern: /^\/api\/callback$/, key: 'oauth-callback', max: 20, windowMs: 5 * WINDOW_MS },
  { pattern: /^\/api\/verify\/forward$/, key: 'verify-forward', max: 10, windowMs: WINDOW_MS },
  { pattern: /^\/api\/webhooks\//, key: 'webhook', max: 120, windowMs: WINDOW_MS },
  { pattern: /^\/api\/panel\/(command|modactions)/, key: 'panel-action', max: 8, windowMs: WINDOW_MS },
  { pattern: /^\/api\/applications\/submit$/, key: 'application-submit', max: 5, windowMs: 5 * WINDOW_MS },
  { pattern: /^\/api\/training\/.+\/submit$|^\/api\/training\/submit$/, key: 'training-submit', max: 5, windowMs: 5 * WINDOW_MS },
  { pattern: /^\/api\/tracking\/log$/, key: 'tracking-log', max: 20, windowMs: WINDOW_MS },
  { pattern: /^\/api\/(admin|admins|applications|panel|training|transcripts)/, key: 'sensitive-api', max: 90, windowMs: WINDOW_MS },
];

const DEFAULT_API_LIMIT = { key: 'api', max: 120, windowMs: WINDOW_MS };
const WRITE_API_LIMIT = { key: 'api-write', max: 30, windowMs: WINDOW_MS };

const scriptSrc = process.env.NODE_ENV === 'development'
? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net"
: "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net";

const SECURITY_HEADERS = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "object-src 'none'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://discord.com https://discordapp.com https://cdn.discordapp.com https://api.erlc.gg https://users.roblox.com https://thumbnails.roblox.com https://ip-api.com http://ip-api.com",
    'upgrade-insecure-requests',
  ].join('; '),
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-DNS-Prefetch-Control': 'off',
  'X-Permitted-Cross-Domain-Policies': 'none',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
};

function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || request.ip
    || 'unknown';
}

function selectLimit(pathname, method) {
  const routeLimit = RATE_LIMITS.find(limit => limit.pattern.test(pathname));
  if (routeLimit) return routeLimit;
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') return WRITE_API_LIMIT;
  return DEFAULT_API_LIMIT;
}

function checkRateLimit(request, pathname) {
  const limit = selectLimit(pathname, request.method);
  const ip = getClientIp(request);
  const now = Date.now();

  if (stores.size > 10_000) {
    for (const [key, bucket] of stores.entries()) {
      if (now >= bucket.resetAt) stores.delete(key);
    }
  }

  const storeKey = `${limit.key}:${ip}`;
  const bucket = stores.get(storeKey);

  if (!bucket || now >= bucket.resetAt) {
    const resetAt = now + limit.windowMs;
    stores.set(storeKey, { count: 1, resetAt });
    return { allowed: true, limit, remaining: limit.max - 1, resetAt };
  }

  if (bucket.count >= limit.max) {
    return { allowed: false, limit, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  stores.set(storeKey, bucket);
  return { allowed: true, limit, remaining: limit.max - bucket.count, resetAt: bucket.resetAt };
}

function applySecurityHeaders(response) {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(name, value);
  }
}

function applyRateLimitHeaders(response, result) {
  response.headers.set('X-RateLimit-Limit', String(result.limit.max));
  response.headers.set('X-RateLimit-Remaining', String(Math.max(0, result.remaining)));
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)));
}

const ROLE_SYNC_PATH = '/api/user/invalidate';
const PANEL_STREAM_PATH = '/api/panel/events';

export function proxy(request) {
  const { pathname } = request.nextUrl;

  if (pathname === ROLE_SYNC_PATH || pathname === PANEL_STREAM_PATH) {
    const response = NextResponse.next();
    applySecurityHeaders(response);
    return response;
  }

  if (pathname.startsWith('/api/')) {
    const result = checkRateLimit(request, pathname);

    if (!result.allowed) {
      const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
      const response = NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 },
      );
      applySecurityHeaders(response);
      applyRateLimitHeaders(response, result);
      response.headers.set('Retry-After', String(retryAfter));
      return response;
    }

    const response = NextResponse.next();
    applySecurityHeaders(response);
    applyRateLimitHeaders(response, result);
    return response;
  }

  const response = NextResponse.next();
  applySecurityHeaders(response);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
