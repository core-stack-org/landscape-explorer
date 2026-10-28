import patternsData from '../data/Patterns.json';

// Patterns.json nests category -> [{subcategory: [pattern]}]. Same idea as
// filtersIndex: walk once here, not once per render in the sidebar.
// export const CATEGORIES = Object.keys(patternsData);
const ROOT = patternsData.Production_system;
export const CATEGORIES = Object.keys(ROOT);
const SUBCATS_BY_CATEGORY = new Map();
const PATTERNS_BY_KEY = new Map();

const TYPE_CODE = { equal: 1, range: 2, not_equal: 3 };
const LEVEL_CODE = { mws: 0, village: 1 };

export const PATTERN_VALUE_MAP = {
  soge_class: {'safe': 0},
  aquifer_class: {'Hard Rock': 0},
  river_available: {'False': 0},
  canal_available: {'False': 0},
};

function flattenSignal(s) {
  if (s.type === 'logic') return s.Values.flatMap(flattenSignal);
  return [{ key: s.Key, type: s.type, value: s.value }];
}

function normalizeNode(node, signalsById) {
  if (node.ref) {
    const signal = signalsById.get(node.ref);
    if (!signal) throw new Error(`Unknown signal ref: ${node.ref}`);
    return normalizeNode(signal, signalsById);
  }
  if (node.type === 'logic') {
    return {
      logic: node.logic,
      minTrue: node.min_true,
      children: (node.Values ?? node.Trigger_Values).map((child) => normalizeNode(child, signalsById)),    };
  }
  return { key: node.Key, type: TYPE_CODE[node.type], value: node.value };
}

// function normalizeNode(node) {
//   if (node.type === 'logic') {
//       return { logic: node.logic, minTrue: node.min_true, children: node.Values.map(normalizeNode) };
//     // return { logic: node.logic, children: node.Values.map(normalizeNode) };
//   }
//   return { key: node.Key, type: TYPE_CODE[node.type], value: node.value };
// }

// for (const category of CATEGORIES) {
//   const subcategories = [];
//   for (const group of patternsData[category]) {
//     for (const subcategory of Object.keys(group)) {
//       subcategories.push(subcategory);
//       const patterns = group[subcategory].map((p) => ({
//         category,
//         subcategory,
//         name: p.Name,
//         patternCategory: p.Category,
//         characteristics: p.Characteristics,
//         level: LEVEL_CODE[p.level] ?? p.level,
//         root: normalizeNode(p),
//         // OR across a pattern's own conditions, AND across selected patterns —
//         // confirmed intentional (screening heuristic, not strict AND).
//         logic: p.logic,
//         conditions: p.Values.map((v) => ({ key: v.Key, type: v.type, value: v.value })),
//       }));
//       PATTERNS_BY_KEY.set(`${category}::${subcategory}`, patterns);
//     }
//   }
//   SUBCATS_BY_CATEGORY.set(category, subcategories);
// }

for (const category of CATEGORIES) {
  const subcategories = [];
  const stresses = ROOT[category].observed_stresses || {};
  for (const subcategory of Object.keys(stresses)) {
    subcategories.push(subcategory);
    const patterns = stresses[subcategory].map((p) => {
      const signalsById = new Map(p.Signals.map((s) => [s.id, s]));
      return {
        category,
        subcategory,
        name: p.Name,
        patternCategory: p.Category,
        characteristics: p.Characteristics,
        level: LEVEL_CODE[p.level] ?? p.level,
        root: normalizeNode(p.Trigger, signalsById),
        logic: p.Trigger.logic,
        conditions: p.Signals.flatMap(flattenSignal),
        // conditions: p.Signals.map((s) => ({ key: s.Key, type: s.type, value: s.value })),
      };
    });
    console.log(`Patterns for ${category}::${subcategory}:`, patterns);
    PATTERNS_BY_KEY.set(`${category}::${subcategory}`, patterns);
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

export const PATTERN_BY_NAME = new Map();
for (const patterns of PATTERNS_BY_KEY.values()) {
  for (const pattern of patterns) PATTERN_BY_NAME.set(pattern.name, pattern);
}

export function getFormattedSelectedPatterns(patternSelections) {
  const result = [];
  const collect = (selections) => {
    for (const name of Object.keys(selections || {})) {
      const pattern = PATTERN_BY_NAME.get(name);
      if (pattern) result.push(pattern);
    }
  };
  collect(patternSelections.selectedMWSPatterns);
  collect(patternSelections.selectedVillagePatterns);
  return result;
}