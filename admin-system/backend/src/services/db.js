const { Pool } = require("pg");
const dns = require("dns");
require("dotenv").config();

dns.setDefaultResultOrder("ipv4first");

const isEnabled = (value) => {
  if (value === undefined) {
    return false;
  }

  return ["true", "1", "yes", "on"].includes(String(value).toLowerCase());
};

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

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
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

pool.on("connect", () => {
  console.log("Connected to admin database");
});

pool.on("error", (error) => {
  console.error("Unexpected admin database error:", error);
  process.exit(1);
});

const query = async (text, params) => {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  if (duration > 1000) {
    console.warn(`Slow admin query (${duration}ms):`, text);
  }
  return result;
};

const getClient = async () => pool.connect();

const closePool = async () => {
  await pool.end();
  console.log("Admin database pool closed");
};

module.exports = {
  pool,
  query,
  getClient,
  closePool,
};
