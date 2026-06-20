const globalForOracle = globalThis;

const DEFAULT_CONNECT_ALIAS = "r66mnsdahjlmhpie_tp";

let pool = globalForOracle.__oracleDbPool || null;
let oracledbModule = null;

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`[OracleDB] Missing required env var: ${name}`);
  }
  return value;
}

function getOracleConfig() {
  const user = getRequiredEnv("ORACLE_DB_USER");
  const password = getRequiredEnv("ORACLE_DB_PASSWORD");
  const configDir = getRequiredEnv("ORACLE_DB_WALLET_DIR");
  const connectString = process.env.ORACLE_DB_CONNECT_STRING || DEFAULT_CONNECT_ALIAS;

  return {
    user,
    password,
    connectString,
    configDir,
    poolMin: parseInt(process.env.ORACLE_DB_POOL_MIN || "2", 10),
    poolMax: parseInt(process.env.ORACLE_DB_POOL_MAX || "10", 10),
    poolIncrement: parseInt(process.env.ORACLE_DB_POOL_INCREMENT || "1", 10),
    queueTimeout: parseInt(process.env.ORACLE_DB_QUEUE_TIMEOUT_MS || "30000", 10),
    connectTimeout: parseInt(process.env.ORACLE_DB_CONNECT_TIMEOUT_SECONDS || "15", 10),
  };
}

async function loadOracleDb() {
  if (oracledbModule) return oracledbModule;

  try {
    const imported = await import("oracledb");
    oracledbModule = imported.default || imported;
    oracledbModule.outFormat = oracledbModule.OUT_FORMAT_OBJECT;
    return oracledbModule;
  } catch (error) {
    throw new Error(
      "[OracleDB] The oracledb package is not installed. Add it with `npm install oracledb` on your hosting server.",
      { cause: error }
    );
  }
}

async function getOraclePool() {
  if (pool) return pool;

  const oracledb = await loadOracleDb();
  const config = getOracleConfig();

  try {
    pool = await oracledb.createPool(config);
    globalForOracle.__oracleDbPool = pool;
  } catch (error) {
    console.error('[OracleDB] Failed to create pool:', error.code || error.message);
    pool = null;
    globalForOracle.__oracleDbPool = null;
    throw error;
  }

  return pool;
}

async function getOracleConnection() {
  const activePool = await getOraclePool();
  try {
    return await activePool.getConnection();
  } catch (error) {
    console.error('[OracleDB] Failed to get connection:', error.code || error.message);
    if (error?.code === 'NJS-040' || error?.code === 'NJS-511') {
      pool = null;
      globalForOracle.__oracleDbPool = null;
    }
    throw error;
  }
}

async function runOracleQuery(sql, binds = {}, options = {}) {
  const connection = await getOracleConnection();

  try {
    return await connection.execute(sql, binds, {
      autoCommit: options.autoCommit ?? false,
      ...options,
    });
  } finally {
    await connection.close();
  }
}

async function closeOraclePool() {
  if (!pool) return;

  const activePool = pool;
  pool = null;
  globalForOracle.__oracleDbPool = null;
  await activePool.close(10);
}

export {
  closeOraclePool,
  getOracleConfig,
  getOracleConnection,
  getOraclePool,
  runOracleQuery,
};

export default getOraclePool;
