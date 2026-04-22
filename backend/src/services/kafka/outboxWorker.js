const { leasePendingEvents, markEventFailed } = require("./outboxService");
const { publishEvent } = require("./producer");
const { ensureTopics } = require("./client");
const { setKafkaState } = require("./state");

let workerTimer = null;
let isRunning = false;

const processOutboxBatch = async () => {
  const events = await leasePendingEvents();

  for (const event of events) {
    try {
      await publishEvent({
        eventId: event.event_id,
        topic: event.topic,
        eventType: event.event_type,
        payload: event.payload,
      });
    } catch (error) {
      await markEventFailed(event.event_id);
      setKafkaState({ lastError: error.message });
    }
  }
};

const startOutboxWorker = async (intervalMs = 5000) => {
  if (isRunning) {
    return;
  }

  await ensureTopics();
  isRunning = true;
  setKafkaState({ workerReady: true, lastError: null });

  const tick = async () => {
    if (!isRunning) {
      return;
    }

    try {
      await processOutboxBatch();
    } catch (error) {
      setKafkaState({ lastError: error.message });
    } finally {
      workerTimer = setTimeout(tick, intervalMs);
    }
  };

  workerTimer = setTimeout(tick, 0);
};

const stopOutboxWorker = () => {
  isRunning = false;

  if (workerTimer) {
    clearTimeout(workerTimer);
    workerTimer = null;
  }

  setKafkaState({ workerReady: false });
};

module.exports = {
  startOutboxWorker,
  stopOutboxWorker,
};
