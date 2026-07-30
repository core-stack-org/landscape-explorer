import type {
  JupyterNotebookCell,
  JupyterNotebookDocument,
} from "../lib/notebook-launcher";
import { getCoreGeoStackRuntimeConfig } from "./constants";
import {
  buildKylExploreDataUrl,
  buildKylExploreWfsUrl,
  type KylExploreResultSummary,
} from "./explore-runtime";
import {
  resolveKylFilterSelections,
  type KylExploreSource,
} from "./explore-filters";
import {
  CORE_GEOSTACK_LULC_YEARS,
  coreGeoStackLayer,
  slugLocationPart,
} from "./layer-catalog";
import type { CoreGeoStackWorkspaceSnapshot } from "./workspace-state";

export type CoreGeoStackNotebookKind = "hydrology" | "lulc" | "explore-results";

export interface LulcNotebookSelection {
  level: "1" | "2" | "3";
  beforeYear: string;
  afterYear: string;
}

export interface CoreGeoStackNotebookArtifact {
  fileName: string;
  notebook: JupyterNotebookDocument;
}

let cellId = 0;

function sourceLines(source: string): string[] {
  return source.split(/(?<=\n)/);
}

function markdown(source: string): JupyterNotebookCell {
  return {
    cell_type: "markdown",
    id: `kyl-${++cellId}`,
    metadata: {},
    source: sourceLines(source),
  };
}

function code(source: string): JupyterNotebookCell {
  return {
    cell_type: "code",
    execution_count: null,
    id: `kyl-${++cellId}`,
    metadata: {},
    outputs: [],
    source: sourceLines(source),
  };
}

function pythonJson(value: unknown): string {
  return JSON.stringify(JSON.stringify(value));
}

function notebook(
  kind: CoreGeoStackNotebookKind,
  snapshot: CoreGeoStackWorkspaceSnapshot,
  cells: JupyterNotebookCell[],
): JupyterNotebookDocument {
  cellId = 0;
  return {
    cells,
    metadata: {
      kernelspec: {
        display_name: "Python (Pyodide)",
        language: "python",
        name: "python",
      },
      language_info: { name: "python" },
      coreGeoStack: {
        kind,
        generatedFor: { ...snapshot.location },
        selectedLayerIds: [...snapshot.selectedLayerIds],
        selectedFilterIds: [...snapshot.selectedFilterIds],
      },
    },
    nbformat: 4,
    nbformat_minor: 5,
  };
}

function requireLocation(snapshot: CoreGeoStackWorkspaceSnapshot) {
  const { state, district, tehsil } = snapshot.location;
  if (!state || !district || !tehsil) {
    throw new Error("Choose a state, district, and tehsil before opening a notebook.");
  }
  return { state, district, tehsil };
}

function notebookStem(snapshot: CoreGeoStackWorkspaceSnapshot): string {
  const location = requireLocation(snapshot);
  return [location.state, location.district, location.tehsil]
    .map(slugLocationPart)
    .join("_");
}

function commonSetup(snapshot: CoreGeoStackWorkspaceSnapshot): JupyterNotebookCell {
  const location = requireLocation(snapshot);
  return code(`import json
import os
import re
import sys
from getpass import getpass
from urllib.parse import urlencode

import geolibre

CONTEXT = json.loads(${pythonJson({
    location,
    selectedLayerIds: snapshot.selectedLayerIds,
    selectedFilterIds: snapshot.selectedFilterIds,
  })})
m = geolibre.connect()
print(
    "Connected to the live CoRE-GeoStack map for "
    + CONTEXT["location"]["tehsil"]
    + ", "
    + CONTEXT["location"]["district"]
    + "."
)


async def fetch_json(url, params=None, headers=None):
    """Fetch JSON in JupyterLite/Pyodide or desktop CPython."""
    params = params or {}
    headers = headers or {}
    if sys.platform == "emscripten":
        from pyodide.http import pyfetch

        separator = "&" if "?" in url else "?"
        full_url = url + (separator + urlencode(params) if params else "")
        response = await pyfetch(full_url, headers=headers)
        if response.status < 200 or response.status >= 300:
            raise RuntimeError(f"Request failed with HTTP {response.status}.")
        return await response.json()

    import urllib.request

    separator = "&" if "?" in url else "?"
    full_url = url + (separator + urlencode(params) if params else "")
    request = urllib.request.Request(full_url, headers=headers)
    with urllib.request.urlopen(request, timeout=90) as response:
        return json.loads(response.read().decode("utf-8"))
`);
}

function plottingSetup(): JupyterNotebookCell {
  return code(`try:
    import matplotlib.pyplot as plt
    import pandas as pd
except ImportError:
    if sys.platform == "emscripten":
        import piplite

        await piplite.install(["matplotlib", "pandas"])
    else:
        import subprocess

        subprocess.check_call(
            [sys.executable, "-m", "pip", "install", "-q", "matplotlib", "pandas"]
        )
    import matplotlib.pyplot as plt
    import pandas as pd

print("Plotting tools are ready.")
`);
}

export function buildHydrologyNotebook(
  snapshot: CoreGeoStackWorkspaceSnapshot,
): CoreGeoStackNotebookArtifact {
  const location = requireLocation(snapshot);
  const dataUrl = buildKylExploreDataUrl("MWS", location);
  const geometryUrl = buildKylExploreWfsUrl("MWS", location);
  if (!dataUrl || !geometryUrl) throw new Error("Could not build the MWS data sources.");

  const cells = [
    markdown(`# Hydrology and cropping laboratory: ${location.tehsil}

This notebook is created from the active KYL workspace and opened directly
beside the live GeoLibre map. It uses the same public micro-watershed geometry
and KYL indicator endpoints as Explore.

Run the cells to inspect indicator families, select a watershed, compare
groundwater/cropping time series, add the selection to the map, and optionally
request the richer authenticated CoRE Stack profile. Credentials are read only
at runtime and are never stored in this notebook.
`),
    commonSetup(snapshot),
    markdown(`## Load this tehsil's live watershed data

The geometry and indicator records are fetched only when this cell runs.
`),
    code(`MWS_DATA_URL = ${JSON.stringify(dataUrl)}
MWS_GEOMETRY_URL = ${JSON.stringify(geometryUrl)}

mws_records = await fetch_json(MWS_DATA_URL)
mws_geojson = await fetch_json(MWS_GEOMETRY_URL)
mws_features = mws_geojson.get("features", [])
if not isinstance(mws_records, list) or not mws_features:
    raise RuntimeError("The selected tehsil returned no usable MWS data.")


def record_id(record):
    return str(
        record.get("uid")
        or record.get("UID")
        or record.get("mws_id")
        or record.get("MWS_UID")
        or ""
    )


records_by_id = {record_id(record): record for record in mws_records if record_id(record)}
features_by_id = {
    record_id(feature.get("properties", {})): feature
    for feature in mws_features
    if record_id(feature.get("properties", {}))
}
print(
    f"Loaded {len(mws_records):,} indicator records and "
    f"{len(mws_features):,} watershed polygons."
)
print("Example MWS ids:", list(records_by_id)[:10])
`),
    plottingSetup(),
    markdown(`## Select a watershed and inspect its indicators

Replace \`MWS_ID\` with another id printed above. The selected polygon is added
to the live map as a derived session layer.
`),
    code(`MWS_ID = next(iter(records_by_id))
selected_record = records_by_id[MWS_ID]
selected_feature = features_by_id.get(MWS_ID)

if selected_feature:
    m.add_geojson(
        {"type": "FeatureCollection", "features": [selected_feature]},
        name=f"Notebook selection · MWS {MWS_ID}",
    )
else:
    print("This record has no matching geometry; the table is still available.")

display(pd.Series(selected_record, name="value").to_frame().head(40))
`),
    markdown(`## Discover indicator and year families

This avoids assuming that every tehsil exposes exactly the same columns.
`),
    code(`YEAR_PATTERN = re.compile(r"(20\\d{2}(?:[-_]\\d{2,4})?|\\d{2}[-_]\\d{2})")


def indicator_inventory(record):
    rows = []
    for key, value in record.items():
        match = YEAR_PATTERN.search(str(key))
        family = str(key)[: match.start()].rstrip("_-") if match else str(key)
        rows.append(
            {
                "family": family,
                "column": str(key),
                "year": match.group(0).replace("_", "-") if match else "",
                "value": value,
            }
        )
    return pd.DataFrame(rows)


inventory = indicator_inventory(selected_record)
display(
    inventory.groupby("family", as_index=False)
    .agg(columns=("column", "count"))
    .sort_values(["columns", "family"], ascending=[False, True])
    .head(50)
)
`),
    markdown(`## Plot groundwater and cropping series`),
    code(`def series_for_prefix(record, prefixes):
    prefixes = (prefixes,) if isinstance(prefixes, str) else tuple(prefixes)
    rows = []
    for key, raw_value in record.items():
        if not str(key).startswith(prefixes):
            continue
        match = YEAR_PATTERN.search(str(key))
        value = pd.to_numeric(pd.Series([raw_value]), errors="coerce").iloc[0]
        if match and pd.notna(value):
            rows.append(
                {
                    "year": match.group(0).replace("_", "-"),
                    "indicator": str(key),
                    "value": float(value),
                }
            )
    return pd.DataFrame(rows, columns=["year", "indicator", "value"])


def plot_family(prefixes, title, ylabel):
    frame = series_for_prefix(selected_record, prefixes)
    if frame.empty:
        print(f"No {title.lower()} fields were found for MWS {MWS_ID}.")
        return frame
    pivot = frame.pivot_table(
        index="year", columns="indicator", values="value", aggfunc="first"
    )
    ax = pivot.plot(figsize=(12, 5), marker="o")
    ax.set(title=title, xlabel="Year", ylabel=ylabel)
    ax.grid(alpha=0.25)
    plt.xticks(rotation=45)
    plt.tight_layout()
    plt.show()
    return frame


groundwater = plot_family(
    ("deltaG", "DeltaG", "well_depth", "Net"),
    "Groundwater and well-depth indicators",
    "Source units",
)
cropping = plot_family(
    ("cropping_intensity", "single_cropped", "doubly_cropped", "triply_cropped"),
    "Cropping intensity",
    "Source value",
)
`),
    markdown(`## Optional authenticated CoRE Stack profile

Set a Colab/local secret named \`CS_API\` or \`CORESTACK_API_KEY\`, or enter the
key into the hidden prompt. Uncomment the final two lines to call the API.
`),
    code(`CORESTACK_API_BASE = "https://geoserver.core-stack.org/api/v1/"


def read_api_key():
    key = (
        os.environ.get("CORESTACK_API_KEY", "")
        or os.environ.get("CS_API", "")
    ).strip()
    if not key:
        try:
            from google.colab import userdata

            key = (
                userdata.get("CORESTACK_API_KEY")
                or userdata.get("CS_API")
                or ""
            ).strip()
        except Exception:
            key = ""
    if not key:
        key = getpass("CoRE Stack API key (input hidden): ").strip()
    if not key:
        raise ValueError("An API key is required only for this optional section.")
    return key


async def authenticated_profile(longitude, latitude):
    headers = {"X-API-Key": read_api_key()}
    context = await fetch_json(
        CORESTACK_API_BASE + "get_mwsid_by_latlon/",
        {"latitude": latitude, "longitude": longitude},
        headers,
    )
    profile = await fetch_json(
        CORESTACK_API_BASE + "get_tehsil_data/",
        {
            "state": context["State"],
            "district": context["District"],
            "tehsil": context["Tehsil"],
            "mws_id": context["mws_id"],
        },
        headers,
    )
    return context, profile


# api_context, api_profile = await authenticated_profile(93.0, 24.8)
# print(api_context, sorted(api_profile))
`),
    markdown(`## Export this analysis

These files are created in your notebook session. Published CoRE Stack layers
are never modified.
`),
    code(`with open(f"{MWS_ID}_selection.geojson", "w", encoding="utf-8") as file:
    json.dump(
        {"type": "FeatureCollection", "features": [selected_feature] if selected_feature else []},
        file,
        indent=2,
    )
pd.DataFrame([selected_record]).to_csv(f"{MWS_ID}_indicators.csv", index=False)
print("Saved the selected watershed as GeoJSON and its indicators as CSV.")
`),
  ];

  return {
    fileName: `KYL_${notebookStem(snapshot)}_hydrology_and_cropping.ipynb`,
    notebook: notebook("hydrology", snapshot, cells),
  };
}

function lulcLayerId(level: string, year: string): string {
  return `lulc_${level}_${year}`;
}

function wmsLayerInfo(
  snapshot: CoreGeoStackWorkspaceSnapshot,
  level: string,
  year: string,
) {
  const location = requireLocation(snapshot);
  const definition = coreGeoStackLayer(lulcLayerId(level, year));
  if (!definition) throw new Error(`LULC Level ${level} does not contain ${year}.`);
  const district = slugLocationPart(location.district);
  const tehsil = slugLocationPart(location.tehsil);
  const config = getCoreGeoStackRuntimeConfig();
  return {
    id: definition.id,
    label: definition.label,
    url: `${config.geoserverUrl}${definition.workspace}/wms`,
    typeName: `${definition.workspace}:${definition.layerName({ district, tehsil })}`,
    style: definition.wmsStyle ?? "",
  };
}

export function buildLulcNotebook(
  snapshot: CoreGeoStackWorkspaceSnapshot,
  selection: LulcNotebookSelection,
): CoreGeoStackNotebookArtifact {
  const location = requireLocation(snapshot);
  const before = wmsLayerInfo(
    snapshot,
    selection.level,
    selection.beforeYear,
  );
  const after = wmsLayerInfo(snapshot, selection.level, selection.afterYear);
  if (before.id === after.id) throw new Error("Choose two different LULC years.");

  const cells = [
    markdown(`# LULC change laboratory: ${location.tehsil}

The main GeoLibre workspace can show these two CoRE Stack LULC rasters in a
synchronized split view. This notebook records the comparison sources and adds
repeatable point-based class inspection for research notes.
`),
    commonSetup(snapshot),
    code(`LULC = json.loads(${pythonJson({ level: selection.level, before, after })})
print("Earlier:", LULC["before"]["label"])
print("Later:  ", LULC["after"]["label"])
print("The map beside this notebook is already configured for synchronized comparison.")
`),
    markdown(`## Inspect both LULC years at one coordinate

Enter a longitude and latitude inside the selected tehsil. WMS GetFeatureInfo
returns the published class information from each raster.
`),
    code(`LONGITUDE = 93.0
LATITUDE = 24.8


async def inspect_wms(layer, longitude, latitude):
    span = 0.002
    params = {
        "SERVICE": "WMS",
        "VERSION": "1.1.1",
        "REQUEST": "GetFeatureInfo",
        "LAYERS": layer["typeName"],
        "QUERY_LAYERS": layer["typeName"],
        "STYLES": layer["style"],
        "SRS": "EPSG:4326",
        "BBOX": f"{longitude-span},{latitude-span},{longitude+span},{latitude+span}",
        "WIDTH": 101,
        "HEIGHT": 101,
        "X": 50,
        "Y": 50,
        "INFO_FORMAT": "application/json",
        "FEATURE_COUNT": 10,
    }
    return await fetch_json(layer["url"], params)


before_info = await inspect_wms(LULC["before"], LONGITUDE, LATITUDE)
after_info = await inspect_wms(LULC["after"], LONGITUDE, LATITUDE)
print("Earlier class:", before_info)
print("Later class:  ", after_info)
`),
    markdown(`## Save a reproducible comparison record`),
    code(`comparison = {
    "scope": CONTEXT["location"],
    "point": {"longitude": LONGITUDE, "latitude": LATITUDE},
    "level": LULC["level"],
    "before": {"source": LULC["before"], "result": before_info},
    "after": {"source": LULC["after"], "result": after_info},
}
with open("lulc_point_comparison.json", "w", encoding="utf-8") as file:
    json.dump(comparison, file, indent=2)
print("Saved lulc_point_comparison.json")
`),
  ];

  return {
    fileName: `KYL_${notebookStem(snapshot)}_lulc_level_${selection.level}_change.ipynb`,
    notebook: notebook("lulc", snapshot, cells),
  };
}

export function buildExploreResultsNotebook(
  snapshot: CoreGeoStackWorkspaceSnapshot,
  results: readonly KylExploreResultSummary[],
): CoreGeoStackNotebookArtifact {
  const location = requireLocation(snapshot);
  const selections = resolveKylFilterSelections(snapshot.selectedFilterIds).map(
    (selection) => ({
      id: selection.id,
      source: selection.source,
      field: selection.definition.name,
      type: selection.definition.type,
      label: selection.option.label,
      value: selection.option.value,
    }),
  );
  const sources = [...new Set(selections.map((selection) => selection.source))];
  const urls = Object.fromEntries(
    sources.map((source) => [
      source,
      {
        data:
          source === "MWS" || source === "Village"
            ? buildKylExploreDataUrl(source, location)
            : null,
        geometry: buildKylExploreWfsUrl(source, location),
      },
    ]),
  );

  const cells = [
    markdown(`# Reproduce the active Explore filters: ${location.tehsil}

This notebook captures the filters currently selected in KYL Explore. It
reproduces the same rule—OR within one indicator, AND across indicators—using
the live source records, then leaves the results available for extension.
`),
    commonSetup(snapshot),
    code(`SELECTIONS = json.loads(${pythonJson(selections)})
EXPLORE_URLS = json.loads(${pythonJson(urls)})
UI_RESULTS = json.loads(${pythonJson(results)})

print(f"Captured {len(SELECTIONS)} filter choices.")
for selection in SELECTIONS:
    print(" ·", selection["source"], selection["field"], "→", selection["label"])
print("Counts shown by the live Explore UI:", UI_RESULTS)
`),
    plottingSetup(),
    code(`def matches_option(record_value, selection):
    if record_value is None:
        return False
    expected = selection["value"]
    if selection["type"] == 2 and isinstance(expected, dict):
        try:
            value = float(record_value)
            return float(expected["lower"]) <= value <= float(expected["upper"])
        except (TypeError, ValueError, KeyError):
            return False
    if isinstance(expected, bool):
        return bool(record_value) == expected or str(record_value).lower() == str(expected).lower()
    if isinstance(expected, (int, float)):
        try:
            return float(record_value) == float(expected)
        except (TypeError, ValueError):
            return False
    return str(record_value) == str(expected)


def filter_records(records, selections):
    by_field = {}
    for selection in selections:
        by_field.setdefault(selection["field"], []).append(selection)
    return [
        record
        for record in records
        if all(
            any(matches_option(record.get(field), option) for option in options)
            for field, options in by_field.items()
        )
    ]
`),
    code(`reproduced = {}
for source, source_urls in EXPLORE_URLS.items():
    source_selections = [item for item in SELECTIONS if item["source"] == source]
    if source_urls["data"]:
        records = await fetch_json(source_urls["data"])
    else:
        geometry = await fetch_json(source_urls["geometry"])
        records = [feature.get("properties", {}) for feature in geometry.get("features", [])]
    matched = filter_records(records, source_selections)
    reproduced[source] = matched
    print(f"{source}: {len(matched):,}/{len(records):,} records match")

display(
    pd.DataFrame(
        [
            {"source": source, "matched": len(records)}
            for source, records in reproduced.items()
        ]
    )
)
`),
    markdown(`## Continue your own analysis

\`reproduced["MWS"]\`, \`reproduced["Village"]\`, and
\`reproduced["Waterbody"]\` contain ordinary Python dictionaries. Convert them
to dataframes, calculate summaries, join external field observations, or export
them without consuming CoRE Stack server compute.
`),
    code(`for source, records in reproduced.items():
    pd.DataFrame(records).to_csv(f"explore_{source.lower()}_matches.csv", index=False)
print("Saved one CSV for every active Explore source.")
`),
  ];

  return {
    fileName: `KYL_${notebookStem(snapshot)}_explore_results.ipynb`,
    notebook: notebook("explore-results", snapshot, cells),
  };
}

export const DEFAULT_LULC_NOTEBOOK_SELECTION: LulcNotebookSelection = {
  level: "3",
  beforeYear: CORE_GEOSTACK_LULC_YEARS[0].value,
  afterYear: CORE_GEOSTACK_LULC_YEARS.at(-1)?.value ?? "24_25",
};

export function notebookSourceText(document: JupyterNotebookDocument): string {
  return document.cells.map((cell) => cell.source.join("")).join("\n");
}

export function activeExploreSources(
  snapshot: CoreGeoStackWorkspaceSnapshot,
): KylExploreSource[] {
  return [
    ...new Set(
      resolveKylFilterSelections(snapshot.selectedFilterIds).map(
        (selection) => selection.source,
      ),
    ),
  ];
}
