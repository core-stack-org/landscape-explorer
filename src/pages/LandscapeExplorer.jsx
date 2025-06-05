import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/logo.png';
import { useState, useEffect, useRef, useCallback } from "react";
import Map from "../components/landscape-explorer/map/Map.jsx";
import LeftSidebar from "../components/landscape-explorer/sidebar/LeftSidebar.jsx";
import RightSidebar from "../components/landscape-explorer/sidebar/RightSidebar.jsx";
import { useRecoilState, useRecoilValue } from 'recoil';
import { stateDataAtom, stateAtom, districtAtom, blockAtom, filterSelectionsAtom, yearAtom } from '../store/locationStore.jsx';
import getStates from "../actions/getStates.js";
import getPlans from "../actions/getPlans.js";
import * as downloadHelper from "../components/landscape-explorer/utils/downloadHelper";

// Custom navbar specifically for Landscape Explorer page
const LandscapeNavbar = () => {
  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center h-16">
          <Link to="/" className="flex items-center gap-2 cursor-pointer">
            <img src={logo} alt="KYL Logo" className="h-8 w-8" />
            <span className="text-xl font-semibold text-gray-800">Download Layers</span>
          </Link>
        </div>
      </div>
    </nav>
  );
};

const LandscapeExplorer = () => {
  const [showLeftSidebar, setShowLeftSidebar] = useState(false);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  // Recoil state
  const [statesData, setStatesData] = useRecoilState(stateDataAtom);
  const [state, setState] = useRecoilState(stateAtom);
  const [district, setDistrict] = useRecoilState(districtAtom);
  const [block, setBlock] = useRecoilState(blockAtom);
  const [filterSelections, setFilterSelections] = useRecoilState(filterSelectionsAtom);
  const lulcYear = useRecoilValue(yearAtom);

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
    hydrological_variables: false,
    nrega: false,
    drought: false,
    terrain: false,
    administrative_boundaries: false,
    cropping_intensity: false,
    terrain_vector: false,
    terrain_lulc_slope: false,
    terrain_lulc_plain: false,
    afforestation : false,
    deforestation : false,
    degradation : false,
    urbanization : false,
    cropintensity : false,
    soge : false,
    aquifer : false
  });

  // State for map view settings
  const [showMWS, setShowMWS] = useState(true);
  const [showVillages, setShowVillages] = useState(true);

  // Add state for selectedPlan
  const [selectedPlan, setSelectedPlan] = useState(null);

  // Add plans state
  const [plans, setPlans] = useState([]);
  
  // Add internal state flag for when layers are ready
  const [layersReady, setLayersReady] = useState(false);
  
  // Flag to track if we need to enable the fetch button
  const [canFetchLayers, setCanFetchLayers] = useState(false);


  // Handle item selection for dropdowns
  const handleItemSelect = (setter, value) => {
    // Handle the setState case specially if it affects parent component state
    if (setter === setState) {
      // Reset all dependent state values
      setDistrict(null);
      setBlock(null);
      resetAllStates();
      setState(value);
    } 
    else if (setter === setDistrict) {
      // Reset block and filters when district changes
      setBlock(null);
      resetAllStates();
      setDistrict(value);
    } 
    else if (setter === setBlock) {
      resetAllStates();
      setBlock(value);
      // When block is selected, enable fetch button and prepare layers automatically
      setCanFetchLayers(true);
      
      // Auto-prepare layers instead of requiring Fetch Layers button
      setTimeout(() => {
        if (mapRef.current && mapRef.current.prepareLayers) {
          setIsLoading(true);
          mapRef.current.prepareLayers();
          setLayersReady(true);
          setToggledLayers(prev => ({
            ...prev,
            demographics: true
          }));
          setIsLoading(false);
        }
      }, 100);
    } 
    else {
      // Standard case for other setters
      setter(value);
    }
  };

  const resetAllStates = () => {
    // Reset filters
    setFilterSelections({
      selectedMWSValues: {},
      selectedVillageValues: {}
    });
    
    setToggledLayers({
      demographics: true, // Keep demographics on
      drainage: false,
      remote_sensed_waterbodies: false,
      hydrological_boundaries: false,
      clart: false,
      hydrological_variables: false,
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
      afforestation : false,
      deforestation : false,
      degradation : false,
      urbanization : false,
      cropintensity : false,
      soge : false,
      aquifer : false
    });
    
    setLayersReady(false);
    setCanFetchLayers(false);
    setSelectedPlan(null); // Ensure plan is reset
  };

  // Handle layer toggle from RightSidebar
  const handleLayerToggle = (layerName, isVisible) => {
    // Prevent recursion if the update is coming from the map component
    if (isUpdatingFromMap.current) {
      return;
    }
    
    // Prevent toggling resource/planning layers without a plan
    const resourceOrPlanningLayers = [
      'settlement', 'water_structure', 'well_structure',
      'agri_structure', 'livelihood_structure', 'recharge_structure'
    ];
    
    if (resourceOrPlanningLayers.includes(layerName) && !selectedPlan && isVisible) {
      alert('Please select a plan first to enable this layer');
      return;
    }
    
    // Update local state immediately
    setToggledLayers(prev => ({
      ...prev,
      [layerName]: isVisible
    }));
    
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
      alert('Please select a district and block first');
      return;
    }
    
    console.log(`Downloading GeoJSON for ${layerName}`);
    
    const districtFormatted = district.label.toLowerCase().split(" ").join("_");
    const blockFormatted = block.label.toLowerCase().split(" ").join("_");
    
    // Create download URL based on layer name (following the original implementation's URL format)
    let downloadUrl = '';
    
    switch(layerName) {
      case 'demographics':
        downloadUrl = `https://geoserver.core-stack.org:8443/geoserver/panchayat_boundaries/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=panchayat_boundaries:${districtFormatted}_${blockFormatted}&outputFormat=application/json&screen=main`;
        break;
      case 'drainage':
        downloadUrl = `https://geoserver.core-stack.org:8443/geoserver/drainage/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=drainage:${districtFormatted}_${blockFormatted}&outputFormat=application/json&screen=main`;
        break;
      case 'remote_sensed_waterbodies':
        downloadUrl = `https://geoserver.core-stack.org:8443/geoserver/water_bodies/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=water_bodies:surface_waterbodies_${districtFormatted}_${blockFormatted}&outputFormat=application/json&screen=main`;
        break;
      case 'hydrological_boundaries':
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
      alert('Please select a district and block first');
      return;
    }
    
    console.log(`Downloading KML for ${layerName}`);
    
    const districtFormatted = district.label.toLowerCase().split(" ").join("_");
    const blockFormatted = block.label.toLowerCase().split(" ").join("_");
    
    // Create download URL based on layer name (following original implementation)
    let downloadUrl = '';
    
    switch(layerName) {
      case 'demographics':
        downloadUrl = `https://geoserver.core-stack.org:8443/geoserver/panchayat_boundaries/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=panchayat_boundaries:${districtFormatted}_${blockFormatted}&outputFormat=application/vnd.google-earth.kml+xml&screen=main`;
        break;
      case 'drainage':
        downloadUrl = `https://geoserver.core-stack.org:8443/geoserver/drainage/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=drainage:${districtFormatted}_${blockFormatted}&outputFormat=application/vnd.google-earth.kml+xml&screen=main`;
        break;
      case 'remote_sensed_waterbodies':
        downloadUrl = `https://geoserver.core-stack.org:8443/geoserver/water_bodies/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=water_bodies:surface_waterbodies_${districtFormatted}_${blockFormatted}&outputFormat=application/vnd.google-earth.kml+xml&screen=main`;
        break;
      case 'hydrological_boundaries':
        downloadUrl = `https://geoserver.core-stack.org:8443/geoserver/mws_layers/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=mws_layers:deltaG_well_depth_${districtFormatted}_${blockFormatted}&outputFormat=application/vnd.google-earth.kml+xml&screen=main`;
        break;
      // Add other cases as needed
      default:
        downloadUrl = `https://geoserver.core-stack.org:8443/geoserver/${layerName}/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=${layerName}:${districtFormatted}_${blockFormatted}&outputFormat=application/vnd.google-earth.kml+xml&screen=main`;
    }
    
    // Use the imported helper directly
    downloadHelper.downloadKml(downloadUrl, layerName);
  };

  // Keep handleFetchLayers as a no-op since it's still referenced in props
  const handleFetchLayers = () => {
    // This function is kept as a no-op to prevent errors, since it's still passed to RightSidebar
    console.log('Fetch layers functionality has been automated');
  };

  // Handle Excel download
  const handleExcelDownload = () => {
    if (!district || !block) {
      alert('Please select a district and block first');
      return;
    }
    
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
    .then(response => response.arrayBuffer())
    .then(arybuf => {
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
    .catch(error => {
      console.error("Error downloading Excel:", error);
      setIsLoading(false);
      alert("Failed to download Excel data. Please try again.");
    });
  };

  // Track category selection for resource layers
  const handleCategoryChange = (category) => {
    setActiveResourceCategory(category);
  };

  // Fetch states data on component mount
  useEffect(() => {
    if (statesData === null) {
      getStates().then(data => setStatesData(data));
    }
  }, [statesData, setStatesData]);

  // Effect to fetch plans when block changes
  useEffect(() => {
    if (block) {
      const fetchPlans = async () => {
        try {
          setIsLoading(true);
          
          // Fix CORS issue by using proper headers and error handling
          try {
            const fetchedPlans = await getPlans(block.block_id);
            if (fetchedPlans) {
              setPlans(fetchedPlans);
              
              // If plans exist and there's no selectedPlan yet, select the first one
              // if (fetchedPlans.length > 0 && !selectedPlan) {
              //   setSelectedPlan(fetchedPlans[0]);
              // }
            }
          } catch (error) {
            console.error("Error fetching plans:", error);
            // Fallback to empty plans if API fails
            setPlans([]);
          }
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchPlans();
    }
  }, [block]);

  // Handle map-initiated layer toggle updates
  const handleMapToggle = (layerName, isVisible) => {
    // Set the recursion prevention flag
    isUpdatingFromMap.current = true;
    
    try {
      // Special case for setState action - coming from map marker click
      if (layerName === 'setState' && typeof isVisible === 'object') {
        if (isVisible && isVisible.label && isVisible.district) {
          setState(isVisible);
          return;
        }
      }
    
      // Update the toggledLayers state
      setToggledLayers(prev => ({
        ...prev,
        [layerName]: isVisible
      }));
    } finally {
      // Reset the flag
      isUpdatingFromMap.current = false;
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <LandscapeNavbar />
      </div>
      <div className="flex h-[calc(100vh-48px)]">
        {showLeftSidebar && (
          <LeftSidebar onClose={() => setShowLeftSidebar(false)} />
        )}
        
        <div className="flex-1 relative p-2">
          {!showLeftSidebar && (
            <button 
              onClick={() => setShowLeftSidebar(true)}
              className="absolute top-4 left-4 z-10 bg-[#EDE9FE] p-2 rounded-md shadow-md text-[#8B5CF6]
              hover:bg-[#8B5CF6] hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                <path fillRule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/>
              </svg>
            </button>
          )}
          
          <Map 
            ref={setMapRef}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            state={state}
            district={district}
            block={block}
            filterSelections={filterSelections}
            lulcYear={lulcYear}
            toggledLayers={toggledLayers}
            toggleLayer={handleMapToggle} // Use handleMapToggle to properly handle map-initiated updates
            showMWS={showMWS}
            setShowMWS={setShowMWS}
            showVillages={showVillages}
            setShowVillages={setShowVillages}
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
            plans={plans}
            selectedPlan={selectedPlan}
            setSelectedPlan={setSelectedPlan}
            isLoading={isLoading}
            canFetchLayers={canFetchLayers}
            onCategoryChange={handleCategoryChange}
            handleFetchLayers={handleFetchLayers}
          />
        )}
        
        {!showRightSidebar && (
          <div 
            className="absolute top-20 right-0 z-10 bg-white p-2 px-3 rounded-l-md shadow-md hover:bg-gray-100 transition-colors flex items-center"
          >
            <button 
              onClick={() => setShowRightSidebar(true)}
              className="flex items-center"
              aria-label="Open filters panel"
            >
              <span className="font-medium text-gray-700 mr-2">Filters & Data</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/>
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LandscapeExplorer;