import {
  buildGeoLibreProject,
  formatGeoServerName,
  geoJsonBounds,
  hydrateGeoLibreVectorLayer,
  mapViewFromBounds,
} from "./geolibreProject";
import { GEOLIBRE_LAYERS } from "../../config/geolibreLayers";

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

const successfulFetch = jest.fn();

beforeEach(() => {
  successfulFetch.mockReset();
  successfulFetch.mockImplementation(async (request) =>
    polygonFeatureCollection(request)
  );
});

describe("GeoLibre 2.2 project generation", () => {
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

  it("builds Overview WFS layers and downloadable, lazy styled rasters", async () => {
    const project = await buildGeoLibreProject({
      ...location,
      fetchFeatureCollection: successfulFetch,
    });

    expect(project.version).toBe("0.2.0");
    expect(project.layers).toHaveLength(GEOLIBRE_LAYERS.length);
    expect(project.layers).toHaveLength(45);
    expect(project.mapView.bbox).toEqual([92.9, 24.7, 93.2, 25]);

    const socioeconomic = project.layers.find(
      (layer) => layer.id === "corestack-demographics"
    );
    expect(socioeconomic).toMatchObject({
      type: "geojson",
      visible: true,
      opacity: 0.8,
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
      },
    });
    expect(socioeconomic.geojson.type).toBe("FeatureCollection");

    const visibleLayers = project.layers.filter((layer) => layer.visible);
    expect(visibleLayers.map((layer) => layer.id)).toEqual([
      "corestack-demographics",
      "corestack-administrative_boundaries",
    ]);
    expect(
      visibleLayers.every((layer) => layer.opacity === 0.8)
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
    expect(latestLulc.source.wmsUrl).toContain("/LULC_level_3/wms");
    expect(latestLulc.source.url).toContain("request=GetCoverage");
    expect(latestLulc.source.url).toContain(
      "CoverageId=LULC_level_3%3ALULC_24_25_cachar_lakhipur_level_3"
    );
    expect(successfulFetch).toHaveBeenCalledTimes(1);
  });

  it("orders the native GeoLibre panel by overview, vectors, LULC, then rasters", async () => {
    const project = await buildGeoLibreProject({
      ...location,
      fetchFeatureCollection: successfulFetch,
    });
    const displayIds = [...project.layers]
      .reverse()
      .map((layer) => layer.id);

    expect(displayIds.slice(0, 5)).toEqual([
      "corestack-administrative_boundaries",
      "corestack-demographics",
      "corestack-mws_layers",
      "corestack-hydrological_boundaries",
      "corestack-mws_layers_fortnight",
    ]);
    expect(displayIds.indexOf("corestack-lulc_level_3_24_25")).toBeLessThan(
      displayIds.indexOf("corestack-lulc_level_3_23_24")
    );
    expect(displayIds.indexOf("corestack-lulc_level_1_24_25")).toBeLessThan(
      displayIds.indexOf("corestack-terrain")
    );
    expect(project.layerGroups.map((group) => group.id)).toEqual([
      "overview",
      "watersheds",
      "vectors",
      "lulc-3",
      "lulc-2",
      "lulc-1",
      "rasters",
    ]);
  });

  it("loads only the shared Overview source during project creation", async () => {
    const project = await buildGeoLibreProject({
      ...location,
      fetchFeatureCollection: successfulFetch,
    });

    expect(project.metadata.layerLoading.stage).toBe("overview");
    expect(
      project.layers
        .filter(
          (layer) =>
            layer.type === "geojson" && layer.groupId !== "overview"
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
      "corestack-demographics",
      "corestack-administrative_boundaries",
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

  it("requires the socioeconomic extent", async () => {
    const failedFetch = jest.fn(async () => {
      throw new Error("offline");
    });
    await expect(
      buildGeoLibreProject({
        ...location,
        fetchFeatureCollection: failedFetch,
      })
    ).rejects.toThrow(/socio-economic profile.*offline/i);
  });
});
