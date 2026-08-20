import fs from "fs";
import path from "path";
import {
  GEOLIBRE_NOTEBOOK_CATALOGUE,
  downloadGeoLibreNotebook,
  geoLibreNotebookFilename,
  injectGeoLibreNotebookScope,
  loadGeoLibreNotebookTemplate,
} from "./geolibreNotebook";
import { GEOLIBRE_LAYERS } from "../../config/geolibreLayers";

const notebookDirectory = path.join(
  process.cwd(),
  "public",
  "geolibre-notebooks"
);

const project = {
  name: "Lakhipur, Cachar: CoRE Stack landscape",
  mapView: { bbox: [92.91, 24.71, 93.17, 24.99] },
  metadata: {
    scope: {
      state: "Assam",
      district: "Cachar",
      tehsil: "Lakhipur",
      bounds: [92.91, 24.71, 93.17, 24.99],
    },
  },
};

const readNotebook = (filename) =>
  JSON.parse(fs.readFileSync(path.join(notebookDirectory, filename), "utf8"));

describe("CoRE Stack GeoLibre notebook catalogue", () => {
  it("publishes a quick start, five analytical notebooks, and a separate layer manifest", () => {
    const publicCatalogue = JSON.parse(
      fs.readFileSync(path.join(notebookDirectory, "catalog.json"), "utf8")
    );

    expect(GEOLIBRE_NOTEBOOK_CATALOGUE).toHaveLength(7);
    expect(GEOLIBRE_NOTEBOOK_CATALOGUE.filter(({ featured }) => featured)).toHaveLength(6);
    expect(publicCatalogue).toEqual(GEOLIBRE_NOTEBOOK_CATALOGUE);
    expect(GEOLIBRE_NOTEBOOK_CATALOGUE.at(-1).id).toBe("layer-manifest");
  });

  it("keeps the quick start bounded and free of scientific package dependencies", () => {
    const notebook = readNotebook("06_quick_mws_preview.ipynb");
    const allSource = notebook.cells.flatMap((cell) => cell.source).join("");
    const kernelCell = notebook.cells.find((cell) => cell.id === "quick-kernel");
    const scoped = injectGeoLibreNotebookScope(
      notebook,
      project,
      "2026-08-20T00:00:00.000Z"
    );

    expect(notebook.metadata.corestack).toMatchObject({
      id: "quick-mws-preview",
      relevantLayerIds: ["mws_layers"],
      minimalDependencies: true,
    });
    expect(allSource).toContain("maxFeatures=5");
    expect(allSource).toContain("geolibre.connect()");
    expect(allSource).not.toMatch(/pandas|numpy|matplotlib|ipywidgets|%pip/);
    expect(kernelCell.metadata.jupyter).toBeUndefined();
    expect(
      scoped.cells.find((cell) => cell.id === "quick-kernel").source.join("")
    ).toContain("Lakhipur");
  });

  it("keeps every template output-free, Pyodide-ready, and free of the unsupported bridge", () => {
    for (const definition of GEOLIBRE_NOTEBOOK_CATALOGUE) {
      const notebook = readNotebook(definition.filename);
      const allSource = notebook.cells.flatMap((cell) => cell.source).join("");
      const publicCode = notebook.cells.filter(
        (cell) =>
          cell.cell_type === "code" &&
          cell.metadata?.jupyter?.source_hidden !== true
      );

      expect(notebook).toMatchObject({
        nbformat: 4,
        nbformat_minor: 5,
        metadata: {
          kernelspec: { name: "python", display_name: "Python (Pyodide)" },
          corestack: { id: definition.id, title: definition.title },
        },
      });
      expect(
        notebook.cells
          .filter((cell) => cell.cell_type === "code")
          .every(
            (cell) =>
              cell.execution_count === null && cell.outputs.length === 0
          )
      ).toBe(true);
      expect(publicCode.every((cell) => cell.source.length <= 10)).toBe(true);
      expect(allSource).toContain("from pyodide.http import pyfetch");
      expect(allSource).toContain("geolibre.connect()");
      expect(allSource).not.toContain("ipywidgets");
      expect(allSource).not.toContain("widgets.");
      expect(allSource).not.toContain("ask_map");
      expect(allSource).not.toContain("geolibre._request");
      expect(allSource).not.toContain("from js import");
      expect(allSource).not.toMatch(/api[_ -]?key/i);
    }
  });

  it("uses the deployed waterbody membership field and bounded hydrology requests", () => {
    const notebook = readNotebook("02_hydrology_water_balance.ipynb");
    const allSource = notebook.cells.flatMap((cell) => cell.source).join("");

    expect(allSource).toContain("max_features=1");
    expect(allSource).toContain("mws_uid_list LIKE");
    expect(allSource).not.toContain("MWS_UID='");
  });

  it("limits analytical templates to relevant layers and exposes all 55 presentations in the manifest", () => {
    const expected = {
      "quick-mws-preview": ["mws_layers"],
      "tehsil-mws-overview": ["mws_layers", "terrain_vector"],
      "hydrology-water-balance": [
        "mws_layers",
        "mws_layers_fortnight",
        "remote_sensed_waterbodies",
      ],
      "agriculture-drought": ["cropping_intensity", "drought"],
      "outlier-mws": [
        "mws_layers",
        "cropping_intensity",
        "drought",
        "terrain_vector",
      ],
      "similar-mws": [
        "mws_layers",
        "cropping_intensity",
        "drought",
        "terrain_vector",
      ],
    };

    for (const [id, layerIds] of Object.entries(expected)) {
      const definition = GEOLIBRE_NOTEBOOK_CATALOGUE.find(
        (notebook) => notebook.id === id
      );
      const notebook = readNotebook(definition.filename);
      expect(notebook.metadata.corestack.relevantLayerIds).toEqual(layerIds);
    }

    const manifest = readNotebook("00_core_stack_layer_manifest.ipynb");
    expect(manifest.metadata.corestack.relevantLayerIds).toHaveLength(55);
    expect(new Set(manifest.metadata.corestack.relevantLayerIds).size).toBe(55);
    expect(new Set(manifest.metadata.corestack.relevantLayerIds)).toEqual(
      new Set(GEOLIBRE_LAYERS.map(({ id }) => id))
    );
  });

  it("injects the active tehsil without mutating the checked-in template", () => {
    const template = readNotebook("02_hydrology_water_balance.ipynb");
    const original = JSON.stringify(template);
    const generated = injectGeoLibreNotebookScope(
      template,
      project,
      "2026-08-20T00:00:00.000Z"
    );
    const setup = generated.cells.find((cell) =>
      cell.source.some((line) => line.startsWith("SCOPE = json.loads("))
    );

    expect(setup.source.join("")).toContain("Lakhipur");
    expect(generated.metadata.corestack).toMatchObject({
      generatedFor: { state: "Assam", district: "Cachar", tehsil: "Lakhipur" },
      generatedAtUtc: "2026-08-20T00:00:00.000Z",
      generatedBy: "Know Your Landscape",
    });
    expect(JSON.stringify(template)).toBe(original);
    expect(geoLibreNotebookFilename("hydrology-water-balance", project)).toBe(
      "core-stack-lakhipur-hydrology_water_balance.ipynb"
    );
  });

  it("loads templates from the public notebook directory", async () => {
    const template = readNotebook("01_tehsil_mws_overview.ipynb");
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => template,
    });

    await expect(
      loadGeoLibreNotebookTemplate("tehsil-mws-overview", fetchImpl)
    ).resolves.toMatchObject({ metadata: { corestack: { id: "tehsil-mws-overview" } } });
    expect(fetchImpl).toHaveBeenCalledWith(
      "/geolibre-notebooks/01_tehsil_mws_overview.ipynb"
    );
  });

  it("downloads an injected notebook with a scoped, human-readable filename", async () => {
    const template = readNotebook("02_hydrology_water_balance.ipynb");
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => template,
    });
    const link = { click: jest.fn(), remove: jest.fn() };
    const documentRef = {
      body: { appendChild: jest.fn() },
      createElement: jest.fn(() => link),
    };
    const urlApi = {
      createObjectURL: jest.fn(() => "blob:notebook"),
      revokeObjectURL: jest.fn(),
    };

    await expect(
      downloadGeoLibreNotebook("hydrology-water-balance", project, {
        fetchImpl,
        documentRef,
        urlApi,
        generatedAtUtc: "2026-08-20T00:00:00.000Z",
      })
    ).resolves.toMatchObject({
      id: "hydrology-water-balance",
      filename: "core-stack-lakhipur-hydrology_water_balance.ipynb",
    });

    expect(link).toMatchObject({
      href: "blob:notebook",
      download: "core-stack-lakhipur-hydrology_water_balance.ipynb",
    });
    expect(documentRef.body.appendChild).toHaveBeenCalledWith(link);
    expect(link.click).toHaveBeenCalledTimes(1);
    expect(link.remove).toHaveBeenCalledTimes(1);
  });
});
