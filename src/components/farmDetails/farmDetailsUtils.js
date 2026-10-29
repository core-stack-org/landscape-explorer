export const AGRI_MONTHS = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
export const DRY_MAI_THRESHOLD = 0.5;
// Severe is MAI 0-0.25, moderate is the rest of the dry range, 0.25-0.5.
export const MAI_SEVERE_MAX = 0.25;
export const MAI_MODERATE_MAX = DRY_MAI_THRESHOLD;

// Cropping seasons, as month indices into AGRI_MONTHS (Jul = 0). The three
// ranges exactly partition the 12 months — every month belongs to one and
// only one season, so the three counts always sum to the year's total.
export const SEASONS = {
  Kharif: [0, 1, 2, 3], // Jul-Oct
  Rabi: [4, 5, 6, 7], // Nov-Feb
  Zaid: [8, 9, 10, 11], // Mar-Jun
};

export function isValid(v) {
  return v !== null && v !== undefined && Number.isFinite(Number(v)) && Number(v) > -1;
}

export function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

// The API sends dd/mm/yyyy for crop dates; `new Date(str)` would read that as
// mm/dd/yyyy and swap day and month. Monthly dates are ISO and fall through.
export function parseFlexibleDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(value).trim());
  if (dmy) {
    const [, day, month, year] = dmy;
    const d = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(value) {
  const d = parseFlexibleDate(value);
  if (!d) return '--';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function agriYearLabel(year) {
  return `${year}–${String(Number(year) + 1).slice(-2)}`;
}

// July = 0 … June = 11.
export function agriMonthIndex(date) {
  return (date.getMonth() - 6 + 12) % 12;
}

// Position of `date` within the named agri year's own window (Jul
// windowStartYear – Jun windowStartYear+1), on a 0–12 scale. Measured from
// that window's own July 1st rather than from the date's calendar month
// alone, so a date that has rolled into the following window returns a
// value above 12 instead of wrapping back near 0 — a cycle whose harvest
// spills past its year's edge can then be clamped at the edge, not drawn
// backwards with a negative-width bar.
export function fracPosition(date, windowStartYear) {
  const windowStart = new Date(windowStartYear, 6, 1);
  const monthIndex = (date.getFullYear() - windowStart.getFullYear()) * 12 + (date.getMonth() - windowStart.getMonth());
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return monthIndex + (date.getDate() - 1) / daysInMonth;
}

export function getConfidenceLevel(conf) {
  if (conf === null || conf === undefined || !Number.isFinite(Number(conf))) return null;
  if (Number(conf) > 0.7) return 'High';
  if (Number(conf) >= 0.5) return 'Medium';
  return 'Low';
}

export function sortedByYear(rows) {
  return [...(rows || [])].sort((a, b) => Number(a.year) - Number(b.year));
}

// One row per agri year, oldest first. A year with no crop keeps its row with
// crop: null so the gap is visible. A cycle without both valid dates has no
// bar. Dates outside the year's own window are clamped to its edges.
export function buildCroppingHistory(annual) {
  return sortedByYear(annual).map((record) => {
    // NO_PREDICTION means no cultivation was detected — it's a gap, not a
    // named crop. UNKNOWN_CROP means cultivation happened but didn't match a
    // known class, so it still gets a bar, just an unidentified one.
    const rawCrop = hasText(record.crop1) ? record.crop1.trim() : null;
    const crop = rawCrop && rawCrop.toUpperCase() !== 'NO_PREDICTION' ? rawCrop : null;
    const sow = parseFlexibleDate(record.cropStartDate);
    const harvest = parseFlexibleDate(record.cropEndDate);
    const hasCycle = crop !== null && sow !== null && harvest !== null && harvest.getTime() >= sow.getTime();

    const windowStartYear = Number(record.year);
    const rawStartFrac = hasCycle ? fracPosition(sow, windowStartYear) : null;
    const rawEndFrac = hasCycle ? fracPosition(harvest, windowStartYear) : null;
    const startFrac = hasCycle ? Math.min(12, Math.max(0, rawStartFrac)) : null;
    const endFrac = hasCycle ? Math.min(12, Math.max(0, rawEndFrac)) : null;
    const days = hasCycle ? Math.round((harvest - sow) / 86400000) : null;

    return {
      year: Number(record.year),
      yearLabel: agriYearLabel(record.year),
      crop,
      confidence: getConfidenceLevel(record.conf1),
      sowDate: sow,
      harvestDate: harvest,
      days,
      startFrac,
      endFrac,
      // Unclamped: lets a consumer place the part of this same cycle that
      // spilled into the previous or next row, on that row's own 0-12 scale
      // (shift by ±12, since adjacent windows are exactly a year apart).
      rawStartFrac,
      rawEndFrac,
      // True when the raw (unclamped) position fell outside this row's own
      // window, so the drawn bar is a clamped view of a cycle that really
      // started earlier, or ends later, than this row's span.
      sowBeforeWindow: hasCycle && rawStartFrac < 0,
      harvestAfterWindow: hasCycle && rawEndFrac > 12,
    };
  });
}

// Points are ordered July..June with null for any invalid value, so a gap in
// the data breaks the line rather than being drawn as zero.
export function monthlyPointsByYear(monthly) {
  const byYear = new Map();
  (monthly || []).forEach((row) => {
    const date = parseFlexibleDate(row.date);
    if (!date) return;
    const year = Number(row.year);
    if (!byYear.has(year)) {
      byYear.set(year, Array.from({ length: 12 }, (_, i) => ({
        monthIndex: i,
        label: AGRI_MONTHS[i],
        aet: null,
        pet: null,
        mai: null,
      })));
    }
    const idx = agriMonthIndex(date);
    const point = byYear.get(year)[idx];
    // aet/pet arrive as mm/day; multiply by the days in that calendar month
    // to get the monthly total the chart plots.
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    point.aet = isValid(row.aet) ? Number(row.aet) * daysInMonth : null;
    point.pet = isValid(row.pet) ? Number(row.pet) * daysInMonth : null;
    point.mai = isValid(row.mai) ? Number(row.mai) : null;
  });

  return [...byYear.entries()]
    .sort(([a], [b]) => a - b)
    .map(([year, points]) => ({ year, yearLabel: agriYearLabel(year), points }));
}

// Dry means strictly below the threshold. Invalid months are never counted as
// dry, and validMonths lets the chart tell "no data" apart from "zero dry months".
// bySeason splits the same count across Kharif/Rabi/Zaid for the stacked
// chart; it always sums back to `count` since SEASONS fully partitions the year.
export function countDryMonths(monthly, threshold = DRY_MAI_THRESHOLD) {
  return monthlyPointsByYear(monthly).map(({ year, yearLabel, points }) => {
    const valid = points.filter((p) => p.mai !== null);
    const dry = valid.filter((p) => p.mai < threshold);
    const dryBySeasonEntries = Object.entries(SEASONS).map(([season, indices]) => [
      season,
      dry.filter((p) => indices.includes(p.monthIndex)),
    ]);
    const bySeason = Object.fromEntries(dryBySeasonEntries.map(([season, months]) => [season, months.length]));
    // The names of just that season's own dry months, e.g. Kharif's are only
    // ever drawn from Jul-Oct, so the hover for that segment can say exactly
    // which of its four months were dry, not the whole year's list.
    const dryMonthsBySeason = Object.fromEntries(
      dryBySeasonEntries.map(([season, months]) => [season, months.map((p) => p.label)]),
    );
    return {
      year,
      yearLabel,
      count: valid.length === 0 ? null : dry.length,
      validMonths: valid.length,
      dryMonths: dry.map((p) => p.label),
      dryMonthsBySeason,
      bySeason,
    };
  });
}

function bandBySeason(months) {
  const entries = Object.entries(SEASONS).map(([season, indices]) => [
    season,
    months.filter((p) => indices.includes(p.monthIndex)),
  ]);
  return {
    count: months.length,
    months: months.map((p) => p.label),
    bySeason: Object.fromEntries(entries.map(([season, ms]) => [season, ms.length])),
    monthsBySeason: Object.fromEntries(entries.map(([season, ms]) => [season, ms.map((p) => p.label)])),
  };
}

// Splits the same dry range countDryMonths covers (MAI < 0.5) into two
// severity bands — severe (0-0.25) and moderate (0.25-0.5) — each bucketed
// by season like countDryMonths. moderate/severe are null, not zeroed out,
// for a year with no valid MAI at all, same convention as countDryMonths.count.
export function countStressMonths(monthly) {
  return monthlyPointsByYear(monthly).map(({ year, yearLabel, points }) => {
    const valid = points.filter((p) => p.mai !== null);
    const severe = valid.filter((p) => p.mai <= MAI_SEVERE_MAX);
    const moderate = valid.filter((p) => p.mai > MAI_SEVERE_MAX && p.mai < MAI_MODERATE_MAX);
    return {
      year,
      yearLabel,
      validMonths: valid.length,
      severe: valid.length === 0 ? null : bandBySeason(severe),
      moderate: valid.length === 0 ? null : bandBySeason(moderate),
    };
  });
}

export function average(values) {
  const nums = values.filter((v) => v !== null && v !== undefined && Number.isFinite(v));
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function waterBalanceSummary(record) {
  const aet = isValid(record?.aetAnnual) ? Number(record.aetAnnual) : null;
  const pet = isValid(record?.petAnnual) ? Number(record.petAnnual) : null;
  const mai = isValid(record?.maiAnnual) ? Number(record.maiAnnual) : null;
  if (aet === null || pet === null || pet <= 0) {
    return { aet, pet, mai, percentUsed: null, shortfall: null };
  }
  return {
    aet,
    pet,
    mai,
    percentUsed: Math.round((aet / pet) * 100),
    shortfall: Math.round(pet - aet),
  };
}

export function hectaresToAcres(ha) {
  return Number(ha) * 2.4711;
}
