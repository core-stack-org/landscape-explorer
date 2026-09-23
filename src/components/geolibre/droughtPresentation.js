import { finiteMeasurement } from "./geolibreStyleUtils";

export const DROUGHT_INTENSITY_CLASSES = [
  ["None", "#e5f5e0"], ["Mild", "#fee08b"],
  ["Moderate", "#f46d43"], ["Severe", "#a50026"],
];
const intensityNames = DROUGHT_INTENSITY_CLASSES.map(([name]) => name);
const prefixes = ["w_no", "w_mld", "w_mod", "w_sev"];
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
// drought-declaration threshold. Never interpret missing counts as zero.
export const withDroughtIntensity = data => ({
  ...data,
  features: (data?.features || []).map(feature => {
    const properties = { ...feature.properties };
    const years = yearKeys(properties, /^(?:drlb|frth2|w_(?:no|mld|mod|sev))_(\d{4})$/);
    const validYears = [];
    let peak = -1;
    for (const year of years) {
      const labels = weeklyClasses(properties[`drlb_${year}`]);
      const counts = prefixes.map(prefix => finiteMeasurement(properties[`${prefix}_${year}`]));
      const validCounts = counts.every(n => n !== null && Number.isInteger(n) && n >= 0)
        && counts.some(n => n > 0);
      const annualPeak = labels ? Math.max(...labels)
        : validCounts ? counts.reduce((highest, n, i) => n > 0 ? i : highest, -1) : -1;
      const publishedStressWeeks = finiteMeasurement(properties[`frth2_${year}`]);
      const validPublishedStressWeeks = publishedStressWeeks !== null
        && Number.isInteger(publishedStressWeeks) && publishedStressWeeks >= 0;
      properties[`drought_peak_${year}`] = annualPeak >= 0 ? intensityNames[annualPeak] : null;
      properties[`drought_stress_weeks_${year}`] = validPublishedStressWeeks ? publishedStressWeeks
        : labels ? labels.filter(label => label >= 2).length
        : validCounts ? counts[2] + counts[3] : null;
      if (annualPeak >= 0) { validYears.push(year); peak = Math.max(peak, annualPeak); }
    }
    properties.drought_peak_intensity = peak >= 0 ? intensityNames[peak] : null;
    properties.drought_observed_years = validYears.join(", ");
    properties.drought_year_count = validYears.length;
    return { ...feature, properties };
  }),
});

export const DROUGHT_IMPACT_CLASSES = [
  ["No recorded moderate/severe pathway", "#e5e7eb"],
  ["Crop area + soil moisture stress", "#e69f00"],
  ["Crop area + vegetation stress", "#009e73"],
  ["Soil moisture + vegetation stress", "#0072b2"],
  ["Combined crop, soil and vegetation stress", "#cc79a7"],
  ["Mixed / tied impacts", "#8c6d31"],
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
    properties.drought_impact_observed_years = validYears.join(", ");
    properties.drought_impact_year_count = validYears.length;
    return { ...feature, properties };
  }),
});
