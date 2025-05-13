import { useState, useEffect } from 'react';
import SelectButton from '../../buttons/select_button';
import { 
  downloadGeoJson, 
  downloadKml, 
  downloadGeoTiff, 
  downloadExcel 
} from '../utils/downloadHelper';

// SVG Icons
const ChevronLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/>
  </svg>
);

const ChevronRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
  </svg>
);

const ToggleOnIcon = () => (
  <span className="px-2 py-0.5 bg-[#8B5CF6] text-white text-xs font-medium rounded-full">ON</span>
);

const ToggleOffIcon = () => (
  <span className="px-2 py-0.5 bg-[#EDE9FE] text-[#8B5CF6] text-xs font-medium rounded-full">OFF</span>
);

const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
    <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
    <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
  </svg>
);

// Main layer categories
const mainCategories = [
  { id: 'basic', label: 'Basic Layers' },
  { id: 'resources', label: 'Resources Layers' },
  { id: 'planning', label: 'Planning Layers' },
  { id: 'lulc', label: 'LULC Layers' }
];

// Basic layers data
const basicLayersData = [
  { id: 1, name: "demographics", label: "Demographics", hasGeojson: true, hasKml: true },
  { id: 2, name: "drainage", label: "Drainage", hasGeojson: true, hasKml: true },
  { id: 3, name: "remote_sensed_waterbodies", label: "Remote-Sensed Waterbodies", hasGeojson: true, hasKml: true },
  { id: 4, name: "hydrological_boundaries", label: "Hydrological Boundaries", hasGeojson: true, hasKml: true },
  { id: 5, name: "clart", label: "CLART", hasGeojson: false, hasKml: false, hasGeoTiff: true },
  { id: 6, name: "hydrological_variables", label: "Hydrological Variables", hasGeojson: true, hasKml: true },
  { id: 7, name: "nrega", label: "NREGA", hasGeojson: true, hasKml: true },
  { id: 8, name: "drought", label: "Drought", hasGeojson: true, hasKml: true },
  { id: 9, name: "terrain", label: "Terrain", hasGeojson: false, hasKml: false, hasGeoTiff: true },
  { id: 10, name: "administrative_boundaries", label: "Administrative Boundaries", hasGeojson: true, hasKml: true },
  { id: 11, name: "cropping_intensity", label: "Cropping Intensity", hasGeojson: true, hasKml: true },
  { id: 12, name: "terrain_vector", label: "Terrain Vector", hasGeojson: true, hasKml: true },
  { id: 13, name: "terrain_lulc_slope", label: "Terrain LULC Slope", hasGeojson: true, hasKml: true },
  { id: 14, name: "terrain_lulc_plain", label: "Terrain LULC Plain", hasGeojson: true, hasKml: true }
];

// Resources layers data
const resourcesLayersData = [
  { id: 15, name: "settlement", label: "Settlement", hasGeojson: true, hasKml: true },
  { id: 16, name: "water_structure", label: "Water Structure", hasGeojson: true, hasKml: true },
  { id: 17, name: "well_structure", label: "Well Structure", hasGeojson: true, hasKml: true }
];

// Planning layers data
const planningLayersData = [
  { id: 18, name: "agri_structure", label: "Agriculture Structure", hasGeojson: true, hasKml: true },
  { id: 19, name: "livelihood_structure", label: "Livelihood Structure", hasGeojson: true, hasKml: true },
  { id: 20, name: "recharge_structure", label: "Recharge Structure", hasGeojson: true, hasKml: true }
];

// LULC layers data
const lulcLevels = [
  { id: "lulc_level_1", label: "LULC Layer Level 1" },
  { id: "lulc_level_2", label: "LULC Layer Level 2" },
  { id: "lulc_level_3", label: "LULC Layer Level 3" }
];

// Years data for LULC
const yearDataLulc = [
  { label: "2016-2017", value: "16_17" },
  { label: "2017-2018", value: "17_18" },
  { label: "2018-2019", value: "18_19" },
  { label: "2019-2020", value: "19_20" },
  { label: "2020-2021", value: "20_21" },
  { label: "2021-2022", value: "21_22" },
  { label: "2022-2023", value: "22_23" }
];

// Enhanced DownloadButton component to replace your current one
const DownloadButton = ({ 
  name, 
  onClickEvent, 
  href, 
  download, 
  isDisabled = false,
  className = ""
}) => {
  const handleClick = (e) => {
    if (isDisabled) {
      e.preventDefault();
      return;
    }
    
    if (onClickEvent) {
      e.preventDefault();
      onClickEvent();
    }
  };

  const buttonClasses = `px-2 py-1 bg-[#EDE9FE] text-[#8B5CF6] rounded-md text-xs 
    hover:bg-[#DDD6FE] text-center transition-colors duration-200 
    flex items-center justify-center ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`;

  return href ? (
    <a 
      href={isDisabled ? undefined : href} 
      download={download}
      onClick={handleClick}
      className={buttonClasses}
    >
      <DownloadIcon />
      <span className="ml-1">{name}</span>
    </a>
  ) : (
    <button 
      onClick={handleClick}
      disabled={isDisabled}
      className={buttonClasses}
    >
      <DownloadIcon />
      <span className="ml-1">{name}</span>
    </button>
  );
};

// Single Layer Item Component
const LayerItem = ({ layer, isSelected, onToggle, onDownload, isLayersFetched, isLoading, selectedPlan }) => {
  // Define resource/planning layers array outside of the onClick handler
  const resourceOrPlanningLayers = [
    'settlement', 'water_structure', 'well_structure',
    'agri_structure', 'livelihood_structure', 'recharge_structure'
  ];
  
  // Check if this layer needs a plan to be toggled
  const needsPlan = resourceOrPlanningLayers.includes(layer.name);
  const isDisabled = needsPlan && !selectedPlan;
  
  return (
    <div className="border-b border-gray-200 py-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{layer.label}</span>
        <button 
          onClick={() => {
            if (needsPlan && !selectedPlan) {
              alert('Please select a plan first to toggle this layer');
              return;
            }
            onToggle(layer.name);
          }}
          className="text-xs"
          disabled={isDisabled}
        >
          {isSelected 
            ? <ToggleOnIcon /> 
            : <ToggleOffIcon />}
        </button>
      </div>
      
      {/* Download Options */}
      {(layer.hasGeojson || layer.hasKml || layer.hasGeoTiff) && isSelected && (
        <div className="flex mt-2 space-x-2">
          {layer.hasGeojson && (
            <DownloadButton 
              name="GeoJSON"
              onClickEvent={() => onDownload(layer.name, 'geojson')}
              isDisabled={!isLayersFetched || isLoading}
              className="bg-[#EDE9FE] text-[#8B5CF6] hover:bg-[#DDD6FE]"
            />
          )}
          {layer.hasKml && (
            <DownloadButton 
              name="KML"
              onClickEvent={() => onDownload(layer.name, 'kml')}
              isDisabled={!isLayersFetched || isLoading}
              className="bg-[#EDE9FE] text-[#8B5CF6] hover:bg-[#DDD6FE]"
            />
          )}
          {layer.hasGeoTiff && (
            <DownloadButton 
              name="GeoTIFF"
              onClickEvent={() => onDownload(layer.name, 'geotiff')}
              isDisabled={!isLayersFetched || isLoading}
              className="bg-[#EDE9FE] text-[#8B5CF6] hover:bg-[#DDD6FE]"
            />
          )}
        </div>
      )}
    </div>
  );
};

// LULC Selection Component
const LulcSelector = ({ level, lulcYear, setLulcYear, onDownload, isLayersFetched, isLoading }) => {
  return (
    <div className="bg-white rounded-md shadow-sm p-3 mb-3 border border-gray-100">
      <h4 className="text-sm font-medium text-gray-700 mb-2">{level.label}</h4>
      
      <div className="mb-3">
        <SelectButton
          currVal={lulcYear || { label: "Select Year" }}
          stateData={yearDataLulc}
          handleItemSelect={(setter, value) => setter(value)}
          setState={setLulcYear}
        />
      </div>
      
      <DownloadButton 
        name="GeoTIFF"
        onClickEvent={() => onDownload(level.id, 'geotiff')}
        isDisabled={!lulcYear || !isLayersFetched || isLoading}
        className={`w-full ${!lulcYear ? 'bg-gray-100 text-gray-400' : ''}`}
      />
    </div>
  );
};

// Main action buttons
const ActionButtons = ({ onDownloadExcel, isLoading, canFetchLayers }) => {
  return (
    <div className="flex space-x-3 mb-2">
      <button 
        onClick={onDownloadExcel}
        disabled={isLoading || !canFetchLayers}
        className={`flex items-center justify-center text-gray-700 bg-gray-100 border border-gray-300 py-2 px-4 focus:outline-none w-full ${
          !canFetchLayers
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : isLoading 
              ? 'bg-gray-50 text-gray-400 cursor-not-allowed' 
              : 'hover:bg-gray-200'
        } rounded text-sm font-medium transition-colors duration-200`}
      >
        <DownloadIcon />
        <span className="ml-2">Download Excel</span>
      </button>
    </div>
  );
};

const RightSidebar = ({
  state,
  district,
  block,
  setState,
  setDistrict,
  setBlock,
  statesData,
  handleItemSelect,
  onClose,
  handleLayerToggle,
  toggledLayers,
  handleFetchLayers,
  handleExcelDownload,
  selectedPlan,
  setSelectedPlan,
  plans = [],
  isLoading = false,
  canFetchLayers = false,
  onCategoryChange
}) => {
  const [selectedCategory, setSelectedCategory] = useState('basic');
  const [lulcYear1, setLulcYear1] = useState(null);
  const [lulcYear2, setLulcYear2] = useState(null);
  const [lulcYear3, setLulcYear3] = useState(null);
  const [isLayersFetched, setIsLayersFetched] = useState(false);
  
  // Flag to determine if plan selector should be shown
  const showPlanSelector = selectedCategory === 'resources' || selectedCategory === 'planning';

  // When category changes, inform the parent
  useEffect(() => {
    if (onCategoryChange) {
      onCategoryChange(selectedCategory);
    }
  }, [selectedCategory, onCategoryChange]);

  // Set isLayersFetched based on props
  useEffect(() => {
    if (district && block && canFetchLayers) {
      setIsLayersFetched(true);
    } else {
      setIsLayersFetched(false);
    }
  }, [district, block, canFetchLayers]);

  // Handle toggle click
  const handleToggleClick = (filterName) => {
    // If there's a handleLayerToggle prop, call it
    if (handleLayerToggle) {
      const currentState = toggledLayers?.[filterName] || false;
      handleLayerToggle(filterName, !currentState);
    }
  };
  // Handle download click with proper URL formatting and direct download
  const handleDownloadClick = (filterName, format) => {
    if (!district || !block) {
      alert('Please select a district and block first');
      return;
    }
    
    const districtFormatted = district.label.toLowerCase().split(" ").join("_");
    const blockFormatted = block.label.toLowerCase().split(" ").join("_");
    
    if (format === 'geojson') {
      let url = '';
      
      switch(filterName) {
        case 'demographics':
          url = `https://geoserver.core-stack.org:8443/geoserver/panchayat_boundaries/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=panchayat_boundaries:${districtFormatted}_${blockFormatted}&outputFormat=application/json&screen=main`;
          break;
        case 'drainage':
          url = `https://geoserver.core-stack.org:8443/geoserver/drainage/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=drainage:${districtFormatted}_${blockFormatted}&outputFormat=application/json&screen=main`;
          break;
        case 'remote_sensed_waterbodies':
          url = `https://geoserver.core-stack.org:8443/geoserver/water_bodies/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=water_bodies:surface_waterbodies_${districtFormatted}_${blockFormatted}&outputFormat=application/json&screen=main`;
          break;
        case 'hydrological_boundaries':
          url = `https://geoserver.core-stack.org:8443/geoserver/mws_layers/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=mws_layers:deltaG_well_depth_${districtFormatted}_${blockFormatted}&outputFormat=application/json&screen=main`;
          break;
        // Add cases for resource and planning layers
        case 'settlement':
          url = `https://geoserver.core-stack.org:8443/geoserver/resources/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=resources:hemlet_layer${blockFormatted}&outputFormat=application/json&screen=main`;
          break;
        case 'water_structure':
          url = `https://geoserver.core-stack.org:8443/geoserver/resources/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=resources:plan_layer_gw${blockFormatted}&outputFormat=application/json&screen=main`;
          break;
        case 'well_structure':
          url = `https://geoserver.core-stack.org:8443/geoserver/resources/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=resources:well_layer${blockFormatted}&outputFormat=application/json&screen=main`;
          break;
        case 'agri_structure':
          url = `https://geoserver.core-stack.org:8443/geoserver/works/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=works:plan_layer_agri${blockFormatted}&outputFormat=application/json&screen=main`;
          break;
        case 'livelihood_structure':
          url = `https://geoserver.core-stack.org:8443/geoserver/works/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=works:hemlet_layer${blockFormatted}&outputFormat=application/json&screen=main`;
          break;
        case 'recharge_structure':
          url = `https://geoserver.core-stack.org:8443/geoserver/works/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=works:plan_layer_gw${blockFormatted}&outputFormat=application/json&screen=main`;
          break;
        default:
          url = `https://geoserver.core-stack.org:8443/geoserver/${filterName}/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=${filterName}:${districtFormatted}_${blockFormatted}&outputFormat=application/json&screen=main`;
      }
      
      // Use our direct download function
      downloadGeoJson(url, filterName);
    } 
    else if (format === 'kml') {
      let url = '';
      
      switch(filterName) {
        case 'demographics':
          url = `https://geoserver.core-stack.org:8443/geoserver/panchayat_boundaries/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=panchayat_boundaries:${districtFormatted}_${blockFormatted}&outputFormat=application/vnd.google-earth.kml+xml&screen=main`;
          break;
        case 'drainage':
          url = `https://geoserver.core-stack.org:8443/geoserver/drainage/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=drainage:${districtFormatted}_${blockFormatted}&outputFormat=application/vnd.google-earth.kml+xml&screen=main`;
          break;
        case 'remote_sensed_waterbodies':
          url = `https://geoserver.core-stack.org:8443/geoserver/water_bodies/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=water_bodies:surface_waterbodies_${districtFormatted}_${blockFormatted}&outputFormat=application/vnd.google-earth.kml+xml&screen=main`;
          break;
        case 'hydrological_boundaries':
          url = `https://geoserver.core-stack.org:8443/geoserver/mws_layers/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=mws_layers:deltaG_well_depth_${districtFormatted}_${blockFormatted}&outputFormat=application/vnd.google-earth.kml+xml&screen=main`;
          break;
        // Add cases for resource and planning layers
        case 'settlement':
          url = `https://geoserver.core-stack.org:8443/geoserver/resources/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=resources:hemlet_layer${blockFormatted}&outputFormat=application/vnd.google-earth.kml+xml&screen=main`;
          break;
        case 'water_structure':
          url = `https://geoserver.core-stack.org:8443/geoserver/resources/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=resources:plan_layer_gw${blockFormatted}&outputFormat=application/vnd.google-earth.kml+xml&screen=main`;
          break;
        case 'well_structure':
          url = `https://geoserver.core-stack.org:8443/geoserver/resources/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=resources:well_layer${blockFormatted}&outputFormat=application/vnd.google-earth.kml+xml&screen=main`;
          break;
        case 'agri_structure':
          url = `https://geoserver.core-stack.org:8443/geoserver/works/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=works:plan_layer_agri${blockFormatted}&outputFormat=application/vnd.google-earth.kml+xml&screen=main`;
          break;
        case 'livelihood_structure':
          url = `https://geoserver.core-stack.org:8443/geoserver/works/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=works:hemlet_layer${blockFormatted}&outputFormat=application/vnd.google-earth.kml+xml&screen=main`;
          break;
        case 'recharge_structure':
          url = `https://geoserver.core-stack.org:8443/geoserver/works/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=works:plan_layer_gw${blockFormatted}&outputFormat=application/vnd.google-earth.kml+xml&screen=main`;
          break;
        default:
          url = `https://geoserver.core-stack.org:8443/geoserver/${filterName}/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=${filterName}:${districtFormatted}_${blockFormatted}&outputFormat=application/vnd.google-earth.kml+xml&screen=main`;
      }
      
      // Use our direct download function
      downloadKml(url, filterName);
    } 
    else if (format === 'geotiff') {
      // Handle GeoTIFF download based on layer
      if (filterName.includes('lulc')) {
        handleLulcLayerDownload(filterName);
      } else if (filterName === 'clart' || filterName === 'terrain') {
        handleImageLayerDownload(filterName);
      }
    }
  };

  // LULC Layer download handler
  const handleLulcLayerDownload = (level) => {
    if (!district || !block) {
      alert('Please select a district and block first');
      return;
    }
    
    let yearValue = null;
    
    if (level === 'lulc_level_1') {
      yearValue = lulcYear1?.value;
    } else if (level === 'lulc_level_2') {
      yearValue = lulcYear2?.value;
    } else if (level === 'lulc_level_3') {
      yearValue = lulcYear3?.value;
    }
    
    if (!yearValue) {
      alert('Please select a year first');
      return;
    }
    
    const url = `https://geoserver.core-stack.org:8443/geoserver/LULC_${level.split('_').pop()}/wcs?service=WCS&version=2.0.1&request=GetCoverage&CoverageId=LULC_${level.split('_').pop()}:LULC_${yearValue}_${block.label.toLowerCase().split(" ").join("_")}_level_${level.split('_').pop()}&format=geotiff&compression=LZW&tiling=false`;
    
    // Use our direct geotiff download function
    downloadGeoTiff(url, `LULC_${level.split('_').pop()}_${yearValue}`);
  };

  // Image layer download handler
  const handleImageLayerDownload = (layerName) => {
    if (!district || !block) {
      alert('Please select a district and block first');
      return;
    }
    
    const districtFormatted = district.label.toLowerCase().split(" ").join("_");
    const blockFormatted = block.label.toLowerCase().split(" ").join("_");
    
    let url = '';
    
    if (layerName === 'clart') {
      url = `https://geoserver.core-stack.org:8443/geoserver/clart/wcs?service=WCS&version=2.0.1&request=GetCoverage&CoverageId=clart:${districtFormatted}_${blockFormatted}_clart&format=geotiff&compression=LZW&tiling=false;`;
    } else if (layerName === 'terrain') {
      url = `https://geoserver.core-stack.org:8443/geoserver/terrain/wcs?service=WCS&version=2.0.1&request=GetCoverage&CoverageId=terrain:${districtFormatted}_${blockFormatted}_terrain_raster&format=geotiff&compression=LZW&tiling=true&tileheight=256&tilewidth=256`;
    }
    
    if (url) {
      // Use our direct geotiff download function
      downloadGeoTiff(url, layerName);
    }
  };

  // Handle Excel download with enhanced functionality
  const handleLocalExcelDownload = () => {
    if (!state || !district || !block) {
      alert('Please select a state, district, and block first');
      return;
    }
    
    const url = `https://geoserver.core-stack.org/api/v1/download_excel_layer?state=${state.label}&district=${district.label}&block=${block.label}`;
    
    // Use the Excel download function from parent component or our local version
    if (handleExcelDownload) {
      handleExcelDownload(url, `${block.label}_data.xlsx`);
    } else {
      // Fallback to our own implementation if parent doesn't provide one
      downloadExcel(url, `${block.label}_data.xlsx`)
        .finally(() => {
          console.log("Excel download complete");
        });
    }
  };

  // When plan changes, fetch appropriate layers
  useEffect(() => {
    const autoFetchLayersForPlan = () => {
      if (!selectedPlan || !block) return;
      
      if (selectedCategory === 'resources') {
        // Auto-toggle resources layers
        handleToggleClick('settlement');
        handleToggleClick('water_structure');
        handleToggleClick('well_structure');
      } else if (selectedCategory === 'planning') {
        // Auto-toggle planning layers
        handleToggleClick('agri_structure');
        handleToggleClick('livelihood_structure');
        handleToggleClick('recharge_structure');
      }
    };

    autoFetchLayersForPlan();
  }, [selectedPlan, block, selectedCategory]);

  return (
    <div className="w-[380px] flex flex-col h-full bg-white shadow-md relative">
      <div className="flex justify-between items-center p-4 border-b border-gray-200">
        <h2 className="font-semibold text-gray-800 text-lg">Filters & Data</h2>
        <button 
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <ChevronRightIcon />
        </button>
      </div>
      
      {/* Location Selection */}
      <div className="p-3 border-b border-gray-200 bg-gray-50">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 min-w-[45px]">State</label>
            <SelectButton
              currVal={state || { label: "Select State" }}
              stateData={statesData}
              handleItemSelect={handleItemSelect}
              setState={setState}
              className="w-full border border-gray-200 rounded-md py-1.5 px-3 text-gray-800 bg-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 min-w-[45px]">District</label>
            <SelectButton
              currVal={district || { label: "Select District" }}
              stateData={state !== null ? state.district : null}
              handleItemSelect={handleItemSelect}
              setState={setDistrict}
              className="w-full border border-gray-200 rounded-md py-1.5 px-3 text-gray-800 bg-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 min-w-[45px]">Block</label>
            <SelectButton
              currVal={block || { label: "Select Block" }}
              stateData={district !== null ? district.blocks : null}
              handleItemSelect={handleItemSelect}
              setState={setBlock}
              className="w-full border border-gray-200 rounded-md py-1.5 px-3 text-gray-800 bg-white"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons - only Download Excel */}
      <div className="px-3 py-1">
        <ActionButtons 
          onDownloadExcel={handleLocalExcelDownload}
          isLoading={isLoading}
          canFetchLayers={canFetchLayers}
        />
        
        {/* Plan Selector - Only show for resources or planning */}
        {block && showPlanSelector && plans && plans.length > 0 && (
          <div className="mb-2">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Select Plan</h4>
            <select 
              className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-700 text-sm"
              value={selectedPlan ? selectedPlan.label : ""}
              onChange={(e) => {
                const selected = plans.find(p => p.label === e.target.value);
                if (selected) {
                  handleItemSelect(setSelectedPlan, selected);
                }
              }}
              disabled={isLoading}
            >
              <option value="" disabled>{selectedPlan ? selectedPlan.label : "Select..."}</option>
              {plans.map((plan, idx) => (
                <option key={idx} value={plan.label}>{plan.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Only show category tabs and layers if all location dropdowns are selected */}
      {state && district && block && (
        <>
          {/* Category Tabs as buttons in grid layout */}
          <div className="px-3 pb-2 pt-0 border-b border-gray-200">
            <div className="grid grid-cols-2 gap-2">
              {mainCategories.map(cat => (
                <button
                  key={cat.id}
                  className={`py-2 px-3 rounded-md text-sm ${
                    selectedCategory === cat.id 
                      ? 'bg-white border border-gray-300 text-gray-800 font-medium' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable container for layers */}
          <div className="flex-1 overflow-y-auto p-3">
            {/* Basic Layers */}
            {selectedCategory === 'basic' && (
              <div>
                {basicLayersData.map(layer => (
                  <LayerItem 
                    key={layer.id}
                    layer={layer}
                    isSelected={toggledLayers?.[layer.name] || false}
                    onToggle={handleToggleClick}
                    onDownload={handleDownloadClick}
                    isLayersFetched={isLayersFetched}
                    isLoading={isLoading}
                    selectedPlan={selectedPlan} // Add this prop
                  />
                ))}
              </div>
            )}

            {/* Resources Layers */}
            {selectedCategory === 'resources' && (
              <div>
                {resourcesLayersData.map(layer => (
                  <LayerItem 
                    key={layer.id}
                    layer={layer}
                    isSelected={toggledLayers?.[layer.name] || false}
                    onToggle={handleToggleClick}
                    onDownload={handleDownloadClick}
                    isLayersFetched={isLayersFetched}
                    isLoading={isLoading}
                    selectedPlan={selectedPlan} // Add this prop
                  />
                ))}
              </div>
            )}

            {/* Planning Layers */}
            {selectedCategory === 'planning' && (
              <div>
                {planningLayersData.map(layer => (
                  <LayerItem 
                    key={layer.id}
                    layer={layer}
                    isSelected={toggledLayers?.[layer.name] || false}
                    onToggle={handleToggleClick}
                    onDownload={handleDownloadClick}
                    isLayersFetched={isLayersFetched}
                    isLoading={isLoading}
                    selectedPlan={selectedPlan} // Add this prop
                  />
                ))}
              </div>
            )}

            {/* LULC Layers */}
            {selectedCategory === 'lulc' && (
              <div className="space-y-4">
                <LulcSelector 
                  level={lulcLevels[0]}
                  lulcYear={lulcYear1}
                  setLulcYear={setLulcYear1}
                  onDownload={handleDownloadClick}
                  isLayersFetched={isLayersFetched}
                  isLoading={isLoading}
                />
                <LulcSelector 
                  level={lulcLevels[1]}
                  lulcYear={lulcYear2}
                  setLulcYear={setLulcYear2}
                  onDownload={handleDownloadClick}
                  isLayersFetched={isLayersFetched}
                  isLoading={isLoading}
                />
                <LulcSelector 
                  level={lulcLevels[2]}
                  lulcYear={lulcYear3}
                  setLulcYear={setLulcYear3}
                  onDownload={handleDownloadClick}
                  isLayersFetched={isLayersFetched}
                  isLoading={isLoading}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default RightSidebar;