import getPool from './appdb';

const PRUNE_MS = 60 * 1000;

let initialized = false;
let lastPrune = 0;

function parseName(raw) {
  if (!raw) return { name: 'Unknown', id: '' };
  const ci = String(raw).lastIndexOf(':');
  if (ci === -1) return { name: String(raw), id: String(raw) };
  return { name: String(raw).slice(0, ci), id: String(raw).slice(ci + 1) };
}

function stableKey(prefix, value) {
  return `${prefix}:${Buffer.from(JSON.stringify(value || {})).toString('base64').slice(0, 180)}`;
}

function apiTimestampMs(log) {
  const raw = firstValue(log, ['Timestamp', 'Time', 'Date']);
  const numeric = Number(raw);
  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric < 10_000_000_000 ? numeric * 1000 : numeric;
  }
  return Date.now();
}

function firstValue(obj, keys) {
  for (const key of keys) {
    if (obj?.[key] != null && obj[key] !== '') return obj[key];
  }
  return '';
}

function parseJsonValue(value) {
  if (!value || typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function normalizeKill(log) {
  const killerRaw = firstValue(log, ['Killer', 'KillerPlayer', 'KillerName', 'Player', 'From', 'Attacker']);
  const victimRaw = firstValue(log, ['Killed', 'Victim', 'VictimPlayer', 'VictimName', 'Target', 'To']);
  const killer = parseName(killerRaw);
  const victim = parseName(victimRaw);
  if (!killer.id && !killer.name) return null;
  if (!victim.id && !victim.name) return null;
  return {
    eventKey: stableKey('kill', {
      killer: killerRaw,
      victim: victimRaw,
      weapon: firstValue(log, ['Weapon', 'Tool', 'Cause']),
      time: firstValue(log, ['Timestamp', 'Time', 'Date']) || log,
    }),
    killer,
    victim,
    summary: `Killed ${victim.name}`,
    payload: log,
  };
}

function findPlayerByParsed(current, parsed) {
  if (parsed.id && current.has(parsed.id)) return { id: parsed.id, record: current.get(parsed.id) };
  const wanted = String(parsed.name || parsed.id || '').toLowerCase();
  if (!wanted) return { id: parsed.id, record: null };
  for (const [id, record] of current.entries()) {
    if (String(record.name || '').toLowerCase() === wanted) return { id, record };
  }
  return { id: parsed.id, record: null };
}

function normalizeCommand(log) {
  const actorRaw = firstValue(log, ['Player', 'PlayerName', 'Executor', 'User', 'Username']);
  const actor = parseName(actorRaw);
  const command = firstValue(log, ['Command', 'command', 'Message']);
  if (!actor.id && !actor.name) return null;
  if (!command) return null;
  return {
    eventKey: stableKey('command', {
      actor: actorRaw,
      command,
      time: firstValue(log, ['Timestamp', 'Time', 'Date']) || log,
    }),
    actor,
    summary: command,
    payload: log,
  };
}

function findMentionedPlayer(current, command, actorId) {
  const text = String(command || '').toLowerCase();
  if (!text) return { id: null, record: null };
  for (const [id, record] of current.entries()) {
    if (String(id) === String(actorId)) continue;
    const name = String(record.name || '').toLowerCase();
    if (name && text.includes(name)) return { id, record };
  }
  return { id: null, record: null };
}

async function ensureTables(pool) {
  if (initialized || !pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS panel_player_snapshots (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      player_id VARCHAR(64) NOT NULL,
      player_name VARCHAR(128) NOT NULL,
      sampled_at DATETIME(3) NOT NULL,
      team VARCHAR(64) NULL,
      callsign VARCHAR(64) NULL,
      permission_name VARCHAR(128) NULL,
      wanted_stars INT NULL,
      location_json JSON NULL,
      player_json JSON NOT NULL,
      avatar_url MEDIUMTEXT NULL,
      INDEX idx_panel_snap_player_time (player_id, sampled_at),
      INDEX idx_panel_snap_time (sampled_at)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS panel_player_events (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      event_key VARCHAR(255) NOT NULL,
      player_id VARCHAR(64) NOT NULL,
      player_name VARCHAR(128) NOT NULL,
      related_player_id VARCHAR(64) NULL,
      related_player_name VARCHAR(128) NULL,
      event_type VARCHAR(48) NOT NULL,
      event_at DATETIME(3) NOT NULL,
      summary VARCHAR(255) NOT NULL,
      payload_json JSON NULL,
      UNIQUE KEY unique_panel_event (event_key),
      INDEX idx_panel_event_player_time (player_id, event_at),
      INDEX idx_panel_event_time (event_at)
    )
  `);
  initialized = true;
}

async function pruneOld(pool) {
  const now = Date.now();
  if (now - lastPrune < PRUNE_MS) return;
  lastPrune = now;
  await pool.query('DELETE FROM panel_player_snapshots WHERE sampled_at < (NOW(3) - INTERVAL 6 MINUTE)');
  await pool.query('DELETE FROM panel_player_events WHERE event_at < (NOW(3) - INTERVAL 6 MINUTE)');
}

async function insertEvent(pool, event) {
  await pool.query(`
    INSERT IGNORE INTO panel_player_events
      (event_key, player_id, player_name, related_player_id, related_player_name, event_type, event_at, summary, payload_json)
    VALUES (?, ?, ?, ?, ?, ?, FROM_UNIXTIME(? / 1000), ?, ?)
  `, [
    event.eventKey,
    event.playerId,
    event.playerName,
    event.relatedPlayerId || null,
    event.relatedPlayerName || null,
    event.type,
    event.eventAt || Date.now(),
    event.summary,
    JSON.stringify(event.payload || {}),
  ]);
}

export async function recordPanelFrame(cache, data) {
  const pool = getPool();
  const mapEvents = [];
  if (!pool || !data) return mapEvents;

  try {
    await ensureTables(pool);
    await pruneOld(pool);

    const players = Array.isArray(data.Players) ? data.Players : [];
    const previous = cache.lastReplayPlayers || new Map();
    const current = new Map();

    for (const player of players) {
      const parsed = parseName(player.Player);
      if (!parsed.id) continue;
      current.set(parsed.id, {
        name: parsed.name,
        team: player.Team || '',
        player,
      });
      await pool.query(`
        INSERT INTO panel_player_snapshots
          (player_id, player_name, sampled_at, team, callsign, permission_name, wanted_stars, location_json, player_json, avatar_url)
        VALUES (?, ?, NOW(3), ?, ?, ?, ?, ?, ?, ?)
      `, [
        parsed.id,
        parsed.name,
        player.Team || null,
        player.Callsign || null,
        player.Permission || null,
        player.WantedStars || 0,
        JSON.stringify(player.Location || null),
        JSON.stringify(player),
        player.AvatarUrl || null,
      ]);

      const old = previous.get(parsed.id);
      if (old && old.team !== (player.Team || '')) {
        await insertEvent(pool, {
          eventKey: stableKey('team', { id: parsed.id, from: old.team, to: player.Team, sampledAt: Math.floor(Date.now() / 5000) }),
          playerId: parsed.id,
          playerName: parsed.name,
          type: 'team_change',
          eventAt: Date.now(),
          summary: `Switched from ${old.team || 'Unknown'} to ${player.Team || 'Unknown'}`,
          payload: { from: old.team || null, to: player.Team || null },
        });
      }
    }

    for (const [id, old] of previous.entries()) {
      if (!current.has(id)) {
        await insertEvent(pool, {
          eventKey: stableKey('leave', { id, sampledAt: Math.floor(Date.now() / 5000) }),
          playerId: id,
          playerName: old.name,
          type: 'leave',
          eventAt: Date.now(),
          summary: 'Left the server',
          payload: old.player,
        });
      }
    }

    for (const [id, currentPlayer] of current.entries()) {
      if (!previous.has(id)) {
        await insertEvent(pool, {
          eventKey: stableKey('join', { id, sampledAt: Math.floor(Date.now() / 5000) }),
          playerId: id,
          playerName: currentPlayer.name,
          type: 'join',
          eventAt: Date.now(),
          summary: 'Joined the server',
          payload: currentPlayer.player,
        });
      }
    }

    cache.lastReplayPlayers = current;

    for (const rawKill of data.KillLogs || []) {
      const kill = normalizeKill(rawKill);
      if (!kill) continue;
      const killerMatch = findPlayerByParsed(current, kill.killer);
      const victimMatch = findPlayerByParsed(current, kill.victim);
      const killerId = killerMatch.id || kill.killer.id || kill.killer.name;
      const victimId = victimMatch.id || kill.victim.id || kill.victim.name;
      const killerPlayer = killerMatch.record;
      const victimPlayer = victimMatch.record;
      const event = {
        eventKey: kill.eventKey,
        playerId: killerId,
        playerName: killerPlayer?.name || kill.killer.name,
        relatedPlayerId: victimId,
        relatedPlayerName: victimPlayer?.name || kill.victim.name,
        type: 'kill',
        eventAt: apiTimestampMs(kill.payload),
        summary: kill.summary,
        payload: kill.payload,
      };
      await insertEvent(pool, event);
      if (!cache.seenMapEvents) cache.seenMapEvents = new Set();
      if (!cache.seenMapEvents.has(kill.eventKey)) {
        cache.seenMapEvents.add(kill.eventKey);
        mapEvents.push({
          id: kill.eventKey,
          type: 'kill',
          killerId,
          killerName: killerPlayer?.name || kill.killer.name,
          victimId,
          victimName: victimPlayer?.name || kill.victim.name,
          killerLocation: killerPlayer?.player?.Location || null,
          victimLocation: victimPlayer?.player?.Location || null,
          at: apiTimestampMs(kill.payload),
        });
      }
      if (cache.seenMapEvents.size > 500) {
        cache.seenMapEvents = new Set([...cache.seenMapEvents].slice(-250));
      }
    }

    for (const rawCommand of data.CommandLogs || []) {
      const command = normalizeCommand(rawCommand);
      if (!command) continue;
      const actorMatch = findPlayerByParsed(current, command.actor);
      const actorId = actorMatch.id || command.actor.id || command.actor.name;
      const mentioned = findMentionedPlayer(current, command.summary, actorId);
      await insertEvent(pool, {
        eventKey: command.eventKey,
        playerId: actorId,
        playerName: actorMatch.record?.name || command.actor.name,
        relatedPlayerId: mentioned.id,
        relatedPlayerName: mentioned.record?.name,
        type: 'command',
        eventAt: apiTimestampMs(command.payload),
        summary: command.summary,
        payload: command.payload,
      });
    }
  } catch (error) {
    console.error('[Panel Replay] Store error:', error.message);
  }

  return mapEvents;
}

export async function fetchPlayerReplay(playerId) {
  const pool = getPool();
  if (!pool) return { snapshots: [], events: [] };
  await ensureTables(pool);
  const [events] = await pool.query(`
    SELECT event_key, player_id, player_name, related_player_id, related_player_name,
           event_type, event_at, summary, payload_json
    FROM panel_player_events
    WHERE (player_id = ? OR related_player_id = ?) AND event_at >= (NOW(3) - INTERVAL 5 MINUTE)
    ORDER BY event_at ASC
  `, [playerId, playerId]);
  const participantIds = new Set([playerId]);
  for (const row of events) {
    if (row.player_id) participantIds.add(String(row.player_id));
    if (row.related_player_id) participantIds.add(String(row.related_player_id));
  }
  const ids = [...participantIds].filter(Boolean);
  const placeholders = ids.map(() => '?').join(',');
  const [snapshots] = ids.length > 0 ? await pool.query(`
    SELECT player_id, player_name, sampled_at, team, callsign, permission_name, wanted_stars,
           location_json, player_json, avatar_url
    FROM panel_player_snapshots
    WHERE player_id IN (${placeholders}) AND sampled_at >= (NOW(3) - INTERVAL 5 MINUTE)
    ORDER BY sampled_at ASC
  `, ids) : [[]];

  const mappedSnapshots = snapshots.map(row => ({
    playerId: row.player_id,
    playerName: row.player_name,
    sampledAt: row.sampled_at,
    team: row.team,
    callsign: row.callsign,
    permission: row.permission_name,
    wantedStars: row.wanted_stars,
    location: parseJsonValue(row.location_json),
    player: parseJsonValue(row.player_json),
    avatarUrl: row.avatar_url,
  }));

  return {
    subjectId: playerId,
    participants: ids,
    snapshots: mappedSnapshots.filter(snapshot => String(snapshot.playerId) === String(playerId)),
    snapshotsByPlayer: mappedSnapshots.reduce((acc, snapshot) => {
      const id = String(snapshot.playerId);
      if (!acc[id]) acc[id] = [];
      acc[id].push(snapshot);
      return acc;
    }, {}),
    events: events.map(row => ({
      id: row.event_key,
      playerId: row.player_id,
      playerName: row.player_name,
      relatedPlayerId: row.related_player_id,
      relatedPlayerName: row.related_player_name,
      type: row.event_type,
      at: row.event_at,
      summary: row.summary,
      payload: parseJsonValue(row.payload_json),
    })),
  };
}
