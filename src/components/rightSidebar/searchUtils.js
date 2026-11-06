export const SEARCH_THRESHOLD = 10;
export const LETTER_HEADER_THRESHOLD = 30;

// Built once per items array, not per keystroke.
export function buildSearchIndex(items, getLabel) {
  return items.map((item) => ({ item, label: getLabel(item), lower: getLabel(item).toLowerCase() }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function filterIndex(index, query) {
  const q = query.trim().toLowerCase();
  if (!q) return index;
  return index.filter((entry) => entry.lower.includes(q));
}

export function letterOf(label) {
  const first = label.trim().charAt(0).toUpperCase();
  return /[A-Z]/.test(first) ? first : '#';
}

export function groupByLetter(index) {
  const groups = [];
  index.forEach((entry) => {
    const letter = letterOf(entry.label);
    const last = groups[groups.length - 1];
    if (last && last.letter === letter) last.entries.push(entry);
    else groups.push({ letter, entries: [entry] });
  });
  return groups;
}

// Substring match is highlighted in place; returns segments for rendering.
export function highlightSegments(label, query) {
  const q = query.trim();
  if (!q) return [{ text: label, match: false }];
  const idx = label.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return [{ text: label, match: false }];
  return [
    { text: label.slice(0, idx), match: false },
    { text: label.slice(idx, idx + q.length), match: true },
    { text: label.slice(idx + q.length), match: false },
  ].filter((s) => s.text.length > 0);
}
