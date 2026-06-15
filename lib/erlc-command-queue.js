const COMMAND_INTERVAL_MS = 5200;
const MAX_RETRIES = 4;

globalThis.__gsrpErlcCommandQueue ??= {
  lastSentAt: 0,
  queue: [],
  running: false,
  rateLimit: {
    remaining: null,
    resetAt: null,
    retryAfterMs: null,
    bucket: null,
  },
};

function getQueue() {
  return globalThis.__gsrpErlcCommandQueue;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function headerNumber(headers, name) {
  const value = headers.get(name);
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function updateRateLimitFromResponse(response, body = null) {
  const q = getQueue();
  const remaining = headerNumber(response.headers, 'X-RateLimit-Remaining');
  const reset = headerNumber(response.headers, 'X-RateLimit-Reset');
  const retryAfter = Number(body?.retry_after ?? response.headers.get('Retry-After') ?? response.headers.get('X-RateLimit-Reset-After'));
  const bucket = response.headers.get('X-RateLimit-Bucket');

  if (remaining !== null) q.rateLimit.remaining = remaining;
  if (bucket) q.rateLimit.bucket = bucket;

  if (Number.isFinite(reset)) {
    q.rateLimit.resetAt = reset < 1e12 ? reset * 1000 : reset;
  }

  if (Number.isFinite(retryAfter)) {
    q.rateLimit.retryAfterMs = Math.max(0, retryAfter * 1000);
  }
}

function cloneJsonResponse(response, body) {
  return new Response(JSON.stringify(body || {}), {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

async function executeCommand(command, erlcKey, attempt = 0) {
  const q = getQueue();

  if (q.rateLimit.remaining !== null && q.rateLimit.remaining <= 0) {
    const waitFromReset = q.rateLimit.resetAt ? q.rateLimit.resetAt - Date.now() : 0;
    const waitFromRetry = q.rateLimit.retryAfterMs || 0;
    const waitMs = Math.max(waitFromReset, waitFromRetry, COMMAND_INTERVAL_MS);
    await sleep(waitMs + 250);
  }

  const elapsed = Date.now() - q.lastSentAt;
  if (elapsed < COMMAND_INTERVAL_MS) {
    await sleep(COMMAND_INTERVAL_MS - elapsed);
  }

  q.lastSentAt = Date.now();
  const response = await fetch('https://api.erlc.gg/v2/server/command', {
    method: 'POST',
    headers: {
      'server-key': erlcKey,
      'Content-Type': 'application/json',
      Accept: '*/*',
    },
    body: JSON.stringify({ command }),
  });
  q.lastSentAt = Date.now();

  if (response.status !== 429) {
    updateRateLimitFromResponse(response);
    return response;
  }

  const body = await response.json().catch(() => ({}));
  updateRateLimitFromResponse(response, body);

  if (attempt >= MAX_RETRIES) {
    return cloneJsonResponse(response, body);
  }

  const waitMs = Math.max(q.rateLimit.retryAfterMs || 0, COMMAND_INTERVAL_MS);
  q.rateLimit.remaining = 0;
  q.rateLimit.resetAt = Date.now() + waitMs;
  await sleep(waitMs + 250);
  return executeCommand(command, erlcKey, attempt + 1);
}

async function drainQueue() {
  const q = getQueue();
  if (q.running) return;
  q.running = true;

  while (q.queue.length > 0) {
    const item = q.queue.shift();
    if (!item) continue;

    try {
      const response = await executeCommand(item.command, item.erlcKey);
      item.resolve(response);
    } catch (error) {
      item.reject(error);
    }
  }

  q.running = false;
}

export function enqueueErlcCommand(command, erlcKey) {
  const q = getQueue();
  return new Promise((resolve, reject) => {
    q.queue.push({ command, erlcKey, resolve, reject });
    drainQueue();
  });
}

export function getErlcCommandQueueState() {
  const q = getQueue();
  const queueSize = q.queue.length;
  return {
    queueSize,
    rateLimit: { ...q.rateLimit },
    waitMs: Math.max(
      0,
      queueSize * COMMAND_INTERVAL_MS + Math.max(0, COMMAND_INTERVAL_MS - (Date.now() - q.lastSentAt))
    ),
  };
}

