// src/components/kyl_rightSidebar.jsx
import React from "react";
import SelectButton from "./buttons/select_button";
import filtersDetails from "../components/data/Filters.json";
import ToggleButton from "./buttons/toggle_button_kyl";
import {
  stateDataAtom,
  stateAtom,
  districtAtom,
  blockAtom,
  filterSelectionsAtom,
} from "../store/locationStore.jsx";
import KYLMWSProfilePanel from "./kyl_MWSProfilePanel.jsx";
import { useRecoilState } from "recoil";

const KYLRightSidebar = ({
  state,
  district,
  block,
  setState,
  setDistrict,
  setBlock,
  statesData,
  handleItemSelect,
  setFilterSelections,
  setPatternSelections,
  getFormattedSelectedFilters,
  getFormattedSelectedPatterns,
  handlePatternRemoval,
  selectedMWS,
  selectedVillages,
  handleLayerSelection,
  toggleStates,
  setToggleStates,
  currentLayer,
  setCurrentLayer,
  mapRef,
  //onAnalyzeClick,
  onResetMWS,
  selectedMWSProfile,
  fetchWaterbodiesLayer,
  waterbodiesLayerRef,
  clickedWaterbodyId,
  waterbodyDashboardUrl,
}) => {
  const [globalState, setGlobalState] = useRecoilState(stateAtom);
  const [globalDistrict, setGlobalDistrict] = useRecoilState(districtAtom);
  const [globalBlock, setGlobalBlock] = useRecoilState(blockAtom);
  const [showWB, setShowWB] = React.useState(false);

  const handleIndicatorRemoval = (filter) => {
    // First, remove the visualization if it exists
    if (toggleStates[filter.name]) {
      // Find the layer in currentLayer
      const layerToRemove = currentLayer.find((l) => l.name === filter.name);
      if (layerToRemove) {
        // Remove all associated layers from the map
        layerToRemove.layerRef.forEach((layer) => {
          if (mapRef.current) {
            mapRef.current.removeLayer(layer);
          }
        });

        // Update currentLayer state by filtering out the removed layer
        setCurrentLayer((prev) => prev.filter((l) => l.name !== filter.name));
      }
    }

    // Reset the toggle state for this filter
    setToggleStates((prevStates) => ({
      ...prevStates,
      [filter.name]: false,
    }));

    // Then remove the filter selection
    const sourceType = (function () {
      for (const topLevelKey of Object.keys(filtersDetails)) {
        if (filtersDetails[topLevelKey]) {
          for (const categoryKey of Object.keys(filtersDetails[topLevelKey])) {
            const found = filtersDetails[topLevelKey][categoryKey].find(
              (f) => f.name === filter.name
            );
            if (found) return topLevelKey;
          }
        }
      }
      return null;
    })();

    if (sourceType === "MWS") {
      setFilterSelections((prev) => ({
        ...prev,
        selectedMWSValues: {
          ...prev.selectedMWSValues,
          [filter.name]: null,
        },
      }));
    } else if (sourceType === "Village") {
      setFilterSelections((prev) => ({
        ...prev,
        selectedVillageValues: {
          ...prev.selectedVillageValues,
          [filter.name]: null,
        },
      }));
    }
  };

  const toggleWaterbodies = async () => {
    if (!showWB) {
      await fetchWaterbodiesLayer();  
      setShowWB(true);
      return;
    }
      if (mapRef.current && waterbodiesLayerRef.current) {
      mapRef.current.removeLayer(waterbodiesLayerRef.current);
      waterbodiesLayerRef.current = null; 
    }
  
    setShowWB(false);
  };
  


  const handleTehsilReport = () => {
    const reportURL = `${process.env.REACT_APP_API_URL}/generate_tehsil_report/?state=${state.label.toLowerCase().split(" ").join("_")}&district=${district.label.toLowerCase().split(" ").join("_")}&block=${block.label.toLowerCase().split(" ").join("_")}`; // Replace with your actual URL
    window.open(reportURL, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="w-[320px] flex flex-col gap-2">
      {selectedMWSProfile ? (
        <KYLMWSProfilePanel mwsData={selectedMWSProfile} onBack={onResetMWS} />
      ) : (
        <div className="bg-white rounded-lg border border-gray-100 p-3">
          <div className="bg-white rounded-lg border border-gray-100 p-3">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-600 min-w-[45px]">
                  State
                </label>
                <SelectButton
                  currVal={state || { label: "Select State" }}
                  stateData={statesData}
                  handleItemSelect={handleItemSelect}
                  setState={(val) => {
                    setState(val);        // existing behaviour
                    setGlobalState(val);  // NEW → sync to recoil
                  }}
                  // setState={setState}
                  className="w-full border border-gray-200 rounded-md py-1.5 px-3"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-600 min-w-[45px]">
                  District
                </label>
                <SelectButton
                  currVal={district || { label: "Select District" }}
                  stateData={state !== null ? state.district : null}
                  handleItemSelect={handleItemSelect}
                  setState={(val) => {
                    setDistrict(val);
                    setGlobalDistrict(val);
                  }}
                  
                  // setState={setDistrict}
                  className="w-full border border-gray-200 rounded-md py-1.5 px-3"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-600 min-w-[45px]">
                  Tehsil
                </label>
                <SelectButton
                  currVal={block || { label: "Select Tehsil" }}
                  stateData={district !== null ? district.blocks : null}
                  handleItemSelect={handleItemSelect}
                  setState={(val) => {
                    setBlock(val);
                    setGlobalBlock(val);
                  }}
                  
                  // setState={setBlock}
                  className="w-full border border-gray-200 rounded-md py-1.5 px-3"
                />
              </div>
            </div>
            {block && (
              <div className="mt-6 space-y-2">
                <button 
                  className="w-full flex items-center justify-center gap-2 text-indigo-600 py-2 text-sm hover:bg-indigo-50 rounded-md transition-colors" 
                  onClick={handleTehsilReport}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.065 7-9.542 7s-8.268-2.943-9.542-7z"
                    />
                  </svg>
                  View Tehsil Report
                </button>
                <button
                      onClick={() => toggleWaterbodies()}
                      className={`w-full flex items-center justify-center gap-2 py-2 text-sm 
                                  rounded-md transition-colors hover:bg-indigo-50 
                                  ${showWB ? "text-red-600" : "text-indigo-600"}`}
                    >
                      {showWB ? (
                        <>
                          {/* Hide Waterbodies Icon */}
                          <svg xmlns="http://www.w3.org/2000/svg" 
                              width="18" height="18" viewBox="0 0 24 24" 
                              fill="none" stroke="currentColor" strokeWidth="2" 
                              strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2C12 2 7 8 7 12a5 5 0 0 0 8.6 3.5"/>
                            <path d="M5 12a7 7 0 0 0 11.6 4.5"/>
                            <line x1="3" y1="3" x2="21" y2="21"/>
                          </svg>
                          Hide Waterbodies
                        </>
                      ) : (
                        <>
                          {/* Show Waterbodies Icon */}
                          <svg xmlns="http://www.w3.org/2000/svg" 
                              width="18" height="18" viewBox="0 0 24 24" 
                              fill="none" stroke="currentColor" strokeWidth="2" 
                              strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2C12 2 7 8 7 12a5 5 0 0 0 10 0c0-4-5-10-5-10z"/>
                            <path d="M5 12a7 7 0 0 0 14 0"/>
                          </svg>
                          Show Waterbodies
                        </>
                      )}
              </button>


              </div>
            )}
          </div>
          <button
              className="w-full py-2 px-2 text-indigo-600 bg-indigo-100 rounded-lg text-xs font-medium text-left mb-1 mt-1"
            >
            Click on a micro-watershed (blue outline) to view its report.
            </button>
          <div className="bg-white rounded-lg border border-gray-100 p-3">
            <span className="text-sm font-medium">
              Selected Indicators ({getFormattedSelectedFilters().length})
            </span>
            <div className="mt-2 max-h-[150px] overflow-y-auto pr-2">
              <div className="space-y-2">
              {getFormattedSelectedFilters().map((filter, index) => (
                <div key={index} className="flex items-center justify-between gap-2">
                  <div className="flex-1 flex items-center bg-gray-50 rounded px-2 py-1.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col gap-y-0.5 text-[10px]">
                        <div className="flex gap-x-1">
                          <span className="text-gray-900 font-medium">
                            {filter.filterName}
                          </span>
                          <span className="text-gray-400">-</span>
                        </div>
                        {filter.values.map((value, valueIndex) => (
                          <span key={valueIndex} className="text-gray-500 pl-1">
                            {value}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => handleIndicatorRemoval(filter)}
                      className={`text-gray-400 hover:text-gray-600 ml-2 ${
                        toggleStates[filter.name] ? "invisible" : "visible"
                      }`}
                    >
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        viewBox="0 0 12 12"
                      >
                        <path
                          d="M8.5 3.5l-5 5M3.5 3.5l5 5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  </div>
                  <ToggleButton
                    isOn={toggleStates[filter.name]}
                    toggleSwitch={() => handleLayerSelection(filter)}
                  />
                </div>
              ))}
            </div>
            </div>
            {getFormattedSelectedFilters().length > 0 && (
              <div className="mt-4 text-xs text-gray-600">
                {selectedMWS !== null && selectedMWS.length === 0 && selectedVillages !== null && selectedVillages.length === 0
                  ? "There are no micro-watersheds and villages that matches your selected Filters."
                  : `The map on the left shows ${selectedMWS.length} micro-watersheds and ${selectedVillages.length} corresponding villages based on your selected filters.`}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg border border-gray-100 p-3 mt-2">
            <span className="text-sm font-medium">
              Selected Patterns ({getFormattedSelectedPatterns().length})
            </span>
   

            <div className="mt-2 max-h-[150px] overflow-y-auto pr-2">
              <div className="space-y-2">
                {getFormattedSelectedPatterns().map((pattern, index) => (
                  <div key={index} className="flex items-center justify-between gap-2">
                    <div className="flex-1 flex items-center bg-gray-50 rounded px-2 py-1.5">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap gap-x-1 text-[10px]">
                          <span className="text-gray-900 font-medium">
                            {pattern.category}
                          </span>
                          <span className="text-gray-400">-</span>
                          {/* <span className="text-gray-500">{pattern.characterstics}</span> */}
                        </div>
                      </div>
                      <button
                        onClick={() => handlePatternRemoval(pattern)}
                        className={`text-gray-400 hover:text-gray-600 ml-2 ${
                          toggleStates[pattern.patternName] ? "invisible" : "visible"
                        }`}
                      >
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          viewBox="0 0 12 12"
                        >
                          <path
                            d="M8.5 3.5l-5 5M3.5 3.5l5 5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                    </div>
                    
                  </div>
                  
                ))}
                
              </div>
              
            </div>
            
          </div>
          {clickedWaterbodyId && (
  <div className="p-3 bg-blue-50 border border-blue-200 rounded mt-3">
    <p className="font-semibold text-blue-800">
      Waterbody Selected: {clickedWaterbodyId}
    </p>

    <button
      onClick={() => window.open(waterbodyDashboardUrl, "_blank")}
      className="mt-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
    >
      Click to View Dashboard →
    </button>
  </div>
)}



        </div>
      )}
    </div>
  );
};

export default KYLRightSidebar;
