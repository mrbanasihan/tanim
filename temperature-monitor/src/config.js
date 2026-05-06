require("dotenv").config();

const REAL_SENSOR = {
  sensor_id: "91000000-0000-4000-8000-000000000001",
  room_id: "90000000-0000-4000-8000-000000000001",
  room_name: "Seed Storage Room A",
  sensor_name: "Sensor-SSRA-01",
  source_type: "real",
};

const parseJson = (value, fallback) => {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn(
      "[temperature-monitor] Could not parse JSON configuration, using fallback:",
      error.message,
    );
    return fallback;
  }
};

const KAFKA_CLIENT_ID = process.env.KAFKA_CLIENT_ID || "temperature-monitor";
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || "localhost:9092")
  .split(",")
  .map((broker) => broker.trim())
  .filter(Boolean);

const KAFKA_TOPIC = process.env.KAFKA_TOPIC || "tanim.temperature";
const ARDUINO_ENABLED = ["true", "1", "yes", "on"].includes(
  String(process.env.ARDUINO_ENABLED || "false").toLowerCase(),
);
const ARDUINO_DEVICE = process.env.ARDUINO_DEVICE || "/dev/ttyUSB0";
const ARDUINO_BAUD_RATE = Number(process.env.ARDUINO_BAUD_RATE) || 9600;
const SIMULATOR_INTERVAL_MS =
  Number(process.env.SIMULATOR_INTERVAL_MS) || 30000;
const SIMULATOR_OUTLIER_PROBABILITY =
  Number(process.env.SIMULATOR_OUTLIER_PROBABILITY) || 0.05;

const SIMULATED_SENSORS = parseJson(process.env.SIMULATED_SENSORS_JSON, []);

module.exports = {
  ARDUINO_ENABLED,
  ARDUINO_BAUD_RATE,
  ARDUINO_DEVICE,
  KAFKA_BROKERS,
  KAFKA_CLIENT_ID,
  KAFKA_TOPIC,
  REAL_SENSOR,
  SIMULATED_SENSORS,
  SIMULATOR_INTERVAL_MS,
  SIMULATOR_OUTLIER_PROBABILITY,
};
