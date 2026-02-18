/**
 * Enhanced download helper functions with direct link approach for reliable downloads
 */

// 🔥 GeoJSON Download (FORCE properties: null FORMAT)
export const downloadGeoJson = async (url, layerName) => {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const json = await response.json();

    // Rebuild features to match required format
    if (json.features && Array.isArray(json.features)) {
      json.features = json.features.map(feature => ({
        type: "Feature",
        id: feature.id,
        geometry: feature.geometry,
        geometry_name: feature.geometry_name || "the_geom",
        properties: null
      }));
    }

    const cleanedData = JSON.stringify(json, null, 2);

    const blob = new Blob([cleanedData], {
      type: "application/json"
    });

    const objectUrl = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = objectUrl;
    link.setAttribute("download", `${layerName}_features.json`);
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    }, 100);

  } catch (error) {
    console.error("Error downloading GeoJSON:", error);
    alert("Failed to download GeoJSON. Please try again.");
  }
};

// KML download
export const downloadKml = (url, layerName) => {
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `${layerName}_features.kml`);
  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    document.body.removeChild(link);
  }, 100);
};

// GeoTIFF download
export const downloadGeoTiff = (url) => {
  window.open(url);
};

// Excel download
export const downloadExcel = async (url, filename) => {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "ngrok-skip-browser-warning": "1",
        "Content-Type": "blob",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const arybuf = await response.arrayBuffer();
    const objectUrl = URL.createObjectURL(new Blob([arybuf]));

    const link = document.createElement("a");
    link.href = objectUrl;
    link.setAttribute("download", filename || "download.xlsx");
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    }, 100);

    return true;
  } catch (error) {
    console.error("Excel download error:", error);
    alert("Failed to download Excel. Please try again.");
    return false;
  }
};
