import { getPool } from './appdb';

export async function getLinkedRobloxUsername(discordId) {
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
