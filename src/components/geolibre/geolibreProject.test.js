import {
  activeGeoLibreLegends,
  buildGeoLibreProject,
  DEFAULT_GEOLIBRE_BASEMAP_STYLE,
  formatGeoServerName,
  geoJsonBounds,
  hydrateGeoLibreVectorLayer,
  mapViewFromBounds,
  parseFortnightRecords,
  rasterBoundsFromWmsCapabilities,
  sanitizeGeoLibreProjectPlugins,
  withAverageDeltaG,
  withAverageNdvi,
  withLulcAreaFractions,
  withNormalizedTerrainCluster,
  withSoilTextureClass,
  withAfforestationClass,
  withDeforestationClass,
  withForestFringeClass,
  withDegradationClass,
  withUrbanizationClass,
  withCropIntensityChangeClass,
  withExcludedAreaClass,
  withMwsClass,
  withMwsFortnightClass,
  vectorFieldPresentation,
} from "./geolibreProject";
import CATALOG from "../../config/geolibreCatalog.json";
const GEOLIBRE_FIELD_METADATA = CATALOG.fieldMetadataBySource;
const PRESENTATION = CATALOG.layers;
import {
  GEOLIBRE_LAYERS,
  GEOLIBRE_NREGA_CATEGORIES,
} from "../../config/geolibreLayers";
import { createExpression } from "@maplibre/maplibre-gl-style-spec";
import { resolvePopupRows, buildLayerPanelUnits } from "@geolibre/core";

const location = {
  state: "Assam",
  district: "Cachar",
  tehsil: "Lakhipur",
};

const polygonFeatureCollection = (request) => ({
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      id: request.typeName,
      properties: { P_LIT: 60, TOT_P: 100 },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [92.9, 24.7],
            [93.2, 24.7],
            [93.2, 25.0],
            [92.9, 25.0],
            [92.9, 24.7],
          ],
        ],
      },
    },
  ],
});

const nregaFeatureCollection = {
  type: "FeatureCollection",
  features: [
    "Agri Impact - HH,  Community",
    "Household Livelihood",
    "Irrigation - Site level impact",
    "Irrigation Site level - Non RWH",
    "Others - HH, Community",
    "Plantation",
    "SWC - Landscape level impact",
    "Un Identified",
    "",
    "A future category",
  ].map((WorkCatego, index) => ({
    type: "Feature",
    id: `nrega-${index}`,
    properties: {
      WorkCatego,
      "Work Type": `Work type ${index}`,
    },
    geometry: {
      type: "Point",
      coordinates: [92.92 + index * 0.02, 24.72 + index * 0.02],
    },
  })),
};

const successfulFetch = jest.fn();

const terrainCapabilities = `<?xml version="1.0" encoding="UTF-8"?>
<WMS_Capabilities><Capability><Layer><Layer>
  <Name>cachar_lakhipur_terrain_raster</Name>
  <EX_GeographicBoundingBox>
    <westBoundLongitude>92.9</westBoundLongitude>
    <eastBoundLongitude>93.2</eastBoundLongitude>
    <southBoundLatitude>24.7</southBoundLatitude>
    <northBoundLatitude>25</northBoundLatitude>
  </EX_GeographicBoundingBox>
</Layer></Layer></Capability></WMS_Capabilities>`;

beforeEach(() => {
  successfulFetch.mockReset();
  successfulFetch.mockImplementation(async (request) =>
    polygonFeatureCollection(request)
  );
  global.fetch = jest.fn(async (url) => {
    if (url.includes("GetCapabilities")) {
      return { ok: true, text: async () => terrainCapabilities };
    }
    throw new Error(`Unexpected startup request: ${url}`);
  });
});

describe("GeoLibre 2.6 project generation", () => {
  it("matches the finalized CSV presentation manifest exactly", async () => {
    const project = await buildGeoLibreProject({ ...location });
    expect([...project.layers].reverse().map(layer => ({
      id: layer.id.replace(/^corestack-/, ""),
      name: layer.name,
      groupId: layer.groupId,
    }))).toEqual(PRESENTATION.map(entry => ({
      id: entry.id,
      name: entry.category === "NA" ? entry.label : `${entry.label} · ${entry.category}`,
      groupId: entry.groupId,
    })));
    expect(project.layerGroups.map(group => group.name)).toEqual(
      [...new Set(PRESENTATION.map(entry => entry.groupName))]
    );
    expect(project.layerGroups.find(group => group.id === "lulc")?.name).toBe("Land Use Land Cover");
    expect(project.layerGroups.find(group => group.id === "land")?.collapsed).toBe(false);
    expect(
      project.layerGroups.filter(group => group.id !== "land").every(group => group.collapsed === true)
    ).toBe(true);
    // Exercise the viewer's real panel ordering, not just our reversed array.
    const units = buildLayerPanelUnits(project.layers, project.layerGroups);
    expect(units.flatMap(unit => unit.layers.map(layer => layer.id))).toEqual(
      PRESENTATION.map(entry => `corestack-${entry.id}`)
    );
    expect(units.map(unit => project.layerGroups.find(group => group.id === unit.groupId).name)).toEqual(
      [...new Set(PRESENTATION.map(entry => entry.groupName))]
    );
    for (const layer of project.layers.filter(layer => layer.type === "geojson")) {
      const entry = PRESENTATION.find(item => layer.id === `corestack-${item.id}`);
      expect(layer.style.vectorStyleProperty || "None").toBe(
        entry.defaultProperty.startsWith("None (") ? "None" : entry.defaultProperty
      );
    }
    expect(project.layers.filter(layer => layer.id.startsWith("corestack-nrega_"))).toHaveLength(GEOLIBRE_NREGA_CATEGORIES.length);
    expect(project.layers.filter(layer => layer.id.startsWith("corestack-nrega_")).every(layer => layer.groupId === "nrega")).toBe(true);
    expect(project.layers.find(layer => layer.id === "corestack-nrega_plantation").name).toBe("Plantation and forestry");
  });

  it("uses published raster styles and native vector profiles for added layers", async () => {
    const project = await buildGeoLibreProject({ ...location });
    const byId = id => project.layers.find(layer => layer.id === `corestack-${id}`);
    for (const [id, style] of [
      ["distance_to_drainage_line", "distance_nearest_upstream_DL"],
      ["catchment_area", "catchment_area_singleflow"],
      ["natural_depression", "natural_depression"],
      ["tree_canopy_density_2023", "tree_ccd_style"],
      ["tree_height_2019", "tree_ch_style"],
      ["forest_change", "tree_overall_style"],
    ]) {
      expect(byId(id).source.styles).toBe(style);
      expect(byId(id).metadata.corestack.legend.items.length).toBeGreaterThan(0);
    }
    expect(byId("shrubland_diversion_base").source.styles).toBe("change_shrubland_diversion_style");
    for (const id of ["drought_causality", "tree_in_grassland", "forest_fringe"]) {
      expect(byId(id).style.fillOpacity).toBeGreaterThan(0);
      expect(byId(id).source.typeName).toContain(":");
    }
    expect(byId("ndvi_tree_stats").style.vectorStyleMode).not.toBe("single");
    expect(byId("catchment_area").metadata.corestack.legend.title).not.toContain("unit unconfirmed");
    expect(byId("catchment_area").metadata.corestack.legend.items.every(item => item.label.endsWith(" hac"))).toBe(true);
    expect(byId("catchment_area").metadata.corestack.defaultStyleUnit).toBe("hac");
    expect(byId("natural_depression").metadata.corestack.legend.title).not.toContain("unit unconfirmed");
    expect(byId("natural_depression").metadata.corestack.legend.items.every(item => item.label.endsWith(" m"))).toBe(true);
    expect(byId("natural_depression").metadata.corestack.defaultStyleUnit).toBe("m");
    expect(byId("soil_health_raster_P").metadata.corestack.legend.items[0].label).toContain("kg/ha");
    expect(byId("facilities").metadata.corestack.defaultStyleUnit).toBe("km");
    expect(byId("livestock").metadata.corestack.defaultStyleUnit).toBe("count");
  });

  it("hydrates complementary drought maps independently and preserves source records", async () => {
    const project = await buildGeoLibreProject({ ...location });
    const raw = { se_mo_2024: '{"moderate_drought_path3":7}', mild_2024: '{"mild_drought_spi_score":3}' };
    const fetchFeatureCollection = jest.fn(async () => ({ type: "FeatureCollection", features: [{ properties: raw, geometry: null }] }));
    const hydrated = await hydrateGeoLibreVectorLayer({ project, layerId: "corestack-drought_causality", fetchFeatureCollection });
    const causality = hydrated.layers.find(layer => layer.id === "corestack-drought_causality");
    expect(fetchFeatureCollection).toHaveBeenCalledTimes(1);
    expect(causality.metadata.loadState).toBe("loaded");
    expect(causality.style.vectorStyleProperty).toBe("drought_dominant_impact");
    expect(causality.style.vectorStyleMode).toBe("categorized");
    expect(causality.geojson.features[0].properties).toMatchObject({ ...raw, drought_dominant_impact: "Crop area + soil moisture stress" });
    expect(causality.metadata.corestack.defaultStyleUnit).toBe("category");
    expect(hydrated.layers.find(layer => layer.id === "corestack-drought").metadata.loadState).toBe("unloaded");
    const severity = await hydrateGeoLibreVectorLayer({ project, layerId: "corestack-drought", fetchFeatureCollection: async () => ({ features: [{ properties: { w_no_2024: 0, w_mld_2024: 10, w_mod_2024: 12, w_sev_2024: 1 } }] }) });
    const drought = severity.layers.find(layer => layer.id === "corestack-drought");
    expect(drought.geojson.features[0].properties.drought_peak_intensity).toBe("Severe");
    expect(drought.style.vectorStyleStops.map(stop => stop.label)).toEqual(["None", "Mild", "Moderate", "Severe"]);
  });

  it("gives every raster an explicit rasterStyle contract", () => {
    expect(
      GEOLIBRE_LAYERS.filter((layer) => layer.sourceType === "wms")
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "terrain",
          rasterStyle: "Terrain_Style_11_Classes",
        }),
        expect.objectContaining({
          id: "lulc_level_3_24_25",
          rasterStyle: "lulc_land_use_KYL",
        }),
      ])
    );
    expect(
      GEOLIBRE_LAYERS.filter((layer) => layer.sourceType === "wms")
        .every((layer) => typeof layer.rasterStyle === "string")
    ).toBe(true);
  });

  it("matches every published Stage of Groundwater Extraction class exactly", async () => {
    const project = await buildGeoLibreProject({ ...location, fetchFeatureCollection: successfulFetch });
    const layer = project.layers.find(item => item.id === "corestack-soge");
    const categories = ["Safe", "Semi-Critical", "Critical", "Over Exploited"];
    expect(layer.style.vectorStyleStops.map(stop => stop.value)).toEqual(categories);
    const expression = createExpression(
      ["match", ["to-string", ["get", "class"]], ...layer.style.vectorStyleStops.flatMap(stop => [stop.value, stop.color]), "#3b3b3b"],
      "layers[0].paint.fill-color"
    );
    expect(expression.result).toBe("success");
    categories.forEach((category) => expect(expression.value.evaluate({ zoom: 10 }, { properties: { uid: "12_332857", class: category, code: 2 }, type: 3 })).not.toBe("#3b3b3b"));
  });
  it("lists the 4 soil-texture groups exactly once each in the native categorized legend", async () => {
    const project = await buildGeoLibreProject({ ...location, fetchFeatureCollection: successfulFetch });
    const layer = project.layers.find(item => item.id === "corestack-soil_type");
    expect(layer.style.vectorStyleProperty).toBe("soil_texture_class");
    expect(layer.style.vectorStyleStops.map(stop => stop.value)).toEqual([
      "Coarse / Sandy", "Medium / Loamy", "Moderately Fine / Clay Loam", "Fine / Clayey",
    ]);
    expect(new Set(layer.style.vectorStyleStops.map(stop => stop.value)).size).toBe(
      layer.style.vectorStyleStops.length
    );
  });
  it("bins all 13 published subsoil texture classes into the 4 CoRE Stack soil-texture groups on hydration", async () => {
    const project = await buildGeoLibreProject({ ...location, fetchFeatureCollection: successfulFetch });
    const rawValues = [
      "sand", "Loamy sand", "sandy loam",
      "Loam", "Silt loam", "Silt",
      "Sandy clay loam", "Clay loam", "Silty clay loam",
      "Sandy clay", "Silty clay", "Clay", "Clay (heavy)",
      "Medium", null,
    ];
    const result = await hydrateGeoLibreVectorLayer({
      project, layerId: "corestack-soil_type",
      fetchFeatureCollection: async () => ({
        type: "FeatureCollection",
        features: rawValues.map((subsoil_texture, index) => ({
          type: "Feature", id: `soil-${index}`,
          properties: { uid: `soil-${index}`, subsoil_texture },
          geometry: { type: "Polygon", coordinates: [] },
        })),
      }),
    });
    const layer = result.layers.find(item => item.id === "corestack-soil_type");
    const classesByRawValue = Object.fromEntries(
      layer.geojson.features.map(feature => [feature.properties.subsoil_texture, feature.properties.soil_texture_class])
    );
    expect(classesByRawValue).toEqual({
      sand: "Coarse / Sandy", "Loamy sand": "Coarse / Sandy", "sandy loam": "Coarse / Sandy",
      Loam: "Medium / Loamy", "Silt loam": "Medium / Loamy", Silt: "Medium / Loamy",
      "Sandy clay loam": "Moderately Fine / Clay Loam", "Clay loam": "Moderately Fine / Clay Loam", "Silty clay loam": "Moderately Fine / Clay Loam",
      "Sandy clay": "Fine / Clayey", "Silty clay": "Fine / Clayey", Clay: "Fine / Clayey", "Clay (heavy)": "Fine / Clayey",
      Medium: null, null: null,
    });
    const expression = createExpression(
      ["match", ["to-string", ["get", "soil_texture_class"]], ...layer.style.vectorStyleStops.flatMap(stop => [stop.value, stop.color]), "#3b3b3b"],
      "layers[0].paint.fill-color"
    );
    expect(expression.result).toBe("success");
    expect(expression.value.evaluate({ zoom: 10 }, { properties: { soil_texture_class: "Fine / Clayey" }, type: 3 })).toBe("#8b4513");
    expect(expression.value.evaluate({ zoom: 10 }, { properties: { soil_texture_class: null }, type: 3 })).toBe("#3b3b3b");
  });
  it("lists the 3 Tree Cover Increase classes with their hectare unit in the native legend", async () => {
    const project = await buildGeoLibreProject({ ...location, fetchFeatureCollection: successfulFetch });
    const layer = project.layers.find(item => item.id === "corestack-afforestation_stats");
    expect(layer.style.vectorStyleProperty).toBe("total_aff_class");
    expect(layer.style.vectorStyleStops).toEqual([
      { value: "Less than 50 hac", color: "#ff0000", label: "Less than 50 hac" },
      { value: "Between 50 to 100 hac", color: "#eee05d", label: "Between 50 to 100 hac" },
      { value: "More than 100 hac", color: "#73bb53", label: "More than 100 hac" },
    ]);
  });
  it("bins total_aff into its hectare class on hydration", async () => {
    const project = await buildGeoLibreProject({ ...location, fetchFeatureCollection: successfulFetch });
    const rawValues = [20, 50, 99.9, 100, 250, null, ""];
    const result = await hydrateGeoLibreVectorLayer({
      project, layerId: "corestack-afforestation_stats",
      fetchFeatureCollection: async () => ({
        type: "FeatureCollection",
        features: rawValues.map((total_aff, index) => ({
          type: "Feature", id: `aff-${index}`,
          properties: { uid: `aff-${index}`, total_aff },
          geometry: { type: "Polygon", coordinates: [] },
        })),
      }),
    });
    const layer = result.layers.find(item => item.id === "corestack-afforestation_stats");
    expect(layer.geojson.features.map(feature => feature.properties.total_aff_class)).toEqual([
      "Less than 50 hac", "Between 50 to 100 hac", "Between 50 to 100 hac",
      "More than 100 hac", "More than 100 hac", null, null,
    ]);
    const expression = createExpression(
      ["match", ["to-string", ["get", "total_aff_class"]], ...layer.style.vectorStyleStops.flatMap(stop => [stop.value, stop.color]), "#3b3b3b"],
      "layers[0].paint.fill-color"
    );
    expect(expression.result).toBe("success");
    expect(expression.value.evaluate({ zoom: 10 }, { properties: { total_aff_class: "More than 100 hac" }, type: 3 })).toBe("#73bb53");
    expect(expression.value.evaluate({ zoom: 10 }, { properties: { total_aff_class: null }, type: 3 })).toBe("#3b3b3b");
  });
  it("lists the 3 Tree Cover Decrease classes with their hectare unit in the native legend", async () => {
    const project = await buildGeoLibreProject({ ...location, fetchFeatureCollection: successfulFetch });
    const layer = project.layers.find(item => item.id === "corestack-deforestation_stats");
    expect(layer.style.vectorStyleProperty).toBe("total_def_class");
    expect(layer.style.vectorStyleStops).toEqual([
      { value: "Less than 50 hac", color: "#73bb53", label: "Less than 50 hac" },
      { value: "Between 50 to 100 hac", color: "#eee05d", label: "Between 50 to 100 hac" },
      { value: "More than 100 hac", color: "#ff0000", label: "More than 100 hac" },
    ]);
  });
  it("bins total_def into its hectare class on hydration", async () => {
    const project = await buildGeoLibreProject({ ...location, fetchFeatureCollection: successfulFetch });
    const rawValues = [20, 50, 99.9, 100, 250, null, ""];
    const result = await hydrateGeoLibreVectorLayer({
      project, layerId: "corestack-deforestation_stats",
      fetchFeatureCollection: async () => ({
        type: "FeatureCollection",
        features: rawValues.map((total_def, index) => ({
          type: "Feature", id: `def-${index}`,
          properties: { uid: `def-${index}`, total_def },
          geometry: { type: "Polygon", coordinates: [] },
        })),
      }),
    });
    const layer = result.layers.find(item => item.id === "corestack-deforestation_stats");
    expect(layer.geojson.features.map(feature => feature.properties.total_def_class)).toEqual([
      "Less than 50 hac", "Between 50 to 100 hac", "Between 50 to 100 hac",
      "More than 100 hac", "More than 100 hac", null, null,
    ]);
    const expression = createExpression(
      ["match", ["to-string", ["get", "total_def_class"]], ...layer.style.vectorStyleStops.flatMap(stop => [stop.value, stop.color]), "#3b3b3b"],
      "layers[0].paint.fill-color"
    );
    expect(expression.result).toBe("success");
    expect(expression.value.evaluate({ zoom: 10 }, { properties: { total_def_class: "More than 100 hac" }, type: 3 })).toBe("#ff0000");
    expect(expression.value.evaluate({ zoom: 10 }, { properties: { total_def_class: null }, type: 3 })).toBe("#3b3b3b");
  });
  it("lists the 4 Forest Fringe area classes with their hectare unit in the native legend", async () => {
    const project = await buildGeoLibreProject({ ...location, fetchFeatureCollection: successfulFetch });
    const layer = project.layers.find(item => item.id === "corestack-forest_fringe");
    expect(layer.style.vectorStyleProperty).toBe("forest_fringe_area_class");
    expect(layer.style.vectorStyleStops).toEqual([
      { value: "Less than 10 hac", color: "#f0fdf4", label: "Less than 10 hac" },
      { value: "Between 10 to 50 hac", color: "#86efac", label: "Between 10 to 50 hac" },
      { value: "Between 50 to 150 hac", color: "#16a34a", label: "Between 50 to 150 hac" },
      { value: "More than 150 hac", color: "#14532d", label: "More than 150 hac" },
    ]);
  });
  it("bins forest_fringe_area_in_ha into its hectare class on hydration", async () => {
    const project = await buildGeoLibreProject({ ...location, fetchFeatureCollection: successfulFetch });
    const rawValues = [5, 10, 49.9, 50, 149.9, 150, null, ""];
    const result = await hydrateGeoLibreVectorLayer({
      project, layerId: "corestack-forest_fringe",
      fetchFeatureCollection: async () => ({
        type: "FeatureCollection",
        features: rawValues.map((forest_fringe_area_in_ha, index) => ({
          type: "Feature", id: `ff-${index}`,
          properties: { uid: `ff-${index}`, forest_fringe_area_in_ha },
          geometry: { type: "Polygon", coordinates: [] },
        })),
      }),
    });
    const layer = result.layers.find(item => item.id === "corestack-forest_fringe");
    expect(layer.geojson.features.map(feature => feature.properties.forest_fringe_area_class)).toEqual([
      "Less than 10 hac", "Between 10 to 50 hac", "Between 10 to 50 hac",
      "Between 50 to 150 hac", "Between 50 to 150 hac", "More than 150 hac", null, null,
    ]);
    const expression = createExpression(
      ["match", ["to-string", ["get", "forest_fringe_area_class"]], ...layer.style.vectorStyleStops.flatMap(stop => [stop.value, stop.color]), "#3b3b3b"],
      "layers[0].paint.fill-color"
    );
    expect(expression.result).toBe("success");
    expect(expression.value.evaluate({ zoom: 10 }, { properties: { forest_fringe_area_class: "More than 150 hac" }, type: 3 })).toBe("#14532d");
    expect(expression.value.evaluate({ zoom: 10 }, { properties: { forest_fringe_area_class: null }, type: 3 })).toBe("#3b3b3b");
  });
  it("lists the 3 Cropping Degradation classes with their hectare unit in the native legend", async () => {
    const project = await buildGeoLibreProject({ ...location, fetchFeatureCollection: successfulFetch });
    const layer = project.layers.find(item => item.id === "corestack-degradation_stats");
    expect(layer.style.vectorStyleProperty).toBe("total_deg_class");
    expect(layer.style.vectorStyleStops).toEqual([
      { value: "Less than 30 hac", color: "#73bb53", label: "Less than 30 hac" },
      { value: "Between 30 to 90 hac", color: "#eee05d", label: "Between 30 to 90 hac" },
      { value: "More than 90 hac", color: "#ff0000", label: "More than 90 hac" },
    ]);
  });
  it("bins total_deg into its hectare class on hydration", async () => {
    const project = await buildGeoLibreProject({ ...location, fetchFeatureCollection: successfulFetch });
    const rawValues = [10, 30, 89.9, 90, 200, null, ""];
    const result = await hydrateGeoLibreVectorLayer({
      project, layerId: "corestack-degradation_stats",
      fetchFeatureCollection: async () => ({
        type: "FeatureCollection",
        features: rawValues.map((total_deg, index) => ({
          type: "Feature", id: `deg-${index}`,
          properties: { uid: `deg-${index}`, total_deg },
          geometry: { type: "Polygon", coordinates: [] },
        })),
      }),
    });
    const layer = result.layers.find(item => item.id === "corestack-degradation_stats");
    expect(layer.geojson.features.map(feature => feature.properties.total_deg_class)).toEqual([
      "Less than 30 hac", "Between 30 to 90 hac", "Between 30 to 90 hac",
      "More than 90 hac", "More than 90 hac", null, null,
    ]);
    const expression = createExpression(
      ["match", ["to-string", ["get", "total_deg_class"]], ...layer.style.vectorStyleStops.flatMap(stop => [stop.value, stop.color]), "#3b3b3b"],
      "layers[0].paint.fill-color"
    );
    expect(expression.result).toBe("success");
    expect(expression.value.evaluate({ zoom: 10 }, { properties: { total_deg_class: "More than 90 hac" }, type: 3 })).toBe("#ff0000");
    expect(expression.value.evaluate({ zoom: 10 }, { properties: { total_deg_class: null }, type: 3 })).toBe("#3b3b3b");
  });
  it("lists the 3 Urbanization classes with their hectare unit in the native legend", async () => {
    const project = await buildGeoLibreProject({ ...location, fetchFeatureCollection: successfulFetch });
    const layer = project.layers.find(item => item.id === "corestack-urbanization_stats");
    expect(layer.style.vectorStyleProperty).toBe("total_urb_class");
    expect(layer.style.vectorStyleStops).toEqual([
      { value: "Less than 30 hac", color: "#73bb53", label: "Less than 30 hac" },
      { value: "Between 30 to 90 hac", color: "#eee05d", label: "Between 30 to 90 hac" },
      { value: "More than 90 hac", color: "#ff0000", label: "More than 90 hac" },
    ]);
  });
  it("bins total_urb into its hectare class on hydration", async () => {
    const project = await buildGeoLibreProject({ ...location, fetchFeatureCollection: successfulFetch });
    const rawValues = [10, 30, 89.9, 90, 200, null, ""];
    const result = await hydrateGeoLibreVectorLayer({
      project, layerId: "corestack-urbanization_stats",
      fetchFeatureCollection: async () => ({
        type: "FeatureCollection",
        features: rawValues.map((total_urb, index) => ({
          type: "Feature", id: `urb-${index}`,
          properties: { uid: `urb-${index}`, total_urb },
          geometry: { type: "Polygon", coordinates: [] },
        })),
      }),
    });
    const layer = result.layers.find(item => item.id === "corestack-urbanization_stats");
    expect(layer.geojson.features.map(feature => feature.properties.total_urb_class)).toEqual([
      "Less than 30 hac", "Between 30 to 90 hac", "Between 30 to 90 hac",
      "More than 90 hac", "More than 90 hac", null, null,
    ]);
    const expression = createExpression(
      ["match", ["to-string", ["get", "total_urb_class"]], ...layer.style.vectorStyleStops.flatMap(stop => [stop.value, stop.color]), "#3b3b3b"],
      "layers[0].paint.fill-color"
    );
    expect(expression.result).toBe("success");
    expect(expression.value.evaluate({ zoom: 10 }, { properties: { total_urb_class: "More than 90 hac" }, type: 3 })).toBe("#ff0000");
    expect(expression.value.evaluate({ zoom: 10 }, { properties: { total_urb_class: null }, type: 3 })).toBe("#3b3b3b");
  });
  it("lists the 3 Crop Intensity change classes with their hectare unit in the native legend", async () => {
    const project = await buildGeoLibreProject({ ...location, fetchFeatureCollection: successfulFetch });
    const layer = project.layers.find(item => item.id === "corestack-cropintensity_stats");
    expect(layer.style.vectorStyleProperty).toBe("total_change_class");
    expect(layer.style.vectorStyleStops).toEqual([
      { value: "Less than 30 hac", color: "#73bb53", label: "Less than 30 hac" },
      { value: "Between 30 to 90 hac", color: "#eee05d", label: "Between 30 to 90 hac" },
      { value: "More than 90 hac", color: "#ff0000", label: "More than 90 hac" },
    ]);
  });
  it("bins total_change into its hectare class on hydration", async () => {
    const project = await buildGeoLibreProject({ ...location, fetchFeatureCollection: successfulFetch });
    const rawValues = [10, 30, 89.9, 90, 200, null, ""];
    const result = await hydrateGeoLibreVectorLayer({
      project, layerId: "corestack-cropintensity_stats",
      fetchFeatureCollection: async () => ({
        type: "FeatureCollection",
        features: rawValues.map((total_change, index) => ({
          type: "Feature", id: `ci-${index}`,
          properties: { uid: `ci-${index}`, total_change },
          geometry: { type: "Polygon", coordinates: [] },
        })),
      }),
    });
    const layer = result.layers.find(item => item.id === "corestack-cropintensity_stats");
    expect(layer.geojson.features.map(feature => feature.properties.total_change_class)).toEqual([
      "Less than 30 hac", "Between 30 to 90 hac", "Between 30 to 90 hac",
      "More than 90 hac", "More than 90 hac", null, null,
    ]);
    const expression = createExpression(
      ["match", ["to-string", ["get", "total_change_class"]], ...layer.style.vectorStyleStops.flatMap(stop => [stop.value, stop.color]), "#3b3b3b"],
      "layers[0].paint.fill-color"
    );
    expect(expression.result).toBe("success");
    expect(expression.value.evaluate({ zoom: 10 }, { properties: { total_change_class: "More than 90 hac" }, type: 3 })).toBe("#ff0000");
    expect(expression.value.evaluate({ zoom: 10 }, { properties: { total_change_class: null }, type: 3 })).toBe("#3b3b3b");
  });
  it("lists the 3 Shrubland Diversion change classes with their hectare unit in the native legend", async () => {
    const project = await buildGeoLibreProject({ ...location, fetchFeatureCollection: successfulFetch });
    const layer = project.layers.find(item => item.id === "corestack-shrubland_diversion_stats");
    expect(layer.style.vectorStyleProperty).toBe("total_change_class");
    expect(layer.style.vectorStyleStops).toEqual([
      { value: "Less than 30 hac", color: "#73bb53", label: "Less than 30 hac" },
      { value: "Between 30 to 90 hac", color: "#eee05d", label: "Between 30 to 90 hac" },
      { value: "More than 90 hac", color: "#ff0000", label: "More than 90 hac" },
    ]);
  });
  it("bins total_change into its hectare class on Shrubland Diversion hydration", async () => {
    const project = await buildGeoLibreProject({ ...location, fetchFeatureCollection: successfulFetch });
    const rawValues = [10, 30, 89.9, 90, 200, null, ""];
    const result = await hydrateGeoLibreVectorLayer({
      project, layerId: "corestack-shrubland_diversion_stats",
      fetchFeatureCollection: async () => ({
        type: "FeatureCollection",
        features: rawValues.map((total_change, index) => ({
          type: "Feature", id: `shrub-${index}`,
          properties: { uid: `shrub-${index}`, total_change },
          geometry: { type: "Polygon", coordinates: [] },
        })),
      }),
    });
    const layer = result.layers.find(item => item.id === "corestack-shrubland_diversion_stats");
    expect(layer.geojson.features.map(feature => feature.properties.total_change_class)).toEqual([
      "Less than 30 hac", "Between 30 to 90 hac", "Between 30 to 90 hac",
      "More than 90 hac", "More than 90 hac", null, null,
    ]);
    const expression = createExpression(
      ["match", ["to-string", ["get", "total_change_class"]], ...layer.style.vectorStyleStops.flatMap(stop => [stop.value, stop.color]), "#3b3b3b"],
      "layers[0].paint.fill-color"
    );
    expect(expression.result).toBe("success");
    expect(expression.value.evaluate({ zoom: 10 }, { properties: { total_change_class: "More than 90 hac" }, type: 3 })).toBe("#ff0000");
    expect(expression.value.evaluate({ zoom: 10 }, { properties: { total_change_class: null }, type: 3 })).toBe("#3b3b3b");
  });
  it("lists the 3 Restoration Atlas excluded-area classes with their hectare unit in the native legend", async () => {
    const project = await buildGeoLibreProject({ ...location, fetchFeatureCollection: successfulFetch });
    const layer = project.layers.find(item => item.id === "corestack-restoration_stats");
    expect(layer.style.vectorStyleProperty).toBe("excluded_area_class");
    expect(layer.style.vectorStyleStops).toEqual([
      { value: "Less than 30 hac", color: "#73bb53", label: "Less than 30 hac" },
      { value: "Between 30 to 90 hac", color: "#eee05d", label: "Between 30 to 90 hac" },
      { value: "More than 90 hac", color: "#ff0000", label: "More than 90 hac" },
    ]);
  });
  it("bins the space-named Excluded A field into its hectare class on hydration", async () => {
    const project = await buildGeoLibreProject({ ...location, fetchFeatureCollection: successfulFetch });
    const rawValues = [10, 30, 89.9, 90, 200, null, ""];
    const result = await hydrateGeoLibreVectorLayer({
      project, layerId: "corestack-restoration_stats",
      fetchFeatureCollection: async () => ({
        type: "FeatureCollection",
        features: rawValues.map((value, index) => ({
          type: "Feature", id: `rst-${index}`,
          properties: { uid: `rst-${index}`, "Excluded A": value },
          geometry: { type: "Polygon", coordinates: [] },
        })),
      }),
    });
    const layer = result.layers.find(item => item.id === "corestack-restoration_stats");
    expect(layer.geojson.features.map(feature => feature.properties.excluded_area_class)).toEqual([
      "Less than 30 hac", "Between 30 to 90 hac", "Between 30 to 90 hac",
      "More than 90 hac", "More than 90 hac", null, null,
    ]);
    const expression = createExpression(
      ["match", ["to-string", ["get", "excluded_area_class"]], ...layer.style.vectorStyleStops.flatMap(stop => [stop.value, stop.color]), "#3b3b3b"],
      "layers[0].paint.fill-color"
    );
    expect(expression.result).toBe("success");
    expect(expression.value.evaluate({ zoom: 10 }, { properties: { excluded_area_class: "More than 90 hac" }, type: 3 })).toBe("#ff0000");
    expect(expression.value.evaluate({ zoom: 10 }, { properties: { excluded_area_class: null }, type: 3 })).toBe("#3b3b3b");
  });
  it("lists the 6 Annual and Fortnightly Water Balance mm classes in their native legends", async () => {
    const project = await buildGeoLibreProject({ ...location, fetchFeatureCollection: successfulFetch });
    const mws = project.layers.find(item => item.id === "corestack-mws_layers");
    expect(mws.style.vectorStyleProperty).toBe("avg_delta_g_class");
    expect(mws.style.vectorStyleStops).toEqual([
      { value: "Less than -50 mm", color: "#b2182b", label: "Less than -50 mm" },
      { value: "-50 to -15 mm", color: "#e37357", label: "-50 to -15 mm" },
      { value: "-15 to 0 mm", color: "#f4cbbb", label: "-15 to 0 mm" },
      { value: "0 to 15 mm", color: "#bdd8e7", label: "0 to 15 mm" },
      { value: "15 to 50 mm", color: "#599cc8", label: "15 to 50 mm" },
      { value: "More than 50 mm", color: "#2166ac", label: "More than 50 mm" },
    ]);
    const fortnight = project.layers.find(item => item.id === "corestack-mws_layers_fortnight");
    expect(fortnight.style.vectorStyleProperty).toBe("avg_delta_g_class");
    expect(fortnight.style.vectorStyleStops).toEqual([
      { value: "Less than -15 mm", color: "#b2182b", label: "Less than -15 mm" },
      { value: "-15 to -5 mm", color: "#e37357", label: "-15 to -5 mm" },
      { value: "-5 to 0 mm", color: "#f4cbbb", label: "-5 to 0 mm" },
      { value: "0 to 5 mm", color: "#bdd8e7", label: "0 to 5 mm" },
      { value: "5 to 15 mm", color: "#599cc8", label: "5 to 15 mm" },
      { value: "More than 15 mm", color: "#2166ac", label: "More than 15 mm" },
    ]);
  });
  it("colors Fortnightly Water Balance on its averaged DeltaG and still parses date records", async () => {
    const project = await buildGeoLibreProject({ ...location, fetchFeatureCollection: successfulFetch });
    const result = await hydrateGeoLibreVectorLayer({ project, layerId: "corestack-mws_layers_fortnight", fetchFeatureCollection: async () => ({
      type: "FeatureCollection", features: [{ type: "Feature", geometry: { type: "Polygon", coordinates: [] }, properties: { "2025-06-16": '{"DeltaG": -120}' } }],
    }) });
    const layer = result.layers.find(item => item.id === "corestack-mws_layers_fortnight");
    expect(layer.name).toBe("Fortnightly Water Balance");
    expect(layer.style.strokeColor).toBe("#05081c");
    expect(layer.style.diagramType).toBeUndefined();
    expect(layer.style.diagramFields).toBeUndefined();
    expect(layer.style).toMatchObject({ vectorStyleMode: "categorized", vectorStyleProperty: "avg_delta_g_class", fillOpacity: 0.65 });
    expect(layer.geojson.features[0].properties).toEqual({
      "2025-06-16": { DeltaG: -120 }, avg_delta_g: -120, avg_delta_g_class: "Less than -15 mm", stroke: "#05081c",
    });
    const expression = createExpression(
      ["match", ["to-string", ["get", "avg_delta_g_class"]], ...layer.style.vectorStyleStops.flatMap(stop => [stop.value, stop.color]), "#3b3b3b"],
      "layers[0].paint.fill-color"
    );
    expect(expression.result).toBe("success");
    expect(expression.value.evaluate({ zoom: 10 }, { properties: { avg_delta_g_class: "Less than -15 mm" }, type: 3 })).toBe("#b2182b");
    expect(expression.value.evaluate({ zoom: 10 }, { properties: {}, type: 3 })).toBe("#3b3b3b");
  });
  it("evaluates finalized thresholds and missing-data guards in the real MapLibre expression engine", async () => {
    const project = await buildGeoLibreProject({ ...location, fetchFeatureCollection: successfulFetch });
    const color = (id, properties) => {
      const expression = createExpression(JSON.parse(project.styles[`corestack-${id}`].vectorStyleExpression), "layers[0].paint.fill-color");
      expect(expression.result).toBe("success");
      return expression.value.evaluate({ zoom: 10 }, { properties, type: 3 });
    };
    expect(color("demographics", { P_LIT: 90, TOT_P: 100 })).toBe("#2166ac");
    expect(color("demographics", { P_LIT: 0, TOT_P: 100 })).toBe("#b2182b");
    expect(color("demographics", { P_LIT: 0, TOT_P: 0 })).toBe("#3b3b3b");
    expect(color("remote_sensed_waterbodies", { area_ored: 5 })).toBe("#1e3a8a");
    const crop = Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`cropping_intensity_${2017 + i}`, 2]));
    expect(color("cropping_intensity", crop)).toBe("#52ac5a");
    expect(color("cropping_intensity", { ...crop, cropping_intensity_2024: null })).toBe("#3b3b3b");

  });
  it("classifies hydrated facilities using computed observations and serializes the same style", async () => {
    const project = await buildGeoLibreProject({ ...location, fetchFeatureCollection: successfulFetch });
    const layer = project.layers.find(item => item.id === "corestack-facilities");
    layer.style = { ...layer.style, nativeDefaultAddedDuringRoundTrip: true };
    const hydrated = await hydrateGeoLibreVectorLayer({ project, layerId: layer.id, fetchFeatureCollection: async () => ({
      type: "FeatureCollection", features: [0, 1, 2, 3, 5, 8, null, "", 999].map((value, index) => ({
        type: "Feature", geometry: null, properties: { l2_essential_education_distance_km: value, data_availability_status: index === 8 ? "pending" : "computed" },
      })),
    }) });
    const result = hydrated.layers.find(item => item.id === layer.id);
    expect(result.style.vectorStyleStops.map(stop => stop.value)).toEqual([0, 1, 2, 3, 5, 8]);
    expect(hydrated.styles[layer.id]).toEqual(result.style);
    expect(result.geojson.features.slice(6).map(feature => feature.properties.fill)).toEqual(["#3b3b3b", "#3b3b3b", "#3b3b3b"]);
    expect(result.geojson.features[0].properties.fill).toBeUndefined();
  });
  it("classifies Tree in Grassland by its stats area and labels breaks in hectares", async () => {
    const project = await buildGeoLibreProject({ ...location, fetchFeatureCollection: successfulFetch });
    const layer = project.layers.find(item => item.id === "corestack-tree_in_grassland");
    expect(layer.style.vectorStyleProperty).toBe("tree_in_shrubs_trees_area_in_ha");
    expect(layer.style.vectorStyleColorRamp).toBe("greens");
    const hydrated = await hydrateGeoLibreVectorLayer({ project, layerId: layer.id, fetchFeatureCollection: async () => ({
      type: "FeatureCollection", features: [0.5, 2, 5, 10, 25, 60, null, ""].map((value, index) => ({
        type: "Feature", geometry: null, properties: { uid: `tree-${index}`, tree_in_shrubs_trees_area_in_ha: value },
      })),
    }) });
    const result = hydrated.layers.find(item => item.id === layer.id);
    expect(result.style.vectorStyleStops.length).toBeGreaterThan(0);
    expect(result.style.vectorStyleStops.every(stop => stop.label.endsWith(" ha"))).toBe(true);
    expect(result.geojson.features.slice(6).map(feature => feature.properties.fill)).toEqual(["#3b3b3b", "#3b3b3b"]);
    expect(result.geojson.features[0].properties.fill).toBeUndefined();
  });
  it("classifies source facilities status when GeoServer has not published the common status alias", async () => {
    const project = await buildGeoLibreProject({ ...location, fetchFeatureCollection: successfulFetch });
    const layer = project.layers.find(item => item.id === "corestack-facilities");
    const hydrated = await hydrateGeoLibreVectorLayer({ project, layerId: layer.id, fetchFeatureCollection: async () => ({
      type: "FeatureCollection", features: [1, 2, null].map((value, index) => ({
        type: "Feature", geometry: null, properties: { l2_essential_education_distance_km: value, facilities_status: index === 2 ? "no village id available" : "computed" },
      })),
    }) });
    const result = hydrated.layers.find(item => item.id === layer.id);
    expect(result.geojson.features.map(feature => feature.properties.fill)).toEqual([undefined, undefined, "#3b3b3b"]);
  });
  it("normalizes KYL location labels for GeoServer layer names", () => {
    expect(formatGeoServerName("  Banas Kantha (Palanpur) ")).toBe(
      "banas_kantha_palanpur"
    );
  });

  it("derives a complete bounding box and a padded map view", () => {
    const bounds = geoJsonBounds(polygonFeatureCollection({ typeName: "test" }));
    expect(bounds).toEqual([92.9, 24.7, 93.2, 25]);
    expect(mapViewFromBounds(bounds, { width: 1000, height: 700 })).toEqual(
      expect.objectContaining({
        center: [93.05000000000001, 24.85],
        bbox: bounds,
        bearing: 0,
        pitch: 0,
      })
    );
  });

  it("derives the Terrain extent from its GeoServer WMS capabilities", async () => {
    expect(
      rasterBoundsFromWmsCapabilities(
        terrainCapabilities,
        "cachar_lakhipur_terrain_raster"
      )
    ).toEqual([92.9, 24.7, 93.2, 25]);

    await buildGeoLibreProject({ ...location });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("terrain/wms?service=WMS&version=1.3.0&request=GetCapabilities"),
      expect.objectContaining({ headers: { Accept: "application/xml, text/xml" } })
    );
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("keeps each published base and statistics pair adjacent in display order", async () => {
    const project = await buildGeoLibreProject({ ...location });
    const displayIds = project.layers.map((layer) => layer.id).reverse();
    for (const [base, stats] of [
      ["terrain", "terrain_vector"],
      ["soil_health_raster_OC_OLM", "soil_health_vector"],
      ["afforestation", "afforestation_stats"],
      ["deforestation", "deforestation_stats"],
      ["degradation", "degradation_stats"],
      ["urbanization", "urbanization_stats"],
      ["cropintensity", "cropintensity_stats"],
      ["restoration", "restoration_stats"],
    ]) {
      expect(displayIds.indexOf(`corestack-${stats}`)).toBe(displayIds.indexOf(`corestack-${base}`) + 1);
      expect(project.layers.find((layer) => layer.id === `corestack-${base}`).name).toContain("Base Layer");
      expect(project.layers.find((layer) => layer.id === `corestack-${stats}`).name).toContain("Stats");
    }
    expect(displayIds.indexOf("corestack-lulc_stats")).toBe(
      displayIds.indexOf("corestack-lulc_level_3_17_18") + 1
    );
  });

  it("preserves field names and shows source-backed units for every hydrated column", () => {
    const restoration = GEOLIBRE_LAYERS.find((layer) => layer.id === "restoration_stats");
    const properties = { uid: "12_301304", area_in_ha: 716.1, "Wide-scale": 186.9, new_measure: 4 };
    const { fields, popup } = vectorFieldPresentation(restoration, {
      features: [{ properties }],
    });
    expect(Object.keys(fields)).toEqual(Object.keys(properties));
    expect(fields["Wide-scale"].unit).toBe("ha");
    expect(fields.new_measure.unit).toBe("unknown");
    expect(resolvePopupRows(properties, { popup }).map((row) => row.label)).toEqual([
      "uid", "area_in_ha (ha)", "Wide-scale (ha)", "new_measure (unit unknown)",
    ]);
    expect(GEOLIBRE_FIELD_METADATA.change_vector_ShrubChange.total_change.unit).toBe("ha");
    expect(GEOLIBRE_FIELD_METADATA.soil_type.subsoil_organic_carbon.unit).toBe("unknown");
    expect(GEOLIBRE_LAYERS.filter((layer) => layer.sourceType === "wfs")
      .every((layer) => layer.unitSources.length > 0)).toBe(true);
  });

  it("extends units to newly published years without guessing ambiguous measures", () => {
    const byId = (id, properties) => vectorFieldPresentation(
      GEOLIBRE_LAYERS.find((layer) => layer.id === id),
      { features: [{ properties }] }
    ).fields;
    expect(byId("facilities", { l3_school_primary_distance_km: 2.5, l3_school_primary_inside_scope: true })
      .l3_school_primary_distance_km.unit).toBe("km");
    expect(byId("cropping_intensity", { cropping_intensity_2024: 1.88, doubly_cropped_area_2024: 432 })
      .cropping_intensity_2024.unit).toBe("dimensionless");
    expect(byId("drought", { "rd24-6-12": -12.5, frth0_2024: 4 })
      .frth0_2024.unit).toBe("weeks");
    expect(byId("mws_layers_fortnight", { "2024-01-13": '{"delta_g":12}' })
      ["2024-01-13"].unit).toBe("mixed");
    expect(byId("aquifer", { total_weighted_yield: 3 })
      .total_weighted_yield.unit).toBe("unknown");
    expect(byId("ndvi_crop_stats", { "2024-07-13": 0.74 })
      ["2024-07-13"].unit).toBe("dimensionless");
    expect(byId("remote_sensed_waterbodies", { water_body_name: "A pond" })
      .water_body_name.unit).toBe("NA");
  });

  it("starts terrain and uses catalog raster styles in WMS requests", async () => {
    const project = await buildGeoLibreProject({
      ...location,
      fetchFeatureCollection: successfulFetch,
    });

    expect(project.version).toBe("0.2.0");
    expect(project.layers).toHaveLength(GEOLIBRE_LAYERS.length);
    expect(project.layers).toHaveLength(86);
    expect(project.layers.every(layer => {
      const catalog = GEOLIBRE_LAYERS.find(item => `corestack-${item.id}` === layer.id);
      return layer.name === `${catalog.label}${catalog.category === "NA" ? "" : ` · ${catalog.category}`}`;
    })).toBe(true);
    expect(project.mapView.bbox).toEqual([92.9, 24.7, 93.2, 25]);
    expect(project.mapLayout).toBeUndefined();
    expect(project.secondaryMapViews).toBeUndefined();
    expect(project.basemapStyleUrl).toBe(DEFAULT_GEOLIBRE_BASEMAP_STYLE);
    expect(decodeURIComponent(project.basemapStyleUrl)).toContain(
      "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
    );
    expect(project.metadata.license).toMatchObject({
      name: "CC BY 4.0",
      notice: "CoRE Stack datasets are available under CC BY 4.0",
    });

    const socioeconomic = project.layers.find(
      (layer) => layer.id === "corestack-demographics"
    );
    expect(socioeconomic).toMatchObject({
      type: "geojson",
      visible: false,
      opacity: 1,
      source: {
        type: "geojson",
        service: "wfs",
        version: "1.0.0",
        typeName: "panchayat_boundaries:cachar_lakhipur",
      },
      metadata: {
        sourceKind: "wfs-getfeature",
        service: "wfs",
        featureCount: 0,
        loadState: "unloaded",
        corestack: {
          geoserverStyle: {
            provider: "GeoServer",
            assignment: "layer-default",
            renderingMode: "geolibre-parity-profile",
          },
        },
      },
    });
    expect(socioeconomic.geojson).toEqual({ type: "FeatureCollection", features: [] });

    const visibleLayers = project.layers.filter((layer) => layer.visible);
    expect(visibleLayers.map((layer) => layer.id)).toEqual([
      "corestack-terrain",
    ]);
    expect(
      visibleLayers.every((layer) => layer.opacity === 1)
    ).toBe(true);
    expect(
      project.layers
        .filter((layer) => !layer.visible)
        .every((layer) => layer.opacity === 1)
    ).toBe(true);

    const mws = project.layers.find(
      (layer) => layer.id === "corestack-mws_layers"
    );
    expect(mws).toMatchObject({
      visible: false,
      metadata: { loadState: "unloaded", featureCount: 0 },
      geojson: { type: "FeatureCollection", features: [] },
    });

    const drainage = project.layers.find(
      (layer) => layer.id === "corestack-drainage"
    );
    expect(drainage).toMatchObject({
      visible: false,
      metadata: { loadState: "unloaded", featureCount: 0 },
      geojson: { type: "FeatureCollection", features: [] },
    });

    const latestLulc = project.layers.find((layer) =>
      layer.id === "corestack-lulc_level_3_24_25"
    );
    expect(latestLulc).toMatchObject({
      type: "raster",
      visible: false,
      metadata: {
        service: "wms",
        corestack: {
          geoserverStyle: {
            name: "lulc_land_use_KYL",
            assignment: "named-style",
            renderingMode: "server-rendered-wms",
          },
        },
      },
    });
    expect(latestLulc.source.layers).toBe(
      "LULC_level_3:LULC_24_25_cachar_lakhipur_level_3"
    );
    expect(latestLulc.source.tiles[0]).toContain(
      "BBOX={bbox-epsg-3857}"
    );
    expect(latestLulc.source.tiles[0]).toContain(
      "STYLES=lulc_land_use_KYL"
    );
    expect(latestLulc.source.wmsUrl).toContain("/geoserver/wms");
    expect(latestLulc.metadata.corestack.geoserverStyle.sldUrl).toContain(
      "REQUEST=GetStyles"
    );
    expect(
      latestLulc.metadata.corestack.geoserverStyle.legendJsonUrl
    ).toContain("FORMAT=application%2Fjson");
    expect(latestLulc.source.url).toContain("request=GetCoverage");
    expect(latestLulc.source.url).toContain("tiling=false");
    expect(latestLulc.source.url).toContain(
      "CoverageId=LULC_level_3%3ALULC_24_25_cachar_lakhipur_level_3"
    );
    expect(project.layers.filter((item) => item.id.startsWith("corestack-lulc_level_3_"))).toHaveLength(8);
    expect(latestLulc.source.styles).toBe("lulc_land_use_KYL");

    const terrain = project.layers.find((layer) => layer.id === "corestack-terrain");
    expect(terrain.source.styles).toBe("Terrain_Style_11_Classes");
    expect(terrain.source.tiles[0]).toContain("STYLES=Terrain_Style_11_Classes");

    const dem = project.layers.find((layer) => layer.id === "corestack-dem");
    expect(dem).toMatchObject({
      type: "raster",
      visible: false,
      source: {
        layers: "dem:cachar_lakhipur_dem_raster",
        styles: "dem_grayscale",
      },
      metadata: {
        corestack: {
          geoserverWorkspace: "dem",
        },
      },
    });
    expect(dem.source.url).toContain(
      "CoverageId=dem%3Acachar_lakhipur_dem_raster"
    );

    const soilNitrogen = project.layers.find((layer) => layer.id === "corestack-soil_health_raster_n");
    expect(soilNitrogen).toMatchObject({
      type: "raster",
      name: "Soil Nitrogen Levels · Base Layer",
      visible: false,
      source: {
        layers: "soil_health_raster:cachar_lakhipur_soil_health_raster_N",
        styles: "Soil_Health_Nitrogen",
      },
      metadata: {
        corestack: {
          geoserverWorkspace: "soil_health_raster",
        },
      },
    });
    expect(soilNitrogen.source.tiles[0]).toContain("STYLES=Soil_Health_Nitrogen");
    expect(soilNitrogen.source.url).toContain(
      "CoverageId=soil_health_raster%3Acachar_lakhipur_soil_health_raster_N"
    );

    const soilPhosphorus = project.layers.find((layer) => layer.id === "corestack-soil_health_raster_P");
    expect(soilPhosphorus).toMatchObject({
      type: "raster",
      name: "Soil Phosphorus Levels · Base Layer",
      visible: false,
      source: {
        layers: "soil_health_raster:cachar_lakhipur_soil_health_raster_P",
        styles: "Soil_Health_Phosphorus",
      },
      metadata: {
        corestack: {
          geoserverWorkspace: "soil_health_raster",
        },
      },
    });
    expect(soilPhosphorus.source.tiles[0]).toContain("STYLES=Soil_Health_Phosphorus");
    expect(soilPhosphorus.source.url).toContain(
      "CoverageId=soil_health_raster%3Acachar_lakhipur_soil_health_raster_P"
    );

    const soilPotassium = project.layers.find((layer) => layer.id === "corestack-soil_health_raster_K");
    expect(soilPotassium).toMatchObject({
      type: "raster",
      name: "Soil Potassium Levels · Base Layer",
      visible: false,
      source: {
        layers: "soil_health_raster:cachar_lakhipur_soil_health_raster_K",
        styles: "Soil_Health_Potassium",
      },
      metadata: {
        corestack: {
          geoserverWorkspace: "soil_health_raster",
        },
      },
    });
    expect(soilPotassium.source.tiles[0]).toContain("STYLES=Soil_Health_Potassium");
    expect(soilPotassium.source.url).toContain(
      "CoverageId=soil_health_raster%3Acachar_lakhipur_soil_health_raster_K"
    );

    const soilOrganicCarbon = project.layers.find((layer) => layer.id === "corestack-soil_health_raster_OC");
    expect(soilOrganicCarbon).toMatchObject({
      type: "raster",
      name: "SoC over Cropping Areas · Base Layer",
      visible: false,
      source: {
        layers: "soil_health_raster:cachar_lakhipur_soil_health_raster_OC",
        styles: "Soil_Health_Organic_carbon",
      },
      metadata: {
        corestack: {
          geoserverWorkspace: "soil_health_raster",
        },
      },
    });
    expect(soilOrganicCarbon.source.tiles[0]).toContain("STYLES=Soil_Health_Organic_carbon");
    expect(soilOrganicCarbon.source.url).toContain(
      "CoverageId=soil_health_raster%3Acachar_lakhipur_soil_health_raster_OC"
    );

    const soilOrganicCarbonOlm = project.layers.find((layer) => layer.id === "corestack-soil_health_raster_OC_OLM");
    expect(soilOrganicCarbonOlm).toMatchObject({
      type: "raster",
      name: "SoC over Forest And Shrub Areas · Base Layer",
      visible: false,
      source: {
        layers: "soil_health_raster:cachar_lakhipur_soil_health_raster_OC_OLM",
        styles: "Soil_Health_OC_OLM",
      },
      metadata: {
        corestack: {
          geoserverWorkspace: "soil_health_raster",
        },
      },
    });
    expect(soilOrganicCarbonOlm.source.tiles[0]).toContain("STYLES=Soil_Health_OC_OLM");
    expect(soilOrganicCarbonOlm.source.url).toContain(
      "CoverageId=soil_health_raster%3Acachar_lakhipur_soil_health_raster_OC_OLM"
    );

    expect(
      project.layers.every(
        (layer) =>
          !JSON.stringify(layer.metadata?.corestack || {}).includes(
            "githubusercontent.com"
          )
      )
    ).toBe(true);
    expect(successfulFetch).not.toHaveBeenCalled();
  });

  it("uses the deployed domain taxonomy while preserving the preferred order", async () => {
    const project = await buildGeoLibreProject({
      ...location,
      fetchFeatureCollection: successfulFetch,
    });
    const displayIds = [...project.layers]
      .reverse()
      .map((layer) => layer.id);

    expect(displayIds.slice(0, 8)).toEqual([
      "corestack-administrative_boundaries",
      "corestack-demographics",
      "corestack-facilities",
      "corestack-antyodaya",
      "corestack-livestock",
      "corestack-hydrological_boundaries",
      "corestack-mws_layers",
      "corestack-mws_layers_fortnight",
    ]);
    expect(
      Object.fromEntries(
        project.layers.map((layer) => [layer.id, layer.name])
      )
    ).toMatchObject({
      "corestack-facilities": "Facilities Proximity",
      "corestack-antyodaya": "Mission Antyodaya (2020)",
      "corestack-hydrological_boundaries":
        "MicroWatershed Boundaries",
      "corestack-mws_layers": "Annual Water Balance",
      "corestack-mws_layers_fortnight": "Fortnightly Water Balance",
      "corestack-terrain_vector": "Terrain · Stats",
      "corestack-drainage": "Drainage Lines",
      "corestack-remote_sensed_waterbodies": "Surface Water Bodies",
    });
    expect(
      project.layers
        .filter((layer) =>
          [
            "corestack-mws_layers",
                  "corestack-mws_layers_fortnight",
          ].includes(layer.id)
        )
        .every((layer) => layer.groupId === "hydrology")
    ).toBe(true);
    expect(displayIds.indexOf("corestack-lulc_level_3_24_25")).toBeLessThan(
      displayIds.indexOf("corestack-lulc_level_3_23_24")
    );
    expect(displayIds.indexOf("corestack-lulc_level_3_24_25")).toBeLessThan(
      displayIds.indexOf("corestack-terrain")
    );
    expect(project.layerGroups.map((group) => group.id)).toEqual([
      "demographic",
      "village-data",
      "hydrology",
      "lulc",
      "land",
      "trees",
      "agriculture",
      "restoration",
      "industry",
      "nrega",
    ]);
  });

  it("uses the deployed KYL names for hydrology, restoration, and industry sources", async () => {
    const project = await buildGeoLibreProject({
      ...location,
      fetchFeatureCollection: successfulFetch,
    });
    const typeNames = Object.fromEntries(
      project.layers
        .filter((layer) => layer.type === "geojson")
        .map((layer) => [layer.id, layer.source.typeName])
    );

    expect(typeNames).toMatchObject({
      "corestack-facilities":
        "facilities_proximity:facilities_cachar_lakhipur",
      "corestack-antyodaya":
        "antyodaya_2020:antyodaya20_cachar_lakhipur",
      "corestack-livestock": "livestocks:livestocks_cachar_lakhipur",
      "corestack-river": "river:cachar_lakhipur_river_vector",
      "corestack-canal": "canal:cachar_lakhipur_canal_vector",
      "corestack-green_credit": "green_credit:cachar_lakhipur_green_credit",
      "corestack-land_conflicts": "lcw:cachar_lakhipur_lcw_conflict",
      "corestack-industry": "factory_csr:cachar_lakhipur_factory_csr",
      "corestack-mining": "mining:cachar_lakhipur_mining",
    });

    expect(project.styles["corestack-facilities"].vectorStyleProperty).toContain(
      "l2_essential_education_distance_km"
    );
    expect(project.styles["corestack-antyodaya"]).toMatchObject({
      vectorStyleMode: "categorized",
      vectorStyleProperty: "maternal_child_health_cat_cluster",
    });
    expect(project.styles["corestack-livestock"].vectorStyleProperty).toContain(
      "large_animals_total"
    );
  });

  it("prepares default legend data for the KYL overlay", async () => {
    const project = await buildGeoLibreProject({
      ...location,
      fetchFeatureCollection: successfulFetch,
    });
    const legends = activeGeoLibreLegends(project);
    expect(project.legend.panelVisible).toBe(true);
    expect(project.legend.collapsed).toBe(false);
    expect(legends.map(item => item.title)).toEqual(["Terrain legend"]);
    expect(project.layers.filter(layer => layer.type === "geojson").every(layer => !layer.metadata.corestack.legend)).toBe(true);
  });

  it("does not override a user-selected split-map layout", async () => {
    const project = await buildGeoLibreProject({
      ...location,
      fetchFeatureCollection: successfulFetch,
    });
    const retainedComparison = {
      ...project,
      mapLayout: { rows: 1, cols: 2 },
      secondaryMapViews: [{ id: "secondary-0", view: project.mapView }],
      plugins: {
        ...project.plugins,
        activePluginIds: [
          ...project.plugins.activePluginIds,
          "corestack-embed",
          "maplibre-gl-components",
          "maplibre-gl-swipe",
        ],
        mapControlPositions: {
          ...project.plugins.mapControlPositions,
          "maplibre-gl-components": "top-right",
          "maplibre-gl-swipe": "top-right",
        },
        settings: {
          ...project.plugins.settings,
          "maplibre-gl-components": { controls: ["swipe"] },
          "maplibre-gl-swipe": {
            active: true,
            collapsed: false,
            leftLayers: ["corestack-administrative-boundaries"],
            rightLayers: ["corestack-demographics"],
          },
        },
      },
    };

    const reset = sanitizeGeoLibreProjectPlugins(retainedComparison);

    expect(reset.mapLayout).toEqual({ rows: 1, cols: 2 });
    expect(reset.secondaryMapViews).toEqual(
      retainedComparison.secondaryMapViews
    );
    expect(reset.plugins.activePluginIds).not.toContain(
      "maplibre-gl-components"
    );
    expect(reset.plugins.activePluginIds).not.toContain("maplibre-gl-swipe");
    expect(reset.plugins.activePluginIds).not.toContain("corestack-embed");
    expect(
      reset.plugins.mapControlPositions["maplibre-gl-components"]
    ).toBeUndefined();
    expect(
      reset.plugins.mapControlPositions["maplibre-gl-swipe"]
    ).toBeUndefined();
    expect(reset.plugins.settings["maplibre-gl-components"]).toBeUndefined();
    expect(reset.plugins.settings["maplibre-gl-swipe"]).toBeUndefined();
  });

  it("adds and removes legend entries when layer visibility changes", async () => {
    const project = await buildGeoLibreProject({
      ...location,
      fetchFeatureCollection: successfulFetch,
    });
    const withVisibleLayers = {
      ...project,
      layers: project.layers.map((layer) =>
        ["corestack-drainage", "corestack-terrain"].includes(layer.id)
          ? { ...layer, visible: true }
          : layer
      ),
    };
    const synced = sanitizeGeoLibreProjectPlugins(withVisibleLayers);
    const legends = activeGeoLibreLegends(synced);

    expect(legends.map((entry) => entry.title)).toEqual(["Terrain legend"]);

    const drainageHidden = {
      ...synced,
      layers: synced.layers.map((layer) =>
        layer.id === "corestack-drainage"
          ? { ...layer, visible: false }
          : layer
      ),
    };
    const resynced = sanitizeGeoLibreProjectPlugins(drainageHidden);
    expect(activeGeoLibreLegends(resynced).map((entry) => entry.title)).toEqual(["Terrain legend"]);
  });

  it("returns the 12-class LULC legend for a visible LULC year", async () => {
    const project = await buildGeoLibreProject({
      ...location,
      fetchFeatureCollection: successfulFetch,
    });
    const withLulcStyles = {
      ...project,
      layers: project.layers.map((layer) =>
        layer.id === "corestack-lulc_level_3_17_18"
          ? { ...layer, visible: true }
          : layer
      ),
    };

    const legends = activeGeoLibreLegends(withLulcStyles);
    const lulcLegend = legends.find((legend) => legend.title === "LULC: 2017-2018 legend");
    expect(lulcLegend.items).toHaveLength(12);
    expect(lulcLegend.items.map((item) => item.label)).toContain("Kharif, Rabi and Zaid Water");
  });

  it("matches the published Change Detection: Crop Intensity legend exactly", async () => {
    const project = await buildGeoLibreProject({
      ...location,
      fetchFeatureCollection: successfulFetch,
    });
    const withCropIntensityVisible = {
      ...project,
      layers: project.layers.map((layer) =>
        layer.id === "corestack-cropintensity"
          ? { ...layer, visible: true }
          : layer
      ),
    };
    const legends = activeGeoLibreLegends(withCropIntensityVisible);
    const cropIntensityLegend = legends.find((legend) => legend.title === "Change: Crop Intensity legend");
    expect(cropIntensityLegend.items).toEqual([
      { label: "Double-Single", color: "#f7fcf5", shape: "square" },
      { label: "Tripple_or_annual_or_perennial-Single", color: "#ff4500", shape: "square" },
      { label: "Tripple_or_annual_or_perennial-Double", color: "#ff0000", shape: "square" },
      { label: "Single-Double", color: "#00ff00", shape: "square" },
      { label: "Single-Tripple_or_annual_or_perennial", color: "#32cd32", shape: "square" },
      { label: "Double-Tripple_or_annual_or_perennial", color: "#228b22", shape: "square" },
      { label: "Single-Single", color: "#4227f5", shape: "square" },
      { label: "Double-Double", color: "#712103", shape: "square" },
      { label: "Tripple_or_annual_or_perennial-Tripple_or_annual_or_perennial", color: "#ad27f5", shape: "square" },
    ]);
  });

  it("matches the published Soil Nitrogen Levels legend exactly", async () => {
    const project = await buildGeoLibreProject({
      ...location,
      fetchFeatureCollection: successfulFetch,
    });
    const withSoilNitrogenVisible = {
      ...project,
      layers: project.layers.map((layer) =>
        layer.id === "corestack-soil_health_raster_n"
          ? { ...layer, visible: true }
          : layer
      ),
    };
    const legends = activeGeoLibreLegends(withSoilNitrogenVisible);
    const soilNitrogenLegend = legends.find((legend) => legend.title === "Soil Nitrogen Levels legend");
    expect(soilNitrogenLegend.items).toEqual([
      { label: "High (>560 kg/ha)", color: "#73BB53", shape: "square" },
      { label: "Medium (280-560 kg/ha)", color: "#EEE05D", shape: "square" },
      { label: "Low (<280 kg/ha)", color: "#FF0000", shape: "square" },
    ]);
  });

  it("matches the published Soil Phosphorus Levels legend exactly", async () => {
    const project = await buildGeoLibreProject({
      ...location,
      fetchFeatureCollection: successfulFetch,
    });
    const withSoilPhosphorusVisible = {
      ...project,
      layers: project.layers.map((layer) =>
        layer.id === "corestack-soil_health_raster_P"
          ? { ...layer, visible: true }
          : layer
      ),
    };
    const legends = activeGeoLibreLegends(withSoilPhosphorusVisible);
    const soilPhosphorusLegend = legends.find((legend) => legend.title === "Soil Phosphorus Levels legend");
    expect(soilPhosphorusLegend.items).toEqual([
      { label: "Low (<10 kg/ha)", color: "#D73027", shape: "square" },
      { label: "Medium (10-25 kg/ha)", color: "#FEE08B", shape: "square" },
      { label: "High (>25 kg/ha)", color: "#1A9850", shape: "square" },
    ]);
  });

  it("matches the published Soil Potassium Levels legend exactly", async () => {
    const project = await buildGeoLibreProject({
      ...location,
      fetchFeatureCollection: successfulFetch,
    });
    const withSoilPotassiumVisible = {
      ...project,
      layers: project.layers.map((layer) =>
        layer.id === "corestack-soil_health_raster_K"
          ? { ...layer, visible: true }
          : layer
      ),
    };
    const legends = activeGeoLibreLegends(withSoilPotassiumVisible);
    const soilPotassiumLegend = legends.find((legend) => legend.title === "Soil Potassium Levels legend");
    expect(soilPotassiumLegend.items).toEqual([
      { label: "Low (<120 kg/ha)", color: "#FF0000", shape: "square" },
      { label: "Medium (120-280 kg/ha)", color: "#EEE05D", shape: "square" },
      { label: "High (>280 kg/ha)", color: "#73BB53", shape: "square" },
    ]);
  });

  it("matches the published Soil Organic Carbon Concentration legend exactly", async () => {
    const project = await buildGeoLibreProject({
      ...location,
      fetchFeatureCollection: successfulFetch,
    });
    const withSoilOrganicCarbonVisible = {
      ...project,
      layers: project.layers.map((layer) =>
        layer.id === "corestack-soil_health_raster_OC"
          ? { ...layer, visible: true }
          : layer
      ),
    };
    const legends = activeGeoLibreLegends(withSoilOrganicCarbonVisible);
    const soilOrganicCarbonLegend = legends.find((legend) => legend.title === "SoC over Cropping Areas legend");
    expect(soilOrganicCarbonLegend.items).toEqual([
      { label: "Low (0-120 kg/ha)", color: "#C8E6C9", shape: "square" },
      { label: "Medium (120-280 kg/ha)", color: "#66BB6A", shape: "square" },
      { label: "High (>280 kg/ha)", color: "#2E7D32", shape: "square" },
    ]);
  });

  it("matches the published Soil Organic Carbon Concentration for Various Forest Systems legend exactly", async () => {
    const project = await buildGeoLibreProject({
      ...location,
      fetchFeatureCollection: successfulFetch,
    });
    const withSoilOrganicCarbonOlmVisible = {
      ...project,
      layers: project.layers.map((layer) =>
        layer.id === "corestack-soil_health_raster_OC_OLM"
          ? { ...layer, visible: true }
          : layer
      ),
    };
    const legends = activeGeoLibreLegends(withSoilOrganicCarbonOlmVisible);
    const soilOrganicCarbonOlmLegend = legends.find((legend) => legend.title === "SoC over Forest And Shrub Areas legend");
    expect(soilOrganicCarbonOlmLegend.items).toEqual([
      { label: "<=1% (Scrubs / Degraded land)", color: "#EF5350", shape: "square" },
      { label: "1-2% (Open Forests)", color: "#FFCA28", shape: "square" },
      { label: "2-3% (Moderately Dense Forest)", color: "#81C784", shape: "square" },
      { label: ">3% (Very Dense Forest)", color: "#66BB6A", shape: "square" },
    ]);
  });

  it("preloads only Terrain's extent while leaving every vector lazy", async () => {
    const project = await buildGeoLibreProject({
      ...location,
      fetchFeatureCollection: successfulFetch,
    });

    expect(project.metadata.layerLoading.stage).toBe("base-map");
    expect(
      project.layers
        .filter((layer) => layer.type === "geojson")
        .every((layer) => layer.metadata.loadState === "unloaded")
    ).toBe(true);
    expect(
      project.layers.find((layer) => layer.id === "corestack-mws_layers")
        .metadata.loadState
    ).toBe("unloaded");
    expect(
      project.layers
        .filter((layer) => layer.visible)
        .map((layer) => layer.id)
    ).toEqual([
      "corestack-terrain",
    ]);
    expect(successfulFetch).not.toHaveBeenCalled();
    expect(global.fetch.mock.calls.filter(([url]) => url.includes("GetCapabilities"))).toHaveLength(1);
  });

  it("loads a toggled vector once and reuses its hydrated data", async () => {
    const project = await buildGeoLibreProject({
      ...location,
      fetchFeatureCollection: successfulFetch,
    });
    const drainageId = "corestack-drainage";
    const toggledProject = {
      ...project,
      layers: project.layers.map((layer) =>
        layer.id === drainageId ? { ...layer, visible: true } : layer
      ),
    };

    const hydratedProject = await hydrateGeoLibreVectorLayer({
      project: toggledProject,
      layerId: drainageId,
      fetchFeatureCollection: successfulFetch,
    });
    const drainage = hydratedProject.layers.find(
      (layer) => layer.id === drainageId
    );

    expect(drainage).toMatchObject({
      visible: true,
      metadata: { loadState: "loaded", featureCount: 1 },
    });
    expect(successfulFetch.mock.calls[0][0].typeName).toContain("drainage");
    expect(successfulFetch).toHaveBeenCalledTimes(1);

    const reusedProject = await hydrateGeoLibreVectorLayer({
      project: hydratedProject,
      layerId: drainageId,
      fetchFeatureCollection: successfulFetch,
    });
    expect(reusedProject).toBe(hydratedProject);
    expect(successfulFetch).toHaveBeenCalledTimes(1);
  });

  it("hydrates separately selectable NREGA work types with small native markers", async () => {
    const project = await buildGeoLibreProject({
      ...location,
      fetchFeatureCollection: successfulFetch,
    });
    const layerId = "corestack-nrega_land_restoration";
    const selectedLayerIds = new Set([
      layerId,
      "corestack-nrega_irrigation_site",
      "corestack-nrega_plantation",
    ]);
    const toggledProject = {
      ...project,
      layers: project.layers.map((layer) =>
        layer.id.startsWith("corestack-nrega_")
          ? { ...layer, visible: selectedLayerIds.has(layer.id) }
          : layer
      ),
    };
    const nregaFetch = jest.fn(async () => nregaFeatureCollection);

    const hydratedProject = await hydrateGeoLibreVectorLayer({
      project: toggledProject,
      layerId,
      fetchFeatureCollection: nregaFetch,
    });
    const nregaLayers = GEOLIBRE_NREGA_CATEGORIES.map(category =>
      hydratedProject.layers.find(layer => layer.id === `corestack-nrega_${category.id}`)
    ).reverse();
    const nrega = nregaLayers.find((layer) => layer.id === layerId);

    expect(nregaFetch).toHaveBeenCalledTimes(1);
    expect(nregaLayers).toHaveLength(GEOLIBRE_NREGA_CATEGORIES.length);
    expect(nrega).toMatchObject({
      id: layerId,
      name: "Land restoration",
      visible: true,
      metadata: {
        loadState: "loaded",
        featureCount: 1,
      },
    });
    expect(nrega.geojson.features).toEqual([nregaFeatureCollection.features[0]]);
    expect(nrega.style).toMatchObject({
      vectorStyleMode: "single",
      fillOpacity: 0.9,
      circleRadius: 5,
      fillColor: "#FFA500",
      strokeColor: "#ffffff",
    });
    expect(
      [...nregaLayers].reverse().map((item) => item.name)
    ).toEqual(GEOLIBRE_NREGA_CATEGORIES.map(category => category.id === "irrigation_site" ? "Irrigation: site-level impact" : category.label));
    expect(
      [...nregaLayers].reverse().map((item) => item.style.fillColor)
    ).toEqual(GEOLIBRE_NREGA_CATEGORIES.map((category) => category.color));
    expect(
      nregaLayers.every((item) => item.metadata.loadState === "loaded")
    ).toBe(true);
    expect(
      nregaLayers
        .filter((item) => item.visible)
        .map((item) => item.id)
        .sort()
    ).toEqual([...selectedLayerIds].sort());
    expect(
      nregaLayers.reduce(
        (count, item) => count + item.geojson.features.length,
        0
      )
    ).toBe(nregaFeatureCollection.features.length);
    expect(nrega.metadata.corestack.legend).toBeUndefined();
    expect(nrega.style.labels).toBeUndefined();
    expect(nrega.style.diagramType).toBeUndefined();

    const reusedProject = await hydrateGeoLibreVectorLayer({
      project: hydratedProject,
      layerId,
      fetchFeatureCollection: nregaFetch,
    });
    expect(reusedProject).toBe(hydratedProject);
    expect(nregaFetch).toHaveBeenCalledTimes(1);

    const allVisibleProject = {
      ...hydratedProject,
      layers: hydratedProject.layers.map((layer) =>
        layer.id.startsWith("corestack-nrega_") ? { ...layer, visible: true } : layer
      ),
    };
    const allVisibleResult = await hydrateGeoLibreVectorLayer({
      project: allVisibleProject,
      layerId,
      fetchFeatureCollection: nregaFetch,
    });
    expect(
      allVisibleResult.layers
        .filter((item) => item.id.startsWith("corestack-nrega_"))
        .every((item) => item.visible)
    ).toBe(true);
    expect(nregaFetch).toHaveBeenCalledTimes(1);
  });
  it("classifies NREGA features published with the newer unclipped WorkCategory field", async () => {
    const project = await buildGeoLibreProject({
      ...location,
      fetchFeatureCollection: successfulFetch,
    });
    const layerId = "corestack-nrega_plantation";
    const newSchemaFeatures = {
      type: "FeatureCollection",
      features: ["Plantation", "SWC - Landscape level impact", "Un Identified"].map(
        (WorkCategory, index) => ({
          type: "Feature",
          id: `nrega-new-${index}`,
          properties: { WorkCategory, "Work Type": `Work type ${index}` },
          geometry: { type: "Point", coordinates: [92.92 + index * 0.02, 24.72 + index * 0.02] },
        })
      ),
    };
    const nregaFetch = jest.fn(async () => newSchemaFeatures);

    const hydratedProject = await hydrateGeoLibreVectorLayer({
      project,
      layerId,
      fetchFeatureCollection: nregaFetch,
    });
    const plantation = hydratedProject.layers.find((layer) => layer.id === layerId);
    expect(plantation.geojson.features).toHaveLength(1);
    expect(plantation.geojson.features[0].properties).toMatchObject({
      WorkCategory: "Plantation",
      WorkCatego: "Plantation",
    });
    const swc = hydratedProject.layers.find((layer) => layer.id === "corestack-nrega_soil_water_conservation");
    expect(swc.geojson.features).toHaveLength(1);
    const unclassified = hydratedProject.layers.find((layer) => layer.id === "corestack-nrega_unclassified");
    expect(unclassified.geojson.features).toHaveLength(1);
  });
  it("classifies Terrain Clusters features published with the older unclipped terrainClusters field", async () => {
    const project = await buildGeoLibreProject({ ...location, fetchFeatureCollection: successfulFetch });
    const legacySchemaFeatures = {
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        properties: { uid: "12_307609", area_in_ha: 2116.4, plain_area: 66.0, terrainClusters: 3 },
        geometry: { type: "Polygon", coordinates: [] },
      }],
    };
    const result = await hydrateGeoLibreVectorLayer({
      project, layerId: "corestack-terrain_vector",
      fetchFeatureCollection: async () => legacySchemaFeatures,
    });
    const terrain = result.layers.find((layer) => layer.id === "corestack-terrain_vector");
    expect(terrain.style.vectorStyleProperty).toBe("terrainClu");
    expect(terrain.geojson.features[0].properties).toMatchObject({ terrainClusters: 3, terrainClu: 3 });
  });

  it("keeps a failed lazy vector available for a later toggle retry", async () => {
    const project = await buildGeoLibreProject({
      ...location,
      fetchFeatureCollection: successfulFetch,
    });
    const layerId = "corestack-mws_layers_fortnight";
    const failedFetch = jest.fn(async () => {
      throw new Error("temporary outage");
    });

    const failedProject = await hydrateGeoLibreVectorLayer({
      project,
      layerId,
      fetchFeatureCollection: failedFetch,
    });
    expect(
      failedProject.layers.find((layer) => layer.id === layerId).metadata
    ).toMatchObject({ loadState: "error", initialLoadError: "temporary outage" });
    expect(failedProject.metadata.layerLoading.lazyLoadFailures).toHaveLength(1);

    const retriedProject = await hydrateGeoLibreVectorLayer({
      project: failedProject,
      layerId,
      fetchFeatureCollection: successfulFetch,
    });
    expect(
      retriedProject.layers.find((layer) => layer.id === layerId).metadata
        .loadState
    ).toBe("loaded");
    expect(retriedProject.metadata.layerLoading.lazyLoadFailures).toEqual([]);
  });

  it("does not preload the administrative or demographic WFS layers", async () => {
    const failedFetch = jest.fn(async () => {
      throw new Error("offline");
    });
    const project = await buildGeoLibreProject({
      ...location,
      fetchFeatureCollection: failedFetch,
    });
    expect(project.layers.filter((layer) => layer.type === "geojson").every(
      (layer) => layer.metadata.loadState === "unloaded"
    )).toBe(true);
    expect(failedFetch).not.toHaveBeenCalled();
  });
});

describe("Fortnightly Water Balance records", () => {
  it("preserves names, geometry, signs, zero, missing values and malformed JSON", () => {
    const geometry = { type: "Point", coordinates: [1, 2] };
    const data = { type: "FeatureCollection", features: [{ geometry, properties: {
      uid: "12_301304", "2025-06-01": '{"DeltaG": -12, "Precipitation": 4}',
      "2025-06-16": '{"DeltaG": 0}', "2025-07-01": { DeltaG: 9 },
      "2025-07-16": "bad JSON", "2025-08-01": null,
    } }] };
    const parsed = parseFortnightRecords(data);
    expect(parsed.features[0].properties).toEqual({
      uid: "12_301304", "2025-06-01": { DeltaG: -12, Precipitation: 4 },
      "2025-06-16": { DeltaG: 0 }, "2025-07-01": { DeltaG: 9 },
      "2025-07-16": "bad JSON", "2025-08-01": null,
      avg_delta_g: -1,
    });
    expect(parsed.features[0].geometry).toBe(geometry);
    expect(data.features[0].properties["2025-06-01"]).toBe('{"DeltaG": -12, "Precipitation": 4}');
  });
  it("keeps the average null, not zero, when no date record has a readable DeltaG", () => {
    const data = { type: "FeatureCollection", features: [{ geometry: null, properties: {
      "2025-06-01": "bad JSON", "2025-06-16": null, not_a_date: '{"DeltaG": 5}',
    } }] };
    expect(parseFortnightRecords(data).features[0].properties.avg_delta_g).toBeNull();
  });
});

describe("Annual Water Balance records", () => {
  it("averages DeltaG across year-keyed records and ignores non-year and malformed fields", () => {
    const data = { type: "FeatureCollection", features: [{ geometry: null, properties: {
      uid: "14_63507",
      "2017_2018": '{"DeltaG": 60, "ET": 486}',
      "2018_2019": '{"DeltaG": -120}',
      "2019_2020": "bad JSON",
      "Net2018_23": 1.69,
      area_in_ha: 1396.9,
    } }] };
    const parsed = withAverageDeltaG(data);
    expect(parsed.features[0].properties.avg_delta_g).toBe(-30);
    expect(parsed.features[0].properties).toMatchObject({ uid: "14_63507", Net2018_23: 1.69, area_in_ha: 1396.9 });
  });
  it("keeps the average null, not zero, when no year record has a readable DeltaG", () => {
    const data = { type: "FeatureCollection", features: [{ geometry: null, properties: {
      "2017_2018": "bad JSON", "2018_2019": null, not_a_year: '{"DeltaG": 5}',
    } }] };
    expect(withAverageDeltaG(data).features[0].properties.avg_delta_g).toBeNull();
  });
});

describe("NDVI time-series records", () => {
  it("averages dated numeric values without renaming source columns", () => {
    const data = { type: "FeatureCollection", features: [{
      type: "Feature", properties: { "tree_2024-07-13": 0.4, "shrub_2024-07-13": 0.6, uid: "x" },
      geometry: null,
    }] };
    expect(withAverageNdvi(data).features[0].properties).toEqual({
      "tree_2024-07-13": 0.4, "shrub_2024-07-13": 0.6, uid: "x", avg_ndvi: 0.5,
    });
  });
});

describe("Terrain Clusters field normalization", () => {
  it("copies terrainClusters onto terrainClu when the clipped field is absent", () => {
    const data = { type: "FeatureCollection", features: [{ geometry: null, properties: {
      uid: "12_307609", plain_area: 66.0, terrainClusters: 3,
    } }] };
    expect(withNormalizedTerrainCluster(data).features[0].properties).toMatchObject({
      terrainClusters: 3, terrainClu: 3,
    });
  });
  it("leaves an already-clipped feature unchanged", () => {
    const data = { type: "FeatureCollection", features: [{ geometry: null, properties: {
      uid: "12_108325", terrainClu: 0,
    } }] };
    const parsed = withNormalizedTerrainCluster(data);
    expect(parsed.features[0]).toBe(data.features[0]);
    expect(parsed.features[0].properties.terrainClusters).toBeUndefined();
  });
  it("leaves a feature with neither field unchanged", () => {
    const data = { type: "FeatureCollection", features: [{ geometry: null, properties: { uid: "1" } }] };
    const parsed = withNormalizedTerrainCluster(data);
    expect(parsed.features[0]).toBe(data.features[0]);
  });
});

describe("Soil Type texture binning", () => {
  it("bins a raw subsoil_texture value into its CoRE Stack soil-texture group", () => {
    const data = { type: "FeatureCollection", features: [{ geometry: null, properties: {
      uid: "12_57237", subsoil_texture: "Silty clay loam",
    } }] };
    expect(withSoilTextureClass(data).features[0].properties.soil_texture_class).toBe("Moderately Fine / Clay Loam");
  });
  it("keeps the class null, not a made-up bin, for a missing or unrecognized texture", () => {
    const missing = { type: "FeatureCollection", features: [{ geometry: null, properties: { uid: "1", subsoil_texture: null } }] };
    const unrecognized = { type: "FeatureCollection", features: [{ geometry: null, properties: { uid: "2", subsoil_texture: "Medium" } }] };
    expect(withSoilTextureClass(missing).features[0].properties.soil_texture_class).toBeNull();
    expect(withSoilTextureClass(unrecognized).features[0].properties.soil_texture_class).toBeNull();
  });
});

describe("Afforestation stats hectare binning", () => {
  it("bins total_aff at its boundaries", () => {
    const data = { type: "FeatureCollection", features: [49.9, 50, 99.9, 100, 100.1].map((total_aff, index) => ({
      geometry: null, properties: { uid: `${index}`, total_aff },
    })) };
    expect(withAfforestationClass(data).features.map(feature => feature.properties.total_aff_class)).toEqual([
      "Less than 50 hac", "Between 50 to 100 hac", "Between 50 to 100 hac",
      "More than 100 hac", "More than 100 hac",
    ]);
  });
  it("keeps the class null, not a made-up bin, for a missing total_aff", () => {
    const data = { type: "FeatureCollection", features: [{ geometry: null, properties: { uid: "1", total_aff: null } }] };
    expect(withAfforestationClass(data).features[0].properties.total_aff_class).toBeNull();
  });
});

describe("Deforestation stats hectare binning", () => {
  it("bins total_def at its boundaries", () => {
    const data = { type: "FeatureCollection", features: [49.9, 50, 99.9, 100, 100.1].map((total_def, index) => ({
      geometry: null, properties: { uid: `${index}`, total_def },
    })) };
    expect(withDeforestationClass(data).features.map(feature => feature.properties.total_def_class)).toEqual([
      "Less than 50 hac", "Between 50 to 100 hac", "Between 50 to 100 hac",
      "More than 100 hac", "More than 100 hac",
    ]);
  });
  it("keeps the class null, not a made-up bin, for a missing total_def", () => {
    const data = { type: "FeatureCollection", features: [{ geometry: null, properties: { uid: "1", total_def: null } }] };
    expect(withDeforestationClass(data).features[0].properties.total_def_class).toBeNull();
  });
});

describe("Forest Fringe hectare binning", () => {
  it("bins forest_fringe_area_in_ha at its boundaries", () => {
    const data = { type: "FeatureCollection", features: [9.9, 10, 49.9, 50, 149.9, 150].map((forest_fringe_area_in_ha, index) => ({
      geometry: null, properties: { uid: `${index}`, forest_fringe_area_in_ha },
    })) };
    expect(withForestFringeClass(data).features.map(feature => feature.properties.forest_fringe_area_class)).toEqual([
      "Less than 10 hac", "Between 10 to 50 hac", "Between 10 to 50 hac",
      "Between 50 to 150 hac", "Between 50 to 150 hac", "More than 150 hac",
    ]);
  });
  it("keeps the class null, not a made-up bin, for a missing forest_fringe_area_in_ha", () => {
    const data = { type: "FeatureCollection", features: [{ geometry: null, properties: { uid: "1", forest_fringe_area_in_ha: null } }] };
    expect(withForestFringeClass(data).features[0].properties.forest_fringe_area_class).toBeNull();
  });
});

describe("Cropping Degradation hectare binning", () => {
  it("bins total_deg at its boundaries", () => {
    const data = { type: "FeatureCollection", features: [29.9, 30, 89.9, 90, 90.1].map((total_deg, index) => ({
      geometry: null, properties: { uid: `${index}`, total_deg },
    })) };
    expect(withDegradationClass(data).features.map(feature => feature.properties.total_deg_class)).toEqual([
      "Less than 30 hac", "Between 30 to 90 hac", "Between 30 to 90 hac",
      "More than 90 hac", "More than 90 hac",
    ]);
  });
  it("keeps the class null, not a made-up bin, for a missing total_deg", () => {
    const data = { type: "FeatureCollection", features: [{ geometry: null, properties: { uid: "1", total_deg: null } }] };
    expect(withDegradationClass(data).features[0].properties.total_deg_class).toBeNull();
  });
});

describe("Urbanization hectare binning", () => {
  it("bins total_urb at its boundaries", () => {
    const data = { type: "FeatureCollection", features: [29.9, 30, 89.9, 90, 90.1].map((total_urb, index) => ({
      geometry: null, properties: { uid: `${index}`, total_urb },
    })) };
    expect(withUrbanizationClass(data).features.map(feature => feature.properties.total_urb_class)).toEqual([
      "Less than 30 hac", "Between 30 to 90 hac", "Between 30 to 90 hac",
      "More than 90 hac", "More than 90 hac",
    ]);
  });
  it("keeps the class null, not a made-up bin, for a missing total_urb", () => {
    const data = { type: "FeatureCollection", features: [{ geometry: null, properties: { uid: "1", total_urb: null } }] };
    expect(withUrbanizationClass(data).features[0].properties.total_urb_class).toBeNull();
  });
});

describe("Crop Intensity change hectare binning", () => {
  it("bins total_change at its boundaries", () => {
    const data = { type: "FeatureCollection", features: [29.9, 30, 89.9, 90, 90.1].map((total_change, index) => ({
      geometry: null, properties: { uid: `${index}`, total_change },
    })) };
    expect(withCropIntensityChangeClass(data).features.map(feature => feature.properties.total_change_class)).toEqual([
      "Less than 30 hac", "Between 30 to 90 hac", "Between 30 to 90 hac",
      "More than 90 hac", "More than 90 hac",
    ]);
  });
  it("keeps the class null, not a made-up bin, for a missing total_change", () => {
    const data = { type: "FeatureCollection", features: [{ geometry: null, properties: { uid: "1", total_change: null } }] };
    expect(withCropIntensityChangeClass(data).features[0].properties.total_change_class).toBeNull();
  });
});

describe("Restoration Atlas excluded-area hectare binning", () => {
  it("bins the space-named Excluded A field at its boundaries", () => {
    const data = { type: "FeatureCollection", features: [29.9, 30, 89.9, 90, 90.1].map((value, index) => ({
      geometry: null, properties: { uid: `${index}`, "Excluded A": value },
    })) };
    expect(withExcludedAreaClass(data).features.map(feature => feature.properties.excluded_area_class)).toEqual([
      "Less than 30 hac", "Between 30 to 90 hac", "Between 30 to 90 hac",
      "More than 90 hac", "More than 90 hac",
    ]);
  });
  it("keeps the class null, not a made-up bin, for a missing Excluded A", () => {
    const data = { type: "FeatureCollection", features: [{ geometry: null, properties: { uid: "1", "Excluded A": null } }] };
    expect(withExcludedAreaClass(data).features[0].properties.excluded_area_class).toBeNull();
  });
});

describe("Water Balance mm binning", () => {
  it("bins Annual avg_delta_g at its boundaries", () => {
    const data = { type: "FeatureCollection", features: [-50.1, -50, -15, 0, 15, 50, 50.1].map((avg_delta_g, index) => ({
      geometry: null, properties: { uid: `${index}`, avg_delta_g },
    })) };
    expect(withMwsClass(data).features.map(feature => feature.properties.avg_delta_g_class)).toEqual([
      "Less than -50 mm", "-50 to -15 mm", "-15 to 0 mm", "0 to 15 mm", "15 to 50 mm", "More than 50 mm", "More than 50 mm",
    ]);
  });
  it("keeps the Annual class null, not a made-up bin, for a missing avg_delta_g", () => {
    const data = { type: "FeatureCollection", features: [{ geometry: null, properties: { uid: "1", avg_delta_g: null } }] };
    expect(withMwsClass(data).features[0].properties.avg_delta_g_class).toBeNull();
  });
  it("bins Fortnightly avg_delta_g at its narrower boundaries", () => {
    const data = { type: "FeatureCollection", features: [-15.1, -15, -5, 0, 5, 15, 15.1].map((avg_delta_g, index) => ({
      geometry: null, properties: { uid: `${index}`, avg_delta_g },
    })) };
    expect(withMwsFortnightClass(data).features.map(feature => feature.properties.avg_delta_g_class)).toEqual([
      "Less than -15 mm", "-15 to -5 mm", "-5 to 0 mm", "0 to 5 mm", "5 to 15 mm", "More than 15 mm", "More than 15 mm",
    ]);
  });
  it("keeps the Fortnightly class null, not a made-up bin, for a missing avg_delta_g", () => {
    const data = { type: "FeatureCollection", features: [{ geometry: null, properties: { uid: "1", avg_delta_g: null } }] };
    expect(withMwsFortnightClass(data).features[0].properties.avg_delta_g_class).toBeNull();
  });
});

it("normalizes mean built-up area and keeps missing/zero-area polygons missing", () => {
  const input = { features: [
    { properties: { area_in_ha: 100, "built-up_area_2017": 10, "built-up_area_2024": "30", "built-up_area_2023": "" } },
    { properties: { area_in_ha: 0, "built-up_area_2024": 3 } },
    { properties: { area_in_ha: 10, "built-up_area_2024": 0 } },
    { properties: { area_in_ha: 10 } },
  ] };
  expect(withLulcAreaFractions(input).features.map(f => f.properties.built_up_fraction)).toEqual([0.2, null, 0, null]);
  expect(withLulcAreaFractions(input).features[0].properties.built_up_year_count).toBe(2);
  expect(input.features[0].properties.built_up_fraction).toBeUndefined();
});

test("MWS boundary uses its published source, carries field meaning, hover and UID labels", async () => {
  const project = await buildGeoLibreProject({ ...location });
  const layer = project.layers.find(item => item.id === "corestack-hydrological_boundaries");
  expect(layer.source.typeName).toBe("mws:mws_cachar_lakhipur");
  expect(layer.source.url).toContain("/mws/ows");
  expect(layer.style.labels).toMatchObject({ enabled: true, field: "uid" });
  expect(layer.metadata.corestack.description).toContain("Micro watershed boundaries");
  const properties = { uid: "12_317834", area_in_ha: 1566.88, bacode: "2A", sbcode: "BHG", wsconc: "C2ABHG01" };
  const hydrated = await hydrateGeoLibreVectorLayer({ project, layerId: layer.id, fetchFeatureCollection: async () => ({ features: [{ properties, geometry: null }] }) });
  const ready = hydrated.layers.find(item => item.id === layer.id);
  expect(ready.metadata.corestack.fields).toMatchObject({
    uid: { description: "Main micro watershed UID" },
    area_in_ha: { unit: "ha" },
    bacode: { description: "River basin code" },
    sbcode: { description: "Sub-basin code" },
    wsconc: { description: "Concatenated watershed hierarchy code" },
  });
  expect(ready.popup.hover).toBe(true);
  expect(resolvePopupRows(properties, { popup: ready.popup, hover: true }).map(row => row.field)).toEqual(["uid", "bacode", "sbcode", "wsconc"]);
});

test("all vector layers carry configured hover fields and preserve click attributes", async () => {
  const project = await buildGeoLibreProject({ ...location });
  const vectors = project.layers.filter(layer => layer.type === "geojson");
  expect(vectors).toHaveLength(45);
  expect(vectors.every(layer => layer.popup?.hover && layer.popup.fields.some(field => field.hover))).toBe(true);
  const admin = vectors.find(layer => layer.id === "corestack-administrative_boundaries");
  expect(JSON.parse(admin.popup.titleExpression)).toEqual(["concat", ["get", "vill_name"], " (VillageID: ", ["to-string", ["get", "vill_ID"]], ")"]);
});

test("LULC tooltip uses five measured area shares and legend omits unit text", async () => {
  const project = await buildGeoLibreProject({ ...location });
  const data = { features: [{ properties: {
    uid: "one", area_in_ha: 100, "built-up_area_2024": 10,
    k_water_area_2024: 2, kr_water_area_2024: 3, krz_water_area_2024: 5,
    cropland_area_2024: 20, barrenlands_area_2024: 30, tree_forest_area_2024: 40,
  }, geometry: null }] };
  const derived = withLulcAreaFractions(data).features[0].properties;
  expect([derived.built_up_fraction, derived.k_water_fraction, derived.cropland_fraction, derived.barrenlands_fraction, derived.tree_forest_fraction]).toEqual([0.1, 0.1, 0.2, 0.3, 0.4]);
  expect(withLulcAreaFractions({ features: [{ properties: { area_in_ha: 100, k_water_area_2024: 2, kr_water_area_2024: 3 } }] }).features[0].properties.k_water_fraction).toBeNull();
  const hydrated = await hydrateGeoLibreVectorLayer({ project, layerId: "corestack-lulc_stats", fetchFeatureCollection: async () => data });
  const layer = hydrated.layers.find(item => item.id === "corestack-lulc_stats");
  expect(resolvePopupRows(layer.geojson.features[0].properties, { popup: layer.popup, hover: true }).map(row => row.field)).toEqual([
    "built_up_fraction", "k_water_fraction", "cropland_fraction", "barrenlands_fraction", "tree_forest_fraction",
  ]);
  expect(layer.style.vectorStyleStops.every(stop => !stop.label.includes("dimensionless"))).toBe(true);
  expect(layer.metadata.corestack.fields.built_up_fraction.unit).toBe("dimensionless");
});
