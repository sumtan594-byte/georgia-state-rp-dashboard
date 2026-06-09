/**
 * Vercel Serverless Function: /api/forward
 * 
 * SETUP REQUIRED:
 * In your Vercel dashboard -> Project Settings -> Environment Variables, add:
 *   DISCORD_WEBHOOK_URL = https://discord.com/api/webhooks/{id}/{token}
 *   DISCORD_LOG_WEBHOOK_URL = https://discord.com/api/webhooks/{id}/{token}
 * 
 * Create the main webhook inside the Discord channel with ID: 1426165224200732683
 * Create the log webhook inside the Discord channel with ID: 1454847622685786112
 * (Right-click channel -> Edit Channel -> Integrations -> Webhooks -> New Webhook -> Copy URL)
 */

// ─── Logging Helper ───────────────────────────────────────────────────────────
// Posts a rich embed to the log channel for every verification event.
// Never throws — a log failure must never break the main flow.
async function sendLog(fetchFn, logWebhookUrl, { type, discordId, ip, detail, extra } = {}) {
    if (!logWebhookUrl) return;

    const COLOURS = {
        success:   0x10b981, // green
        failure:   0xef4444, // red
        ratelimit: 0xf59e0b, // amber
        invalid:   0xf59e0b, // amber
        error:     0x6b7280, // grey
    };

    const LABELS = {
        success:   'Verification Forwarded',
        failure:   'Webhook Delivery Failed',
        ratelimit: 'Rate Limited',
        invalid:   'Invalid Request',
        error:     'Internal Error',
    };

    const now = Math.floor(Date.now() / 1000);

    const fields = [];
    if (discordId) fields.push({ name: 'Discord ID', value: `\`${discordId}\``, inline: true });
    if (ip)        fields.push({ name: 'IP', value: `\`${ip}\``, inline: true });
    if (detail)    fields.push({ name: 'Detail', value: String(detail).substring(0, 1024), inline: false });
    if (extra)     fields.push({ name: 'Extra', value: String(extra).substring(0, 1024), inline: false });
    fields.push({ name: 'Timestamp', value: `<t:${now}:F>`, inline: false });

    const embed = {
        title: LABELS[type] || `📋 ${type}`,
        color: COLOURS[type] ?? 0x3b82f6,
        fields,
        footer: { text: 'GSRP Verification · /api/forward' },
    };

    try {
        await fetchFn(logWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'GSRP-Verification/1.0' },
            body: JSON.stringify({ embeds: [embed], allowed_mentions: { parse: [] } }),
        });
    } catch (logErr) {
        console.warn('[forward] Log webhook failed:', logErr.message);
    }
}
// ─────────────────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.NEXTAUTH_URL || 'https://join-gsrp.com')
        .split(',')
        .map(origin => origin.trim())
        .filter(Boolean);
    const requestOrigin = req.headers.origin;
    const allowOrigin = allowedOrigins.includes(requestOrigin) ? requestOrigin : allowedOrigins[0];

    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', allowOrigin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed. Use POST.' 
        });
    }

    const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
    const DISCORD_LOG_WEBHOOK_URL = process.env.DISCORD_LOG_WEBHOOK_URL;

    if (!DISCORD_WEBHOOK_URL) {
      console.error('[forward] Missing DISCORD_WEBHOOK_URL env var');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error. Please contact server staff.',
      });
    }

    if (!DISCORD_WEBHOOK_URL.startsWith('https://discord.com/api/webhooks/')) {
        console.error('[forward] Invalid webhook URL format');
        return res.status(500).json({
            success: false,
            error: 'Server configuration error. Please contact server staff.'
        });
    }

    // Resolve fetch early so sendLog can use it throughout
    const fetchFn = fetch;

    // Grab requester IP for log context
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
        || req.headers['x-real-ip']
        || req.socket?.remoteAddress
        || 'unknown';

    // Parse request body
    let body = req.body;
    
    if (typeof body === 'string') {
        try {
            body = JSON.parse(body);
        } catch (parseErr) {
            console.error('[forward] JSON parse error:', parseErr.message);
            await sendLog(fetchFn, DISCORD_LOG_WEBHOOK_URL, {
                type: 'invalid',
                ip,
                detail: 'Malformed JSON body',
                extra: parseErr.message,
            });
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid JSON body' 
            });
        }
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        await sendLog(fetchFn, DISCORD_LOG_WEBHOOK_URL, {
            type: 'invalid',
            ip,
            detail: 'Missing or invalid request body',
        });
        return res.status(400).json({ 
            success: false, 
            error: 'Missing or invalid request body' 
        });
    }

    const { discordId, authCode } = body;

    // Validate discordId - must be a Discord snowflake (17-20 digit number)
    if (!discordId || typeof discordId !== 'string' || !/^\d{17,20}$/.test(discordId.trim())) {
        console.warn('[forward] Invalid discordId:', discordId);
        await sendLog(fetchFn, DISCORD_LOG_WEBHOOK_URL, {
            type: 'invalid',
            ip,
            detail: 'Invalid or missing Discord ID',
            extra: `Received: \`${String(discordId).substring(0, 64)}\``,
        });
        return res.status(400).json({ 
            success: false, 
            error: 'Invalid or missing Discord ID' 
        });
    }

    // Validate authCode - must be a non-empty string
    if (!authCode || typeof authCode !== 'string' || authCode.trim().length === 0) {
        console.warn('[forward] Invalid authCode');
        await sendLog(fetchFn, DISCORD_LOG_WEBHOOK_URL, {
            type: 'invalid',
            discordId: discordId.trim(),
            ip,
            detail: 'Invalid or missing auth code',
        });
        return res.status(400).json({ 
            success: false, 
            error: 'Invalid or missing authorization code' 
        });
    }

    const cleanId = discordId.trim();
    const cleanCode = authCode.trim();

    // In-flight deduplication: prevent duplicate processing within same request window
    const inFlightKey = `inflight:${cleanId}:${cleanCode}`;
    if (!global.inFlightRequests) global.inFlightRequests = new Map();
    
    if (global.inFlightRequests.has(inFlightKey)) {
        console.log('[forward] Duplicate in-flight request detected, returning early');
        return res.status(200).json({ 
            success: true,
            message: 'Request already being processed'
        });
    }
    global.inFlightRequests.set(inFlightKey, true);
    
    // Clean up after response
    const cleanupInFlight = () => global.inFlightRequests?.delete(inFlightKey);

    // Rate limiting check (simple in-memory, consider Redis for production)
    const rateLimitKey = `ratelimit:${cleanId}`;
    const now = Date.now();
    const rateLimitWindow = 60000; // 1 minute
    const rateLimitMax = 3; // 3 attempts per minute

    if (!global.rateLimitStore) {
        global.rateLimitStore = new Map();
    }

    const rateLimitEntry = global.rateLimitStore.get(rateLimitKey) || { count: 0, resetAt: now + rateLimitWindow };
    
    if (now > rateLimitEntry.resetAt) {
        rateLimitEntry.count = 0;
        rateLimitEntry.resetAt = now + rateLimitWindow;
    }

    if (rateLimitEntry.count >= rateLimitMax) {
        const retryAfter = Math.ceil((rateLimitEntry.resetAt - now) / 1000);
        cleanupInFlight();
        await sendLog(fetchFn, DISCORD_LOG_WEBHOOK_URL, {
            type: 'ratelimit',
            discordId: cleanId,
            ip,
            detail: `Rate limit hit — ${rateLimitMax} attempts per minute exceeded`,
            extra: `Retry after: ${retryAfter}s`,
        });
        return res.status(429).json({
            success: false,
            error: `Too many attempts. Please wait ${retryAfter} seconds.`,
            retryAfter
        });
    }

    rateLimitEntry.count++;
    global.rateLimitStore.set(rateLimitKey, rateLimitEntry);

    // Clean up old rate limit entries periodically
    if (!global.rateLimitCleanup) {
        global.rateLimitCleanup = setInterval(() => {
            const cleanupTime = Date.now();
            for (const [key, entry] of global.rateLimitStore.entries()) {
                if (cleanupTime > entry.resetAt) {
                    global.rateLimitStore.delete(key);
                }
            }
        }, 60000);
    }

    try {
        const webhookPayload = {
            content: `AUTH_DATA:${cleanId}:${cleanCode}`,
            allowed_mentions: { parse: [] },
            flags: 64 // Ephemeral (though webhooks ignore this)
        };

        const webhookRes = await fetchFn(DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'User-Agent': 'GSRP-Verification/1.0'
            },
            body: JSON.stringify(webhookPayload),
            timeout: 10000
        });

        if (!webhookRes.ok) {
            const errText = await webhookRes.text().catch(() => 'unknown error');
            console.error(`[forward] Discord webhook ${webhookRes.status}:`, errText);
            
            // Handle specific error codes
            if (webhookRes.status === 404) {
                cleanupInFlight();
                await sendLog(fetchFn, DISCORD_LOG_WEBHOOK_URL, {
                    type: 'failure',
                    discordId: cleanId,
                    ip,
                    detail: 'Main webhook returned 404 — webhook not found or deleted',
                });
                return res.status(502).json({
                    success: false,
                    error: 'Webhook not found. Please contact server staff.'
                });
            }
            
            if (webhookRes.status === 429) {
                const retryData = await webhookRes.json().catch(() => ({}));
                const retryAfter = retryData.retry_after || 5;
                cleanupInFlight();
                await sendLog(fetchFn, DISCORD_LOG_WEBHOOK_URL, {
                    type: 'failure',
                    discordId: cleanId,
                    ip,
                    detail: 'Main webhook rate limited by Discord',
                    extra: `Retry after: ${retryAfter}s`,
                });
                return res.status(429).json({
                    success: false,
                    error: 'Server is rate limited. Please try again shortly.',
                    retryAfter
                });
            }

            await sendLog(fetchFn, DISCORD_LOG_WEBHOOK_URL, {
                type: 'failure',
                discordId: cleanId,
                ip,
                detail: `Main webhook returned HTTP ${webhookRes.status}`,
                extra: errText.substring(0, 512),
            });
            cleanupInFlight();
            return res.status(502).json({
                success: false,
                error: 'Failed to reach the Discord bot. Please try again in a moment.'
            });
        }

        // Success
        cleanupInFlight();
        await sendLog(fetchFn, DISCORD_LOG_WEBHOOK_URL, {
            type: 'success',
            discordId: cleanId,
            ip,
            detail: 'Auth code forwarded to bot successfully',
        });
        return res.status(200).json({ 
            success: true,
            message: 'Verification data forwarded successfully'
        });

    } catch (err) {
        console.error('[forward] Error:', err.message);
        
        // Handle timeout errors
        if (err.name === 'TimeoutError' || err.message.includes('timeout')) {
            cleanupInFlight();
            await sendLog(fetchFn, DISCORD_LOG_WEBHOOK_URL, {
                type: 'error',
                discordId: cleanId,
                ip,
                detail: 'Request to Discord timed out',
                extra: err.message,
            });
            return res.status(504).json({
                success: false,
                error: 'Request timed out. Please try again.'
            });
        }

        // Handle network errors
        if (err.name === 'FetchError' || err.message.includes('fetch')) {
            cleanupInFlight();
            await sendLog(fetchFn, DISCORD_LOG_WEBHOOK_URL, {
                type: 'error',
                discordId: cleanId,
                ip,
                detail: 'Network error reaching Discord',
                extra: err.message,
            });
            return res.status(503).json({
                success: false,
                error: 'Network error. Please check your connection and try again.'
            });
        }

        cleanupInFlight();
        await sendLog(fetchFn, DISCORD_LOG_WEBHOOK_URL, {
            type: 'error',
            discordId: cleanId,
            ip,
            detail: 'Unhandled internal error',
            extra: err.message,
        });
        return res.status(500).json({
            success: false,
            error: 'Internal server error. Please try again.'
        });
    }
}
