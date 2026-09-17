import {
  activeGeoLibreLegends,
  buildGeoLibreProject,
  DEFAULT_GEOLIBRE_BASEMAP_STYLE,
  FORTNIGHT_DATE_FIELD,
  FORTNIGHT_VALUE_FIELD,
  formatGeoServerName,
  geoJsonBounds,
  hydrateGeoLibreVectorLayer,
  mapViewFromBounds,
  prepareFortnightData,
  sanitizeGeoLibreProjectPlugins,
} from "./geolibreProject";
import {
  GEOLIBRE_LAYERS,
  GEOLIBRE_NREGA_CATEGORIES,
} from "../../config/geolibreLayers";
import { createExpression } from "@maplibre/maplibre-gl-style-spec";

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

beforeEach(() => {
  successfulFetch.mockReset();
  successfulFetch.mockImplementation(async (request) =>
    polygonFeatureCollection(request)
  );
});

describe("GeoLibre 2.6 project generation", () => {
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
  it("hydrates Fortnightly Water Balance as a full-series bar plot without a polygon legend", async () => {
    const project = await buildGeoLibreProject({ ...location, fetchFeatureCollection: successfulFetch });
    const result = await hydrateGeoLibreVectorLayer({ project, layerId: "corestack-mws_layers_fortnight", fetchFeatureCollection: async () => ({
      type: "FeatureCollection", features: [{ type: "Feature", geometry: { type: "Polygon", coordinates: [] }, properties: { "2025-06-16": '{"DeltaG": 120}' } }],
    }) });
    const layer = result.layers.find(item => item.id === "corestack-mws_layers_fortnight");
    expect(layer.name).toBe("Fortnightly Water Balance");
    expect(layer.style.strokeColor).toBe("#05081c");
    expect(layer.style.diagramType).toBe("bar");
    expect(layer.style.diagramFields).toEqual([{ property: "__delta_g_mm_2025-06-16", label: "2025-06-16", color: "#f7f7f7" }]);
    expect(layer.style).toMatchObject({ vectorStyleMode: "single", vectorStyleProperty: "", vectorStyleStops: [], vectorStyleExpression: "", fillOpacity: 0 });
    expect(layer.metadata.corestack.fortnightBarSeries).toMatchObject({ units: "mm", measurement: "DeltaG" });
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
    expect(color("mws_layers", { Net2020_25: 0 })).toBe("#f7f7f7");
    expect(color("mws_layers", { Net2018_23: 2 })).toBe("#3b3b3b");
    expect(color("remote_sensed_waterbodies", { area_ored: 5 })).toBe("#1e3a8a");
    const crop = Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`cropping_intensity_${2017 + i}`, 2]));
    expect(color("cropping_intensity", crop)).toBe("#52ac5a");
    expect(color("cropping_intensity", { ...crop, cropping_intensity_2024: null })).toBe("#3b3b3b");
    const drought = Object.fromEntries(Array.from({ length: 8 }, (_, i) => [[`w_mod_${2017 + i}`, 0], [`w_sev_${2017 + i}`, 0]]).flat());
    expect(color("drought", drought)).toBe("#f4d03f");
    expect(color("drought", { ...drought, w_mod_2017: 5 })).toBe("#eb984e");
    expect(color("drought", { ...drought, w_mod_2017: 5, w_sev_2018: 5 })).toBe("#e74c3c");
    expect(color("drought", { ...drought, w_sev_2018: "" })).toBe("#3b3b3b");
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

  it("starts only latest LULC with staged refinements", async () => {
    const project = await buildGeoLibreProject({
      ...location,
      fetchFeatureCollection: successfulFetch,
    });

    expect(project.version).toBe("0.2.0");
    expect(project.layers).toHaveLength(GEOLIBRE_LAYERS.length);
    expect(project.layers).toHaveLength(62);
    expect(project.layers.every(layer => layer.name === GEOLIBRE_LAYERS.find(item => `corestack-${item.id}` === layer.id)?.label)).toBe(true);
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
        featureCount: 1,
        loadState: "loaded",
        corestack: {
          geoserverStyle: {
            provider: "GeoServer",
            assignment: "layer-default",
            renderingMode: "geolibre-parity-profile",
          },
        },
      },
    });
    expect(socioeconomic.geojson.type).toBe("FeatureCollection");

    const visibleLayers = project.layers.filter((layer) => layer.visible);
    expect(visibleLayers.map((layer) => layer.id)).toEqual([
      "corestack-lulc_level_1_24_25",
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

    const latestLulc = project.layers.find(
      (layer) => layer.id === "corestack-lulc_level_3_24_25"
    );
    expect(latestLulc).toMatchObject({
      type: "raster",
      visible: false,
      metadata: {
        service: "wms",
        corestack: {
          geoserverStyle: {
            name: "lulc_level_3_style",
            assignment: "named-style",
            renderingMode: "server-rendered-wms",
          },
          rasterDownload: {
            kind: "full-coverage-geotiff",
            bytePreservingInGeoLibre: true,
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
    expect(latestLulc.source.wmsUrl).toContain("/geoserver/wms");
    expect(latestLulc.metadata.corestack.geoserverStyle.sldUrl).toContain(
      "REQUEST=GetStyles"
    );
    expect(
      latestLulc.metadata.corestack.geoserverStyle.legendJsonUrl
    ).toContain("FORMAT=application%2Fjson");
    expect(latestLulc.source.url).toContain("request=GetCoverage");
    expect(latestLulc.source.url).toContain("tiling=false");
    const sameYear = project.layers.filter(item => item.id.match(/^corestack-lulc_level_[123]_24_25$/));
    expect(new Set(sameYear.map(item => item.source.url)).size).toBe(1);
    expect(latestLulc.source.url).toContain(
      "CoverageId=LULC_level_3%3ALULC_24_25_cachar_lakhipur_level_3"
    );
    const latestLulcStyles = [1, 2, 3].map((level) =>
      project.layers.find(
        (layer) => layer.id === `corestack-lulc_level_${level}_24_25`
      )
    );
    expect(latestLulcStyles.map((layer) => layer.source.layers)).toEqual([
      "LULC_level_3:LULC_24_25_cachar_lakhipur_level_3",
      "LULC_level_3:LULC_24_25_cachar_lakhipur_level_3",
      "LULC_level_3:LULC_24_25_cachar_lakhipur_level_3",
    ]);
    expect(latestLulcStyles.map((layer) => layer.source.url)).toEqual([
      latestLulc.source.url,
      latestLulc.source.url,
      latestLulc.source.url,
    ]);
    expect(latestLulcStyles.map((layer) => layer.source.styles)).toEqual([
      "lulc_level_1_style",
      "lulc_level_2_style",
      "lulc_level_3_style",
    ]);

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
          rasterDownload: { kind: "full-coverage-geotiff" },
        },
      },
    });
    expect(dem.source.url).toContain(
      "CoverageId=dem%3Acachar_lakhipur_dem_raster"
    );
    expect(
      project.layers.every(
        (layer) =>
          !JSON.stringify(layer.metadata?.corestack || {}).includes(
            "githubusercontent.com"
          )
      )
    ).toBe(true);
    expect(successfulFetch).toHaveBeenCalledTimes(1);
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
      "corestack-terrain_vector": "Terrain Clusters",
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
      "lulc-3",
      "lulc-2",
      "lulc-1",
      "land",
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
    expect(legends.map(item => item.title)).toEqual(["LULC Level 1 legend"]);
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

    expect(legends.map((entry) => entry.title)).toEqual([
      "LULC Level 1 legend",
      "Terrain legend",
    ]);

    const drainageHidden = {
      ...synced,
      layers: synced.layers.map((layer) =>
        layer.id === "corestack-drainage"
          ? { ...layer, visible: false }
          : layer
      ),
    };
    const resynced = sanitizeGeoLibreProjectPlugins(drainageHidden);
    expect(activeGeoLibreLegends(resynced).map((entry) => entry.title)).toEqual([
      "LULC Level 1 legend",
      "Terrain legend",
    ]);
  });

  it("returns a separate active legend for every visible LULC style", async () => {
    const project = await buildGeoLibreProject({
      ...location,
      fetchFeatureCollection: successfulFetch,
    });
    const withLulcStyles = {
      ...project,
      layers: project.layers.map((layer) =>
        [
          "corestack-lulc_level_1_17_18",
          "corestack-lulc_level_2_17_18",
          "corestack-lulc_level_3_17_18",
        ].includes(layer.id)
          ? { ...layer, visible: true }
          : layer
      ),
    };

    const legends = activeGeoLibreLegends(withLulcStyles);
    expect(legends.map((legend) => legend.title)).toEqual(
      expect.arrayContaining([
        "LULC Level 1 legend",
        "LULC Level 2 legend",
        "LULC Level 3 legend",
      ])
    );
    expect(
      legends.find((legend) => legend.title === "LULC Level 1 legend").items
    ).toHaveLength(5);
    expect(
      legends.find((legend) => legend.title === "LULC Level 2 legend").items
    ).toHaveLength(2);
    expect(
      legends.find((legend) => legend.title === "LULC Level 3 legend").items
    ).toHaveLength(4);
  });

  it("loads only the hidden extent while leaving all other vectors lazy", async () => {
    const project = await buildGeoLibreProject({
      ...location,
      fetchFeatureCollection: successfulFetch,
    });

    expect(project.metadata.layerLoading.stage).toBe("base-map");
    expect(
      project.layers
        .filter(
          (layer) =>
            layer.type === "geojson" &&
            ![
              "corestack-administrative_boundaries",
              "corestack-demographics",
                    ].includes(layer.id)
        )
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
      "corestack-lulc_level_1_24_25",
    ]);
    expect(successfulFetch.mock.calls[0][0].typeName).toBe(
      "panchayat_boundaries:cachar_lakhipur"
    );
    expect(successfulFetch).toHaveBeenCalledTimes(1);
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
    expect(successfulFetch.mock.calls[1][0].typeName).toContain("drainage");
    expect(successfulFetch).toHaveBeenCalledTimes(2);

    const reusedProject = await hydrateGeoLibreVectorLayer({
      project: hydratedProject,
      layerId: drainageId,
      fetchFeatureCollection: successfulFetch,
    });
    expect(reusedProject).toBe(hydratedProject);
    expect(successfulFetch).toHaveBeenCalledTimes(2);
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
        layer.groupId === "nrega"
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
    const nregaLayers = hydratedProject.layers.filter(
      (layer) => layer.groupId === "nrega"
    );
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
      circleRadius: 4,
      markerEnabled: true,
      markerShape: "square",
      markerColor: "#e68600",
      markerSize: 14,
      pointRenderer: "single",
    });
    expect(
      [...nregaLayers].reverse().map((item) => item.name)
    ).toEqual(GEOLIBRE_NREGA_CATEGORIES.map(category => category.label));
    expect(
      [...nregaLayers].reverse().map((item) => item.style.markerShape)
    ).toEqual(GEOLIBRE_NREGA_CATEGORIES.map((category) => category.markerShape));
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
        layer.groupId === "nrega" ? { ...layer, visible: true } : layer
      ),
    };
    const allVisibleResult = await hydrateGeoLibreVectorLayer({
      project: allVisibleProject,
      layerId,
      fetchFeatureCollection: nregaFetch,
    });
    expect(
      allVisibleResult.layers
        .filter((item) => item.groupId === "nrega")
        .every((item) => item.visible)
    ).toBe(true);
    expect(nregaFetch).toHaveBeenCalledTimes(1);
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

  it("requires the administrative extent", async () => {
    const failedFetch = jest.fn(async () => {
      throw new Error("offline");
    });
    await expect(
      buildGeoLibreProject({
        ...location,
        fetchFeatureCollection: failedFetch,
      })
    ).rejects.toThrow(/administrative boundary.*offline/i);
  });
});

describe("Fortnightly Water Balance time series", () => {
  it("parses every date for diagrams and starts at the earliest observation", () => {
    const data = { type: "FeatureCollection", features: [
      { geometry: { type: "Point", coordinates: [1, 2] }, properties: { "2025-06-01": '{"DeltaG": 12}', "2025-06-16": '{"DeltaG": 0}' } },
      { properties: { "2025-06-01": { DeltaG: 9 } } },
      { properties: { "2025-06-16": "bad JSON", "2025-02-31": { DeltaG: 50 } } },
    ] };
    const result = prepareFortnightData(data);
    expect(result.dates).toEqual(["2025-06-01", "2025-06-16"]);
    expect(result.data.features.map(feature => feature.properties[FORTNIGHT_VALUE_FIELD])).toEqual([12, 9, null]);
    expect(result.data.features.every(feature => feature.properties[FORTNIGHT_DATE_FIELD] === "2025-06-01")).toBe(true);
    expect(result.fields.map(field => field.date)).toEqual(result.dates);
    expect(result.data.features[0].properties[`${FORTNIGHT_VALUE_FIELD}_2025-06-16`]).toBe(0);
    expect(result.data.features[1].properties[`${FORTNIGHT_VALUE_FIELD}_2025-06-16`]).toBeNull();
    expect(result.data.features[0].geometry).toBe(data.features[0].geometry);
    expect(result.data.features[0].properties["2025-06-16"]).toBe('{"DeltaG": 0}');
    expect(data.features[0].properties[FORTNIGHT_VALUE_FIELD]).toBeUndefined();
    expect(prepareFortnightData(data, "2025-06-01").data.features[1].properties[FORTNIGHT_VALUE_FIELD]).toBe(9);
  });
});
