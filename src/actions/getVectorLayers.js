import { Fill, Stroke, Style } from "ol/style.js";

import Vector from "ol/source/Vector";
import VectorLayer from 'ol/layer/Vector';
import GeoJSON from 'ol/format/GeoJSON';

const LAYER_CACHE_TTL_MS = 5 * 60 * 1000;
const layerResponseCache = new Map();
const pendingLayerRequests = new Map();

function pruneExpiredLayerCache(now = Date.now()) {
  for (const [key, entry] of layerResponseCache.entries()) {
    if (now - entry.timestamp >= LAYER_CACHE_TTL_MS) {
      layerResponseCache.delete(key);
    }
  }
}

/** Fired on window when a vector WFS request fails (Map listens to show the existing layer error panel). */
export const VECTOR_LAYER_LOAD_ERROR_EVENT = "landscape-explorer:vector-layer-load-error";

function emitVectorLayerLoadError(layerName, message) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(VECTOR_LAYER_LOAD_ERROR_EVENT, {
      detail: {
        layerName,
        message: String(message || "Load failed").slice(0, 200),
      },
    })
  );
}

async function fetchLayerGeoJson(url, layerName, forceRefresh = false) {
  const now = Date.now();
  pruneExpiredLayerCache(now);
  const cachedEntry = layerResponseCache.get(url);

  if (
    !forceRefresh &&
    cachedEntry &&
    now - cachedEntry.timestamp < LAYER_CACHE_TTL_MS
  ) {
    return cachedEntry.json;
  }

  if (!forceRefresh && pendingLayerRequests.has(url)) {
    return pendingLayerRequests.get(url);
  }

  const requestPromise = fetch(url)
    .then((response) => {
      if (!response.ok) {
        console.log('Network response was not ok for ' + layerName);
        emitVectorLayerLoadError(layerName, `HTTP ${response.status}`);
        return null;
      }
      return response.json();
    })
    .then((json) => {
      if (json) {
        layerResponseCache.set(url, { json, timestamp: Date.now() });
      }
      return json;
    })
    .catch((error) => {
      console.log(`Failed to load the "${layerName}" layer. Please check your connection or the map layer details.`, error);
      emitVectorLayerLoadError(layerName, error?.message || "Network error");
      return null;
    })
    .finally(() => {
      pendingLayerRequests.delete(url);
    });

  pendingLayerRequests.set(url, requestPromise);
  return requestPromise;
}

const PanchayatBoundariesStyle = (feature, resolution) => {
  let nameStyle;
  try {
    nameStyle = new Style({
      stroke: new Stroke({
        color: "#292929",
        width: 2.0,
      }),
      fill: new Fill({
        color: "rgba(255, 255, 255, 0)",
      }),
    });
  } catch (e) {
    nameStyle = new Style({
      stroke: new Stroke({
        color: "#292929",
        width: 2.0,
      }),
      fill: new Fill({
        color: "rgba(255, 255, 255, 0)",
      }),
    });
  }
  return nameStyle;
}

export default async function getVectorLayers(layer_store, layer_name, setVisible = true, setActive = true, resource_type = null, plan_id = null, district, block, forceRefresh = false) {

  let url =
    (plan_id === null ?
      `${process.env.REACT_APP_GEOSERVER_URL}` + layer_store + '/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=' + layer_store + ':' + layer_name + "&outputFormat=application/json&screen=main"
      :
      `${process.env.REACT_APP_GEOSERVER_URL}` + layer_store + '/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=' + layer_store + ':' + resource_type + "_" + plan_id + "_" + district + "_" + block + "&outputFormat=application/json&screen=main")
  const vectorSource = new Vector({
    format: new GeoJSON(),
    loader: function (extent, resolution, projection, success, failure) {
      fetchLayerGeoJson(url, layer_name, forceRefresh)
        .then((json) => {
          if (!json) {
            failure();
            return;
          }
          try {
            const fmt = vectorSource.getFormat();
            const features = fmt.readFeatures(json, {
              extent,
              featureProjection: projection,
            });
            vectorSource.addFeatures(features);
            success(features);
          } catch (err) {
            emitVectorLayerLoadError(layer_name, err?.message || "Invalid GeoJSON");
            failure();
          }
        })
        .catch(() => {
          failure();
        });
    },
  });


  const wmsLayer = new VectorLayer({
    source: vectorSource,
    visible: setVisible,
    hover: setActive,
    myData: Math.random()
  });

  if (layer_store === "panchayat_boundaries") {
    wmsLayer.setStyle(PanchayatBoundariesStyle);
  } else {
    wmsLayer.setStyle((feature) => {
      return new Style({
        stroke: new Stroke({
          color: "black",
          width: 1.2,
        }),
        fill: new Fill({
          color: "rgba(0, 0, 255, 0.25)",
        }),
      });
    });
  }

  return wmsLayer;
}