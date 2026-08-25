import filtersData from '../data/Filters.json';

const SECTION_LABELS = { MWS: 'Micro watershed', Waterbody: 'Waterbody', Village: 'Village' };

function toOldValueShape(filter) {
  return filter.bins.map((bin) =>
    filter.type === 2
      ? { label: bin.label, value: { lower: bin.lower, upper: bin.upper } }
      : { label: bin.label, value: bin.value }
  );
}

export const ALL_FILTERS = filtersData.map((f) => ({
  ...f,
  values: toOldValueShape(f),
  vectorStyle: f.bins,
  styleIdx: f.styleKey === 'static' ? 0 : 1,
}));

export const FILTER_BY_NAME = new Map(ALL_FILTERS.map((f) => [f.name, f]));

export const CATEGORIES_BY_SECTION = (() => {
  const bySection = new Map();
  for (const filter of ALL_FILTERS) {
    const section = SECTION_LABELS[filter.namespace] || filter.namespace;
    if (!bySection.has(section)) bySection.set(section, new Set());
    bySection.get(section).add(filter.category);
  }
  return [...bySection.entries()].map(([section, cats]) => [section, [...cats]]);
})();

export function getAllFilterTypes() {
  return CATEGORIES_BY_SECTION.flatMap(([, categories]) => categories);
}

export function getFiltersByCategory(category) {
  return ALL_FILTERS.filter((f) => f.category === category);
}

export function getFormattedSelectedFilters(filterSelections) {
  const groups = {};
  const collect = (selections) => {
    for (const [name, options] of Object.entries(selections || {})) {
      if (!options) continue;
      const filter = FILTER_BY_NAME.get(name);
      if (!filter) continue;
      if (!groups[name]) {
        groups[name] = { name, filterName: filter.label, values: [], layer_store: filter.layer_store, layer_name: filter.layer_name };
      }
      for (const option of options) groups[name].values.push(option.label);
    }
  };
  collect(filterSelections.selectedMWSValues);
  collect(filterSelections.selectedVillageValues);
  collect(filterSelections.selectedWaterbodyValues);
  return Object.values(groups);
}