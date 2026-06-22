const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
require("dotenv").config();

// Import routes
const authRoutes = require("./src/routes/authRoutes");
const projectRoutes = require("./src/routes/projectRoutes");
const seedRoutes = require("./src/routes/seedRoutes");
const transactionRoutes = require("./src/routes/transactionRoutes");
const roomRoutes = require("./src/routes/roomRoutes");
const germinationRecordRoutes = require("./src/routes/germinationRecordRoutes");
const notificationRoutes = require("./src/routes/notificationRoutes");

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || "0.0.0.0";

// isEnabled
// Parse environment variable as boolean (accepts: true, 1, yes, on)
const isEnabled = (value) => {
  if (value === undefined) {
    return false;
  }

  return ["true", "1", "yes", "on"].includes(String(value).toLowerCase());
};

// normalizeOrigin
// Remove trailing slash from origin URL
const normalizeOrigin = (origin) => origin.trim().replace(/\/$/, "");

const configuredOrigins =
  process.env.CORS_ORIGIN || process.env.FRONTEND_URL || "";

const allowVercelPreviews = isEnabled(process.env.CORS_ALLOW_VERCEL_PREVIEWS);

const allowedOrigins = configuredOrigins
  ? configuredOrigins
      .split(",")
      .map((origin) => normalizeOrigin(origin))
      .filter(Boolean)
  : [];

// wildcardToRegex
// Convert wildcard pattern to regex for origin matching
const wildcardToRegex = (originPattern) => {
  const escaped = originPattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");

  return new RegExp(`^${escaped}$`);
};

const isAllowedOrigin = (origin) => {
  if (allowedOrigins.length === 0) {
    return true;
  }

  if (allowedOrigins.includes(origin)) {
    return true;
  }

  const wildcardMatches = allowedOrigins
    .filter((value) => value.includes("*"))
    .some((pattern) => wildcardToRegex(pattern).test(origin));

  if (wildcardMatches) {
    return true;
  }

  if (allowVercelPreviews && origin.endsWith(".vercel.app")) {
    return true;
  }

  return false;
};

const corsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server requests and non-browser clients.
    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin = normalizeOrigin(origin);

    // If no CORS_ORIGIN is set, allow all origins in development/default mode.
    if (isAllowedOrigin(normalizedOrigin)) {
      return callback(null, true);
    }

    console.warn(
      `CORS rejected origin: ${normalizedOrigin}. Allowed origins: ${allowedOrigins.join(", ") || "<all>"}`,
    );
    return callback(null, false);
  },
};

// Middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan("dev"));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/seeds", seedRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/germination-records", germinationRecordRoutes);
app.use("/api/notifications", notificationRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// Start server with explicit error handling so bind failures are visible.
const server = app.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
  console.log(
    `Database: ${process.env.DB_HOST || "localhost"}:${process.env.DB_PORT || 5432}`,
  );
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use. Set a different PORT in backend/.env (for example PORT=3001).`,
    );
    process.exit(1);
  }

  console.error("Server startup error:", error);
  process.exit(1);
});

const shutdown = async () => {
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
