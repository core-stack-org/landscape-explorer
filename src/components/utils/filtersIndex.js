import filtersData from '../data/Filters.json';

// Filters.json is nested namespace -> category -> [filter]. We walk it once
// here, at module load, instead of every component walking it on every render.
const SECTION_LABELS = { MWS: 'Micro watershed', Waterbody: 'Waterbody', Village: 'Village' };

export const ALL_FILTERS = [];
export const FILTER_BY_NAME = new Map();
export const CATEGORIES_BY_SECTION = [];

for (const namespace of Object.keys(filtersData)) {
  const section = SECTION_LABELS[namespace] || namespace;
  const categories = Object.keys(filtersData[namespace]);
  CATEGORIES_BY_SECTION.push([section, categories]);

  for (const category of categories) {
    for (const filter of filtersData[namespace][category]) {
      if (filter.type !== 1 && filter.type !== 2) continue;
      if (!filter.values?.length) continue;

      const entry = { ...filter, namespace, category, section };
      ALL_FILTERS.push(entry);
      FILTER_BY_NAME.set(filter.name, entry);
    }
  }
}

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