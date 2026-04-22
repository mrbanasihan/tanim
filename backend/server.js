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
const { startConsumer } = require("./src/services/kafka/consumer");
const {
  startOutboxWorker,
  stopOutboxWorker,
} = require("./src/services/kafka/outboxWorker");
const { disconnectKafka } = require("./src/services/kafka/client");
const { getKafkaState } = require("./src/services/kafka/state");

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || "0.0.0.0";

const isEnabled = (value) => {
  if (value === undefined) {
    return false;
  }

  return ["true", "1", "yes", "on"].includes(String(value).toLowerCase());
};

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
  : [];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server requests and non-browser clients.
    if (!origin) {
      return callback(null, true);
    }

    // If no CORS_ORIGIN is set, allow all origins in development/default mode.
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
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
    kafka: getKafkaState(),
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
    `Database target: ${process.env.DB_HOST || "localhost"}:${process.env.DB_PORT || 5432} (ssl=${isEnabled(process.env.DB_SSL)})`,
  );
  console.log(
    `Kafka target: ${process.env.KAFKA_BROKERS || "localhost:9092"} (ssl=${isEnabled(process.env.KAFKA_SSL)}, autoCreateTopics=${process.env.KAFKA_AUTO_CREATE_TOPICS === undefined ? process.env.NODE_ENV !== "production" : isEnabled(process.env.KAFKA_AUTO_CREATE_TOPICS)})`,
  );
});

startConsumer().catch((error) => {
  console.error("Kafka consumer startup error:", error);
});

startOutboxWorker().catch((error) => {
  console.error("Kafka outbox worker startup error:", error);
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
  stopOutboxWorker();
  await disconnectKafka();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
