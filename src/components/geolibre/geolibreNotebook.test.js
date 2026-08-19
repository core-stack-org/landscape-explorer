import {
  buildGeoLibreProjectExplorerNotebook,
  geoLibreNotebookLayers,
  geoLibreProjectExplorerFilename,
} from "./geolibreNotebook";

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
  layers: [
    {
      id: "corestack-demographics",
      name: "Socio-Economic Profile",
      type: "geojson",
      visible: true,
      opacity: 0.8,
      groupId: "demographic",
      source: {
        service: "wfs",
        typeName: "panchayat_boundaries:cachar_lakhipur",
        url: "https://geoserver.example/panchayat_boundaries/ows?service=WFS",
      },
      metadata: {
        loadState: "loaded",
        corestack: { domain: "Demographic" },
      },
    },
    {
      id: "corestack-dem",
      name: "Elevation (DEM)",
      type: "raster",
      visible: false,
      opacity: 1,
      groupId: "land",
      source: { service: "wms", layers: "dem:cachar_lakhipur_dem_raster" },
      metadata: {
        corestack: {
          domain: "Land",
          rasterDownload: { url: "https://geoserver.example/wcs?coverage=dem" },
        },
      },
    },
  ],
};

describe("CoRE Stack GeoLibre project explorer notebook", () => {
  it("captures scoped project layers and their analytical source URLs", () => {
    expect(geoLibreNotebookLayers(project)).toEqual([
      expect.objectContaining({
        id: "corestack-dem",
        type: "raster",
        sourceUrl: "https://geoserver.example/wcs?coverage=dem",
      }),
      expect.objectContaining({
        id: "corestack-demographics",
        type: "geojson",
        sourceUrl:
          "https://geoserver.example/panchayat_boundaries/ows?service=WFS",
      }),
    ]);
  });

  it("builds an output-free Pyodide notebook that uses supported web paths", () => {
    const notebook = buildGeoLibreProjectExplorerNotebook(project);
    const source = notebook.cells.flatMap((cell) => cell.source).join("");

    expect(notebook).toMatchObject({
      nbformat: 4,
      nbformat_minor: 5,
      metadata: {
        kernelspec: { name: "python", display_name: "Python (Pyodide)" },
        corestack: {
          kind: "project-explorer",
          generatedFor: { tehsil: "Lakhipur" },
        },
      },
    });
    expect(source).toContain("geolibre.connect()");
    expect(source).toContain("from pyodide.http import pyfetch");
    expect(source).toContain("LAYERS = json.loads");
    expect(source).toContain("m.add_geojson(");
    expect(source).not.toContain("ask_map");
    expect(source).not.toContain("geolibre._request");
    expect(source).not.toContain("from js import");
    expect(
      notebook.cells
        .filter((cell) => cell.cell_type === "code")
        .every(
          (cell) =>
            cell.execution_count === null && cell.outputs.length === 0
        )
    ).toBe(true);
  });

  it("keeps setup hidden and public exploration cells within ten lines", () => {
    const notebook = buildGeoLibreProjectExplorerNotebook(project);
    const setup = notebook.cells.find((cell) => cell.id === "corestack-setup");
    const publicCode = notebook.cells.filter(
      (cell) => cell.cell_type === "code" && cell.id !== "corestack-setup"
    );

    expect(setup.metadata.jupyter.source_hidden).toBe(true);
    expect(publicCode.every((cell) => cell.source.length <= 10)).toBe(true);
    expect(geoLibreProjectExplorerFilename(project)).toBe(
      "core-stack-lakhipur-project-explorer.ipynb"
    );
  });
});
