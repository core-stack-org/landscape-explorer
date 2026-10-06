export const AGRI_MONTHS = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
export const DRY_MAI_THRESHOLD = 0.5;

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

// Position within the agri year on a 0–12 scale, so a date at the very start of
// July is 0 and the last day of June is just under 12.
export function fracPosition(date) {
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return agriMonthIndex(date) + (date.getDate() - 1) / daysInMonth;
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
    const crop = hasText(record.crop1) ? record.crop1.trim() : null;
    const sow = parseFlexibleDate(record.cropStartDate);
    const harvest = parseFlexibleDate(record.cropEndDate);
    const hasCycle = crop !== null && sow !== null && harvest !== null && harvest.getTime() >= sow.getTime();

    const startFrac = hasCycle ? Math.min(12, Math.max(0, fracPosition(sow))) : null;
    const endFrac = hasCycle ? Math.min(12, Math.max(0, fracPosition(harvest))) : null;
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
      sowBeforeWindow: hasCycle && sow < new Date(Number(record.year), 6, 1),
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
    point.aet = isValid(row.aet) ? Number(row.aet) : null;
    point.pet = isValid(row.pet) ? Number(row.pet) : null;
    point.mai = isValid(row.mai) ? Number(row.mai) : null;
  });

  return [...byYear.entries()]
    .sort(([a], [b]) => a - b)
    .map(([year, points]) => ({ year, yearLabel: agriYearLabel(year), points }));
}

// Dry means strictly below the threshold. Invalid months are never counted as
// dry, and validMonths lets the chart tell "no data" apart from "zero dry months".
export function countDryMonths(monthly, threshold = DRY_MAI_THRESHOLD) {
  return monthlyPointsByYear(monthly).map(({ year, yearLabel, points }) => {
    const valid = points.filter((p) => p.mai !== null);
    const dry = valid.filter((p) => p.mai < threshold);
    return {
      year,
      yearLabel,
      count: valid.length === 0 ? null : dry.length,
      validMonths: valid.length,
      dryMonths: dry.map((p) => p.label),
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
