import catalogue from "./notebookCatalogue.json";

export const GEOLIBRE_NOTEBOOK_CATALOGUE = Object.freeze(catalogue);

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

  const apiUrl = process.env.REACT_APP_API_URL ||
    "https://geoserver.core-stack.org/api/v1/";
  const replacements = {
    "SCOPE =": `SCOPE = json.loads(${pythonJson(scope)})\n`,
    "API_URL =": `API_URL = json.loads(${pythonJson(apiUrl.replace(/\/?$/, "/"))})\n`,
  };
  setup.source = setup.source.map((line) => {
    const key = Object.keys(replacements).find((prefix) => line.startsWith(prefix));
    return key ? replacements[key] : line;
  });
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
