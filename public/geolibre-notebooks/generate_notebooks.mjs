import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const OUTPUT_DIR = path.dirname(fileURLToPath(import.meta.url));
const CHECK_ONLY = process.argv.includes("--check");
const DEFAULT_SCOPE = {
  state: "Jharkhand",
  district: "Dumka",
  tehsil: "Masalia",
  bounds: [86.89, 23.94, 87.24, 24.28],
};

const vector = (id, label, domain, workspace, layerNameTemplate, period, description) => ({
  id,
  label,
  domain,
  service: "WFS",
  workspace,
  layerNameTemplate,
  period,
  description,
});

const raster = (id, label, domain, workspace, layerNameTemplate, period, description) => ({
  id,
  label,
  domain,
  service: "WCS",
  workspace,
  layerNameTemplate,
  period,
  description,
});

const BASE_LAYERS = [
  vector("administrative_boundaries", "Administrative Boundaries", "Demographic", "panchayat_boundaries", "{district}_{tehsil}", "Current published boundary", "Village and panchayat boundaries for the selected tehsil."),
  vector("demographics", "Socio-Economic Profile", "Demographic", "panchayat_boundaries", "{district}_{tehsil}", "Census-derived profile", "Population, households, social groups, and literacy attributes."),
  vector("facilities", "Facilities and Services Access", "Village", "facilities_proximity", "facilities_{district}_{tehsil}", "Current published analysis", "Village-level distance and access indicators for essential services."),
  vector("antyodaya", "Mission Antyodaya Village Indicators (2020)", "Village", "antyodaya_2020", "antyodaya20_{district}_{tehsil}", "2020", "Multi-domain village development indicators."),
  vector("livestock", "Village Livestock Census", "Village", "livestocks", "livestocks_{district}_{tehsil}", "Latest published census", "Village livestock counts by species and sex."),
  vector("mws_layers", "Micro-watersheds and Hydrological Variables", "Hydrology", "mws_layers", "deltaG_well_depth_{district}_{tehsil}", "2017-2018 to 2024-2025", "Annual groundwater-storage change and MWS identifiers."),
  vector("hydrological_boundaries", "Hydrological Boundaries", "Hydrology", "mws_layers", "deltaG_well_depth_{district}_{tehsil}", "Current MWS boundary", "The same MWS geometry with a boundary-focused presentation."),
  vector("mws_layers_fortnight", "Fortnightly Hydrological Variables", "Hydrology", "mws_layers", "deltaG_fortnight_{district}_{tehsil}", "July 2017 to June 2025", "Fortnightly precipitation, evapotranspiration, runoff, and related water-balance values."),
  vector("terrain_vector", "Terrain Vector", "Land", "terrain", "{district}_{tehsil}_cluster", "Current terrain analysis", "MWS-level plains, slopes, valleys, ridges, hills, and terrain cluster."),
  vector("drainage", "Drainage", "Hydrology", "drainage", "{district}_{tehsil}", "Current published network", "Drainage lines and stream order."),
  vector("river", "Rivers", "Hydrology", "river", "{district}_{tehsil}_river_vector", "Current published network", "River lines and available identifiers."),
  vector("canal", "Canals", "Hydrology", "canal", "{district}_{tehsil}_canal_vector", "Current published network", "Canal lines, project, purpose, and status where available."),
  vector("remote_sensed_waterbodies", "Remote-Sensed Waterbodies", "Hydrology", "swb", "surface_waterbodies_{district}_{tehsil}", "2017-2018 to 2024-2025", "Waterbody extent, seasonal area, use, ownership, storage, and beneficiaries."),
  vector("soge", "Stage of Groundwater Extraction", "Hydrology", "soge", "soge_vector_{district}_{tehsil}", "Latest published assessment", "Groundwater extraction, recharge, availability, and assessment class."),
  vector("aquifer", "Aquifer", "Hydrology", "aquifer", "aquifer_vector_{district}_{tehsil}", "Latest published assessment", "Aquifer type, lithology, yield, depth, and management guidance."),
  vector("cropping_intensity", "Cropping Intensity", "Agriculture", "crop_intensity", "{district}_{tehsil}_intensity", "2017 to 2024", "Annual cropping intensity and single-, double-, and triple-cropped area."),
  vector("drought", "Drought", "Agriculture", "drought", "{district}_{tehsil}_drought", "2017 to 2024", "Dry spells and weekly mild, moderate, and severe drought indicators."),
  vector("nrega", "NREGA Assets", "NREGA", "nrega_assets", "{district}_{tehsil}", "Current published assets", "NREGA asset locations, work categories, and expenditure fields."),
  vector("green_credit", "Green Credit Projects", "Restoration", "green_credit", "{district}_{tehsil}_green_credit", "Current published projects", "Green Credit project polygons and available land information."),
  vector("land_conflicts", "Land Conflicts", "Industry", "lcw", "{district}_{tehsil}_lcw_conflict", "Current published records", "Land-conflict locations with titles, dates, and source links."),
  vector("industry", "Industries and CSR", "Industry", "factory_csr", "{district}_{tehsil}_factory_csr", "Current published records", "Industry and CSR locations with company classifications."),
  vector("mining", "Mining Sites", "Industry", "mining", "{district}_{tehsil}_mining", "Current published records", "Published mining locations where available."),
  raster("terrain", "Terrain", "Land", "terrain", "{district}_{tehsil}_terrain_raster", "Current terrain analysis", "Raster landform classes."),
  raster("dem", "Digital Elevation Model", "Land", "dem", "{district}_{tehsil}_dem_raster", "Current published DEM", "Elevation raster for terrain and relief analysis."),
  raster("clart", "CLART", "Hydrology", "clart", "{district}_{tehsil}_clart", "Current published analysis", "Recharge and water-harvesting intervention classes."),
  raster("afforestation", "Change Detection: Afforestation", "Restoration", "change_detection", "change_{district}_{tehsil}_Afforestation", "Published change period", "Afforestation change classes."),
  raster("deforestation", "Change Detection: Deforestation", "Restoration", "change_detection", "change_{district}_{tehsil}_Deforestation", "Published change period", "Deforestation change classes."),
  raster("degradation", "Change Detection: Degradation", "Restoration", "change_detection", "change_{district}_{tehsil}_Degradation", "Published change period", "Land-degradation change classes."),
  raster("urbanization", "Change Detection: Urbanization", "Restoration", "change_detection", "change_{district}_{tehsil}_Urbanization", "Published change period", "Urbanization change classes."),
  raster("cropintensity", "Change Detection: Crop Intensity", "Restoration", "change_detection", "change_{district}_{tehsil}_CropIntensity", "Published change period", "Cropping-intensity change classes."),
  raster("restoration", "Restoration Opportunities", "Restoration", "restoration", "restoration_{district}_{tehsil}_raster", "Current published analysis", "Mosaic, wide-scale restoration, and protection opportunities."),
];

const LULC_YEARS = ["17_18", "18_19", "19_20", "20_21", "21_22", "22_23", "23_24", "24_25"];
const LULC_LEVELS = [
  ["lulc_level_1", "LULC Level 1", "Land", "Broad land-cover classes"],
  ["lulc_level_2", "LULC Level 2", "Land", "Intermediate land-cover classes"],
  ["lulc_level_3", "LULC Level 3", "Agriculture", "Detailed land-cover classes"],
];
const LULC_LAYERS = LULC_LEVELS.flatMap(([id, label, domain, description]) =>
  LULC_YEARS.map((year) =>
    raster(
      `${id}_${year}`,
      `${label} · ${year.replace("_", "-")}`,
      domain,
      "LULC_level_3",
      `LULC_${year}_{district}_{tehsil}_level_3`,
      `20${year.slice(0, 2)}-20${year.slice(3)}`,
      description
    )
  )
);
const ALL_LAYERS = [...BASE_LAYERS, ...LULC_LAYERS];

const source = (value) => {
  const lines = String(value).replace(/\r\n?/g, "\n").split("\n");
  return lines.map((line, index) => (index < lines.length - 1 ? `${line}\n` : line));
};

const markdown = (id, value) => ({ cell_type: "markdown", id, metadata: {}, source: source(value) });
const code = (id, value, metadata = {}) => ({
  cell_type: "code",
  execution_count: null,
  id,
  metadata,
  outputs: [],
  source: source(value),
});
const hidden = (id, value) => code(id, value, {
  jupyter: { source_hidden: true },
  tags: ["corestack-hidden"],
});
const optional = (id, value) => code(id, value, {
  collapsed: true,
  jupyter: { source_hidden: true },
  tags: ["corestack-optional"],
});
const pythonJson = (value) => JSON.stringify(JSON.stringify(value));

const commonSetup = (layerIds) => {
  const specs = ALL_LAYERS.filter((layer) => layerIds.includes(layer.id));
  return String.raw`import json, re, sys
from urllib.parse import urlencode
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from IPython.display import display
import geolibre

GEOSERVER_BASE = "https://geoserver.core-stack.org:8443/geoserver/"
SCOPE = json.loads(${pythonJson(DEFAULT_SCOPE)})
LAYER_SPECS = json.loads(${pythonJson(specs)})
m = geolibre.connect()
MAP_LAYERS = {}

def geoserver_name(value):
    value = re.sub(r"[()]", "", str(value or "").strip().lower())
    return re.sub(r"_+", "_", re.sub(r"\s+", "_", value)).strip("_")

def selected_scope():
    return {
        "state": str(SCOPE["state"]).strip(),
        "district": geoserver_name(SCOPE["district"]),
        "tehsil": geoserver_name(SCOPE["tehsil"]),
    }

def get_spec(layer_id):
    return next(layer for layer in LAYER_SPECS if layer["id"] == layer_id)

def layer_url(layer_id, cql_filter=None, max_features=None):
    scope = selected_scope()
    spec = get_spec(layer_id)
    layer_name = spec["layerNameTemplate"].format(**scope)
    qualified = f'{spec["workspace"]}:{layer_name}'
    if spec["service"] == "WFS":
        params = {"service": "WFS", "version": "1.0.0", "request": "GetFeature",
                  "typeName": qualified, "outputFormat": "application/json", "srsName": "EPSG:4326"}
        if cql_filter:
            params["CQL_FILTER"] = cql_filter
        if max_features:
            params["maxFeatures"] = int(max_features)
        return f'{GEOSERVER_BASE}{spec["workspace"]}/ows?{urlencode(params)}'
    params = {"service": "WCS", "version": "2.0.1", "request": "GetCoverage",
              "CoverageId": qualified, "format": "geotiff", "compression": "LZW"}
    return f'{GEOSERVER_BASE}{spec["workspace"]}/wcs?{urlencode(params)}'

async def fetch_json(url, label="GeoServer layer"):
    try:
        if sys.platform == "emscripten":
            from pyodide.http import pyfetch
            response = await pyfetch(url)
            if not response.ok:
                raise RuntimeError(f"HTTP {response.status}")
            return await response.json()
        import urllib.request
        with urllib.request.urlopen(url, timeout=90) as response:
            return json.loads(response.read().decode("utf-8"))
    except Exception as error:
        scope = selected_scope()
        raise RuntimeError(
            f'{label} is not available for {scope["district"]}/{scope["tehsil"]}, or GeoServer could not be reached: {error}'
        ) from error

async def load_geojson(layer_id, cql_filter=None, max_features=None):
    spec = get_spec(layer_id)
    if spec["service"] != "WFS":
        raise ValueError(f'{spec["label"]} is a raster. Use its WCS URL instead of loading it as GeoJSON.')
    data = await fetch_json(layer_url(layer_id, cql_filter, max_features), spec["label"])
    if data.get("type") != "FeatureCollection":
        raise RuntimeError(f'{spec["label"]} did not return GeoJSON features.')
    return data

def to_frame(data):
    rows = [dict(feature.get("properties") or {}) for feature in data.get("features", [])]
    return pd.DataFrame(rows)

def uid_column(frame):
    for name in ("uid", "UID", "MWS_UID", "MWS UID"):
        if name in frame.columns:
            return name
    raise KeyError("This layer has no recognised MWS identifier column.")

def with_uid(frame):
    result = frame.copy()
    result["uid"] = result[uid_column(result)].astype(str)
    return result

def numeric(frame, columns):
    return frame.loc[:, columns].apply(pd.to_numeric, errors="coerce")

def json_component(value, component):
    try:
        value = json.loads(value) if isinstance(value, str) else value
        return float(value.get(component)) if isinstance(value, dict) and value.get(component) is not None else np.nan
    except (TypeError, ValueError, json.JSONDecodeError):
        return np.nan

def component_values(frame, columns, component):
    return frame.loc[:, columns].apply(
        lambda series: series.map(lambda value: json_component(value, component))
    )

def features_for_uids(data, uids):
    wanted = {str(uid) for uid in uids}
    names = ("uid", "UID", "MWS_UID", "MWS UID")
    features = []
    for feature in data.get("features", []):
        properties = feature.get("properties") or {}
        value = next((properties.get(name) for name in names if properties.get(name) is not None), None)
        if str(value) in wanted:
            features.append(feature)
    return {"type": "FeatureCollection", "features": features}

def geojson_bounds(data):
    points = []
    def visit(value):
        if isinstance(value, list) and len(value) >= 2 and all(isinstance(v, (int, float)) for v in value[:2]):
            points.append(value[:2])
        elif isinstance(value, list):
            for item in value:
                visit(item)
    for feature in data.get("features", []):
        visit((feature.get("geometry") or {}).get("coordinates", []))
    if not points:
        return None
    xs, ys = zip(*points)
    return [min(xs), min(ys), max(xs), max(ys)]

def show_on_map(key, data, name, **style):
    if not data.get("features"):
        print(f"No features to map for {name}.")
        return None
    previous_layer_id = MAP_LAYERS.get(key)
    if previous_layer_id:
        try:
            m.remove_layer(previous_layer_id)
        except Exception:
            pass
    MAP_LAYERS[key] = m.add_geojson(data, name=name, **style)
    bounds = geojson_bounds(data)
    if bounds:
        m.fit_bounds(bounds)
    return MAP_LAYERS[key]

def year_columns(frame, prefix="", pattern=r"^\d{4}_\d{4}$"):
    return sorted(column for column in frame.columns if column.startswith(prefix) and re.search(pattern, column))

print(f'Ready for {SCOPE["tehsil"]}, {SCOPE["district"]}.')`;
};

const notebook = ({ id, title, subtitle, layerIds, analysis, cells }) => ({
  cells: [
    markdown("corestack-title", `# ${title}\n\n${subtitle}\n\nRun each cell with **Shift+Enter**. This download is already scoped to the active KYL tehsil and needs no package-installation cell.`),
    hidden("corestack-setup", commonSetup(layerIds)),
    hidden("corestack-analysis", analysis),
    ...cells,
  ],
  metadata: {
    kernelspec: { display_name: "Python (Pyodide)", language: "python", name: "python" },
    language_info: { name: "python" },
    corestack: {
      id,
      title,
      templateScope: DEFAULT_SCOPE,
      templateVersion: "2026-08-20",
      relevantLayerIds: layerIds,
      requiresGeoLibre: "2.6.x",
    },
  },
  nbformat: 4,
  nbformat_minor: 5,
});

const quickStart = {
  cells: [
    markdown("quick-title", "# Quick start: inspect five micro-watersheds\n\nThis smallest CoRE Stack notebook confirms that browser Python works, fetches five published features, shows their attributes, and adds them to the adjacent GeoLibre map. Run the four code cells in order with **Shift+Enter**. No package installation is needed."),
    markdown("quick-kernel-title", "## 1. Confirm the browser kernel"),
    code("quick-kernel", `import json
SCOPE = json.loads(${pythonJson(DEFAULT_SCOPE)})
print(f"Python is ready for {SCOPE['tehsil']}, {SCOPE['district']}. No packages were installed.")`, {
      tags: ["corestack-hidden"],
    }),
    markdown("quick-fetch-title", "## 2. Fetch five features\n\nThis uses only Pyodide's browser HTTP helper and a bounded GeoServer WFS request."),
    code("quick-fetch", `import re
from pyodide.http import pyfetch
district, tehsil = [re.sub(r"[^a-z0-9]+", "_", str(value).lower()).strip("_") for value in (SCOPE["district"], SCOPE["tehsil"])]
layer_name = f"deltaG_well_depth_{district}_{tehsil}"
url = f"https://geoserver.core-stack.org:8443/geoserver/mws_layers/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=mws_layers:{layer_name}&outputFormat=application/json&srsName=EPSG:4326&maxFeatures=5"
response = await pyfetch(url)
if not response.ok: raise RuntimeError(f"GeoServer returned HTTP {response.status}.")
data = await response.json()
print(f"Loaded {len(data['features'])} micro-watersheds from {SCOPE['tehsil']}.")`),
    markdown("quick-attributes-title", "## 3. Inspect the attributes\n\nExpand a record to see annual groundwater values, area, net-change summaries, and its MWS identifier."),
    code("quick-attributes", `from IPython.display import JSON, display
attributes = [feature.get("properties", {}) for feature in data["features"]]
display(JSON(attributes, expanded=False))`),
    markdown("quick-map-title", "## 4. Add the same five features to GeoLibre\n\nThe new layer is temporary and does not change the published CoRE Stack data."),
    code("quick-map", `import geolibre
m = geolibre.connect()
layer_id = m.add_geojson(data, name="Notebook · five MWS preview", fillColor="#60a5fa", strokeColor="#1e3a8a", fillOpacity=0.35)
print(f"Added temporary GeoLibre layer: {layer_id}")`),
  ],
  metadata: {
    kernelspec: { display_name: "Python (Pyodide)", language: "python", name: "python" },
    language_info: { name: "python" },
    corestack: {
      id: "quick-mws-preview",
      title: "Quick start: inspect five micro-watersheds",
      templateScope: DEFAULT_SCOPE,
      templateVersion: "2026-08-20",
      relevantLayerIds: ["mws_layers"],
      requiresGeoLibre: "2.6.x",
      minimalDependencies: true,
    },
  },
  nbformat: 4,
  nbformat_minor: 5,
};

const overview = notebook({
  id: "tehsil-mws-overview",
  title: "Understand the micro-watersheds in a tehsil",
  subtitle: "Join annual groundwater change with terrain composition to see how the selected tehsil is structured before examining one MWS in detail.",
  layerIds: ["mws_layers", "terrain_vector"],
  analysis: String.raw`def build_overview(mws_frame, terrain_frame):
    mws = with_uid(mws_frame).set_index("uid")
    terrain = with_uid(terrain_frame).set_index("uid")
    annual = [column for column in mws.columns if re.match(r"^\d{4}_\d{4}$", column)]
    result = pd.DataFrame(index=mws.index)
    result["Area (ha)"] = pd.to_numeric(mws.get("area_in_ha"), errors="coerce")
    result["Mean annual groundwater change"] = component_values(mws, annual, "DeltaG").mean(axis=1)
    result["Recent net groundwater change"] = pd.to_numeric(mws.get("Net2020_25"), errors="coerce")
    for source, label in [("plain_area", "Plains"), ("slopy_area", "Slopes"),
                          ("valley_are", "Valleys"), ("ridge_area", "Ridges"),
                          ("hill_slope", "Hills")]:
        result[label + " (%)"] = pd.to_numeric(terrain.get(source), errors="coerce").reindex(result.index)
    result.index.name = "MWS UID"
    return result

def overview_summary(profile):
    return pd.DataFrame({
        "Measure": ["Micro-watersheds", "Mapped area (ha)", "Median annual groundwater change", "MWS with negative recent net change"],
        "Value": [len(profile), round(profile["Area (ha)"].sum(), 1),
                  round(profile["Mean annual groundwater change"].median(), 2),
                  int((profile["Recent net groundwater change"] < 0).sum())],
    })

def plot_overview(profile):
    fig, axes = plt.subplots(1, 2, figsize=(12, 4.2))
    values = profile["Mean annual groundwater change"].dropna()
    axes[0].hist(values, bins=min(12, max(5, len(values) // 5)), color="#2563eb", edgecolor="white")
    axes[0].axvline(0, color="#991b1b", linewidth=1.5, label="No net change")
    axes[0].set(title="Groundwater-change distribution", xlabel="Mean annual change", ylabel="Number of MWS")
    axes[0].legend()
    terrain_columns = ["Plains (%)", "Slopes (%)", "Valleys (%)", "Ridges (%)", "Hills (%)"]
    weighted = profile[terrain_columns].mul(profile["Area (ha)"], axis=0).sum().div(profile["Area (ha)"].sum())
    weighted.sort_values().plot.barh(ax=axes[1], color="#65a30d")
    axes[1].set(title="Area-weighted terrain composition", xlabel="Share of mapped area (%)", ylabel="")
    plt.tight_layout()
    plt.show()`,
  cells: [
    markdown("overview-load-title", "## 1. Load only the two relevant layers\n\nThe join uses the published MWS UID. Missing rows remain visible rather than being silently filled."),
    code("overview-load", `mws_geojson = await load_geojson("mws_layers")
terrain_geojson = await load_geojson("terrain_vector")
mws = to_frame(mws_geojson)
terrain = to_frame(terrain_geojson)
profile = build_overview(mws, terrain)
display(overview_summary(profile))
display(profile.round(2).head(10))`),
    markdown("overview-chart-title", "## 2. Read the tehsil as a whole\n\nThe histogram preserves variation between MWSes; the terrain chart uses mapped area rather than treating differently sized watersheds as equal."),
    code("overview-chart", `plot_overview(profile)`),
    markdown("overview-map-title", "## 3. Return the evidence to the map\n\nAll MWS polygons are added as a temporary notebook layer. Use GeoLibre identify or its attribute table to inspect one."),
    code("overview-map", `show_on_map(
    "overview-mws", mws_geojson, "Notebook · MWS overview",
    fillColor="#60a5fa", strokeColor="#1e3a8a", fillOpacity=0.28,
)`),
    markdown("overview-interpret", "## Interpretation\n\nA tehsil average is context, not a description of every MWS. Negative groundwater change identifies a measured direction in the published series; it does not by itself establish the cause."),
    markdown("overview-optional-title", "## Optional: check completeness"),
    optional("overview-optional", `completeness = profile.notna().mean().mul(100).round(1).sort_values()
display(completeness.rename("Populated values (%)").to_frame())`),
  ],
});

const hydrology = notebook({
  id: "hydrology-water-balance",
  title: "Follow water conditions through time",
  subtitle: "Select one micro-watershed and compare annual groundwater change, fortnightly rainfall/ET/runoff, and the area of mapped surface waterbodies.",
  layerIds: ["mws_layers", "mws_layers_fortnight", "remote_sensed_waterbodies"],
  analysis: String.raw`def annual_groundwater(frame, mws_id):
    row = with_uid(frame).set_index("uid").loc[str(mws_id)]
    columns = sorted(column for column in frame.columns if re.match(r"^\d{4}_\d{4}$", column))
    return pd.DataFrame({"Year": [column.replace("_", "-") for column in columns],
                         "Groundwater change": [json_component(row[column], "DeltaG") for column in columns]})

def fortnightly_balance(frame, mws_id):
    row = with_uid(frame).set_index("uid").loc[str(mws_id)]
    records = []
    for column in sorted(name for name in frame.columns if re.match(r"^\d{4}-\d{2}-\d{2}$", name)):
        value = row[column]
        try:
            value = json.loads(value) if isinstance(value, str) else value
            records.append({"Date": pd.to_datetime(column), "Precipitation": float(value.get("Precipitation") or 0),
                            "ET": float(value.get("ET") or 0), "Runoff": float(value.get("RunOff") or 0)})
        except (TypeError, ValueError, json.JSONDecodeError):
            continue
    return pd.DataFrame(records)

def waterbody_history(frame):
    columns = sorted(column for column in frame.columns if re.match(r"^area_\d{2}-\d{2}$", column))
    values = numeric(frame, columns).sum(axis=0) if len(frame) else pd.Series(index=columns, dtype=float)
    return pd.DataFrame({"Year": [column.replace("area_", "20", 1) for column in columns],
                         "Mapped waterbody area": values.values})

def plot_hydrology(annual, fortnight, waterbodies, mws_id):
    fig, axes = plt.subplots(3, 1, figsize=(11, 10))
    axes[0].plot(annual["Year"], annual["Groundwater change"], marker="o", color="#1d4ed8")
    axes[0].axhline(0, color="#991b1b", linewidth=1)
    axes[0].set(title=f"Annual groundwater change · {mws_id}", ylabel="Published change")
    for field, color in [("Precipitation", "#2563eb"), ("ET", "#ea580c"), ("Runoff", "#16a34a")]:
        axes[1].plot(fortnight["Date"], fortnight[field], label=field, color=color, linewidth=1)
    axes[1].set(title="Fortnightly water-balance components", ylabel="mm")
    axes[1].legend(ncol=3)
    axes[2].plot(waterbodies["Year"], waterbodies["Mapped waterbody area"], marker="o", color="#0891b2")
    axes[2].set(title="Surface-water area inside this MWS", ylabel="Published area", xlabel="Hydrological year")
    plt.tight_layout()
    plt.show()`,
  cells: [
    markdown("hydrology-load-title", "## 1. Load one MWS history\n\nThe notebook selects the first published MWS and then requests only its fortnightly history. This keeps the browser download small and deterministic."),
    code("hydrology-load", `annual_geojson = await load_geojson("mws_layers", max_features=1)
annual_frame = to_frame(annual_geojson)
if annual_frame.empty: raise RuntimeError("No micro-watershed was published for this tehsil.")
mws_id = with_uid(annual_frame)["uid"].iloc[0]
safe_mws_id = str(mws_id).replace("'", "''")
fortnight_geojson = await load_geojson("mws_layers_fortnight", f"uid='{safe_mws_id}'")
fortnight_frame = to_frame(fortnight_geojson)
if fortnight_frame.empty: raise RuntimeError(f"No fortnightly history was published for MWS {mws_id}.")
print(f"Selected MWS {mws_id} from {SCOPE['tehsil']}, {SCOPE['district']}.")`),
    markdown("hydrology-plot-title", "## 2. Plot the selected MWS\n\nThe waterbody request uses its published `mws_uid_list` membership field instead of downloading every waterbody in the tehsil."),
    code("hydrology-plot", `water_filter = f"mws_uid_list LIKE '%{safe_mws_id}%'"
water_geojson = await load_geojson("remote_sensed_waterbodies", water_filter)
annual_series = annual_groundwater(annual_frame, mws_id)
fortnight_series = fortnightly_balance(fortnight_frame, mws_id)
waterbody_series = waterbody_history(to_frame(water_geojson))
print(f"Found {len(water_geojson['features'])} intersecting waterbodies.")
plot_hydrology(annual_series, fortnight_series, waterbody_series, mws_id)`),
    markdown("hydrology-map-title", "## 3. Locate the selected MWS\n\nThe highlighted polygon is temporary and does not alter CoRE Stack data."),
    code("hydrology-map", `selected = features_for_uids(annual_geojson, [mws_id])
show_on_map(
    "selected-hydrology-mws", selected, f"Notebook · {mws_id}",
    fillColor="#22d3ee", strokeColor="#164e63", fillOpacity=0.55,
)`),
    markdown("hydrology-interpret", "## Interpretation\n\nGroundwater-storage change, rainfall, ET, runoff, and mapped surface-water area describe different parts of the water system. Their co-movement can motivate questions, but it does not establish that one series caused another."),
    markdown("hydrology-optional-title", "## Optional: inspect the underlying fortnightly table"),
    optional("hydrology-optional", `display(fortnight_series.tail(26).round(2))`),
  ],
});

const agriculture = notebook({
  id: "agriculture-drought",
  title: "Compare cropping intensity and drought",
  subtitle: "See how cropping intensity and moderate-to-severe drought vary by year and across micro-watersheds without turning association into a causal claim.",
  layerIds: ["cropping_intensity", "drought"],
  analysis: String.raw`YEARS = list(range(2017, 2025))

def agriculture_profile(crop_frame, drought_frame):
    crop = with_uid(crop_frame).set_index("uid")
    drought = with_uid(drought_frame).set_index("uid")
    profile = pd.DataFrame(index=crop.index.intersection(drought.index))
    for year in YEARS:
        profile[f"crop_{year}"] = pd.to_numeric(crop.get(f"cropping_intensity_{year}"), errors="coerce")
        moderate = pd.to_numeric(drought.get(f"w_mod_{year}"), errors="coerce")
        severe = pd.to_numeric(drought.get(f"w_sev_{year}"), errors="coerce")
        profile[f"drought_{year}"] = moderate.add(severe, fill_value=np.nan)
    profile["Mean cropping intensity"] = profile[[f"crop_{year}" for year in YEARS]].mean(axis=1)
    profile["Mean moderate + severe drought weeks"] = profile[[f"drought_{year}" for year in YEARS]].mean(axis=1)
    profile.index.name = "MWS UID"
    return profile

def yearly_agriculture(profile):
    return pd.DataFrame({
        "Year": YEARS,
        "Mean cropping intensity": [profile[f"crop_{year}"].mean() for year in YEARS],
        "MWS with 5+ drought weeks (%)": [(profile[f"drought_{year}"] >= 5).mean() * 100 for year in YEARS],
    })

def plot_yearly_agriculture(summary):
    fig, axes = plt.subplots(2, 1, figsize=(10, 7), sharex=True)
    axes[0].plot(summary["Year"], summary["Mean cropping intensity"], marker="o", color="#15803d")
    axes[0].set(title="Tehsil mean cropping intensity", ylabel="Cropping intensity")
    axes[1].bar(summary["Year"], summary["MWS with 5+ drought weeks (%)"], color="#dc2626")
    axes[1].set(title="MWSes meeting the published drought-year threshold", ylabel="Share of MWS (%)", xlabel="Year")
    plt.tight_layout()
    plt.show()

def plot_agriculture_association(profile):
    clean = profile[["Mean moderate + severe drought weeks", "Mean cropping intensity"]].dropna()
    correlation = clean.corr().iloc[0, 1] if len(clean) > 1 else np.nan
    plt.figure(figsize=(8, 5))
    plt.scatter(clean.iloc[:, 0], clean.iloc[:, 1], color="#7c3aed", alpha=0.75)
    plt.xlabel("Mean moderate + severe drought weeks")
    plt.ylabel("Mean cropping intensity")
    plt.title(f"Within-tehsil association · correlation {correlation:.2f}")
    plt.show()
    return clean, correlation`,
  cells: [
    markdown("agriculture-load-title", "## 1. Join the two MWS layers\n\nThe published MWS UID keeps every comparison at the same spatial unit."),
    code("agriculture-load", `crop_geojson = await load_geojson("cropping_intensity")
drought_geojson = await load_geojson("drought")
crop_frame = to_frame(crop_geojson)
drought_frame = to_frame(drought_geojson)
profile = agriculture_profile(crop_frame, drought_frame)
summary = yearly_agriculture(profile)
display(summary.round(2))`),
    markdown("agriculture-years-title", "## 2. Compare years without hiding the two scales\n\nSeparate panels avoid implying that cropping intensity and drought percentage use the same units."),
    code("agriculture-years", `plot_yearly_agriculture(summary)`),
    markdown("agriculture-association-title", "## 3. Inspect association across MWSes\n\nThe printed correlation is descriptive for this tehsil and period. It is not an estimate of drought's causal effect."),
    code("agriculture-association", `association, correlation = plot_agriculture_association(profile)
print(f"Compared {len(association)} MWSes; descriptive correlation = {correlation:.2f}.")`),
    markdown("agriculture-map-title", "## 4. Map a transparent shortlist\n\nThis shortlist means above-upper-quartile drought weeks and below-median cropping intensity; the thresholds are printed."),
    code("agriculture-map", `drought_cut = profile["Mean moderate + severe drought weeks"].quantile(0.75)
crop_cut = profile["Mean cropping intensity"].median()
shortlist = profile[(profile["Mean moderate + severe drought weeks"] >= drought_cut) &
                    (profile["Mean cropping intensity"] <= crop_cut)]
print(f"Thresholds: drought ≥ {drought_cut:.2f} weeks; cropping intensity ≤ {crop_cut:.2f}.")
display(shortlist.iloc[:, -2:].round(2))
show_on_map("agriculture-shortlist", features_for_uids(crop_geojson, shortlist.index),
            "Notebook · drought/cropping shortlist", fillColor="#f97316", strokeColor="#7c2d12", fillOpacity=0.6)`),
    markdown("agriculture-interpret", "## Interpretation\n\nThis notebook can reveal years or MWSes worth investigating. Rainfall, irrigation, soils, crop choice, infrastructure, markets, and data quality can all affect the observed relationship."),
    markdown("agriculture-optional-title", "## Optional: inspect annual values for one MWS"),
    optional("agriculture-optional", `example_uid = sorted(profile.index)[0]
print(f"Example MWS: {example_uid}")
display(profile.loc[[example_uid]].round(2))`),
  ],
});

const profileAnalysis = String.raw`PROFILE_METRICS = [
    "Area (ha)", "Mean annual groundwater change", "Recent net groundwater change",
    "Mean cropping intensity", "Mean moderate + severe drought weeks",
    "Plain terrain (%)", "Slope and hill terrain (%)",
]

def build_mws_profile(mws_frame, crop_frame, drought_frame, terrain_frame):
    mws = with_uid(mws_frame).set_index("uid")
    crop = with_uid(crop_frame).set_index("uid")
    drought = with_uid(drought_frame).set_index("uid")
    terrain = with_uid(terrain_frame).set_index("uid")
    common = mws.index.intersection(crop.index).intersection(drought.index).intersection(terrain.index)
    result = pd.DataFrame(index=common)
    area = pd.to_numeric(mws.get("area_in_ha"), errors="coerce").reindex(common)
    groundwater = [column for column in mws.columns if re.match(r"^\d{4}_\d{4}$", column)]
    crop_years = [column for column in crop.columns if re.match(r"^cropping_intensity_\d{4}$", column)]
    drought_years = sorted(set(re.findall(r"\d{4}", " ".join(drought.columns))))
    result["Area (ha)"] = area
    result["Mean annual groundwater change"] = component_values(mws, groundwater, "DeltaG").mean(axis=1).reindex(common)
    result["Recent net groundwater change"] = pd.to_numeric(mws.get("Net2020_25"), errors="coerce").reindex(common)
    result["Mean cropping intensity"] = numeric(crop, crop_years).mean(axis=1).reindex(common)
    drought_values = pd.DataFrame(index=drought.index)
    for year in drought_years:
        moderate = pd.to_numeric(drought.get(f"w_mod_{year}"), errors="coerce")
        severe = pd.to_numeric(drought.get(f"w_sev_{year}"), errors="coerce")
        if moderate is not None and severe is not None:
            drought_values[year] = moderate.add(severe, fill_value=np.nan)
    result["Mean moderate + severe drought weeks"] = drought_values.mean(axis=1).reindex(common)
    plains = pd.to_numeric(terrain.get("plain_area"), errors="coerce").reindex(common)
    slopes = pd.to_numeric(terrain.get("slopy_area"), errors="coerce").reindex(common)
    hills = pd.to_numeric(terrain.get("hill_slope"), errors="coerce").reindex(common)
    result["Plain terrain (%)"] = plains
    result["Slope and hill terrain (%)"] = slopes.add(hills, fill_value=np.nan)
    result.index.name = "MWS UID"
    return result.replace([np.inf, -np.inf], np.nan)

def robust_standardize(profile):
    values = profile[PROFILE_METRICS]
    center = values.median()
    mad = values.sub(center).abs().median()
    iqr = values.quantile(0.75) - values.quantile(0.25)
    scale = (1.4826 * mad).where(mad > 0, iqr / 1.349).replace(0, np.nan)
    return values.sub(center).div(scale), center, scale`;

const outliers = notebook({
  id: "outlier-mws",
  title: "Find unusual micro-watersheds",
  subtitle: "Use robust, multivariate comparison to find MWS profiles that differ strongly from the tehsil pattern while keeping missingness and the reason for each flag visible.",
  layerIds: ["mws_layers", "cropping_intensity", "drought", "terrain_vector"],
  analysis: `${profileAnalysis}\n\n${String.raw`def rank_outliers(profile, threshold=3.5):
    standardized, center, scale = robust_standardize(profile)
    absolute = standardized.abs()
    comparable = absolute.notna().sum(axis=1)
    score = absolute.max(axis=1, skipna=True).where(comparable >= 4)
    reason = absolute.apply(
        lambda row: row.dropna().idxmax() if not row.dropna().empty else "Insufficient data",
        axis=1,
    )
    ranked = profile.copy()
    ranked["Comparable metrics"] = comparable
    ranked["Robust outlier score"] = score
    ranked["Largest departure"] = reason
    ranked["Flagged"] = score.ge(threshold) & comparable.ge(4)
    return ranked.sort_values("Robust outlier score", ascending=False), standardized

def plot_outlier_scores(ranked, threshold=3.5):
    shown = ranked.dropna(subset=["Robust outlier score"]).head(12).sort_values("Robust outlier score")
    if shown.empty:
        print("No MWS has enough comparable metrics to plot.")
        return
    colors = ["#dc2626" if value >= threshold else "#64748b" for value in shown["Robust outlier score"]]
    ax = shown["Robust outlier score"].plot.barh(figsize=(10, 6), color=colors)
    ax.axvline(threshold, color="#991b1b", linestyle="--", label=f"Flag threshold = {threshold}")
    ax.set(title="Largest robust departure for each MWS", xlabel="Absolute robust standardized score", ylabel="MWS UID")
    ax.legend()
    plt.tight_layout()
    plt.show()`}`,
  cells: [
    markdown("outlier-load-title", "## 1. Build a comparable MWS profile\n\nFour relevant layers are joined by MWS UID. No missing value is replaced with a made-up average."),
    code("outlier-load", `mws_geojson = await load_geojson("mws_layers")
crop_geojson = await load_geojson("cropping_intensity")
drought_geojson = await load_geojson("drought")
terrain_geojson = await load_geojson("terrain_vector")
profile = build_mws_profile(to_frame(mws_geojson), to_frame(crop_geojson),
                            to_frame(drought_geojson), to_frame(terrain_geojson))
print(f"Built {len(profile)} MWS profiles from {len(PROFILE_METRICS)} metrics.")`),
    markdown("outlier-rank-title", "## 2. Rank unusual profiles\n\nA robust score uses each metric's median and median absolute deviation. The table states the largest departure and how many metrics were comparable."),
    code("outlier-rank", `ranked, standardized = rank_outliers(profile, threshold=3.5)
display(ranked[["Robust outlier score", "Largest departure", "Comparable metrics", "Flagged"]].head(12).round(2))
plot_outlier_scores(ranked, threshold=3.5)`),
    markdown("outlier-map-title", "## 3. Highlight flagged MWSes\n\nRed polygons are unusual relative to this tehsil and this metric set—not necessarily degraded, erroneous, or in need of the same intervention."),
    code("outlier-map", `flagged = ranked[ranked["Flagged"]]
print(f"Flagged {len(flagged)} of {len(ranked)} MWSes.")
display(flagged[PROFILE_METRICS + ["Largest departure"]].round(2))
show_on_map("outlier-mws", features_for_uids(mws_geojson, flagged.index),
            "Notebook · unusual MWS profiles", fillColor="#ef4444", strokeColor="#7f1d1d", fillOpacity=0.62)`),
    markdown("outlier-interpret", "## Interpretation\n\nOutlier detection is a question generator. Inspect the named departure, raw attributes, geometry, measurement coverage, and local context before drawing a conclusion."),
    markdown("outlier-optional-title", "## Optional: see standardized departures"),
    optional("outlier-optional", `display(standardized.loc[ranked.head(12).index].round(2))`),
  ],
});

const similar = notebook({
  id: "similar-mws",
  title: "Find similar micro-watersheds within a tehsil",
  subtitle: "Choose one MWS and find nearby profiles in a standardized hydrology, agriculture, area, and terrain feature space.",
  layerIds: ["mws_layers", "cropping_intensity", "drought", "terrain_vector"],
  analysis: `${profileAnalysis}\n\n${String.raw`def similar_mws(profile, target_uid, count=5):
    standardized, center, scale = robust_standardize(profile)
    target = standardized.loc[str(target_uid)]
    minimum = max(4, int(np.ceil(target.notna().sum() * 0.7)))
    rows = []
    for uid, candidate in standardized.drop(index=str(target_uid)).iterrows():
        shared = target.notna() & candidate.notna()
        if shared.sum() < minimum:
            continue
        distance = np.sqrt(np.mean(np.square(target[shared] - candidate[shared])))
        rows.append({"MWS UID": uid, "Standardized distance": distance,
                     "Compared metrics": int(shared.sum())})
    peers = pd.DataFrame(rows, columns=["MWS UID", "Standardized distance", "Compared metrics"])
    if not peers.empty:
        peers = peers.sort_values(["Standardized distance", "MWS UID"]).head(count)
    return peers, standardized

def plot_similar_profiles(standardized, target_uid, peers):
    order = [str(target_uid)] + peers["MWS UID"].astype(str).tolist()
    values = standardized.loc[order, PROFILE_METRICS]
    fig, ax = plt.subplots(figsize=(12, 5.5))
    image = ax.imshow(values, cmap="PiYG", vmin=-3, vmax=3, aspect="auto")
    ax.set_xticks(range(len(PROFILE_METRICS)), labels=PROFILE_METRICS, rotation=35, ha="right")
    ax.set_yticks(range(len(order)), labels=[f"Target · {order[0]}"] + order[1:])
    ax.set_title("Standardized MWS profiles (clipped color scale at ±3)")
    fig.colorbar(image, ax=ax, label="Robust standardized value")
    plt.tight_layout()
    plt.show()`}`,
  cells: [
    markdown("similar-load-title", "## 1. Build profiles from four relevant layers\n\nSimilarity is calculated only within the selected tehsil and only from comparable published values."),
    code("similar-load", `mws_geojson = await load_geojson("mws_layers")
crop_geojson = await load_geojson("cropping_intensity")
drought_geojson = await load_geojson("drought")
terrain_geojson = await load_geojson("terrain_vector")
profile = build_mws_profile(to_frame(mws_geojson), to_frame(crop_geojson),
                            to_frame(drought_geojson), to_frame(terrain_geojson))
target_uid = sorted(profile.index)[0]
print(f"Using {target_uid} as the example target MWS.")`),
    markdown("similar-find-title", "## 2. Find five similar profiles\n\nDistance is the root-mean-square standardized difference; candidates need at least 70% of the target's available metrics, with a minimum of four."),
    code("similar-find", `
peers, standardized = similar_mws(profile, target_uid, count=5)
display(peers.round(3))
plot_similar_profiles(standardized, target_uid, peers)`),
    markdown("similar-map-title", "## 3. Compare their locations\n\nThe target and its similar profiles are separate temporary layers so their roles remain clear."),
    code("similar-map", `target_features = features_for_uids(mws_geojson, [target_uid])
peer_features = features_for_uids(mws_geojson, peers["MWS UID"])
show_on_map("similar-target", target_features, f"Notebook target · {target_uid}",
            fillColor="#facc15", strokeColor="#713f12", fillOpacity=0.8)
show_on_map("similar-peers", peer_features, "Notebook · similar MWS profiles",
            fillColor="#22c55e", strokeColor="#14532d", fillOpacity=0.58)`),
    markdown("similar-interpret", "## Interpretation\n\nThese are similar data profiles, not necessarily geographic neighbours or interchangeable communities. Changing the variables, period, missing-data rule, or distance definition can change the result."),
    markdown("similar-optional-title", "## Optional: compare raw values"),
    optional("similar-optional", `comparison_ids = [str(target_uid)] + peers["MWS UID"].astype(str).tolist()
display(profile.loc[comparison_ids, PROFILE_METRICS].round(2))`),
  ],
});

const manifest = notebook({
  id: "layer-manifest",
  title: "Find and download CoRE Stack GeoServer layers",
  subtitle: "Browse the full notebook manifest, construct the correct WFS or WCS URL for any named tehsil, and load one vector layer without editing a URL.",
  layerIds: ALL_LAYERS.map((layer) => layer.id),
  analysis: String.raw`def manifest_table():
    columns = ["id", "label", "domain", "service", "workspace", "layerNameTemplate", "period", "description"]
    return pd.DataFrame(LAYER_SPECS)[columns].rename(columns={
        "id": "Layer ID", "label": "Dataset", "domain": "Theme", "service": "Download service",
        "workspace": "GeoServer workspace", "layerNameTemplate": "Layer-name template",
        "period": "Published period", "description": "What it contains",
    })

def describe_layer(layer_id):
    spec = get_spec(layer_id)
    return pd.DataFrame({"Field": ["Dataset", "Theme", "Service", "Period", "Description", "Generated URL"],
                         "Value": [spec["label"], spec["domain"], spec["service"], spec["period"],
                                   spec["description"], layer_url(layer_id)]})`,
  cells: [
    markdown("manifest-list-title", "## 1. Browse the complete manifest\n\nWFS entries return vector geometry and attributes. WCS entries return analytical raster pixels; WMS map tiles are intentionally not used as data downloads."),
    code("manifest-list", `catalogue = manifest_table()
print(f"{len(catalogue)} GeoLibre layer presentations are available in this manifest.")
display(catalogue)`),
    markdown("manifest-pick-title", "## 2. Use a safe example dataset\n\nThe example uses the MWS vector layer already present in the project, avoiding optional widget dependencies."),
    code("manifest-pick", `layer_id = "mws_layers"
print(f"Example dataset: {get_spec(layer_id)['label']}")`),
    markdown("manifest-url-title", "## 3. Generate the download URL\n\nRaster WCS coverages can be large, so this notebook prints their URL rather than downloading them automatically."),
    code("manifest-url", `display(describe_layer(layer_id))
if get_spec(layer_id)["service"] == "WFS":
    chosen_geojson = await load_geojson(layer_id)
    chosen_table = to_frame(chosen_geojson)
    print(f"Loaded {len(chosen_table):,} features and {len(chosen_table.columns):,} attribute fields.")
    display(chosen_table.head(10))
else:
    print("Copy the generated WCS URL when you are ready to download the GeoTIFF coverage.")`),
    markdown("manifest-map-title", "## 4. Add a chosen vector to the map\n\nRun this only after loading a WFS vector above."),
    code("manifest-map", `if get_spec(layer_id)["service"] == "WFS":
    show_on_map("manifest-choice", chosen_geojson, f'Notebook · {get_spec(layer_id)["label"]}',
                fillColor="#a78bfa", strokeColor="#4c1d95", fillOpacity=0.42)
else:
    print("Raster analysis uses the WCS GeoTIFF URL shown above; the existing GeoLibre project already provides its styled WMS map layer.")`),
    markdown("manifest-interpret", "## Interpretation\n\nA missing layer or empty response means the source is not published for that named scope, not that the real-world phenomenon is absent. Preserve the dataset period and units when using downloaded attributes."),
  ],
});

const CATALOGUE = [
  { id: quickStart.metadata.corestack.id, filename: "06_quick_mws_preview.ipynb", title: quickStart.metadata.corestack.title,
    summary: "Confirm browser Python, inspect five MWS records, and add them to the map.", featured: true, notebook: quickStart },
  { id: overview.metadata.corestack.id, filename: "01_tehsil_mws_overview.ipynb", title: overview.metadata.corestack.title,
    summary: "Join MWS groundwater and terrain data to understand the selected tehsil.", featured: true, notebook: overview },
  { id: hydrology.metadata.corestack.id, filename: "02_hydrology_water_balance.ipynb", title: hydrology.metadata.corestack.title,
    summary: "Explore annual and fortnightly water conditions for one MWS.", featured: true, notebook: hydrology },
  { id: agriculture.metadata.corestack.id, filename: "03_agriculture_and_drought.ipynb", title: agriculture.metadata.corestack.title,
    summary: "Compare cropping intensity and drought across years and MWSes.", featured: true, notebook: agriculture },
  { id: outliers.metadata.corestack.id, filename: "04_outlier_mws.ipynb", title: outliers.metadata.corestack.title,
    summary: "Find robust multivariate outliers and inspect why they differ.", featured: true, notebook: outliers },
  { id: similar.metadata.corestack.id, filename: "05_similar_mws.ipynb", title: similar.metadata.corestack.title,
    summary: "Find five comparable MWS profiles within the same tehsil.", featured: true, notebook: similar },
  { id: manifest.metadata.corestack.id, filename: "00_core_stack_layer_manifest.ipynb", title: manifest.metadata.corestack.title,
    summary: "Browse every layer and construct WFS or WCS downloads for another tehsil.", featured: false, notebook: manifest },
];

const generatedFiles = new Map(
  CATALOGUE.map((item) => [
    item.filename,
    `${JSON.stringify(item.notebook, null, 2)}\n`,
  ])
);
generatedFiles.set(
  "catalog.json",
  `${JSON.stringify(CATALOGUE.map(({ notebook: _notebook, ...item }) => item), null, 2)}\n`
);

if (CHECK_ONLY) {
  const stale = [...generatedFiles].filter(([filename, expected]) => {
    const outputPath = path.join(OUTPUT_DIR, filename);
    return !fs.existsSync(outputPath) || fs.readFileSync(outputPath, "utf8") !== expected;
  });
  if (stale.length) {
    throw new Error(`Generated notebook files are stale: ${stale.map(([name]) => name).join(", ")}`);
  }
  console.log(`Checked ${CATALOGUE.length} deterministic GeoLibre notebooks.`);
} else {
  for (const [filename, contents] of generatedFiles) {
    fs.writeFileSync(path.join(OUTPUT_DIR, filename), contents);
  }
  console.log(`Generated ${CATALOGUE.length} GeoLibre notebooks in ${OUTPUT_DIR}`);
}
