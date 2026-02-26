/**
 * Enhanced download helper functions with direct link approach for reliable downloads
 */

// -------------------- GEOJSON --------------------
export const downloadGeoJson = async (url, layerName) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
   // Make properties null ONLY for demographics layer
    if (layerName === "administrative_boundaries" && data && data.features) {
      data.features.forEach(feature => {
        feature.properties = null;
      });
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { 
  type: 'application/json' 
});

    const objectUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = `${layerName}_features.json`;
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    }, 100);
  } catch (error) {
    console.error('Error downloading GeoJSON:', error);
    alert('Failed to download GeoJSON.');
  }
};

// -------------------- kml added --------------------
export const downloadKml = async (url, layerName) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const text = await response.text();
    const blob = new Blob([text], {
      type: 'application/vnd.google-earth.kml+xml'
    });

    const objectUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = `${layerName}_features.kml`;
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    }, 100);
  } catch (error) {
    console.error('Error downloading KML:', error);
    alert('Failed to download KML.');
  }
};

// -------------------- GEOTIFF --------------------
export const downloadGeoTiff = (url) => {
  window.open(url, '_blank');
};

// -------------------- EXCEL --------------------
export const downloadExcel = async (url, filename) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    const objectUrl = URL.createObjectURL(new Blob([buffer]));

    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename || 'download.xlsx';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    }, 100);
  } catch (error) {
    console.error('Excel download error:', error);
    alert('Failed to download Excel.');
  }
};
