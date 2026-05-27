// ---------- COMMON FILE DOWNLOAD ----------
const triggerDownload = (blob, filename) => {
  const objectUrl = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;

  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  }, 100);
};

// ---------- GEOJSON ----------
// export const downloadGeoJson = async (url, layerName) => {
//   try {
//     const response = await fetch(url);
//     if (!response.ok) throw new Error(response.status);

//     const json = await response.json();

//     if (json.features?.length) {
//       json.features = json.features.map(feature => ({
//         type: "Feature",
//         id: feature.id,
//         geometry: feature.geometry,
//         geometry_name: feature.geometry_name || "the_geom",
//         properties: null
//       }));
//     }

//     const blob = new Blob(
//       [JSON.stringify(json, null, 2)],
//       { type: "application/json" }
//     );

//     triggerDownload(blob, `${layerName}_features.json`);

//   } catch (error) {
//     console.error("GeoJSON download error:", error);
//     alert("Failed to download GeoJSON.");
//   }
// };

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

// ---------- KML ----------
export const downloadKml = (url, layerName) => {
  const link = document.createElement("a");
  link.href = url;
  link.download = `${layerName}_features.kml`;
  link.click();
};

// ---------- GEOTIFF ----------
export const downloadGeoTiff = (url) => {
  window.open(url, "_blank");
};

// ---------- EXCEL ----------
export const downloadExcel = async (url, filename) => {
  try {
    const response = await fetch(url, {
      headers: {
        "ngrok-skip-browser-warning": "1"
      }
    });

    if (!response.ok) throw new Error(response.status);

    const buffer = await response.arrayBuffer();
    const blob = new Blob([buffer]);

    triggerDownload(blob, filename || "download.xlsx");

    return true;
  } catch (error) {
    console.error("Excel download error:", error);
    alert("Failed to download Excel.");
    return false;
  }
};