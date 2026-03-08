/**
 * For each MWS, counts how many selected patterns it matches (OR within pattern).
 * Used for pattern intensity map: green (0) → yellow/orange → red (max).
 * @param {Array} dataJson - MWS data rows (each with mws_id and indicator keys)
 * @param {Object} selectedMWSPatterns - { patternName: { conditions: [{ type, key, value }] } }
 * @returns {Object} { mws_id: number } pattern count per MWS
 */
export function getPatternCountByMws(dataJson, selectedMWSPatterns) {
  const counts = {};
  if (!dataJson || !Array.isArray(dataJson) || !selectedMWSPatterns) return counts;

  const patternNames = Object.keys(selectedMWSPatterns);
  if (patternNames.length === 0) {
    dataJson.forEach((item) => {
      if (item && item.mws_id != null) counts[item.mws_id] = 0;
    });
    return counts;
  }

  dataJson.forEach((item) => {
    if (!item || item.mws_id == null) return;
    let count = 0;
    patternNames.forEach((patternName) => {
      const pattern = selectedMWSPatterns[patternName];
      if (!pattern || !Array.isArray(pattern.conditions)) return;
      const matchesPattern = pattern.conditions.some((condition) => {
        if (condition.type === 1) return item[condition.key] === condition.value;
        if (condition.type === 2)
          return (
            item[condition.key] >= condition.value.lower &&
            item[condition.key] <= condition.value.upper
          );
        if (condition.type === 3) return item[condition.key] != condition.value;
        return false;
      });
      if (matchesPattern) count += 1;
    });
    counts[item.mws_id] = count;
  });
  return counts;
}

/**
 * Interpolate color from green (0) → yellow/orange (0.5) → red (1).
 * @param {number} t - 0 to 1
 * @returns {string} rgba color
 */
export function patternIntensityColor(t) {
  if (t <= 0) return "rgba(34, 197, 94, 0.75)";   // green - safe
  if (t >= 1) return "rgba(220, 38, 38, 0.75)";   // red - high stress
  if (t <= 0.5) {
    const s = t * 2; // 0..1 over first half
    const r = Math.round(34 + (234 - 34) * s);
    const g = Math.round(197 + (179 - 197) * s);
    const b = Math.round(94 + (44 - 94) * s);
    return `rgba(${r}, ${g}, ${b}, 0.75)`;
  }
  const s = (t - 0.5) * 2; // 0..1 over second half
  const r = Math.round(234 + (220 - 234) * s);
  const g = Math.round(179 + (38 - 179) * s);
  const b = Math.round(44 + (38 - 44) * s);
  return `rgba(${r}, ${g}, ${b}, 0.75)`;
}
