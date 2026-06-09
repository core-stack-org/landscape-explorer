import ImageLayer from 'ol/layer/Image';
import ImageWMS from 'ol/source/ImageWMS';
import { emitLayerError, LAYER_ERROR_TYPES } from './layerErrorBus';

/**
 * @param {string}  layer_store  - GeoServer workspace name
 * @param {string}  layer_name   - GeoServer layer name
 * @param {boolean} [setVisible] - Initial visibility (default false)
 * @param {string}  [style]      - Named GeoServer style (default '')
 * @returns {ImageLayer}
 */
export default function getImageLayer(layer_store, layer_name, setVisible = false, style = '') {
  const geoserverUrl = process.env.REACT_APP_GEOSERVER_URL;

  if (!geoserverUrl) {
    emitLayerError({
      type: LAYER_ERROR_TYPES.CONFIG_ERROR,
      layerName: 'REACT_APP_GEOSERVER_URL',
      store: layer_store,
    });
    // Return a no-op invisible layer so callers don't need null checks
    return new ImageLayer({ visible: false, name: layer_name });
  }

  const source = new ImageWMS({
    url: `${geoserverUrl}wms`,
    params: {
      LAYERS: `${layer_store}:${layer_name}`,
      STYLES: style,
    },
    ratio: 1,
    serverType: 'geoserver',
  });

  // OL fires this when the WMS image request returns a non-2xx status,
  // the response is not a valid image, or the network request fails entirely.
  source.on('imageloaderror', (event) => {
    // event.image.src contains the failed request URL — useful for debugging
    // but we don't expose it in the toast to avoid leaking internal URLs.
    emitLayerError({
      type: LAYER_ERROR_TYPES.IMAGE_LOAD_ERROR,
      layerName: layer_name,
      store: layer_store,
      originalError: new Error(`WMS image load error for ${layer_name}`),
      // No retryFn here: OL will automatically retry on the next map move/zoom.
      // Providing a manual retry would just reload the same tile immediately,
      // which is unlikely to help if GeoServer is mid-restart.
    });
  });

  return new ImageLayer({
    source,
    visible: setVisible,
    name: layer_name,
  });
}