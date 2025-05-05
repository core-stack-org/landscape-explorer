/**
 * Enhanced download helper functions with direct link approach for reliable downloads
 */

// For GeoJSON, we need to fetch the data and force a download as browsers tend to open JSON files
export const downloadGeoJson = async (url, layerName) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.text();
    
    // Create a blob from the data with the correct MIME type
    const blob = new Blob([data], { type: 'application/json' });
    const objectUrl = URL.createObjectURL(blob);
    
    // Create and click a download link
    const link = document.createElement('a');
    link.href = objectUrl;
    link.setAttribute('download', `${layerName}_features.json`);
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    }, 100);
  } catch (error) {
    console.error('Error downloading GeoJSON:', error);
    alert('Failed to download GeoJSON. Please try again.');
  }
};

// KML downloads usually work fine with direct link approach
export const downloadKml = (url, layerName) => {
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${layerName}_features.kml`);
  document.body.appendChild(link);
  link.click();
  
  // Clean up
  setTimeout(() => {
    document.body.removeChild(link);
  }, 100);
};

// For GeoTIFF files, window.open is usually the best approach
export const downloadGeoTiff = (url, layerName) => {
  // GeoTIFF files are typically served by WCS services that require window.open
  window.open(url);
};

// For Excel downloads, use the direct fetch approach for blob data
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
    
    const link = document.createElement('a');
    link.href = objectUrl;
    link.setAttribute('download', filename || 'download.xlsx');
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    }, 100);
    
    return true;
  } catch (error) {
    console.error('Excel download error:', error);
    alert('Failed to download Excel. Please try again.');
    return false;
  }
};