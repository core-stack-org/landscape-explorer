const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function getConfidenceLevel(conf) {
  if (conf == null) return null;
  if (conf > 0.7) return 'High';
  if (conf >= 0.5) return 'Medium';
  return 'Low';
}

// The API returns cropStartDate/cropEndDate as dd/mm/yyyy — `new Date(str)`
// parses that as mm/dd/yyyy (US format) and silently swaps day and month, so
// dd/mm/yyyy strings are parsed explicitly here. Anything else (e.g. an
// unambiguous yyyy-mm-dd from the monthly series) falls back to native
// Date parsing.
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

export function monthKey(dateStr) {
  const d = parseFlexibleDate(dateStr);
  if (!d) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Agri year runs Jun (startYear) through Jul (startYear + 1) — 14 month slots.
// `agriYear` is the label from the annual record, e.g. "2025-26".
export function buildAgriYearMonths(agriYear) {
  const startYear = parseInt(String(agriYear).split('-')[0], 10);
  if (Number.isNaN(startYear)) return [];

  const slots = [];
  for (let i = 0; i < 14; i++) {
    const monthNum = (5 + i) % 12; // 5 = June (0-indexed)
    const calendarYear = startYear + Math.floor((5 + i) / 12);
    slots.push({
      key: `${calendarYear}-${String(monthNum + 1).padStart(2, '0')}`,
      label: MONTH_NAMES[monthNum],
      calendarYear,
      monthIndex: i,
      // The Jun/Jul wrap at the end repeats month names already used at the
      // start of the array, so tag those with a short year suffix.
      displayLabel: i >= 12 ? `${MONTH_NAMES[monthNum]} '${String(calendarYear).slice(-2)}` : MONTH_NAMES[monthNum],
    });
  }
  return slots;
}

export function buildMonthlyLookup(monthlyRows) {
  const lookup = new Map();
  (monthlyRows || []).forEach((row) => {
    const key = monthKey(row.date);
    if (key) lookup.set(key, row);
  });
  return lookup;
}
