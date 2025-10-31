import Vector from "ol/source/Vector";
import GeoJSON from 'ol/format/GeoJSON';
import WebGLPointsLayer from 'ol/layer/WebGLPoints.js';

// Color mappings for different stores
const colorMappings = {
  nrega_assets: {
    field: "WorkCatego",
    mapping: {
      "Household Livelihood": 1, // Maroon
      "Others - HH, Community": 2, // Blue-Grey
      "Agri Impact - HH, Community": 3, // Yellow
      "SWC - Landscape level impact": 4, // Brown
      "Irrigation - Site level impact": 5, // Blue
      "Plantation": 6, // Green
      "Un Identified": 7, // Lavender
      "Default": 8, // Tan
    }
  },
  lcw: {
    field: "uid",
    mapping: {
      "Default": 1,
    }
  }
};

// Style configurations for different stores
const styleConfigs = {
  nrega_assets: {
    "shape-points": 12,
    "shape-radius": 6,
    "shape-fill-color": [
      "match",
      ["get", "itemColor"],
      4, "#6495ED",
      1, "#C2678D",
      3, "#FFA500",
      5, "#1A759F",
      6, "#52B69A",
      2, "#355070",
      7, "#6D597A",
      "#00000000"
    ]
  },
  lcw: {
    "shape-points": 20,
    "shape-radius": 10,
    "shape-fill-color": "#FF0000", // Red color for all LCW conflicts
  }
};

export default async function getWebGlLayers(layer_store, layer_name) {
  let url;
  if (layer_store === 'lcw') {
    url = `${process.env.REACT_APP_GEOSERVER_URL}` + layer_store + 
      '/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=' + 
      layer_store + ':' + layer_name + "_lcw_conflict&outputFormat=application/json&screen=main";
  } else {
    // For nrega_assets and other stores, use layer_name as-is
    url = `${process.env.REACT_APP_GEOSERVER_URL}` + layer_store + 
      '/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=' + 
      layer_store + ':' + layer_name + "&outputFormat=application/json&screen=main";
  }

  // Get the appropriate color mapping for this store
  const colorConfig = colorMappings[layer_store] || colorMappings.nrega_assets;
  const styleConfig = styleConfigs[layer_store] || styleConfigs.nrega_assets;

  const vectorSource = new Vector({
    url: url,
    format: new GeoJSON(),
    loader: async function (extent, resolution, projection) {

      await fetch(url)
        .then(response => {
          console.log("[vectorSource.loader] Response received:", {
            layer: layer_name,
            status: response.status,
            ok: response.ok
          });

          if (!response.ok) {
            throw new Error('Network response was not ok for ' + layer_name);
          }
          return response.json();
        })
        .then(json => {
          
          const features = vectorSource.getFormat().readFeatures(json).map((item) => {
            // Apply color mapping based on store type
            if (layer_store === 'nrega_assets') {
              const fieldValue = item.values_[colorConfig.field];
              item.values_.itemColor = colorConfig.mapping[fieldValue]
                ? colorConfig.mapping[fieldValue]
                : colorConfig.mapping["Default"];

            } else if (layer_store === 'lcw') {
              // For LCW, all points use the same color
              item.values_.itemColor = 1;
            }
            
            return item;
          });
          vectorSource.addFeatures(features);
        })
        .catch(error => {
          console.error("[vectorSource.loader] Error occurred:", {
            layer: layer_name,
            store: layer_store,
            error: error.message,
            stack: error.stack
          });
        });
    }
  });

  // Apply the appropriate style based on store
  const style = styleConfig;

  let wmsLayer = new WebGLPointsLayer({
    source: vectorSource,
    style: style,
  });

  return wmsLayer;
}