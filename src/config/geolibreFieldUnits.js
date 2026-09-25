// All display descriptions and units live in geolibreCatalog.json.
// The aliases only bridge GeoServer spellings to an existing catalog field.
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

export const fieldDefinitionFor = (layer, field, fieldMetadata, fieldPatterns = {}) => {
  const sources = layer?.unitSources || [];
  const exact = sources.map(source => fieldMetadata[source]?.[field]).find(Boolean);
  if (exact) return exact;
  if (fieldMetadata.common?.[field]) return fieldMetadata.common[field];
  if (layer?.baseId === "nrega" && NREGA_ALIASES[field]) {
    return fieldMetadata.nrega_assets?.[NREGA_ALIASES[field]] || null;
  }
  for (const source of sources) {
    const pattern = fieldPatterns[source]?.find(({ pattern }) => new RegExp(pattern).test(field));
    if (pattern) return { unit: pattern.unit };
  }
  return null;
};
