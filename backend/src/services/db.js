const { Pool } = require("pg");
const dns = require("dns");

// Load environment variables
require("dotenv").config();

dns.setDefaultResultOrder("ipv4first");

const getBooleanEnv = (value) => {
  if (value === undefined) {
    return false;
  }

  return ["true", "1", "yes", "on"].includes(String(value).toLowerCase());
};

const getSslConfig = () => {
  if (!getBooleanEnv(process.env.DB_SSL)) {
    return undefined;
  }

  const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED
    ? getBooleanEnv(process.env.DB_SSL_REJECT_UNAUTHORIZED)
    : false;

  return {
    rejectUnauthorized,
  };
};

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "tanim_db",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "password",
  max: 20, // Maximum number of active connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  family: 4,
  ssl: getSslConfig(),
};

// Create connection pool
const pool = new Pool(dbConfig);

// Test database connection
pool.on("connect", () => {
  console.log("Connected to PostgreSQL database");
});

pool.on("error", (err) => {
  console.error("Unexpected database error:", err);
  process.exit(-1);
});

// Helper function to execute queries
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.warn(`Slow query (${duration}ms):`, text);
    }
    return res;
  } catch (error) {
    console.error("Query error:", error);
    throw error;
  }
};

// Helper function to get a client for transactions
const getClient = async () => {
  const client = await pool.connect();
  const originalQuery = client.query;
  const originalRelease = client.release;

  // Set a timeout of 5 seconds for queries
  const timeout = 5000;

  client.query = (...args) => {
    return Promise.race([
      originalQuery.apply(client, args),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Query timeout")), timeout),
      ),
    ]);
  };

  client.release = () => {
    client.query = originalQuery;
    client.release = originalRelease;
    originalRelease.call(client);
  };

  return client;
};

// Get pool stats
const getPoolStats = () => {
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
  };
};

// Close all connections (for graceful shutdown)
const closePool = async () => {
  await pool.end();
  console.log("Database pool closed");
};

module.exports = {
  query,
  getClient,
  getPoolStats,
  closePool,
  pool,
};
