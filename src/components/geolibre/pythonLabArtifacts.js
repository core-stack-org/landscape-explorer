import { GEOLIBRE_CONFIG } from "../../config/geolibre.config";

// Portable Python/Jupyter artifacts generated from the current tehsil project.
export const GEOLIBRE_PYTHON_LAB_VERSION = "1.0.0";

const asSource = (value) => {
  const normalized = String(value).replace(/\r\n?/g, "\n");
  const parts = normalized.split("\n");
  return parts.map((part, index) =>
    index < parts.length - 1 ? `${part}\n` : part
  );
};

const markdownCell = (id, source) => ({
  cell_type: "markdown",
  id,
  metadata: {},
  source: asSource(source),
});

const codeCell = (id, source) => ({
  cell_type: "code",
  execution_count: null,
  id,
  metadata: {},
  outputs: [],
  source: asSource(source),
});

export const pythonLabSlug = (value) =>
  String(value || "tehsil")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "tehsil";

const projectScope = (project) => {
  const scope = project?.metadata?.scope || {};
  return {
    state: scope.state || "",
    district: scope.district || "",
    tehsil: scope.tehsil || "",
    bounds: Array.isArray(scope.bounds)
      ? scope.bounds
      : project?.mapView?.bbox || [],
  };
};

const pythonLabLayers = (project) =>
  [...(project?.layers || [])].reverse().map((layer) => ({
    id: layer.id,
    name: layer.name,
    domain:
      layer.metadata?.corestack?.domain || layer.groupId || "Other",
    type: layer.type,
    visible: Boolean(layer.visible),
    opacity: Number.isFinite(layer.opacity) ? layer.opacity : 1,
    loadState:
      layer.metadata?.loadState ||
      layer.metadata?.corestack?.loadState ||
      (layer.type === "raster" ? "remote" : "unknown"),
  }));

const pythonJsonLoad = (value) =>
  `json.loads(${JSON.stringify(JSON.stringify(value))})`;

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const nativePanelMarkup = (panelId, scope) => `
<div id="${panelId}" style="font-family:system-ui,sans-serif;border:1px solid #d8b4fe;border-radius:14px;padding:16px;background:#faf5ff;color:#1e293b">
  <div style="font-size:17px;font-weight:700">KYL live layer explorer</div>
  <div style="margin:3px 0 14px;color:#64748b;font-size:13px">${escapeHtml(scope.tehsil)}, ${escapeHtml(scope.district)}, ${escapeHtml(scope.state)}</div>
  <div style="display:grid;grid-template-columns:minmax(130px,0.8fr) minmax(220px,1.6fr);gap:10px">
    <label style="font-size:12px;font-weight:600">Domain<select data-role="domain" style="display:block;width:100%;margin-top:4px;padding:7px;border:1px solid #cbd5e1;border-radius:7px"></select></label>
    <label style="font-size:12px;font-weight:600">Layer<select data-role="layer" style="display:block;width:100%;margin-top:4px;padding:7px;border:1px solid #cbd5e1;border-radius:7px"></select></label>
  </div>
  <div style="display:flex;align-items:center;gap:12px;margin-top:12px;flex-wrap:wrap">
    <label style="font-size:13px"><input data-role="visible" type="checkbox" checked> visible</label>
    <label style="font-size:13px;flex:1;min-width:190px">opacity <input data-role="opacity" type="range" min="0" max="1" step="0.05" value="1" style="width:140px;vertical-align:middle"><span data-role="opacity-value">1.00</span></label>
    <button data-action="apply">Apply layer</button>
    <button data-action="zoom">Zoom to layer</button>
  </div>
  <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
    <button data-preset="overview">Overview</button>
    <button data-preset="hydrology">Hydrology starter</button>
    <button data-preset="lulc">Latest LULC</button>
    <button data-action="fit">Fit tehsil</button>
  </div>
  <div data-role="status" style="margin-top:11px;font-size:12px;color:#6d28d9">Ready. Layer changes are sent to the live GeoLibre map.</div>
</div>
`;

const nativePanelScript = ({ panelId, layers, scope }) => `
(() => {
  const root = document.getElementById(${JSON.stringify(panelId)});
  if (!root) return;
  const layers = ${JSON.stringify(layers)};
  const targetOrigin = document.referrer
    ? new URL(document.referrer).origin
    : "*";
  const send = (method, params) => {
    window.parent.postMessage(
      { type: "geolibre:command", requestId: "", method, params },
      targetOrigin
    );
  };
  const domain = root.querySelector('[data-role="domain"]');
  const layer = root.querySelector('[data-role="layer"]');
  const visible = root.querySelector('[data-role="visible"]');
  const opacity = root.querySelector('[data-role="opacity"]');
  const opacityValue = root.querySelector('[data-role="opacity-value"]');
  const status = root.querySelector('[data-role="status"]');
  const domains = [...new Set(layers.map((item) => item.domain))];
  const fillLayers = () => {
    const options = layers.filter((item) => item.domain === domain.value);
    layer.innerHTML = options
      .map((item) => '<option value="' + item.id + '">' + item.name + '</option>')
      .join("");
    const selected = options[0];
    if (selected) {
      visible.checked = selected.visible;
      opacity.value = String(selected.opacity);
      opacityValue.textContent = Number(selected.opacity).toFixed(2);
    }
  };
  domain.innerHTML = domains
    .map((name) => '<option value="' + name + '">' + name + '</option>')
    .join("");
  domain.addEventListener("change", fillLayers);
  layer.addEventListener("change", () => {
    const selected = layers.find((item) => item.id === layer.value);
    if (!selected) return;
    visible.checked = selected.visible;
    opacity.value = String(selected.opacity);
    opacityValue.textContent = Number(selected.opacity).toFixed(2);
  });
  opacity.addEventListener("input", () => {
    opacityValue.textContent = Number(opacity.value).toFixed(2);
  });
  const show = (id, value = true, layerOpacity = null) => {
    send("setVisibility", { layerId: id, visible: value });
    if (layerOpacity !== null) {
      send("setOpacity", { layerId: id, opacity: layerOpacity });
    }
  };
  root.querySelector('[data-action="apply"]').addEventListener("click", () => {
    show(layer.value, visible.checked, Number(opacity.value));
    status.textContent = "Applied " + layer.options[layer.selectedIndex].text + ".";
  });
  root.querySelector('[data-action="zoom"]').addEventListener("click", () => {
    send("zoomToLayer", { layerId: layer.value });
    status.textContent = "Requested a zoom to the selected layer.";
  });
  root.querySelector('[data-action="fit"]').addEventListener("click", () => {
    send("fitBounds", { bounds: ${JSON.stringify(scope.bounds)} });
    status.textContent = "Fitted the full " + ${JSON.stringify(scope.tehsil)} + " extent.";
  });
  root.querySelector('[data-preset="overview"]').addEventListener("click", () => {
    show("corestack-administrative_boundaries", true, 0.8);
    show("corestack-demographics", true, 0.8);
    status.textContent = "Overview layers are visible.";
  });
  root.querySelector('[data-preset="hydrology"]').addEventListener("click", () => {
    [
      "corestack-mws_layers",
      "corestack-drainage",
      "corestack-remote_sensed_waterbodies"
    ].forEach((id) => show(id, true, 0.85));
    status.textContent = "Hydrology starter layers are loading. They will be reused after first load.";
  });
  root.querySelector('[data-preset="lulc"]').addEventListener("click", () => {
    show("corestack-lulc_level_3_24_25", true, 1);
    status.textContent = "The latest LULC Level 3 layer is visible.";
  });
  fillLayers();
})();
`;

export const buildGeoLibreNotebook = (project) => {
  if (!project?.metadata?.scope || !Array.isArray(project.layers)) {
    throw new Error("A generated tehsil project is required for the Python Lab.");
  }

  const scope = projectScope(project);
  const layers = pythonLabLayers(project);
  const panelId = `kyl-python-lab-${pythonLabSlug(scope.tehsil)}`;
  const testedVersion =
    project.metadata?.geolibre?.applicationVersion || GEOLIBRE_CONFIG.version;
  const setup = `import importlib
import json
import subprocess
import sys
from IPython.display import display

PROJECT = ${pythonJsonLoad(project)}
SCOPE = ${pythonJsonLoad(scope)}
LAYERS = ${pythonJsonLoad(layers)}
TESTED_GEOLIBRE_VERSION = ${JSON.stringify(testedVersion)}

try:
    geolibre = importlib.import_module("geolibre")
except ModuleNotFoundError:
    subprocess.check_call([
        sys.executable,
        "-m",
        "pip",
        "install",
        "--quiet",
        f"geolibre=={TESTED_GEOLIBRE_VERSION}",
    ])
    geolibre = importlib.import_module("geolibre")

IN_GEOLIBRE_NOTEBOOK = hasattr(geolibre, "connect")

if IN_GEOLIBRE_NOTEBOOK:
    m = geolibre.connect()
    print(
        f"Connected to the live GeoLibre map for "
        f"{SCOPE['tehsil']}, {SCOPE['district']}."
    )
else:
    from geolibre import Map

    m = Map(height="720px", layout="full")
    m.load_project(PROJECT)
    display(m)
    print(
        f"Loaded a portable copy of the {SCOPE['tehsil']} project "
        f"with GeoLibre {TESTED_GEOLIBRE_VERSION}."
    )`;

  const helpers = `LAYER_BY_ID = {layer["id"]: layer for layer in LAYERS}
PROJECT_LAYER_BY_ID = {layer["id"]: layer for layer in PROJECT["layers"]}
LAYER_IDS_BY_DOMAIN = {}
for layer in LAYERS:
    LAYER_IDS_BY_DOMAIN.setdefault(layer["domain"], []).append(layer["id"])
EXTERNAL_LAYER_IDS = {}

def ensure_external_vector(layer_id):
    """Fetch an unloaded WFS vector when this notebook runs outside KYL."""
    if IN_GEOLIBRE_NOTEBOOK:
        return layer_id
    if layer_id in EXTERNAL_LAYER_IDS:
        return EXTERNAL_LAYER_IDS[layer_id]
    summary = LAYER_BY_ID[layer_id]
    if summary["type"] != "geojson" or summary["loadState"] == "loaded":
        return layer_id
    source_layer = PROJECT_LAYER_BY_ID[layer_id]
    source = source_layer.get("source", {})
    endpoint = source.get("url", "").split("?", 1)[0]
    type_name = source.get("typeName")
    if not endpoint or not type_name:
        raise RuntimeError(f"{summary['name']} has no reusable WFS source.")
    hydrated_id = m.add_wfs(
        endpoint,
        type_name,
        name=summary["name"],
        version=source.get("version", "1.0.0"),
        output_format=source.get("outputFormat", "application/json"),
        srs_name=source.get("srsName", "EPSG:4326"),
        max_features=None,
        **source_layer.get("style", {}),
    )
    m.remove_layer(layer_id)
    EXTERNAL_LAYER_IDS[layer_id] = hydrated_id
    return hydrated_id

def set_layer(layer_id, visible=True, opacity=None):
    """Show or hide one KYL layer and optionally change its opacity."""
    if layer_id not in LAYER_BY_ID:
        raise KeyError(f"Unknown KYL layer: {layer_id}")
    if IN_GEOLIBRE_NOTEBOOK:
        m.set_visibility(layer_id, visible)
        if opacity is not None:
            m.set_opacity(layer_id, opacity)
    else:
        external_id = EXTERNAL_LAYER_IDS.get(layer_id, layer_id)
        if visible:
            external_id = ensure_external_vector(layer_id)
        layer = m.get_layer(external_id)
        layer.visible = visible
        if opacity is not None:
            layer.opacity = opacity

def fit_tehsil():
    """Return to the complete selected-tehsil extent."""
    m.fit_bounds(SCOPE["bounds"])

def show_overview():
    set_layer("corestack-administrative_boundaries", True, 0.8)
    set_layer("corestack-demographics", True, 0.8)

def show_hydrology_starter():
    for layer_id in (
        "corestack-mws_layers",
        "corestack-drainage",
        "corestack-remote_sensed_waterbodies",
    ):
        set_layer(layer_id, True, 0.85)

def show_latest_lulc():
    set_layer("corestack-lulc_level_3_24_25", True, 1.0)

def add_observation(lng, lat, label="Field observation"):
    """Add a labelled point without changing any CoRE Stack source layer."""
    if IN_GEOLIBRE_NOTEBOOK:
        m.add_marker(lng, lat, name="KYL observations", label=label)
    else:
        m.add_marker(
            lng,
            lat,
            name="KYL observations",
            properties={"label": label},
        )

def buffer_layer(layer_id="corestack-demographics", distance=500):
    """Run GeoLibre's client-side buffer tool; distance is in metres."""
    if IN_GEOLIBRE_NOTEBOOK:
        m.run_algorithm("buffer", layer=layer_id, distance=distance)
    else:
        return m.run_algorithm(
            "buffer",
            {"layer": layer_id, "distance": distance},
            timeout=300,
        )

print(f"{len(LAYERS)} KYL layers are available across {len(LAYER_IDS_BY_DOMAIN)} domains.")
print("Try show_hydrology_starter(), show_latest_lulc(), or fit_tehsil().")`;

  const externalWidgets = `if not IN_GEOLIBRE_NOTEBOOK:
    import ipywidgets as widgets

    domain_widget = widgets.Dropdown(
        options=list(LAYER_IDS_BY_DOMAIN),
        description="Domain",
    )
    layer_widget = widgets.Dropdown(description="Layer")
    visible_widget = widgets.Checkbox(value=True, description="Visible")
    opacity_widget = widgets.FloatSlider(
        value=1.0,
        min=0.0,
        max=1.0,
        step=0.05,
        description="Opacity",
    )
    apply_button = widgets.Button(description="Apply layer", button_style="primary")
    fit_button = widgets.Button(description="Fit tehsil")
    output = widgets.Output()

    def refresh_layers(*_):
        ids = LAYER_IDS_BY_DOMAIN[domain_widget.value]
        layer_widget.options = [
            (LAYER_BY_ID[layer_id]["name"], layer_id) for layer_id in ids
        ]

    def apply_layer(_):
        with output:
            output.clear_output()
            set_layer(layer_widget.value, visible_widget.value, opacity_widget.value)
            print(f"Applied {LAYER_BY_ID[layer_widget.value]['name']}.")

    def fit_selected_tehsil(_):
        fit_tehsil()

    domain_widget.observe(refresh_layers, names="value")
    apply_button.on_click(apply_layer)
    fit_button.on_click(fit_selected_tehsil)
    refresh_layers()
    display(
        widgets.VBox([
            widgets.HTML(
                f"<h3>KYL layer explorer: {SCOPE['tehsil']}</h3>"
                "<p>Control the portable GeoLibre map from Python.</p>"
            ),
            widgets.HBox([domain_widget, layer_widget]),
            widgets.HBox([visible_widget, opacity_widget]),
            widgets.HBox([apply_button, fit_button]),
            output,
        ])
    )
else:
    print("Run the next cell for controls connected to the live GeoLibre map.")`;

  const nativeMarkup = nativePanelMarkup(panelId, scope);
  const nativeScript = nativePanelScript({ panelId, layers, scope });
  const nativeWidgets = `if IN_GEOLIBRE_NOTEBOOK:
    from IPython.display import HTML, Javascript

    display(HTML(${JSON.stringify(nativeMarkup)}))
    display(Javascript(${JSON.stringify(nativeScript)}))
else:
    print("The external Jupyter controls are displayed above.")`;

  const experiment = `# Safe examples: uncomment one line at a time.

# show_overview()
# show_hydrology_starter()
# show_latest_lulc()
# fit_tehsil()

# Add a non-destructive observation at the tehsil centre:
west, south, east, north = SCOPE["bounds"]
centre = ((west + east) / 2, (south + north) / 2)
# add_observation(*centre, label="Notebook demo point")

# Create a derived 500 m buffer layer from the loaded Socio-Economic layer:
# buffer_layer("corestack-demographics", distance=500)`;

  return {
    cells: [
      markdownCell(
        "kyl-introduction",
        `# KYL GeoLibre Python Lab: ${scope.tehsil}

This notebook is generated from the **${scope.tehsil}, ${scope.district}, ${scope.state}**
CoRE Stack project. It supports two modes:

1. **Inside GeoLibre:** open **Processing → Jupyter Notebook**, upload this file,
   and run all cells. The notebook controls the live map beside it.
2. **Colab, VS Code, or local Jupyter:** upload/open this file and run all cells.
   It installs the tested GeoLibre Python package and opens a portable copy of
   the same tehsil project.

CoRE Stack datasets are available under CC BY 4.0. Derived layers created here
remain separate from the source datasets.`
      ),
      codeCell("kyl-setup", setup),
      markdownCell(
        "kyl-helpers-heading",
        `## Reusable Python helpers

The layer IDs are stable across KYL projects. In the native GeoLibre notebook,
turning on a hidden vector also activates KYL's fetch-on-first-toggle flow.`
      ),
      codeCell("kyl-helpers", helpers),
      markdownCell(
        "kyl-controls-heading",
        `## Interactive layer controls

The in-page notebook uses a lightweight browser control panel, avoiding a
server and extra widget packages. External notebooks use standard ipywidgets.`
      ),
      codeCell("kyl-external-controls", externalWidgets),
      codeCell("kyl-native-controls", nativeWidgets),
      markdownCell(
        "kyl-experiment-heading",
        `## Guided experiment

These examples alter only the current project session. They do not modify the
published CoRE Stack layers.`
      ),
      codeCell("kyl-experiment", experiment),
      markdownCell(
        "kyl-next-steps",
        `## Continue exploring

- Inspect or style active layers in GeoLibre's normal panels.
- Use \`buffer_layer(...)\` to create a derived vector layer.
- Add field observations with \`add_observation(...)\`.
- Save the resulting project from GeoLibre, or call
  \`m.save_project("kyl-result.geolibre.json")\` in external Jupyter.

The browser notebook uses Pyodide/WebAssembly. Long native GDAL/Rasterio jobs
belong in GeoLibre Desktop or an external Jupyter environment.`
      ),
    ],
    metadata: {
      kernelspec: {
        display_name: "Python (Pyodide)",
        language: "python",
        name: "python",
      },
      language_info: {
        name: "python",
        version: "3",
      },
      kyl: {
        pythonLabVersion: GEOLIBRE_PYTHON_LAB_VERSION,
        generatedFor: scope,
        geolibreVersion: testedVersion,
      },
    },
    nbformat: 4,
    nbformat_minor: 5,
  };
};

export const buildGeoLibreConsoleScript = (project) => {
  if (!project?.metadata?.scope || !Array.isArray(project.layers)) {
    throw new Error("A generated tehsil project is required for the Python Lab.");
  }
  const scope = projectScope(project);
  const layers = pythonLabLayers(project);
  return `"""KYL GeoLibre Python Console helpers for the selected tehsil.

Open Processing -> Python Console -> Show editor, open this file, then Run.
The global geolibre object is supplied by GeoLibre.
"""

import json

SCOPE = json.loads(${JSON.stringify(JSON.stringify(scope))})
LAYERS = json.loads(${JSON.stringify(JSON.stringify(layers))})


def layer(layer_id):
    return geolibre.get_layer(layer_id)


def set_layer(layer_id, visible=True, opacity=None):
    item = layer(layer_id)
    item.visible = visible
    if opacity is not None:
        item.opacity = opacity
    return item


def fit_tehsil():
    geolibre.fit_bounds(SCOPE["bounds"])


def show_overview():
    set_layer("corestack-administrative_boundaries", True, 0.8)
    set_layer("corestack-demographics", True, 0.8)


def show_hydrology_starter():
    for layer_id in (
        "corestack-mws_layers",
        "corestack-drainage",
        "corestack-remote_sensed_waterbodies",
    ):
        set_layer(layer_id, True, 0.85)


def show_latest_lulc():
    set_layer("corestack-lulc_level_3_24_25", True, 1.0)


def list_layers():
    for item in geolibre.layers:
        print(item.id, item.name, item.type, item.visible)


async def buffer_demographics(distance=500):
    return await geolibre.run_algorithm(
        "buffer",
        {"layer": "corestack-demographics", "distance": distance},
    )


print(f"KYL Python helpers are ready for {SCOPE['tehsil']}.")
print("Try show_hydrology_starter(), show_latest_lulc(), or list_layers().")
`;
};

export const pythonLabFileNames = (project) => {
  const scope = projectScope(project);
  const stem = `kyl-${pythonLabSlug(scope.state)}-${pythonLabSlug(
    scope.district
  )}-${pythonLabSlug(scope.tehsil)}-geolibre`;
  return {
    notebook: `${stem}.ipynb`,
    script: `${stem}.py`,
  };
};
