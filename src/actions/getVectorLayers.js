import { Fill, Stroke, Style } from 'ol/style.js';
import Vector from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import { emitLayerError, LAYER_ERROR_TYPES } from './layerErrorBus';

const panchayatBoundariesStyle = new Style({
  stroke: new Stroke({ color: '#292929', width: 2.0 }),
  fill: new Fill({ color: 'rgba(255, 255, 255, 0)' }),
});

const defaultVectorStyle = new Style({
  stroke: new Stroke({ color: 'black', width: 1.2 }),
  fill: new Fill({ color: 'rgba(0, 0, 255, 0.25)' }),
});

/**
 * Builds a WFS URL from the given parameters.
 * Extracted so the retryFn can re-use it without re-running the full function.
 */
function buildUrl(layer_store, layer_name, resource_type, plan_id, district, block) {
  const base = process.env.REACT_APP_GEOSERVER_URL;
  if (plan_id === null) {
    return (
      `${base}${layer_store}/ows?service=WFS&version=1.0.0&request=GetFeature` +
      `&typeName=${layer_store}:${layer_name}&outputFormat=application/json&screen=main`
    );
  }
  return (
    `${base}${layer_store}/ows?service=WFS&version=1.0.0&request=GetFeature` +
    `&typeName=${layer_store}:${resource_type}_${plan_id}_${district}_${block}` +
    `&outputFormat=application/json&screen=main`
  );
}

/**
 * Fetches GeoJSON from GeoServer and adds features to vectorSource.
 * Returns true on success, false on any failure.
 * Separated so it can be called both from the OL loader and the retryFn.
 *
 * @param {string}       url
 * @param {string}       layer_name
 * @param {string}       layer_store
 * @param {Vector}       vectorSource
 * @param {number[]}     extent         - The OL extent passed to the loader
 * @returns {Promise<boolean>}
 */
async function loadFeatures(url, layer_name, layer_store, vectorSource, extent) {
  let response;

  // ── Network fetch ──────────────────────────────────────────────────────
  try {
    response = await fetch(url);
  } catch (networkError) {
    emitLayerError({
      type: LAYER_ERROR_TYPES.NETWORK_ERROR,
      layerName: layer_name,
      store: layer_store,
      originalError: networkError,
      retryFn: () => loadFeatures(url, layer_name, layer_store, vectorSource, extent),
    });
    // Mark extent as not loaded so OL retries on next map interaction
    vectorSource.removeLoadedExtent(extent);
    return false;
  }

  // ── HTTP status ────────────────────────────────────────────────────────
  if (!response.ok) {
    emitLayerError({
      type: LAYER_ERROR_TYPES.FETCH_FAILED,
      layerName: layer_name,
      store: layer_store,
      httpStatus: response.status,
      originalError: new Error(`HTTP ${response.status} for layer ${layer_name}`),
      retryFn: () => loadFeatures(url, layer_name, layer_store, vectorSource, extent),
    });
    vectorSource.removeLoadedExtent(extent);
    return false;
  }

  // ── Parse & add features ───────────────────────────────────────────────
  let json;
  try {
    json = await response.json();
  } catch (parseError) {
    emitLayerError({
      type: LAYER_ERROR_TYPES.PARSE_ERROR,
      layerName: layer_name,
      store: layer_store,
      originalError: parseError,
      retryFn: () => loadFeatures(url, layer_name, layer_store, vectorSource, extent),
    });
    vectorSource.removeLoadedExtent(extent);
    return false;
  }

  try {
    const features = vectorSource.getFormat().readFeatures(json);
    vectorSource.addFeatures(features);
  } catch (readError) {
    emitLayerError({
      type: LAYER_ERROR_TYPES.PARSE_ERROR,
      layerName: layer_name,
      store: layer_store,
      originalError: readError,
    });
    vectorSource.removeLoadedExtent(extent);
    return false;
  }

  return true;
}

/**
 * @param {string}  layer_store
 * @param {string}  layer_name
 * @param {boolean} [setVisible]
 * @param {boolean} [setActive]
 * @param {string|null} [resource_type]
 * @param {string|null} [plan_id]
 * @param {string}  [district]
 * @param {string}  [block]
 * @returns {Promise<VectorLayer>}
 */
export default async function getVectorLayers(
  layer_store,
  layer_name,
  setVisible = true,
  setActive = true,
  resource_type = null,
  plan_id = null,
  district,
  block
) {
  // ── Config guard ─────────────────────────────────────────────────────────
  if (!process.env.REACT_APP_GEOSERVER_URL) {
    emitLayerError({
      type: LAYER_ERROR_TYPES.CONFIG_ERROR,
      layerName: 'REACT_APP_GEOSERVER_URL',
      store: layer_store,
    });
    return new VectorLayer({ visible: false, name: layer_name });
  }

  const url = buildUrl(layer_store, layer_name, resource_type, plan_id, district, block);

  const vectorSource = new Vector({
    format: new GeoJSON(),
    loader: function (extent, resolution, projection) {
      // We do NOT pass url to the Vector constructor — if we did, OL would
      // also try to fetch it internally, resulting in a double request.
      // Using loader-only mode gives us full control over error handling.
      loadFeatures(url, layer_name, layer_store, vectorSource, extent);
    },
  });

  const wmsLayer = new VectorLayer({
    source: vectorSource,
    visible: setVisible,
    hover: setActive,
    myData: Math.random(),
  });

  if (layer_store === 'panchayat_boundaries') {
    wmsLayer.setStyle(panchayatBoundariesStyle);
  } else {
    wmsLayer.setStyle(defaultVectorStyle);
  }

  return wmsLayer;
}