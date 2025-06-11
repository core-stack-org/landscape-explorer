import { Fill, Stroke, Style, Icon } from "ol/style.js";

/**
 * Creates a style for MWS (Micro-Watershed) features
 * 
 * @param {Array} selectedMWS - Array of selected MWS IDs
 * @param {boolean} isSelected - Whether the feature is selected
 * @returns {Style} OL Style object
 */
export const createMWSStyle = (feature, selectedMWS = [], isSelected = false) => {
  const featureId = feature.get('uid');
  
  if (isSelected) {
    // Feature is specifically selected (e.g., for analysis)
    return new Style({
      stroke: new Stroke({
        color: "#166534",
        width: 2.0,
      }),
      fill: new Fill({
        color: "rgba(34, 197, 94, 0.4)",
      })
    });
  } else if (selectedMWS.includes(featureId)) {
    // Feature is part of filtered selection
    return new Style({
      stroke: new Stroke({
        color: "#661E1E",
        width: 1.0,
      }),
      fill: new Fill({
        color: "rgba(255, 75, 75, 0.8)",
      })
    });
  } else {
    // Default style
    return new Style({
      stroke: new Stroke({
        color: "#4a90e2",
        width: 1.0,
      }),
      fill: new Fill({
        color: "rgba(74, 144, 226, 0.2)",
      })
    });
  }
};

/**
 * Creates a style for village/admin boundary features
 * 
 * @param {Array} selectedVillages - Array of selected village IDs
 * @returns {Style} OL Style object
 */
export const createVillageStyle = (feature, selectedVillages = []) => {
  const featureId = feature.get('vill_ID');
  
  if (selectedVillages.includes(featureId)) {
    return new Style({
      stroke: new Stroke({
        color: "#FFD700",
        width: 2,
      }),
    });
  } else {
    return new Style({
      stroke: new Stroke({
        color: "#000000",
        width: 1.5,
      }),
    });
  }
};

/**
 * Get icon style for different asset types
 * 
 * @param {string} assetType - The type of asset
 * @param {string} iconSrc - Path to the icon image
 * @returns {Style} OL Style object with the appropriate icon
 */
export const getAssetStyle = (assetType, iconSrc) => {
  return new Style({
    image: new Icon({
      src: iconSrc,
      scale: 1.0,
    }),
  });
};

/**
 * Format coordinates for display
 * 
 * @param {Array} coordinates - [longitude, latitude] coordinates
 * @returns {string} Formatted coordinates string
 */
export const formatCoordinates = (coordinates) => {
  if (!coordinates || coordinates.length !== 2) {
    return "Invalid coordinates";
  }
  
  const [lon, lat] = coordinates;
  return `${lat.toFixed(6)}°N, ${lon.toFixed(6)}°E`;
};

/**
 * Calculate the optimal zoom level for a given extent
 * 
 * @param {ol/extent} extent - The extent to fit
 * @param {ol/size} mapSize - The size of the map
 * @returns {number} Optimal zoom level
 */
export const calculateOptimalZoom = (extent, mapSize) => {
  const width = extent[2] - extent[0];
  const height = extent[3] - extent[1];
  
  const maxDimension = Math.max(width, height);
  const mapMaxDimension = Math.max(mapSize[0], mapSize[1]);
  
  return Math.log2(360 / maxDimension) + Math.log2(mapMaxDimension / 256);
}; 