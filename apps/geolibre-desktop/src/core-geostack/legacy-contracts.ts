import activeLocationsData from "./data/active-locations.json";
import kylFiltersData from "./data/kyl-filters.json";
import kylPatternsData from "./data/kyl-patterns.json";

export interface ActiveTehsil {
  label: string;
  value: string;
  block_id: string;
}

export interface ActiveDistrict {
  label: string;
  value: string;
  district_id: string;
  blocks?: ActiveTehsil[];
}

export interface ActiveState {
  label: string;
  value: string;
  state_id: string;
  district?: ActiveDistrict[];
}

export interface ActiveLocationOption {
  id: string;
  kind: "state" | "district" | "tehsil";
  label: string;
  context: string;
  state: ActiveState;
  district?: ActiveDistrict;
  tehsil?: ActiveTehsil;
}

export interface KylFilterValue {
  label: string;
  value: unknown;
}

export interface KylFilterDefinition {
  name: string;
  label: string;
  type: number;
  values: KylFilterValue[];
  layer_store?: string[];
  layer_name?: string[];
  vectorStyle?: unknown[];
  rasterStyle?: string | string[];
  styleIdx?: number;
}

export type KylFilterCatalog = Record<string, Record<string, KylFilterDefinition[]>>;

export interface KylPatternDefinition {
  Name: string;
  Category: string;
  Characteristics: string;
  level: number;
  Values: unknown[];
}

export const ACTIVE_LOCATIONS = activeLocationsData as ActiveState[];
export const KYL_FILTERS = kylFiltersData as KylFilterCatalog;
export const KYL_PATTERNS = kylPatternsData as Record<
  string,
  Array<Partial<Record<string, KylPatternDefinition[]>>>
>;

export const ACTIVE_LOCATION_OPTIONS: readonly ActiveLocationOption[] = Object.freeze(
  ACTIVE_LOCATIONS.flatMap((state) => {
    const stateOption: ActiveLocationOption = {
      id: `state:${state.state_id}`,
      kind: "state",
      label: state.label,
      context: "State",
      state,
    };
    const descendants = (state.district ?? []).flatMap((district) => {
      const districtOption: ActiveLocationOption = {
        id: `district:${district.district_id}`,
        kind: "district",
        label: district.label,
        context: state.label,
        state,
        district,
      };
      const tehsils = (district.blocks ?? []).map(
        (tehsil): ActiveLocationOption => ({
          id: `tehsil:${tehsil.block_id}`,
          kind: "tehsil",
          label: tehsil.label,
          context: `${district.label}, ${state.label}`,
          state,
          district,
          tehsil,
        }),
      );
      return [districtOption, ...tehsils];
    });
    return [stateOption, ...descendants];
  }),
);

export const KYL_FILTER_DEFINITIONS: readonly KylFilterDefinition[] = Object.freeze(
  Object.values(KYL_FILTERS).flatMap((categories) => Object.values(categories).flat()),
);

export const KYL_PATTERN_DEFINITIONS: readonly KylPatternDefinition[] = Object.freeze(
  Object.values(KYL_PATTERNS).flatMap((groups) =>
    groups.flatMap((group) =>
      Object.values(group).flatMap((definitions) => definitions ?? []),
    ),
  ),
);
