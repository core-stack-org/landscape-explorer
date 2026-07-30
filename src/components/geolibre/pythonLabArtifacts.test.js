import {
  buildGeoLibreConsoleScript,
  buildGeoLibreNotebook,
  pythonLabFileNames,
  pythonLabSlug,
} from "./pythonLabArtifacts";

const project = {
  version: "0.2.0",
  name: "Lakhipur project",
  mapView: {
    bbox: [92.91, 24.71, 93.17, 24.99],
  },
  layers: [
    {
      id: "corestack-demographics",
      name: "Socio-Economic Profile",
      type: "geojson",
      visible: true,
      opacity: 0.8,
      groupId: "demographic",
      metadata: {
        loadState: "loaded",
        corestack: { domain: "Demographic" },
      },
      geojson: { type: "FeatureCollection", features: [] },
    },
    {
      id: "corestack-mws_layers",
      name: "Micro-watersheds and Hydrological Variables",
      type: "geojson",
      visible: false,
      opacity: 1,
      groupId: "hydrology",
      metadata: {
        loadState: "unloaded",
        corestack: { domain: "Hydrology" },
      },
      geojson: { type: "FeatureCollection", features: [] },
    },
    {
      id: "corestack-lulc_level_3_24_25",
      name: "LULC Level 3 · 2024-2025",
      type: "raster",
      visible: false,
      opacity: 1,
      groupId: "lulc-3",
      metadata: { corestack: { domain: "LULC Level 3" } },
    },
  ],
  metadata: {
    scope: {
      state: "Assam",
      district: "Cachar",
      tehsil: "Lakhipur",
      bounds: [92.91, 24.71, 93.17, 24.99],
    },
    geolibre: {
      applicationVersion: "2.4.0",
    },
  },
};

describe("KYL GeoLibre Python Lab artifacts", () => {
  it("creates a valid notebook with native and external GeoLibre modes", () => {
    const notebook = buildGeoLibreNotebook(project);
    const source = notebook.cells
      .map((cell) => cell.source.join(""))
      .join("\n");

    expect(notebook.nbformat).toBe(4);
    expect(notebook.metadata.kyl).toMatchObject({
      pythonLabVersion: "1.0.0",
      geolibreVersion: "2.4.0",
      generatedFor: {
        state: "Assam",
        district: "Cachar",
        tehsil: "Lakhipur",
      },
    });
    expect(source).toContain('hasattr(geolibre, "connect")');
    expect(source).toContain('f"geolibre=={TESTED_GEOLIBRE_VERSION}"');
    expect(source).toContain("m.load_project(PROJECT)");
    expect(source).toContain("m.add_wfs(");
    expect(source).toContain("max_features=None");
    expect(source).toContain("corestack-mws_layers");
    expect(source).toContain("corestack-lulc_level_3_24_25");
    expect(source).toContain("geolibre:command");
    expect(source).toContain("show_hydrology_starter()");
  });

  it("creates a Python Console script that uses the live GeoLibre API", () => {
    const script = buildGeoLibreConsoleScript(project);

    expect(script).toContain("SCOPE = json.loads(");
    expect(script).toContain("geolibre.get_layer(layer_id)");
    expect(script).toContain("async def buffer_demographics");
    expect(script).toContain("corestack-administrative_boundaries");
    expect(script).not.toContain("\r");
  });

  it("uses portable, location-specific file names", () => {
    expect(pythonLabSlug(" Bānas Kāntha (Palanpur) ")).toBe(
      "banas-kantha-palanpur"
    );
    expect(pythonLabFileNames(project)).toEqual({
      notebook: "kyl-assam-cachar-lakhipur-geolibre.ipynb",
      script: "kyl-assam-cachar-lakhipur-geolibre.py",
    });
  });

  it("requires an actual generated tehsil project", () => {
    expect(() => buildGeoLibreNotebook({})).toThrow(
      /generated tehsil project/i
    );
    expect(() => buildGeoLibreConsoleScript(null)).toThrow(
      /generated tehsil project/i
    );
  });
});
