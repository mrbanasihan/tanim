const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
require("dotenv").config();

const healthRoutes = require("./routes/healthRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

const normalizeOrigin = (origin) => origin.trim().replace(/\/$/, "");
const configuredOrigins =
  process.env.CORS_ORIGIN || process.env.FRONTEND_URL || "";
const allowVercelPreviews = ["true", "1", "yes", "on"].includes(
  String(process.env.CORS_ALLOW_VERCEL_PREVIEWS || "false").toLowerCase(),
);
const allowedOrigins = configuredOrigins
  ? configuredOrigins
      .split(",")
      .map((origin) => normalizeOrigin(origin))
      .filter(Boolean)
  : [];

const isAllowedOrigin = (origin) => {
  if (allowedOrigins.length === 0) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (allowVercelPreviews && origin.endsWith(".vercel.app")) return true;
  return false;
};

app.use(helmet());
app.use(express.json());
app.use(morgan("dev"));
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const normalizedOrigin = normalizeOrigin(origin);
      if (isAllowedOrigin(normalizedOrigin)) return callback(null, true);
      console.warn(`Admin CORS rejected origin: ${normalizedOrigin}`);
      return callback(null, false);
    },
  }),
);

app.use("/health", healthRoutes);
app.use("/api/admin", adminRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || "Something went wrong" });
});

module.exports = { app };
