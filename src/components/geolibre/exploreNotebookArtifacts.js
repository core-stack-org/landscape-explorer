import { GEOLIBRE_CONFIG } from "../../config/geolibre.config";
import { buildGeoLibreNotebook, pythonLabSlug } from "./pythonLabArtifacts";

const NOTEBOOK_FORMAT = 4;
const NOTEBOOK_MINOR_FORMAT = 5;
const LULC_GROUP_PATTERN = /^lulc-(1|2|3)$/;

const markdownCell = (source) => ({
  cell_type: "markdown",
  metadata: {},
  source: source.split(/(?<=\n)/),
});

const codeCell = (source) => ({
  cell_type: "code",
  execution_count: null,
  metadata: {},
  outputs: [],
  source: source.split(/(?<=\n)/),
});

const pythonJson = (value) => JSON.stringify(JSON.stringify(value));

const requireProject = (project) => {
  const scope = project?.metadata?.scope;
  if (
    !project ||
    !Array.isArray(project.layers) ||
    !scope?.state ||
    !scope?.district ||
    !scope?.tehsil
  ) {
    throw new Error("A generated tehsil project is required for Explore.");
  }
  return scope;
};

const notebookDocument = ({ project, kind, cells }) => {
  const scope = requireProject(project);
  return {
    cells,
    metadata: {
      kernelspec: {
        display_name: "Python 3",
        language: "python",
        name: "python3",
      },
      language_info: {
        name: "python",
        version: "3.11",
      },
      kyl: {
        exploreVersion: "1.0.0",
        kind,
        geolibreVersion:
          project.metadata?.geolibre?.applicationVersion ||
          GEOLIBRE_CONFIG.version,
        generatedFor: {
          state: scope.state,
          district: scope.district,
          tehsil: scope.tehsil,
        },
      },
    },
    nbformat: NOTEBOOK_FORMAT,
    nbformat_minor: NOTEBOOK_MINOR_FORMAT,
  };
};

const portableProject = (project) => ({
  ...project,
  layers: project.layers.map((layer) => ({
    ...layer,
    metadata: {
      ...layer.metadata,
      corestack: {
        ...layer.metadata?.corestack,
        portableNotebook: true,
      },
    },
  })),
});

const runtimeSetupCell = (project) => {
  const version =
    project.metadata?.geolibre?.applicationVersion || GEOLIBRE_CONFIG.version;
  return `import importlib
import json
import subprocess
import sys
from IPython.display import display

PROJECT = json.loads(${pythonJson(portableProject(project))})
TESTED_GEOLIBRE_VERSION = ${JSON.stringify(version)}

try:
    import geolibre
except ImportError:
    if sys.platform == "emscripten":
        raise RuntimeError(
            "This notebook needs GeoLibre's built-in geolibre client. "
            "Open it from Processing -> Jupyter Notebook."
        )
    subprocess.check_call(
        [sys.executable, "-m", "pip", "install", "-q", f"geolibre=={TESTED_GEOLIBRE_VERSION}"]
    )
    import geolibre

IN_GEOLIBRE_NOTEBOOK = bool(
    sys.platform == "emscripten" and hasattr(geolibre, "connect")
)

if IN_GEOLIBRE_NOTEBOOK:
    m = geolibre.connect()
    print("Connected to the live KYL map.")
else:
    m = geolibre.Map(height="680px")
    m.load_project(PROJECT)
    display(m)
    print(
        "Loaded a portable copy with GeoLibre "
        + importlib.metadata.version("geolibre")
        + "."
    )
`;
};

const findMwsLayer = (project) =>
  project.layers.find((layer) => layer.id === "corestack-mws_layers") ||
  project.layers.find(
    (layer) =>
      layer.groupId === "hydrology" &&
      layer.source?.service === "wfs" &&
      String(layer.source?.typeName || "").includes("deltaG_well_depth")
  );

export const exploreNotebookFileNames = (project) => {
  const scope = requireProject(project);
  const stem = [scope.state, scope.district, scope.tehsil]
    .map(pythonLabSlug)
    .join("-");
  return {
    hydrology: `kyl-${stem}-hydrology-explore.ipynb`,
    lulc: `kyl-${stem}-lulc-compare.ipynb`,
    layers: `kyl-${stem}-layer-workbench.ipynb`,
  };
};

export const buildLayerWorkbenchNotebook = (project) =>
  buildGeoLibreNotebook(project);

export const buildHydrologyExploreNotebook = (project) => {
  const scope = requireProject(project);
  const mwsLayer = findMwsLayer(project);
  if (!mwsLayer?.source?.url) {
    throw new Error("The project does not contain a usable micro-watershed WFS source.");
  }
  const bounds = scope.bounds || project.mapView?.bbox;
  const center = [
    (Number(bounds[0]) + Number(bounds[2])) / 2,
    (Number(bounds[1]) + Number(bounds[3])) / 2,
  ];

  return notebookDocument({
    project,
    kind: "hydrology",
    cells: [
      markdownCell(`# Water, groundwater and cropping in ${scope.tehsil}

This guided workbook turns the current CoRE Stack tehsil layers into a small
hydrological laboratory. It is based on the original latitude/longitude →
micro-watershed → tehsil-data workflow, while also exposing the public WFS
attributes already used by KYL.

You can:

- inspect every available micro-watershed indicator and year;
- choose a point and find its containing micro-watershed;
- compare seasonal precipitation, groundwater change and cropping intensity;
- request the richer CoRE Stack API profile with your own API key;
- add the selected watershed back to GeoLibre and export your result.

The notebook never stores an API key in the file or in the map project.
`),
      codeCell(runtimeSetupCell(project)),
      markdownCell(`## Load the live micro-watershed dataset

The source below comes from the selected KYL project. It is fetched only when
this cell runs, so the notebook uses the same current tehsil data as the map.
`),
      codeCell(`import os
import re
from getpass import getpass
from urllib.parse import urlencode

import matplotlib.pyplot as plt
import pandas as pd

MWS_LAYER_ID = ${JSON.stringify(mwsLayer.id)}
MWS_SOURCE_URL = ${JSON.stringify(mwsLayer.source.url)}
SCOPE = json.loads(${pythonJson(scope)})
DEFAULT_LONGITUDE = ${center[0]}
DEFAULT_LATITUDE = ${center[1]}


async def fetch_json(url, params=None, headers=None):
    """Fetch JSON in CPython, Colab, or the browser's Pyodide kernel."""
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

    import requests

    response = requests.get(url, params=params, headers=headers, timeout=90)
    response.raise_for_status()
    return response.json()


mws_geojson = await fetch_json(MWS_SOURCE_URL)
mws_features = mws_geojson.get("features", [])
if not mws_features:
    raise RuntimeError("The selected tehsil returned no micro-watershed features.")

mws_table = pd.DataFrame(
    [feature.get("properties", {}) for feature in mws_features]
)
print(f"Loaded {len(mws_table):,} micro-watersheds and {len(mws_table.columns):,} attributes.")
mws_table.head()
`),
      markdownCell(`## Understand what this layer contains

CoRE Stack layers evolve. Instead of hard-coding one response shape, these
helpers discover indicator families and year-bearing columns from the live
layer.
`),
      codeCell(`YEAR_PATTERN = re.compile(r"(20\\d{2})(?:[-_](?:20)?\\d{2})?$")


def indicator_inventory(frame):
    rows = []
    for column in frame.columns:
        match = YEAR_PATTERN.search(str(column))
        family = str(column)[: match.start()].rstrip("_-") if match else str(column)
        rows.append(
            {
                "family": family or str(column),
                "column": str(column),
                "year": match.group(0).replace("_", "-") if match else "",
                "non_null": int(frame[column].notna().sum()),
                "numeric": bool(pd.api.types.is_numeric_dtype(frame[column])),
            }
        )
    return pd.DataFrame(rows).sort_values(["family", "year", "column"])


inventory = indicator_inventory(mws_table)
display(
    inventory.groupby("family", as_index=False)
    .agg(columns=("column", "count"), populated=("non_null", "max"))
    .sort_values(["columns", "family"], ascending=[False, True])
    .head(40)
)
`),
      markdownCell(`## Select one micro-watershed

The default point is the centre of the tehsil extent. Replace it with any
longitude/latitude inside the selected tehsil. The selection uses the actual
polygon geometry rather than choosing an arbitrary table row.
`),
      codeCell(`try:
    from shapely.geometry import Point, shape
except ImportError:
    if sys.platform == "emscripten":
        import piplite

        await piplite.install("shapely")
    else:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", "shapely"])
    from shapely.geometry import Point, shape


def select_mws(
    longitude=DEFAULT_LONGITUDE,
    latitude=DEFAULT_LATITUDE,
    fallback_to_first=True,
):
    point = Point(float(longitude), float(latitude))
    for feature in mws_features:
        geometry = feature.get("geometry")
        if geometry and shape(geometry).covers(point):
            return feature
    if fallback_to_first:
        print(
            "The default bbox centre is outside the MWS polygons; "
            "using the first watershed. Pass fallback_to_first=False "
            "to validate a field coordinate strictly."
        )
        return mws_features[0]
    raise ValueError(
        "No micro-watershed contains that point. Use a coordinate inside "
        + SCOPE["tehsil"]
        + "."
    )


selected_mws = select_mws()
selected_properties = selected_mws.get("properties", {})
MWS_ID = str(
    selected_properties.get("uid")
    or selected_properties.get("UID")
    or selected_properties.get("mws_id")
    or ""
)
print("Selected MWS:", MWS_ID or "(the source has no UID field)")
pd.Series(selected_properties, name="value").to_frame().head(30)
`),
      markdownCell(`## Reusable time-series extraction

These functions accept the naming patterns already found across KYL layers and
API responses. They return tidy tables that can be plotted, saved, or reused in
another analysis.
`),
      codeCell(`def year_from_column(column):
    match = YEAR_PATTERN.search(str(column))
    return match.group(0).replace("_", "-") if match else None


def series_for_prefix(record, prefixes):
    prefixes = (prefixes,) if isinstance(prefixes, str) else tuple(prefixes)
    rows = []
    for key, value in record.items():
        if not str(key).startswith(prefixes):
            continue
        year = year_from_column(key)
        number = pd.to_numeric(pd.Series([value]), errors="coerce").iloc[0]
        if year and pd.notna(number):
            rows.append({"year": year, "indicator": str(key), "value": float(number)})
    frame = pd.DataFrame(rows, columns=["year", "indicator", "value"])
    return frame.sort_values(["year", "indicator"]) if not frame.empty else frame


def available_prefixes(record, limit=50):
    prefixes = {}
    for key in record:
        match = YEAR_PATTERN.search(str(key))
        if match:
            prefix = str(key)[: match.start()].rstrip("_-")
            prefixes[prefix] = prefixes.get(prefix, 0) + 1
    return sorted(prefixes.items(), key=lambda item: (-item[1], item[0]))[:limit]


display(pd.DataFrame(available_prefixes(selected_properties), columns=["family", "years"]))
`),
      markdownCell(`## Hydrology and cropping charts

The first chart compares seasonal precipitation when those fields are present.
The second shows cropping intensity classes or the available groundwater
series. Empty families are reported instead of causing the notebook to fail.
`),
      codeCell(`def plot_family(record, prefixes, title, ylabel):
    frame = series_for_prefix(record, prefixes)
    if frame.empty:
        print(f"No {title.lower()} fields were found for this MWS.")
        return frame
    pivot = frame.pivot_table(
        index="year", columns="indicator", values="value", aggfunc="first"
    )
    ax = pivot.plot(figsize=(12, 5), marker="o")
    ax.set_title(title)
    ax.set_xlabel("Year")
    ax.set_ylabel(ylabel)
    ax.grid(alpha=0.25)
    plt.xticks(rotation=45)
    plt.tight_layout()
    plt.show()
    return frame


precipitation = plot_family(
    selected_properties,
    ("precipitation_kharif", "precipitation_rabi", "precipitation_zaid"),
    "Seasonal precipitation",
    "Precipitation (mm)",
)

groundwater = plot_family(
    selected_properties,
    ("deltaG", "DeltaG", "well_depth", "Net"),
    "Groundwater change and well-depth indicators",
    "Source units",
)

cropping = plot_family(
    selected_properties,
    ("cropping_intensity", "single_cropped", "doubly_cropped", "triply_cropped"),
    "Cropping intensity indicators",
    "Source value",
)
`),
      markdownCell(`## Optional: request the richer CoRE Stack API profile

This follows the supplied Colab workflow. Store the key as a Colab secret named
\`CORESTACK_API_KEY\`, set the environment variable locally, or enter it only
when prompted. It is sent in the \`X-API-Key\` header and is never written into
this notebook.
`),
      codeCell(`CORESTACK_API_BASE = "https://geoserver.core-stack.org/api/v1/"


def read_corestack_api_key():
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
        raise ValueError("A CoRE Stack API key is required for this optional section.")
    return key


async def fetch_corestack_profile(longitude=DEFAULT_LONGITUDE, latitude=DEFAULT_LATITUDE):
    api_key = read_corestack_api_key()
    headers = {"X-API-Key": api_key}
    context = await fetch_json(
        CORESTACK_API_BASE + "get_mwsid_by_latlon/",
        {"latitude": latitude, "longitude": longitude},
        headers,
    )
    query = {
        "state": context["State"],
        "district": context["District"],
        "tehsil": context["Tehsil"],
        "mws_id": context["mws_id"],
    }
    profile = await fetch_json(
        CORESTACK_API_BASE + "get_tehsil_data/",
        query,
        headers,
    )
    return context, profile


# Run only when you want the authenticated profile:
# api_context, api_profile = await fetch_corestack_profile()
# print(api_context)
# print("Available profile sections:", sorted(api_profile))
`),
      markdownCell(`## Analyse the authenticated profile

The original Colab chart is retained and generalized below. It finds the
selected MWS record, discovers all available years, and compares single,
double, and triple-cropped area as percentages. The section inventory makes it
easy to design additional plots without assuming the API will always return
the same set of datasets.
`),
      codeCell(`def profile_section_inventory(profile):
    rows = []
    for name, value in profile.items():
        if isinstance(value, list):
            rows.append(
                {
                    "section": name,
                    "records": len(value),
                    "fields": len(value[0]) if value and isinstance(value[0], dict) else 0,
                }
            )
        elif isinstance(value, dict):
            rows.append(
                {"section": name, "records": 1, "fields": len(value)}
            )
    return pd.DataFrame(rows).sort_values(["records", "section"], ascending=[False, True])


def profile_record(profile, section, mws_id):
    records = profile.get(section, [])
    if isinstance(records, dict):
        records = [records]
    wanted = str(mws_id)
    for record in records:
        if not isinstance(record, dict):
            continue
        candidate = (
            record.get("uid")
            or record.get("UID")
            or record.get("mws_id")
            or record.get("MWS_UID")
        )
        if candidate is not None and str(candidate) == wanted:
            return record
    return records[0] if records and isinstance(records[0], dict) else None


def plot_api_cropping_intensity(profile, mws_id):
    record = profile_record(profile, "croppingIntensity_annual", mws_id)
    if not record:
        print("No croppingIntensity_annual record was returned for this MWS.")
        return pd.DataFrame()

    prefixes = {
        "Single cropped": "single_cropped_area_in_ha_",
        "Double cropped": "doubly_cropped_area_in_ha_",
        "Triple cropped": "triply_cropped_area_in_ha_",
    }
    years = sorted(
        {
            key[len(prefix) :]
            for prefix in prefixes.values()
            for key in record
            if key.startswith(prefix)
        }
    )
    rows = []
    for year in years:
        values = {
            label: float(record.get(prefix + year, 0) or 0)
            for label, prefix in prefixes.items()
        }
        total = sum(values.values())
        rows.append(
            {
                "year": year.replace("_", "-"),
                **{
                    label: (value / total * 100 if total else 0)
                    for label, value in values.items()
                },
            }
        )

    frame = pd.DataFrame(rows).set_index("year")
    ax = frame.plot(kind="bar", stacked=True, figsize=(12, 6))
    ax.set_title(f"Cropping intensity for MWS {mws_id}")
    ax.set_xlabel("Year")
    ax.set_ylabel("Share of cropped area (%)")
    ax.legend(title="Cropping class", bbox_to_anchor=(1.02, 1), loc="upper left")
    plt.xticks(rotation=45)
    plt.tight_layout()
    plt.show()
    return frame


# After running the authenticated fetch above:
# display(profile_section_inventory(api_profile))
# api_cropping = plot_api_cropping_intensity(
#     api_profile,
#     api_context["mws_id"],
# )
`),
      markdownCell(`## Return results to GeoLibre and export them

The selected polygon becomes a derived session layer. It does not modify the
published CoRE Stack source.
`),
      codeCell(`selection_geojson = {
    "type": "FeatureCollection",
    "features": [selected_mws],
}
selection_name = f"Selected MWS {MWS_ID or ''}".strip()
if IN_GEOLIBRE_NOTEBOOK:
    m.add_geojson(selection_geojson, name=selection_name)
else:
    m.add_geojson(
        selection_geojson,
        name=selection_name,
        fillColor="#f59e0b",
        fillOpacity=0.28,
        strokeColor="#7c2d12",
        strokeWidth=3,
    )

with open("selected_mws.geojson", "w", encoding="utf-8") as file:
    json.dump(selection_geojson, file, indent=2)

selected_export = pd.DataFrame([selected_properties])
selected_export.to_csv("selected_mws_indicators.csv", index=False)
print("Added the selection to the map and wrote GeoJSON + CSV session files.")
`),
      markdownCell(`## Questions this workbook can support

- How has seasonal precipitation changed across the available years?
- Is cropping intensity increasing while groundwater indicators decline?
- Which micro-watersheds have missing or anomalous observations?
- How do upstream/downstream watersheds differ?
- Which MWS should be exported for field verification or further modelling?

Treat correlations as exploratory evidence, not causal conclusions. Check the
indicator definitions, source units, year coverage and missingness before using
results in planning or research.
`),
    ],
  });
};

export const getLulcComparisonOptions = (project) => {
  requireProject(project);
  const byLevel = { "1": [], "2": [], "3": [] };
  for (const layer of project.layers) {
    const match = LULC_GROUP_PATTERN.exec(String(layer.groupId || ""));
    const year = layer.metadata?.corestack?.year;
    if (!match || !year) continue;
    byLevel[match[1]].push({
      id: layer.id,
      name: layer.name,
      year,
      label: String(layer.name).split("·").pop().trim(),
    });
  }
  for (const layers of Object.values(byLevel)) {
    layers.sort((left, right) => left.year.localeCompare(right.year));
  }
  return byLevel;
};

const findLulcLayer = (project, level, year) => {
  const options = getLulcComparisonOptions(project)[String(level)] || [];
  const option = options.find((entry) => entry.year === year);
  if (!option) {
    throw new Error(`LULC Level ${level} does not contain year ${year}.`);
  }
  return project.layers.find((layer) => layer.id === option.id);
};

export const buildLulcComparisonProject = (
  project,
  { level = "3", beforeYear, afterYear } = {}
) => {
  const scope = requireProject(project);
  const options = getLulcComparisonOptions(project)[String(level)] || [];
  const before = findLulcLayer(
    project,
    level,
    beforeYear || options[0]?.year
  );
  const after = findLulcLayer(
    project,
    level,
    afterYear || options[options.length - 1]?.year
  );
  if (before.id === after.id) {
    throw new Error("Choose two different LULC years for comparison.");
  }

  const keepVisible = new Set([
    "corestack-administrative_boundaries",
    before.id,
  ]);
  const layers = project.layers.map((layer) => ({
    ...layer,
    visible: keepVisible.has(layer.id),
    opacity:
      layer.id === "corestack-administrative_boundaries" ? 0.8 : layer.opacity,
  }));
  const plugins = project.plugins
    ? {
        ...project.plugins,
        activePluginIds: (project.plugins.activePluginIds || []).filter(
          (id) => id !== "maplibre-gl-swipe"
        ),
      }
    : undefined;

  return {
    ...project,
    name: `${scope.tehsil} · LULC Level ${level} comparison`,
    layers,
    ...(plugins ? { plugins } : {}),
    mapLayout: { rows: 1, cols: 2, syncView: true },
    primaryMapLabel: before.name,
    secondaryMapViews: [
      {
        id: "kyl-lulc-after",
        view: { ...project.mapView },
        label: after.name,
        viewKind: "maplibre",
        layerVisibility: {
          [before.id]: false,
          [after.id]: true,
        },
      },
    ],
    metadata: {
      ...project.metadata,
      explore: {
        mode: "lulc-comparison",
        level: String(level),
        beforeLayerId: before.id,
        beforeYear: before.metadata.corestack.year,
        afterLayerId: after.id,
        afterYear: after.metadata.corestack.year,
      },
    },
  };
};

export const buildLulcExploreNotebook = (
  project,
  { level = "3", beforeYear, afterYear } = {}
) => {
  const scope = requireProject(project);
  const options = getLulcComparisonOptions(project);
  const levelOptions = options[String(level)] || [];
  const before = findLulcLayer(
    project,
    level,
    beforeYear || levelOptions[0]?.year
  );
  const after = findLulcLayer(
    project,
    level,
    afterYear || levelOptions[levelOptions.length - 1]?.year
  );
  const lookup = Object.fromEntries(
    Object.entries(options).map(([key, layers]) => [
      key,
      Object.fromEntries(layers.map((layer) => [layer.year, layer.id])),
    ])
  );

  return notebookDocument({
    project,
    kind: "lulc-comparison",
    cells: [
      markdownCell(`# LULC change explorer: ${scope.tehsil}

Compare CoRE Stack LULC years without downloading every raster to your
computer. The GeoLibre widget streams the published layers and provides a
before/after swipe. The KYL **Explore → LULC comparison** button provides the
equivalent synchronized two-map view directly in the main workspace.
`),
      codeCell(runtimeSetupCell(project)),
      codeCell(`import pandas as pd

LULC_LAYER_IDS = json.loads(${pythonJson(lookup)})
DEFAULT_LEVEL = ${JSON.stringify(String(level))}
DEFAULT_BEFORE_YEAR = ${JSON.stringify(before.metadata.corestack.year)}
DEFAULT_AFTER_YEAR = ${JSON.stringify(after.metadata.corestack.year)}


def compare_lulc(
    level=DEFAULT_LEVEL,
    before_year=DEFAULT_BEFORE_YEAR,
    after_year=DEFAULT_AFTER_YEAR,
):
    level = str(level)
    before_id = LULC_LAYER_IDS[level][before_year]
    after_id = LULC_LAYER_IDS[level][after_year]
    if before_id == after_id:
        raise ValueError("Choose two different years.")

    for years in LULC_LAYER_IDS.values():
        for layer_id in years.values():
            visible = layer_id in {before_id, after_id}
            if IN_GEOLIBRE_NOTEBOOK:
                m.set_visibility(layer_id, visible)
            else:
                m.get_layer(layer_id).visible = visible

    if IN_GEOLIBRE_NOTEBOOK:
        print(
            "Both years are visible. Use GeoLibre View -> Split View, or "
            "launch the preconfigured two-pane comparison from KYL Explore."
        )
    else:
        m.split_map(
            left_layers=[before_id],
            right_layers=[after_id],
            orientation="vertical",
            position=50,
            control_position="bottom-left",
        )
    return before_id, after_id


compare_lulc()
`),
      markdownCell(`## Try other comparisons

\`\`\`python
compare_lulc("3", "17_18", "24_25")
compare_lulc("2", "20_21", "24_25")
compare_lulc("1", "17_18", "24_25")
\`\`\`

Use Level 3 to explore detailed land-use and cropping classes, Level 2 for
broader land-use groups, and Level 1 for the most general land-cover change.
`),
      codeCell(`available_lulc = pd.DataFrame(
    [
        {"level": level, "year": year, "layer_id": layer_id}
        for level, years in LULC_LAYER_IDS.items()
        for year, layer_id in years.items()
    ]
)
available_lulc
`),
      markdownCell(`## Interpretation checklist

- Confirm that both years use the same LULC level.
- Use the synchronized camera or swipe at several zoom levels.
- Distinguish temporary crop-season changes from persistent land-cover change.
- Cross-check apparent change against water, terrain, restoration and
  administrative layers.
- Export subsets only after documenting level, years, extent and source.
`),
    ],
  });
};
