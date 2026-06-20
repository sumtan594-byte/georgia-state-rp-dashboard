import { getPool } from './appdb';

const globalForLinkedRobloxUser = globalThis;
const usernameCache = globalForLinkedRobloxUser.__linkedRobloxUsernameCache || new Map();
const usernameInFlight = globalForLinkedRobloxUser.__linkedRobloxUsernameInFlight || new Map();
globalForLinkedRobloxUser.__linkedRobloxUsernameCache = usernameCache;
globalForLinkedRobloxUser.__linkedRobloxUsernameInFlight = usernameInFlight;

const USERNAME_CACHE_TTL_MS = 15000;

export async function getLinkedRobloxUsername(discordId) {
  const cacheKey = String(discordId || '');
  const cached = usernameCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.username;
  }

  const pending = usernameInFlight.get(cacheKey);
  if (pending) {
    return pending;
  }

  const lookup = getLinkedRobloxUsernameFromDb(cacheKey);
  usernameInFlight.set(cacheKey, lookup);

  try {
    const username = await lookup;
    usernameCache.set(cacheKey, {
      username,
      expiresAt: Date.now() + USERNAME_CACHE_TTL_MS,
    });
    return username;
  } finally {
    usernameInFlight.delete(cacheKey);
  }
}

async function getLinkedRobloxUsernameFromDb(discordId) {
  const pool = getPool();
  if (!pool) {
    throw new Error('Database connection is not configured.');
  }

  const [rows] = await pool.query(
    'SELECT username FROM usernames WHERE discord_id = ? LIMIT 1',
    [discordId]
  );

  const username = rows?.[0]?.username?.trim();
  return username || null;
}

export async function deleteLinkedRobloxUser(discordId) {
  const pool = getPool();
  if (!pool) {
    throw new Error('Database connection is not configured.');
  }

  const [result] = await pool.query(
    'DELETE FROM usernames WHERE discord_id = ?',
    [discordId]
  );

  usernameCache.delete(String(discordId || ''));
  usernameInFlight.delete(String(discordId || ''));

  return result.affectedRows > 0;
}

export async function getLinkedRobloxUser(discordId) {
  const robloxUsername = await getLinkedRobloxUsername(discordId);

  if (!robloxUsername) {
    return { linked: false };
  }
  const robloxIdResponse = await fetch('https://users.roblox.com/v1/usernames/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usernames: [robloxUsername], excludeBannedUsers: false }),
  });

  if (!robloxIdResponse.ok) {
    throw new Error(`Failed to resolve Roblox username: ${robloxIdResponse.status}`);
  }

  const robloxIdData = await robloxIdResponse.json();
  const robloxUser = robloxIdData.data?.[0];

  if (!robloxUser) {
    return { linked: true, robloxUsername, error: 'Could not find Roblox ID' };
  }

  return {
    linked: true,
    roblox: {
      id: robloxUser.id,
      username: robloxUser.name,
      displayName: robloxUser.displayName,
    },
  };
}
