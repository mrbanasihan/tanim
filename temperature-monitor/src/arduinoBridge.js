const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");
const { ARDUINO_BAUD_RATE, ARDUINO_DEVICE, REAL_SENSOR } = require("./config");

const parseReadingLine = (line) => {
  const match = String(line)
    .trim()
    .match(/TEMP:([+-]?\d+(?:\.\d+)?)\s+HUMID:([+-]?\d+(?:\.\d+)?)/i);

  if (!match) {
    return null;
  }

  return {
    temp_celsius: Number(match[1]),
    humidity_percent: Number(match[2]),
  };
};

const startArduinoBridge = async ({ producer, devicePath, baudRate } = {}) => {
  const serialDevice = devicePath || ARDUINO_DEVICE;
  const serialBaudRate = baudRate || ARDUINO_BAUD_RATE;

  const port = new SerialPort({
    path: serialDevice,
    baudRate: serialBaudRate,
    autoOpen: false,
  });

  const parser = port.pipe(new ReadlineParser({ delimiter: "\n" }));

  parser.on("data", async (line) => {
    const reading = parseReadingLine(line);

    if (!reading) {
      console.warn(
        `[temperature-monitor] Ignoring malformed serial line: ${line}`,
      );
      return;
    }

    try {
      await producer.publishTemperatureReading({
        ...REAL_SENSOR,
        ...reading,
        source_type: "real",
        measured_at: new Date().toISOString(),
      });

      console.log(
        `[temperature-monitor] Published real reading from ${REAL_SENSOR.sensor_name}: ${reading.temp_celsius}°C`,
      );
    } catch (error) {
      console.error(
        "[temperature-monitor] Failed to publish Arduino reading:",
        error.message,
      );
    }
  });

  await new Promise((resolve, reject) => {
    port.open((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

  console.log(
    `[temperature-monitor] Listening to Arduino on ${serialDevice} at ${serialBaudRate} baud`,
  );

  const stop = async () => {
    await new Promise((resolve) => {
      port.close(() => resolve());
    });
  };

  return {
    stop,
  };
};

module.exports = {
  parseReadingLine,
  startArduinoBridge,
};
