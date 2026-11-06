import { buildSearchIndex, filterIndex, groupByLetter, highlightSegments, letterOf } from './searchUtils';

const villages = ['Ratanpur', 'Bhurkunda', 'Amdih', 'Chandwa', 'bahera'].map((v) => ({ name: v }));
const index = buildSearchIndex(villages, (v) => v.name);

describe('buildSearchIndex', () => {
  it('sorts A to Z case-insensitively', () => {
    expect(index.map((e) => e.label)).toEqual(['Amdih', 'bahera', 'Bhurkunda', 'Chandwa', 'Ratanpur']);
  });
});

describe('filterIndex', () => {
  it('returns everything for an empty or whitespace query', () => {
    expect(filterIndex(index, '')).toHaveLength(5);
    expect(filterIndex(index, '   ')).toHaveLength(5);
  });
  it('matches case-insensitively as a substring', () => {
    expect(filterIndex(index, 'AND').map((e) => e.label)).toEqual(['Chandwa']);
  });
  it('returns an empty array when nothing matches', () => {
    expect(filterIndex(index, 'zzz')).toEqual([]);
  });
});

describe('groupByLetter', () => {
  it('groups consecutive entries under their first letter', () => {
    const groups = groupByLetter(index);
    expect(groups.map((g) => g.letter)).toEqual(['A', 'B', 'C', 'R']);
    expect(groups[1].entries.map((e) => e.label)).toEqual(['bahera', 'Bhurkunda']);
  });
  it('returns no groups for an empty index', () => {
    expect(groupByLetter([])).toEqual([]);
  });
});

describe('letterOf', () => {
  it('maps non-letters to #', () => {
    expect(letterOf('1 Village')).toBe('#');
    expect(letterOf('')).toBe('#');
  });
});

describe('highlightSegments', () => {
  it('splits around the match and keeps the original casing', () => {
    expect(highlightSegments('Bhurkunda', 'kun')).toEqual([
      { text: 'Bhur', match: false },
      { text: 'kun', match: true },
      { text: 'da', match: false },
    ]);
  });
  it('returns the whole label unmatched when the query is empty', () => {
    expect(highlightSegments('Amdih', '')).toEqual([{ text: 'Amdih', match: false }]);
  });
});
