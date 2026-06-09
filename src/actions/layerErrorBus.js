/**
 * layerErrorBus.js
 *
 * Lightweight pub/sub bridge between non-React helper functions
 * (getVectorLayers, getImageLayer, etc.) and the React component tree.
 *
 * Why a custom EventTarget instead of a state manager or direct toast calls?
 *   - Helper functions have no access to React context or Recoil atoms.
 *   - We don't want to import react-hot-toast directly into map utilities
 *     (keeps helpers framework-agnostic and testable in isolation).
 *   - EventTarget is natively available — zero extra dependencies.
 *
 * Usage in a helper:
 *   import { emitLayerError, LAYER_ERROR_TYPES } from './layerErrorBus';
 *   emitLayerError({ type: LAYER_ERROR_TYPES.FETCH_FAILED, layerName: 'mws_boundary', ... });
 *
 * Usage in React:
 *   import { useLayerErrors } from '../hooks/useLayerErrors';
 *   const { errors, dismiss, retry } = useLayerErrors();
 */

// ─── Error type constants ────────────────────────────────────────────────────

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

// ─── Resolution hints ────────────────────────────────────────────────────────
// Shown to the user alongside the error.  Keeps troubleshooting knowledge
// close to the error taxonomy rather than scattered across components.

export const RESOLUTION_HINTS = {
  [LAYER_ERROR_TYPES.FETCH_FAILED]: (layerName, status) =>
    `GeoServer returned HTTP ${status} for layer "${layerName}". ` +
    `Check that the layer exists in the correct workspace and the WFS/WMS service is enabled.`,

  [LAYER_ERROR_TYPES.NETWORK_ERROR]: (layerName) =>
    `Could not reach the server while loading "${layerName}". ` +
    `Verify your network connection and that REACT_APP_GEOSERVER_URL is reachable.`,

  [LAYER_ERROR_TYPES.PARSE_ERROR]: (layerName) =>
    `GeoServer returned unexpected data for "${layerName}". ` +
    `The layer may be empty, misconfigured, or returning an OGC exception.`,

  [LAYER_ERROR_TYPES.IMAGE_LOAD_ERROR]: (layerName) =>
    `WMS image tile failed for "${layerName}". ` +
    `GeoServer may be restarting or the layer style contains an error.`,

  [LAYER_ERROR_TYPES.API_ERROR]: (endpoint, status) =>
    `API call to "${endpoint}" failed with HTTP ${status}. ` +
    `Falling back to cached data — some information may be outdated.`,

  [LAYER_ERROR_TYPES.CONFIG_ERROR]: (variable) =>
    `Environment variable "${variable}" is missing or empty. ` +
    `Check your .env file and restart the dev server.`,
};

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
  // Always log a structured entry — useful even when the UI suppresses it.
  console.error('[LayerError]', {
    type: payload.type,
    layer: payload.layerName,
    store: payload.store,
    status: payload.httpStatus,
    error: payload.originalError,
  });

  layerErrorBus.emit(payload);
}