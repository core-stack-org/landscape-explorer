// src/components/kyl_mapContainer.jsx
import { useState } from "react";
import KYLLocationSearchBar from "./kyl_location";
import YearSlider from "./yearSlider";

//? Icons Imports
import settlementIcon from "../assets/settlement_icon.svg";
import wellIcon from "../assets/well_proposed.svg";
import waterbodyIcon from "../assets/waterbodies_proposed.svg";
import RechargeIcon from "../assets/recharge_icon.svg"
import IrrigationIcon from "../assets/irrigation_icon.svg"

// Layer Controls component
const LayerControls = ({
  showMWS,
  setShowMWS,
  showVillages,
  setShowVillages,
  areMWSLayersAvailable,
  areVillageLayersAvailable,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="absolute top-6 left-6 z-10">
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="bg-white p-2 rounded-lg shadow-md hover:bg-gray-50"
        aria-label="Toggle layer controls"
      >
        <svg
          className="w-5 h-5 text-gray-600"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {isMenuOpen && (
        <div className="absolute top-12 left-0 bg-white p-3 rounded-lg shadow-md space-y-3 min-w-[200px]">
          <div
            className={`flex items-center gap-2 ${
              !areMWSLayersAvailable ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <input
              type="checkbox"
              id="show-mws"
              checked={showMWS}
              onChange={(e) => setShowMWS(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              disabled={!areMWSLayersAvailable}
            />
            <label
              htmlFor="show-mws"
              className={`text-sm ${
                areMWSLayersAvailable ? "text-gray-700" : "text-gray-400"
              }`}
            >
              Show MWS Layers
            </label>
          </div>

          <div
            className={`flex items-center gap-2 ${
              !areVillageLayersAvailable ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <input
              type="checkbox"
              id="show-villages"
              checked={showVillages}
              onChange={(e) => setShowVillages(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              disabled={!areVillageLayersAvailable}
            />
            <label
              htmlFor="show-villages"
              className={`text-sm ${
                areVillageLayersAvailable ? "text-gray-700" : "text-gray-400"
              }`}
            >
              Show Village Boundaries
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

// Zoom Controls component
const MapZoomControls = ({ mapRef }) => {
  const handleZoomIn = () => {
    if (!mapRef.current) return;
    const view = mapRef.current.getView();
    const currentZoom = view.getZoom();
    view.animate({
      zoom: currentZoom + 0.5,
      duration: 500,
      easing: (t) => {
        return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      },
    });
  };

  const handleZoomOut = () => {
    if (!mapRef.current) return;
    const view = mapRef.current.getView();
    const currentZoom = view.getZoom();
    view.animate({
      zoom: currentZoom - 0.5,
      duration: 500,
      easing: (t) => {
        return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      },
    });
  };

  return (
    <div className="absolute right-6 bottom-6 z-10 flex flex-col gap-2">
      <button
        onClick={handleZoomIn}
        className="bg-white p-2 rounded-lg shadow-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
        aria-label="Zoom in"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 text-gray-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
      </button>
      <button
        onClick={handleZoomOut}
        className="bg-white p-2 rounded-lg shadow-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
        aria-label="Zoom out"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 text-gray-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18 12H6"
          />
        </svg>
      </button>
    </div>
  );
};

// Updated MapLegend component
const MapLegend = ({ showMWS, showVillages, currentLayer, mappedAssets, mappedDemands }) => {
  // Add state for collapsed status
  const [isCollapsed, setIsCollapsed] = useState(false);

  // If no layers are shown, don't display legend
  if (!showMWS && !showVillages && (!currentLayer || currentLayer.length === 0))
    return null;

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const mwsLegendItems = [
    {
      color: "rgba(255, 99, 132, 0.6)",
      border: "rgb(255, 99, 132)",
      name: "Matched MWS",
      type: "mws",
    },
  ];

  const villageLegendItems = [
    {
      color: "transparent",
      border: "rgb(0, 0, 0)",
      name: "Village Boundaries",
      type: "village",
    },
  ];

  const lulcLegendItems = [
    { color: "#A9A9A9", label: "Barren Lands" },
    { color: "#c6e46d", label: "Single Kharif" },
    { color: "#eee05d", label: "Single Non-Kharif" },
    { color: "#f9b249", label: "Double Cropping" },
    { color: "#fb5139", label: "Triple Cropping" },
    { color: "#4c4ef5", label: "Shrubs and Scrubs" },
  ];

  const terrainLegendItems = [
    { color: "#313695", label: "V-shape river valleys, Deep narrow canyons" },
    {
      color: "#4575b4",
      label: "Lateral midslope incised drainages, Local valleys in plains",
    },
    { color: "#91bfdb", label: "Local ridge/hilltops within broad valleys" },
    { color: "#e0f3f8", label: "U-shape valleys" },
    { color: "#fffc00", label: "Broad Flat Areas" },
    { color: "#feb24c", label: "Broad open slopes" },
    { color: "#f46d43", label: "Mesa tops" },
    { color: "#d73027", label: "Upper Slopes" },
    { color: "#a50026", label: "Upland incised drainages Stream headwaters" },
    {
      color: "#800000",
      label: "Lateral midslope drainage divides, Local ridges in plains",
    },
    { color: "#4d0000", label: "Mountain tops, high ridges" },
  ];

  const rainfallLegendItems = [
    { color: "#B0E0E6", label: "Semi-arid" },
    { color: "#87CEFA", label: "Arid" },
    { color: "#1E90FF", label: "Moderate" },
    { color: "#0073E6", label: "High" },
    { color: "#004080", label: "Very high" },
  ];

  const droughtLengendItems = [
    { color: "#F4D03F", label: "0 drought" },
    { color: "#EB984E", label: "1 or more droughts" },
    { color: "#E74C3C", label: "2 or more droughts" },
  ];

  const runoffLengendItems = [
    { color: "#80E5E6", label: "Low runoff" },
    { color: "#00CED1", label: "Moderate runoff" },
    { color: "#008A8C", label: "High runoff" },
  ];

  const dryspellLengendItems = [
    { color: "#D2B48C", label: "0 dry spell week" },
    { color: "#8B4513", label: "1 or more dry spell weeks" },
    { color: "#5A2E0F", label: "2 or more dry spell weeks" },
  ];

  const populationLengendItems = [
    { color: "#C08081", label: "Population < 800 " },
    { color: "#800020", label: "Population between 800 - 2400" },
    { color: "#5B0E2D", label: "Population between 2400 - 8900" },
    { color: "#3D000F", label: "Population between > 8900" },
  ];

  const STpopLengendItems = [
    { color: "#EEEAC5", label: "%age ST population <18" },
    { color: "#F7DBA5", label: "%age ST population (18-33)" },
    { color: "#ECB573", label: "%age ST population > 33" },
  ];

  const SCpopLengendItems = [
    { color: "#E6E6FA", label: "%age SC population < 5" },
    { color: "#DA70D6", label: "%age SC population (5 - 17)" },
    { color: "#7851A9", label: "%age SC population (17 - 37)" },
    { color: "#4B0082", label: "%age SC population > 37" },
  ];

  const LiteracyLengendItems = [
    { color: "#98FB98", label: "%age literacy level <46" },
    { color: "#32CD32", label: "%age literacy level (46-59)" },
    { color: "#228B22", label: "%age literacy level (59-70)" },
    { color: "#006400", label: "%age literacy level >70" },
  ];

  const WaterLengendItems = [
    { color: "#74CCF4", label: "Kharif" },
    { color: "#1ca3ec", label: "Kharif and Rabi" },
    { color: "#0f5e9c", label: "Kharif, Rabi, Zaid" },
  ];

  const NregaLegendItems = [
    { label: "Household Livelihood", color: "#C2678D" },
    { label: "Others - HH, Community", color: "#355070" },
    { label: "Agri Impact - HH, Community", color: "#FFA500" },
    { label: "SWC - Landscape level impact", color: "#6495ED" },
    { label: "Irrigation - Site level impact", color: "#1A759F" },
    { label: "Plantation", color: "#52B69A" },
    { label: "Un Identified", color: "#6D597A" },
    // { color: "#87CEEB", label: "Less than 100 NREGA works" },
    // { color: "#4169E1", label: "Between 100 - 300 NREGA works" },
    // { color: "#000080", label: "More than 300 NREGA works" },
  ];

  const TrendLegendItems = [
    { color: "#B8860B", label: "Increasing trend of G" },
    { color: "#FFECB3", label: "Decreasing trend of G" },
    { color: "#FFD700", label: "No trend of G" },
  ];

  const CropDegradationItems = [
    { color: "#a9a9a9", label: "Farmland - Barren" },
    { color: "#eaa4f0", label: "Farmland - Shrub" },
    { color: "#f7fcf5", label: "Double - Single" },
    { color: "#ff4500", label: "Triple - Single" },
    { color: "#ffc300", label: "Triple - Double" },
  ];

  const CropDeforestationItems = [
    { color: "#73bb53", label: "Tree Cover - Tree Cover" },
    { color: "#ff0000", label: "Tree Cover - Built Up" },
    { color: "#eee05d", label: "Tree Cover -  Farm" },
    { color: "#a9a9a9", label: "Tree Cover -  Barren" },
    { color: "#eaa4f0", label: "Tree Cover -  Scrub land" },
  ];

  const CropAfforestationtems = [
    { color: "#ff0000", label: "Built Up - Tree Cover" },
    { color: "#eee05d", label: "Farm - Tree Cover" },
    { color: "#a9a9a9", label: "Barren - Tree Cover" },
    { color: "#eaa4f0", label: "Scrub land - Tree Cover" },
  ];

  const AquiferItems = [
    { color: "#fffdb5", label: "Alluvium" },
    { color: "#f3a425", label: "Laterite" },
    { color: "#99ecf1", label: "Basalt" },
    { color: "#a5f8c5", label: "Sandstone" },
    { color: "#f57c99", label: "Shale" },
    { color: "#e8d52e", label: "Limestone" },
    { color: "#3c92f2", label: "Granite" },
    { color: "#d5db21", label: "Schist" },
    { color: "#cf7ff4", label: "Quartzite" },
    { color: "#f4dbff", label: "Charnockite" },
    { color: "#50c02b", label: "Khondalite" },
    { color: "#ffe1b5", label: "Banded Gneissic Complex" },
    { color: "#e4cff1", label: "Gneiss" },
    { color: "#57d2ff", label: "Intrusive" },
  ];

  const SOGEItems = [
    { color: "#ffffff", label: " Safe " },
    { color: "#e0f3f8", label: "Semi - Critical " },
    { color: "#4575b4", label: " Critical " },
    { color: "#313695", label: "Over - Exploited " },
  ];

  // Check if LULC layer is active
  const isLulcLayerActive = currentLayer?.some(
    (layer) =>
      layer.name === "avg_double_cropped" ||
      layer.name === "built_up_area" ||
      layer.name.includes("LULC") ||
      layer.name.includes("lulc")
  );

  // Check if Terrain layer is active
  const isTerrainLayerActive = currentLayer?.some(
    (layer) =>
      layer.name === "terrainCluster_ID" || layer.name.includes("terrain")
  );

  const isRainfallLayerActive = currentLayer?.some(
    (layer) =>
      layer.name === "avg_precipitation" || layer.name.includes("mws_layers")
  );

  const isDroughtLayerActive = currentLayer?.some(
    (layer) =>
      layer.name === "drought_category" ||
      layer.name.includes("cropping_drought")
  );

  const isRunoffLayerActive = currentLayer?.some(
    (layer) => layer.name === "avg_runoff" || layer.name.includes("mws_layers")
  );

  const isDryspellLayerActive = currentLayer?.some(
    (layer) =>
      layer.name === "avg_number_dry_spell" ||
      layer.name.includes("cropping_drought")
  );

  const isPopulationLayerActive = currentLayer?.some(
    (layer) =>
      layer.name === "total_population" ||
      layer.name.includes("panchayat_boundaries")
  );

  const isSTPopulationLayerActive = currentLayer?.some(
    (layer) =>
      layer.name === "percent_st_population" ||
      layer.name.includes("panchayat_boundaries")
  );

  const isSCPopulationLayerActive = currentLayer?.some(
    (layer) =>
      layer.name === "percent_sc_population" ||
      layer.name.includes("panchayat_boundaries")
  );

  const isLiteracyLayerActive = currentLayer?.some(
    (layer) =>
      layer.name === "literacy_level" ||
      layer.name.includes("panchayat_boundaries")
  );

  const isWaterLayerActive = currentLayer?.some(
    (layer) =>
      layer.name === "avg_rabi_surface_water_mws" ||
      layer.name === "avg_zaid_surface_water_mws" ||
      layer.name.includes("water_bodies")
  );

  const isNREGALayerActive = currentLayer?.some(
    (layer) =>
      layer.name === "total_assets" ||
      layer.name.includes("panchayat_boundaries")
  );

  const isTrendLayerActive = currentLayer?.some(
    (layer) => layer.name === "trend_g" || layer.name.includes("mws_layers")
  );

  const isCropDegradationActive = currentLayer?.some(
    (layer) =>
      layer.name === "degradation_land_area" ||
      layer.name.includes("degradation")
  );

  const isCropDeforestationActive = currentLayer?.some(
    (layer) =>
      layer.name === "decrease_in_tree_cover" || layer.name.includes("decrease")
  );

  const isCropAfforestationActive = currentLayer?.some(
    (layer) =>
      layer.name === "increase_in_tree_cover" || layer.name.includes("increase")
  );

  const isAquiferActive = currentLayer?.some(
    (layer) => layer.name === "aquifer_class" || layer.name.includes("aquifer")
  );

  const isSOGEActive = currentLayer?.some(
    (layer) => layer.name === "soge_class" || layer.name.includes("soge")
  );
  return (
    <div
      className={`absolute bottom-24 left-0 z-10 transition-all duration-300 ${
        isCollapsed ? "translate-x-2" : "translate-x-6"
      }`}
    >
      {/* Collapse toggle button */}
      <button
        onClick={toggleCollapse}
        className="absolute top-2 right-2 z-20 bg-white rounded-full p-1 shadow-sm hover:bg-gray-100 transition-colors"
        style={{ right: isCollapsed ? "-12px" : "8px" }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {
            isCollapsed ? (
              <path d="M9 18l6-6-6-6" /> // right arrow when collapsed
            ) : (
              <path d="M15 18l-6-6 6-6" />
            ) // left arrow when expanded
          }
        </svg>
      </button>

      {/* Main legend container */}
      <div
        className={`bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 ${
          isCollapsed
            ? "w-10 h-48 opacity-80 hover:opacity-100"
            : "w-72 max-h-[60vh] opacity-100"
        }`}
      >
        {/* Collapsed state - vertical "Legend" text */}
        {isCollapsed && (
          <div className="h-full flex items-center justify-center">
            <span className="text-gray-700 font-medium rotate-90 whitespace-nowrap transform origin-center">
              Legend
            </span>
          </div>
        )}

        {/* Expanded state - full legend content */}
        {!isCollapsed && (
          <div className="p-4 overflow-y-auto max-h-[60vh]">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Legend</h3>
            <div className="space-y-4">
              {/* MWS Legend Section */}
              {showMWS && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-600">
                    MWS Layers
                  </h4>
                  {mwsLegendItems.map((item, index) => (
                    <div
                      key={`mws-${index}`}
                      className="flex items-center gap-2"
                    >
                      <div
                        className="w-4 h-4 rounded"
                        style={{
                          backgroundColor: item.color,
                          border: `2px solid ${item.border}`,
                        }}
                      />
                      <span className="text-sm text-gray-600">{item.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Village Boundaries Legend Section */}
              {showVillages && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-600">
                    Administrative Boundaries
                  </h4>
                  {villageLegendItems.map((item, index) => (
                    <div
                      key={`village-${index}`}
                      className="flex items-center gap-2"
                    >
                      <div
                        className="w-4 h-4 rounded"
                        style={{
                          backgroundColor: item.color,
                          border: `2px solid ${item.border}`,
                        }}
                      />
                      <span className="text-sm text-gray-600">{item.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* LULC Legend Section */}
              {isLulcLayerActive && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-600">
                    Land Use Land Cover
                  </h4>
                  {lulcLegendItems.map((item, index) => (
                    <div
                      key={`lulc-${index}`}
                      className="flex items-center gap-2"
                    >
                      <div
                        className="w-4 h-4 rounded"
                        style={{
                          backgroundColor: item.color,
                          border: `1px solid rgba(0,0,0,0.2)`,
                        }}
                      />
                      <span className="text-sm text-gray-600">
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Terrain Legend Section */}
              {isTerrainLayerActive && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-600">
                    Terrain Raster
                  </h4>
                  {terrainLegendItems.map((item, index) => (
                    <div
                      key={`terrain-${index}`}
                      className="flex items-center gap-2"
                    >
                      <div
                        className="w-4 h-4 rounded"
                        style={{
                          backgroundColor: item.color,
                          border: `1px solid rgba(0,0,0,0.2)`,
                        }}
                      />
                      <span className="text-sm text-gray-600">
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Rainfall Legend Section */}
              {isRainfallLayerActive && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-600">
                    Rainfall Vector
                  </h4>
                  {rainfallLegendItems.map((item, index) => (
                    <div
                      key={`rainfall-${index}`}
                      className="flex items-center gap-2"
                    >
                      <div
                        className="w-4 h-4 rounded"
                        style={{
                          backgroundColor: item.color,
                          border: `1px solid rgba(0,0,0,0.2)`,
                        }}
                      />
                      <span className="text-sm text-gray-600">
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Drought Legend Section */}
              {isDroughtLayerActive && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-600">
                    Drought Vector
                  </h4>
                  {droughtLengendItems.map((item, index) => (
                    <div
                      key={`drought-${index}`}
                      className="flex items-center gap-2"
                    >
                      <div
                        className="w-4 h-4 rounded"
                        style={{
                          backgroundColor: item.color,
                          border: `1px solid rgba(0,0,0,0.2)`,
                        }}
                      />
                      <span className="text-sm text-gray-600">
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Runoff Legend Section */}
              {isRunoffLayerActive && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-600">
                    Runoff Vector
                  </h4>
                  {runoffLengendItems.map((item, index) => (
                    <div
                      key={`runoff-${index}`}
                      className="flex items-center gap-2"
                    >
                      <div
                        className="w-4 h-4 rounded"
                        style={{
                          backgroundColor: item.color,
                          border: `1px solid rgba(0,0,0,0.2)`,
                        }}
                      />
                      <span className="text-sm text-gray-600">
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Dryspell Legend Section */}
              {isDryspellLayerActive && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-600">
                    Dryspell Vector
                  </h4>
                  {dryspellLengendItems.map((item, index) => (
                    <div
                      key={`dryspell-${index}`}
                      className="flex items-center gap-2"
                    >
                      <div
                        className="w-4 h-4 rounded"
                        style={{
                          backgroundColor: item.color,
                          border: `1px solid rgba(0,0,0,0.2)`,
                        }}
                      />
                      <span className="text-sm text-gray-600">
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Population Legend Section */}
              {isPopulationLayerActive && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-600">
                    Population Vector
                  </h4>
                  {populationLengendItems.map((item, index) => (
                    <div
                      key={`population-${index}`}
                      className="flex items-center gap-2"
                    >
                      <div
                        className="w-4 h-4 rounded"
                        style={{
                          backgroundColor: item.color,
                          border: `1px solid rgba(0,0,0,0.2)`,
                        }}
                      />
                      <span className="text-sm text-gray-600">
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* ST Population Legend Section */}
              {isSTPopulationLayerActive && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-600">
                    ST Population Vector
                  </h4>
                  {STpopLengendItems.map((item, index) => (
                    <div
                      key={`stpop-${index}`}
                      className="flex items-center gap-2"
                    >
                      <div
                        className="w-4 h-4 rounded"
                        style={{
                          backgroundColor: item.color,
                          border: `1px solid rgba(0,0,0,0.2)`,
                        }}
                      />
                      <span className="text-sm text-gray-600">
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* SC Population Legend Section */}
              {isSCPopulationLayerActive && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-600">
                    SC Population Vector
                  </h4>
                  {SCpopLengendItems.map((item, index) => (
                    <div
                      key={`scpop-${index}`}
                      className="flex items-center gap-2"
                    >
                      <div
                        className="w-4 h-4 rounded"
                        style={{
                          backgroundColor: item.color,
                          border: `1px solid rgba(0,0,0,0.2)`,
                        }}
                      />
                      <span className="text-sm text-gray-600">
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Literacy Legend Section */}
              {isLiteracyLayerActive && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-600">
                    Literacy Vector
                  </h4>
                  {LiteracyLengendItems.map((item, index) => (
                    <div
                      key={`literacy-${index}`}
                      className="flex items-center gap-2"
                    >
                      <div
                        className="w-4 h-4 rounded"
                        style={{
                          backgroundColor: item.color,
                          border: `1px solid rgba(0,0,0,0.2)`,
                        }}
                      />
                      <span className="text-sm text-gray-600">
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Water Pixel Legend Section */}
              {isWaterLayerActive && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-600">
                    Water Pixels
                  </h4>
                  {WaterLengendItems.map((item, index) => (
                    <div
                      key={`water-${index}`}
                      className="flex items-center gap-2"
                    >
                      <div
                        className="w-4 h-4 rounded"
                        style={{
                          backgroundColor: item.color,
                          border: `1px solid rgba(0,0,0,0.2)`,
                        }}
                      />
                      <span className="text-sm text-gray-600">
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* NREGA Legend Section */}
              {isNREGALayerActive && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-600">
                    NREGA Works
                  </h4>
                  {NregaLegendItems.map((item, index) => (
                    <div
                      key={`nrega-${index}`}
                      className="flex items-center gap-2"
                    >
                      <div
                        className="w-4 h-4 rounded"
                        style={{
                          backgroundColor: item.color,
                          border: `1px solid rgba(0,0,0,0.2)`,
                        }}
                      />
                      <span className="text-sm text-gray-600">
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Trend Legend Section */}
              {isTrendLayerActive && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-600">
                    Groundwater Trend
                  </h4>
                  {TrendLegendItems.map((item, index) => (
                    <div
                      key={`trend-${index}`}
                      className="flex items-center gap-2"
                    >
                      <div
                        className="w-4 h-4 rounded"
                        style={{
                          backgroundColor: item.color,
                          border: `1px solid rgba(0,0,0,0.2)`,
                        }}
                      />
                      <span className="text-sm text-gray-600">
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Cropping Degradation Section */}
              {isCropDegradationActive && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-600">
                    Cropping Degradation
                  </h4>
                  {CropDegradationItems.map((item, index) => (
                    <div
                      key={`trend-${index}`}
                      className="flex items-center gap-2"
                    >
                      <div
                        className="w-4 h-4 rounded"
                        style={{
                          backgroundColor: item.color,
                          border: `1px solid rgba(0,0,0,0.2)`,
                        }}
                      />
                      <span className="text-sm text-gray-600">
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Crop Deforstation Section */}
              {isCropDeforestationActive && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-600">
                    Deforestation
                  </h4>
                  {CropDeforestationItems.map((item, index) => (
                    <div
                      key={`trend-${index}`}
                      className="flex items-center gap-2"
                    >
                      <div
                        className="w-4 h-4 rounded"
                        style={{
                          backgroundColor: item.color,
                          border: `1px solid rgba(0,0,0,0.2)`,
                        }}
                      />
                      <span className="text-sm text-gray-600">
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Cropping Degradation Section */}
              {isCropAfforestationActive && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-600">
                    Afforestation
                  </h4>
                  {CropAfforestationtems.map((item, index) => (
                    <div
                      key={`trend-${index}`}
                      className="flex items-center gap-2"
                    >
                      <div
                        className="w-4 h-4 rounded"
                        style={{
                          backgroundColor: item.color,
                          border: `1px solid rgba(0,0,0,0.2)`,
                        }}
                      />
                      <span className="text-sm text-gray-600">
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Aquifer Section */}
              {isAquiferActive && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-600">Aquifer</h4>
                  {AquiferItems.map((item, index) => (
                    <div
                      key={`trend-${index}`}
                      className="flex items-center gap-2"
                    >
                      <div
                        className="w-4 h-4 rounded"
                        style={{
                          backgroundColor: item.color,
                          border: `1px solid rgba(0,0,0,0.2)`,
                        }}
                      />
                      <span className="text-sm text-gray-600">
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* SOGE Section */}
              {isSOGEActive && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-600">SOGE</h4>
                  {SOGEItems.map((item, index) => (
                    <div
                      key={`trend-${index}`}
                      className="flex items-center gap-2"
                    >
                      <div
                        className="w-4 h-4 rounded"
                        style={{
                          backgroundColor: item.color,
                          border: `1px solid rgba(0,0,0,0.2)`,
                        }}
                      />
                      <span className="text-sm text-gray-600">
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Mapped Assets */}
              {mappedAssets && (
                <div className="space-y-2">
                <h4 className="text-xs font-medium text-gray-600">Mapped Assets</h4>
                <div className="flex items-center gap-2">
                  <img
                    src={settlementIcon}
                    alt="Settlement"
                    className="w-6 h-6"
                    draggable={false}
                  />
                  <span className="text-sm text-gray-600">Settlement</span>
                </div>
                <div className="flex items-center gap-2">
                  <img
                    src={wellIcon}
                    alt="Settlement"
                    className="w-6 h-6"
                    draggable={false}
                  />
                  <span className="text-sm text-gray-600">Well</span>
                </div>
                <div className="flex items-center gap-2">
                  <img
                    src={waterbodyIcon}
                    alt="Settlement"
                    className="w-6 h-6"
                    draggable={false}
                  />
                  <span className="text-sm text-gray-600">Water Structure</span>
                </div>
              </div>
              )}

              {/* Proposed Works */}
              {mappedDemands && (
                <div className="space-y-2">
                <h4 className="text-xs font-medium text-gray-600">Proposed Works</h4>
                <div className="flex items-center gap-2">
                  <img
                    src={RechargeIcon}
                    alt="Settlement"
                    className="w-6 h-6"
                    draggable={false}
                  />
                  <span className="text-sm text-gray-600">Recharge Structure</span>
                </div>
                <div className="flex items-center gap-2">
                  <img
                    src={IrrigationIcon}
                    alt="Settlement"
                    className="w-6 h-6"
                    draggable={false}
                  />
                  <span className="text-sm text-gray-600">Irrigation Structure</span>
                </div>
              </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Main Container component
const KYLMapContainer = ({
  isLoading,
  statesData,
  mapElement,
  onLocationSelect,
  showMWS,
  setShowMWS,
  showVillages,
  setShowVillages,
  mwsLayerRef,
  boundaryLayerRef,
  mapRef,
  currentLayer,
  setSearchLatLong,
  mappedAssets,
  mappedDemands
}) => {
  const areMWSLayersAvailable = mwsLayerRef?.current !== null;
  const areVillageLayersAvailable = boundaryLayerRef?.current !== null;

  return (
    <div className="flex-1 bg-[#F8F7FF] rounded-lg border border-gray-100 relative overflow-hidden">
      {isLoading && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      <LayerControls
        showMWS={showMWS}
        setShowMWS={setShowMWS}
        showVillages={showVillages}
        setShowVillages={setShowVillages}
        areMWSLayersAvailable={areMWSLayersAvailable}
        areVillageLayersAvailable={areVillageLayersAvailable}
      />

      <MapZoomControls mapRef={mapRef} />

      <MapLegend
        showMWS={showMWS && areMWSLayersAvailable}
        showVillages={showVillages && areVillageLayersAvailable}
        currentLayer={currentLayer}
        mappedAssets={mappedAssets}
        mappedDemands={mappedDemands}
      />

      {/* Search Bar */}
      <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-10">
        <KYLLocationSearchBar
          statesData={statesData}
          onLocationSelect={onLocationSelect}
          setSearchLatLong={setSearchLatLong}
        />
      </div>

      {/* Centered YearSlider */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 w-full max-w-xl px-4">
        <YearSlider currentLayer={currentLayer} />
      </div>

      <div className="h-full" ref={mapElement} />
    </div>
  );
};

export default KYLMapContainer;
