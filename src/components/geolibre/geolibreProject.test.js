import {
  GEOLIBRE_APPLICATION_VERSION,
  buildGeoLibreProject,
  formatGeoServerName,
  geoJsonBounds,
  mapViewFromBounds,
  normalizeGeoLibreLulcSelections,
} from "./geolibreProject";
import {
  DEFAULT_GEOLIBRE_LULC_YEARS,
  GEOLIBRE_LAYER_BY_ID,
  getDefaultGeoLibreLayerIds,
} from "../../config/geolibreLayers";

const location = {
  state: "Assam",
  district: "Cachar",
  tehsil: "Lakhipur",
};

const noLulc = {
  lulc_level_1: [],
  lulc_level_2: [],
  lulc_level_3: [],
};

describe("GeoLibre project generation", () => {
  it("normalizes KYL location labels for GeoServer layer names", () => {
    expect(formatGeoServerName("  Banas Kantha (Palanpur) ")).toBe(
      "banas_kantha_palanpur"
    );
  });

  it("calculates the tehsil extent and an initial camera that frames it", () => {
    const bounds = geoJsonBounds({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [92.9, 24.7],
                [93.3, 24.7],
                [93.3, 25.0],
                [92.9, 25.0],
                [92.9, 24.7],
              ],
            ],
          },
        },
      ],
    });
    const mapView = mapViewFromBounds(bounds, { width: 1000, height: 700 });

    expect(bounds).toEqual([92.9, 24.7, 93.3, 25]);
    expect(mapView.bbox).toEqual(bounds);
    expect(mapView.center[0]).toBeCloseTo(93.1);
    expect(mapView.center[1]).toBeCloseTo(24.85);
    expect(mapView.zoom).toBeGreaterThan(8);
  });

  it("creates live styled layers with only Socioeconomic Profile at full opacity", () => {
    const mapView = mapViewFromBounds([92.9, 24.7, 93.3, 25]);
    const project = buildGeoLibreProject({
      ...location,
      selectedLayerIds: ["demographics", "drainage", "terrain"],
      lulcSelections: noLulc,
      mapView,
    });

    expect(project.version).toBe("0.2.0");
    expect(project.metadata.geolibre.applicationVersion).toBe(
      GEOLIBRE_APPLICATION_VERSION
    );
    expect(project.mapView.bbox).toEqual([92.9, 24.7, 93.3, 25]);

    const socioeconomic = project.layers.find(
      (layer) => layer.id === "corestack-demographics"
    );
    const drainage = project.layers.find(
      (layer) => layer.id === "corestack-drainage"
    );
    const terrain = project.layers.find(
      (layer) => layer.id === "corestack-terrain"
    );

    expect(socioeconomic.name).toBe("Socioeconomic Profile");
    expect(socioeconomic.opacity).toBe(1);
    expect(
      project.layers
        .filter((layer) => layer.id !== socioeconomic.id)
        .every((layer) => layer.opacity === 0)
    ).toBe(true);
    expect(drainage.source.url).toContain(
      "typeName=drainage%3Acachar_lakhipur"
    );
    expect(drainage.style.vectorStyleProperty).toBe("ORDER");
    expect(drainage.metadata.corestack.qmlStyleUrl).toMatch(
      /Drainage-Layer-Style\.qml$/
    );
    expect(terrain.source.layers).toBe(
      "terrain:cachar_lakhipur_terrain_raster"
    );
    expect(terrain.source.tiles[0]).toContain("BBOX={bbox-epsg-3857}");
    expect(JSON.stringify(project)).not.toContain('"features"');
  });

  it("expands selected LULC levels and years without flattening the catalog", () => {
    const project = buildGeoLibreProject({
      ...location,
      selectedLayerIds: [],
      lulcSelections: {
        lulc_level_1: ["23_24", "24_25"],
        lulc_level_2: ["19_20"],
        lulc_level_3: [],
      },
    });

    expect(project.layers.map((layer) => layer.id)).toEqual([
      "corestack-lulc_level_1-23_24",
      "corestack-lulc_level_1-24_25",
      "corestack-lulc_level_2-19_20",
    ]);
    expect(project.layers[0].name).toBe("LULC Layer Level 1 · 2023-2024");
    expect(project.layers[1].source.layers).toBe(
      "LULC_level_1:LULC_24_25_cachar_lakhipur_level_1"
    );
    expect(project.layers.every((layer) => layer.opacity === 0)).toBe(true);
    expect(project.layerGroups).toEqual([
      expect.objectContaining({
        id: "lulc",
        name: "Land Use / Land Cover",
      }),
    ]);
  });

  it("preloads URL-backed vector layers plus only the latest Level 3 LULC", () => {
    const defaultLayerIds = getDefaultGeoLibreLayerIds();
    expect(defaultLayerIds.length).toBeGreaterThan(0);
    expect(
      defaultLayerIds.every(
        (layerId) => GEOLIBRE_LAYER_BY_ID[layerId].sourceType === "wfs"
      )
    ).toBe(true);

    const project = buildGeoLibreProject({
      ...location,
      selectedLayerIds: defaultLayerIds,
      lulcSelections: DEFAULT_GEOLIBRE_LULC_YEARS,
    });

    expect(
      project.layers.some(
        (layer) => layer.id === "corestack-lulc_level_3-24_25"
      )
    ).toBe(true);
    expect(
      project.layers.some((layer) => layer.id === "corestack-terrain")
    ).toBe(false);
    expect(
      project.layers.filter((layer) => layer.type === "wms")
    ).toHaveLength(1);
  });

  it("normalizes duplicate, invalid, and legacy single-year LULC values", () => {
    expect(
      normalizeGeoLibreLulcSelections({
        lulc_level_1: ["24_25", "24_25", "not-a-year"],
        lulc_level_2: "23_24",
      })
    ).toEqual({
      lulc_level_1: ["24_25"],
      lulc_level_2: ["23_24"],
      lulc_level_3: [],
    });
  });

  it("requires a location and at least one selected layer or LULC year", () => {
    expect(() =>
      buildGeoLibreProject({
        selectedLayerIds: ["terrain"],
        lulcSelections: noLulc,
      })
    ).toThrow(/state, district, and tehsil/i);
    expect(() =>
      buildGeoLibreProject({
        ...location,
        selectedLayerIds: [],
        lulcSelections: noLulc,
      })
    ).toThrow(/at least one layer/i);
  });
});
