/**
 * Temperature status classifier (same rules as TANIM)
 */

/**
 * Classify temperature status based on room thresholds
 * @param {number} tempCelsius
 * @param {number} optimalTemp
 * @param {number} tempStart
 * @param {number} tempEnd
 */
function classifyStatus(tempCelsius, optimalTemp, tempStart, tempEnd) {
  const midpointLow = (optimalTemp + tempStart) / 2;
  const midpointHigh = (optimalTemp + tempEnd) / 2;

  if (tempCelsius >= tempStart && tempCelsius <= tempEnd) {
    if (tempCelsius >= midpointLow && tempCelsius <= midpointHigh) {
      return "normal";
    }
    return "warning";
  }

  const distanceOutside =
    tempCelsius < tempStart ? tempStart - tempCelsius : tempCelsius - tempEnd;

  if (distanceOutside >= 2.0) {
    return "danger";
  }

  return "critical";
}

module.exports = {
  classifyStatus,
};
