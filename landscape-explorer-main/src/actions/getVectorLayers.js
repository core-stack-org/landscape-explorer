import { Fill, Stroke, Style } from "ol/style.js";

import Vector from "ol/source/Vector";
import VectorLayer from 'ol/layer/Vector';
import GeoJSON from 'ol/format/GeoJSON';

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

export default async function getVectorLayers(layer_store, layer_name, setVisible = true, setActive = true, resource_type = null, plan_id = null, district, block) {

  try {
    // Validate inputs
    if (!layer_store || !layer_name) {
      console.error('Invalid layer parameters:', { layer_store, layer_name });
      return null;
    }

    if (!process.env.REACT_APP_GEOSERVER_URL) {
      console.error('GEOSERVER_URL environment variable not set');
      return null;
    }

    const geoserverUrl = process.env.REACT_APP_GEOSERVER_URL.endsWith('/') 
      ? process.env.REACT_APP_GEOSERVER_URL 
      : process.env.REACT_APP_GEOSERVER_URL + '/';

    let url = plan_id === null
      ? `${geoserverUrl}${layer_store}/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=${layer_store}:${layer_name}&outputFormat=application/json&screen=main`
      : `${geoserverUrl}${layer_store}/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=${layer_store}:${resource_type}_${plan_id}_${district}_${block}&outputFormat=application/json&screen=main`;

    console.log('Loading Vector Layer:', { layer_store, layer_name, url });

    const vectorSource = new Vector({
      url: url,
      format: new GeoJSON(),
      loader: function (extent, resolution, projection) {
        fetch(url)
          .then(response => {
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status} for layer: ${layer_name}`);
            }
            return response.json();
          })
          .then(json => {
            if (!json || !json.features) {
              console.warn(`No features found for layer: ${layer_name}`);
              return;
            }
            console.log(`Loaded ${json.features.length} features for layer: ${layer_name}`);
            vectorSource.addFeatures(vectorSource.getFormat().readFeatures(json));
          })
          .catch(error => {
            console.error(`Failed to load the "${layer_name}" layer. URL: ${url}`, error);
          });
      }
    });

    const wmsLayer = new VectorLayer({
      source: vectorSource,
      visible: setVisible,
      hover: setActive,
      myData: Math.random()
    });

    if (layer_store === "panchayat_boundaries") {
      wmsLayer.setStyle(PanchayatBoundariesStyle);
    }

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
    
    return wmsLayer;
  } catch (error) {
    console.error('Error creating vector layer:', error);
    return null;
  }
}