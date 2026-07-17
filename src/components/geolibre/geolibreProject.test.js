import {
  buildGeoLibreProject,
  formatGeoServerName,
  selectedGeoLibreLayerIds,
} from "./geolibreProject";
import {
  DEFAULT_GEOLIBRE_LULC_YEARS,
  getAllGeoLibreLayerIds,
} from "../../config/geolibreLayers";

const location = {
  state: "Assam",
  district: "Cachar",
  tehsil: "Lakhipur",
};

describe("GeoLibre project generation", () => {
  it("normalizes KYL location labels for GeoServer layer names", () => {
    expect(formatGeoServerName("  Banas Kantha (Palanpur) ")).toBe(
      "banas_kantha_palanpur"
    );
  });

  it("creates live styled vector and raster layers without embedding data", () => {
    const project = buildGeoLibreProject({
      ...location,
      selectedLayerIds: ["drainage", "terrain", "lulc_level_3"],
      years: DEFAULT_GEOLIBRE_LULC_YEARS,
      mapView: { center: [93.04, 24.84], zoom: 10 },
    });

    expect(project.version).toBe("0.2.0");
    expect(project.layers).toHaveLength(3);
    expect(project.mapView).toMatchObject({ center: [93.04, 24.84], zoom: 10 });

    const drainage = project.layers.find((layer) => layer.id === "corestack-drainage");
    expect(drainage.type).toBe("geojson");
    expect(drainage.source.url).toContain("typeName=drainage%3Acachar_lakhipur");
    expect(drainage.style.vectorStyleMode).toBe("categorized");
    expect(drainage.style.vectorStyleProperty).toBe("ORDER");
    expect(drainage.metadata.corestack.qmlStyleUrl).toMatch(
      /Drainage-Layer-Style\.qml$/
    );
    expect(drainage.metadata).toMatchObject({
      sourceKind: "maplibre-gl-vector",
      customLayerType: "line",
      nativeLayerIds: [],
      sourceIds: ["corestack-drainage-source"],
    });
    expect(drainage).not.toHaveProperty("geojson");

    const terrain = project.layers.find((layer) => layer.id === "corestack-terrain");
    expect(terrain.type).toBe("wms");
    expect(terrain.source.layers).toBe("terrain:cachar_lakhipur_terrain_raster");
    expect(terrain.source.styles).toBe("terrain:terrain_raster");
    expect(terrain.source.tiles[0]).toContain("BBOX={bbox-epsg-3857}");
    expect(terrain.metadata.corestack.wcsDownloadUrl).toContain(
      "CoverageId=terrain%3Acachar_lakhipur_terrain_raster"
    );

    const lulc = project.layers.find((layer) => layer.id === "corestack-lulc_level_3");
    expect(lulc.source.layers).toBe(
      "LULC_level_3:LULC_24_25_cachar_lakhipur_level_3"
    );
    expect(Object.keys(project.styles)).toEqual(
      expect.arrayContaining(project.layers.map((layer) => layer.id))
    );
  });

  it("exports the complete current catalog for the front-page action", () => {
    const project = buildGeoLibreProject({
      ...location,
      selectedLayerIds: getAllGeoLibreLayerIds(),
      years: DEFAULT_GEOLIBRE_LULC_YEARS,
    });

    expect(project.layers).toHaveLength(getAllGeoLibreLayerIds().length);
    expect(project.layerGroups.map((group) => group.id)).toEqual([
      "land",
      "climate",
      "hydrology",
      "agriculture",
      "restoration",
      "nrega",
      "demographic",
    ]);
    expect(project.metadata.dataContract).toMatch(/no feature data is embedded/i);
    expect(JSON.stringify(project)).not.toContain('"features"');
  });

  it("derives project selection from map toggles and LULC years", () => {
    expect(
      selectedGeoLibreLayerIds({
        toggledLayers: { demographics: true, drainage: false, terrain: true },
        years: { lulc_level_1: "24_25", lulc_level_2: null },
      })
    ).toEqual(["demographics", "terrain", "lulc_level_1"]);
  });

  it("requires a location and at least one selected layer", () => {
    expect(() =>
      buildGeoLibreProject({ selectedLayerIds: ["terrain"] })
    ).toThrow(/state, district, and tehsil/i);
    expect(() =>
      buildGeoLibreProject({ ...location, selectedLayerIds: [] })
    ).toThrow(/at least one layer/i);
  });
});
