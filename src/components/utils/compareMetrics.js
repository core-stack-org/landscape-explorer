const TIE_THRESHOLD = 3;

const METRIC_CONFIG = {
  rainfall: {
    unit: "mm",
    preferredKeys: [
      "avg_precipitation",
      "avg_rainfall",
      "rainfall",
      "precipitation",
    ],
    includeKeywords: ["rain", "precip"],
    excludeKeywords: ["drought"],
    higherIsBetter: true,
  },
  crops: {
    unit: "index",
    preferredKeys: [
      "avg_ndvi",
      "ndvi",
      "crop_health",
      "vegetation_index",
      "avg_double_cropped",
    ],
    includeKeywords: ["ndvi", "crop", "vegetation"],
    excludeKeywords: ["drought"],
    higherIsBetter: true,
  },
  water: {
    unit: "index",
    preferredKeys: [
      "water_level",
      "avg_water_level",
      "groundwater_level",
      "delta_g",
      "avg_rabi_surface_water_mws",
      "avg_zaid_surface_water_mws",
      "stage_of_groundwater_extraction",
    ],
    includeKeywords: ["water", "ground", "aquifer", "well", "delta_g"],
    excludeKeywords: ["body_size"],
    higherIsBetter: true,
  },
};

const lowerIsBetterIndicators = [
  "stress",
  "depletion",
  "decline",
  "extraction",
  "depth",
  "scarcity",
];

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const prettifyKey = (key) =>
  key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();

const getVillageName = (village, fallback = "Unknown") =>
  village?.village_name ||
  village?.vill_name ||
  village?.name ||
  village?.village ||
  fallback;

const gatherCandidateKeys = (records) => {
  const keys = new Set();
  records.forEach((record) => {
    if (!record || typeof record !== "object") return;
    Object.keys(record).forEach((key) => keys.add(key));
  });
  return Array.from(keys);
};

const keyScore = (key, config, records) => {
  const lower = key.toLowerCase();

  if (lower.includes("name") || lower.includes("id")) return -100;

  let score = 0;
  let hasMetricSignal = false;

  if (config.preferredKeys.includes(lower)) {
    score += 100;
    hasMetricSignal = true;
  }

  config.includeKeywords.forEach((kw) => {
    if (lower.includes(kw)) {
      score += 18;
      hasMetricSignal = true;
    }
  });

  config.excludeKeywords.forEach((kw) => {
    if (lower.includes(kw)) score -= 25;
  });

  let numericCount = 0;
  let min = Infinity;
  let max = -Infinity;

  records.forEach((record) => {
    const value = toNumber(record?.[key]);
    if (value === null) return;
    numericCount += 1;
    min = Math.min(min, value);
    max = Math.max(max, value);
  });

  const coverage = records.length ? numericCount / records.length : 0;
  score += coverage * 20;

  if (numericCount >= 2 && max > min) score += 10;

  if (coverage < 0.4) score -= 35;

  // Guardrail: reject generic numeric fields (e.g. total_population)
  // unless the key has explicit metric signal for this category.
  if (!hasMetricSignal) return -100;

  return score;
};

const pickBestKey = (records, config) => {
  const keys = gatherCandidateKeys(records);
  if (!keys.length) return null;

  let bestKey = null;
  let bestScore = -Infinity;

  keys.forEach((key) => {
    const score = keyScore(key, config, records);
    if (score > bestScore) {
      bestScore = score;
      bestKey = key;
    }
  });

  return bestScore > 20 ? bestKey : null;
};

const resolveDirection = (metricType, key, defaultHigher) => {
  if (metricType !== "water" || !key) return defaultHigher;

  const lower = key.toLowerCase();
  const hasNegativeSignal = lowerIsBetterIndicators.some((token) =>
    lower.includes(token)
  );

  return !hasNegativeSignal;
};

const normalizeScore = (value, min, max, higherIsBetter) => {
  if (value === null || min === null || max === null) return null;
  if (max === min) return 50;

  const ratio = (value - min) / (max - min);
  const base = higherIsBetter ? ratio : 1 - ratio;
  return Math.max(0, Math.min(100, base * 100));
};

const winnerLabel = (scoreA, scoreB) => {
  if (scoreA === null || scoreB === null) return "insufficient";

  const diff = scoreA - scoreB;
  if (Math.abs(diff) < TIE_THRESHOLD) return "tie";

  return diff > 0 ? "a_better" : "b_better";
};

const formatValue = (value) => {
  if (value === null) return "NA";
  if (Math.abs(value) >= 100) return value.toFixed(0);
  return value.toFixed(2);
};

export const buildVillageComparison = ({ villages, villageAId, villageBId }) => {
  const allVillages = Array.isArray(villages) ? villages : [];

  if (!villageAId || !villageBId) {
    return {
      ready: false,
      reasonKey: "regionComparison.messages.selectValidVillages",
    };
  }

  if (String(villageAId) === String(villageBId)) {
    return {
      ready: false,
      reasonKey: "regionComparison.messages.selectDifferentVillages",
    };
  }

  const villageA = allVillages.find(
    (v) => String(v.village_id) === String(villageAId)
  );
  const villageB = allVillages.find(
    (v) => String(v.village_id) === String(villageBId)
  );

  if (!villageA || !villageB) {
    return {
      ready: false,
      reasonKey: "regionComparison.messages.selectValidVillages",
    };
  }

  const villageAName = getVillageName(villageA, "Village A");
  const villageBName = getVillageName(villageB, "Village B");

  const metrics = Object.entries(METRIC_CONFIG).map(([type, config]) => {
    const key = pickBestKey(allVillages, config);

    if (!key) {
      return {
        type,
        key: null,
        valueA: null,
        valueB: null,
        scoreA: null,
        scoreB: null,
        winnerCode: "insufficient",
        unit: config.unit,
      };
    }

    const higherIsBetter = resolveDirection(type, key, config.higherIsBetter);

    const numericValues = allVillages
      .map((v) => toNumber(v?.[key]))
      .filter((value) => value !== null);

    const min = numericValues.length ? Math.min(...numericValues) : null;
    const max = numericValues.length ? Math.max(...numericValues) : null;

    const valueA = toNumber(villageA[key]);
    const valueB = toNumber(villageB[key]);
    const scoreA = normalizeScore(valueA, min, max, higherIsBetter);
    const scoreB = normalizeScore(valueB, min, max, higherIsBetter);

    const winnerCode = winnerLabel(scoreA, scoreB);

    return {
      type,
      key,
      keyLabel: prettifyKey(key),
      valueA,
      valueB,
      scoreA,
      scoreB,
      winnerCode,
      unit: config.unit,
      higherIsBetter,
    };
  });

  return {
    ready: true,
    villageAName,
    villageBName,
    metrics,
    summary: {
      water:
        metrics.find((metric) => metric.type === "water")?.winnerCode ||
        "insufficient",
      crops:
        metrics.find((metric) => metric.type === "crops")?.winnerCode ||
        "insufficient",
      rainfall:
        metrics.find((metric) => metric.type === "rainfall")?.winnerCode ||
        "insufficient",
    },
  };
};

export { formatValue, getVillageName };
