import { useEffect, useMemo, useState } from 'react';
import {
  SEARCH_THRESHOLD, LETTER_HEADER_THRESHOLD,
  buildSearchIndex, filterIndex, groupByLetter, highlightSegments,
} from './searchUtils';
import { colorBorder, colorHairline, colorInk, colorMuted, colorRowAlt, colorPrimary } from './sidebarTokens';

// Fixed max-height with internal scroll: the card keeps the same size at 13
// entries as at 300, so the panel never grows with the data.
export default function SearchableList({
  items,
  total,
  getLabel,
  renderRow,
  maxHeight = 296,
  searchPlaceholder = 'Search',
  emptyText = 'Nothing to show.',
  itemKey,
}) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 120);
    return () => clearTimeout(t);
  }, [query]);

  const index = useMemo(() => buildSearchIndex(items, getLabel), [items, getLabel]);
  const matches = useMemo(() => filterIndex(index, debounced), [index, debounced]);
  const showSearch = total > SEARCH_THRESHOLD;
  const showLetters = total > LETTER_HEADER_THRESHOLD && !debounced.trim();

  const groups = showLetters ? groupByLetter(matches) : [{ letter: null, entries: matches }];

  return (
    <div>
      {showSearch && (
        <div className="mb-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="w-full text-[12px] rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2"
            style={{ border: `1px solid ${colorBorder}`, color: colorInk }}
          />
          {debounced.trim() && (
            <p className="text-[11px] mt-1" style={{ color: colorMuted }} aria-live="polite">
              {matches.length} of {total} match
            </p>
          )}
        </div>
      )}

      <div className="overflow-y-auto pr-1" style={{ maxHeight }}>
        {matches.length === 0 ? (
          <p className="text-[12px] py-4 text-center" style={{ color: colorMuted }}>
            {debounced.trim() ? `No matches for "${debounced.trim()}".` : emptyText}
          </p>
        ) : (
          groups.map((group) => (
            <div key={group.letter ?? 'all'}>
              {group.letter && (
                <div
                  className="sticky top-0 text-[10px] font-bold px-1 py-0.5"
                  style={{ background: colorRowAlt, color: colorPrimary }}
                >
                  {group.letter}
                </div>
              )}
              <ul className="list-none p-0 m-0">
                {group.entries.map((entry) => (
                  <li key={itemKey ? itemKey(entry.item) : entry.label} style={{ borderBottom: `1px solid ${colorHairline}` }}>
                    {renderRow(entry.item, highlightSegments(entry.label, debounced))}
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
