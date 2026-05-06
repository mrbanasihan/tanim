require("dotenv").config();
const { app } = require("./app");
const { startKafkaConsumer, disconnectKafka } = require("./services/kafka");
const { closePool } = require("./services/db");

const PORT = Number(process.env.PORT) || 5100;
const HOST = process.env.HOST || "0.0.0.0";

const server = app.listen(PORT, HOST, () => {
  console.log(`Admin server running at http://${HOST}:${PORT}`);
});

startKafkaConsumer().catch((error) => {
  console.error("Admin Kafka consumer startup error:", error);
});

// Start temperature processor (consumes tanim.temperature and publishes admin.temperature-feedback)
const {
  startTemperatureProcessor,
  stopTemperatureProcessor,
} = require("./services/temperatureProcessor");

startTemperatureProcessor().catch((error) => {
  console.error("Admin temperature processor startup error:", error);
});

const shutdown = async () => {
  await stopTemperatureProcessor().catch(() => undefined);
  await disconnectKafka().catch(() => undefined);
  await closePool().catch(() => undefined);
  server.close(() => process.exit(0));
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
