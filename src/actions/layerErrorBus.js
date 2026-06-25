export const LAYER_ERROR_TYPES = {
  /** WFS/WMS fetch returned a non-2xx status */
  FETCH_FAILED: 'FETCH_FAILED',
  /** fetch() itself threw (network offline, CORS, DNS failure) */
  NETWORK_ERROR: 'NETWORK_ERROR',
  /** GeoJSON parsing or OL feature reading threw */
  PARSE_ERROR: 'PARSE_ERROR',
  /** ImageWMS tile failed to load (fires from OL's imageloaderror event) */
  IMAGE_LOAD_ERROR: 'IMAGE_LOAD_ERROR',
  /** Django API (/proposed_blocks/ etc.) returned non-2xx */
  API_ERROR: 'API_ERROR',
  /** Environment variable missing or malformed */
  CONFIG_ERROR: 'CONFIG_ERROR',
};


export const RESOLUTION_HINTS = {
  [LAYER_ERROR_TYPES.FETCH_FAILED]: () =>
    `This layer hasn't been generated for this location yet.`,

  [LAYER_ERROR_TYPES.NETWORK_ERROR]: () =>
    `Couldn't reach the server. Check your internet connection and try again.`,

  [LAYER_ERROR_TYPES.PARSE_ERROR]: () =>
    `This layer isn't available for this location yet.`,

  [LAYER_ERROR_TYPES.IMAGE_LOAD_ERROR]: () =>
    `This layer hasn't been generated for this location yet.`,

  [LAYER_ERROR_TYPES.API_ERROR]: () =>
    `Some data couldn't be loaded. You can keep using the dashboard normally.`,

  [LAYER_ERROR_TYPES.CONFIG_ERROR]: () =>
    `Something's misconfigured on our end. Please contact support.`,
};

export const LAYER_DISPLAY_NAMES = {
  terrain:              'Terrain',
  LULC:                 'Land Use / Land Cover',
  restoration:          'Restoration',
  drought:              'Drought',
  green_credit:         'Green Credit',
  terrain_lulc:         'Terrain LULC',
  river:                'River',
  canal:                'Canal',
  panchayat_boundaries: 'Village Boundaries',
  mws_layers:           'Microwatershed Boundaries',
  swb:                  'Surface Waterbodies',
  drainage:             'Drainage',
  nrega_assets:         'NREGA Assets',
  lcw:                  'Land Conflict Watch',
  factory_csr:          'Factory CSR',
  mining:               'Mining',
  change_detection:     'Change Detection',
  mws_connectivity:     'MWS Connectivity',
  mws_centroid:         'MWS Centroid',
  facilities_proximity : 'Facilities Layer'
};

export function getFriendlyLayerName(store) {
  if (!store) return 'This layer';
  const baseKey = Object.keys(LAYER_DISPLAY_NAMES).find((key) =>
    store.toLowerCase().startsWith(key.toLowerCase())
  );
  return baseKey ? LAYER_DISPLAY_NAMES[baseKey] : 'This layer';
}

// ─── The bus itself ──────────────────────────────────────────────────────────

class LayerErrorBus extends EventTarget {
  static EVENT_NAME = 'layer-error';

  /**
   * @param {LayerErrorPayload} payload
   */
  emit(payload) {
    this.dispatchEvent(
      new CustomEvent(LayerErrorBus.EVENT_NAME, {
        detail: {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          timestamp: Date.now(),
          ...payload,
        },
      })
    );
  }

  /**
   * @param {(payload: LayerErrorPayload & { id: string, timestamp: number }) => void} handler
   * @returns {() => void} unsubscribe function
   */
  subscribe(handler) {
    const listener = (e) => handler(e.detail);
    this.addEventListener(LayerErrorBus.EVENT_NAME, listener);
    return () => this.removeEventListener(LayerErrorBus.EVENT_NAME, listener);
  }
}

export const layerErrorBus = new LayerErrorBus();

/**
 * Convenience wrapper so helpers don't have to import the class.
 *
 * @typedef {Object} LayerErrorPayload
 * @property {string} type            - One of LAYER_ERROR_TYPES
 * @property {string} layerName       - Human-readable layer or endpoint identifier
 * @property {string} [store]         - GeoServer workspace / store name
 * @property {number} [httpStatus]    - HTTP status code if available
 * @property {Error}  [originalError] - The raw Error object for console/Sentry
 * @property {Function} [retryFn]     - Zero-arg async function to retry the operation
 */

/**
 * @param {LayerErrorPayload} payload
 */
export function emitLayerError(payload) {
  console.error('[LayerError]', {
    type: payload.type,
    layer: payload.layerName,
    store: payload.store,
    status: payload.httpStatus,
    error: payload.originalError,
  });

  layerErrorBus.emit(payload);
}