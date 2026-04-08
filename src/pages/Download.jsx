import { useState } from "react";
import LandingNavbar from "../components/landing_navbar.jsx";
import DownloadButton from "../components/DownloadButton.jsx";
import {
  downloadGeoJson,
  downloadKml,
  downloadGeoTiff,
  downloadExcel,
} from "../components/utils/downloadHelper.jsx";

const DownloadPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isLayersFetched, setIsLayersFetched] = useState(true);

  const onDownload = async (layerName, format) => {
    const url = `https://geoserver.core-stack.org/geoserver/${layerName}`;

    if (format === "geojson") {
      await downloadGeoJson(url, layerName);
    }

    if (format === "kml") {
      downloadKml(url, layerName);
    }

    if (format === "geotiff") {
      downloadGeoTiff(url);
    }
  };

  const handleExcelDownload = async () => {
    setIsLoading(true);

    const url =
      "https://geoserver.core-stack.org/api/v1/download_excel_layer";

    await downloadExcel(url, "layer_data.xlsx");

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* Navbar */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <LandingNavbar />
      </div>

      <div className="p-8 flex flex-col gap-4 items-center">

        <h2 className="text-xl font-semibold">
          Download Data
        </h2>

        <DownloadButton
          name="GeoJSON"
          onClickEvent={() => onDownload("demographics", "geojson")}
          isDisabled={!isLayersFetched || isLoading}
          className="bg-[#EDE9FE] text-[#8B5CF6] hover:bg-[#DDD6FE]"
        />

        <DownloadButton
          name="KML"
          onClickEvent={() => onDownload("demographics", "kml")}
          isDisabled={!isLayersFetched || isLoading}
          className="bg-[#EDE9FE] text-[#8B5CF6] hover:bg-[#DDD6FE]"
        />

        <DownloadButton
          name="GeoTIFF"
          onClickEvent={() => onDownload("terrain", "geotiff")}
          isDisabled={!isLayersFetched || isLoading}
          className="bg-[#EDE9FE] text-[#8B5CF6] hover:bg-[#DDD6FE]"
        />

        <DownloadButton
          name="Excel"
          onClickEvent={handleExcelDownload}
          isDisabled={isLoading}
          className="bg-[#EDE9FE] text-[#8B5CF6] hover:bg-[#DDD6FE]"
        />

      </div>
    </div>
  );
};

export default DownloadPage;