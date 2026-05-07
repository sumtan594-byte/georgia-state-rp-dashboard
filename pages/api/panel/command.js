import { getServerSession } from 'next-auth';
import { authOptions } from "../../../lib/auth-options";
import { ROLES, hasRole, isAdmin } from '../../../lib/auth';

// ─── Blocked commands ─────────────────────────────────────────────────────────
const BLOCKED_COMMANDS = [':shutdown', ':ban', ':admin', ':mod', ':unadmin', ':unmod'];

function isBlocked(command) {
  if (!command || typeof command !== 'string') return true;
  const first = command.trim().toLowerCase().split(/\s+/)[0];
  return BLOCKED_COMMANDS.includes(first);
}

const CMD_INTERVAL_MS = 5500;

globalThis.__gsrpCmdQueue ??= {
  lastSentAt: 0,
  queue: [],
  running: false,
};

function getQueue() { return globalThis.__gsrpCmdQueue; }

function enqueueCommand(command, erlcKey) {
  const q = getQueue();
  return new Promise((resolve, reject) => {
    q.queue.push({ command, erlcKey, resolve, reject });
    if (!q.running) drainQueue();
  });
}

async function drainQueue() {
  const q = getQueue();
  if (q.running || q.queue.length === 0) return;
  q.running = true;

  while (q.queue.length > 0) {
    const now  = Date.now();
    const wait = CMD_INTERVAL_MS - (now - q.lastSentAt);
    if (wait > 0) await sleep(wait);

    const item = q.queue.shift();
    if (!item) break;

    try {
      const erlcRes = await fetch('https://api.erlc.gg/v2/server/command', {
        method: 'POST',
        headers: {
          'server-key': item.erlcKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command: item.command }),
      });

      q.lastSentAt = Date.now();

      if (erlcRes.status === 429) {
        const body       = await erlcRes.json().catch(() => ({}));
        const retryAfter = parseFloat(body.retry_after ?? 5) * 1000;
        await sleep(retryAfter + 500);

        const retryRes = await fetch('https://api.erlc.gg/v2/server/command', {
          method: 'POST',
          headers: {
            'server-key': item.erlcKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ command: item.command }),
        });
        q.lastSentAt = Date.now();
        item.resolve(retryRes);
      } else {
        item.resolve(erlcRes);
      }
    } catch (err) {
      item.reject(err);
    }
  }

  q.running = false;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not logged in' });
  if (!hasRole(session, ROLES.PANEL) && !isAdmin(session)) {
    return res.status(403).json({ error: 'Missing required Discord role' });
  }

  const ERLC_KEY = process.env.ERLC_API_KEY;
  if (!ERLC_KEY) {
    return res.status(500).json({ error: 'Missing ERLC_API_KEY env var' });
  }

  let command;
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    command = body?.command;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  if (!command || typeof command !== 'string' || !command.trim()) {
    return res.status(400).json({ error: 'command is required', code: 3001 });
  }

  const cmd = command.trim();

  if (isBlocked(cmd)) {
    return res.status(403).json({
      error: 'This command is restricted and cannot be executed via the panel.',
      code: 4002,
    });
  }

  const q         = getQueue();
  const queueSize = q.queue.length;
  const msUntilRun = Math.max(
    0,
    queueSize * CMD_INTERVAL_MS + Math.max(0, CMD_INTERVAL_MS - (Date.now() - q.lastSentAt))
  );
  if (msUntilRun > 0) {
    res.setHeader('X-Queue-Wait-Ms', String(Math.round(msUntilRun)));
  }

  try {
    const erlcRes = await enqueueCommand(cmd, ERLC_KEY);

    for (const h of ['X-RateLimit-Limit','X-RateLimit-Remaining','X-RateLimit-Reset','X-RateLimit-Bucket']) {
      const v = erlcRes.headers.get(h);
      if (v) res.setHeader(h, v);
    }

    if (erlcRes.status === 204) return res.status(204).end();

    if (erlcRes.status === 429) {
      const body = await erlcRes.json().catch(() => ({}));
      return res.status(429).json({ error: 'Rate limited by PRC — queued retry failed', ...body });
    }

    if (erlcRes.status === 422) {
      return res.status(422).json({ error: 'Server has no players in it', code: 3002 });
    }

    if (erlcRes.status === 403) {
      return res.status(403).json({ error: 'Unauthorized — check your ERLC_API_KEY', code: 2002 });
    }

    const text = await erlcRes.text().catch(() => '');
    let body = {};
    try { body = JSON.parse(text); } catch {}
    return res.status(erlcRes.status).json({ error: body?.message || `ERLC error ${erlcRes.status}`, ...body });

  } catch (err) {
    console.error('[GSRP] command proxy error:', err);
    return res.status(500).json({ error: 'Failed to reach ERLC API', detail: err.message });
  }
}
