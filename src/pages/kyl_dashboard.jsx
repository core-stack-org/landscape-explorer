import { useEffect, useRef, useState } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import {
  stateDataAtom,
  stateAtom,
  districtAtom,
  blockAtom,
  filterSelectionsAtom,
  yearAtom,
  dataJsonAtom,
  selectedWaterbodyForTehsilAtom
} from "../store/locationStore.jsx";

//* OpenLayers imports
import "ol/ol.css";
import XYZ from "ol/source/XYZ";
import TileLayer from "ol/layer/Tile";
import Control from "ol/control/Control.js";
import { defaults as defaultControls } from "ol/control/defaults.js";
import { Map, View } from "ol";
import { Fill, Stroke, Style } from "ol/style.js";
import GeoJSON from "ol/format/GeoJSON";

import LandingNavbar from "../components/landing_navbar.jsx";
import getStates from "../actions/getStates.js";
import getVectorLayers from "../actions/getVectorLayers.js";
import getImageLayer from "../actions/getImageLayers.js";
import filtersDetails from "../components/data/Filters.json";
import PatternsData from '../components/data/Patterns.json';

import KYLLeftSidebar from "../components/kyl_leftSidebar";
import KYLRightSidebar from "../components/kyl_rightSidebar.jsx";
import KYLMapContainer from "../components/kyl_mapContainer.jsx";
import layerStyle from "../components/utils/layerStyle.jsx";
import { getAllPatternTypes, getSubcategoriesForCategory, getPatternsForSubcategory } from '../components/utils/patternsHelper.js';
import { handlePatternSelection as handlePatternSelectionLogic, isPatternSelected } from '../components/utils/patternSelectionLogic.js';

import { toast, Toaster } from "react-hot-toast";
import {
  trackPageView,
  trackEvent,
  initializeAnalytics,
} from "../services/analytics";
import getWebGlLayers from "../actions/getWebGlLayers.js";

const KYLDashboardPage = () => {
  const mapElement = useRef(null);
  const mapRef = useRef(null);
  const baseLayerRef = useRef(null);
  const boundaryLayerRef = useRef(null);
  const mwsLayerRef = useRef(null);
  const waterbodiesLayerRef = useRef(null);

  const [isLoading, setIsLoading] = useState(false);
  const [islayerLoaded, setIsLayerLoaded] = useState(false);
  const [highlightMWS, setHighlightMWS] = useState(null)
  const [selectedMWS, setSelectedMWS] = useState([]);

  const [dataJson, setDataJson] = useRecoilState(dataJsonAtom);
  const [villageJson, setVillageJson] = useState(null);

  const [mappedAssets, setMappedAssets] = useState(false);
  const [mappedDemands, setMappedDemands] = useState(false);
  const [currentLayer, setCurrentLayer] = useState([]);
  const [toggleStates, setToggleStates] = useState({});
  const [villageIdList, setVillageIdList] = useState(new Set([]));
  const [patternVillageList, setPatternVillageList] = useState(new Set([]));
  const [finalVillageList, setFinalVillageList] = useState(new Set([]))

  const [statesData, setStatesData] = useRecoilState(stateDataAtom);
  const [state, setState] = useRecoilState(stateAtom);
  const [district, setDistrict] = useRecoilState(districtAtom);
  const [block, setBlock] = useRecoilState(blockAtom);
  const [filterSelections, setFilterSelections] = useRecoilState(filterSelectionsAtom);
  const [patternSelections, setPatternSelections] = useState({ selectedMWSPatterns: {}, selectedVillagePatterns: {} });

  const lulcYear = useRecoilValue(yearAtom);

  const [indicatorType, setIndicatorType] = useState(null);
  const [showMWS, setShowMWS] = useState(true);
  const [showVillages, setShowVillages] = useState(true);
  const [filtersEnabled, setFiltersEnabled] = useState(false);

  const [toastId, setToastId] = useState(null);
  const [selectedMWSProfile, setSelectedMWSProfile] = useState(null);
  const [searchLatLong, setSearchLatLong] = useState(null);

  // * Triggers
  const [filterTrigger, setFilterTrigger] = useState(0)
  const [patternTrigger, setPatternTrigger] = useState(0)
  const [villagePatternTrigger, setvillagePatternTrigger] = useState(0)

  const [clickedWaterbodyId, setClickedWaterbodyId] = useState(null);
  const [waterbodyDashboardUrl, setWaterbodyDashboardUrl] = useState(null);
  const [selectedWaterbodyProfile, setSelectedWaterbodyProfile] = useState(null);

  const waterbodyClickedRef = useRef(false);

  const [selectedWaterbodyForTehsil, setSelectedWaterbodyForTehsil] = useRecoilState(selectedWaterbodyForTehsilAtom);
  const [showWB, setShowWB] = useState(false);

  const addLayerSafe = (layer) => layer && mapRef.current && mapRef.current.addLayer(layer);

  const transformName = (name) => {
                    if (!name) return name;
                    return name
                        .replace(/[()]/g, "") // Remove all parentheses
                        .replace(/[-\s]+/g, "_") // Replace dashes and spaces with "_"
                        .replace(/_+/g, "_") // Collapse multiple underscores to one
                        .replace(/^_|_$/g, "") // Remove leading/trailing underscores
                        .toLowerCase();
                };

  const handleResetMWS = () => {
    if (!selectedMWSProfile) return; // If no MWS is selected, do nothing

    setSelectedMWSProfile(null);

    // Only reset the style of the currently selected (green) MWS
    if (mwsLayerRef.current) {
      resetMWSStyle();
    }

    if (toastId) {
      toast.dismiss(toastId);
      setToastId(null);
    }
  };

  const getAllFilterTypes = () => {
    const types = new Set();
    Object.keys(filtersDetails).forEach((indicator) => {
      Object.keys(filtersDetails[indicator]).forEach((type) => {
        types.add(type);
      });
    });
    return Array.from(types);
  };

  const getAllFilters = () => {
    const allFilters = [];
    Object.keys(filtersDetails).forEach((indicator) => {
      Object.keys(filtersDetails[indicator]).forEach((type) => {
        filtersDetails[indicator][type].forEach((filter) => {
          if (
            (filter.type === 1 || filter.type === 2) &&
            filter.values.length > 0
          ) {
            allFilters.push({
              ...filter,
              category: type,
            });
          }
        });
      });
    });
    return allFilters;
  };

  const getFormattedSelectedFilters = () => {
    const allSelections = [];
    const groupedSelections = {}; // To group by filter name

    const processSelections = (selections, dataSource) => {
      if (!selections) return;
      Object.entries(selections).forEach(([name, values]) => {
        if (!values) return;

        let filterGroup = null;

        outerLoop: for (const ind of Object.keys(filtersDetails)) {
          for (const type of Object.keys(filtersDetails[ind])) {
            const found = filtersDetails[ind][type].find(
              (group) => group.name === name
            );
            if (found) {
              filterGroup = found;
              break outerLoop;
            }
          }
        }

        if (filterGroup) {
          // If this filter name hasn't been added yet, initialize it
          if (!groupedSelections[name]) {
            groupedSelections[name] = {
              filterName: filterGroup.label,
              values: [],
              name: filterGroup.name,
              layer_store: values[0].layer_store,
              layer_name: values[0].layer_name,
              rasterStyle: values[0].rasterStyle,
              vectorStyle: values[0].vectorStyle,
              styleIdx: values[0].styleIdx,
            };
          }

          // Add all selected values to the values array
          values.forEach((selectedOption) => {
            groupedSelections[name].values.push(selectedOption.label);
          });
        }
      });
    };

    processSelections(filterSelections.selectedMWSValues, "MWS");
    processSelections(filterSelections.selectedVillageValues, "Village");

    // Convert grouped object back to array
    Object.values(groupedSelections).forEach(group => {
      allSelections.push(group);
    });

    return allSelections;
  };

  const getFormattedSelectedPatterns = () => {
    const allSelections = [];

    const processSelections = (selections) => {
      if (!selections) return
      Object.entries(selections).forEach(([name, values]) => {
        if (!values) return;

        let filterGroup = null;

        outerLoop: for (const ind of Object.keys(PatternsData)) {
          for (const x of Object.keys(PatternsData[ind])) {
            for (const y of Object.keys(PatternsData[ind][x])) {
              const found = PatternsData[ind][x][y].find((group) => group.Name === name);
              if (found) {
                filterGroup = found;
                break outerLoop;
              }
            }
          }
        }

        if (filterGroup) {
          allSelections.push({
            patternName: filterGroup.Name,
            category: filterGroup.Category,
            level: filterGroup.level,
            values: filterGroup.Values,
            characterstics: filterGroup.Characteristics
          })
        }

      })
    }

    processSelections(patternSelections.selectedMWSPatterns);
    processSelections(patternSelections.selectedVillagePatterns);

    return allSelections;
  }

  const determineFilterSource = (filterName) => {
    for (const topLevelKey of Object.keys(filtersDetails)) {
      if (filtersDetails[topLevelKey]) {
        for (const categoryKey of Object.keys(filtersDetails[topLevelKey])) {
          const found = filtersDetails[topLevelKey][categoryKey].find(
            (f) => f.name === filterName
          );
          if (found) {
            return { ...found, name: topLevelKey };
          }
        }
      }
    }
    return null;
  };

  // Filter selection handlers
  const handleFilterSelection = (name, option, isChecked) => {
    const sourceType = determineFilterSource(name);
    option = {
      ...option,
      layer_store: sourceType["layer_store"],
      layer_name: sourceType["layer_name"],
      rasterStyle: sourceType["rasterStyle"],
      vectorStyle: sourceType["vectorStyle"],
      styleIdx: sourceType["styleIdx"],
    };

    if (sourceType.name === "MWS") {
      setFilterSelections((prev) => {
        // Get current array for this key, or empty array if doesn't exist
        const currentArray = prev.selectedMWSValues[name] || [];

        let newArray;
        if (isChecked) {
          // Check if option with same label already exists
          const exists = currentArray.some(item => item.label === option.label);
          if (!exists) {
            // Add to array if it doesn't exist
            newArray = [...currentArray, option];
          } else {
            // Already exists, keep current array unchanged
            newArray = currentArray;
          }
        } else {
          // Remove from array by filtering out the matching label
          newArray = currentArray.filter(item => item.label !== option.label);
        }

        return {
          ...prev,
          selectedMWSValues: {
            ...prev.selectedMWSValues,
            [name]: newArray.length > 0 ? newArray : null,
          },
        };
      });
    } else if (sourceType.name === "Village") {
      setFilterSelections((prev) => {
        // Get current array for this key, or empty array if doesn't exist
        const currentArray = prev.selectedVillageValues[name] || [];

        let newArray;
        if (isChecked) {
          // Check if option with same label already exists
          const exists = currentArray.some(item => item.label === option.label);
          if (!exists) {
            // Add to array if it doesn't exist
            newArray = [...currentArray, option];
          } else {
            // Already exists, keep current array unchanged
            newArray = currentArray;
          }
        } else {
          // Remove from array by filtering out the matching label
          newArray = currentArray.filter(item => item.label !== option.label);
        }

        return {
          ...prev,
          selectedVillageValues: {
            ...prev.selectedVillageValues,
            [name]: newArray.length > 0 ? newArray : null,
          },
        };
      });
    }
  };

  // Pattern selection handler
  const handlePatternSelection = (pattern, isSelected) => {
    handlePatternSelectionLogic(
      pattern,
      isSelected,
      patternSelections,
      setPatternSelections
    );
  };

  const filterWaterbodiesByMWS = () => {
    if (!waterbodiesLayerRef.current || !mwsLayerRef.current) return;

    const waterbodiesSource = waterbodiesLayerRef.current.getSource();
    const mwsSource = mwsLayerRef.current.getSource();

    // Wait for features to be loaded
    const wbFeatures = waterbodiesSource.getFeatures();
    const mwsFeatures = mwsSource.getFeatures();
    
    if (wbFeatures.length === 0 || mwsFeatures.length === 0) {
      console.warn('Features not loaded yet');
      return;
    }

    // If no MWS selected, show all waterbodies
    if (!selectedMWS.length) {
      wbFeatures.forEach(feature => {
        feature.setStyle(undefined); // Reset to default style
      });
      return;
    }

    // Get selected MWS polygons
    const selectedMWSPolygons = mwsFeatures.filter(feature => {
      const uid = feature.get('uid');
      return selectedMWS.includes(uid);
    });

    if (selectedMWSPolygons.length === 0) {
      console.warn('No MWS polygons found for selected UIDs');
      // Show all waterbodies if no valid MWS found
      wbFeatures.forEach(feature => {
        feature.setStyle(undefined);
      });
      return;
    }

    // Filter waterbodies by intersection
    wbFeatures.forEach(wbFeature => {
      const wbGeom = wbFeature.getGeometry();
      if (!wbGeom) return;

      const intersects = selectedMWSPolygons.some(mwsFeature => {
        const mwsGeom = mwsFeature.getGeometry();
        if (!mwsGeom) return false;

        // Check if any coordinate of waterbody is inside MWS polygon
        const coordinates = wbGeom.getType() === 'Polygon' 
          ? wbGeom.getCoordinates()[0] 
          : wbGeom.getCoordinates()[0][0];
        
        return coordinates.some(coord => mwsGeom.intersectsCoordinate(coord));
      });

      if (intersects) {
        wbFeature.setStyle(undefined); // Show waterbody with default style
      } else {
        wbFeature.setStyle(new Style({})); // Hide waterbody
      }
    });

  };

  const resetMWSStyle = () => {
    mwsLayerRef.current.setStyle((feature) => {
      if (selectedMWS.length > 0 && selectedMWS.includes(feature.values_.uid)) {
        // Filtered areas - highlight in red
        return new Style({
          stroke: new Stroke({
            color: "#661E1E",
            width: 1.0,
          }),
          fill: new Fill({
            color: "rgba(255, 75, 75, 0.8)",
          }),
        });
      } else {
        // Default display - light yellow
        return new Style({
          stroke: new Stroke({
            color: "#4a90e2",
            width: 1.0,
          }),
          fill: new Fill({
            color: "rgba(74, 144, 226, 0.2)",
          }),
        });
      }
    });
  }

  const fetchMWSLayer = async (tempMWS) => {
    if (!district || !block) return;

    if (tempMWS.length === 0) {
      try {
        if (mwsLayerRef.current === null) {
          const layerName = `deltaG_well_depth_${district.label
            .toLowerCase()
            .split(" ")
            .join("_")}_${block.label
              .toLowerCase()
              .replace(/\s*\(\s*/g, "_")
              .replace(/\s*\)\s*/g, "")
              .replace(/\s+/g, "_")}`;
          const mwsLayer = await getVectorLayers(
            "mws_layers",
            layerName,
            true,
            true
          );
          if (mapRef.current) {
            mapRef.current.removeLayer(boundaryLayerRef.current);
            mapRef.current.addLayer(mwsLayer);
            mapRef.current.addLayer(boundaryLayerRef.current);
          }
          mwsLayerRef.current = mwsLayer;
        }
        mwsLayerRef.current.setStyle((feature) => {
          if (highlightMWS !== null && feature.values_.uid === highlightMWS) {
            setSelectedMWSProfile(feature.getProperties())
            return new Style({
              stroke: new Stroke({
                color: "#166534",
                width: 2.0,
              }),
              fill: new Fill({
                color: "rgba(34, 197, 94, 0.4)",
              }),
            });
          }
          else if (tempMWS.length > 0 && tempMWS.includes(feature.values_.uid)) {
            // Filtered areas - highlight in red
            return new Style({
              stroke: new Stroke({
                color: "#661E1E",
                width: 1.0,
              }),
              fill: new Fill({
                color: "rgba(255, 75, 75, 0.8)",
              }),
            });
          } else {
            // Default display - light yellow
            return new Style({
              stroke: new Stroke({
                color: "#4a90e2",
                width: 1.0,
              }),
              fill: new Fill({
                color: "rgba(85, 152, 229, 0.2)",
              }),
            });
          }
        });
      } catch (error) {
        console.error("Error fetching MWS layer:", error);
        toast.error("Please Refresh the Page !")
      }
    } else {
      try {
        mwsLayerRef.current.setStyle((feature) => {
          if (highlightMWS !== null && feature.values_.uid === highlightMWS) {
            setSelectedMWSProfile(feature.getProperties())
            return new Style({
              stroke: new Stroke({
                color: "#166534",
                width: 2.0,
              }),
              fill: new Fill({
                color: "rgba(34, 197, 94, 0.4)",
              }),
            });
          }
          else if (
            tempMWS.length > 0 &&
            tempMWS.includes(feature.values_.uid) &&
            currentLayer.length === 0
          ) {
            // Filtered areas - highlight in red
            return new Style({
              stroke: new Stroke({
                color: "#661E1E",
                width: 1.0,
              }),
              fill: new Fill({
                color: "rgba(255, 75, 75, 0.8)",
              }),
            });
          }
          else if (
            tempMWS.length > 0 &&
            tempMWS.includes(feature.values_.uid)
          ) {
            return new Style({
              stroke: new Stroke({
                color: "#254871",
                width: 1.5,
              }),
            });
          }
        });
      } catch (err) {
        console.log("Error in setting MWS style :", err);
      }
    }
  };

  const fetchWaterBodiesLayer = async() => {
    if (!district || !block || !mapRef.current) return;

    const dist = district.label
      .toLowerCase()
      .replace(/\s*\(\s*/g, "_")
      .replace(/\s*\)\s*/g, "")
      .replace(/\s+/g, "_");

    const blk = block.label
      .toLowerCase()
      .replace(/\s*\(\s*/g, "_")
      .replace(/\s*\)\s*/g, "")
      .replace(/\s+/g, "_");

    const layerName = `surface_waterbodies_${dist}_${blk}`;

    // If already loaded, skip
    if (waterbodiesLayerRef.current) {
      return;
    }

    // Create vector layer
    const wbLayer = await getVectorLayers(
      "swb",
      layerName,
      true,  
      true 
    );
    
    wbLayer.setStyle((feature) => {
      const geom = feature.getGeometry();
      if (!geom) return null;
    
      let pointGeom = null;
    
      if (geom.getType() === "Polygon") {
        pointGeom = geom.getInteriorPoint();
      } else if (geom.getType() === "MultiPolygon") {
        const pts = geom.getInteriorPoints();
        pointGeom = pts.getPoint(0);
      }
    
      return [
        new Style({
          geometry: geom,
          stroke: new Stroke({
            color: "rgba(246, 252, 83, 0.8)",
            width: 2,
          }),
          fill: new Fill({
            color: "rgba(246, 252, 83, 0.45)",
          }),
        }),
      ];
    });
    
    if (!wbLayer) {
      console.warn("Failed loading waterbodies");
      return;
    }

    // Just store the layer, don't add to map yet
    waterbodiesLayerRef.current = wbLayer;
  }

  const fetchAdminLayer = async (tempVillages) => {
    if (!district || !block) return;

    if (tempVillages.length === 0) {
      try {
        boundaryLayerRef.current.setStyle((feature) => {
          if (
            tempVillages.length > 0 &&
            tempVillages.includes(feature.values_.vill_ID)
          ) {
            // Filtered villages - gold
            return new Style({
              stroke: new Stroke({
                color: "#FFD700",
                width: 2,
              }),
            });
          } else {
            // Default village boundaries - light gray
            return new Style({
              stroke: new Stroke({
                color: "#000000",
                width: 1.5,
              }),
            });
          }
        });
      } catch (error) {
        console.error("Error styling admin layer:", error);
      }
    } else {
      boundaryLayerRef.current.setStyle((feature) => {
        if (
          tempVillages.length > 0 &&
          tempVillages.includes(feature.values_.vill_ID)
        ) {
          // Filtered villages - gold
          return new Style({
            stroke: new Stroke({
              color: "#FFD700",
              width: 2,
            }),
          });
        }
      });
    }
  };

  const fetchBoundaryAndZoom = async (districtName, blockName) => {
    setIsLayerLoaded(true);
    try {
      const boundaryLayer = await getVectorLayers(
        "panchayat_boundaries",
        `${districtName
          .toLowerCase()
          .replace(/\s*\(\s*/g, "_")
          .replace(/\s*\)\s*/g, "")
          .replace(/\s+/g, "_")}_${blockName
            .toLowerCase()
            .replace(/\s*\(\s*/g, "_")
            .replace(/\s*\)\s*/g, "")
            .replace(/\s+/g, "_")}`,
        true,
        true
      );

      const layerName = `deltaG_well_depth_${district.label
        .toLowerCase()
        .replace(/\s*\(\s*/g, "_")
        .replace(/\s*\)\s*/g, "")
        .replace(/\s+/g, "_")}_${block.label
          .toLowerCase()
          .replace(/\s*\(\s*/g, "_")
          .replace(/\s*\)\s*/g, "")
          .replace(/\s+/g, "_")}`;
      const mwsLayer = await getVectorLayers(
        "mws_layers",
        layerName,
        true,
        true
      );

      if (mwsLayerRef.current) {
        mapRef.current.removeLayer(mwsLayerRef.current);
      }

      if (boundaryLayerRef.current) {
        mapRef.current.removeLayer(boundaryLayerRef.current);
      }

      boundaryLayer.setOpacity(0);
      addLayerSafe(mwsLayer);
      addLayerSafe(boundaryLayer);
      boundaryLayerRef.current = boundaryLayer;
      mwsLayerRef.current = mwsLayer;
      const vectorSource = boundaryLayer.getSource();

      await new Promise((resolve, reject) => {
        const checkFeatures = () => {
          if (vectorSource.getFeatures().length > 0) {
            resolve();
          } else {
            vectorSource.once("featuresloadend", () => {
              if (vectorSource.getFeatures().length > 0) {
                resolve();
              } else {
                reject(new Error("No features loaded"));
              }
            });

            setTimeout(() => {
              if (vectorSource.getFeatures().length > 0) {
                resolve();
              } else {
                reject(new Error("Features loading timeout"));
                toast.custom(
                  (t) => (
                    <div className={`${t.visible ? 'animate-enter' : 'animate-leave'
                      } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex`}>
                      <div className="flex-1 w-0 p-4">
                        <div className="flex items-start">
                          <div className="ml-3 flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              Network Error !
                            </p>
                            <p className="mt-1 text-sm text-gray-500">
                              Please Refresh the page !
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex border-l border-gray-200">
                        <button
                          type="button"
                          onClick={() => {
                            toast.dismiss(t.id);
                            window.location.reload();
                          }}
                          className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-blue-600 hover:text-blue-500 focus:outline-none"
                        >
                          Reload
                        </button>
                      </div>
                    </div>
                  ),
                  {
                    duration: 5000,
                    position: 'top-right',
                  }
                );
                window.location.reload();
              }
            }, 4000);
          }
        };

        checkFeatures();
      });

      const extent = vectorSource.getExtent();
      const view = mapRef.current.getView();
      view.cancelAnimations();

      view.animate(
        {
          zoom: Math.max(view.getZoom() - 0.5, 5),
          duration: 200,
        },
        () => {
          view.fit(extent, {
            padding: [50, 50, 50, 50],
            duration: 1000,
            maxZoom: 15,
            easing: (t) => {
              return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
            },
            callback: () => {
              let opacity = 0;
              const interval = setInterval(() => {
                opacity += 0.1;
                boundaryLayer.setOpacity(opacity);
                if (opacity >= 1) {
                  clearInterval(interval);
                }
              }, 50);
            },
          });
        }
      );

      boundaryLayer.setStyle(
        new Style({
          stroke: new Stroke({
            color: "#000000",
            width: 1.0,
          }),
        })
      );

      await fetchMWSLayer(selectedMWS); 
      setIsLayerLoaded(false)
    } catch (error) {
      console.error("Error loading boundary:", error);
      setIsLayerLoaded(false);
      const view = mapRef.current.getView();
      view.setCenter([78.9, 23.6]);
      view.setZoom(5);
    }
  };

  const getMatchedMwsForWaterbody = (wbFeature) => {
    if (!mwsLayerRef.current || !wbFeature) return null;
  
    const wbGeom = wbFeature.getGeometry();
    if (!wbGeom) return null;
  
    const mwsFeatures = mwsLayerRef.current.getSource().getFeatures();
  
    for (const mws of mwsFeatures) {
      const mwsGeom = mws.getGeometry();
      if (!mwsGeom) continue;
  
      // polygon intersection check
      const coords =
        wbGeom.getType() === "Polygon"
          ? wbGeom.getCoordinates()[0]
          : wbGeom.getCoordinates()[0][0];
  
      const intersects = coords.some(coord =>
        mwsGeom.intersectsCoordinate(coord)
      );
  
      if (intersects) {
        return mws;
      }
    }
  
    return null;
  };
  

  const fetchDataJson = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/download_kyl_data/?state=${state.label.toLowerCase().replace(/\s*\(\s*/g, "_").replace(/\s*\)\s*/g, "").replace(/\s+/g, "_")}&district=${district.label.toLowerCase().replace(/\s*\(\s*/g, "_").replace(/\s*\)\s*/g, "").replace(/\s+/g, "_")}&block=${block.label.toLowerCase().replace(/\s*\(\s*/g, "_").replace(/\s*\)\s*/g, "").replace(/\s+/g, "_")}&file_type=json`
      );

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const result = await response.json();
      setDataJson(result);

      setIsLoading(false);
      setFiltersEnabled(true)
    } catch (e) {
      console.log(e);
      setIsLoading(false);
    }
  };

  const fetchVillageJson = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL
        }/download_kyl_village_data?state=${state.label
          .toLowerCase()
          .replace(/\s*\(\s*/g, "_")
          .replace(/\s*\)\s*/g, "")
          .replace(/\s+/g, "_")}&district=${district.label
            .toLowerCase()
            .replace(/\s*\(\s*/g, "_")
            .replace(/\s*\)\s*/g, "")
            .replace(/\s+/g, "_")}&block=${block.label
              .toLowerCase()
              .replace(/\s*\(\s*/g, "_")
              .replace(/\s*\)\s*/g, "")
              .replace(/\s+/g, "_")}&file_type=json`
      );

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const result = await response.json();
      setVillageJson(result);
    } catch (e) {
      console.log(e);
    }
  };

  const handleLayerSelection = async (filter) => {
    let checkIfPresent = currentLayer.find((f) => f.name === filter.name);
    let checkIfInMap = mapRef.current.getLayers().getArray();
    let existingLayer = checkIfInMap.find((layer) => {
      return layer.ol_uid === boundaryLayerRef.current.ol_uid;
    });
    let tempArr = currentLayer;
    let len = filter.layer_store.length;
    if (checkIfPresent) {
      checkIfPresent.layerRef.map((item) => {
        mapRef.current.removeLayer(item);
      });
      if (!existingLayer) {
        mapRef.current.addLayer(boundaryLayerRef.current);
      }
      mwsLayerRef.current.setStyle((feature) => {
        if (
          selectedMWS.length > 0 &&
          selectedMWS.includes(feature.values_.uid)
        ) {
          return new Style({
            stroke: new Stroke({
              color: "#661E1E",
              width: 1.0,
            }),
            fill: new Fill({
              color: "rgba(255, 75, 75, 0.8)",
            }),
          });
        } else {
          return new Style({
            stroke: new Stroke({
              color: "#4a90e2",
              width: 1.0,
            }),
            fill: new Fill({
              color: "rgba(74, 144, 226, 0.2)",
            }),
          });
        }
      });
      tempArr = currentLayer.filter((item) => item.name !== filter.name);
      setToggleStates((prevStates) => ({
        ...prevStates,
        [filter.name]: false,
      }));
      //setFiltersEnabled(true);
    } else if (currentLayer.length === 0) {
      let layerRef = [];
      mapRef.current.removeLayer(mwsLayerRef.current);
      mapRef.current.removeLayer(boundaryLayerRef.current);
      for (let i = 0; i < len; ++i) {
        let tempLayer;
        if (filter.layer_store[i] === "terrain") {
          tempLayer = await getImageLayer(
            filter.layer_store[i],
            `${district.label.toLowerCase().split(" ").join("_")}_${block.label
              .toLowerCase()
              .split(" ")
              .join("_")}_${filter.layer_name[i]}`,
            true,
            filter.rasterStyle
          );
          layerRef.push(tempLayer);
          mapRef.current.addLayer(tempLayer);
        } else if (
          filter.layer_store[i] === "LULC" &&
          filter.rasterStyle === "lulc_water_pixels"
        ) {
          tempLayer = await getImageLayer(
            `${filter.layer_store[i]}_${filter.layer_name[i]}`,
            `LULC_22_23_${block.label.toLowerCase().split(" ").join("_")}_${filter.layer_name[i]
            }`,
            true,
            filter.rasterStyle
          );
          layerRef.push(tempLayer);
          mapRef.current.addLayer(tempLayer);
        } else if (filter.layer_store[i] === "change_detection") {
          tempLayer = await getImageLayer(
            `${filter.layer_store[i]}`,
            `change_${district.label
              .toLowerCase()
              .split(" ")
              .join("_")}_${block.label.toLowerCase().split(" ").join("_")}_${filter.layer_name[i]
            }`,
            true,
            filter.rasterStyle[i]
          );
          layerRef.push(tempLayer);
          mapRef.current.addLayer(tempLayer);
        } else if (filter.layer_store[i] === "nrega_assets") {
          const nregaLayerName = `${district.label
            .toLowerCase()
            .split(" ")
            .join("_")}_${block.label.toLowerCase().split(" ").join("_")}`;
          tempLayer = await getWebGlLayers(
            filter.layer_store[i],
            nregaLayerName,
            true,
            true,
            null,
            null,
            district.label.toLowerCase().split(" ").join("_"),
            block.label.toLowerCase().split(" ").join("_")
          );
          layerRef.push(tempLayer);
          mapRef.current.addLayer(tempLayer);
        }
        else if (["lcw", "factory_csr", "mining"].includes(filter.layer_store[i])) {
          const industryLayerName = `${district.label
            .toLowerCase()
            .split(" ")
            .join("_")}_${block.label.toLowerCase().split(" ").join("_")}`;

          const tempLayer = await getWebGlLayers(
            filter.layer_store[i],
            industryLayerName,
            true,
            true,
            null,
            null,
            district.label.toLowerCase().split(" ").join("_"),
            block.label.toLowerCase().split(" ").join("_")
          );

          layerRef.push(tempLayer);
          mapRef.current.addLayer(tempLayer);
        }

        else if (filter.layer_store[i] === "LULC") {
          tempLayer = await getImageLayer(
            `${filter.layer_store[i]}_${filter.layer_name[i]}`,
            `LULC_${lulcYear}_${transformName(district.label)}_${transformName(block.label)}_${filter.layer_name[i]}`,
            true,
            filter.rasterStyle
          );
          layerRef.push(tempLayer);
          mapRef.current.addLayer(tempLayer);
        } else if (filter.layer_store[i] === "drought" || filter.layer_store[i] === "green_credit") {
          tempLayer = await getVectorLayers(
            filter.layer_store[i],
            `${district.label.toLowerCase().split(" ").join("_")}_${block.label
              .toLowerCase()
              .split(" ")
              .join("_")}_${filter.layer_name[i]}`
          );
        } else if (filter.layer_store[i] === "panchayat_boundaries") {
          tempLayer = await getVectorLayers(
            filter.layer_store[i],
            `${district.label.toLowerCase().split(" ").join("_")}_${block.label
              .toLowerCase()
              .split(" ")
              .join("_")}`
          );
        } else {
          tempLayer = await getVectorLayers(
            filter.layer_store[i],
            `${filter.layer_name[i]}_${district.label
              .toLowerCase()
              .split(" ")
              .join("_")}_${block.label.toLowerCase().split(" ").join("_")}`
          );
        }
        if (
          filter.layer_store[i] !== "terrain" &&
          filter.layer_store[i] !== "LULC" &&
          filter.layer_store[i] !== "change_detection" &&
          filter.layer_store[i] !== "nrega_assets" &&
          filter.layer_store[i] !== "lcw" &&
          filter.layer_store[i] !== "factory_csr" &&
          filter.layer_store[i] !== "mining"
        ) {
          tempLayer.setStyle((feature) => {
            return layerStyle(
              feature,
              filter.vectorStyle,
              filter.styleIdx,
              villageJson,
              dataJson
            );
          });
          layerRef.push(tempLayer);
          mapRef.current.addLayer(tempLayer);
        }
      }
      mwsLayerRef.current.setStyle((feature) => {
        if (
          selectedMWS.length > 0 &&
          selectedMWS.includes(feature.values_.uid)
        ) {
          return new Style({
            stroke: new Stroke({
              color: "#254871",
              width: 2.0,
            }),
          });
        }
      });
      mapRef.current.addLayer(mwsLayerRef.current);
      mapRef.current.addLayer(boundaryLayerRef.current);
      let tempObj = {
        name: filter.name,
        layerRef: layerRef,
      };
      tempArr.push(tempObj);
      setToggleStates((prevStates) => ({
        ...prevStates,
        [filter.name]: true,
      }));
      //setFiltersEnabled(false);
      //setIndicatorType(null);
    } else {
      toast.error("Please Turn off previous layer before turning on new one !");
    }
    setCurrentLayer(tempArr);
  };

  const initializeMap = async () => {
    const baseLayer = new TileLayer({
      source: new XYZ({
        url: `https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}`,
        maxZoom: 30,
        transition: 500,
      }),
      preload: 4,
    });

    baseLayerRef.current = baseLayer;

    class GoogleLogoControl extends Control {
      constructor() {
        const element = document.createElement("div");
        element.style.pointerEvents = "none";
        element.style.position = "absolute";
        element.style.bottom = "5px";
        element.style.left = "5px";
        element.style.background = "#f2f2f27f";
        element.style.fontSize = "10px";
        element.style.padding = "5px";
        element.innerHTML = "&copy; Google Satellite Hybrid contributors";
        super({
          element: element,
        });
      }
    }

    const view = new View({
      center: [78.9, 23.6],
      zoom: 5,
      projection: "EPSG:4326",
      constrainResolution: true,
      smoothExtentConstraint: true,
      smoothResolutionConstraint: true,
    });

    const map = new Map({
      target: mapElement.current,
      layers: [baseLayer],
      controls: defaultControls().extend([new GoogleLogoControl()]),
      view: view,
      loadTilesWhileAnimating: true,
      loadTilesWhileInteracting: true,
    });

    mapRef.current = map;
  };

  const handleItemSelect = (setter, value) => {
    setter(value);
    // Reset everything when location changes
    if (setter === setState) {
      if (value) {
        trackEvent("Location", "select_state", value.label);
      }
      setDistrict(null);
      setBlock(null);
      resetAllStates();
    } else if (setter === setDistrict) {
      if (value) {
        trackEvent("Location", "select_district", value.label);
      }
      setBlock(null);
      resetAllStates();
    } else if (setter === setBlock) {
      trackEvent("Location", "select_tehsil", value.label);
      resetAllStates();
    }
  };

  const handlePatternRemoval = (pattern) => {
    const key = pattern.patternName || pattern.name;

    if (pattern.level) {
      //* Village Level
      setPatternSelections((prev) => ({
        ...prev,
        selectedVillagePatterns: {
          ...prev.selectedVillagePatterns,
          [key]: null,
        }
      }))
    }
    else {
      //* MWS Level
      setPatternSelections((prev) => ({
        ...prev,
        selectedMWSPatterns: {
          ...prev.selectedMWSPatterns,
          [key]: null,
        }
      }))
    }
  }

  const resetAllStates = () => {
    // Reset filters
    setFilterSelections({
      selectedMWSValues: {},
      selectedVillageValues: {},
    });

    setIndicatorType(null);
    setMappedAssets(false);
    setMappedDemands(false);
    setSelectedMWS([]);
    setVillageIdList(new Set([]));
    setShowMWS(true);
    setShowVillages(true);
    setSelectedMWSProfile(null);
    
    // Reset waterbody state
    setShowWB(false); // Add this line
    
    // Remove waterbody layer if it exists
    if (waterbodiesLayerRef.current && mapRef.current) {
      mapRef.current.removeLayer(waterbodiesLayerRef.current);
      waterbodiesLayerRef.current = null;
    }
  };

  const searchUserLatLong = async () => {
    setIsLoading(true);
    try {
      let response = await fetch(`${process.env.REACT_APP_API_URL
        }/get_mwsid_by_latlon/?latitude=${searchLatLong[0]}&longitude=${searchLatLong[1]}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key" : `${process.env.REACT_APP_API_KEY}`
        }
      }
      )
      response = await response.json()

      const matchedState = statesData.find(
        (s) => s.label.trim().toLowerCase() === response.State.toLowerCase()
      );

      const matchedDistrict = matchedState.district.find(
        (s) => s.label.trim().toLowerCase() === response.District.toLowerCase()
      )

      const matchedTehsil = matchedDistrict.blocks.find(
        (s) => s.label.trim().toLowerCase() === response.Tehsil.toLowerCase()
      )

      setState(matchedState)
      setDistrict(matchedDistrict)
      setBlock(matchedTehsil)
      setHighlightMWS(response.uid)
    } catch (err) {
      console.log(err)
      toast.custom(
        (t) => (
          <div className={`${t.visible ? 'animate-enter' : 'animate-leave'
            } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex`}>
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    Location Request
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    We have not generated maps for this location as yet. Would you like to submit a request?
                  </p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-gray-200">
              <button
                onClick={() => {
                  window.open('https://forms.gle/qBkYmmU7AhyKnc4N9', '_blank');
                  toast.dismiss(t.id);
                }}
                className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-blue-600 hover:text-blue-500 focus:outline-none"
              >
                Submit Request
              </button>
            </div>
          </div>
        ),
        {
          duration: 5000,
          position: 'top-right',
        }
      );
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
  
    const handleWaterbodyClick = (event) => {
      if (!waterbodiesLayerRef.current || !mapRef.current) return;
    
      const map = mapRef.current;
    
      // 1️⃣ Get clicked waterbody feature
      const wbFeature = map.forEachFeatureAtPixel(
        event.pixel,
        (feature, layer) => {
          if (layer === waterbodiesLayerRef.current) return feature;
        },
        { hitTolerance: 8 }
      );
    
      if (!wbFeature) {
        setSelectedWaterbodyProfile(null);
        return;
      }
    
      // Stop MWS click handler from firing
      waterbodyClickedRef.current = true;
      setTimeout(() => (waterbodyClickedRef.current = false), 150);
    
      const props = wbFeature.getProperties();
      const wb_id = props?.UID;
      if (!wb_id) return;
    
      // 2️⃣ Construct Waterbody GeoJSON (existing logic)
      const geojson = new GeoJSON();
    
      const fullFeature = {
        type: "Feature",
        properties: props,
        geometry: geojson.writeGeometryObject(
          wbFeature.getGeometry()
        ),
      };
    
      // Save selected waterbody (unchanged)
      setSelectedWaterbodyForTehsil(fullFeature);
      localStorage.setItem("selectedWaterbody", JSON.stringify(fullFeature));
    
      setSelectedWaterbodyProfile({
        id: wb_id,
        dashboardUrl: `/rwb?type=tehsil&state=${state.label}&district=${district.label}&block=${block.label}&waterbody=${wb_id}`,
        properties: props,
        geometry: geojson.writeGeometryObject(wbFeature.getGeometry()),
      });
    
      // 3️⃣ FIND MATCHED MWS FEATURE (IMPORTANT PART)
      let matchedMws = null;
    
      if (mwsLayerRef.current) {
        const mwsFeatures = mwsLayerRef.current.getSource().getFeatures();
        const wbGeom = wbFeature.getGeometry();
    
        if (wbGeom) {
          for (const mws of mwsFeatures) {
            const mwsGeom = mws.getGeometry();
            if (!mwsGeom) continue;
    
            // Check intersection using coordinates
            const coords =
              wbGeom.getType() === "Polygon"
                ? wbGeom.getCoordinates()[0]
                : wbGeom.getCoordinates()[0][0];
    
            const intersects = coords.some((coord) =>
              mwsGeom.intersectsCoordinate(coord)
            );
    
            if (intersects) {
              matchedMws = mws;
              break;
            }
          }
        }
      }
    
      // 4️⃣ SAVE ONLY MATCHED MWS TO LOCAL STORAGE
      if (matchedMws) {
        const matchedMwsGeoJSON = new GeoJSON().writeFeatureObject(
          matchedMws,
          {
            dataProjection: "EPSG:4326",
            featureProjection: "EPSG:4326",
          }
        );
        
        localStorage.setItem(
          "matched_mws_feature",
          JSON.stringify(matchedMwsGeoJSON)
        );
        
        console.log("🟢 FULL MATCHED MWS FEATURE:", matchedMwsGeoJSON);
        console.log("🟢 MWS PROPERTIES:", matchedMwsGeoJSON.properties);
        
    
        console.log(
          "MATCHED MWS SAVED →",
          matchedMwsGeoJSON.properties.uid
        );
      } else {
        console.warn("No matching MWS found for waterbody:", wb_id);
      }
    
      console.log("WATERBODY CLICKED →", wb_id);
    };
    
    
    map.on("click", handleWaterbodyClick);
    return () => map.un("click", handleWaterbodyClick);
  }, [mapRef.current, state, district, block]);

  useEffect(() => {
    if (!mapRef.current) return;

    const handleMapClick = (event) => {

      const feature = mapRef.current.forEachFeatureAtPixel(
        event.pixel,
        (feature, layer) => {
          if (layer === mwsLayerRef.current) {
            return feature;
          }
        }
      );
      if (feature) {
        const clickedMwsId = feature.get("uid");


        setSelectedMWSProfile(feature.getProperties());
        if (toastId) {
          toast.dismiss(toastId);
          setToastId(null);
        }
        mwsLayerRef.current.setStyle((feature) => {
          if (clickedMwsId === feature.values_.uid) {
            return new Style({
              stroke: new Stroke({
                color: "#166534",
                width: 2.0,
              }),
              fill: new Fill({
                color: "rgba(34, 197, 94, 0.4)",
              }),
            });
          } else if (
            selectedMWS !== null &&
            selectedMWS.length > 0 &&
            selectedMWS.includes(feature.values_.uid)
          ) {
            return new Style({
              stroke: new Stroke({
                color: "#661E1E",
                width: 1.0,
              }),
              fill: new Fill({
                color: "rgba(255, 75, 75, 0.8)",
              }),
            });
          } else {
            return new Style({
              stroke: new Stroke({
                color: "#4a90e2",
                width: 1.0,
              }),
              fill: new Fill({
                color: "rgba(74, 144, 226, 0.2)",
              }),
            });
          }
        });

      }
    };
    mapRef.current.on("click", handleMapClick);

    // Cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.un("click", handleMapClick);
      }
    };
  }, [mapRef.current, selectedMWS]);

  useEffect(() => {
    // When location changes, reset waterbodies completely
    if (mapRef.current && waterbodiesLayerRef.current) {
      mapRef.current.removeLayer(waterbodiesLayerRef.current);
      waterbodiesLayerRef.current = null;
    }
  
    // Reset waterbody UI state
    setShowWB(false);
    setSelectedWaterbodyProfile(null);
    localStorage.removeItem("selectedWaterbody");
    localStorage.removeItem("matched_mws_feature");
  
  }, [state, district, block]);
  

  useEffect(() => {
    if (mwsLayerRef.current) {
      mwsLayerRef.current.setVisible(showMWS);
    }
    if (boundaryLayerRef.current) {
      boundaryLayerRef.current.setVisible(showVillages);
    }
  }, [showMWS, showVillages]);

  useEffect(() => {
    if (statesData === null) {
      getStates().then((data) => setStatesData(data));
    }
  }, [statesData, setStatesData]);

  useEffect(() => {
    initializeAnalytics();
    trackPageView('/kyl_dashboard')
    // Initialize map if not already initialized
    if (!mapRef.current) {
      initializeMap();
      // Return early to wait for mapRef.current to be available after initialization
      return;
    }

    // Once mapRef.current is available, proceed with other operations
    if (district && block) {
      const view = mapRef.current.getView();
      view.cancelAnimations();

      fetchBoundaryAndZoom(district.label, block.label);
      fetchDataJson();
      fetchVillageJson();

      setToggleStates({});
      setCurrentLayer([]);
      fetchWaterBodiesLayer()
    }

    // Cleanup function
    return () => {
      if (mapRef.current) {
        const view = mapRef.current.getView();
        view.cancelAnimations();
      }
    };
  }, [district, block, mapRef.current]);

  useEffect(() => {
    const fetchUpdateLulc = async () => {
      if (currentLayer !== null) {
        let tempArr = currentLayer;
        let tempLen = tempArr.length;
        for (let i = 0; i < tempLen; ++i) {
          if (tempArr[i].name === "avg_double_cropped") {
            mapRef.current.removeLayer(tempArr[i].layerRef[0]);
            let tempLayer = await getImageLayer(
              `LULC_level_3`,
              `LULC_${lulcYear}_${transformName(district.label)}_${transformName(block.label)}_level_3`,
              true
            );
            mapRef.current.addLayer(tempLayer);
            tempArr[i].layerRef[0] = tempLayer;
          }
          if (tempArr[i].name === "built_up_area") {
            mapRef.current.removeLayer(tempArr[i].layerRef[0]);
            let tempLayer = await getImageLayer(
              `LULC_level_1`,
              `LULC_${lulcYear}_${transformName(district.label)}_${transformName(block.label)}_level_1`,
              true
            );
            mapRef.current.addLayer(tempLayer);
            tempArr[i].layerRef[0] = tempLayer;
          }
        }
        setCurrentLayer(tempArr);
      }
    };
    fetchUpdateLulc().catch(console.error);
  }, [lulcYear]);

  useEffect(() => {
    if (searchLatLong !== null) {
      searchUserLatLong()
    }
  }, [searchLatLong])

  useEffect(() => {
    try {
      if (!dataJson || !Array.isArray(dataJson)) {
        console.warn("DataJson not loaded");
        return;
      }

      const mwsFilterKeys = Object.keys(filterSelections.selectedMWSValues || {});
      
      if (mwsFilterKeys.length === 0) {
        return;
      }

      let resultMWS = [];
      
      mwsFilterKeys.forEach((filterName) => {
        const filterValues = filterSelections.selectedMWSValues[filterName];
        if (!filterValues) return;
        
        let tempArr = [];
        const filter = getAllFilters().find((f) => f.name === filterName);
        
        filterValues.forEach((selectedOption) => {
          if (filter?.type === 2) {
            dataJson.forEach((item) => {
              if (item && typeof item[filterName] !== "undefined" && item.mws_id) {
                const value = Number(item[filterName]);
                if (!isNaN(value) && value >= selectedOption.value.lower && value <= selectedOption.value.upper) {
                  if (!tempArr.includes(item.mws_id)) {
                    tempArr.push(item.mws_id);
                  }
                }
              }
            });
          } else {
            dataJson.forEach((item) => {
              if (item && item[filterName] === selectedOption.value && item.mws_id) {
                if (!tempArr.includes(item.mws_id)) {
                  tempArr.push(item.mws_id);
                }
              }
            });
          }
        });
        
        if (resultMWS.length > 0) {
          resultMWS = resultMWS.filter(id => tempArr.includes(id));
        } else {
          resultMWS = tempArr;
        }
      });

      setSelectedMWS(resultMWS);
      fetchMWSLayer(resultMWS);
      
    } catch (error) {
      console.error("Error in MWS filter processing:", error);
    }
  }, [filterSelections.selectedMWSValues, dataJson]);

  // ============================================
// 2. PROCESS MWS PATTERNS - OR within pattern, AND between patterns
// ============================================
  useEffect(() => {
    try {
      if (!dataJson || !Array.isArray(dataJson)) return;
      
      const mwsPatternKeys = Object.keys(patternSelections.selectedMWSPatterns || {});
      const mwsFilterKeys = Object.keys(filterSelections.selectedMWSValues || {});
      const hasMwsFilters = mwsFilterKeys.some(key => filterSelections.selectedMWSValues[key] !== null);
      const hasMwsPatterns = mwsPatternKeys.some(key => patternSelections.selectedMWSPatterns[key] !== null);
      
      // If no patterns exist
      if (!hasMwsPatterns) {
        // If filters exist, RECOMPUTE filter results
        if (hasMwsFilters) {
          let resultMWS = [];
          
          mwsFilterKeys.forEach((filterName) => {
            const filterValues = filterSelections.selectedMWSValues[filterName];
            if (!filterValues) return;
            
            let tempArr = [];
            const filter = getAllFilters().find((f) => f.name === filterName);
            
            filterValues.forEach((selectedOption) => {
              if (filter?.type === 2) {
                dataJson.forEach((item) => {
                  if (item && typeof item[filterName] !== "undefined" && item.mws_id) {
                    const value = Number(item[filterName]);
                    if (!isNaN(value) && value >= selectedOption.value.lower && value <= selectedOption.value.upper) {
                      if (!tempArr.includes(item.mws_id)) {
                        tempArr.push(item.mws_id);
                      }
                    }
                  }
                });
              } else {
                dataJson.forEach((item) => {
                  if (item && item[filterName] === selectedOption.value && item.mws_id) {
                    if (!tempArr.includes(item.mws_id)) {
                      tempArr.push(item.mws_id);
                    }
                  }
                });
              }
            });
            
            if (resultMWS.length > 0) {
              resultMWS = resultMWS.filter(id => tempArr.includes(id));
            } else {
              resultMWS = tempArr;
            }
          });

          setSelectedMWS(resultMWS);
          fetchMWSLayer(resultMWS);
          return;
        } else {
          // No patterns AND no filters - clear everything
          setSelectedMWS([]);
          fetchMWSLayer([]);
          return;
        }
      }

      // Patterns exist - process them
      let resultMWS = new Set();
      
      // Process each pattern (AND between different patterns)
      mwsPatternKeys.forEach((patternName) => {
        const pattern = patternSelections.selectedMWSPatterns[patternName];
        if (!pattern) return;
        let patternMatches = new Set(); // Items matching ANY condition in THIS pattern (OR)
        
        // Process conditions within pattern (OR operation)
        pattern.conditions.forEach((condition) => {
          dataJson.forEach((item) => {
            let matches = false;
            
            if (condition.type === 1 && item[condition.key] === condition.value) {
              matches = true;
            } else if (condition.type === 2 && item[condition.key] >= condition.value.lower && item[condition.key] <= condition.value.upper) {
              matches = true;
            } else if (condition.type === 3 && item[condition.key] != condition.value) {
              matches = true;
            }
            if (matches) {
              patternMatches.add(item.mws_id);
            }
          });
        });
        // AND operation between different patterns
        if (resultMWS.size > 0) {
          // Intersection: keep only items present in both sets
          resultMWS = new Set([...resultMWS].filter(x => patternMatches.has(x)));
        } else {
          // First pattern, initialize with its matches
          resultMWS = patternMatches;
        }
      });
      
      // Intersect with MWS from filters if they exist
      if (hasMwsFilters) {
        // Recompute filter results
        let filterResults = [];
        
        mwsFilterKeys.forEach((filterName) => {
          const filterValues = filterSelections.selectedMWSValues[filterName];
          if (!filterValues) return;
          
          let tempArr = [];
          const filter = getAllFilters().find((f) => f.name === filterName);
          
          filterValues.forEach((selectedOption) => {
            if (filter?.type === 2) {
              dataJson.forEach((item) => {
                if (item && typeof item[filterName] !== "undefined" && item.mws_id) {
                  const value = Number(item[filterName]);
                  if (!isNaN(value) && value >= selectedOption.value.lower && value <= selectedOption.value.upper) {
                    if (!tempArr.includes(item.mws_id)) {
                      tempArr.push(item.mws_id);
                    }
                  }
                }
              });
            } else {
              dataJson.forEach((item) => {
                if (item && item[filterName] === selectedOption.value && item.mws_id) {
                  if (!tempArr.includes(item.mws_id)) {
                    tempArr.push(item.mws_id);
                  }
                }
              });
            }
          });
          
          if (filterResults.length > 0) {
            filterResults = filterResults.filter(id => tempArr.includes(id));
          } else {
            filterResults = tempArr;
          }
        });
        
        // Intersect patterns with filters
        const finalMWS = [...resultMWS].filter(id => filterResults.includes(id));
        setSelectedMWS(finalMWS);
        fetchMWSLayer(finalMWS);
      } else {
        // No filters, just use pattern results
        const finalMWS = [...resultMWS];
        setSelectedMWS(finalMWS);
        fetchMWSLayer(finalMWS);
      }
      
    } catch (error) {
      console.error("Error in MWS pattern processing:", error);
    }
  }, [patternSelections.selectedMWSPatterns, filterSelections.selectedMWSValues, dataJson]);


  useEffect(() => {
    try {
      if (!villageJson || !Array.isArray(villageJson)) return;
      if (!dataJson || !Array.isArray(dataJson)) return;
      
      const villageFilterKeys = Object.keys(filterSelections.selectedVillageValues || {});
      const hasVillageFilters = villageFilterKeys.some(key => filterSelections.selectedVillageValues[key] !== null);
      
      if (!hasVillageFilters) {
        setPatternVillageList(new Set()); // Store empty filter results
        return;
      }

      // Get candidate villages from selected MWS (if any)
      let candidateVillages = new Set();
      if (selectedMWS.length > 0) {
        dataJson.forEach((mwsItem) => {
          if (selectedMWS.includes(mwsItem.mws_id) && Array.isArray(mwsItem.mws_intersect_villages)) {
            mwsItem.mws_intersect_villages.forEach(villageId => {
              candidateVillages.add(villageId);
            });
          }
        });
      }

      let resultVillages = new Set();
      
      villageFilterKeys.forEach((filterName) => {
        const filterValues = filterSelections.selectedVillageValues[filterName];
        if (!filterValues) return;
        
        let tempArr = new Set();
        
        filterValues.forEach((selectedOption) => {
          villageJson.forEach((village) => {
            if (village && typeof village[filterName] !== "undefined" && village.village_id) {
              const value = Number(village[filterName]);
              if (!isNaN(value) && value >= selectedOption.value.lower && value <= selectedOption.value.upper) {
                if (candidateVillages.size === 0 || candidateVillages.has(village.village_id)) {
                  tempArr.add(village.village_id);
                }
              }
            }
          });
        });
        
        if (resultVillages.size > 0) {
          resultVillages = new Set([...resultVillages].filter(x => tempArr.has(x)));
        } else {
          resultVillages = tempArr;
        }
      });
      
      // Store filter results in patternVillageList (we'll combine with patterns later)
      setPatternVillageList(resultVillages);
      
    } catch (error) {
      console.error("Error in village filter processing:", error);
    }
  }, [filterSelections.selectedVillageValues, villageJson, selectedMWS, dataJson]);


  useEffect(() => {
    try {
      if (!villageJson || !Array.isArray(villageJson)) return;
      if (!dataJson || !Array.isArray(dataJson)) return;
      
      const villagePatternKeys = Object.keys(patternSelections.selectedVillagePatterns || {});
      const villageFilterKeys = Object.keys(filterSelections.selectedVillageValues || {});
      
      const hasVillagePatterns = villagePatternKeys.some(key => patternSelections.selectedVillagePatterns[key] !== null);
      const hasVillageFilters = villageFilterKeys.some(key => filterSelections.selectedVillageValues[key] !== null);
      
      // If neither patterns nor filters exist, clear villages
      if (!hasVillagePatterns && !hasVillageFilters) {
        setVillageIdList(new Set());
        return;
      }
      
      // If only filters exist (no patterns), use filter results directly
      if (!hasVillagePatterns && hasVillageFilters) {
        setVillageIdList(patternVillageList);
        return;
      }

      // Process patterns
      let resultVillages = new Set();
      
      villagePatternKeys.forEach((patternName) => {
        const pattern = patternSelections.selectedVillagePatterns[patternName];
        if (!pattern) return;
        
        let patternMatches = new Set();
        
        pattern.conditions.forEach((condition) => {
          villageJson.forEach((village) => {
            let matches = false;
            
            if (condition.type === 1 && village[condition.key] === condition.value) {
              matches = true;
            } else if (condition.type === 2 && village[condition.key] >= condition.value.lower && village[condition.key] <= condition.value.upper) {
              matches = true;
            } else if (condition.type === 3 && village[condition.key] != condition.value) {
              matches = true;
            }
            
            if (matches) {
              patternMatches.add(village.village_id);
            }
          });
        });
        
        // AND operation between different patterns
        if (resultVillages.size > 0) {
          resultVillages = new Set([...resultVillages].filter(x => patternMatches.has(x)));
        } else {
          resultVillages = patternMatches;
        }
      });

      // Get candidate villages from selected MWS (if any)
      let candidateVillages = new Set();
      if (selectedMWS.length > 0) {
        dataJson.forEach((mwsItem) => {
          if (selectedMWS.includes(mwsItem.mws_id) && Array.isArray(mwsItem.mws_intersect_villages)) {
            mwsItem.mws_intersect_villages.forEach(villageId => {
              candidateVillages.add(villageId);
            });
          }
        });
      }

      // Intersect with candidate villages from MWS if they exist
      if (candidateVillages.size > 0) {
        resultVillages = new Set([...resultVillages].filter(id => candidateVillages.has(id)));
      }

      // CRITICAL FIX: Intersect with villages from filters if they exist
      if (hasVillageFilters && patternVillageList.size > 0) {
        resultVillages = new Set([...resultVillages].filter(id => patternVillageList.has(id)));
      }
      
      setVillageIdList(resultVillages);
      
    } catch (error) {
      console.error("Error in village pattern processing:", error);
    }
  }, [patternSelections.selectedVillagePatterns, filterSelections.selectedVillageValues,patternVillageList,villagePatternTrigger, selectedMWS, dataJson,villageJson]);


  useEffect(() => {
    fetchAdminLayer([...villageIdList]);
    setFinalVillageList(villageIdList);
  }, [villageIdList]);

  useEffect(() => {
    if (!waterbodiesLayerRef.current || !mwsLayerRef.current) return;
    
    const waterbodiesSource = waterbodiesLayerRef.current.getSource();
    const mwsSource = mwsLayerRef.current.getSource();
    
    let hasFiltered = false; // Prevent multiple filter calls
    
    const attemptFilter = () => {
      if (hasFiltered) return; // Already filtered, don't do it again
      
      const wbFeatures = waterbodiesSource.getFeatures();
      const mwsFeatures = mwsSource.getFeatures();
      
      const wbReady = wbFeatures.length > 0;
      const mwsReady = mwsFeatures.length > 0;
      
      if (wbReady && mwsReady) {
        hasFiltered = true;
        filterWaterbodiesByMWS();
      }
    };
    
    // Try immediately in case features are already loaded
    attemptFilter();
    
    // If not loaded yet, wait for them
    if (!hasFiltered) {
      const wbKey = waterbodiesSource.on('change', () => {
        if (waterbodiesSource.getState() === 'ready') {
          attemptFilter();
        }
      });
      
      const mwsKey = mwsSource.on('change', () => {
        if (mwsSource.getState() === 'ready') {
          attemptFilter();
        }
      });
      
      return () => {
        waterbodiesSource.un('change', wbKey);
        mwsSource.un('change', mwsKey);
      };
    }
  }, [selectedMWS, showWB]);

  return (
    <div className="min-h-screenbg-white flex flex-col">
      <Toaster />
      <div className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <LandingNavbar />
      </div>
      <div className="flex h-[calc(100vh-48px)] p-4 gap-4">
        {/* Left Sidebar */}
        <KYLLeftSidebar
          indicatorType={indicatorType}
          setIndicatorType={setIndicatorType}
          filterSelections={filterSelections}
          setFilterSelections={setFilterSelections}
          getAllFilterTypes={getAllFilterTypes}
          getAllFilters={getAllFilters}
          handleFilterSelection={handleFilterSelection}
          toggleStates={toggleStates}
          setToggleStates={setToggleStates}
          handleLayerSelection={handleLayerSelection}
          currentLayer={currentLayer}
          setCurrentLayer={setCurrentLayer}
          mapRef={mapRef}
          filtersEnabled={filtersEnabled}
          getFormattedSelectedFilters={getFormattedSelectedFilters}
          getAllPatternTypes={getAllPatternTypes}
          handlePatternRemoval={handlePatternRemoval}
          getSubcategoriesForCategory={getSubcategoriesForCategory}
          getPatternsForSubcategory={getPatternsForSubcategory}
          patternSelections={patternSelections}
          handlePatternSelection={handlePatternSelection}
          isPatternSelected={isPatternSelected}
        />

        {/* Map Container */}
        <KYLMapContainer
          isLoading={islayerLoaded || isLoading}
          statesData={statesData}
          mapElement={mapElement}
          showMWS={showMWS}
          setShowMWS={setShowMWS}
          showVillages={showVillages}
          setShowVillages={setShowVillages}
          mwsLayerRef={mwsLayerRef}
          boundaryLayerRef={boundaryLayerRef}
          mapRef={mapRef}
          currentLayer={currentLayer}
          mappedAssets={mappedAssets}
          mappedDemands={mappedDemands}
          setSearchLatLong={setSearchLatLong}
        />

        {/* Right Sidebar */}
        <KYLRightSidebar
          state={state}
          district={district}
          block={block}
          setState={setState}
          setDistrict={setDistrict}
          setBlock={setBlock}
          statesData={statesData}
          handleItemSelect={handleItemSelect}
          setFilterSelections={setFilterSelections}
          setPatternSelections={setPatternSelections}
          getFormattedSelectedFilters={getFormattedSelectedFilters}
          getFormattedSelectedPatterns={getFormattedSelectedPatterns}
          handlePatternRemoval={handlePatternRemoval}
          selectedMWS={selectedMWS}
          selectedVillages={villageIdList}
          handleLayerSelection={handleLayerSelection}
          toggleStates={toggleStates}
          setToggleStates={setToggleStates}
          currentLayer={currentLayer}
          setCurrentLayer={setCurrentLayer}
          mapRef={mapRef}
          onResetMWS={handleResetMWS}
          selectedMWSProfile={selectedMWSProfile}
          waterbodiesLayerRef={waterbodiesLayerRef} 
          clickedWaterbodyId={clickedWaterbodyId}
          waterbodyDashboardUrl={waterbodyDashboardUrl}
          selectedWaterbodyProfile={selectedWaterbodyProfile}
          onResetWaterbody={() => setSelectedWaterbodyProfile(null)}
          setShowWB={setShowWB}
          showWB={showWB}
          boundaryLayerRef={boundaryLayerRef}
        />
      </div>
    </div>
  );
};

export default KYLDashboardPage;
