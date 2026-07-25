import {
  KYL_FILTERS,
  type KylFilterDefinition,
  type KylFilterValue,
} from "./legacy-contracts";

export const KYL_EXPLORE_SOURCES = ["MWS", "Village", "Waterbody"] as const;
export type KylExploreSource = (typeof KYL_EXPLORE_SOURCES)[number];

export interface KylExploreFilterDefinition extends KylFilterDefinition {
  source: KylExploreSource;
  category: string;
}

export interface KylExploreCategory {
  id: string;
  label: string;
  filters: readonly KylExploreFilterDefinition[];
}

export interface KylExplorePage {
  id: KylExploreSource;
  label: string;
  shortLabel: string;
  description: string;
  categories: readonly KylExploreCategory[];
}

export interface ResolvedKylFilterSelection {
  id: string;
  source: KylExploreSource;
  definition: KylExploreFilterDefinition;
  option: KylFilterValue;
  optionIndex: number;
}

export type KylDataRecord = Record<string, unknown>;

const PAGE_COPY: Record<
  KylExploreSource,
  Pick<KylExplorePage, "label" | "shortLabel" | "description">
> = {
  MWS: {
    label: "Micro-watersheds",
    shortLabel: "MWS",
    description: "Terrain, land-use, climate, hydrology, agriculture, restoration, and industry",
  },
  Village: {
    label: "Villages",
    shortLabel: "Village",
    description: "Demographics, facilities, services, and NREGA",
  },
  Waterbody: {
    label: "Waterbodies",
    shortLabel: "Water",
    description: "Type, area, surface-water trend, and drainage connectivity",
  },
};

function isExploreSource(value: string): value is KylExploreSource {
  return KYL_EXPLORE_SOURCES.includes(value as KylExploreSource);
}

export const KYL_EXPLORE_PAGES: readonly KylExplorePage[] = Object.freeze(
  KYL_EXPLORE_SOURCES.map((source) => ({
    id: source,
    ...PAGE_COPY[source],
    categories: Object.entries(KYL_FILTERS[source]).map(([category, definitions]) => ({
      id: `${source}:${category}`,
      label: category,
      filters: definitions.map((definition) => ({
        ...definition,
        source,
        category,
      })),
    })),
  })),
);

const FILTER_INDEX = new Map(
  KYL_EXPLORE_PAGES.flatMap((page) =>
    page.categories.flatMap((category) =>
      category.filters.map((definition) => [
        `${definition.source}:${definition.name}`,
        definition,
      ] as const),
    ),
  ),
);

export function kylFilterSelectionId(
  definition: Pick<KylExploreFilterDefinition, "source" | "name">,
  optionIndex: number,
): string {
  return `${definition.source}:${definition.name}:${optionIndex}`;
}

export function resolveKylFilterSelection(
  selectionId: string,
): ResolvedKylFilterSelection | null {
  const [source, name, rawIndex, ...extra] = selectionId.split(":");
  if (!isExploreSource(source) || !name || !rawIndex || extra.length) return null;
  const optionIndex = Number(rawIndex);
  if (!Number.isInteger(optionIndex) || optionIndex < 0) return null;
  const definition = FILTER_INDEX.get(`${source}:${name}`);
  const option = definition?.values[optionIndex];
  if (!definition || !option) return null;
  return {
    id: selectionId,
    source,
    definition,
    option,
    optionIndex,
  };
}

export function resolveKylFilterSelections(
  selectionIds: readonly string[],
): ResolvedKylFilterSelection[] {
  return selectionIds
    .map(resolveKylFilterSelection)
    .filter((selection): selection is ResolvedKylFilterSelection => selection !== null);
}

function matchesOption(
  recordValue: unknown,
  definition: KylExploreFilterDefinition,
  option: KylFilterValue,
): boolean {
  if (recordValue === null || recordValue === undefined) return false;
  if (definition.type === 2) {
    if (!option.value || typeof option.value !== "object") return false;
    const range = option.value as { lower?: unknown; upper?: unknown };
    const value = Number(recordValue);
    const lower = Number(range.lower);
    const upper = Number(range.upper);
    return (
      Number.isFinite(value) &&
      Number.isFinite(lower) &&
      Number.isFinite(upper) &&
      value >= lower &&
      value <= upper
    );
  }
  if (typeof option.value === "boolean") {
    if (typeof recordValue === "boolean") return recordValue === option.value;
    if (recordValue === 1 || recordValue === "1" || recordValue === "true")
      return option.value;
    if (recordValue === 0 || recordValue === "0" || recordValue === "false")
      return !option.value;
  }
  if (typeof option.value === "number") {
    return Number(recordValue) === option.value;
  }
  return String(recordValue) === String(option.value);
}

export function filterKylRecords(
  records: readonly KylDataRecord[],
  selections: readonly ResolvedKylFilterSelection[],
): KylDataRecord[] {
  if (!selections.length) return [...records];
  const byFilter = new Map<string, ResolvedKylFilterSelection[]>();
  for (const selection of selections) {
    const current = byFilter.get(selection.definition.name) ?? [];
    current.push(selection);
    byFilter.set(selection.definition.name, current);
  }
  return records.filter((record) =>
    [...byFilter.entries()].every(([filterName, options]) =>
      options.some((selection) =>
        matchesOption(record[filterName], selection.definition, selection.option),
      ),
    ),
  );
}

export function calculateKylTrend(values: readonly number[]): -1 | 0 | 1 {
  let score = 0;
  for (let left = 0; left < values.length - 1; left += 1) {
    for (let right = left + 1; right < values.length; right += 1) {
      if (values[right] > values[left]) score += 1;
      else if (values[right] < values[left]) score -= 1;
    }
  }
  return score > 0 ? 1 : score < 0 ? -1 : 0;
}

export function waterbodyExploreRecord(properties: KylDataRecord): KylDataRecord {
  const areas = Object.keys(properties)
    .filter((key) => key.startsWith("area_") && key !== "area_ored")
    .sort()
    .map((key) => Number(properties[key] ?? 0));
  return {
    ...properties,
    waterbody_type: properties.waterbody_type === "river" ? 1 : 0,
    waterbody_size: Number(
      properties.area_ored ?? properties.AREA_HA ?? properties.area ?? properties.Area ?? 0,
    ),
    surface_water_trend: calculateKylTrend(areas),
    drainage_line: Number(properties.on_drainage_line ?? 0),
  };
}
