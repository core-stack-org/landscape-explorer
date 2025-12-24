import React, { useState, useEffect, useRef, useMemo } from "react";
import { useLocation,useNavigate } from "react-router-dom";
import { AGROFORESTRY_DASHBOARD_CONFIG } from "../config/dashboard_configs/waterDashboard.config.js";
import TableView from "./tableView.jsx";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import PublicIcon from "@mui/icons-material/Public";
import TableRowsIcon from "@mui/icons-material/TableRows";
import DashboardBasemap from "./dashboard_basemap.jsx";
import { useRecoilState, useRecoilValue } from "recoil";
// import { yearAtom } from "../store/locationStore.jsx";
import HeaderSelect from "../pages/HeaderSelect.jsx";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import Map from "ol/Map";
import { Style, Fill, Stroke, Icon } from "ol/style";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import YearSlider from "./yearSlider";
import { yearAtomFamily } from "../store/locationStore.jsx";
import { fromLonLat } from "ol/proj";
import Point from "ol/geom/Point";
import Overlay from "ol/Overlay";

import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { Lightbulb } from "lucide-react";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import XYZ from "ol/source/XYZ";
import { Control, defaults as defaultControls } from "ol/control";
import FilterListIcon from "@mui/icons-material/FilterList";
import getImageLayer from "../actions/getImageLayers";
import Crop from "ol-ext/filter/Crop";
import MultiPolygon from "ol/geom/MultiPolygon";
import Feature from "ol/Feature";
import MouseWheelZoom from "ol/interaction/MouseWheelZoom";
import PinchZoom from "ol/interaction/PinchZoom";
import DoubleClickZoom from "ol/interaction/DoubleClickZoom";
import PlantationStackBarGraph from "./plantationStackBarGraph.jsx";
import PlantationNDVIChart from "./plantationNDVIChart.jsx";
import SoilPropertiesSection from "./soilPropertiesSection.jsx";


const PlantationProjectDashboard = ({organization,project}) => {
  const [plantationData,setPlantationData] = useState(null);
  const [selectedPlantation, setSelectedPlantation] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const orgName = organization?.label;
  const projectName = project?.label;
  const projectID = project?.value;
  console.log(orgName,projectName) 

  const navigate = useNavigate();

  useEffect(() => {
    if (!organization || !project) {
      navigate(-1);
    }
  }, [organization, project, navigate]);

  useEffect(()=>{
    if(!orgName && ! projectName) return;
    const fetchPlantationData = async () =>{
      const correctOrgName = orgName.replace(/\s+/g,"_");
      const correctProjectName = projectName.replace(/\s+/g,"_");
      console.log(correctOrgName,correctProjectName);
      const typeName = `plantation:${correctOrgName}_${correctProjectName}_site_suitability`;

      const url =
        `https://geoserver.core-stack.org:8443/geoserver/plantation/ows?` +
        new URLSearchParams({
          service: "WFS",
          version: "1.0.0",
          request: "GetFeature",
          typeName,
          outputFormat: "application/json",
        });
      try {
        const response = await fetch(url);
        if (!response.ok) {
          const errorText = await response.text();
          console.error("GeoServer error response:", errorText);
          throw new Error(`GeoServer returned status ${response.status}`);
        }
        const data = await response.json();
        setPlantationData(data);
      } catch (err) {
        console.error(" Failed to fetch or parse GeoJSON:", err);
        setPlantationData(null);
      }
    }
    fetchPlantationData();
  },[orgName,projectName,projectID]);

  const rows = useMemo(() => {
    if (!plantationData?.features) return [];
  
    return plantationData.features.map((feature, index) => {
      const props = feature.properties || {};
  
      return {
        id: feature.id || index,
        state: extractValue(props.description, "State"),
        district: extractValue(props.description, "District"),
        block: extractValue(props.description, "Taluka"),
        village: extractValue(props.description, "Village"),
        farmerName: props.Name || "NA",
        interventionYear: "2020-21", // chnage after dynamic
        area: props.area_ha ? props.area_ha.toFixed(2) : "NA",
        patchSuitability: props.patch_suitability ?? "NA",
        averageTreeCover: (props.patch_conf * 100)?.toFixed(1) ?? "NA",
        treeCoverChange: "NA",
        treeCoverChangeColor: "",
      };
    });
  }, [plantationData]);

  const totalRows = rows.length;

  const totalArea = useMemo(() => {
    return rows.reduce((sum, r) => {
      const val = Number(r.area);
      return sum + (isNaN(val) ? 0 : val);
    }, 0).toFixed(2);
  }, [rows]);


  function extractValue(description, key) {
    if (!description) return "NA";
  
    const match = description.match(new RegExp(`${key}:\\s*([^\\n]+)`));
    return match ? match[1].trim() : "NA";
  };

  return (
      <div className="mx-6 my-8 bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-3">
          <button onClick={() => navigate("/agrohorticulture")}
                className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm hover:bg-purple-600 flex items-center gap-2">
              <ArrowBackIosNewIcon sx={{ fontSize: 16 }} />
              <span>Back to Projects</span>
          </button>
          <button onClick={() => {  setSelectedPlantation(null);
                                    setShowMap((prev) => !prev)}}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm hover:bg-purple-600 flex items-center gap-2">
            {showMap ? (
              <TableRowsIcon sx={{ fontSize: 18 }} />
            ) : (
              <PublicIcon sx={{ fontSize: 18 }} />
            )}            
            <span>{showMap ? "View Table" : "View Map"}</span>
          </button>
          <div className="flex justify-end ml-24">
            <div className="flex items-center gap-6 bg-white px-6 py-2 rounded-xl shadow-sm">
              <Lightbulb size={36} className="text-gray-800" />
              <p className="text-gray-800 text-sm md:text-base font-medium text-center">
                {AGROFORESTRY_DASHBOARD_CONFIG.topSummaryText({
                  projectName: project?.label,
                  totalRows,
                  totalArea,
                })}
              </p>
            </div>
          </div>
      </div>
    </div>
    {showMap ? (
      <>
  <div className="h-[70vh] bg-white rounded-xl shadow-md flex overflow-hidden">

    {/* MAP CONTAINER */}
    <div
      className={`transition-all duration-300 h-full ${
        selectedPlantation ? "w-[50%]" : "w-full"
      }`}
    >
      <DashboardBasemap
        mode="plantation"
        plantationGeodata={plantationData}
        selectedPlantation={selectedPlantation}
        onSelectPlantation={setSelectedPlantation}
      />
    </div>

    {/* RIGHT PANEL (future details / charts) */}
 {/* RIGHT PANEL (details / charts) */}
{selectedPlantation && (
  <div className="w-[40%] h-full border-l bg-white overflow-y-auto p-4 space-y-6">

    {/* Stack Bar Chart */}
    <div className="h-[320px]">
      <PlantationStackBarGraph
        plantation={selectedPlantation}
        plantationData={plantationData}
        selectedFeature={selectedPlantation}
      />
    </div>

    {/* NDVI Chart */}
    <div className="h-[280px]">
      <PlantationNDVIChart
        plantation={selectedPlantation}
      />
    </div>
  </div>
)}
  </div>
  {selectedPlantation && (
      <div className="mt-6 bg-white rounded-xl shadow-md p-6">
        <SoilPropertiesSection plantation={selectedPlantation} />
      </div>
    )}
  </>
  
) : (

      <TableView
        headers={AGROFORESTRY_DASHBOARD_CONFIG.tableHeaders}
        rows={rows}
        pageSize={50}
        // onRowClick={handlePlantationClick}
      />
    )}

      </div>
  );
};

export default PlantationProjectDashboard;
