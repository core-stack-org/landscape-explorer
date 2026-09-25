import { finiteMeasurement } from "./geolibreStyleUtils";

export const DROUGHT_INTENSITY_CLASSES = [
  ["No drought", "#e5f5e0"], ["Mild drought", "#fee08b"],
  ["Moderate drought", "#f46d43"], ["Severe drought", "#a50026"],
];
const intensityNames = DROUGHT_INTENSITY_CLASSES.map(([name]) => name);
const yearKeys = (properties, pattern) => [...new Set(Object.keys(properties)
  .map(key => key.match(pattern)?.[1]).filter(Boolean))].sort();

const weeklyClasses = value => {
  let labels = value;
  if (typeof labels === "string") {
    try { labels = JSON.parse(labels); } catch { return null; }
  }
  return Array.isArray(labels) && labels.length > 0
    && labels.every(label => Number.isInteger(label) && label >= 0 && label < intensityNames.length)
    ? labels : null;
};

// Peak is a presentation summary of the published weekly classes, not a new
// drought-declaration threshold. Missing or malformed records stay missing.
export const withDroughtIntensity = data => ({
  ...data,
  features: (data?.features || []).map(feature => {
    const properties = { ...feature.properties };
    const years = yearKeys(properties, /^drlb_(\d{4})$/);
    let peak = -1;
    for (const year of years) {
      const labels = weeklyClasses(properties[`drlb_${year}`]);
      const annualPeak = labels ? Math.max(...labels) : -1;
      properties[`drought_peak_${year}`] = annualPeak >= 0 ? intensityNames[annualPeak] : null;
      if (annualPeak >= 0) peak = Math.max(peak, annualPeak);
    }
    properties.drought_peak_intensity = peak >= 0 ? intensityNames[peak] : null;
    return { ...feature, properties };
  }),
});

export const DROUGHT_IMPACT_CLASSES = [
  ["No recorded moderate/severe pathway", "#e5e7eb"],
  ["Moderate: VCI Fair/Good, MAI Severe, cropped area Severe", "#e69f00"],
  ["Moderate: VCI Poor, MAI Moderate/Mild, cropped area Severe", "#009e73"],
  ["Moderate: VCI Poor, MAI Severe, cropped area Moderate/Mild", "#0072b2"],
  ["Severe: VCI Poor, MAI Severe, cropped area Severe", "#cc79a7"],
  ["Mixed / tied pathways", "#8c6d31"],
];
const impactNames = DROUGHT_IMPACT_CLASSES.map(([name]) => name);

// Verified against getWeekVector in computing/drought/drought_causality.py.
// Within each group of three paths, the trigger changes (dry spell / rainfall
// deviation / SPI); the impact combination stays the same.
export const droughtPathImpact = key => {
  const match = key.match(/^(moderate|severe)_drought_path(\d+)$/);
  if (!match) return null;
  const path = Number(match[2]);
  if (match[1] === "severe") return path >= 1 && path <= 3 ? 4 : null;
  return path >= 1 && path <= 18 ? Math.ceil(path / 6) : null;
};
const readPathScores = value => {
  let record = value;
  if (typeof record === "string") {
    try { record = JSON.parse(record); } catch { return null; }
  }
  if (!record || typeof record !== "object" || Array.isArray(record)) return null;
  const scores = [0, 0, 0, 0, 0];
  for (const [key, raw] of Object.entries(record)) {
    const group = droughtPathImpact(key);
    const count = finiteMeasurement(raw);
    // Unknown keys make the record uninterpretable, rather than silently
    // assigning a known but potentially weaker pathway as the dominant one.
    if (group === null || count === null || count < 0 || !Number.isInteger(count)) return null;
    scores[group] += count;
  }
  return scores;
};
const dominantImpact = scores => {
  const max = Math.max(...scores);
  if (!max) return impactNames[0];
  const winners = scores.map((value, index) => value === max ? index : -1).filter(index => index >= 0);
  return winners.length === 1 ? impactNames[winners[0]] : impactNames[5];
};

export const withDroughtImpact = data => ({
  ...data,
  features: (data?.features || []).map(feature => {
    const properties = { ...feature.properties };
    const years = yearKeys(properties, /^se_mo_(\d{4})$/);
    const validYears = [];
    const totals = [0, 0, 0, 0, 0];
    for (const year of years) {
      const scores = readPathScores(properties[`se_mo_${year}`]);
      properties[`drought_impact_${year}`] = scores ? dominantImpact(scores) : null;
      if (scores) {
        validYears.push(year);
        scores.forEach((count, i) => { totals[i] += count; });
      }
    }
    properties.drought_dominant_impact = validYears.length ? dominantImpact(totals) : null;
    return { ...feature, properties };
  }),
});
