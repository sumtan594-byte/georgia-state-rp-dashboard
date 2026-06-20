const globalForOracle = globalThis;

const DEFAULT_CONNECT_ALIAS = "r66mnsdahjlmhpie_tp";
const REQUIRED_WALLET_FILES = ["tnsnames.ora", "sqlnet.ora", "cwallet.sso"];

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
  const walletLocation = process.env.ORACLE_DB_WALLET_LOCATION || configDir;
  const walletPassword = process.env.ORACLE_DB_WALLET_PASSWORD;
  const connectString = process.env.ORACLE_DB_CONNECT_STRING || DEFAULT_CONNECT_ALIAS;

  const config = {
    user,
    password,
    connectString,
    configDir,
    walletLocation,
    poolMin: parseInt(process.env.ORACLE_DB_POOL_MIN || "2", 10),
    poolMax: parseInt(process.env.ORACLE_DB_POOL_MAX || "10", 10),
    poolIncrement: parseInt(process.env.ORACLE_DB_POOL_INCREMENT || "1", 10),
    queueTimeout: parseInt(process.env.ORACLE_DB_QUEUE_TIMEOUT_MS || "30000", 10),
    connectTimeout: parseInt(process.env.ORACLE_DB_CONNECT_TIMEOUT_SECONDS || "15", 10),
  };

  if (walletPassword) {
    config.walletPassword = walletPassword;
  }

  return config;
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

async function checkOracleConnection({ logPrefix = "[OracleDB]" } = {}) {
  const fs = await import("fs");
  const startedAt = Date.now();

  try {
    const config = getOracleConfig();
    console.log(`${logPrefix} Startup check: user=${config.user}, connectString=${config.connectString}, wallet=${config.walletLocation}`);

    const walletDir = config.walletLocation.replace(/\/+$/, "");
    const missingWalletFiles = REQUIRED_WALLET_FILES.filter(file => (
      !fs.existsSync(/* turbopackIgnore: true */ `${walletDir}/${file}`)
    ));
    if (missingWalletFiles.length > 0) {
      throw new Error(`Wallet folder is missing: ${missingWalletFiles.join(", ")}`);
    }
    console.log(`${logPrefix} Startup check: wallet files present (${REQUIRED_WALLET_FILES.join(", ")})`);

    const result = await runOracleQuery("SELECT 1 AS ok FROM dual");
    console.log(`${logPrefix} Startup check: connected in ${Date.now() - startedAt}ms`, result.rows?.[0] || "");

    return { ok: true, elapsedMs: Date.now() - startedAt };
  } catch (error) {
    console.error(`${logPrefix} Startup check failed:`, error.code || error.message);
    return {
      ok: false,
      elapsedMs: Date.now() - startedAt,
      code: error.code || null,
      message: error.message || String(error),
    };
  }
}

export {
  checkOracleConnection,
  closeOraclePool,
  getOracleConfig,
  getOracleConnection,
  getOraclePool,
  runOracleQuery,
};

export default getOraclePool;
