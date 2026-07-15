import crypto from 'crypto';

const CSRF_COOKIE_NAME = 'gsrp_csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';
const TOKEN_BYTES = 32;
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function base64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function timingSafeEqual(a, b) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export function getCsrfToken(req) {
  return req.cookies?.[CSRF_COOKIE_NAME] || null;
}

export function setCsrfCookie(res, token) {
  const isProduction = process.env.NODE_ENV === 'production';
  res.setHeader('Set-Cookie', `${CSRF_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax${isProduction ? '; Secure' : ''}; Max-Age=86400`);
}

export function generateCsrfToken() {
  return base64url(crypto.randomBytes(TOKEN_BYTES));
}

export function validateCsrf(req) {
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.headers?.[CSRF_HEADER_NAME];
  if (!cookieToken || !headerToken) return false;
  if (typeof cookieToken !== 'string' || typeof headerToken !== 'string') return false;
  return timingSafeEqual(cookieToken, headerToken);
}

export function csrfProtection(handler) {
  return async function csrfHandler(req, res) {
    const stateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method || '');
    if (stateChanging) {
      if (!validateCsrf(req)) {
        return res.status(403).json({ error: 'Invalid or missing CSRF token' });
      }
    }
    if (req.method === 'GET' && !req.cookies?.[CSRF_COOKIE_NAME]) {
      const token = generateCsrfToken();
      setCsrfCookie(res, token);
    }
    return handler(req, res);
  };
}

export { CSRF_COOKIE_NAME, CSRF_HEADER_NAME };
