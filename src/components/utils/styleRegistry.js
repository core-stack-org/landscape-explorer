import { Fill, Stroke, Style } from 'ol/style.js';

const DEFAULT_STROKE = '#006400';
const DEFAULT_FILL = 'rgba(144, 238, 144, 0.3)';

const YEARS_RANGE = ['2017_2018', '2018_2019', '2019_2020', '2020_2021', '2021_2022', '2022_2023', '2023_2024', '2024_2025'];
const YEARS = ['2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024'];

// Order matters — index = rock-type code. Unmatched value falls to index 13.
const AQUIFER_TYPES = ['Alluvium', 'Laterite', 'Basalt', 'Sandstone', 'Shale', 'Limestone', 'Granite', 'Schist', 'Quartzite', 'Charnockite', 'Khondalite', 'Banded Gneissic Complex', 'Gneiss'];
const SOGE_TYPES = ['Safe', 'Semi-Critical', 'Critical', 'Over Exploited']; // unmatched -> index 4 ("Not Assessed")

function avgYearlyField(feature, jsonKey) {
  let total = 0;
  for (const year of YEARS_RANGE) {
    const raw = feature.get(year);
    if (!raw) continue;
    try { total += JSON.parse(raw)[jsonKey] ?? 0; } catch { /* malformed year entry, skip */ }
  }
  return total / YEARS_RANGE.length;
}

function avgDrySpell(feature) {
  let total = 0;
  for (const year of YEARS) total += Number(feature.get(`drysp_${year}`)) || 0;
  return total / YEARS.length;
}

function countDroughtYears(feature) {
  let count = 0;
  for (const year of YEARS) {
    const code = feature.get(`drlb_${year}`) || '';
    const hits = (code.match(/2/g) || []).length + (code.match(/3/g) || []).length;
    if (hits >= 5) count++;
  }
  return count;
}

function percentOf(feature, numField, denomField) {
  const num = feature.get(numField);
  const denom = feature.get(denomField);
  return num && denom ? (num / denom) * 100 : 0;
}

// Each resolver reads a value either straight off the feature (WFS layer
// properties) or from mwsIndex/villageIndex (the pre-aggregated dataset).
// `dualPath: true` means the checkbox field and the map-coloring field are
// different — resolver reads the coloring field, and the caller must match
// against filter.visualizeBins instead of filter.bins.
export const STYLE_RESOLVERS = {
  avg_precipitation: { get: (f) => avgYearlyField(f, 'Precipitation') },
  avg_runoff: { get: (f) => avgYearlyField(f, 'RunOff') },
  avg_number_dry_spell: { get: avgDrySpell },
  drought_category: { get: countDroughtYears },

  total_population: { get: (f) => f.get('TOT_P') },
  percent_st_population: { get: (f) => percentOf(f, 'P_ST', 'TOT_P') },
  percent_sc_population: { get: (f) => percentOf(f, 'P_SC', 'TOT_P') },
  literacy_level: { get: (f) => percentOf(f, 'P_LIT', 'TOT_P') },

  essential_education_infra: { get: (f) => Math.max(f.get('l3_school_primary_distance_km'), f.get('l3_school_upper_primary_distance_km'), f.get('l3_school_secondary_distance_km')) },
  higher_education_infra: { get: (f) => Math.min(f.get('l3_school_higher_secondary_distance_km'), f.get('l3_college_distance_km'), f.get('l3_universities_distance_km')) },
  essential_health_services: { get: (f) => Math.max(f.get('l3_health_sub_cen_distance_km'), f.get('l3_health_phc_distance_km')) },
  advanced_health_services: { get: (f) => Math.min(f.get('l3_health_chc_distance_km'), f.get('l3_health_dis_h_distance_km'), f.get('l3_health_s_t_h_distance_km')) },
  public_distribution_system: { get: (f) => f.get('l3_pds_distance_km') },
  agri_market_access: { get: (f) => Math.min(f.get('l2_apmc_access_distance_km'), f.get('l3_agri_industry_markets_trading_distance_km')) },
  post_harvest_infra: { get: (f) => Math.min(f.get('l3_agri_industry_storage_warehousing_distance_km'), f.get('l3_agri_industry_distribution_utilities_distance_km'), f.get('l3_agri_industry_agri_processing_distance_km'), f.get('l3_agri_industry_industrial_manufacturing_distance_km')) },
  farmer_cooperatives_access: { get: (f) => f.get('l3_agri_industry_co_operatives_societies_distance_km') },
  livestock_management_centers: { get: (f) => f.get('l3_agri_industry_dairy_animal_husbandry_distance_km') },
  agricultural_support_infrastructure: { get: (f) => f.get('l3_agri_industry_agri_support_infrastructure_distance_km') },

  decrease_in_tree_cover: { get: (f) => f.get('total_def') },
  increase_in_tree_cover: { get: (f) => f.get('total_aff') },
  small_animals_total: { get: (f) => f.get('small_animals_total') },
  large_animals_total: { get: (f) => f.get('large_animals_total') },

  total_assets: { get: (f, { villageIndex }) => villageIndex.byId.get(f.get('vill_ID'))?.total_assets },
  trend_g: { get: (f, { mwsIndex }) => mwsIndex.byId.get(f.get('uid'))?.trend_g },
  avg_rabi_surface_water_mws: { get: (f, { mwsIndex }) => mwsIndex.byId.get(f.get('uid'))?.avg_rabi_surface_water_mws },
  avg_zaid_surface_water_mws: { get: (f, { mwsIndex }) => mwsIndex.byId.get(f.get('uid'))?.avg_zaid_surface_water_mws },
  degradation_land_area: { get: (f, { mwsIndex }) => mwsIndex.byId.get(f.get('uid'))?.degradation_land_area },
  relief: { get: (f, { mwsIndex }) => mwsIndex.byId.get(f.get('uid'))?.relief },
  increase_canopy_density_height: { get: (f, { mwsIndex }) => mwsIndex.byId.get(f.get('uid'))?.increase_canopy_density_height },
  reduction_canopy_density_height: { get: (f, { mwsIndex }) => mwsIndex.byId.get(f.get('uid'))?.reduction_canopy_density_height },

  aquifer_class: {
    dualPath: true,
    get: (f) => { const i = AQUIFER_TYPES.indexOf(f.get('Principal_')); return i === -1 ? 13 : i; },
  },
  soge_class: {
    dualPath: false,
    get: (f) => { const i = SOGE_TYPES.indexOf(f.get('class')); return i === -1 ? 4 : i; },
  },
  road_connectivity_cat_cluster: { dualPath: true, get: (f) => f.get('road_connectivity_cat_value') },
  energy_access_cat_cluster: { dualPath: true, get: (f) => f.get('electrification_rate_feat_value') },
  housing_quality_cat_cluster: { dualPath: true, get: (f) => f.get('housing_quality_cat_value') },
  maternal_child_health_cat_cluster: { dualPath: true, get: (f) => f.get('maternal_child_health_cat_value') },
  water_sanitation_cat_cluster: { dualPath: true, get: (f) => f.get('water_sanitation_cat_value') },
  financial_inclusion_cat_cluster: { dualPath: true, get: (f) => f.get('bank_feat_value') },
  social_protection_cat_cluster: { dualPath: true, get: (f) => f.get('pds_util_feat_value') },
  institutionalization_cat_cluster: { dualPath: true, get: (f) => f.get('institutionalization_cat_value') },
  livelihoods_employment_cat_cluster: { dualPath: true, get: (f) => f.get('farm_employment_feat_value') },
  livelihoods_forest_resources_cat_cluster: { dualPath: true, get: (f) => f.get('livelihoods_forest_resources_cat_value') },
  livelihoods_alternative_farming_cat_cluster: { dualPath: true, get: (f) => f.get('alternative_farming_feat_value') },
  livelihoods_fisheries_cat_cluster: { dualPath: true, get: (f) => f.get('livelihoods_fisheries_cat_value') },
  livelihoods_cottage_traditional_industry_cat_cluster: { dualPath: true, get: (f) => f.get('livelihoods_cottage_traditional_industry_cat_value') },
  livestock_veterinary_cat_cluster: { dualPath: true, get: (f) => f.get('livestock_veterinary_cat_value') },
  livelihoods_common_resources_cat_cluster: { dualPath: true, get: (f) => f.get('common_pastures_feat_value') },
  agriculture_irrigation_watershed_cat_cluster: { dualPath: true, get: (f) => f.get('agriculture_irrigation_watershed_cat_value') },
  agriculture_organic_farming_cat_cluster: { dualPath: true, get: (f) => f.get('agriculture_organic_farming_cat_value') },


  soil_ph : { dualPath: true, get: (f) => f.get('topsoil_ph') },
  reduction_in_shrubland_cover : { dualPath: false, get: (f) => f.get('total_change') },
  soil_drainage : { dualPath: true, get: (f) => f.get('soil_drainage_classes') },
  soil_texture : { dualPath: true, get: (f) => f.get('subsoil_texture') },
};

function findBin(value, bins) {
  if (value === undefined || value === null || Number.isNaN(value)) return null;
  console.log(bins)
  return bins.find((b) =>
    b.value !== undefined ? String(b.value) === String(value) : value >= b.lower && value <= b.upper
  );
}

// Style objects are cached per bin (not allocated per feature per frame) —
// this is what actually kills the old per-render Style/Stroke/Fill allocation.
const styleCache = new WeakMap();
const EMPTY_BIN = {};

function styleForBin(bin) {
  const key = bin || EMPTY_BIN;
  if (styleCache.has(key)) return styleCache.get(key);
  const style = new Style({
    stroke: new Stroke({ color: key.stroke || DEFAULT_STROKE, width: 1.0 }),
    fill: new Fill({ color: key.fill || DEFAULT_FILL }),
  });
  styleCache.set(key, style);
  return style;
}

// Returns an OL style function ready for layer.setStyle(). Looks up the
// resolver + bins once, per feature does only a value read + bin match —
// no dataJson/villageJson scans, no per-feature object allocation.
export function createFeatureStyleFn(filter, indexes) {
  if (filter.styleKey === 'static') {
    const style = styleForBin(filter.bins[0]);
    return () => style;
  }

  const resolver = STYLE_RESOLVERS[filter.styleKey];
  if (!resolver) {
    console.error(`No style resolver for styleKey "${filter.styleKey}"`);
    const fallback = styleForBin(null);
    return () => fallback;
  }

  const bins = resolver.dualPath ? filter.visualizeBins : filter.bins;

  return (feature) => styleForBin(findBin(resolver.get(feature, indexes), bins || []));
}