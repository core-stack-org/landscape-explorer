// A few GeoServer schemas are newer than the local STAC dictionary. Reuse an
// older year's definition verbatim within the same published source and metric.
// Descriptions belong exclusively to geolibreCatalog.json; fallbacks below
// provide units only and never generate or rewrite a description.
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
  const sources = layer?.unitSources || [];
  const exact = sources.map((source) => fieldMetadata[source]?.[field]).find(Boolean);
  if (exact) return exact;
  if (fieldMetadata.common?.[field]) return fieldMetadata.common[field];

  for (const previous of priorYearFields(field)) {
    if (previous === field) continue;
    const inherited = sources.map((source) => fieldMetadata[source]?.[previous]).find(Boolean);
    if (inherited) return inherited;
  }

  if (layer?.baseId === "nrega" && NREGA_ALIASES[field]) {
    return fieldMetadata.nrega_assets[NREGA_ALIASES[field]];
  }
  if (layer?.id === "terrain_vector" && /^(hill_slope|plain_area|ridge_area|slopy_area|valley_are)\/area_in_ha$/.test(field)) {
    return { unit: "dimensionless" };
  }
  if (layer?.id === "drought" && (field === "avg_dryspell" || /^drysp_20\d{2}$/.test(field))) {
    return { unit: "weeks" };
  }
  if (layer?.id === "lulc_stats") {
    if (field === "built_up_fraction") return { unit: "dimensionless" };
    if (["k_water_fraction", "cropland_fraction", "barrenlands_fraction", "tree_forest_fraction"].includes(field)) {
      return { unit: "dimensionless" };
    }
    if (field === "built_up_year_count") return { unit: "count" };
  }
  if (layer?.id === "drought") {
    if (field === "drought_peak_intensity" || /^drought_peak_\d{4}$/.test(field)) return { unit: "NA" };
  }
  if (layer?.id === "drought_causality") {
    if (field === "drought_dominant_impact" || /^drought_impact_\d{4}$/.test(field)) return { unit: "NA" };
  }

  if (layer?.id === "facilities") {
    if (field.endsWith("_distance_km")) return { unit: "km" };
    if (field.endsWith("_inside_scope")) return { unit: "boolean" };
    return { unit: "NA" };
  }
  if (layer?.id === "mws_layers_fortnight" && /^\d{4}-\d{2}-\d{2}$/.test(field)) {
    return { unit: "mixed" };
  }
  if (layer?.id?.startsWith("ndvi_") && /^(crop_|shrub_|tree_)?\d{4}-\d{2}-\d{2}$/.test(field)) {
    return { unit: "dimensionless" };
  }
  if (layer?.id === "drought_causality") {
    if (field === "area_in_ha") return { unit: "ha" };
    if (field === "avg_dryspell") return { unit: "weeks" };
    if (/^(se_mo|mild)_20\d{2}$/.test(field)) {
      return { unit: "mixed" };
    }
  }
  if (layer?.id === "drought" && /^rd\d{2}-\d{1,2}-\d{1,2}$/.test(field)) {
    return { unit: "percent" };
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
    return { unit: "ha" };
  }
  return null;
};
