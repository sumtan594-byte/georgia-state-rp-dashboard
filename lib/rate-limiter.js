import { getClientIp } from './client-ip';

const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW_MS = 60_000;

const LIMITS = {
  default: { max: 60, windowMs: RATE_LIMIT_WINDOW_MS },
  command: { max: 10, windowMs: RATE_LIMIT_WINDOW_MS },
  submit: { max: 5, windowMs: RATE_LIMIT_WINDOW_MS },
  auth: { max: 20, windowMs: RATE_LIMIT_WINDOW_MS },
  transcript: { max: 30, windowMs: RATE_LIMIT_WINDOW_MS },
};

function getRateLimitKey(req, prefix) {
  const ip = getClientIp(req);
  return `${prefix}:${ip}`;
}

function checkRateLimit(key, limit) {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + limit.windowMs });
    return { allowed: true, remaining: limit.max - 1, resetAt: now + limit.windowMs };
  }

  if (entry.count >= limit.max) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: limit.max - entry.count, resetAt: entry.resetAt };
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, RATE_LIMIT_WINDOW_MS);

export function rateLimit(req, res, type = 'default') {
  const limit = LIMITS[type] || LIMITS.default;
  const key = getRateLimitKey(req, type);
  const result = checkRateLimit(key, limit);

  res.setHeader('X-RateLimit-Limit', String(limit.max));
  res.setHeader('X-RateLimit-Remaining', String(result.remaining));
  res.setHeader('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)));

  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
    res.setHeader('Retry-After', String(retryAfter));
    return { limited: true, retryAfter };
  }

  return { limited: false };
}

export function rateLimitMiddleware(type = 'default') {
  return function(req, res) {
    return rateLimit(req, res, type);
  };
}
