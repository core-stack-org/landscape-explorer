import { fetchWfsFeatureCollection } from "./geolibreProject";
import { GEOLIBRE_LAYERS } from "../../config/geolibreLayers";
import villageGroups from "./villageSurveyGroups.json";

const water = [["Precipitation", "Rainfall"], ["ET", "Evapotranspiration"], ["RunOff", "Runoff"]];
const crops = [["single_kharif_cropped_area", "Single Kharif"], ["single_non_kharif_cropped_area", "Single non-Kharif"], ["doubly_cropped_area", "Double cropping"], ["triply_cropped_area", "Triple cropping"]];
const view = (id, group, layer, title, kind, unit, fields, note, options = {}) => ({ id, group, layer, title, kind, unit, fields, note, ...options });
export const VIEWS = [
  view("annual", "Water", "mws_layers", "Water through the years", "annual", "mm", water, "July–June water-balance estimates over the micro-watershed; these are depths, not water volumes."),
  view("seasonal", "Water", "mws_layers_fortnight", "Kharif, Rabi and Zaid", "seasonal", "mm", water, "Fortnight starts are grouped into July–October (Kharif), November–February (Rabi), and March–June (Zaid). Incomplete seasons remain blank."),
  view("fortnight", "Water", "mws_layers_fortnight", "Rainfall and water use within the year", "fortnight", "mm", water, "Dates mark each recorded interval. Gaps are missing values, not zero rainfall."),
  view("groundwater", "Water", "mws_layers", "Groundwater level change", "annual", "m", [["WellDepth", "Modelled level change"]], "A modelled change, not a measured well depth. The source signs are retained."),
  view("waterbody", "Water", "remote_sensed_waterbodies", "Waterbody area across seasons and years", "waterbody", "ha", [["area", "Annual"], ["k", "Kharif"], ["kr", "Rabi"], ["krz", "Zaid"]], "Seasonal percentages are converted to hectares using area_ored, the combined detected footprint. Water area is not storage volume.", { idField: "UID", entity: "Waterbody" }),
  view("extraction", "Water", "soge", "Stage of groundwater extraction", "category", "%", [["sgw_dev_pe", "Groundwater extraction"]], "Assessment data provides context for the MWS; it is not a yearly observation.", { context: ["class", "soge_block", "soge_distr"] }),
  view("aquifer", "Water", "aquifer", "Aquifer composition", "category", "% of area", ["Alluvium", "Banded Gneissic Complex", "Basalt", "Charnockite", "Gneiss", "Granite", "Intrusive", "Khondalite", "Laterite", "Limestone", "Quartzite", "Sandstone", "Schist", "Shale"].map(name => [`principle_aq_${name}_percent`, name]), "Published shares of the principal aquifer materials.", { context: ["aquifer_class", "Major_Aqui", "Principal_", "Age"] }),
  view("cropping", "Agriculture", "cropping_intensity", "Cropping area through time", "yearColumns", "ha", crops, "The four cropping categories are mutually exclusive land areas, not a sum of planted area across seasons.", { stacked: true }),
  view("crop-shares", "Agriculture", "cropping_intensity", "How cropping shares change", "yearColumns", "%", crops, "Shares use the sum of the four recorded cropping categories for that year. Fallow land is not inferred from a residual.", { stacked: true, shares: true }),
  view("intensity", "Agriculture", "cropping_intensity", "Cropping intensity through time", "yearColumns", "cropping intensity", [["cropping_intensity", "Cropping intensity"]], "Published annual cropping intensity for the selected MWS."),
  view("land-cover", "Agriculture", "lulc_vector", "Land cover through time", "yearColumns", "ha", [["built-up_area", "Built-up"], ["tree_forest_area", "Trees and forest"], ["shrub_scrub_area", "Shrubs and scrub"], ["barrenlands_area", "Barren land"], ["cropland_area", "Cropland"]], "Compare the recorded land-cover areas. Water is shown separately in the waterbody view."),
  ...["crop", "tree", "shrub"].map(cover => view(`ndvi-${cover}`, "Agriculture", `ndvi_${cover}`, `Vegetation greenness: ${cover === "crop" ? "crops" : cover + "s"}`, "ndvi", "NDVI", [["ndvi", "NDVI"]], "NDVI describes vegetation greenness. It is not a measurement of crop yield.")),
  view("terrain", "Land and drainage", "terrain_vector", "Know your terrain", "category", "% of area", [["plain_area", "Plains"], ["slopy_area", "Sloping land"], ["ridge_area", "Ridges"], ["valley_are", "Valleys"], ["hill_slope", "Hill slopes"]], "Published terrain shares, already expressed as percentages."),
  view("elevation", "Land and drainage", "dem_vector", "Elevation range", "category", "m", [["min_elevation", "Minimum"], ["mean_elevation", "Mean"], ["max_elevation", "Maximum"]], "Minimum, mean and maximum elevations within the MWS."),
  view("stream-order", "Land and drainage", "stream_order", "Stream-order shares", "category", "%", Array.from({length: 11}, (_, i) => [String(i + 1), `Order ${i + 1}`]), "Published stream-order shares for the selected MWS."),
  view("drainage-density", "Land and drainage", "drainage_density", "Drainage density", "category", "km/km²", [["drainage_density_std", "Standard"], ["drainage_density_weighted", "Weighted"]], "Stream length per unit MWS area, with the published standard and weighted measures."),
  view("population", "Village", "demographics", "Population and literacy", "category", "people", [["TOT_P", "Population"], ["P_SC", "Scheduled Caste"], ["P_ST", "Scheduled Tribe"], ["P_LIT", "Literate people"], ["P_ILL", "Illiterate people"]], "These population groups overlap and must not be added together.", {idField: "vill_ID", nameField: "vill_name", entity: "Village"}),
  view("facilities", "Village", "facilities", "Distances to services", "category", "km", [["essential_education", "Essential education"], ["higher_education", "Higher education"], ["essential_health", "Essential health"], ["advanced_health", "Advanced health"], ["essential_services", "Essential services"], ["financial_inclusion", "Financial services"], ["apmc_access", "Agricultural markets"], ["post_harvest", "Post-harvest services"], ["cooperative", "Cooperatives"], ["livestock", "Livestock services"], ["agri_support_infra", "Agricultural support"]].map(([key, label]) => [`l2_${key}_distance_km`, label]), "Recorded service distances for the selected village.", {idField: "village_id", nameField: "village_name", entity: "Village"}),
  view("livestock", "Village", "livestock", "Livestock counts", "category", "animals", [["cattle_total", "Cattle"], ["buffalo_total", "Buffalo"], ["sheep_total", "Sheep"], ["goat_total", "Goats"], ["pig_total", "Pigs"]], "Recorded counts of the main livestock groups.", {idField: "village_id", nameField: "village_name", entity: "Village"}),
  view("survey", "Village", "antyodaya", "Mission Antyodaya categories", "category", "category value", Object.keys(villageGroups).map(key => [`${key}_cat_value`, key.replaceAll("_", " ")]), "Use the survey-group views to read the original answers behind each category.", {idField: "village_id", nameField: "village_name", entity: "Village"}),
  ...Object.entries(villageGroups).map(([key, fields]) => view(`survey-${key}`, "Village survey", "antyodaya", key.replaceAll("_", " "), "category", "category value", [[`${key}_cat_value`, "Category value"]], "The table pairs the published category with the original survey answers. Survey codes and answers retain their original values.", {idField: "village_id", nameField: "village_name", entity: "Village", surveyFields: fields})),
];

export const finiteNumber = (value) => {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (String(value).trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export const periodObject = (value) => {
  if (typeof value === "string") {
    try {
      value = JSON.parse(value.replace(/"(?:\\.|[^"\\])*"|\bNaN\b|-?\bInfinity\b/g,
        (token) => token.startsWith('"') ? token : "null"));
    } catch { return {}; }
  }
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
};

export function periodDate(key, fortnight = false) {
  if (fortnight) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
    const time = Date.parse(`${key}T00:00:00Z`);
    return Number.isFinite(time) && new Date(time).toISOString().startsWith(key) ? time : null;
  }
  if (!/^\d{4}_\d{4}$/.test(key)) return null;
  const [start, end] = key.split("_").map(Number);
  return end === start + 1 ? Date.UTC(start, 6, 1) : null;
}


export const waterYear = date => {
  const d = new Date(date), y = d.getUTCFullYear() - (d.getUTCMonth() < 6 ? 1 : 0);
  return `${y}–${y + 1}`;
};
export const recordId = (record, view) => record[view.idField || "uid"];
export const validId = id => id !== null && id !== undefined && String(id).trim() !== "";
export const availableIds = (records, view) => Array.from(new Set(records.map(row => recordId(row, view)).filter(validId).map(String))).sort((a,b) => a.localeCompare(b, "en", { numeric: true }));

const YEARS = Array.from({length: 8}, (_, i) => 2017 + i);
export function chartRows(view, record) {
  if (!record) return [];
  if (view.kind === "category") return view.fields.map(([field, period]) => ({ period, field, value: finiteNumber(record[field]) }));
  if (view.kind === "yearColumns" || view.kind === "waterbody") return YEARS.map(year => {
    const suffix = `${String(year).slice(2)}-${String(year + 1).slice(2)}`;
    const values = Object.fromEntries(view.fields.map(([field]) => {
      const value = finiteNumber(record[`${field}_${view.kind === "waterbody" ? suffix : year}`]);
      const footprint = finiteNumber(record.area_ored);
      return [field, view.kind === "waterbody" && field !== "area" ? (value === null || footprint === null ? null : value * footprint / 100) : value];
    }));
    if (view.shares) {
      const all = Object.values(values), total = all.every(v => v !== null) ? all.reduce((a,b) => a+b, 0) : 0;
      Object.keys(values).forEach(key => { values[key] = total ? values[key] * 100 / total : null; });
    }
    return { period: `${year}–${year + 1}`, date: Date.UTC(year,6,1), ...values };
  });
  const dated = ["fortnight", "seasonal", "ndvi"].includes(view.kind);
  const rows = Object.keys(record).map(key => ({key, date: periodDate(key, dated)})).filter(r => r.date !== null).sort((a,b) => a.date-b.date)
    .map(({key,date}) => ({period: key.replace("_", "–"), date, ...Object.fromEntries(view.fields.map(([field]) => [field, finiteNumber(view.kind === "ndvi" ? record[key] : periodObject(record[key])[field])]))}));
  if (view.kind !== "seasonal") return rows;
  return YEARS.flatMap(year => ["Kharif", "Rabi", "Zaid"].map(season => {
    const expected = Array.from({length:26}, (_,i) => Date.UTC(year,6,1) + i*14*86400000).filter(date => seasonOf(date) === season);
    const selected = expected.map(date => rows.find(r => r.date === date));
    return {period: `${year}–${year+1} ${season}`, year: `${year}–${year+1}`, season,
      ...Object.fromEntries(view.fields.map(([field]) => [field, selected.every(row => row && row[field] !== null) ? selected.reduce((sum,row) => sum+row[field],0) : null]))};
  }));
}
const seasonOf = date => { const m = new Date(date).getUTCMonth(); return m >= 6 && m <= 9 ? "Kharif" : m >= 10 || m <= 1 ? "Rabi" : "Zaid"; };

export async function loadVisualiseSource(url, signal) {
  const data = await fetchWfsFeatureCollection({url}, {signal});
  const total = finiteNumber(data.numberMatched ?? data.totalFeatures);
  return { records: data.features.map(f => f.properties || {}), received: data.features.length, expected: total,
    partial: total !== null && total !== data.features.length, fetchedAt: new Date().toISOString() };
}
const EXTRA = {
  dem_vector: ["dem", "{district}_{tehsil}_dem_vector"],
  stream_order: ["stream_order", "stream_order_{district}_{tehsil}_vector"],
  drainage_density: ["drainage_density", "{district}_{tehsil}_drainage_density"],
  lulc_vector: ["lulc_vector", "lulc_vector_{district}_{tehsil}"],
  ndvi_crop: ["ndvi_timeseries", "ndvi_timeseries_{district}_{tehsil}_crop"],
  ndvi_tree: ["ndvi_timeseries", "ndvi_timeseries_{district}_{tehsil}_tree"],
  ndvi_shrub: ["ndvi_timeseries", "ndvi_timeseries_{district}_{tehsil}_shrub"],
};
export function sourceFor(view, project, scope) {
  const existing = project.layers?.find(layer => layer.id === `corestack-${view.layer}`);
  if (existing?.source?.url) return {name: existing.name, url: existing.source.url};
  const place = Object.fromEntries(Object.entries(scope).map(([key,value]) => [key, String(value).toLowerCase().replaceAll(" ", "_")]));
  const configured = GEOLIBRE_LAYERS.find(layer => layer.id === view.layer);
  const extra = EXTRA[view.layer];
  const workspace = configured?.workspace || extra?.[0];
  const name = configured ? configured.layerName(place) : extra?.[1].replace("{district}",place.district).replace("{tehsil}",place.tehsil);
  const base = (process.env.REACT_APP_GEOSERVER_URL || "https://geoserver.core-stack.org:8443/geoserver/").replace(/\/?$/, "/");
  return { name: configured?.name || view.title, url: `${base}${workspace}/ows?${new URLSearchParams({service:"WFS", version:"1.0.0", request:"GetFeature", typeName:`${workspace}:${name}`, outputFormat:"application/json", srsName:"EPSG:4326"})}` };
}

const csvValue = (value) => {
  let text = value === null || value === undefined ? "" : String(value);
  if (typeof value === "string" && /^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
};
export const toCsv = (rows) => {
  if (!rows.length) return "";
  const columns = Object.keys(rows[0]);
  return [columns.map(csvValue).join(","), ...rows.map((row) => columns.map((key) => csvValue(row[key])).join(","))].join("\r\n");
};
export const exportRows = (view, rows, scope, id, source) => rows.map(({ date, ...row }) => ({
  ...scope, [view.entity === "Village" ? "village_id" : view.id === "waterbody" ? "waterbody_id" : "mws_id"]: id,
  ...row, unit: view.unit, source,
}));


// Generate just the selected operation; this Python never drives the React charts.
export function pythonExample(view, scope, source, id, year, occurrence = 0) {
  const quote = value => JSON.stringify(value);
  const fields = JSON.stringify(Object.fromEntries(view.fields));
  const prelude = `import json\nimport requests\nimport pandas as pd\nimport matplotlib.pyplot as plt\n\nresponse = requests.get(${quote(source)}, timeout=90)\nresponse.raise_for_status()\nrecords = pd.DataFrame([f["properties"] for f in response.json()["features"]])\nrecord = records.loc[${view.entity === "Village" ? `pd.to_numeric(records[${quote(view.idField)}], errors="coerce") == ${Number(id) || 0}` : `records[${quote(view.idField || "uid")}].astype(str) == ${quote(id)}`}].iloc[${occurrence}]\n`;
  let operation;
  if (view.kind === "category") {
    operation = `fields = ${fields}\ndf = pd.to_numeric(record.reindex(list(fields)), errors="coerce").rename(index=fields).to_frame("value")\n`;
  } else if (view.kind === "yearColumns") {
    operation = `fields = ${fields}\nyears = range(2017, 2025)\ndf = pd.DataFrame({label: [record.get(f"{field}_{y}") for y in years] for field, label in fields.items()}, index=[f"{y}–{y+1}" for y in years]).apply(pd.to_numeric, errors="coerce")\n`;
    if (view.shares) operation += `df = df.div(df.sum(axis=1, min_count=len(fields)).replace(0, float("nan")), axis=0) * 100\n`;
  } else if (view.kind === "waterbody") {
    operation = `years = range(2017, 2025)\nsuffixes = [f"{str(y)[2:]}-{str(y+1)[2:]}" for y in years]\ndf = pd.DataFrame({"Annual": [record.get(f"area_{y}") for y in suffixes],\n    **{label: [record.get(f"{prefix}_{y}") for y in suffixes] for prefix, label in [("k", "Kharif"), ("kr", "Rabi"), ("krz", "Zaid")]}}, index=[f"{y}–{y+1}" for y in years]).apply(pd.to_numeric, errors="coerce")\n# Seasonal shares refer to the combined waterbody footprint.\ndf[["Kharif", "Rabi", "Zaid"]] *= pd.to_numeric(record.get("area_ored"), errors="coerce") / 100\n`;
  } else if (view.kind === "ndvi") {
    operation = `dates = record.index[record.index.str.fullmatch(r"\\d{4}-\\d{2}-\\d{2}")]\ndf = pd.to_numeric(record[dates], errors="coerce").to_frame("NDVI")\ndf.index = pd.to_datetime(df.index)\ndf = df.sort_index()\n`;
  } else {
    const dated = view.kind !== "annual";
    operation = `fields = ${fields}\nperiods = record.index[record.index.str.fullmatch(r"${dated ? "\\d{4}-\\d{2}-\\d{2}" : "\\d{4}_\\d{4}"}")]\nvalues = [json.loads(record[p]) if isinstance(record[p], str) else record[p] for p in periods]\ndf = pd.DataFrame(values, index=periods).reindex(columns=list(fields)).rename(columns=fields).apply(pd.to_numeric, errors="coerce")\ndf.index = pd.to_datetime(df.index${dated ? "" : '.str[:4] + "-07-01"'})\ndf = df.sort_index()\n`;
    if (view.kind === "seasonal") operation += `# Require every published fortnight start in each season.\nseason_rows = []\nfor y in range(2017, 2025):\n    starts = pd.date_range(f"{y}-07-01", periods=26, freq="14D")\n    seasons = {"Kharif": starts[(starts.month >= 7) & (starts.month <= 10)],\n               "Rabi": starts[(starts.month >= 11) | (starts.month <= 2)],\n               "Zaid": starts[(starts.month >= 3) & (starts.month <= 6)]}\n    for season, dates in seasons.items():\n        totals = df.reindex(dates).sum(min_count=len(dates))\n        totals.name = f"{y}–{y+1} {season}"\n        season_rows.append(totals)\ndf = pd.DataFrame(season_rows)\n`;
  }
  if (["fortnight", "ndvi"].includes(view.kind) && year && year !== "All years") {
    operation += `df = df.loc["${year.slice(0,4)}-07-01":"${Number(year.slice(0,4))+1}-06-30"]\n`;
  }
  let plot;
  if (view.kind === "seasonal") {
    plot = `fig, axes = plt.subplots(3, len(df.columns), figsize=(12, 8), sharex=True, squeeze=False)\nfor row, season in enumerate(["Kharif", "Rabi", "Zaid"]):\n    subset = df.loc[df.index.str.endswith(season)].copy()\n    subset.index = subset.index.str.split().str[0]\n    for col, field in enumerate(df.columns):\n        subset[field].plot(ax=axes[row, col], marker="o", title=f"{season} · {field}", ylabel="mm")\n`;
  } else if (view.kind === "category") {
    plot = `ax = df.plot.barh(legend=False, figsize=(9, ${Math.max(3, view.fields.length * 0.35)}), color="#2166ac")\nax.invert_yaxis()\nax.set_xlabel(${quote(view.unit)})\n`;
  } else if (view.stacked) {
    plot = `df.plot.bar(stacked=True, figsize=(10, 5), ylabel=${quote(view.unit)}, xlabel="July–June year")\n`;
  } else {
    plot = `df.plot(subplots=${view.fields.length > 1 ? "True" : "False"}, figsize=(10, ${Math.max(4, view.fields.length * 2)}), marker="o", ylabel=${quote(view.unit)})\n`;
  }
  const details = view.surveyFields ? `\n# Original survey answers for this category.\nsurvey_fields = ${JSON.stringify(Object.fromEntries(view.surveyFields.map(f => [f.col, f.label])))}\nprint(record.reindex(list(survey_fields)).rename(index=survey_fields).to_string())\n` : "";
  return prelude + operation + plot + `plt.tight_layout()\nplt.show()\nprint(df.to_string())\n` + details;
}
