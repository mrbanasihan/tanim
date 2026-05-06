const db = require("../../services/db");
const { KAFKA_EVENTS } = require("../../constants/kafka");
const { handleTemperatureEscalation } = require("./temperatureFeedbackHandler");

const ensureEventIdempotency = async (eventId) => {
  const [auditResult, ipbResult] = await Promise.all([
    db.query("SELECT 1 FROM audit_log WHERE source_event_id = $1 LIMIT 1", [
      eventId,
    ]),
    db.query(
      "SELECT 1 FROM ipb_central_system WHERE source_event_id = $1 LIMIT 1",
      [eventId],
    ),
  ]);

  if (auditResult.rowCount > 0 || ipbResult.rowCount > 0) {
    return false;
  }

  return true;
};

const insertAuditLog = async (actionType, event) => {
  await db.query(
    `
      INSERT INTO audit_log (action_type, actor, payload, source_event_id)
      VALUES ($1, $2, $3, $4)
    `,
    [
      actionType,
      event.payload.actor || "system",
      event.payload,
      event.event_id,
    ],
  );
};

const insertCentralRecord = async (dataType, event) => {
  await db.query(
    `
      INSERT INTO ipb_central_system (data_type, payload, source_event_id)
      VALUES ($1, $2, $3)
    `,
    [dataType, event.payload, event.event_id],
  );
};

const handleSeedRegisteredEvent = async (event) => {
  if (!(await ensureEventIdempotency(event.event_id))) {
    return;
  }

  await Promise.all([
    insertAuditLog("CREATE", event),
    insertCentralRecord("seed_batch", event),
  ]);
};

const handleSeedUpdatedEvent = async (event) => {
  if (!(await ensureEventIdempotency(event.event_id))) {
    return;
  }

  await Promise.all([
    insertAuditLog("UPDATE", event),
    insertCentralRecord("seed_batch", event),
  ]);
};

const handleTransactionEvent = async (event) => {
  if (!(await ensureEventIdempotency(event.event_id))) {
    return;
  }

  await Promise.all([
    insertAuditLog("UPDATE", event),
    insertCentralRecord("transaction", event),
  ]);
};

const handleLowStockAlertEvent = async (event) => {
  if (!(await ensureEventIdempotency(event.event_id))) {
    return;
  }

  await Promise.all([
    insertAuditLog("UPDATE", event),
    insertCentralRecord("system_log", event),
  ]);
};

const handleEvent = async (event) => {
  switch (event.event_type) {
    case KAFKA_EVENTS.SEED_REGISTERED:
      return handleSeedRegisteredEvent(event);
    case KAFKA_EVENTS.SEED_UPDATED:
      return handleSeedUpdatedEvent(event);
    case KAFKA_EVENTS.SEED_WITHDRAWAL:
    case KAFKA_EVENTS.SEED_DISPOSAL:
      return handleTransactionEvent(event);
    case KAFKA_EVENTS.LOW_STOCK_ALERT:
      return handleLowStockAlertEvent(event);
    case KAFKA_EVENTS.TEMPERATURE_ESCALATION:
      return handleTemperatureEscalation(event);
    default:
      return undefined;
  }
};

module.exports = {
  handleEvent,
};
