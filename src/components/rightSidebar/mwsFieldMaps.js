import { FILTER_BY_NAME } from '../utils/filtersIndex.js';

export function isValid(v) {
  return v !== null && v !== undefined && Number.isFinite(Number(v)) && Number(v) > -1;
}

// Same matching rule as styleRegistry.js's findBin: exact match on `value`
// bins (int codes), range match on `lower`/`upper` bins (binned numerics).
// First match wins — bins are checked in declared order.
export function findBin(filterName, value) {
  if (!isValid(value)) return null;
  const filter = FILTER_BY_NAME.get(filterName);
  if (!filter?.bins) return null;
  return filter.bins.find((b) =>
    b.value !== undefined ? String(b.value) === String(value) : Number(value) >= b.lower && Number(value) <= b.upper
  ) ?? null;
}

// Bin labels encode their band word in three different shapes in Filters.json:
//   "Medium (280-560 kg/ha)"   — word, then range in parens
//   "<5%: Minimal"             — range, then word, colon-separated
//   "Arid: <740 mm"            — word, then range, colon-separated
//   "Safe" / "Hard rock"       — already just the word
// Pick whichever side has no digits; a plain word label passes through as-is.
export function bandWord(filterName, value) {
  const bin = findBin(filterName, value);
  if (!bin) return null;
  const label = bin.label;

  const parenMatch = label.match(/^(.+?)\s*\(/);
  if (parenMatch) return parenMatch[1].trim();

  if (label.includes(':')) {
    const [a, b] = label.split(':').map((s) => s.trim());
    const aHasDigit = /\d/.test(a);
    const bHasDigit = /\d/.test(b);
    if (!aHasDigit && bHasDigit) return a;
    if (aHasDigit && !bHasDigit) return b;
  }

  return label.trim();
}

// For a plain numeric-range bin with no short word in its label (e.g. avg_runoff's
// "Less than 100mm" / "Between 100mm to 300mm" / "More than 300mm"), a terse
// "100-300" reads better inline than the full sentence. Built from the bin's
// own lower/upper — never invented — and only used when bandWord found no word.
export function bandRange(filterName, value) {
  const filter = FILTER_BY_NAME.get(filterName);
  const bin = findBin(filterName, value);
  if (!filter?.bins || !bin || bin.lower === undefined) return null;
  const isFirst = bin === filter.bins[0];
  const isLast = bin === filter.bins[filter.bins.length - 1];
  if (isFirst) return `<${bin.upper}`;
  if (isLast) return `>${bin.lower}`;
  return `${bin.lower}-${bin.upper}`;
}

// Short caption for a tile/row: the band word when the label actually has
// one, otherwise the lower-upper range as a last resort.
export function bandCaption(filterName, value) {
  const bin = findBin(filterName, value);
  if (!bin) return null;
  const word = bandWord(filterName, value);
  return word !== bin.label ? word : bandRange(filterName, value);
}

// Ordinal severity colour for a status dot, by the bin's position among its
// siblings rather than its own (map-only, contrast-failing) rgba — kyl-sidebar
// plan §6: "map the bin index to the tokens there rather than copying its colours."
const SEVERITY_SCALE = ['#1B6A00', '#CC6B00', '#B91C1C'];
const NEUTRAL_COLOR = '#A9A9A9';
export function severityColor(filterName, value) {
  const filter = FILTER_BY_NAME.get(filterName);
  const bin = findBin(filterName, value);
  if (!filter?.bins || !bin) return null;
  if (/not assessed/i.test(bin.label)) return NEUTRAL_COLOR;
  const index = filter.bins.indexOf(bin);
  const steps = filter.bins.length - 1 || 1;
  const t = index / steps;
  return SEVERITY_SCALE[Math.round(t * (SEVERITY_SCALE.length - 1))];
}

