import { NextResponse } from 'next/server';

const WINDOW_MS = 60_000;
const stores = new Map();

const RATE_LIMITS = [
  { pattern: /^\/api\/auth\//, key: 'auth', max: 30, windowMs: 5 * WINDOW_MS },
  { pattern: /^\/api\/callback$/, key: 'oauth-callback', max: 20, windowMs: 5 * WINDOW_MS },
  { pattern: /^\/api\/staff-intake\//, key: 'staff-intake', max: 20, windowMs: 5 * WINDOW_MS },
  { pattern: /^\/api\/verify\/forward$/, key: 'verify-forward', max: 10, windowMs: WINDOW_MS },
  { pattern: /^\/api\/webhooks\//, key: 'webhook', max: 120, windowMs: WINDOW_MS },
  { pattern: /^\/api\/panel\/(command|modactions)/, key: 'panel-action', max: 120, windowMs: WINDOW_MS },
  { pattern: /^\/api\/applications\/submit$/, key: 'application-submit', max: 5, windowMs: 5 * WINDOW_MS },
  { pattern: /^\/api\/training\/.+\/submit$|^\/api\/training\/submit$/, key: 'training-submit', max: 5, windowMs: 5 * WINDOW_MS },
  { pattern: /^\/api\/tracking\/log$/, key: 'tracking-log', max: 20, windowMs: WINDOW_MS },
  { pattern: /^\/api\/(admin|admins|applications|panel|training|transcripts)/, key: 'sensitive-api', max: 90, windowMs: WINDOW_MS },
];

const DEFAULT_API_LIMIT = { key: 'api', max: 120, windowMs: WINDOW_MS };
const WRITE_API_LIMIT = { key: 'api-write', max: 30, windowMs: WINDOW_MS };

const HARDENED_PUBLIC_PATHS = new Set(['/', '/about', '/server-rules']);

function buildContentSecurityPolicy(pathname, nonce) {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const useNonce = !isDevelopment && HARDENED_PUBLIC_PATHS.has(pathname);
  const scriptSrc = useNonce
    ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`
    : isDevelopment
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
      : "script-src 'self' 'unsafe-inline'";

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "object-src 'none'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://discord.com https://discordapp.com https://cdn.discordapp.com https://api.erlc.gg https://users.roblox.com https://thumbnails.roblox.com https://ip-api.com",
    ...(useNonce ? ["require-trusted-types-for 'script'", 'trusted-types default nextjs nextjs#bundler gsrp#structured-data'] : []),
    'upgrade-insecure-requests',
  ].join('; ');
}

const SECURITY_HEADERS = {
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-DNS-Prefetch-Control': 'off',
  'X-Permitted-Cross-Domain-Policies': 'none',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
};

// `x-forwarded-for` is client-controllable — an attacker can prepend fake
// entries to dodge IP rate limiting. Only the hops our own reverse proxy
// appended can be trusted, so count TRUSTED_PROXY_HOPS from the RIGHT of the
// chain rather than taking the leftmost (attacker-supplied) entry. Set
// TRUSTED_PROXY_HOPS to the number of proxies in front of the app (default 1).
const TRUSTED_PROXY_HOPS = Math.max(1, parseInt(process.env.TRUSTED_PROXY_HOPS || '1', 10) || 1);

function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const parts = forwarded.split(',').map(p => p.trim()).filter(Boolean);
    if (parts.length) {
      return parts[Math.max(0, parts.length - TRUSTED_PROXY_HOPS)];
    }
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

// Cookie-authenticated, state-changing requests are protected against CSRF by
// an Origin allow-list. Routes authenticated by a shared secret or signature
// (not a cookie) are exempt: CSRF does not apply and they are legitimately
// cross-origin.
const CSRF_EXEMPT_PREFIXES = ['/api/auth/', '/api/webhooks/', '/api/cron/'];
const CSRF_EXEMPT_EXACT = new Set(['/api/user/invalidate']);
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function allowedOrigins() {
  return (process.env.ALLOWED_ORIGINS || process.env.NEXTAUTH_URL || 'https://join-gsrp.com')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);
}

function isCrossOriginBlocked(request, pathname) {
  if (!MUTATING_METHODS.has(request.method)) return false;
  if (CSRF_EXEMPT_EXACT.has(pathname)) return false;
  if (CSRF_EXEMPT_PREFIXES.some(p => pathname.startsWith(p))) return false;

  const origin = request.headers.get('origin');
  // A cross-site browser request always sends Origin. Absent Origin means a
  // same-origin request the browser chose not to label, or a non-browser
  // server-to-server caller — neither is a CSRF vector, so allow it.
  if (!origin) return false;
  return !allowedOrigins().includes(origin);
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

function applySecurityHeaders(response, contentSecurityPolicy) {
  response.headers.set('Content-Security-Policy', contentSecurityPolicy);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(name, value);
  }
}

function nextResponse(request, contentSecurityPolicy, nonce) {
  const requestHeaders = new Headers(request.headers);
  // Next.js reads the nonce from the request CSP and applies it to its runtime
  // scripts. The browser receives the same policy on the response below.
  requestHeaders.set('Content-Security-Policy', contentSecurityPolicy);
  if (nonce) requestHeaders.set('x-nonce', nonce);
  return NextResponse.next({ request: { headers: requestHeaders } });
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
  const nonce = process.env.NODE_ENV === 'development' || !HARDENED_PUBLIC_PATHS.has(pathname)
    ? null
    : crypto.randomUUID();
  const contentSecurityPolicy = buildContentSecurityPolicy(pathname, nonce);

  if (pathname === ROLE_SYNC_PATH || pathname === PANEL_STREAM_PATH) {
    const response = nextResponse(request, contentSecurityPolicy, nonce);
    applySecurityHeaders(response, contentSecurityPolicy);
    return response;
  }

  if (pathname.startsWith('/api/')) {
    if (isCrossOriginBlocked(request, pathname)) {
      const response = NextResponse.json(
        { error: 'Cross-origin request blocked' },
        { status: 403 },
      );
      applySecurityHeaders(response, contentSecurityPolicy);
      return response;
    }

    const result = checkRateLimit(request, pathname);

    if (!result.allowed) {
      const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
      const response = NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 },
      );
      applySecurityHeaders(response, contentSecurityPolicy);
      applyRateLimitHeaders(response, result);
      response.headers.set('Retry-After', String(retryAfter));
      return response;
    }

    const response = nextResponse(request, contentSecurityPolicy, nonce);
    applySecurityHeaders(response, contentSecurityPolicy);
    applyRateLimitHeaders(response, result);
    return response;
  }

  const response = nextResponse(request, contentSecurityPolicy, nonce);
  applySecurityHeaders(response, contentSecurityPolicy);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
