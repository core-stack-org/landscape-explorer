import type { Map as MapLibreMap, MapSourceDataEvent } from "maplibre-gl";
import {
  CORE_GEOSTACK_COLORS,
  getCoreGeoStackRuntimeConfig,
  type CoreGeoStackRuntimeConfig,
} from "./constants";
import { setCoreGeoStackDataStatus } from "./workspace-state";

const TEHSIL_SOURCE_ID = "core-geostack-tehsils";
const TEHSIL_FILL_ID = "core-geostack-tehsils-fill";
const TEHSIL_LINE_ID = "core-geostack-tehsils-line";
const VILLAGE_SOURCE_ID = "core-geostack-villages";
const VILLAGE_LINE_ID = "core-geostack-villages-line";

function pmtilesUrl(url: string): string {
  return url.startsWith("pmtiles://") ? url : `pmtiles://${url}`;
}

function removeLayerIfPresent(map: MapLibreMap, id: string): void {
  if (map.getLayer(id)) map.removeLayer(id);
}

function removeSourceIfPresent(map: MapLibreMap, id: string): void {
  if (map.getSource(id)) map.removeSource(id);
}

function attachTehsilLayers(map: MapLibreMap, config: CoreGeoStackRuntimeConfig): void {
  if (!config.tehsilPmtilesUrl || map.getSource(TEHSIL_SOURCE_ID)) return;
  map.addSource(TEHSIL_SOURCE_ID, {
    type: "vector",
    url: pmtilesUrl(config.tehsilPmtilesUrl),
    attribution: "CoRE Stack administrative boundary index",
  });
  map.addLayer({
    id: TEHSIL_FILL_ID,
    type: "fill",
    source: TEHSIL_SOURCE_ID,
    "source-layer": config.tehsilSourceLayer,
    paint: {
      "fill-color": CORE_GEOSTACK_COLORS.boundary,
      "fill-opacity": 0.025,
    },
  });
  map.addLayer({
    id: TEHSIL_LINE_ID,
    type: "line",
    source: TEHSIL_SOURCE_ID,
    "source-layer": config.tehsilSourceLayer,
    paint: {
      "line-color": CORE_GEOSTACK_COLORS.boundary,
      "line-opacity": 0.9,
      "line-width": ["interpolate", ["linear"], ["zoom"], 3, 0.45, 7, 1.1, 12, 1.7],
    },
  });
}

function attachVillageLayers(map: MapLibreMap, config: CoreGeoStackRuntimeConfig): void {
  if (!config.villagePmtilesUrl || map.getSource(VILLAGE_SOURCE_ID)) return;
  map.addSource(VILLAGE_SOURCE_ID, {
    type: "vector",
    url: pmtilesUrl(config.villagePmtilesUrl),
    attribution: "CoRE Stack village boundary index",
  });
  map.addLayer({
    id: VILLAGE_LINE_ID,
    type: "line",
    source: VILLAGE_SOURCE_ID,
    "source-layer": config.villageSourceLayer,
    minzoom: config.villageMinZoom,
    paint: {
      "line-color": "#e2e8f0",
      "line-opacity": ["interpolate", ["linear"], ["zoom"], config.villageMinZoom, 0.18, 13, 0.7],
      "line-width": ["interpolate", ["linear"], ["zoom"], config.villageMinZoom, 0.35, 14, 1.1],
    },
  });
}

export function mountCoreGeoStackBoundaryLayers(
  map: MapLibreMap,
  config: CoreGeoStackRuntimeConfig = getCoreGeoStackRuntimeConfig(),
): () => void {
  let disposed = false;
  let attached = false;

  const attach = () => {
    if (disposed || attached || !map.isStyleLoaded()) return;
    try {
      attachTehsilLayers(map, config);
      attachVillageLayers(map, config);
      attached = true;
      if (!config.tehsilPmtilesUrl) {
        setCoreGeoStackDataStatus("boundary", {
          kind: "partial",
          message: "Pan-India tehsil tiles are not configured; active-location layers remain available",
        });
      } else {
        setCoreGeoStackDataStatus("boundary", {
          kind: "loading",
          message: config.villagePmtilesUrl
            ? "Tehsil index connected · village detail loads with zoom"
            : "Tehsil index connected · village index is not configured",
        });
      }
    } catch (error) {
      setCoreGeoStackDataStatus("boundary", {
        kind: "error",
        message: `Boundary index could not attach: ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
    }
  };

  const onStyleLoad = () => {
    attached = false;
    attach();
  };

  const onSourceData = (event: MapSourceDataEvent) => {
    if (event.sourceId !== TEHSIL_SOURCE_ID || !map.isSourceLoaded(TEHSIL_SOURCE_ID)) return;
    setCoreGeoStackDataStatus("boundary", {
      kind: config.villagePmtilesUrl ? "live" : "partial",
      message: config.villagePmtilesUrl
        ? "Tehsils ready · villages load progressively for the current view"
        : "Tehsils ready · village boundary index is not configured",
      updatedAt: new Date().toISOString(),
    });
  };

  // Publish the missing-index state immediately; it does not depend on the map
  // style finishing its asynchronous load.
  if (!config.tehsilPmtilesUrl) {
    setCoreGeoStackDataStatus("boundary", {
      kind: "partial",
      message: "Pan-India tehsil tiles are not configured; active-location layers remain available",
    });
  }

  map.on("style.load", onStyleLoad);
  map.on("load", attach);
  map.on("idle", attach);
  map.on("sourcedata", onSourceData);
  attach();

  return () => {
    disposed = true;
    map.off("style.load", onStyleLoad);
    map.off("load", attach);
    map.off("idle", attach);
    map.off("sourcedata", onSourceData);
    removeLayerIfPresent(map, VILLAGE_LINE_ID);
    removeLayerIfPresent(map, TEHSIL_LINE_ID);
    removeLayerIfPresent(map, TEHSIL_FILL_ID);
    removeSourceIfPresent(map, VILLAGE_SOURCE_ID);
    removeSourceIfPresent(map, TEHSIL_SOURCE_ID);
  };
}
