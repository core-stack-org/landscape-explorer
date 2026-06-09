import Vector from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import WebGLPointsLayer from 'ol/layer/WebGLPoints.js';
import { emitLayerError, LAYER_ERROR_TYPES } from './layerErrorBus';

// ─── Color mappings ───────────────────────────────────────────────────────────

const colorMappings = {
  nrega_assets: {
    field: 'WorkCatego',
    mapping: {
      'Household Livelihood':         1,
      'Others - HH, Community':       2,
      'Agri Impact - HH, Community':  3,
      'SWC - Landscape level impact': 4,
      'Irrigation - Site level impact': 5,
      'Plantation':                   6,
      'Un Identified':                7,
      Default:                        8,
    },
  },
  lcw:         { field: 'uid', mapping: { Default: 1 } },
  factory_csr: { field: 'uid', mapping: { Default: 1 } },
  mining:      { field: 'uid', mapping: { Default: 1 } },
};

const styleConfigs = {
  nrega_assets: {
    'shape-points': 12,
    'shape-radius': 6,
    'shape-fill-color': [
      'match', ['get', 'itemColor'],
      4, '#6495ED',
      1, '#C2678D',
      3, '#FFA500',
      5, '#1A759F',
      6, '#52B69A',
      2, '#355070',
      7, '#6D597A',
      '#00000000',
    ],
  },
  lcw:         { 'shape-points': 20, 'shape-radius': 10, 'shape-fill-color': '#FF0000' },
  factory_csr: { 'shape-points': 20, 'shape-radius': 10, 'shape-fill-color': '#FF0000' },
  mining:      { 'shape-points': 20, 'shape-radius': 10, 'shape-fill-color': '#FF0000' },
};

// ─── URL builder ──────────────────────────────────────────────────────────────

function buildUrl(layer_store, layer_name) {
  const base = process.env.REACT_APP_GEOSERVER_URL;
  switch (layer_store) {
    case 'lcw':
      return `${base}${layer_store}/ows?service=WFS&version=1.0.0&request=GetFeature` +
             `&typeName=${layer_store}:${layer_name}_lcw_conflict&outputFormat=application/json&screen=main`;
    case 'factory_csr':
      return `${base}${layer_store}/ows?service=WFS&version=1.0.0&request=GetFeature` +
             `&typeName=${layer_store}:${layer_name}_factory_csr&outputFormat=application/json&screen=main`;
    case 'mining':
      return `${base}${layer_store}/ows?service=WFS&version=1.0.0&request=GetFeature` +
             `&typeName=${layer_store}:${layer_name}_mining&outputFormat=application/json&screen=main`;
    default:
      return `${base}${layer_store}/ows?service=WFS&version=1.0.0&request=GetFeature` +
             `&typeName=${layer_store}:${layer_name}&outputFormat=application/json&screen=main`;
  }
}

// ─── Feature loader ───────────────────────────────────────────────────────────

/**
 * Fetches and loads features for a WebGLPointsLayer.
 * Separated so both the initial load and the retryFn can call it.
 *
 * @param {string}   url
 * @param {string}   layer_name
 * @param {string}   layer_store
 * @param {Vector}   vectorSource
 * @param {number[]} extent
 * @param {Object}   colorConfig
 * @returns {Promise<boolean>} true on success
 */
async function loadPointFeatures(url, layer_name, layer_store, vectorSource, extent, colorConfig) {
  // ── Network ─────────────────────────────────────────────────────────────
  let response;
  try {
    response = await fetch(url);
  } catch (networkError) {
    emitLayerError({
      type: LAYER_ERROR_TYPES.NETWORK_ERROR,
      layerName: layer_name,
      store: layer_store,
      originalError: networkError,
      retryFn: () => loadPointFeatures(url, layer_name, layer_store, vectorSource, extent, colorConfig),
    });
    vectorSource.removeLoadedExtent(extent);
    return false;
  }

  // ── HTTP status ──────────────────────────────────────────────────────────
  if (!response.ok) {
    emitLayerError({
      type: LAYER_ERROR_TYPES.FETCH_FAILED,
      layerName: layer_name,
      store: layer_store,
      httpStatus: response.status,
      originalError: new Error(`HTTP ${response.status} for ${layer_name}`),
      retryFn: () => loadPointFeatures(url, layer_name, layer_store, vectorSource, extent, colorConfig),
    });
    vectorSource.removeLoadedExtent(extent);
    return false;
  }

  // ── Parse ────────────────────────────────────────────────────────────────
  let json;
  try {
    json = await response.json();
  } catch (parseError) {
    emitLayerError({
      type: LAYER_ERROR_TYPES.PARSE_ERROR,
      layerName: layer_name,
      store: layer_store,
      originalError: parseError,
      retryFn: () => loadPointFeatures(url, layer_name, layer_store, vectorSource, extent, colorConfig),
    });
    vectorSource.removeLoadedExtent(extent);
    return false;
  }

  // ── Add features ─────────────────────────────────────────────────────────
  try {
    const features = vectorSource.getFormat().readFeatures(json).map((item) => {
      if (layer_store === 'nrega_assets') {
        const fieldValue = item.values_[colorConfig.field];
        item.values_.itemColor =
          colorConfig.mapping[fieldValue] ?? colorConfig.mapping['Default'];
      } else {
        item.values_.itemColor = 1;
      }
      return item;
    });
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

// ─── Main function ────────────────────────────────────────────────────────────

/**
 * @param {string} layer_store
 * @param {string} layer_name
 * @returns {Promise<WebGLPointsLayer>}
 */
export default async function getWebGlLayers(layer_store, layer_name) {
  // ── Config guard ─────────────────────────────────────────────────────────
  if (!process.env.REACT_APP_GEOSERVER_URL) {
    emitLayerError({
      type: LAYER_ERROR_TYPES.CONFIG_ERROR,
      layerName: 'REACT_APP_GEOSERVER_URL',
      store: layer_store,
    });
    return new WebGLPointsLayer({
      source: new Vector({ format: new GeoJSON() }),
      style: styleConfigs[layer_store] || styleConfigs.nrega_assets,
    });
  }

  const url = buildUrl(layer_store, layer_name);
  const colorConfig = colorMappings[layer_store] || colorMappings.nrega_assets;
  const style = styleConfigs[layer_store] || styleConfigs.nrega_assets;

  const vectorSource = new Vector({
    format: new GeoJSON(),
    loader: function (extent, resolution, projection) {
      // OL's loader is synchronous — we use a void IIFE to run async code
      // without making the loader itself async (which OL does not support).
      void loadPointFeatures(url, layer_name, layer_store, vectorSource, extent, colorConfig);
    },
  });

  return new WebGLPointsLayer({
    source: vectorSource,
    style,
  });
}