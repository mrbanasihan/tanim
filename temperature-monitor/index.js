const { createTemperatureProducer } = require("./src/producer");
const { startArduinoBridge } = require("./src/arduinoBridge");
const { startSimulator } = require("./src/simulator");
const {
  ARDUINO_ENABLED,
  REAL_SENSOR,
  SIMULATED_SENSORS,
} = require("./src/config");

const main = async () => {
  const producer = await createTemperatureProducer();
  const shutdownTasks = [producer.shutdown];
  let bridge = null;
  let simulator = null;

  if (ARDUINO_ENABLED) {
    try {
      bridge = await startArduinoBridge({ producer });
      shutdownTasks.push(bridge.stop);
    } catch (error) {
      console.warn(
        `[temperature-monitor] Arduino bridge unavailable, continuing with simulator only: ${error.message}`,
      );
    }
  } else {
    console.log(
      "[temperature-monitor] Arduino disabled; running simulator-only mode",
    );
  }

  const sensorsToSimulate = SIMULATED_SENSORS;

  simulator = await startSimulator({
    producer,
    sensors: sensorsToSimulate,
  });
  shutdownTasks.push(simulator.stop);

  const shutdown = async () => {
    while (shutdownTasks.length > 0) {
      const stop = shutdownTasks.pop();
      try {
        await stop();
      } catch (error) {
        console.warn(
          "[temperature-monitor] Shutdown step failed:",
          error.message,
        );
      }
    }

    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  console.log(
    `[temperature-monitor] Ready. Arduino enabled: ${ARDUINO_ENABLED}. Simulated sensors: ${sensorsToSimulate.length}`,
  );
};

main().catch((error) => {
  console.error("[temperature-monitor] Fatal startup error:", error);
  process.exit(1);
});
