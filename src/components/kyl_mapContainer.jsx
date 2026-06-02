// src/components/kyl_mapContainer.jsx
import { useState } from "react";
import KYLLocationSearchBar from "./kyl_location";
import YearSlider from "./yearSlider";

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
            className={`flex items-center gap-2 ${!areMWSLayersAvailable ? "opacity-50 cursor-not-allowed" : ""
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
              className={`text-sm ${areMWSLayersAvailable ? "text-gray-700" : "text-gray-400"
                }`}
            >
              Show MWS Layers
            </label>
          </div>

          <div
            className={`flex items-center gap-2 ${!areVillageLayersAvailable ? "opacity-50 cursor-not-allowed" : ""
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
              className={`text-sm ${areVillageLayersAvailable ? "text-gray-700" : "text-gray-400"
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
    <div className="absolute right-6 top-6 z-10 flex flex-col gap-2">
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
const MapLegend = ({ showMWS, showVillages, currentLayer, showConnectivity }) => {
  // Add state for collapsed status
  const [isCollapsed, setIsCollapsed] = useState(false);

  // If no layers are shown, don't display legend
  if (!showMWS && !showVillages && (!currentLayer || currentLayer.length === 0))
    return null;

  const activeWBLayer = currentLayer?.find((layer) =>
    ["waterbody_type", "waterbody_size", "drainage_line", "surface_water_trend"]
      .includes(layer.name)
  );

  const activeWBType = activeWBLayer?.name;

  const isWaterbodyVisualizeActive = currentLayer?.some(
    (layer) => layer.name === "waterbody_type"
  );

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
  { color: "#F0F4A3", label: "Single Kharif" },
  { color: "#D6E96B", label: "Single Non-Kharif" },
  { color: "#B7D43A", label: "Double Cropping" },
  { color: "#7FAF2E", label: "Triple Cropping" },
  { color: "#8C7A4F", label: "Shrubs and Scrubs" },
];

  const lulcCropPercentItems = [
    { color: "#F0F4A3", label: "Crop" },
    { color: "#1B5E20", label: "Trees" },
    { color: "#8C7A4F", label: "Shrubs" },
    { color: "#A9A9A9", label: "Barren" },
    { color: "#C94C4C", label: "Built-up" },
    { color: "#74CCF4", label: "Water" },
  ];

  const lulcForestPercentItems = [
    { color: "#F0F4A3", label: "Crop" },
    { color: "#1B5E20", label: "Trees" },
    { color: "#8C7A4F", label: "Shrubs" },
    { color: "#A9A9A9", label: "Barren" },
    { color: "#C94C4C", label: "Built-up" },
    { color: "#74CCF4", label: "Water" },
  ];

  const lulcShrubPercentItems = [
    { color: "#F0F4A3", label: "Crop" },
    { color: "#1B5E20", label: "Trees" },
    { color: "#8C7A4F", label: "Shrubs" },
    { color: "#A9A9A9", label: "Barren" },
    { color: "#C94C4C", label: "Built-up" },
    { color: "#74CCF4", label: "Water" },
  ];

  const terrainLegendItems = [
    { color: "#313695", label: "Deep valleys and canyons" },
    {
      color: "#4575b4",
      label: "Incised drainages and low ridges",
    },
    { color: "#a50026", label: "Mountain tops and high ridges" },
    { color: "#e0f3f8", label: "U-shape valleys" },
    { color: "#fffc00", label: "Broad Flat Areas" },
    { color: "#feb24c", label: "Broad open slopes" },
    { color: "#f46d43", label: "Flat tops" },
    { color: "#d73027", label: "Upper Slopes" },
  ];

  const reliefLegendItems = [
    { color: "#D9F0D3", label: "Low Relief (less than 6m)" },
    { color: "#A6D96A", label: "Moderate Relief (between 6m and 110m)" },
    { color: "#FDAE61", label: "High Relief (between 110m and 900m)" },
    { color: "#D73027", label: "Extremely High Relief (More than 900m)" },
  ];

  const DEM_STOPS = [
    { elev: 0,   color: "#0d0030" },
    { elev: 50,  color: "#1a0f6e" },
    { elev: 100, color: "#1746a0" },
    { elev: 150, color: "#1a72c0" },
    { elev: 200, color: "#2191c0" },
    { elev: 250, color: "#1aab9e" },
    { elev: 300, color: "#16a085" },
    { elev: 340, color: "#1cb870" },
    { elev: 380, color: "#27ae60" },
    { elev: 410, color: "#5ab836" },
    { elev: 440, color: "#95c623" },
    { elev: 470, color: "#d4d400" },
    { elev: 500, color: "#f1c40f" },
    { elev: 530, color: "#e09a30" },
    { elev: 560, color: "#d4845a" },
    { elev: 590, color: "#b0623a" },
    { elev: 620, color: "#8b5e3c" },
    { elev: 660, color: "#c4a882" },
    { elev: 700, color: "#f5f0e8" },
  ];
 
  const DEM_MIN    = 0;
  const DEM_MAX    = 700;
  const GRADIENT_H = 160; // px — height of the colour bar
 
  // Build CSS gradient bottom (low) → top (high)
  const gradientStops = DEM_STOPS.map(({ elev, color }) => {
    const pct = (((elev - DEM_MIN) / (DEM_MAX - DEM_MIN)) * 100).toFixed(1);
    return `${color} ${pct}%`;
  }).join(", ");
  const elevGradient = `linear-gradient(to top, ${gradientStops})`;
 
  // Ticks shown beside the bar
  const DEM_TICKS = [0, 100, 200, 300, 400, 500, 600, 700];

  const treeOnSlopeItems = [
    { color: "rgba(85, 255, 85, 0.5)", label: "Less than 15%" },
    { color: "rgba(0, 170, 0, 0.5)", label: "Between 15% to 30%" },
    { color: "rgba(0, 85, 0, 0.5)", label: "More than 30%" },
  ];
  const shrubOnSlopeItems = [
    { color: "rgba(170, 170, 0, 0.5)", label: "Less than 10%" },
    { color: "rgba(85, 85, 0, 0.5)", label: "Between 10% to 20%" },
    { color: "rgba(42, 42, 0, 0.5)", label: "More than 20%" },
  ];
  const cropsOnSlopeItems = [
    { color: "rgba(85, 255, 85, 0.5)", label: "Less than 15%" },
    { color: "rgba(0, 170, 0, 0.5)", label: "Between 15% to 30%" },
    { color: "rgba(0, 85, 0, 0.5)", label: "More than 30%" },
  ];

  const rainfallLegendItems = [
    { color: "#B0E0E6", label: "Semi-arid" },
    { color: "#87CEFA", label: "Arid" },
    { color: "#2b93faff", label: "Moderate" },
    { color: "#036bd2ff", label: "High" },
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
    { color: "rgba(192, 128, 129, 0.5)", label: "Population < 800 " },
    { color: "rgba(128, 0, 32, 0.5)", label: "Population between 800 - 2400" },
    { color: "rgba(91, 14, 45, 0.5)", label: "Population between 2400 - 8900" },
    { color: "rgba(61, 0, 15, 0.5)", label: "Population between > 8900" },
  ];

  const STpopLengendItems = [
    { color: "rgba(238, 234, 197, 0.5)", label: "%age ST population <18" },
    { color: "rgba(247, 219, 165, 0.5)", label: "%age ST population (18-33)" },
    { color: "rgba(236, 181, 115, 0.5)", label: "%age ST population > 33" },
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

  const WaterLengendRabiItems = [
    { color: "#74CCF4", label: "Less than 30%" },
    { color: "#1ca3ec", label: "Between 30% to 70%" },
    { color: "#0f5e9c", label: "More than 70%" },
  ];

  const WaterLengendZaidItems = [
    { color: "#74CCF4", label: "Less than 25%" },
    { color: "#1ca3ec", label: "Between 25% to 50%" },
    { color: "#0f5e9c", label: "More than 50%" },
  ];

  const NregaLegendItems = [
    { label: "Household Livelihood", color: "#C2678D" },
    { label: "Others - HH, Community", color: "#355070" },
    { label: "Agri Impact - HH, Community", color: "#FFA500" },
    { label: "SWC - Landscape level impact", color: "#6495ED" },
    { label: "Irrigation - Site level impact", color: "#1A759F" },
    { label: "Plantation", color: "#52B69A" },
    { label: "Un Identified", color: "#6D597A" },
  ];

  const TrendLegendItems = [
    { color: "#22C55E", label: "Positive Trend" },
    { color: "#EF4444", label: "Negative Trend" },
    { color: "#9CA3AF", label: "No Trend" },
  ];

  const CropDegradationItems = [
    { color: "#73bb53", label: "Less than 30 hectares" },
    { color: "#eee05d", label: "Between 30 hectares to 90 hectares" },
    { color: "#ff0000", label: "More than 90 hectares" },
  ];

  const CropDeforestationItems = [
    { color: "#73bb53", label: "Less than 50 hectares" },
    { color: "#eee05d", label: "Between 50 to 100 hectares" },
    { color: "#ff0000", label: "More than 100 hectares" },
  ];

  const CropAfforestationtems = [
    { color: "#ff0000", label: "Less than 50 hectares" },
    { color: "#eee05d", label: "Between 50 to 100 hectares" },
    { color: "#73bb53", label: "More than 100 hectares" },
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
    { color: "#ffffff", label: "Safe" },
    { color: "#e0f3f8", label: "Semi - Critical " },
    { color: "#4575b4", label: " Critical " },
    { color: "#313695", label: "Over - Exploited " },
    { color: "#a9a9a9", label: "Not Assessed" },
  ];

  const GreenCreditItems = [
    { color: "#ffffff", label: "Areas with no known green credit sites" },
    { color: "#14d11dff", label: "Areas with green credit sites " },
  ];

  const WideScaleRestoreItems = [
    { color: "#d79b0f", label: "Mosaic Restoration" },
    { color: "#0f077c", label: "Wide-scale Restoration" },
    { color: "#4fbc14", label: "Protection" },
  ];

  const PotentialProtectionItems = [
    { color: "#d79b0f", label: "Mosaic Restoration" },
    { color: "#0f077c", label: "Wide-scale Restoration" },
    { color: "#4fbc14", label: "Protection" },
  ];

  const LandConflictItems = [
    { color: "#FF0000", label: "Land Conflict" }
  ];

  const FactoryItems = [
    { color: "#FF0000", label: "Factory" }
  ];

  const MiningItems = [
    { color: "#FF0000", label: "Mine" }
  ];

  const FacEssenEduInfra = [
    { fill: "rgba(255, 249, 196, 0.5)", stroke: "rgba(255, 249, 196, 1)", label: "Within 2 kms" },
    { fill: "rgba(255, 193, 7, 0.5)", stroke: "rgba(255, 193, 7, 1)", label: "More than 2 kms" },
  ];

  const FacHigherEduInfra = [
    { fill: "rgba(232, 238, 186, 0.5)", stroke: "rgba(232, 238, 186, 1)", label: "Within 3 kms" },
    { fill: "rgba(137, 151, 10, 0.5)", stroke: "rgba(137, 151, 10, 1)", label: "More than 3 kms" },
  ];

  const FacEssenHealthInfra = [
    { fill: "rgba(255, 205, 210, 0.5)", stroke: "rgba(255, 205, 210, 1)", label: "Less than 2 kms" },
    { fill: "rgba(239, 83, 80, 0.5)", stroke: "rgba(239, 83, 80, 1)", label: "Between 2 to 5 kms" },
    { fill: "rgba(183, 28, 28, 0.5)", stroke: "rgba(183, 28, 28, 1)", label: "More than 5 kms" },
  ];

  const FacAdvHealthInfra = [
    { fill: "rgba(255, 205, 210, 0.5)", stroke: "rgba(255, 205, 210, 1)", label: "<10 kms" },
    { fill: "rgba(239, 83, 80, 0.5)", stroke: "rgba(239, 83, 80, 1)", label: "10-25 kms" },
    { fill: "rgba(183, 28, 28, 0.5)", stroke: "rgba(183, 28, 28, 1)", label: ">25 kms" },
  ];

  const FacPDSItems = [
    { fill: "rgba(232, 238, 186, 0.5)", stroke: "rgba(232, 238, 186, 1)", label: "Within 2 kms" },
    { fill: "rgba(137, 151, 10, 0.5)", stroke: "rgba(137, 151, 10, 1)", label: "More than 2 kms" },
  ];

  const FacFinInclItems = [
    { fill: "rgba(72, 55, 217, 0.5)", stroke: "rgba(72, 55, 217, 1)", label: "Within 5 kms" },
    { fill: "rgba(8, 8, 77, 0.5)", stroke: "rgba(8, 8, 77, 1)", label: "More than 5 kms" },
  ];

  const FacAgriMarketItems = [
    { fill: "rgba(255, 255, 102, 0.5)", stroke: "rgba(255, 255, 102, 1)", label: "<3 kms" },
    { fill: "rgba(159, 159, 0, 0.5)", stroke: "rgba(159, 159, 0, 1)", label: "3-10 kms" },
    { fill: "rgba(98, 98, 0, 0.5)", stroke: "rgba(98, 98, 0, 1)", label: ">10 kms" },
  ];

  const FacPostHarvestInfra = [
    { fill: "rgba(200, 230, 201, 0.5)", stroke: "rgba(200, 230, 201, 1)", label: "<5 kms" },
    { fill: "rgba(102, 187, 106, 0.5)", stroke: "rgba(102, 187, 106, 1)", label: "5-20 kms" },
    { fill: "rgba(46, 125, 50, 0.5)", stroke: "rgba(46, 125, 50, 1)", label: ">20 kms" },
  ];

  const FacFarmCooperAccess = [
    { fill: "rgba(204, 238, 255, 0.5)", stroke: "rgba(204, 238, 255, 1)", label: "<10 kms" },
    { fill: "rgba(0, 142, 212, 0.5)", stroke: "rgba(0, 142, 212, 1)", label: "10-30 kms" },
    { fill: "rgba(0, 77, 116, 0.5)", stroke: "rgba(0, 77, 116, 1)", label: ">30 kms" },
  ];

  const FacLivestockMngmt = [
    { fill: "rgba(255, 170, 85, 0.5)", stroke: "rgba(255, 170, 85, 1)", label: "<10 kms" },
    { fill: "rgba(170, 85, 0, 0.5)", stroke: "rgba(170, 85, 0, 1)", label: "10-30 kms" },
    { fill: "rgba(85, 43, 0, 0.5)", stroke: "rgba(85, 43, 0, 1)", label: ">30 kms" },
  ];

  const FacAgriSuppInfra = [
    { fill: "rgba(200, 230, 201, 0.5)", stroke: "rgba(200, 230, 201, 1)", label: "<10 kms" },
    { fill: "rgba(102, 187, 106, 0.5)", stroke: "rgba(102, 187, 106, 1)", label: "10-50 kms" },
    { fill: "rgba(46, 125, 50, 0.5)", stroke: "rgba(46, 125, 50, 1)", label: ">50 kms" },
  ];


  const isExcludedLulc = (name) => {
    if (!name) return false;
    return (
      name === "lulc_crop_percent" ||
      name === "lulc_forest_percent" ||
      name === "lulc_shrub_percent"
    );
  };

  // Check if LULC layer is active
  const isLulcLayerActive = currentLayer?.some(
    (layer) =>
      (layer.name === "avg_double_cropped" ||
        layer.name === "built_up_area" ||
        layer.name.includes("LULC") ||
        layer.name.includes("lulc")) &&
      !isExcludedLulc(layer.name)
  );

  const isLulcCropPercentActive = currentLayer?.some(
    (layer) => layer.name === "lulc_crop_percent"
  );

  const isLulcForestPercentActive = currentLayer?.some(
    (layer) => layer.name === "lulc_forest_percent"
  );

  const isLulcShrubPercentActive = currentLayer?.some(
    (layer) => layer.name === "lulc_shrub_percent"
  );

  // Check if Terrain layer is active
  const isTerrainLayerActive = currentLayer?.some(
    (layer) =>
      layer.name === "terrainCluster_ID" || layer.name.includes("terrain")
  );

  const isReliefLayerActive = currentLayer?.some(
    (layer) => layer.name === "relief" || layer.name.includes("relief")
  );

  const isRelMeanElevLayerActive = currentLayer?.some(
    (layer) => layer.name === "relative_mean_elevation" || layer.name.includes("relative_mean_elevation")
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

  const isWaterRabiActive = currentLayer?.some(
    (layer) =>
      layer.name === "avg_rabi_surface_water_mws"
  );

  const isWaterZaidActive = currentLayer?.some(
    (layer) =>
      layer.name === "avg_zaid_surface_water_mws"
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

  const isGreenCreditActive = currentLayer?.some(
    (layer) => layer.name === "green_credit" || layer.name.includes("green_credit")
  );

  const isFacEssenEduInfraActive = currentLayer?.some(
    (layer) => layer.name === "essential_education_infra" || layer.name.includes("fac_essen_edu_infra")
  );

  const isFacHigherEduInfraActive = currentLayer?.some(
    (layer) => layer.name === "higher_education_infra" || layer.name.includes("fac_higher_edu_infra")
  );

  const isFacEssenHealthInfraActive = currentLayer?.some(
    (layer) => layer.name === "essential_health_services" || layer.name.includes("fac_essen_health_infra")
  );

  const isFacAdvHealthInfraActive = currentLayer?.some(
    (layer) => layer.name === "advanced_health_services" || layer.name.includes("fac_adv_health_infra")
  );

  const isFacPDSActive = currentLayer?.some(
    (layer) => layer.name === "public_distribution_system" || layer.name.includes("fac_pds")
  );

  const isFacFinInclActive = currentLayer?.some(
    (layer) => layer.name === "financial_inclusion" || layer.name.includes("fac_fin_incl")
  );

  const isFacAgriMarketActive = currentLayer?.some(
    (layer) => layer.name === "agri_market_access" || layer.name.includes("fac_agri_market")
  );

  const isFacPostHarvestInfraActive = currentLayer?.some(
    (layer) => layer.name === "post_harvest_infra" || layer.name.includes("fac_post_harvest_infra")
  );

  const isFacFarmCooperAccessActive = currentLayer?.some(
    (layer) => layer.name === "farmer_cooperatives_access" || layer.name.includes("fac_farm_cooper_access")
  );

  const isFacLivestockMngmtActive = currentLayer?.some(
    (layer) => layer.name === "livestock_management_centers" || layer.name.includes("fac_livestock_mngmt")
  );

  const isFacAgriSuppInfraActive = currentLayer?.some(
    (layer) => layer.name === "agricultural_support_infrastructure" || layer.name.includes("fac_agri_supp_infra")
  );

  const isWideScaleActive = currentLayer?.some(
    (layer) => layer.name === "area_wide_scale_restoration" || layer.name.includes("area_wide_scale_restoration")
  );

  const isPotentialProtectionActive = currentLayer?.some(
    (layer) => layer.name === "area_protection" || layer.name.includes("area_protection")
  );

  const isLandConflictActive = currentLayer?.some(
    (layer) => layer.name === "lcw_conflict" || layer.name.includes("lcw_conflict")
  );

  const isIndustryActive = currentLayer?.some(
    (layer) => layer.name === "factory_csr" || layer.name.includes("factory_csr")
  );

  const isMiningActive = currentLayer?.some(
    (layer) => layer.name === "mining" || layer.name.includes("mining")
  );

  const isTreeSlopeActive = currentLayer?.some(
    (layer) => layer.name === "area_tree_on_slope" || layer.name.includes("area_tree_on_slope")
  );

  const isShrubSlopeActive = currentLayer?.some(
    (layer) => layer.name === "area_shrubs_on_slope" || layer.name.includes("area_shrubs_on_slope")
  );

  const isCropPlainActive = currentLayer?.some(
    (layer) => layer.name === "area_crops_on_plain" || layer.name.includes("area_crops_on_plain")
  );


  return (
    <div
      className={`absolute bottom-6 left-0 z-10 transition-all duration-300 ${isCollapsed ? "translate-x-2" : "translate-x-6"}`}
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
        className={`bg-white rounded-lg shadow-md overflow-hidden transition-opacity duration-300 ${isCollapsed
          ? "w-10 h-48 opacity-80 hover:opacity-100"
          : "w-72 opacity-100"
          }`}
        style={!isCollapsed ? { maxHeight: 'calc(100vh - 220px)' } : {}}
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
          <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 260px)' }}>
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

              {isLulcCropPercentActive && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-600">
                   Land Use Land Cover
                  </h4>
                  {lulcCropPercentItems.map((item, index) => (
                    <div
                      key={`lulc-crop-${index}`}
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

              {isLulcForestPercentActive && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-600">
                    Land Use Land Cover
                  </h4>
                  {lulcForestPercentItems.map((item, index) => (
                    <div
                      key={`lulc-forest-${index}`}
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

              {isLulcShrubPercentActive && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-600">
                    Land Use Land Cover
                  </h4>
                  {lulcShrubPercentItems.map((item, index) => (
                    <div
                      key={`lulc-shrub-${index}`}
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

              {isReliefLayerActive && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-600">
                    Microwatershed Relief
                  </h4>
                  {reliefLegendItems.map((item, index) => (
                    <div
                      key={`relief-${index}`}
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

              {isRelMeanElevLayerActive && (
                <div>
                  <h4 className="text-xs font-medium text-gray-600 mb-2">
                    Absolute Elevation (m)
                  </h4>
 
                  <div className="flex gap-2">
                    {/* Gradient bar */}
                    <div
                      style={{
                        width: 18,
                        height: GRADIENT_H,
                        background: elevGradient,
                        borderRadius: 4,
                        border: "1px solid #d1d5db",
                        flexShrink: 0,
                      }}
                    />
 
                    {/* Tick marks + labels */}
                    <div
                      style={{
                        position: "relative",
                        height: GRADIENT_H,
                        flex: 1,
                      }}
                    >
                      {DEM_TICKS.map((elev) => {
                        const pct =
                          (elev - DEM_MIN) / (DEM_MAX - DEM_MIN);
                        const bottomPx = pct * GRADIENT_H;
                        return (
                          <div
                            key={elev}
                            style={{
                              position  : "absolute",
                              bottom    : bottomPx - 6,
                              left      : 0,
                              display   : "flex",
                              alignItems: "center",
                              gap       : 4,
                            }}
                          >
                            {/* Tick line */}
                            <div
                              style={{
                                width     : 5,
                                height    : 1,
                                background: "#9ca3af",
                              }}
                            />
                            <span className="text-xs text-gray-500">
                              {elev}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
 
                  {/* Contour line note */}
                  <div className="flex items-center gap-2 mt-2">
                    <div
                      style={{
                        width     : 20,
                        height    : 2,
                        background: "#8B4513",
                        borderRadius: 1,
                        flexShrink: 0,
                      }}
                    />
                    <span className="text-xs text-gray-500">Contour lines</span>
                  </div>
                </div>
              )}

              {isTreeSlopeActive && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-600">
                    Trees on Slope
                  </h4>
                  {treeOnSlopeItems.map((item, index) => (
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

              {isShrubSlopeActive && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-600">
                    Shrub on Slope
                  </h4>
                  {shrubOnSlopeItems.map((item, index) => (
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

              {isCropPlainActive && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-600">
                    Crops on Plain
                  </h4>
                  {cropsOnSlopeItems.map((item, index) => (
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
                    Dry spell Vector
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
              {isWaterRabiActive && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-600">
                    Average Water Availability During Rabi
                  </h4>
                  {WaterLengendRabiItems.map((item, index) => (
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

              {isWaterZaidActive && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-600">
                    Average Water Availability during Zaid
                  </h4>
                  {WaterLengendZaidItems.map((item, index) => (
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
                    Water Balance Trend
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
                    Reduction in Tree Cover
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
                    Increase in tree cover
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

              {/* Green Credit Section */}
              {isGreenCreditActive && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-600">Green Credit</h4>
                  {GreenCreditItems.map((item, index) => (
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

              {/* Essential Education Infra Section */}
              {isFacEssenEduInfraActive && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-600">Primary education institutions</h4>
                  {FacEssenEduInfra.map((item, index) => (
                    <div key={`fac-edu-${index}`} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: item.fill, border: `1px solid ${item.stroke}` }} />
                      <span className="text-sm text-gray-600">{item.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {isFacHigherEduInfraActive && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-600">Higher education institutions</h4>
                  {FacHigherEduInfra.map((item, index) => (
                    <div key={`fac-hedu-${index}`} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: item.fill, border: `1px solid ${item.stroke}` }} />
                      <span className="text-sm text-gray-600">{item.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {isFacEssenHealthInfraActive && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-600">Essential health services</h4>
                  {FacEssenHealthInfra.map((item, index) => (
                    <div key={`fac-hlth-${index}`} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: item.fill, border: `1px solid ${item.stroke}` }} />
                      <span className="text-sm text-gray-600">{item.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {isFacAdvHealthInfraActive && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-600">Advanced health services</h4>
                  {FacAdvHealthInfra.map((item, index) => (
                    <div key={`fac-ahlth-${index}`} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: item.fill, border: `1px solid ${item.stroke}` }} />
                      <span className="text-sm text-gray-600">{item.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {isFacPDSActive && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-600">Public distribution system</h4>
                  {FacPDSItems.map((item, index) => (
                    <div key={`fac-pds-${index}`} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: item.fill, border: `1px solid ${item.stroke}` }} />
                      <span className="text-sm text-gray-600">{item.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {isFacFinInclActive && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-600">Access to banks and financial services</h4>
                  {FacFinInclItems.map((item, index) => (
                    <div key={`fac-fin-${index}`} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: item.fill, border: `1px solid ${item.stroke}` }} />
                      <span className="text-sm text-gray-600">{item.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {isFacAgriMarketActive && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-600">Access to mandis</h4>
                  {FacAgriMarketItems.map((item, index) => (
                    <div key={`fac-agri-${index}`} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: item.fill, border: `1px solid ${item.stroke}` }} />
                      <span className="text-sm text-gray-600">{item.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {isFacPostHarvestInfraActive && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-600">Post Agricultural Produce Harvest Support</h4>
                  {FacPostHarvestInfra.map((item, index) => (
                    <div key={`fac-post-${index}`} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: item.fill, border: `1px solid ${item.stroke}` }} />
                      <span className="text-sm text-gray-600">{item.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {isFacFarmCooperAccessActive && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-600">Access to farmer cooperatives</h4>
                  {FacFarmCooperAccess.map((item, index) => (
                    <div key={`fac-coop-${index}`} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: item.fill, border: `1px solid ${item.stroke}` }} />
                      <span className="text-sm text-gray-600">{item.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {isFacLivestockMngmtActive && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-600">Livestock Management Centers</h4>
                  {FacLivestockMngmt.map((item, index) => (
                    <div key={`fac-live-${index}`} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: item.fill, border: `1px solid ${item.stroke}` }} />
                      <span className="text-sm text-gray-600">{item.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {isFacAgriSuppInfraActive && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-600">Agricultural support infrastructure</h4>
                  {FacAgriSuppInfra.map((item, index) => (
                    <div key={`fac-supp-${index}`} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: item.fill, border: `1px solid ${item.stroke}` }} />
                      <span className="text-sm text-gray-600">{item.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {isWideScaleActive && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-600">
                    Wide Scale Restoration
                  </h4>
                  {WideScaleRestoreItems.map((item, index) => (
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

              {isPotentialProtectionActive && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-600">
                    Potential for Protection
                  </h4>
                  {PotentialProtectionItems.map((item, index) => (
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

              {isLandConflictActive && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-600">
                    Land Conflict Points
                  </h4>
                  {LandConflictItems.map((item, index) => (
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

              {isIndustryActive && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-600">
                    Factory Location Points
                  </h4>
                  {FactoryItems.map((item, index) => (
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

              {isMiningActive && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-600">
                    Mine Location Points
                  </h4>
                  {MiningItems.map((item, index) => (
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

              {activeWBType === "waterbody_type" && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-600">
                    Waterbody Type
                  </h4>

                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: "#87CEFA" }}
                    />
                    <span className="text-sm text-gray-600">On River</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: "#1E90FF" }}
                    />
                    <span className="text-sm text-gray-600">Off River</span>
                  </div>
                </div>
              )}

              {activeWBType === "waterbody_size" && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-600">
                    Waterbody Size
                  </h4>

                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: "#BFEFFF" }} />
                    <span className="text-sm text-gray-600">WB &lt; 1 ha</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: "#87CEFA" }} />
                    <span className="text-sm text-gray-600">WB 1–5 ha</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: "#1E90FF" }} />
                    <span className="text-sm text-gray-600">WB 5–10 ha</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: "#0046B4" }} />
                    <span className="text-sm text-gray-600">WB &gt; 10 ha</span>
                  </div>
                </div>
              )}

              {activeWBType === "surface_water_trend" && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-600">
                    Surface Water Trend
                  </h4>

                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: "#22C55E" }}   // green
                    />
                    <span className="text-sm text-gray-600">Positive</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: "#EF4444" }}   // red
                    />
                    <span className="text-sm text-gray-600">Negative</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: "#9CA3AF" }}   // grey
                    />
                    <span className="text-sm text-gray-600">Steady</span>
                  </div>
                </div>
              )}

              {activeWBType === "drainage_line" && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-600">
                    Drainage Line
                  </h4>

                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: "#3B82F6" }}
                    />
                    <span className="text-sm text-gray-600">On Drainage</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: "#A855F7" }}
                    />
                    <span className="text-sm text-gray-600">Off Drainage</span>
                  </div>
                </div>
              )}

              {showConnectivity && (
                <div className="mt-3">

                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    MWS Drainage Flow
                  </h4>

                  {/* Gradient Legend */}
                  <div className="space-y-2">

                    <div>
                      <div className="flex h-6 rounded overflow-hidden border border-gray-300">
                        <div className="flex-1 bg-[#8B5A2B]" />
                        <div className="flex-1 bg-[#B48F50]" />
                        <div className="flex-1 bg-[#D6C97A]" />
                        <div className="flex-1 bg-[#A8D36F]" />
                        <div className="flex-1 bg-[#228B22]" />
                      </div>

                      <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                        <span>MWS in ridge areas</span>
                        <span>MWS in valley areas</span>
                      </div>
                    </div>

                    {/* Arrow Direction */}
                    <div className="pt-2">
                      <h4 className="text-xs font-medium text-gray-600 mb-1">
                        MWS Flow Direction
                      </h4>

                      <div className="flex items-center gap-2">
                        {/* Line */}
                        <div className="w-10 h-[2px] bg-black relative">
                          <div
                            className="absolute right-0 top-1/2 -translate-y-1/2 
                            w-0 h-0 border-t-[4px] border-b-[4px]
                            border-l-[8px] border-t-transparent
                            border-b-transparent border-l-black"
                          />
                        </div>
                      </div>
                    </div>

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
  isFilterProcessing,  // add this
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
  showConnectivity,
}) => {
  const areMWSLayersAvailable = mwsLayerRef?.current !== null;
  const areVillageLayersAvailable = boundaryLayerRef?.current !== null;

  return (
    <div className="flex-1 bg-[#F8F7FF] rounded-lg border border-gray-100 relative overflow-hidden">

      {/* ── Full overlay loader — only on initial layer load ── */}
      {isLoading && (
        <div className="absolute inset-0 z-20 bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-indigo-600 tracking-wide">
            Loading map layers...
          </span>
        </div>
      )}

      {/* ── Non-blocking filter processing indicator — centered ── */}
      {isFilterProcessing && !isLoading && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
          <div className="flex flex-col items-center gap-3 bg-white/90 backdrop-blur-sm px-6 py-5 rounded-2xl shadow-md">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium text-indigo-600 whitespace-nowrap">
              Applying filters...
            </span>
          </div>
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
        showConnectivity={showConnectivity}
      />

      {/* Search Bar */}
      <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-10">
        <KYLLocationSearchBar
          statesData={statesData}
          onLocationSelect={onLocationSelect}
          setSearchLatLong={setSearchLatLong}
        />
      </div>

      {/* Year Slider */}
      <div className="absolute bottom-6 right-16 z-10 w-[420px]">
        <YearSlider currentLayer={currentLayer} />
      </div>

      <div className="h-full" ref={mapElement} />
    </div>
  );
};

export default KYLMapContainer;
