import mysql from 'mysql2/promise';
import { mergeShiftConfig, STAFF_SHIFT_DEFAULTS } from './staff-shift-config';

const CONFIG_KEY = 'default';
const globalForStaffDb = globalThis;
let pool = globalForStaffDb.__staffShiftMysqlPool || null;
const initialized = globalForStaffDb.__staffShiftMysqlInit || { promise: null, done: false };
globalForStaffDb.__staffShiftMysqlInit = initialized;

function getEnv(...names) {
  for (const name of names) {
    if (name && process.env[name]) return process.env[name];
  }
  return null;
}

function getStaffDbConfig() {
  const host = getEnv('STAFF_DB_HOST', 'SESSIONS_DB_HOST', 'DB_HOST');
  const user = getEnv('STAFF_DB_USER', 'SESSIONS_DB_USER', 'DB_USER');
  const password = getEnv('STAFF_DB_PASSWORD', 'SESSIONS_DB_PASSWORD', 'DB_PASSWORD');
  const database = getEnv('STAFF_DB_NAME', 'SESSIONS_DB_NAME', 'DB_NAME');
  const port = Number(getEnv('STAFF_DB_PORT', 'SESSIONS_DB_PORT', 'DB_PORT') || 3306);

  if (!host || !user || !password || !database) {
    throw new Error('[StaffShiftDB] Missing staff DB env vars. Set STAFF_DB_*, SESSIONS_DB_*, or DB_* credentials.');
  }

  return {
    host,
    user,
    password,
    database,
    port,
    waitForConnections: true,
    connectionLimit: Number(process.env.STAFF_DB_CONNECTION_LIMIT || 10),
    queueLimit: Number(process.env.STAFF_DB_QUEUE_LIMIT || 0),
    connectTimeout: Number(process.env.STAFF_DB_CONNECT_TIMEOUT_MS || 10000),
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    dateStrings: false,
    charset: 'utf8mb4',
  };
}

function getStaffDbPool() {
  if (pool) return pool;
  pool = mysql.createPool(getStaffDbConfig());
  globalForStaffDb.__staffShiftMysqlPool = pool;
  return pool;
}

async function query(sql, params = []) {
  const [rows] = await getStaffDbPool().query(sql, params);
  return rows;
}

async function checkStaffShiftDatabase({ logPrefix = '[StaffShiftDB]' } = {}) {
  const startedAt = Date.now();
  try {
    const config = getStaffDbConfig();
    console.log(`${logPrefix} Startup check: user=${config.user}, host=${config.host}:${config.port}, database=${config.database}`);
    const rows = await query('SELECT 1 AS ok');
    await ensureStaffShiftTables();
    console.log(`${logPrefix} Startup check: connected in ${Date.now() - startedAt}ms`, rows[0] || '');
    return { ok: true, elapsedMs: Date.now() - startedAt };
  } catch (error) {
    console.error(`${logPrefix} Startup check failed:`, error.code || error.message);
    return { ok: false, elapsedMs: Date.now() - startedAt, code: error.code || null, message: error.message || String(error) };
  }
}

function jsDate(value = new Date()) {
  return value instanceof Date ? value : new Date(value);
}

function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function minutesBetween(start, end = new Date()) {
  if (!start) return 0;
  return Math.max(0, Math.floor((jsDate(end).getTime() - jsDate(start).getTime()) / 60000));
}

function shiftWorkedMinutes(shift, now = new Date()) {
  if (!shift) return 0;
  const end = shift.ended_at || now;
  const total = minutesBetween(shift.started_at, end);
  return Math.max(0, total - Number(shift.break_minutes || 0));
}

function getWaveBounds(config, now = new Date()) {
  const anchorMs = new Date(config.waveAnchor).getTime();
  const durationMs = Number(config.waveDurationDays || 7) * 24 * 60 * 60 * 1000;
  const waveIndex = Math.max(0, Math.floor((now.getTime() - anchorMs) / durationMs));
  return {
    number: waveIndex + 1,
    startsAt: new Date(anchorMs + waveIndex * durationMs),
    endsAt: new Date(anchorMs + (waveIndex + 1) * durationMs),
  };
}

async function ensureStaffShiftTables() {
  if (initialized.done) return;
  if (initialized.promise) return initialized.promise;

  initialized.promise = (async () => {
    await query(`
      CREATE TABLE IF NOT EXISTS staff_shift_config (
        config_key VARCHAR(64) PRIMARY KEY,
        config_json JSON NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS staff_shifts (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        wave_number INT NOT NULL,
        discord_id VARCHAR(32) NOT NULL,
        discord_name VARCHAR(255),
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP NULL,
        break_started_at TIMESTAMP NULL,
        break_minutes INT DEFAULT 0 NOT NULL,
        status ENUM('active','break','ended','force_ended') DEFAULT 'active' NOT NULL,
        ended_by VARCHAR(32),
        end_reason VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_staff_shifts_user_wave (discord_id, wave_number),
        INDEX idx_staff_shifts_status (status),
        INDEX idx_staff_shifts_started (started_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS staff_shift_breaks (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        shift_id BIGINT UNSIGNED NOT NULL,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP NULL,
        duration_minutes INT DEFAULT 0 NOT NULL,
        ended_by VARCHAR(32),
        INDEX idx_staff_breaks_shift (shift_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS staff_shift_adjustments (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        wave_number INT NOT NULL,
        discord_id VARCHAR(32) NOT NULL,
        shift_id BIGINT UNSIGNED NULL,
        minutes_delta INT NOT NULL,
        reason VARCHAR(500),
        actor_id VARCHAR(32) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_staff_adj_user_wave (discord_id, wave_number),
        INDEX idx_staff_adj_shift (shift_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS staff_player_logs (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        wave_number INT NOT NULL,
        staff_discord_id VARCHAR(32) NOT NULL,
        staff_name VARCHAR(255),
        roblox_user_id VARCHAR(32),
        roblox_username VARCHAR(255) NOT NULL,
        action ENUM('warn','kick','ban','bolo','custom') NOT NULL,
        reason VARCHAR(1000) NOT NULL,
        source ENUM('website','discord') DEFAULT 'website' NOT NULL,
        is_in_game TINYINT(1) DEFAULT 0 NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_staff_logs_created (created_at),
        INDEX idx_staff_logs_target (roblox_username),
        INDEX idx_staff_logs_staff (staff_discord_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS staff_quota_archives (
        wave_number INT PRIMARY KEY,
        started_at TIMESTAMP NOT NULL,
        ended_at TIMESTAMP NOT NULL,
        archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        archive_json JSON NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await query(
      `INSERT IGNORE INTO staff_shift_config (config_key, config_json) VALUES (?, ?)`,
      [CONFIG_KEY, JSON.stringify(STAFF_SHIFT_DEFAULTS)]
    );
    initialized.done = true;
  })().finally(() => {
    initialized.promise = null;
  });

  return initialized.promise;
}

async function getStaffShiftConfig() {
  await ensureStaffShiftTables();
  const rows = await query('SELECT config_json FROM staff_shift_config WHERE config_key = ?', [CONFIG_KEY]);
  return mergeShiftConfig(parseJson(rows[0]?.config_json, {}));
}

async function updateStaffShiftConfig(nextConfig) {
  await ensureStaffShiftTables();
  const merged = mergeShiftConfig(nextConfig || {});
  await query('UPDATE staff_shift_config SET config_json = ? WHERE config_key = ?', [JSON.stringify(merged), CONFIG_KEY]);
  return merged;
}

async function getCurrentWave(config) {
  const resolved = config || await getStaffShiftConfig();
  return getWaveBounds(resolved);
}

async function getMaxShiftWave() {
  const rows = await query('SELECT MAX(wave_number) AS max_wave FROM staff_shifts');
  return Number(rows[0]?.max_wave || 0);
}

async function archiveFinishedWaves() {
  await ensureStaffShiftTables();
  const config = await getStaffShiftConfig();
  const currentWave = getWaveBounds(config);
  const maxWave = await getMaxShiftWave();

  for (let waveNumber = 1; waveNumber < currentWave.number && waveNumber <= maxWave; waveNumber++) {
    const existing = await query('SELECT wave_number FROM staff_quota_archives WHERE wave_number = ?', [waveNumber]);
    if (existing.length) continue;

    const anchorMs = new Date(config.waveAnchor).getTime();
    const durationMs = Number(config.waveDurationDays || 7) * 24 * 60 * 60 * 1000;
    const startedAt = new Date(anchorMs + (waveNumber - 1) * durationMs);
    const endedAt = new Date(anchorMs + waveNumber * durationMs);
    const leaderboard = await getLeaderboard({ waveNumber, limit: 500, includeActive: false });
    await query(
      'INSERT INTO staff_quota_archives (wave_number, started_at, ended_at, archive_json) VALUES (?, ?, ?, ?)',
      [waveNumber, startedAt, endedAt, JSON.stringify({ waveNumber, startedAt, endedAt, leaderboard })]
    );
  }
}

async function getActiveShift(discordId) {
  await ensureStaffShiftTables();
  const rows = await query(
    `SELECT * FROM staff_shifts WHERE discord_id = ? AND status IN ('active', 'break') ORDER BY started_at DESC LIMIT 1`,
    [discordId]
  );
  return rows[0] || null;
}

async function getShiftById(id) {
  const rows = await query('SELECT * FROM staff_shifts WHERE id = ?', [id]);
  return rows[0] || null;
}

async function startShift({ discordId, discordName }) {
  await archiveFinishedWaves();
  const active = await getActiveShift(discordId);
  if (active) return active;

  const wave = await getCurrentWave();
  const result = await query(
    `INSERT INTO staff_shifts (wave_number, discord_id, discord_name, started_at, status) VALUES (?, ?, ?, NOW(), 'active')`,
    [wave.number, discordId, discordName]
  );
  return getShiftById(result.insertId);
}

async function endShift({ discordId, actorId, force = false, reason = null }) {
  await ensureStaffShiftTables();
  const active = await getActiveShift(discordId);
  if (!active) return null;

  let breakMinutes = Number(active.break_minutes || 0);
  if (active.status === 'break' && active.break_started_at) {
    const extra = minutesBetween(active.break_started_at);
    breakMinutes += extra;
    await query(
      `UPDATE staff_shift_breaks SET ended_at = NOW(), duration_minutes = ?, ended_by = ? WHERE shift_id = ? AND ended_at IS NULL`,
      [extra, actorId, active.id]
    );
  }

  await query(
    `UPDATE staff_shifts
     SET ended_at = NOW(), status = ?, break_started_at = NULL, break_minutes = ?, ended_by = ?, end_reason = ?, updated_at = NOW()
     WHERE id = ?`,
    [force ? 'force_ended' : 'ended', breakMinutes, actorId, reason, active.id]
  );
  return getShiftById(active.id);
}

async function startBreak({ discordId }) {
  await ensureStaffShiftTables();
  const active = await getActiveShift(discordId);
  if (!active || active.status !== 'active') return active;

  await query(`UPDATE staff_shifts SET status = 'break', break_started_at = NOW(), updated_at = NOW() WHERE id = ?`, [active.id]);
  await query('INSERT INTO staff_shift_breaks (shift_id, started_at) VALUES (?, NOW())', [active.id]);
  return getActiveShift(discordId);
}

async function endBreak({ discordId, actorId }) {
  await ensureStaffShiftTables();
  const active = await getActiveShift(discordId);
  if (!active || active.status !== 'break') return active;
  const extra = minutesBetween(active.break_started_at);

  await query(
    `UPDATE staff_shifts SET status = 'active', break_started_at = NULL, break_minutes = break_minutes + ?, updated_at = NOW() WHERE id = ?`,
    [extra, active.id]
  );
  await query(
    `UPDATE staff_shift_breaks SET ended_at = NOW(), duration_minutes = ?, ended_by = ? WHERE shift_id = ? AND ended_at IS NULL`,
    [extra, actorId, active.id]
  );
  return getActiveShift(discordId);
}

async function deleteExpiredInGameLogs(config) {
  await query(
    `DELETE FROM staff_player_logs WHERE is_in_game = 1 AND created_at < DATE_SUB(NOW(), INTERVAL ? MONTH)`,
    [Number(config.inGameLogRetentionMonths || 2)]
  );
}

async function addStaffLog({ staffDiscordId, staffName, robloxUserId, robloxUsername, action, reason, source = 'website', isInGame = false }) {
  await archiveFinishedWaves();
  const config = await getStaffShiftConfig();
  await deleteExpiredInGameLogs(config);
  const wave = getWaveBounds(config);

  const result = await query(
    `INSERT INTO staff_player_logs
      (wave_number, staff_discord_id, staff_name, roblox_user_id, roblox_username, action, reason, source, is_in_game)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [wave.number, staffDiscordId, staffName, robloxUserId || null, robloxUsername, action, reason, source, isInGame ? 1 : 0]
  );
  return (await query('SELECT * FROM staff_player_logs WHERE id = ?', [result.insertId]))[0] || null;
}

async function getRecentStaffLogs({ minutes = 60, limit = 80, query: search = null } = {}) {
  await ensureStaffShiftTables();
  const params = [Number(minutes || 60)];
  let where = 'created_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)';
  if (search) {
    where += ' AND (LOWER(roblox_username) LIKE ? OR LOWER(staff_name) LIKE ? OR staff_discord_id = ?)';
    params.push(`%${String(search).toLowerCase()}%`, `%${String(search).toLowerCase()}%`, String(search));
  }
  params.push(Number(limit || 80));
  return query(`SELECT * FROM staff_player_logs WHERE ${where} ORDER BY created_at DESC LIMIT ?`, params);
}

async function getAllActiveShifts() {
  await ensureStaffShiftTables();
  const rows = await query(`SELECT * FROM staff_shifts WHERE status IN ('active', 'break') ORDER BY started_at ASC`);
  return rows.map(row => ({ ...row, workedMinutes: shiftWorkedMinutes(row), onBreak: row.status === 'break' }));
}

async function getUserShiftSummary(discordId, waveNumber = null) {
  await ensureStaffShiftTables();
  const wave = waveNumber || (await getCurrentWave()).number;
  const shifts = await query('SELECT * FROM staff_shifts WHERE discord_id = ? AND wave_number = ? ORDER BY started_at DESC', [discordId, wave]);
  const adjustments = await query('SELECT * FROM staff_shift_adjustments WHERE discord_id = ? AND wave_number = ? ORDER BY created_at DESC', [discordId, wave]);
  const totalShiftMinutes = shifts.reduce((sum, shift) => sum + shiftWorkedMinutes(shift), 0);
  const adjustedMinutes = adjustments.reduce((sum, item) => sum + Number(item.minutes_delta || 0), 0);

  return {
    discordId,
    waveNumber: wave,
    shifts,
    adjustments,
    totalShiftMinutes,
    adjustedMinutes,
    totalMinutes: Math.max(0, totalShiftMinutes + adjustedMinutes),
    activeShift: shifts.find(shift => ['active', 'break'].includes(shift.status)) || null,
  };
}

async function getLeaderboard({ waveNumber = null, limit = 100, includeActive = true } = {}) {
  await ensureStaffShiftTables();
  const wave = waveNumber || (await getCurrentWave()).number;
  const shifts = await query('SELECT * FROM staff_shifts WHERE wave_number = ?', [wave]);
  const adjustments = await query('SELECT * FROM staff_shift_adjustments WHERE wave_number = ?', [wave]);
  const byUser = new Map();

  for (const shift of shifts) {
    const item = byUser.get(shift.discord_id) || {
      discordId: shift.discord_id,
      discordName: shift.discord_name,
      shiftMinutes: 0,
      adjustedMinutes: 0,
      totalMinutes: 0,
      shifts: 0,
      active: false,
      onBreak: false,
    };
    if (includeActive || !['active', 'break'].includes(shift.status)) {
      item.shiftMinutes += shiftWorkedMinutes(shift);
      item.shifts += 1;
    }
    item.active ||= ['active', 'break'].includes(shift.status);
    item.onBreak ||= shift.status === 'break';
    byUser.set(shift.discord_id, item);
  }

  for (const adjustment of adjustments) {
    const item = byUser.get(adjustment.discord_id) || {
      discordId: adjustment.discord_id,
      discordName: adjustment.discord_id,
      shiftMinutes: 0,
      adjustedMinutes: 0,
      totalMinutes: 0,
      shifts: 0,
      active: false,
      onBreak: false,
    };
    item.adjustedMinutes += Number(adjustment.minutes_delta || 0);
    byUser.set(adjustment.discord_id, item);
  }

  return [...byUser.values()]
    .map(item => ({ ...item, totalMinutes: Math.max(0, item.shiftMinutes + item.adjustedMinutes) }))
    .sort((a, b) => b.totalMinutes - a.totalMinutes)
    .slice(0, Number(limit || 100));
}

async function adjustQuota({ discordId, shiftId = null, minutesDelta, reason, actorId }) {
  await ensureStaffShiftTables();
  const wave = await getCurrentWave();
  await query(
    `INSERT INTO staff_shift_adjustments (wave_number, discord_id, shift_id, minutes_delta, reason, actor_id) VALUES (?, ?, ?, ?, ?, ?)`,
    [wave.number, discordId, shiftId || null, Number(minutesDelta), reason || null, actorId]
  );
  return getUserShiftSummary(discordId, wave.number);
}

async function getQuotaArchive(waveNumber) {
  await ensureStaffShiftTables();
  const rows = await query('SELECT * FROM staff_quota_archives WHERE wave_number = ?', [Number(waveNumber)]);
  const row = rows[0];
  if (!row) return null;
  return { ...row, archive: parseJson(row.archive_json, null) };
}

export {
  addStaffLog,
  adjustQuota,
  archiveFinishedWaves,
  checkStaffShiftDatabase,
  endBreak,
  endShift,
  ensureStaffShiftTables,
  getActiveShift,
  getAllActiveShifts,
  getCurrentWave,
  getLeaderboard,
  getQuotaArchive,
  getRecentStaffLogs,
  getStaffShiftConfig,
  getUserShiftSummary,
  getWaveBounds,
  shiftWorkedMinutes,
  startBreak,
  startShift,
  updateStaffShiftConfig,
};
