import patternsData from '../data/Patterns.json';

// Patterns.json nests category -> [{subcategory: [pattern]}]. Same idea as
// filtersIndex: walk once here, not once per render in the sidebar.
export const CATEGORIES = Object.keys(patternsData);
const SUBCATS_BY_CATEGORY = new Map();
const PATTERNS_BY_KEY = new Map();

for (const category of CATEGORIES) {
  const subcategories = [];
  for (const group of patternsData[category]) {
    for (const subcategory of Object.keys(group)) {
      subcategories.push(subcategory);
      const patterns = group[subcategory].map((p) => ({
        category,
        subcategory,
        name: p.Name,
        patternCategory: p.Category,
        characteristics: p.Characteristics,
        level: p.level,
        // OR across a pattern's own conditions, AND across selected patterns —
        // confirmed intentional (screening heuristic, not strict AND).
        conditions: p.Values.map((v) => ({ key: v.Key, type: v.type, value: v.value })),
      }));
      PATTERNS_BY_KEY.set(`${category}::${subcategory}`, patterns);
    }
  }
  SUBCATS_BY_CATEGORY.set(category, subcategories);
}

export function getAllPatternTypes() {
  return CATEGORIES;
}

export function getSubcategoriesForCategory(category) {
  return SUBCATS_BY_CATEGORY.get(category) || [];
}

export function getPatternsForSubcategory(category, subcategory) {
  return PATTERNS_BY_KEY.get(`${category}::${subcategory}`) || [];
}