/**
 * Pattern intensity: per-MWS count of how many selected patterns each MWS matches.
 * Used to style MWS polygons (green = safe, red = high stress).
 */

/**
 * Check if a single data row matches a single condition.
 * @param {Object} item - dataJson row (has mws_id and filter keys)
 * @param {Object} condition - { key, type, value } (value may be { lower, upper } for type 2)
 */
function itemMatchesCondition(item, condition) {
  if (!item || !condition || item[condition.key] === undefined) return false;
  if (condition.type === 1) return item[condition.key] === condition.value;
  if (condition.type === 2) {
    const v = Number(item[condition.key]);
    if (isNaN(v)) return false;
    return v >= condition.value.lower && v <= condition.value.upper;
  }
  if (condition.type === 3) return item[condition.key] != condition.value;
  return false;
}

/**
 * Check if a data row matches any condition of a pattern (OR within pattern).
 */
function itemMatchesPattern(item, pattern) {
  if (!pattern?.conditions?.length) return false;
  return pattern.conditions.some((c) => itemMatchesCondition(item, c));
}

/**
 * For each MWS, count how many selected patterns it matches (any row for that MWS).
 * @param {Array} dataJson - list of { mws_id, ... }
 * @param {Object} selectedMWSPatterns - { patternName: { conditions: [...] } }
 * @returns {Object} { mws_id: number } pattern count per MWS
 */
export function getPatternCountByMws(dataJson, selectedMWSPatterns) {
  const counts = {};
  if (!Array.isArray(dataJson) || !selectedMWSPatterns) return counts;

  const entries = Object.entries(selectedMWSPatterns).filter(([, p]) => p);
  if (entries.length === 0) return counts;

  // Per pattern: set of mws_id that match (OR over conditions, any row)
  const mwsIdsByPattern = entries.map(([, pattern]) => {
    const set = new Set();
    dataJson.forEach((item) => {
      if (!item?.mws_id) return;
      if (itemMatchesPattern(item, pattern)) set.add(item.mws_id);
    });
    return set;
  });

  // All MWS ids that appear in data or in any pattern set
  const allMwsIds = new Set();
  dataJson.forEach((item) => item?.mws_id && allMwsIds.add(item.mws_id));

  allMwsIds.forEach((mwsId) => {
    counts[mwsId] = mwsIdsByPattern.filter((set) => set.has(mwsId)).length;
  });

  return counts;
}

/**
 * Interpolate color from green (safe) -> yellow/orange -> red (high stress).
 * @param {number} count - pattern count for this MWS
 * @param {number} maxCount - max count in current set (for normalization)
 * @returns {string} rgba fill color
 */
export function patternIntensityColor(count, maxCount) {
  if (maxCount <= 0) return "rgba(34, 197, 94, 0.5)"; // green default
  const t = maxCount === 0 ? 0 : Math.min(1, count / maxCount);
  // Green (34,197,94) -> Yellow (234,179,8) -> Red (220,38,38)
  let r, g, b;
  if (t <= 0.5) {
    const s = t * 2; // 0..1
    r = Math.round(34 + (234 - 34) * s);
    g = Math.round(197 + (179 - 197) * s);
    b = Math.round(94 + (8 - 94) * s);
  } else {
    const s = (t - 0.5) * 2;
    r = Math.round(234 + (220 - 234) * s);
    g = Math.round(179 + (38 - 179) * s);
    b = Math.round(8 + (38 - 8) * s);
  }
  return `rgba(${r},${g},${b},0.55)`;
}
