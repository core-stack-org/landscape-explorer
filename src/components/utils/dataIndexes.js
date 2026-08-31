import { FILTER_BY_NAME, ALL_FILTERS } from './filtersIndex';
import { PATTERN_BY_NAME } from './patternsIndex';

// Backend sentinel values meaning "no data" — excluded from range matching.
const MISSING_VALUE_SENTINELS = new Set([-1, -9999]);

function collectIndexedFields(source, patternLevel) {
  const fields = new Set();
  for (const f of ALL_FILTERS) if (f.source === source) fields.add(f.name);
  for (const p of PATTERN_BY_NAME.values()) {
    if (p.level !== patternLevel) continue;
    for (const c of p.conditions) fields.add(c.key);
  }
  return fields;
}

const MWS_INDEXED_FIELDS = collectIndexedFields('mws', 0);
const VILLAGE_INDEXED_FIELDS = collectIndexedFields('village', 1);

// At this dataset size (hundreds to ~1600 records), a plain scan per range
// filter is sub-millisecond — no benefit from pre-sorting. Only exact-match
// fields get a Map index, since that's simpler to read at the call site,
// not because scanning would be slow.
function buildFieldIndexes(records, idField, fields) {
  const byId = new Map();
  const fieldIndex = {};

  for (const record of records || []) {
    const id = record?.[idField];
    if (!id) continue;
    byId.set(id, record);

    for (const field of fields) {
      const raw = record[field];
      if (raw === undefined) continue;

      const key = String(raw);
      if (!fieldIndex[field]) fieldIndex[field] = {};
      if (!fieldIndex[field][key]) fieldIndex[field][key] = new Set();
      fieldIndex[field][key].add(id);
    }
  }

  return { byId, fieldIndex };
}

export function buildMWSIndex(dataJson) {
  const { byId, fieldIndex } = buildFieldIndexes(dataJson, 'mws_id', MWS_INDEXED_FIELDS);

  const mwsToVillages = new Map();
  const mwsToSWB = new Map();
  for (const [id, item] of byId) {
    mwsToVillages.set(id, item.mws_intersect_villages || []);
    mwsToSWB.set(
      id,
      (item.mws_intersect_swb || []).map((swb) =>
        typeof swb === 'object' ? swb : { swbId: String(swb), swbName: '' }
      )
    );
  }

  return { byId, fieldIndex, mwsToVillages, mwsToSWB };
}

export function buildVillageIndex(villageJson) {
  return buildFieldIndexes(villageJson, 'village_id', VILLAGE_INDEXED_FIELDS);
}

function inRange(record, field, lower, upper) {
  const num = Number(record[field]);
  if (isNaN(num) || MISSING_VALUE_SENTINELS.has(num)) return false;
  return num >= lower && num <= upper;
}

function matchFilters(selections, index) {
  let result = null; // null = no active filters, i.e. unrestricted
  for (const [filterName, options] of Object.entries(selections || {})) {
    if (!options) continue;
    const filter = FILTER_BY_NAME.get(filterName);
    if (!filter) continue;

    const matched = new Set();
    for (const option of options) {
      if (filter.type === 2) {
        for (const [id, record] of index.byId) {
          if (inRange(record, filterName, option.value.lower, option.value.upper)) matched.add(id);
        }
      } else {
        const ids = index.fieldIndex[filterName]?.[String(option.value)];
        if (ids) ids.forEach((id) => matched.add(id));
      }
    }

    result = result === null ? matched : new Set([...result].filter((id) => matched.has(id)));
  }
  return result;
}

function conditionMatches(record, condition) {
  if (condition.type === 2) return inRange(record, condition.key, condition.value.lower, condition.value.upper);
  if (condition.type === 1) return String(record[condition.key]) === String(condition.value);
  if (condition.type === 3) return String(record[condition.key]) !== String(condition.value);
  return false;
}

// OR across a pattern's own conditions, AND across selected patterns —
// confirmed intentional (screening heuristic: "any condition true enough
// to flag this MWS/village").
function matchPatterns(selections, byId) {
  let result = null;
  for (const pattern of Object.values(selections || {})) {
    if (!pattern) continue;

    const matched = new Set();
    for (const [id, record] of byId) {
      const isMatch = pattern.logic === 'AND'
        ? pattern.conditions.every((c) => conditionMatches(record, c))
        : pattern.conditions.some((c) => conditionMatches(record, c));
      if (isMatch) matched.add(id);
    }

    result = result === null ? matched : new Set([...result].filter((id) => matched.has(id)));
  }
  return result;
}

export function deriveSelection({ filterSelections, patternSelections, manualSelectedMWS }, mwsIndex, villageIndex) {
  if (manualSelectedMWS?.length) {
    const villageIdList = new Set();
    const selectedWaterbodyIds = new Set();
    for (const mwsId of manualSelectedMWS) {
      (mwsIndex.mwsToVillages.get(mwsId) || []).forEach((v) => villageIdList.add(v));
      (mwsIndex.mwsToSWB.get(mwsId) || []).forEach((swb) => selectedWaterbodyIds.add(swb.swbId));
    }
    return { selectedMWS: manualSelectedMWS, villageIdList, selectedWaterbodyIds };
  }

  const mwsFilterResult = matchFilters(filterSelections.selectedMWSValues, mwsIndex);
  const mwsPatternResult = matchPatterns(patternSelections.selectedMWSPatterns, mwsIndex.byId);
  const hasMwsSelection = mwsFilterResult !== null || mwsPatternResult !== null;

  const selectedMWSSet = !hasMwsSelection
    ? new Set()
    : mwsFilterResult === null
    ? mwsPatternResult
    : mwsPatternResult === null
    ? mwsFilterResult
    : new Set([...mwsFilterResult].filter((id) => mwsPatternResult.has(id)));

  const selectedMWS = [...selectedMWSSet];

  const candidateVillages = new Set();
  if (hasMwsSelection) {
    for (const id of selectedMWS) {
      (mwsIndex.mwsToVillages.get(id) || []).forEach((v) => candidateVillages.add(v));
    }
  }

  const villageFilterResult = matchFilters(filterSelections.selectedVillageValues, villageIndex);
  const villagePatternResult = matchPatterns(patternSelections.selectedVillagePatterns, villageIndex.byId);
  const hasVillageSelection = villageFilterResult !== null || villagePatternResult !== null;

  let villageIdList;
  if (!hasVillageSelection) {
    villageIdList = hasMwsSelection ? candidateVillages : new Set();
  } else {
    const combined = villageFilterResult === null
      ? villagePatternResult
      : villagePatternResult === null
      ? villageFilterResult
      : new Set([...villageFilterResult].filter((id) => villagePatternResult.has(id)));

    villageIdList = hasMwsSelection
      ? new Set([...combined].filter((id) => candidateVillages.has(id)))
      : combined;
  }

  const hasWBFilter = Object.values(filterSelections.selectedWaterbodyValues || {}).some(Boolean);
  const selectedWaterbodyIds = new Set();
  if (!hasWBFilter) {
    for (const id of selectedMWS) {
      (mwsIndex.mwsToSWB.get(id) || []).forEach((swb) => selectedWaterbodyIds.add(swb.swbId));
    }
  }

  return { selectedMWS, villageIdList, selectedWaterbodyIds };
}

// Village names live in three places depending on data availability:
// villageJson's own name fields, or (if those are empty) the boundary
// layer's WFS feature properties.
export function buildVillageNameIndex(villageJson, boundaryLayerRef) {
  const names = new Map();

  for (const v of villageJson || []) {
    const name = v.village_name || v.vill_name || v.name;
    if (name) names.set(String(v.village_id), name);
  }

  const features = boundaryLayerRef.current?.getSource()?.getFeatures() || [];
  for (const f of features) {
    const p = f.getProperties();
    const id = String(p.vill_ID ?? p.village_id ?? '');
    if (id && !names.has(id)) {
      const name = p.vill_name || p.village_name || p.name;
      if (name) names.set(id, name);
    }
  }

  return names;
}

// Resolves MWS -> intersecting villages/waterbodies, with village names
// filled in from villageNameIndex. Used for both filter-driven selection
// (selectedMWS) and manual map-click selection (manualSelectedMWS) — same
// shape either way.
export function buildIntersections(mwsIds, mwsIndex, villageNameIndex) {
  return mwsIds.map((mwsId) => {
    const record = mwsIndex.byId.get(mwsId);
    if (!record) return { mwsId: String(mwsId), villages: [], waterbodies: [] };

    const villages = (record.mws_intersect_villages || []).map((villageId) => ({
      villageId: String(villageId),
      villageName: villageNameIndex.get(String(villageId)) || 'Unknown',
    }));

    const waterbodies = (mwsIndex.mwsToSWB.get(mwsId) || []).map((swb) => ({
      swbId: String(swb.swbId),
      swbName: swb.swbName || '',
    }));

    return { mwsId: String(mwsId), villages, waterbodies };
  });
}