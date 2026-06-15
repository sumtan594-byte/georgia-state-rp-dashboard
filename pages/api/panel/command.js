import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth-options';
import { ROLES } from '../../../lib/auth';
import { requireAccess } from '../../../lib/access-check';
import { logCommand } from '../../../lib/command-history';
import { enqueueErlcCommand, getErlcCommandQueueState } from '../../../lib/erlc-command-queue';

const NKZ_ROLE_ID = '1372468936867708988';

// ─── Blocked commands ─────────────────────────────────────────────────────────
const BLOCKED_COMMANDS = [':shutdown', ':ban', ':admin', ':mod', ':unadmin', ':unmod'];

// Commands restricted to NKZ role only
const NKZ_COMMANDS = [':tp', ':bring', ':kick', ':ban', ':unban', ':admin', ':unadmin', ':mod', ':unmod', ':jail', ':kill', ':down', ':refresh', ':respawn', ':load', ':weather']; 

function isBlocked(command) {
  if (!command || typeof command !== 'string') return true;
  const first = command.trim().toLowerCase().split(/\s+/)[0];
  return BLOCKED_COMMANDS.includes(first);
}

const ROBLOX_USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;
const MAX_COMMAND_LENGTH = 180;

function isSafeCommand(command) {
  if (!command || typeof command !== 'string') return false;
  if (command.length > MAX_COMMAND_LENGTH) return false;
  if ([...command].some(char => {
    const code = char.charCodeAt(0);
    return code === 127 || code < 32;
  })) return false;
  const parts = command.trim().split(/\s+/);
  if (!parts[0]?.startsWith(':')) return false;
  const primary = parts[0].toLowerCase();
  if ([':tp', ':bring', ':to', ':kick', ':ban', ':unban', ':jail', ':kill', ':down', ':refresh', ':respawn', ':load'].includes(primary)) {
    return parts.slice(1, 3).every(value => !value || ROBLOX_USERNAME_RE.test(value) || /^\d{2,20}$/.test(value));
  }
  return true;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not logged in' });
  const panelAccess = await requireAccess(session, ROLES.PANEL);
  if (!panelAccess.allowed) {
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

  if (!isSafeCommand(cmd)) {
    return res.status(400).json({ error: 'Command contains invalid or unsafe input', code: 3003 });
  }

  if (isBlocked(cmd)) {
    return res.status(403).json({
      error: 'This command is restricted and cannot be executed via the panel.',
      code: 4002,
    });
  }

  const cmdPrefix = cmd.split(/\s+/)[0].toLowerCase();
  if (NKZ_COMMANDS.includes(cmdPrefix)) {
    const nkzAccess = await requireAccess(session, NKZ_ROLE_ID);
    if (!nkzAccess.allowed) {
      return res.status(403).json({
        error: 'This command requires NKZ administrator privileges.',
        code: 4002,
      });
    }
  }

  const queueState = getErlcCommandQueueState();
  if (queueState.waitMs > 0) {
    res.setHeader('X-Queue-Wait-Ms', String(Math.round(queueState.waitMs)));
  }

  try {
    const erlcRes = await enqueueErlcCommand(cmd, ERLC_KEY);

    for (const h of ['X-RateLimit-Limit','X-RateLimit-Remaining','X-RateLimit-Reset','X-RateLimit-Bucket']) {
      const v = erlcRes.headers.get(h);
      if (v) res.setHeader(h, v);
    }

    if (erlcRes.status === 204) {
      logCommand({
        command: cmd,
        userId: session.user.id,
        username: session.user.name,
        success: true,
        response: 'No content',
      });
      return res.status(204).end();
    }

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

    logCommand({
      command: cmd,
      userId: session.user.id,
      username: session.user.name,
      success: erlcRes.ok,
      response: body?.message || text || null,
    });

    return res.status(erlcRes.status).json({ error: body?.message || `ERLC error ${erlcRes.status}`, ...body });

  } catch (err) {
    console.error('[GSRP] command proxy error:', err);

    logCommand({
      command: cmd,
      userId: session.user.id,
      username: session.user.name,
      success: false,
      response: err.message,
    });

    return res.status(500).json({ error: 'Failed to reach ERLC API' });
  }
}
