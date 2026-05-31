const { recordAuditLogOnce, recordNotificationLog } = require("./auditService");

// Processes Tanim events from Kafka and forwards to audit service for logging; normalizes and maps event types
const EVENT_TYPE_TO_ACTION = {
  SeedRegisteredEvent: "CREATE",
  SeedUpdatedEvent: "UPDATE",
  SeedWithdrawalEvent: "UPDATE",
  SeedDisposalEvent: "UPDATE",
  LowStockAlertEvent: "CREATE",
};

const EVENT_TYPE_TO_ENTITY = {
  SeedRegisteredEvent: "seed",
  SeedUpdatedEvent: "seed",
  SeedWithdrawalEvent: "transaction",
  SeedDisposalEvent: "transaction",
  LowStockAlertEvent: "alert",
};

const normalizeEvent = (event, topic) => {
  const payload =
    event?.payload && typeof event.payload === "object" ? event.payload : {};

  return {
    ...event,
    topic: event?.topic || topic || null,
    payload,
  };
};

const getActor = (event) =>
  event.payload.actor || event.actor || event.source_system || "tanim-backend";

const buildAuditPayload = (event) => {
  const entity = EVENT_TYPE_TO_ENTITY[event.event_type] || "system_event";

  return {
    source: "tanim",
    entity,
    event_id: event.event_id || null,
    event_type: event.event_type || "UnknownEvent",
    topic: event.topic || null,
    source_system: event.source_system || "tanim-backend",
    emitted_at: event.emitted_at || event.occurred_at || null,
    actor: event.payload.actor || event.actor || null,
    data: event.payload,
  };
};

const handleTanimEvent = async (rawEvent, topic) => {
  const event = normalizeEvent(rawEvent, topic);
  const actionType = EVENT_TYPE_TO_ACTION[event.event_type] || "UPDATE";
  const actor = getActor(event);
  const payload = buildAuditPayload(event);

  const inserted = await recordAuditLogOnce({
    actionType,
    actor,
    payload,
    sourceEventId: event.event_id || null,
  });

  return {
    inserted,
    actionType,
    actor,
    payload,
    event,
  };
};

const handleNotificationEvent = async (rawEvent, topic) => {
  const event = normalizeEvent(rawEvent, topic);
  const payload = event.payload || {};

  await recordNotificationLog({
    sourceEventId: event.event_id || null,
    notificationType:
      payload.notification_type || event.event_type || "notification",
    userId: payload.user_id || null,
    message: payload.message || JSON.stringify(payload),
    payload,
    createdAt: event.emitted_at || null,
  });

  return {
    inserted: true,
    actionType: event.event_type || "NOTIFICATION",
    actor: payload.user_id || event.actor || "system",
    payload,
    event,
  };
};

module.exports = {
  handleTanimEvent,
  handleNotificationEvent,
  EVENT_TYPE_TO_ACTION,
  EVENT_TYPE_TO_ENTITY,
};
