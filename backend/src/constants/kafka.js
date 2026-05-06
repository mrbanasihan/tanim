const KAFKA_TOPICS = {
  SEEDS: "tanim.seeds",
  TRANSACTIONS: "tanim.transactions",
  ALERTS: "tanim.alerts",
  TEMPERATURE: "tanim.temperature",
  TEMPERATURE_FEEDBACK: "admin.temperature-feedback",
};

const KAFKA_EVENTS = {
  SEED_REGISTERED: "SeedRegisteredEvent",
  SEED_UPDATED: "SeedUpdatedEvent",
  SEED_WITHDRAWAL: "SeedWithdrawalEvent",
  SEED_DISPOSAL: "SeedDisposalEvent",
  LOW_STOCK_ALERT: "LowStockAlertEvent",
  TEMPERATURE_ESCALATION: "TemperatureEscalation",
};

const KAFKA_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
  RETRY: "retry",
};

const KAFKA_SOURCE_SYSTEM = process.env.KAFKA_SOURCE_SYSTEM || "tanim-backend";

module.exports = {
  KAFKA_TOPICS,
  KAFKA_EVENTS,
  KAFKA_STATUS,
  KAFKA_SOURCE_SYSTEM,
};
