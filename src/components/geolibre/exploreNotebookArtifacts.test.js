import {
  buildHydrologyExploreNotebook,
  buildLulcComparisonProject,
  buildLulcExploreNotebook,
  exploreNotebookFileNames,
  getLulcComparisonOptions,
} from "./exploreNotebookArtifacts";

const lulcLayer = (level, year, label) => ({
  id: `corestack-lulc_level_${level}_${year}`,
  name: `LULC Level ${level} · ${label}`,
  type: "raster",
  visible: false,
  opacity: 1,
  groupId: `lulc-${level}`,
  source: { url: `https://example.test/lulc-${level}-${year}.tif` },
  metadata: {
    corestack: {
      domain: `LULC Level ${level}`,
      year,
    },
  },
});

const project = {
  version: "0.2.0",
  name: "Lakhipur project",
  mapView: {
    center: [93.04, 24.85],
    zoom: 10,
    bearing: 0,
    pitch: 0,
    bbox: [92.91, 24.71, 93.17, 24.99],
  },
  layers: [
    {
      id: "corestack-administrative_boundaries",
      name: "Administrative Boundaries",
      type: "geojson",
      visible: true,
      opacity: 0.8,
      groupId: "demographic",
      source: {
        service: "wfs",
        url: "https://example.test/admin?service=WFS",
      },
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
      source: {
        service: "wfs",
        typeName: "mws_layers:deltaG_well_depth_cachar_lakhipur",
        url: "https://example.test/mws?service=WFS",
      },
      metadata: {
        loadState: "unloaded",
        corestack: { domain: "Hydrology" },
      },
      geojson: { type: "FeatureCollection", features: [] },
    },
    lulcLayer("1", "17_18", "2017-2018"),
    lulcLayer("1", "24_25", "2024-2025"),
    lulcLayer("2", "17_18", "2017-2018"),
    lulcLayer("2", "24_25", "2024-2025"),
    lulcLayer("3", "17_18", "2017-2018"),
    lulcLayer("3", "24_25", "2024-2025"),
  ],
  metadata: {
    scope: {
      state: "Assam",
      district: "Cachar",
      tehsil: "Lakhipur",
      bounds: [92.91, 24.71, 93.17, 24.99],
    },
    geolibre: { applicationVersion: "2.4.0" },
  },
};

const notebookSource = (notebook) =>
  notebook.cells.map((cell) => cell.source.join("")).join("\n");

describe("CoRE Stack Explore notebook artifacts", () => {
  it("builds a hydrology workbook from the project WFS and optional API flow", () => {
    const notebook = buildHydrologyExploreNotebook(project);
    const source = notebookSource(notebook);

    expect(notebook.metadata.kyl).toMatchObject({
      kind: "hydrology",
      geolibreVersion: "2.4.0",
    });
    expect(source).toContain("https://example.test/mws?service=WFS");
    expect(source).toContain("indicator_inventory");
    expect(source).toContain("select_mws");
    expect(source).toContain("Seasonal precipitation");
    expect(source).toContain("get_mwsid_by_latlon/");
    expect(source).toContain("get_tehsil_data/");
    expect(source).toContain("croppingIntensity_annual");
    expect(source).toContain("plot_api_cropping_intensity");
    expect(source).toContain('getpass("CoRE Stack API key');
    expect(source).not.toContain("CS_API=");
    expect(source).not.toContain("\r");
  });

  it("discovers every LULC level and creates a two-pane project", () => {
    const options = getLulcComparisonOptions(project);
    expect(options["3"].map((option) => option.year)).toEqual([
      "17_18",
      "24_25",
    ]);

    const comparison = buildLulcComparisonProject(project, {
      level: "3",
      beforeYear: "17_18",
      afterYear: "24_25",
    });

    expect(comparison.mapLayout).toEqual({
      rows: 1,
      cols: 2,
      syncView: true,
    });
    expect(comparison.primaryMapLabel).toBe("LULC Level 3 · 2017-2018");
    expect(comparison.secondaryMapViews[0]).toMatchObject({
      label: "LULC Level 3 · 2024-2025",
      layerVisibility: {
        "corestack-lulc_level_3_17_18": false,
        "corestack-lulc_level_3_24_25": true,
      },
    });
    expect(
      comparison.layers.find(
        (layer) => layer.id === "corestack-lulc_level_3_17_18"
      ).visible
    ).toBe(true);
  });

  it("builds a programmable LULC swipe notebook", () => {
    const notebook = buildLulcExploreNotebook(project, {
      level: "3",
      beforeYear: "17_18",
      afterYear: "24_25",
    });
    const source = notebookSource(notebook);

    expect(notebook.metadata.kyl.kind).toBe("lulc-comparison");
    expect(source).toContain("m.split_map(");
    expect(source).toContain("compare_lulc(");
    expect(source).toContain("corestack-lulc_level_3_17_18");
    expect(source).toContain("corestack-lulc_level_3_24_25");
  });

  it("uses tehsil-specific filenames and rejects invalid comparisons", () => {
    expect(exploreNotebookFileNames(project)).toEqual({
      hydrology: "kyl-assam-cachar-lakhipur-hydrology-explore.ipynb",
      lulc: "kyl-assam-cachar-lakhipur-lulc-compare.ipynb",
      layers: "kyl-assam-cachar-lakhipur-layer-workbench.ipynb",
    });
    expect(() =>
      buildLulcComparisonProject(project, {
        level: "3",
        beforeYear: "24_25",
        afterYear: "24_25",
      })
    ).toThrow(/different LULC years/i);
  });
});
