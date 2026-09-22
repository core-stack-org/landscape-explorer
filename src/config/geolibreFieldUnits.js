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
    if (field === "avg_dryspell") return { unit: "weeks", description: "Mean annual maximum dry spell length joined from drought data by MWS uid" };
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
