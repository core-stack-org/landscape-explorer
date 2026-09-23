import { finiteMeasurement } from "./geolibreStyleUtils";

export const DROUGHT_INTENSITY_CLASSES = [
  ["None", "#e5f5e0"], ["Mild", "#fee08b"],
  ["Moderate", "#f46d43"], ["Severe", "#a50026"],
];
const intensityNames = DROUGHT_INTENSITY_CLASSES.map(([name]) => name);
const prefixes = ["w_no", "w_mld", "w_mod", "w_sev"];
const yearKeys = (properties, pattern) => [...new Set(Object.keys(properties)
  .map(key => key.match(pattern)?.[1]).filter(Boolean))].sort();

// Peak is a presentation summary of the published weekly classes, not a new
// drought-declaration threshold. Never interpret missing counts as zero.
export const withDroughtIntensity = data => ({
  ...data,
  features: (data?.features || []).map(feature => {
    const properties = { ...feature.properties };
    const years = yearKeys(properties, /^w_(?:no|mld|mod|sev)_(\d{4})$/);
    const validYears = [];
    let peak = -1;
    for (const year of years) {
      const counts = prefixes.map(prefix => finiteMeasurement(properties[`${prefix}_${year}`]));
      const valid = counts.every(n => n !== null && Number.isInteger(n) && n >= 0)
        && counts.some(n => n > 0);
      const annualPeak = valid ? counts.reduce((highest, n, i) => n > 0 ? i : highest, -1) : -1;
      properties[`drought_peak_${year}`] = valid ? intensityNames[annualPeak] : null;
      properties[`drought_stress_weeks_${year}`] = valid ? counts[2] + counts[3] : null;
      if (valid) { validYears.push(year); peak = Math.max(peak, annualPeak); }
    }
    properties.drought_peak_intensity = peak >= 0 ? intensityNames[peak] : null;
    properties.drought_observed_years = validYears.join(", ");
    properties.drought_year_count = validYears.length;
    return { ...feature, properties };
  }),
});
