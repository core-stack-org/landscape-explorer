import ImageLayer from 'ol/layer/Image';
import ImageWMS from 'ol/source/ImageWMS';

export default async function getImageLayer(layer_store, layer_name, setVisible = false, style = '') {
  try {
    console.log('Loading Image Layer:', { layer_store, layer_name, style });
    
    // Validate layer_store and layer_name
    if (!layer_store || !layer_name) {
      console.error('Invalid layer parameters:', { layer_store, layer_name });
      return null;
    }

    // Ensure REACT_APP_GEOSERVER_URL is available
    if (!process.env.REACT_APP_GEOSERVER_URL) {
      console.error('GEOSERVER_URL environment variable not set');
      return null;
    }

    const geoserverUrl = process.env.REACT_APP_GEOSERVER_URL.endsWith('/') 
      ? process.env.REACT_APP_GEOSERVER_URL 
      : process.env.REACT_APP_GEOSERVER_URL + '/';

    const wmsLayer = new ImageLayer({
      source: new ImageWMS({
        url: geoserverUrl + 'wms',
        params: { 
          'LAYERS': layer_store + ':' + layer_name,
          'STYLES': style || ''
        },
        ratio: 1,
        serverType: 'geoserver',
      }),
      visible: setVisible,
      name: layer_name,
      zIndex: 1
    });

    console.log('Image Layer created successfully:', layer_name);
    return wmsLayer;
  } catch (error) {
    console.error('Error creating image layer:', error);
    return null;
  }
}