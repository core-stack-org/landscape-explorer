import React, { useState, useEffect, useRef, useMemo } from "react";
import { useLocation,useNavigate } from "react-router-dom";
import { AGROFORESTRY_DASHBOARD_CONFIG } from "../config/dashboard_configs/waterDashboard.config.js";
import TableView from "./tableView.jsx";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import PublicIcon from "@mui/icons-material/Public";
import TableRowsIcon from "@mui/icons-material/TableRows";
import DashboardBasemap from "./dashboard_basemap.jsx";
import { Lightbulb } from "lucide-react";
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
  const navigate = useNavigate();

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

  const handlePlantationRowClick = (row) => {
    if (!plantationData?.features) return;
  
    // find matching feature by farmer name OR id
    const matchedFeature = plantationData.features.find((f) => {
      const props = f.properties || {};
      return (
        props.Name === row.farmerName ||
        f.id === row.id
      );
    });
  
    if (!matchedFeature) {
      console.warn("No plantation feature matched for row:", row);
      return;
    }
  
    // Build selectedPlantation object (same shape as map click)
    setSelectedPlantation({
      ...matchedFeature.properties,
      geometry: matchedFeature.geometry,
    });
  
    // switch to map view
    setShowMap(true);
  };
  

  return (
      <div className="mx-6 my-8 bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-3">
            <button onClick={() => navigate("/agrohorticulture",{replace:true})}
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
            {!selectedPlantation && (
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
            )}
      
      </div>
    </div>
    {showMap && selectedPlantation && (
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="font-bold text-blue-600 border-b-2 border-blue-600 pb-1 text-[clamp(1.1rem,1.7vw,1.5rem)]">
          {AGROFORESTRY_DASHBOARD_CONFIG.sections.section1.title}
          </h2>

      <div className="space-y-3 leading-relaxed">
      {AGROFORESTRY_DASHBOARD_CONFIG.sections.section1.paragraphs.map(
        (text, idx) => (
          <p
          key={idx}
          className="text-gray-700 leading-relaxed"
          style={{ fontSize: "clamp(0.70rem, 1vw, 1rem)" }}>{text}</p>
        )
      )}
    </div>
  </div>
)}

    {showMap ? (
      <>
        <div className=" bg-white rounded-xl shadow-md flex overflow-hidden">

          {/* MAP CONTAINER */}
          <div
            className={`transition-all duration-300 flex-[2] ${
              selectedPlantation ? "w-[50%]" : "w-full"
            }min-h-[300px]`}
          >
            <DashboardBasemap
              mode="plantation"
              plantationGeodata={plantationData}
              selectedPlantation={selectedPlantation}
              onSelectPlantation={setSelectedPlantation}
            />
                {showMap && selectedPlantation && (
          <div className="text-gray-500 text-[clamp(0.65rem,0.95vw,0.7rem)] mt-2 pl-2 w-full">
            <p><b>Land Use Land Cover : </b> Data remotely sensed from satellites including LandSat-7, LandSat-8, Sentinel-2, Sentinel-1, MODIS and Dynamic World</p>
            <p><b>NDVI : </b> Used harmonized Landsat-7, Landsat-8 and Sentinel-2 NDVI values to construct 16-day NDVI time series, gap-filled with MODIS NDVI values.</p>
          </div>
        )}
          </div>

          {/* RIGHT PANEL (future details / charts) */}
      {/* RIGHT PANEL (details / charts) */}
      {selectedPlantation && (
        <div className="w-[40%] h-full border-l bg-white overflow-y-auto p-4 space-y-6">

          {/* Stack Bar Chart */}
          <div className="min-h-[360px]">
            <PlantationStackBarGraph
              plantation={selectedPlantation}
              plantationData={plantationData}
              selectedFeature={selectedPlantation}
            />
          </div>

          {/* NDVI Chart */}
          <div className="min-h-[360px]">
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
        onRowClick={handlePlantationRowClick}
      />
    )}
    {/* ==================== BOTTOM REPORT FOOTER ==================== */}
    {  (
        <footer
          className="mt-10 border-t border-gray-300 pt-5 text-center text-[#2c2d2d]"
        >
          <p>
            Report generated on{" "}
            <span>{new Date().toLocaleDateString("en-IN", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}</span>{" "}
            | CoRE Stack Team
          </p>

          <p className="mt-2">
            Refer to our{" "}
            <a
              href="https://drive.google.com/file/d/1ZxovdpPThkN09cB1TcUYSE2BImI7M3k_/view"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-blue-600"
            >
              technical manual
            </a>{" "}
            for more details on how data was collected and processed.
          </p>

          <p className="mt-2 max-w-7xl mx-auto text-xs sm:text-sm leading-relaxed">
            Do note that while the underlying datasets have been validated against
            ground-truth in some locations, we need your feedback if the outputs
            shown here are in agreement with your observations about this area.
            Please do share your feedback with{" "}
            <a
              href="mailto:contact@core-stack.org"
              className="underline text-blue-600"
            >
              contact@core-stack.org
            </a>.
          </p>
        </footer>
      )}
      </div>
      
  );
};

export default PlantationProjectDashboard;
