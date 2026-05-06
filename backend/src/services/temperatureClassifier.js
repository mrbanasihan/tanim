/**
 * Temperature status classifier
 * Pure function for consistent status computation across services
 *
 * Rules:
 * - normal: temperature is in the central band [midpoint_low, midpoint_high]
 *   where midpoint_low = (optimal_temp + temp_start) / 2 and midpoint_high = (optimal_temp + temp_end) / 2
 * - warning: temperature is inside range but in edge bands (between midpoint and temp boundary)
 * - critical: temperature is outside range by <2°C
 * - danger: temperature is outside range by ≥2°C
 */

/**
 * Classify temperature status based on room thresholds
 * @param {number} tempCelsius - Current temperature reading
 * @param {number} optimalTemp - Optimal/target temperature for the room
 * @param {number} tempStart - Minimum acceptable temperature (lower bound)
 * @param {number} tempEnd - Maximum acceptable temperature (upper bound)
 * @returns {string} Status: 'normal', 'warning', 'critical', or 'danger'
 */
function classifyStatus(tempCelsius, optimalTemp, tempStart, tempEnd) {
  // Calculate midpoints for warning bands
  const midpointLow = (optimalTemp + tempStart) / 2;
  const midpointHigh = (optimalTemp + tempEnd) / 2;

  // Check if within valid range [tempStart, tempEnd]
  if (tempCelsius >= tempStart && tempCelsius <= tempEnd) {
    // Inside range: check if in central (normal) band or edge (warning) bands
    if (tempCelsius >= midpointLow && tempCelsius <= midpointHigh) {
      return "normal";
    } else {
      return "warning";
    }
  }

  // Outside range: determine severity
  const distanceOutside =
    tempCelsius < tempStart ? tempStart - tempCelsius : tempCelsius - tempEnd;

  if (distanceOutside >= 2.0) {
    return "danger";
  } else {
    return "critical";
  }
}

module.exports = {
  classifyStatus,
};
