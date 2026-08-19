export const GEOLIBRE_NOTEBOOK_CATALOGUE = Object.freeze([
  {
    id: "tehsil-mws-overview",
    filename: "01_tehsil_mws_overview.ipynb",
    title: "Understand the micro-watersheds in a tehsil",
    summary: "Join MWS groundwater and terrain data to understand the selected tehsil.",
    featured: true,
  },
  {
    id: "hydrology-water-balance",
    filename: "02_hydrology_water_balance.ipynb",
    title: "Follow water conditions through time",
    summary: "Explore annual and fortnightly water conditions for one MWS.",
    featured: true,
  },
  {
    id: "agriculture-drought",
    filename: "03_agriculture_and_drought.ipynb",
    title: "Compare cropping intensity and drought",
    summary: "Compare cropping intensity and drought across years and MWSes.",
    featured: true,
  },
  {
    id: "outlier-mws",
    filename: "04_outlier_mws.ipynb",
    title: "Find unusual micro-watersheds",
    summary: "Find robust multivariate outliers and inspect why they differ.",
    featured: true,
  },
  {
    id: "similar-mws",
    filename: "05_similar_mws.ipynb",
    title: "Find similar micro-watersheds within a tehsil",
    summary: "Find five comparable MWS profiles within the same tehsil.",
    featured: true,
  },
  {
    id: "layer-manifest",
    filename: "00_core_stack_layer_manifest.ipynb",
    title: "Find and download CoRE Stack GeoServer layers",
    summary: "Browse every layer and construct WFS or WCS downloads for another tehsil.",
    featured: false,
  },
]);

export const geoLibreNotebookSlug = (value) =>
  String(value || "tehsil")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "tehsil";

const notebookDefinition = (notebookId) => {
  const definition = GEOLIBRE_NOTEBOOK_CATALOGUE.find(
    (notebook) => notebook.id === notebookId
  );
  if (!definition) {
    throw new Error(`Unknown GeoLibre notebook: ${notebookId}`);
  }
  return definition;
};

const projectScope = (project) => {
  const scope = project?.metadata?.scope;
  if (!scope?.state || !scope?.district || !scope?.tehsil) {
    throw new Error("Select a state, district, and tehsil before downloading a notebook.");
  }
  return {
    state: scope.state,
    district: scope.district,
    tehsil: scope.tehsil,
    bounds: Array.isArray(scope.bounds)
      ? scope.bounds
      : Array.isArray(project?.mapView?.bbox)
        ? project.mapView.bbox
        : [],
  };
};

const pythonJson = (value) => JSON.stringify(JSON.stringify(value));

export const geoLibreNotebookFilename = (notebookId, project) => {
  const definition = notebookDefinition(notebookId);
  const scope = projectScope(project);
  const suffix = definition.filename.replace(/^\d+_/, "");
  return `core-stack-${geoLibreNotebookSlug(scope.tehsil)}-${suffix}`;
};

export const injectGeoLibreNotebookScope = (
  template,
  project,
  generatedAtUtc = new Date().toISOString()
) => {
  const scope = projectScope(project);
  const notebook = JSON.parse(JSON.stringify(template));
  const setup = notebook.cells?.find(
    (cell) =>
      cell.cell_type === "code" &&
      Array.isArray(cell.metadata?.tags) &&
      cell.metadata.tags.includes("corestack-hidden") &&
      cell.source?.some((line) => line.startsWith("SCOPE = json.loads("))
  );

  if (!setup) {
    throw new Error("The GeoLibre notebook template has no injectable setup cell.");
  }

  setup.source = setup.source.map((line) =>
    line.startsWith("SCOPE = json.loads(")
      ? `SCOPE = json.loads(${pythonJson(scope)})\n`
      : line
  );
  notebook.metadata = {
    ...notebook.metadata,
    corestack: {
      ...notebook.metadata?.corestack,
      generatedFor: scope,
      generatedAtUtc,
      generatedBy: "Know Your Landscape",
    },
  };
  return notebook;
};

const templateUrl = (filename) => {
  const publicUrl = String(process.env.PUBLIC_URL || "").replace(/\/$/, "");
  return `${publicUrl}/geolibre-notebooks/${filename}`;
};

export const loadGeoLibreNotebookTemplate = async (
  notebookId,
  fetchImpl = window.fetch.bind(window)
) => {
  const definition = notebookDefinition(notebookId);
  const response = await fetchImpl(templateUrl(definition.filename));
  if (!response.ok) {
    throw new Error(
      `Could not load ${definition.title} (HTTP ${response.status}).`
    );
  }
  const notebook = await response.json();
  if (notebook?.nbformat !== 4 || !Array.isArray(notebook.cells)) {
    throw new Error(`${definition.title} is not a valid notebook template.`);
  }
  return notebook;
};

export const downloadGeoLibreNotebook = async (
  notebookId,
  project,
  {
    fetchImpl,
    documentRef = document,
    urlApi = window.URL,
    generatedAtUtc,
  } = {}
) => {
  const definition = notebookDefinition(notebookId);
  const template = await loadGeoLibreNotebookTemplate(notebookId, fetchImpl);
  const notebook = injectGeoLibreNotebookScope(
    template,
    project,
    generatedAtUtc
  );
  const filename = geoLibreNotebookFilename(notebookId, project);
  const blob = new Blob([JSON.stringify(notebook, null, 2)], {
    type: "application/x-ipynb+json;charset=utf-8",
  });
  const objectUrl = urlApi.createObjectURL(blob);
  const link = documentRef.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  documentRef.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => urlApi.revokeObjectURL(objectUrl), 0);
  return { id: definition.id, title: definition.title, filename };
};
