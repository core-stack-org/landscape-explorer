import { useState, useEffect } from 'react';
import DownloadButton from '../../buttons/download_button';
import SelectButton from '../../buttons/select_button';
import { 
  downloadGeoJson, 
  downloadKml, 
  downloadGeoTiff, 
  downloadExcel 
} from '../utils/downloadHelper';


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
  { id: 'land', label: 'Land' },
  { id: 'climate', label: 'Climate' },
  { id: 'hydro', label: 'Hydrology' },
  { id: 'agri', label: 'Agriculture' },
  { id: 'restore', label: 'Restoration' },
  { id: 'nrega', label: 'NREGA' },
  { id: 'social', label: 'Demographic' },
];

// Land Layers
const landLayersData = [
  { id: 1, name: "terrain", label: "Terrain", hasGeojson: false, hasKml: false, hasGeoTiff: true, hasStyle : true},
  { id: 2, name: "terrain_vector", label: "Terrain Vector", hasGeojson: true, hasKml: true, hasStyle : true },
  { id: "lulc_level_1", name:"lulc_level_1", label: "LULC Layer Level 1" },
  { id: "lulc_level_2", name:"lulc_level_2", label: "LULC Layer Level 2" },
]

const climateLayersData = [
  { id: 1, name: "mws_layers", label: "Hydrological Variables (Precipitation, ET, Groundwater, etc.)", hasGeojson: true, hasKml: true, hasStyle : true },
  { id: 2, name: "mws_layers_fortnight", label: "Fortnightly Hydrological Variables (Precipitation, ET, Groundwater, etc.)", hasGeojson: true, hasKml: true, hasStyle : false },
  { 
    id: 3, 
    name: "hydrological_boundaries", 
    label: "Hydrological Boundaries (Precipitation, ET, Groundwater, etc.)", 
    hasGeojson: true, 
    hasKml: true, 
    hasStyle : true 
  }
]

const hydrologyLayersData = [
  { id: 1, name: "drainage", label: "Drainage", hasGeojson: true, hasKml: true, hasStyle : true},
  { id: 2, name: "remote_sensed_waterbodies", label: "Remote-Sensed Waterbodies", hasGeojson: true, hasKml: true, hasStyle : false },
  { id: 3, name: "clart", label: "CLART", hasGeojson: false, hasKml: false, hasGeoTiff: true, hasStyle : true },
  { id: 4, name: "soge", label: "SOGE", hasGeojson: true, hasKml: false, hasGeoTiff: false, hasStyle : true },
  { id: 5, name: "aquifer", label: "Aquifer", hasGeojson: true, hasKml: false, hasGeoTiff: false, hasStyle : true },
]

const agriLayersData = [
  { id: "lulc_level_3", name:"lulc_level_3", label: "LULC Layer Level 3" },
  { id: 1, name: "cropping_intensity", label: "Cropping Intensity", hasGeojson: true, hasKml: true, hasStyle : true },
  { id: 2, name: "drought", label: "Drought", hasGeojson: true, hasKml: true, hasStyle : true },
]

const restorationLayersData = [
  { id: 1, name: "afforestation", label: "Change Detection Afforestation", hasGeojson: false, hasKml: false, hasGeoTiff: true, hasStyle : true },
  { id: 2, name: "deforestation", label: "Change Detection Deforestation", hasGeojson: false, hasKml: false, hasGeoTiff: true, hasStyle : true },
  { id: 3, name: "degradation", label: "Change Detection Degradation", hasGeojson: false, hasKml: false, hasGeoTiff: true, hasStyle : true },
  { id: 4, name: "urbanization", label: "Change Detection Urbanization", hasGeojson: false, hasKml: false, hasGeoTiff: true, hasStyle : true },
  { id: 5, name: "cropIntensity", label: "Change Detection Crop-Intensity", hasGeojson: false, hasKml: false, hasGeoTiff: true, hasStyle : true },
  { id: 6, name: "restoration", label: "Change Detection Restoration", hasGeojson: false, hasKml: false, hasGeoTiff: true, hasStyle : true }
]

const NREGALayerData = [
  { id: 1, name: "nrega", label: "NREGA", hasGeojson: true, hasKml: true, hasStyle : false },
]

const demographicLayerData =[
  { id: 1, name: "administrative_boundaries", label: "Administrative Boundaries", hasGeojson: true, hasKml: true, hasStyle : false },
  { id: 2, name: "demographics", label: "Socio-Economic", hasGeojson: true, hasKml: true, hasStyle : false },
]

// Years data for LULC
const yearDataLulc = [
  { label: "None", value: null },
  { label: "2017-2018", value: "17_18" },
  { label: "2018-2019", value: "18_19" },
  { label: "2019-2020", value: "19_20" },
  { label: "2020-2021", value: "20_21" },
  { label: "2021-2022", value: "21_22" },
  { label: "2022-2023", value: "22_23" },
  { label: "2023-2024", value: "23_24" },
  { label: "2024-2025", value: "24_25" }
];

const STYLE_DOWNLOAD_URLS = {
  afforestation: "https://drive.google.com/file/d/10RvFu28sIa-OpQvJ2z6D8-V5RROUUeZz/view?usp=drive_link",
  deforestation: "https://drive.google.com/file/d/1MFKAXiW5mpfCoBBMJR-K7Y5O_Uwp0kOR/view?usp=drive_link",
  terrain_vector: "https://drive.google.com/file/d/1RTogX5nacJYQLP2IFMQiQEBrQyyqPf-G/view?usp=sharing",
  degradation: "https://drive.google.com/file/d/1tPtEqhWO_RisycKnK8Bl_2yEnrfgWqfE/view?usp=drive_link",
  urbanization: "https://drive.google.com/file/d/16JHaWXxdq5y-g2wr5D_f7OB70jiA9QuA/view?usp=sharing",
  cropintensity: "https://drive.google.com/file/d/13cgF1Cg6YWZMCQXH7XV7cITxsg9v2SBu/view?usp=sharing",
  restoration: "https://drive.google.com/file/d/1JANwwxGDpy5vUkM2v8wqJDUKbVS8I72u/view?usp=sharing",
  clart: "https://drive.google.com/file/d/1B8ibmiv8dBNYZZ1gZWIp4AQPdu82t1yl/view?usp=drive_link",
  drainage: "https://drive.google.com/file/d/1s57ufrKk_iKWxIJTpy_S1Yt3nQD0DMjc/view?usp=drive_link",
  terrain: "https://drive.google.com/file/d/1gMh9Dj3ICJuw1vqgP9vEI9oIU_PLNsPs/view?usp=sharing",
  lulc_level_1: "https://drive.google.com/file/d/1mIVKi9N5QQI3QqFYj9y8uJGet5oRAVqA/view?usp=sharing",
  lulc_level_2: "https://drive.google.com/file/d/1q7Tzs7zwn3T4jhRqqYc7RgCNAktkWa9m/view?usp=drive_link",
  lulc_level_3: "https://drive.google.com/file/d/1GFc7W2AtlrYJbnveWkT08uSyeTasFQxT/view?usp=drive_link",
  soge: "https://drive.google.com/file/d/1iSgiTZOCxQ6t0tYVgVSI059Cz-3YimuR/view?usp=sharing",
  aquifer: "https://drive.google.com/file/d/1xHjtq893yQcCfBsuQ0G_SKko111xkv6F/view?usp=sharing",
  drought: "https://drive.google.com/file/d/1BIDbbsLaFxBO4YHMX-vyEt0VTSJLLlmL/view?usp=sharing",
  cropping_intensity: "https://drive.google.com/file/d/1cAZBQu4DUUPUS3u3VZtCzK4PYuSDgflW/view?usp=sharing",
  mws_layers: "https://github.com/core-stack-org/QGIS-Styles/tree/main/Climate",
  cropIntensity: "https://drive.google.com/file/d/1OkjCjs2RF0kLCMpgnM3REE4of1GpDisn/view?usp=sharing",
};

const handleStyleDownload = (layerName) => {
  const url = STYLE_DOWNLOAD_URLS[layerName];

  if (!url) {
    console.warn(`No style available for ${layerName}`);
    return;
  }

  window.open(url, "_blank");
};

// Single Layer Item Component
const LayerItem = ({ layer, isSelected, onToggle, onDownload, isLayersFetched, isLoading }) => {
  
  return (
    <div className="border-b border-gray-200 py-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{layer.label}</span>
        <button 
          onClick={() => {
            onToggle(layer.name);
          }}
          className="text-xs"
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
  onClick={() => onDownload(layer.name, 'geojson')}
  disabled={!isLayersFetched || isLoading}
  className="bg-[#EDE9FE] text-[#8B5CF6] hover:bg-[#DDD6FE]"
/>
          )}
          {layer.hasKml && (
            <DownloadButton 
  name="KML"
  onClick={() => onDownload(layer.name, 'kml')}
  disabled={!isLayersFetched || isLoading}
  className="bg-[#EDE9FE] text-[#8B5CF6] hover:bg-[#DDD6FE]"
/>
          )}
          {layer.hasGeoTiff && (
           <DownloadButton 
  name="GeoTIFF"
  onClick={() => onDownload(layer.name, 'geotiff')}
  disabled={!isLayersFetched || isLoading}
  className="bg-[#EDE9FE] text-[#8B5CF6] hover:bg-[#DDD6FE]"
/>
          )}
          {layer.hasStyle && (
            <DownloadButton 
  name="Style"
  onClick={() => handleStyleDownload(layer.name)}
  disabled={!isLayersFetched || isLoading}
  className="bg-[#EDE9FE] text-[#8B5CF6] hover:bg-[#DDD6FE]"
/>
          )
          }
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
      <div className="flex mt-2 space-x-2">
      <DownloadButton 
  name="GeoTIFF"
  onClick={() => onDownload(level.id, 'geotiff')}
  disabled={!lulcYear || !isLayersFetched || isLoading}
  className={`${!lulcYear ? 'bg-gray-100 text-gray-400' : ''}`}
/>

      <DownloadButton 
  name="Style"
  onClick={() => handleStyleDownload(level.id)}
  disabled={!isLayersFetched || isLoading}
  className="bg-[#EDE9FE] text-[#8B5CF6] hover:bg-[#DDD6FE]"
/>
      </div>
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
  handleExcelDownload,
  isLoading = false,
  canFetchLayers = false,
  onCategoryChange,
  lulcYear1,
  setLulcYear1,
  lulcYear2,
  setLulcYear2,
  lulcYear3,
  setLulcYear3
}) => {
  const [selectedCategory, setSelectedCategory] = useState('land');
  const [isLayersFetched, setIsLayersFetched] = useState(false);


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

  // Handle toggle clicklandLayersData
 const handleToggleClick = (filterName) => {
  if (!handleLayerToggle) return;

  const currentState = toggledLayers?.[filterName] || false;
  handleLayerToggle(filterName, !currentState);
};
  // Handle download click with proper URL formatting and direct download
  const handleDownloadClick = (filterName, format) => {
    if (!district || !block) {
      alert('Please select a district and block first');
      return;
    }

    const districtFormatted = district.label.toLowerCase().replace(/\s*\(\s*/g, '_').replace(/\s*\)\s*/g, '').replace(/\s+/g, '_');
    const blockFormatted = block.label.toLowerCase().replace(/\s*\(\s*/g, '_').replace(/\s*\)\s*/g, '').replace(/\s+/g, '_');

    if (format === 'geojson') {
      let url = '';
    
      switch(filterName) {
        case 'demographics':
          url = `https://geoserver.core-stack.org:8443/geoserver/panchayat_boundaries/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=panchayat_boundaries:${districtFormatted}_${blockFormatted}&outputFormat=application/json&screen=main`;
          break;
        case 'administrative_boundaries':
          url = `https://geoserver.core-stack.org:8443/geoserver/panchayat_boundaries/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=panchayat_boundaries:${districtFormatted}_${blockFormatted}&outputFormat=application/json&screen=main`;
          break;
        case 'drainage':
          url = `https://geoserver.core-stack.org:8443/geoserver/drainage/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=drainage:${districtFormatted}_${blockFormatted}&outputFormat=application/json&screen=main`;
          break;
        case 'remote_sensed_waterbodies':
          url = `https://geoserver.core-stack.org:8443/geoserver/swb/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=swb:surface_waterbodies_${districtFormatted}_${blockFormatted}&outputFormat=application/json&screen=main`;
          break;
        case 'aquifer':
          url = `https://geoserver.core-stack.org:8443/geoserver/aquifer/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=aquifer:aquifer_vector_${districtFormatted}_${blockFormatted}&outputFormat=application/json&screen=main`;
          break;
        case 'soge':
          url = `https://geoserver.core-stack.org:8443/geoserver/soge/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=soge:soge_vector_${districtFormatted}_${blockFormatted}&outputFormat=application/json&screen=main`;
          break;
        case 'terrain_vector':
          url = `https://geoserver.core-stack.org:8443/geoserver/terrain/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=terrain:${districtFormatted}_${blockFormatted}_cluster&outputFormat=application/json&screen=main`;
          break;
        case 'mws_layers':
          url = `https://geoserver.core-stack.org:8443/geoserver/mws_layers/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=mws_layers:deltaG_well_depth_${districtFormatted}_${blockFormatted}&outputFormat=application/json&screen=main`;
          break;
        case 'mws_layers_fortnight':
          url = `https://geoserver.core-stack.org:8443/geoserver/mws_layers/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=mws_layers:deltaG_fortnight_${districtFormatted}_${blockFormatted}&outputFormat=application/json&screen=main`;
          break;
        case 'drought':
          url = `https://geoserver.core-stack.org:8443/geoserver/drought/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=drought:${districtFormatted}_${blockFormatted}_drought&outputFormat=application/json&screen=main`;
          break;
        case 'nrega':
          url = `https://geoserver.core-stack.org:8443/geoserver/nrega_assets/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=nrega_assets:${districtFormatted}_${blockFormatted}&outputFormat=application/json&screen=main`;
          break;
        case 'cropping_intensity':
          url = `https://geoserver.core-stack.org:8443/geoserver/crop_intensity/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=crop_intensity:${districtFormatted}_${blockFormatted}_intensity&outputFormat=application/json&screen=main`;
          break;
        case 'hydrological_boundaries':
          url = `https://geoserver.core-stack.org:8443/geoserver/ows?service=WFS&version=1.1.0&request=GetFeature&typeName=mws_layers:deltaG_well_depth_${districtFormatted}_${blockFormatted}&outputFormat=application/json`;
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
        case 'administrative_boundaries':
          url = `https://geoserver.core-stack.org:8443/geoserver/panchayat_boundaries/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=panchayat_boundaries:${districtFormatted}_${blockFormatted}&outputFormat=application/vnd.google-earth.kml+xml&screen=main`;;
          break;
        case 'drainage':
          url = `https://geoserver.core-stack.org:8443/geoserver/drainage/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=drainage:${districtFormatted}_${blockFormatted}&outputFormat=application/vnd.google-earth.kml+xml&screen=main`;
          break;
        case 'remote_sensed_waterbodies':
          url = `https://geoserver.core-stack.org:8443/geoserver/swb/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=swb:surface_waterbodies_${districtFormatted}_${blockFormatted}&outputFormat=application/vnd.google-earth.kml+xml&screen=main`;
          break;
        case 'aquifer':
          url = `https://geoserver.core-stack.org:8443/geoserver/aquifer/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=aquifer:aquifer_vector_${districtFormatted}_${blockFormatted}&outputFormat=application/vnd.google-earth.kml+xml&screen=main`;
          break;
        case 'soge':
          url = `https://geoserver.core-stack.org:8443/geoserver/soge/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=soge:soge_vector_${districtFormatted}_${blockFormatted}&outputFormat=application/vnd.google-earth.kml+xml&screen=main`;
          break;
        case 'terrain_vector':
          url = `https://geoserver.core-stack.org:8443/geoserver/terrain/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=terrain:${districtFormatted}_${blockFormatted}_cluster&outputFormat=application/vnd.google-earth.kml+xml&screen=main`;
          break;
        case 'mws_layers':
          url = `https://geoserver.core-stack.org:8443/geoserver/mws_layers/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=mws_layers:deltaG_well_depth_${districtFormatted}_${blockFormatted}&outputFormat=application/vnd.google-earth.kml+xml&screen=main`;
          break;
        case 'mws_layers_fortnight':
          url = `https://geoserver.core-stack.org:8443/geoserver/mws_layers/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=mws_layers:deltaG_fortnight_${districtFormatted}_${blockFormatted}&outputFormat=application/vnd.google-earth.kml+xml&screen=main`;
          break;
        case 'drought':
          url = `https://geoserver.core-stack.org:8443/geoserver/cropping_drought/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=cropping_drought:${districtFormatted}_${blockFormatted}_drought&outputFormat=application/vnd.google-earth.kml+xml&screen=main`;
          break;
        case 'nrega':
          url = `https://geoserver.core-stack.org:8443/geoserver/nrega_assets/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=nrega_assets:${districtFormatted}_${blockFormatted}&outputFormat=application/vnd.google-earth.kml+xml&screen=main`;
          break;
        case 'cropping_intensity':
          url = `https://geoserver.core-stack.org:8443/geoserver/crop_intensity/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=crop_intensity:${districtFormatted}_${blockFormatted}_intensity&outputFormat=application/vnd.google-earth.kml+xml&screen=main`;
          break;
        case 'hydrological_boundaries':
          url = `https://geoserver.core-stack.org:8443/geoserver/ows?service=WFS&version=1.1.0&request=GetFeature&typeName=mws_layers:deltaG_well_depth_${districtFormatted}_${blockFormatted}&outputFormat=application/vnd.google-earth.kml+xml`;
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
      } else {
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
    
    const districtFormatted = district.label.toLowerCase().replace(/\s*\(\s*/g, '_').replace(/\s*\)\s*/g, '').replace(/\s+/g, '_');
    const blockFormatted = block.label.toLowerCase().replace(/\s*\(\s*/g, '_').replace(/\s*\)\s*/g, '').replace(/\s+/g, '_');

    const url = `https://geoserver.core-stack.org:8443/geoserver/LULC_level_${level.split('_').pop()}/wcs?service=WCS&version=2.0.1&request=GetCoverage&CoverageId=LULC_level_${level.split('_').pop()}:LULC_${yearValue}_${districtFormatted}_${blockFormatted}_level_${level.split('_').pop()}&format=geotiff&compression=LZW&tiling=false`;
    
    // Use our direct geotiff download function
    downloadGeoTiff(url, `LULC_${level.split('_').pop()}_${yearValue}`);
  };

  // Image layer download handler
  const handleImageLayerDownload = (layerName) => {

    if (!district || !block) {
      alert('Please select a district and block first');
      return;
    }
    
    const districtFormatted = district.label.toLowerCase().replace(/\s*\(\s*/g, '_').replace(/\s*\)\s*/g, '').replace(/\s+/g, '_');
    const blockFormatted = block.label.toLowerCase().replace(/\s*\(\s*/g, '_').replace(/\s*\)\s*/g, '').replace(/\s+/g, '_');
    
    let url = '';
    
    if (layerName === 'clart') {
      url = `https://geoserver.core-stack.org:8443/geoserver/clart/wcs?service=WCS&version=2.0.1&request=GetCoverage&CoverageId=clart:${districtFormatted}_${blockFormatted}_clart&format=geotiff&compression=LZW`;
    } else if (layerName === 'terrain') {
      url = `https://geoserver.core-stack.org:8443/geoserver/terrain/wcs?service=WCS&version=2.0.1&request=GetCoverage&CoverageId=terrain:${districtFormatted}_${blockFormatted}_terrain_raster&format=geotiff&compression=LZW`;
    }
    else if(layerName === 'restoration'){
      url = `https://geoserver.core-stack.org:8443/geoserver/restoration/wcs?service=WCS&version=2.0.1&request=GetCoverage&CoverageId=restoration:restoration_${districtFormatted}_${blockFormatted}_raster&format=geotiff&compression=LZW`;
    }
    else{
      url = `https://geoserver.core-stack.org:8443/geoserver/change_detection/wcs?service=WCS&version=2.0.1&request=GetCoverage&CoverageId=change_detection:change_${districtFormatted}_${blockFormatted}_${layerName.charAt(0).toUpperCase() + layerName.slice(1)}&format=geotiff&compression=LZW`;
    }
    if (url) {
      // Use our direct geotiff download function
      downloadGeoTiff(url, layerName);
    }
  };

  const handleLocalExcelDownload = () => {
  if (!state || !district || !block) {
    alert("Please select a state, district, and block first");
    return;
  }

  const url =
    `https://geoserver.core-stack.org/api/v1/download_excel_layer` +
    `?state=${state.label}&district=${district.label}&block=${block.label}`;

  downloadExcel(url, `${block.label}_data.xlsx`);
};
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
            <label className="text-sm text-gray-600 min-w-[45px]">Tehsil</label>
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
            {selectedCategory === 'land' && (
              <div>
                {landLayersData.map(layer => {
                  if (layer.id === "lulc_level_1") {
  return (
    <LulcSelector
      key={layer.id}
      level={layer}
      lulcYear={lulcYear1}
      setLulcYear={setLulcYear1}
      onDownload={handleDownloadClick}
      isLayersFetched={isLayersFetched}
      isLoading={isLoading}
    />
  );
}
                  else if (layer.id === "lulc_level_2") {
  return (
    <LulcSelector
      key={layer.id}
      level={layer}
      lulcYear={lulcYear2}
      setLulcYear={setLulcYear2}
      onDownload={handleDownloadClick}
      isLayersFetched={isLayersFetched}
      isLoading={isLoading}
    />
  );
}
                  else{
                    return <LayerItem 
                      key={layer.id}
                      layer={layer}
                      isSelected={toggledLayers?.[layer.name] || false}
                      onToggle={handleToggleClick}
                      onDownload={handleDownloadClick}
                      isLayersFetched={isLayersFetched}
                      isLoading={isLoading}
                    />
                  }
                })}
              </div>
            )}

            {selectedCategory === 'climate' && (
              <div>
                {climateLayersData.map(layer => (
                  <LayerItem 
                    key={layer.id}
                    layer={layer}
                    isSelected={toggledLayers?.[layer.name] || false}
                    onToggle={handleToggleClick}
                    onDownload={handleDownloadClick}
                    isLayersFetched={isLayersFetched}
                    isLoading={isLoading}
                  />
                ))}
              </div>
            )}

            {selectedCategory === 'hydro' && (
              <div>
                {hydrologyLayersData.map(layer => (
                  <LayerItem 
                    key={layer.id}
                    layer={layer}
                    isSelected={toggledLayers?.[layer.name] || false}
                    onToggle={handleToggleClick}
                    onDownload={handleDownloadClick}
                    isLayersFetched={isLayersFetched}
                    isLoading={isLoading}
                  />
                ))}
              </div>
            )}

            {selectedCategory === 'agri' && (
              <div>
                {agriLayersData.map(layer => {
                  if (layer.id === "lulc_level_3") {
  return (
    <LulcSelector
      key={layer.id}
      level={layer}
      lulcYear={lulcYear3}
      setLulcYear={setLulcYear3}
      onDownload={handleDownloadClick}
      isLayersFetched={isLayersFetched}
      isLoading={isLoading}
    />
  );
}
                  else{
                   return <LayerItem 
                      key={layer.id}
                      layer={layer}
                      isSelected={toggledLayers?.[layer.name] || false}
                      onToggle={handleToggleClick}
                      onDownload={handleDownloadClick}
                      isLayersFetched={isLayersFetched}
                      isLoading={isLoading}
                    />
                  }
                })}
              </div>
            )}

            {selectedCategory === 'restore' && (
              <div>
                {restorationLayersData.map(layer => (
                  <LayerItem 
                    key={layer.id}
                    layer={layer}
                    isSelected={toggledLayers?.[layer.name] || false}
                    onToggle={handleToggleClick}
                    onDownload={handleDownloadClick}
                    isLayersFetched={isLayersFetched}
                    isLoading={isLoading}
                  />
                ))}
              </div>
            )}

            {selectedCategory === 'nrega' && (
              <div>
                {NREGALayerData.map(layer => (
                  <LayerItem 
                    key={layer.id}
                    layer={layer}
                    isSelected={toggledLayers?.[layer.name] || false}
                    onToggle={handleToggleClick}
                    onDownload={handleDownloadClick}
                    isLayersFetched={isLayersFetched}
                    isLoading={isLoading}
                  />
                ))}
              </div>
            )}

            {selectedCategory === 'social' && (
              <div>
                {demographicLayerData.map(layer => (
                  <LayerItem 
                    key={layer.id}
                    layer={layer}
                    isSelected={toggledLayers?.[layer.name] || false}
                    onToggle={handleToggleClick}
                    onDownload={handleDownloadClick}
                    isLayersFetched={isLayersFetched}
                    isLoading={isLoading}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default RightSidebar;