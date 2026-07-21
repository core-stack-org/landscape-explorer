import {
  buildGeoLibreProject,
  formatGeoServerName,
  geoJsonBounds,
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

  it("builds official embedded WFS layers and lazy hidden WMS layers", async () => {
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
      },
    });
    expect(socioeconomic.geojson.type).toBe("FeatureCollection");

    const visibleLayers = project.layers.filter((layer) => layer.visible);
    expect(visibleLayers.map((layer) => layer.id)).toEqual([
      "corestack-demographics",
    ]);
    expect(project.layers.every((layer) => layer.opacity === 1)).toBe(true);

    const latestLulc = project.layers.find(
      (layer) => layer.id === "corestack-lulc_level_3_24_25"
    );
    expect(latestLulc).toMatchObject({ type: "wms", visible: false });
    expect(latestLulc.source.layers).toBe(
      "LULC_level_3:LULC_24_25_cachar_lakhipur_level_3"
    );
    expect(latestLulc.source.tiles[0]).toContain(
      "BBOX={bbox-epsg-3857}"
    );
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
      "corestack-demographics",
      "corestack-administrative_boundaries",
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

  it("fetches socioeconomic first, MWS second, and reuses duplicate WFS requests", async () => {
    await buildGeoLibreProject({
      ...location,
      fetchFeatureCollection: successfulFetch,
    });

    expect(successfulFetch.mock.calls[0][0].typeName).toBe(
      "panchayat_boundaries:cachar_lakhipur"
    );
    expect(successfulFetch.mock.calls[1][0].typeName).toBe(
      "mws_layers:deltaG_well_depth_cachar_lakhipur"
    );
    expect(successfulFetch).toHaveBeenCalledTimes(11);
  });

  it("keeps an unavailable optional vector listed for GeoLibre refresh", async () => {
    const fetchWithDrainageFailure = jest.fn(async (request) => {
      if (request.typeName.startsWith("drainage:")) {
        throw new Error("temporary outage");
      }
      return polygonFeatureCollection(request);
    });

    const project = await buildGeoLibreProject({
      ...location,
      fetchFeatureCollection: fetchWithDrainageFailure,
    });
    const drainage = project.layers.find(
      (layer) => layer.id === "corestack-drainage"
    );

    expect(drainage.geojson.features).toEqual([]);
    expect(drainage.metadata).toMatchObject({
      sourceKind: "wfs-getfeature",
      initialLoadError: "temporary outage",
    });
    expect(project.metadata.layerLoading.initialLoadFailures).toHaveLength(1);
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
