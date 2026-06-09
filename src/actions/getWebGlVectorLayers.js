import Vector from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import WebGLVectorLayer from 'ol/layer/WebGLVector.js';
import { emitLayerError, LAYER_ERROR_TYPES } from './layerErrorBus';

// ─── Styles ───────────────────────────────────────────────────────────────────

const mwsStyle = {
  'stroke-color': [74, 144, 226, 1],
  'stroke-width': 2,
  'fill-color': [85, 152, 229, 0.2],
};

const waterbodyStyle = {
  'stroke-color': [246, 252, 83, 0.8],
  'stroke-width': 2,
  'fill-color': [246, 252, 83, 0.45],
};

const drainageStyle = {
  'stroke-color': [
    'match',
    ['get', 'ORDER'],
    1, '#03045E',
    2, '#023E8A',
    3, '#0077B6',
    4, '#0096C7',
    5, '#00B4D8',
    6, '#48CAE4',
    7, '#90E0EF',
    8, '#ADE8F4',
    9, '#CAF0F8',
    '#ffffff99',
  ],
  'stroke-width': 2,
};

// ─── Typed error ──────────────────────────────────────────────────────────────

export class LayerLoadError extends Error {
  constructor(message, type, layerName, httpStatus) {
    super(message);
    this.name = 'LayerLoadError';
    this.layerErrorType = type;
    this.layerName = layerName;
    this.httpStatus = httpStatus;
  }
}

// ─── GeoServer response parser ────────────────────────────────────────────────
async function parseGeoServerResponse(response, layer_name, layer_store) {
  let text;
  try {
    text = await response.text();
  } catch (readError) {
    const err = new LayerLoadError(
      `Failed to read response body for ${layer_name}: ${readError.message}`,
      LAYER_ERROR_TYPES.PARSE_ERROR,
      layer_name
    );
    emitLayerError({
      type: LAYER_ERROR_TYPES.PARSE_ERROR,
      layerName: layer_name,
      store: layer_store,
      originalError: readError,
    });
    throw err;
  }

  // XML prefix means GeoServer returned a ServiceException — reclassify
  // as FETCH_FAILED (missing/unavailable layer) not PARSE_ERROR.
  if (text.trimStart().startsWith('<')) {
    const msgMatch = text.match(/<ServiceException[^>]*>([\s\S]*?)<\/ServiceException>/i);
    const geoServerMsg = msgMatch
      ? msgMatch[1].trim().replace(/\s+/g, ' ')
      : 'GeoServer returned an XML error instead of GeoJSON';

    const err = new LayerLoadError(
      `Layer "${layer_name}" not found or unavailable: ${geoServerMsg}`,
      LAYER_ERROR_TYPES.FETCH_FAILED,
      layer_name,
      200
    );
    emitLayerError({
      type: LAYER_ERROR_TYPES.FETCH_FAILED,
      layerName: layer_name,
      store: layer_store,
      httpStatus: 200,
      originalError: err,
    });
    throw err;
  }

  // Normal path — parse as JSON
  try {
    return JSON.parse(text);
  } catch (parseError) {
    const err = new LayerLoadError(
      `Failed to parse GeoJSON for ${layer_name}: ${parseError.message}`,
      LAYER_ERROR_TYPES.PARSE_ERROR,
      layer_name
    );
    emitLayerError({
      type: LAYER_ERROR_TYPES.PARSE_ERROR,
      layerName: layer_name,
      store: layer_store,
      originalError: parseError,
    });
    throw err;
  }
}

// ─── Main function ────────────────────────────────────────────────────────────

export default async function getWebGlPolygonLayers(layer_store, layer_name) {
  // ── Config guard ──────────────────────────────────────────────────────────
  if (!process.env.REACT_APP_GEOSERVER_URL) {
    const err = new LayerLoadError(
      'REACT_APP_GEOSERVER_URL is not set',
      LAYER_ERROR_TYPES.CONFIG_ERROR,
      layer_name
    );
    emitLayerError({
      type: LAYER_ERROR_TYPES.CONFIG_ERROR,
      layerName: 'REACT_APP_GEOSERVER_URL',
      store: layer_store,
      originalError: err,
    });
    throw err;
  }

  const url =
    `${process.env.REACT_APP_GEOSERVER_URL}${layer_store}` +
    `/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=` +
    `${layer_store}:${layer_name}&outputFormat=application/json&screen=main`;

  // ── Fetch ─────────────────────────────────────────────────────────────────
  let response;
  try {
    response = await fetch(url);
  } catch (networkError) {
    const err = new LayerLoadError(
      `Network error loading ${layer_name}: ${networkError.message}`,
      LAYER_ERROR_TYPES.NETWORK_ERROR,
      layer_name
    );
    emitLayerError({
      type: LAYER_ERROR_TYPES.NETWORK_ERROR,
      layerName: layer_name,
      store: layer_store,
      originalError: networkError,
    });
    throw err;
  }

  // ── HTTP status ───────────────────────────────────────────────────────────
  if (!response.ok) {
    const err = new LayerLoadError(
      `HTTP ${response.status} loading layer: ${layer_name}`,
      LAYER_ERROR_TYPES.FETCH_FAILED,
      layer_name,
      response.status
    );
    emitLayerError({
      type: LAYER_ERROR_TYPES.FETCH_FAILED,
      layerName: layer_name,
      store: layer_store,
      httpStatus: response.status,
      originalError: err,
    });
    throw err;
  }

  // ── Parse ─────────────────────────────────────────────────────────────────
  const json = await parseGeoServerResponse(response, layer_name, layer_store);

  // ── Feature read ──────────────────────────────────────────────────────────
  let features;
  try {
    features = new GeoJSON().readFeatures(json);
  } catch (readError) {
    const err = new LayerLoadError(
      `Failed to read features for ${layer_name}: ${readError.message}`,
      LAYER_ERROR_TYPES.PARSE_ERROR,
      layer_name
    );
    emitLayerError({
      type: LAYER_ERROR_TYPES.PARSE_ERROR,
      layerName: layer_name,
      store: layer_store,
      originalError: readError,
    });
    throw err;
  }

  // ── Style selection ───────────────────────────────────────────────────────
  let style = mwsStyle;
  if (layer_store === 'swb') {
    style = waterbodyStyle;
  } else if (layer_store === 'drainage') {
    style = drainageStyle;
  }

  return new WebGLVectorLayer({
    source: new Vector({ features }),
    style,
    renderBuffer: 200,
  });
}