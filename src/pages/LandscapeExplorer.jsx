import { useState, useEffect, useRef, useCallback } from "react";
import Map from "../components/landscape-explorer/map/Map.jsx";
import LeftSidebar from "../components/landscape-explorer/sidebar/LeftSidebar.jsx";
import RightSidebar from "../components/landscape-explorer/sidebar/RightSidebar.jsx";
import { useRecoilState } from "recoil";
import { toast } from "react-hot-toast";
import {
  stateDataAtom,
  stateAtom,
  districtAtom,
  blockAtom,
  filterSelectionsAtom,
  yearAtom,
} from "../store/locationStore.jsx";
import getStates from "../actions/getStates.js";
import * as downloadHelper from "../components/landscape-explorer/utils/downloadHelper";
import {
  trackPageView,
  trackEvent,
  initializeAnalytics,
} from "../services/analytics";
import LandingNavbar from "../components/landing_navbar.jsx";
import Loader from "../components/ui/Loader.jsx";
import locations from "../locations.json";

const LandscapeExplorer = () => {
  const [showLeftSidebar, setShowLeftSidebar] = useState(false);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Loading map data...");
  const [isFetchingLocations, setIsFetchingLocations] = useState(false);
  const pendingFeedbackRef = useRef(null);

  // Recoil state
  const [statesData, setStatesData] = useRecoilState(stateDataAtom);
  const [state, setState] = useRecoilState(stateAtom);
  const [district, setDistrict] = useRecoilState(districtAtom);
  const [block, setBlock] = useRecoilState(blockAtom);
  const [filterSelections, setFilterSelections] =
    useRecoilState(filterSelectionsAtom);
  const [lulcYear1, setLulcYear1] = useState(null);
  const [lulcYear2, setLulcYear2] = useState(null);
  const [lulcYear3, setLulcYear3] = useState(null);

  // Map ref for accessing map instance from other components
  const mapRef = useRef(null);

  // Add flag to prevent infinite recursion
  const isUpdatingFromMap = useRef(false);

  // Track which resource category is active
  const [activeResourceCategory, setActiveResourceCategory] = useState(null);

  // Set map ref with callback
  const setMapRef = useCallback((node) => {
    if (node !== null) {
      mapRef.current = node;
    }
  }, []);

  // Layer toggle state - with demographics on by default
  const [toggledLayers, setToggledLayers] = useState({
    // Basic layers
    demographics: true, // Set to true by default
    drainage: false,
    remote_sensed_waterbodies: false,
    hydrological_boundaries: false,
    clart: false,
    mws_layers: false,
    nrega: false,
    drought: false,
    terrain: false,
    administrative_boundaries: false,
    cropping_intensity: false,
    terrain_vector: false,
    terrain_lulc_slope: false,
    terrain_lulc_plain: false,
    afforestation: false,
    deforestation: false,
    degradation: false,
    urbanization: false,
    cropintensity: false,
    soge: false,
    aquifer: false,
  });

  // State for map view settings
  const [showMWS, setShowMWS] = useState(true);
  const [showVillages, setShowVillages] = useState(true);

  // Add plans state
  const [plans, setPlans] = useState([]);

  // Add internal state flag for when layers are ready
  const [layersReady, setLayersReady] = useState(false);

  // Flag to track if we need to enable the fetch button
  const [canFetchLayers, setCanFetchLayers] = useState(block !== null);

  // Handle item selection for dropdowns
  const handleItemSelect = (setter, value) => {
    // Handle the setState case specially if it affects parent component state
    if (setter === setState) {
      // Reset all dependent state values
      if (value) {
        trackEvent("Location", "select_state", value.label);
        toast.success(`State selected: ${value.label}`);
      }
      setDistrict(null);
      setBlock(null);
      resetAllStates();
      setState(value);
    } else if (setter === setDistrict) {
      // Reset block and filters when district changes
      if (value) {
        trackEvent("Location", "select_district", value.label);
        toast.success(`District selected: ${value.label}`);
      }
      setBlock(null);
      resetAllStates();
      setDistrict(value);
    } else if (setter === setBlock) {
      resetAllStates();
      setBlock(value);
      // When block is selected, enable fetch button and prepare layers automatically
      setCanFetchLayers(true);
      trackEvent("Location", "select_tehsil", value.label);
      toast.success(`Tehsil selected: ${value.label}`);
      toast("Preparing map layers for the selected area...", {
        icon: "🗺️",
      });
      pendingFeedbackRef.current = "layers";
      setLoadingMessage("Loading map layers...");
      setLayersReady(true);
      setToggledLayers((prev) => ({
        ...prev,
        demographics: true,
      }));
    } else {
      // Standard case for other setters
      setter(value);
    }
  };

  const resetAllStates = () => {
    // Reset filters
    setFilterSelections({
      selectedMWSValues: {},
      selectedVillageValues: {},
    });

    setToggledLayers({
      demographics: true, // Keep demographics on
      drainage: false,
      remote_sensed_waterbodies: false,
      hydrological_boundaries: false,
      clart: false,
      mws_layers: false,
      nrega: false,
      drought: false,
      terrain: false,
      administrative_boundaries: false,
      cropping_intensity: false,
      terrain_vector: false,
      terrain_lulc_slope: false,
      terrain_lulc_plain: false,
      settlement: false,
      water_structure: false,
      well_structure: false,
      agri_structure: false,
      livelihood_structure: false,
      recharge_structure: false,
      afforestation: false,
      deforestation: false,
      degradation: false,
      urbanization: false,
      cropintensity: false,
      soge: false,
      aquifer: false,
    });

    setLayersReady(false);
    setCanFetchLayers(false);
  };

  // Handle layer toggle from RightSidebar
  const handleLayerToggle = (layerName, isVisible) => {
    // Prevent recursion if the update is coming from the map component
    if (isUpdatingFromMap.current) {
      return;
    }

    // Update local state immediately
    setToggledLayers((prev) => ({
      ...prev,
      [layerName]: isVisible,
    }));
    toast(isVisible ? `${layerName.replace(/_/g, " ")} enabled` : `${layerName.replace(/_/g, " ")} hidden`, {
      icon: isVisible ? "✨" : "🫥",
    });

    // Then update the map with a slight delay
    setTimeout(() => {
      if (mapRef.current && mapRef.current.toggleLayer) {
        mapRef.current.toggleLayer(layerName, isVisible);
      }
    }, 50);
  };

  // Handle GeoJSON download
  const handleGeoJsonLayers = (layerName) => {
    if (!district || !block) {
      toast.error("Please select a district and block first.");
      return;
    }

    console.log(`Downloading GeoJSON for ${layerName}`);

    const districtFormatted = district.label
      .toLowerCase()
      .replace(/\s*\(\s*/g, "_")
      .replace(/\s*\)\s*/g, "")
      .replace(/\s+/g, "_");
    const blockFormatted = block.label
      .toLowerCase()
      .replace(/\s*\(\s*/g, "_")
      .replace(/\s*\)\s*/g, "")
      .replace(/\s+/g, "_");

    // Create download URL based on layer name (following the original implementation's URL format)
    let downloadUrl = "";

    switch (layerName) {
      case "demographics":
        downloadUrl = `https://geoserver.core-stack.org:8443/geoserver/panchayat_boundaries/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=panchayat_boundaries:${districtFormatted}_${blockFormatted}&outputFormat=application/json&screen=main`;
        break;
      case "drainage":
        downloadUrl = `https://geoserver.core-stack.org:8443/geoserver/drainage/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=drainage:${districtFormatted}_${blockFormatted}&outputFormat=application/json&screen=main`;
        break;
      case "remote_sensed_waterbodies":
        downloadUrl = `https://geoserver.core-stack.org:8443/geoserver/swb/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=swb:surface_waterbodies_${districtFormatted}_${blockFormatted}&outputFormat=application/json&screen=main`;
        break;
      case "hydrological_boundaries":
        downloadUrl = `https://geoserver.core-stack.org:8443/geoserver/mws_layers/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=mws_layers:deltaG_well_depth_${districtFormatted}_${blockFormatted}&outputFormat=application/json&screen=main`;
        break;
      // Add other cases as needed
      default:
        downloadUrl = `https://geoserver.core-stack.org:8443/geoserver/${layerName}/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=${layerName}:${districtFormatted}_${blockFormatted}&outputFormat=application/json&screen=main`;
    }

    // Use the imported helper directly
    downloadHelper.downloadGeoJson(downloadUrl, layerName);
  };

  // Handle KML download
  const handleKMLLayers = (layerName) => {
    if (!district || !block) {
      toast.error("Please select a district and block first.");
      return;
    }

    console.log(`Downloading KML for ${layerName}`);

    const districtFormatted = district.label
      .toLowerCase()
      .replace(/\s*\(\s*/g, "_")
      .replace(/\s*\)\s*/g, "")
      .replace(/\s+/g, "_");
    const blockFormatted = block.label
      .toLowerCase()
      .replace(/\s*\(\s*/g, "_")
      .replace(/\s*\)\s*/g, "")
      .replace(/\s+/g, "_");

    // Create download URL based on layer name (following original implementation)
    let downloadUrl = "";

    switch (layerName) {
      case "demographics":
        downloadUrl = `https://geoserver.core-stack.org:8443/geoserver/panchayat_boundaries/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=panchayat_boundaries:${districtFormatted}_${blockFormatted}&outputFormat=application/vnd.google-earth.kml+xml&screen=main`;
        break;
      case "drainage":
        downloadUrl = `https://geoserver.core-stack.org:8443/geoserver/drainage/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=drainage:${districtFormatted}_${blockFormatted}&outputFormat=application/vnd.google-earth.kml+xml&screen=main`;
        break;
      case "remote_sensed_waterbodies":
        downloadUrl = `https://geoserver.core-stack.org:8443/geoserver/water_bodies/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=water_bodies:surface_waterbodies_${districtFormatted}_${blockFormatted}&outputFormat=application/vnd.google-earth.kml+xml&screen=main`;
        break;
      case "hydrological_boundaries":
        downloadUrl = `https://geoserver.core-stack.org:8443/geoserver/mws_layers/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=mws_layers:deltaG_well_depth_${districtFormatted}_${blockFormatted}&outputFormat=application/vnd.google-earth.kml+xml&screen=main`;
        break;
      // Add other cases as needed
      default:
        downloadUrl = `https://geoserver.core-stack.org:8443/geoserver/${layerName}/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=${layerName}:${districtFormatted}_${blockFormatted}&outputFormat=application/vnd.google-earth.kml+xml&screen=main`;
    }

    // Use the imported helper directly
    downloadHelper.downloadKml(downloadUrl, layerName);
  };

  // Handle Excel download
  const handleExcelDownload = () => {
    if (!district || !block) {
      toast.error("Please select a district and block first.");
      return;
    }

    pendingFeedbackRef.current = "excel";
    setLoadingMessage("Preparing Excel download...");
    setIsLoading(true);

    // Using the exact URL format from the original implementation
    fetch(
      `https://geoserver.core-stack.org/api/v1/download_excel_layer?state=${state.label}&district=${district.label}&block=${block.label}`,
      {
        method: "GET",
        headers: {
          "ngrok-skip-browser-warning": "1",
          "Content-Type": "blob",
        },
      }
    )
      .then((response) => response.arrayBuffer())
      .then((arybuf) => {
        const url = window.URL.createObjectURL(new Blob([arybuf]));
        const link = document.createElement("a");

        link.href = url;
        link.setAttribute("download", `${block.label}_data.xlsx`);
        document.body.appendChild(link);
        link.click();

        link.remove();
        URL.revokeObjectURL(url);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Error downloading Excel:", error);
        pendingFeedbackRef.current = null;
        setIsLoading(false);
        toast.error("Failed to download Excel data. Please try again.");
      });
  };

  // Track category selection for resource layers
  const handleCategoryChange = (category) => {
    setActiveResourceCategory(category);
  };

  // Fetch states data on component mount
  useEffect(() => {
    initializeAnalytics();
    trackPageView("/download_layers");
    if (statesData === null) {
      setIsFetchingLocations(true);
      setLoadingMessage("Loading available locations...");
      pendingFeedbackRef.current = "locations";
      getStates()
        .then((data) => {
          setStatesData(data);
          if (data === locations) {
            toast("Using cached MWS-derived location data.", {
              icon: "⚠️",
            });
          }
        })
        .catch(() => {
          toast.error("Failed to load locations.");
        })
        .finally(() => {
          setIsFetchingLocations(false);
        });
    }
  }, [statesData, setStatesData]);

  useEffect(() => {
    if (isLoading) return;

    if (pendingFeedbackRef.current === "layers" && block) {
      toast.success(`Map layers loaded for ${block.label}.`);
      pendingFeedbackRef.current = null;
    } else if (pendingFeedbackRef.current === "excel") {
      toast.success("Excel export is ready.");
      pendingFeedbackRef.current = null;
    }
  }, [isLoading, block]);

  // Handle map-initiated layer toggle updates
  const handleMapToggle = (layerName, isVisible) => {
    // Set the recursion prevention flag
    isUpdatingFromMap.current = true;

    try {
      // Special case for setState action - coming from map marker click
      if (layerName === "setState" && typeof isVisible === "object") {
        if (isVisible && isVisible.label && isVisible.district) {
          setState(isVisible);
          return;
        }
      }

      // Update the toggledLayers state
      setToggledLayers((prev) => ({
        ...prev,
        [layerName]: isVisible,
      }));
    } finally {
      // Reset the flag
      isUpdatingFromMap.current = false;
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <LandingNavbar />
      </div>
      <div className="flex h-[calc(100vh-48px)]">
        {showLeftSidebar && (
          <LeftSidebar onClose={() => setShowLeftSidebar(false)} />
        )}

        <div className="flex-1 relative p-2">
          {isFetchingLocations && (
            <div className="absolute inset-x-6 top-6 z-20 rounded-2xl border border-violet-100 bg-white/95 px-4 py-3 shadow-lg backdrop-blur ui-fade-in">
              <Loader inline label="Loading available locations..." size="sm" />
            </div>
          )}
          {!showLeftSidebar && (
            <button
              onClick={() => setShowLeftSidebar(true)}
              className="ui-pressable absolute top-4 left-4 z-10 rounded-xl border border-violet-100 bg-[#F5F3FF] p-2 text-[#7C3AED] shadow-md hover:bg-[#8B5CF6] hover:text-white focus-visible:ring-0"
              aria-label="Open information panel"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                fill="currentColor"
                viewBox="0 0 16 16"
              >
                <path
                  fillRule="evenodd"
                  d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"
                />
              </svg>
            </button>
          )}

          <Map
            ref={setMapRef}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            loadingMessage={loadingMessage}
            state={state}
            district={district}
            block={block}
            filterSelections={filterSelections}
            toggledLayers={toggledLayers}
            toggleLayer={handleMapToggle} // Use handleMapToggle to properly handle map-initiated updates
            showMWS={showMWS}
            setShowMWS={setShowMWS}
            showVillages={showVillages}
            setShowVillages={setShowVillages}
            lulcYear1={lulcYear1}
            lulcYear2={lulcYear2}
            lulcYear3={lulcYear3}
          />
        </div>

        {showRightSidebar && (
          <RightSidebar
            state={state}
            district={district}
            block={block}
            setState={setState}
            setDistrict={setDistrict}
            setBlock={setBlock}
            statesData={statesData}
            handleItemSelect={handleItemSelect}
            onClose={() => setShowRightSidebar(false)}
            handleLayerToggle={handleLayerToggle}
            handleGeoJsonLayers={handleGeoJsonLayers}
            handleKMLLayers={handleKMLLayers}
            toggledLayers={toggledLayers}
            toggleLayer={handleLayerToggle}
            handleExcelDownload={handleExcelDownload}
            isLoading={isLoading}
            canFetchLayers={canFetchLayers}
            onCategoryChange={handleCategoryChange}
            lulcYear1={lulcYear1}
            lulcYear2={lulcYear2}
            lulcYear3={lulcYear3}
            setLulcYear1={setLulcYear1}
            setLulcYear2={setLulcYear2}
            setLulcYear3={setLulcYear3}
          />
        )}

        {!showRightSidebar && (
          <div className="ui-slide-in absolute top-20 right-0 z-10 flex items-center rounded-l-2xl border border-r-0 border-violet-100 bg-white/95 p-2 px-3 shadow-lg backdrop-blur hover:bg-violet-50">
            <button
              onClick={() => setShowRightSidebar(true)}
              className="ui-pressable flex items-center rounded-xl focus-visible:ring-0"
              aria-label="Open filters panel"
            >
              <span className="font-medium text-gray-700 mr-2">
                Filters & Data
              </span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                viewBox="0 0 16 16"
              >
                <path
                  fillRule="evenodd"
                  d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LandscapeExplorer;
