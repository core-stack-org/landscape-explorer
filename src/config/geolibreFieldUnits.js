// A few GeoServer schemas are newer than the local STAC dictionary. Reuse an
// older year's definition only within the same published source and metric.
const priorYearFields = (field) => [2023, 2022].map((year) => field.replace(/2024|2023/g, String(year)));

const NREGA_ALIASES = {
  Asset_ID: "Asset ID", Work_Code: "Work Code", image_path1: "image_path",
  image_path2: "image_pa_1", observer_name: "observer_n",
  Gram_panchayat: "Gram_panch", creation_time: "creation_t",
  Panchayat_ID: "Panchayat_", Asset_Name: "Asset Name",
  Work_Name: "Work Name", Work_Type: "Work Type",
  Estimated_Cost: "Estimated", Start_Location: "Start Loca",
  End_Location: "End Locati", "Semi-Skilled": "Semi-Skill",
  Total_Expenditure: "Total_Expe", Unskilled_Persondays: "Unskilled_",
  "Semi-skilled_Persondays": "Semi-ski_1", Total_persondays: "Total_pers",
  Unskilled_persons: "Unskille_1", "Semi-skilled_persons": "Semi-ski_2",
  Total_persons: "Total_pe_1", Work_start_date: "Work_start",
  WorkCategory: "WorkCatego",
};

export const fieldDefinitionFor = (layer, field, fieldMetadata) => {
  if (layer?.id === "drought" && (field === "avg_dryspell" || /^drysp_20\d{2}$/.test(field))) {
    return { unit: "weeks", description: "Maximum consecutive dry weeks" };
  }
  if (layer?.id === "lulc_stats") {
    if (field === "built_up_fraction") return { unit: "dimensionless", description: "Mean available annual built-up area divided by area_in_ha" };
    if (field === "built_up_year_count") return { unit: "count", description: "Number of valid annual built-up area observations" };
  }
  if (layer?.id === "drought") {
    if (field === "drought_peak_intensity" || /^drought_peak_\d{4}$/.test(field)) return { unit: "NA", description: "Highest recorded weekly intensity across valid observed years (or the named year); not an official drought declaration" };
    if (/^drought_stress_weeks_\d{4}$/.test(field)) return { unit: "weeks", description: "Moderate plus severe drought weeks in this year" };
    if (field === "drought_observed_years") return { unit: "NA", description: "Years with complete valid weekly class counts used in the peak" };
    if (field === "drought_year_count") return { unit: "count", description: "Number of valid observed years" };
  }
  if (layer?.id === "drought_causality") {
    if (field === "drought_dominant_impact" || /^drought_impact_\d{4}$/.test(field)) return { unit: "NA", description: "Dominant impact combination among published top-three moderate/severe pathways; ties explicit; not proof of root cause" };
    if (field === "drought_impact_observed_years") return { unit: "NA", description: "Years with interpretable pathway records used in this summary" };
    if (field === "drought_impact_year_count") return { unit: "count", description: "Number of interpretable annual pathway records" };
  }
  const sources = layer?.unitSources || [];
  const exact = sources.map((source) => fieldMetadata[source]?.[field]).find(Boolean);
  if (exact) return exact;

  for (const previous of priorYearFields(field)) {
    if (previous === field) continue;
    const inherited = sources.map((source) => fieldMetadata[source]?.[previous]).find(Boolean);
    if (inherited) return { ...inherited, description: `Same measure as ${previous}, for ${field.match(/20\d\d/)?.[0]}` };
  }

  if (layer?.baseId === "nrega" && NREGA_ALIASES[field]) {
    return fieldMetadata.nrega_assets[NREGA_ALIASES[field]];
  }

  if (layer?.id === "facilities") {
    if (field.endsWith("_distance_km")) return { unit: "km", description: "Distance to selected facility" };
    if (field.endsWith("_inside_scope")) return { unit: "boolean" };
    return { unit: "NA" };
  }
  if (layer?.id === "mws_layers_fortnight" && /^\d{4}-\d{2}-\d{2}$/.test(field)) {
    return { unit: "mixed", description: "Fortnightly water-balance record with separately unit-bearing measures" };
  }
  if (layer?.id?.startsWith("ndvi_") && /^(crop_|shrub_|tree_)?\d{4}-\d{2}-\d{2}$/.test(field)) {
    return { unit: "dimensionless", description: "Normalised Difference Vegetation Index for this date" };
  }
  if (layer?.id === "drought_causality") {
    if (field === "area_in_ha") return { unit: "ha", description: "Area of the mapped polygon" };
    if (field === "avg_dryspell") return { unit: "weeks", description: "Published mean dry spell length" };
    if (/^(se_mo|mild)_20\d{2}$/.test(field)) {
      return { unit: "mixed", description: "Drought causality record; nested measures require field-specific interpretation" };
    }
  }
  if (layer?.id === "drought" && /^rd\d{2}-\d{1,2}-\d{1,2}$/.test(field)) {
    return { unit: "percent", description: "Rainfall deviation" };
  }
  if (layer?.id === "aquifer" && /^principle_aq_.*_percent$/.test(field)) return { unit: "percent" };
  if (layer?.id === "remote_sensed_waterbodies") {
    if (/^area_\d\d-\d\d$/.test(field)) return { unit: "ha" };
    if (/^(k|kr|krz)_\d\d-\d\d$/.test(field)) return { unit: "percent" };
    if (field.endsWith("_percentage")) return { unit: "percent" };
    if (field.endsWith("_count")) return { unit: "count" };
  }
  if (["id", "uid", "index", "bacode", "sbcode", "wsconc", "Unnamed_ 0", "Unnamed__1", "Contingenc"].includes(field)) {
    return { unit: "NA" };
  }
  if (layer?.id === "terrain_vector" && field === "valley_area") return { unit: "ha" };
  if (layer?.id === "cropintensity_stats" && ["si_si", "do_do", "tr_tr"].includes(field)) {
    return { unit: "ha", description: "Change-class area" };
  }
  return null;
};
