const normalizeSource = (value) => {
  const lines = String(value).replace(/\r\n?/g, "\n").split("\n");
  return lines.map((line, index) =>
    index < lines.length - 1 ? `${line}\n` : line
  );
};

const markdownCell = (id, source) => ({
  cell_type: "markdown",
  id,
  metadata: {},
  source: normalizeSource(source),
});

const codeCell = (id, source, metadata = {}) => ({
  cell_type: "code",
  execution_count: null,
  id,
  metadata,
  outputs: [],
  source: normalizeSource(source),
});

const pythonJson = (value) => JSON.stringify(JSON.stringify(value));

export const geoLibreNotebookSlug = (value) =>
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

export const geoLibreNotebookLayers = (project) =>
  [...(project?.layers || [])].reverse().map((layer) => ({
    id: layer.id,
    name: layer.name,
    domain: layer.metadata?.corestack?.domain || layer.groupId || "Other",
    type: layer.type,
    visible: Boolean(layer.visible),
    opacity: Number.isFinite(layer.opacity) ? layer.opacity : 1,
    loadState:
      layer.metadata?.loadState ||
      layer.metadata?.corestack?.loadState ||
      (layer.type === "raster" ? "remote" : "unknown"),
    service: layer.source?.service || layer.metadata?.service || "",
    sourceUrl:
      layer.type === "geojson"
        ? layer.source?.url || ""
        : layer.metadata?.corestack?.rasterDownload?.url ||
          layer.source?.url ||
          "",
    typeName: layer.source?.typeName || layer.source?.layers || "",
  }));

export const buildGeoLibreProjectExplorerNotebook = (project) => {
  if (!project?.metadata?.scope || !Array.isArray(project.layers)) {
    throw new Error("A generated tehsil GeoLibre project is required.");
  }

  const scope = projectScope(project);
  const layers = geoLibreNotebookLayers(project);
  const setup = `import json
import sys
import geolibre

SCOPE = json.loads(${pythonJson(scope)})
LAYERS = json.loads(${pythonJson(layers)})
m = geolibre.connect()

async def fetch_json(url):
    if sys.platform == "emscripten":
        from pyodide.http import pyfetch
        response = await pyfetch(url)
        if not response.ok:
            raise RuntimeError(f"Data request failed with HTTP {response.status}.")
        return await response.json()

    import urllib.request
    with urllib.request.urlopen(url, timeout=90) as response:
        return json.loads(response.read().decode("utf-8"))

print(f"Ready for {SCOPE['tehsil']}, {SCOPE['district']}.")`;

  return {
    cells: [
      markdownCell(
        "corestack-welcome",
        `# Explore CoRE Stack data for ${scope.tehsil}

This notebook was generated from the **${scope.tehsil}, ${scope.district}, ${scope.state}**
GeoLibre project. Run each cell with **Shift+Enter**.

The layer catalogue and source URLs below are a snapshot of that project at
download time. The notebook fetches published vector data directly and sends
derived results to the live GeoLibre map beside it without modifying any source
dataset.`
      ),
      codeCell("corestack-setup", setup, {
        jupyter: { source_hidden: true },
        tags: ["corestack-setup"],
      }),
      markdownCell(
        "corestack-list-heading",
        `## 1. List the project layers

This is the exact catalogue captured from KYL when this notebook was downloaded.`
      ),
      codeCell(
        "corestack-list-layers",
        `print(f"This project contains {len(LAYERS)} layers.\\n")
for number, layer in enumerate(LAYERS, 1):
    state = "visible" if layer["visible"] else layer["loadState"]
    print(
        f"{number:>2}. {layer['name']} | {layer['domain']} | "
        f"{layer['type']} | {state}"
    )`
      ),
      markdownCell(
        "corestack-load-heading",
        `## 2. Load a published vector layer

The first visible vector is selected automatically, so no URL or layer name
needs to be edited.`
      ),
      codeCell(
        "corestack-load-vector",
        `vector = next(
    layer for layer in LAYERS
    if layer["type"] == "geojson" and layer["visible"] and layer["sourceUrl"]
)
data = await fetch_json(vector["sourceUrl"])
features = data.get("features", [])
print(f"Loaded {len(features):,} features from {vector['name']}.")`
      ),
      markdownCell(
        "corestack-attributes-heading",
        `## 3. See what the map cannot show at once

This inventories the attribute fields carried by the selected layer.`
      ),
      codeCell(
        "corestack-inspect-attributes",
        `records = [feature.get("properties", {}) for feature in features]
fields = sorted({field for record in records for field in record})
print(f"{len(fields)} attribute fields are available.")
for field in fields[:20]:
    values = [r.get(field) for r in records if r.get(field) not in (None, "")]
    print(f"{field}: {len(values):,} populated; examples = {values[:3]}")`
      ),
      markdownCell(
        "corestack-derived-heading",
        `## 4. Add a temporary derived layer

The first ten features are copied into a session layer and the view returns to
the selected tehsil. The published CoRE Stack source remains unchanged.`
      ),
      codeCell(
        "corestack-derived-layer",
        `sample = {"type": "FeatureCollection", "features": features[:10]}
m.add_geojson(
    sample, name=f"Notebook sample · {vector['name']}",
    fillColor="#f59e0b", strokeColor="#7c2d12",
)
m.fit_bounds(SCOPE["bounds"])
print(f"Sent {len(sample['features'])} sample features to the live map.")`
      ),
      markdownCell(
        "corestack-notes",
        `## What this notebook demonstrates

- The notebook catalogue is generated from the same scoped KYL project as the map.
- Published vector attributes are fetched from the layer's GeoServer WFS URL.
- Derived GeoJSON can be sent to the adjacent map with GeoLibre's supported client.
- WMS images are not analytical pixels; raster notebooks should use the recorded WCS/coverage URL.

GeoLibre 2.6 Web cannot return the live layer list synchronously to a JupyterLite
kernel. If map visibility changes after download, regenerate this notebook to
capture the new state. True live read-back requires a GeoLibre/JupyterLite
frontend bridge in the planned self-hosted deployment.`
      ),
    ],
    metadata: {
      kernelspec: {
        display_name: "Python (Pyodide)",
        language: "python",
        name: "python",
      },
      language_info: { name: "python" },
      corestack: {
        kind: "project-explorer",
        requiresGeoLibre: "2.6.x",
        generatedFor: scope,
        projectName: project.name,
        generatedAtUtc: new Date().toISOString(),
      },
    },
    nbformat: 4,
    nbformat_minor: 5,
  };
};

export const geoLibreProjectExplorerFilename = (project) => {
  const scope = projectScope(project);
  return `core-stack-${geoLibreNotebookSlug(scope.tehsil)}-project-explorer.ipynb`;
};

export const downloadGeoLibreProjectExplorerNotebook = (project) => {
  const notebook = buildGeoLibreProjectExplorerNotebook(project);
  const blob = new Blob([JSON.stringify(notebook, null, 2)], {
    type: "application/x-ipynb+json;charset=utf-8",
  });
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = geoLibreProjectExplorerFilename(project);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 0);
};
