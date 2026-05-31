const { Pool } = require("pg");
const dns = require("dns");
const { promisify } = require("util");
require("dotenv").config();

// PostgreSQL connection pool management with DNS resolution and SSL configuration
dns.setDefaultResultOrder("ipv4first");
const lookup = promisify(dns.lookup);

let pool;
let resolvingPool;

// getDbHost
// Resolve database hostname from configuration with DNS lookup for IPv4
const getDbHost = async () => {
  const configuredHost = process.env.DB_HOST || "localhost";

  if (!configuredHost || configuredHost === "localhost") {
    return configuredHost;
  }

  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(configuredHost)) {
    return configuredHost;
  }

  const result = await lookup(configuredHost, {
    family: 4,
    all: false,
  });

  return result.address;
};

// isEnabled
// Parse environment variable as boolean (accepts: true, 1, yes, on)
const isEnabled = (value) => {
  if (value === undefined) {
    return false;
  }

  return ["true", "1", "yes", "on"].includes(String(value).toLowerCase());
};

// getSslConfig
// Build SSL configuration object for database connections
const getSslConfig = () => {
  if (!isEnabled(process.env.DB_SSL)) {
    return undefined;
  }

  return {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED
      ? isEnabled(process.env.DB_SSL_REJECT_UNAUTHORIZED)
      : false,
    servername: process.env.DB_SSL_SERVERNAME || process.env.DB_HOST,
  };
};

// createPool
// Create PostgreSQL connection pool with resolved hostname
const createPool = async () => {
  const resolvedHost = await getDbHost();

  return new Pool({
    host: resolvedHost,
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || "postgres",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "password",
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    family: 4,
    ssl: getSslConfig(),
  });
};

// ensurePool
// Lazy-initialize and return database connection pool (singleton pattern)
const ensurePool = async () => {
  if (pool) {
    return pool;
  }

  if (!resolvingPool) {
    resolvingPool = createPool().then((createdPool) => {
      pool = createdPool;

      pool.on("connect", () => {
        console.log("Connected to admin database");
      });

      pool.on("error", (error) => {
        console.error("Unexpected admin database error:", error);
        process.exit(1);
      });

      return pool;
    });
  }

  return resolvingPool;
};

const query = async (text, params) => {
  const start = Date.now();
  const currentPool = await ensurePool();
  const result = await currentPool.query(text, params);
  const duration = Date.now() - start;
  if (duration > 1000) {
    console.warn(`Slow admin query (${duration}ms):`, text);
  }
  return result;
};

const getClient = async () => {
  const currentPool = await ensurePool();
  return currentPool.connect();
};

const closePool = async () => {
  if (pool) {
    await pool.end();
    console.log("Admin database pool closed");
  }
};

const initPool = async () => {
  await ensurePool();
};

module.exports = {
  initPool,
  query,
  getClient,
  closePool,
};
