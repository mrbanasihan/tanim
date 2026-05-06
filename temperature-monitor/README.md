# Temperature Monitor

Standalone Kafka producer for TANIM temperature telemetry.

## What it does

- Can run in simulator-only mode (no Arduino required).
- Optionally reads the real DHT11 sensor from Arduino UNO R3 when enabled.
- Generates simulated readings for configured rooms.
- Publishes all telemetry to `tanim.temperature` for the admin system to consume.

## Files

- `index.js` starts the producer, Arduino bridge, and simulator.
- `src/producer.js` wraps Kafka publishing.
- `src/arduinoBridge.js` parses serial readings from the Arduino.
- `src/simulator.js` emits synthetic readings on a timer.
- `src/config.js` centralizes sensor and runtime settings.

## Setup

1. Copy `.env.example` to `.env`.
2. Set Kafka values.
3. For simulator-only mode, keep `ARDUINO_ENABLED=false`.
4. For real sensor mode, set `ARDUINO_ENABLED=true` and configure Arduino device values.
5. Add simulated sensor definitions in `SIMULATED_SENSORS_JSON`.
6. Run `npm install`.
7. Start the service with `npm start`.

## Simulated sensor format

```json
[
  {
    "sensor_id": "91000000-0000-4000-8000-000000000002",
    "room_id": "90000000-0000-4000-8000-000000000002",
    "room_name": "Seed Storage Room B",
    "sensor_name": "Sensor-SSRB-01",
    "optimal_temp": 22,
    "temp_start": 18,
    "temp_end": 26
  }
]
```
