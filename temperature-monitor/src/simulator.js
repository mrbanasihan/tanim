const {
  SIMULATOR_INTERVAL_MS,
  SIMULATOR_OUTLIER_PROBABILITY,
} = require("./config");

const randBetween = (min, max) => min + Math.random() * (max - min);
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const generateHumidity = (tempCelsius) => {
  const baseline = 68 - (tempCelsius - 24) * 1.2;
  return Number(
    clamp(randBetween(baseline - 6, baseline + 6), 35, 92).toFixed(1),
  );
};

const generateReading = (
  sensor,
  outlierProbability = SIMULATOR_OUTLIER_PROBABILITY,
) => {
  const optimalTemp = Number(sensor.optimal_temp ?? 24);
  const tempStart = Number(sensor.temp_start ?? optimalTemp - 3);
  const tempEnd = Number(sensor.temp_end ?? optimalTemp + 3);
  const midpointLow = (optimalTemp + tempStart) / 2;
  const midpointHigh = (optimalTemp + tempEnd) / 2;

  const isOutlier = Math.random() < outlierProbability;
  let tempCelsius;

  if (isOutlier) {
    const direction = Math.random() < 0.5 ? -1 : 1;
    const offset = 2 + Math.random() * 4;
    tempCelsius = direction < 0 ? tempStart - offset : tempEnd + offset;
  } else if (Math.random() < 0.7) {
    tempCelsius = randBetween(midpointLow, midpointHigh);
  } else {
    const edgeLow =
      Math.random() < 0.5
        ? randBetween(tempStart, midpointLow)
        : randBetween(midpointHigh, tempEnd);
    tempCelsius = edgeLow;
  }

  tempCelsius = Number(tempCelsius.toFixed(1));

  return {
    sensor_id: sensor.sensor_id,
    room_id: sensor.room_id,
    room_name: sensor.room_name || null,
    sensor_name: sensor.sensor_name || null,
    source_type: "simulated",
    temp_celsius: tempCelsius,
    humidity_percent: generateHumidity(tempCelsius),
    measured_at: new Date().toISOString(),
  };
};

const startSimulator = async ({
  producer,
  sensors = [],
  intervalMs = SIMULATOR_INTERVAL_MS,
  outlierProbability = SIMULATOR_OUTLIER_PROBABILITY,
} = {}) => {
  if (!Array.isArray(sensors) || sensors.length === 0) {
    console.log("[temperature-monitor] No simulated sensors configured");

    return {
      stop: async () => undefined,
    };
  }

  const publishCycle = async () => {
    for (const sensor of sensors) {
      if (!sensor || !sensor.sensor_id) {
        continue;
      }

      try {
        const reading = generateReading(sensor, outlierProbability);
        await producer.publishTemperatureReading(reading);
        console.log(
          `[temperature-monitor] Published simulated reading for ${sensor.sensor_name || sensor.sensor_id}: ${reading.temp_celsius}°C`,
        );
      } catch (error) {
        console.error(
          `[temperature-monitor] Failed to publish simulated reading for ${sensor.sensor_name || sensor.sensor_id}:`,
          error.message,
        );
      }
    }
  };

  await publishCycle();
  const timer = setInterval(publishCycle, intervalMs);

  const stop = async () => {
    clearInterval(timer);
  };

  return {
    stop,
  };
};

module.exports = {
  generateReading,
  startSimulator,
};
