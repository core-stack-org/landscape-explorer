import { useEffect, useRef, useState, useMemo } from "react";
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
import { Map as OLMap, View } from "ol";
import { Fill, Stroke, Style, RegularShape, Circle as CircleStyle } from "ol/style.js";
import Point from "ol/geom/Point";
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
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import LineString from "ol/geom/LineString";
import getWebGlPolygonLayers from "../actions/getWebGlVectorLayers.js";

const KYLDashboardPage = () => {
  const mapElement = useRef(null);
  const mapRef = useRef(null);
  const baseLayerRef = useRef(null);
  const boundaryLayerRef = useRef(null);
  const mwsLayerRef = useRef(null);
  const waterbodiesLayerRef = useRef(null);
  const mwsConnectivityLayerRef = useRef(null);
  const mwsCentroidLayerRef = useRef(null);
  const mwsArrowLayerRef = useRef(null);

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
  const [finalVillageList, setFinalVillageList] = useState(new Set([]));
  const [selectedWaterbodyIds, setSelectedWaterbodyIds] = useState(new Set([]));

  const [statesData, setStatesData] = useRecoilState(stateDataAtom);
  const [state, setState] = useRecoilState(stateAtom);
  const [district, setDistrict] = useRecoilState(districtAtom);
  const [block, setBlock] = useRecoilState(blockAtom);
  const [filterSelections, setFilterSelections] = useRecoilState(filterSelectionsAtom);
  const [patternSelections, setPatternSelections] = useState({ selectedMWSPatterns: {}, selectedVillagePatterns: {} });

  const lulcYear = useRecoilValue(yearAtom);

  const [indicatorType, setIndicatorType] = useState(null);
  const [showMWS, setShowMWS] = useState(true);
  const [sidebarResetKey, setSidebarResetKey] = useState(0);
  const [showVillages, setShowVillages] = useState(true);
  const [filtersEnabled, setFiltersEnabled] = useState(false);
  const [activeWBVisualize, setActiveWBVisualize] = useState(null);

  const [toastId, setToastId] = useState(null);
  const [selectedMWSProfile, setSelectedMWSProfile] = useState(null);
  const [searchLatLong, setSearchLatLong] = useState(null);

  // * Triggers
  const [villagePatternTrigger, setvillagePatternTrigger] = useState(0)

  const [clickedWaterbodyId, setClickedWaterbodyId] = useState(null);
  const [waterbodyDashboardUrl, setWaterbodyDashboardUrl] = useState(null);
  const [selectedWaterbodyProfile, setSelectedWaterbodyProfile] = useState(null);

  const waterbodyClickedRef = useRef(false);

  const [selectedWaterbodyForTehsil, setSelectedWaterbodyForTehsil] = useRecoilState(selectedWaterbodyForTehsilAtom);
  const [showWB, setShowWB] = useState(false);
  const [showConnectivity, setShowConnectivity] = useState(false);
  const [hasFilters, setHasFilters] = useState(false);
  const [isVisualizeOn, setIsVisualizeOn] = useState(false);
  const [isWBVisualizeOn, setIsWBVisualizeOn] = useState(false);

  const addLayerSafe = (layer) => layer && mapRef.current && mapRef.current.addLayer(layer);

  const transformName = (name) => {
    if (!name) return name;
    return name
      .replace(/[()]/g, "")
      // .replace(/-+/g, "_")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
      .toLowerCase()
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
    processSelections(filterSelections.selectedWaterbodyValues, "Waterbody");

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
    } else if (sourceType.name === "Waterbody") {
      if (!showWB) {
        toast.error("Please enable 'Show Waterbodies' to apply waterbody filters.");
        return;
      }
      setFilterSelections((prev) => {
        const currentArray = prev.selectedWaterbodyValues?.[name] || [];
        let newArray;
        if (isChecked) {
          const exists = currentArray.some(item => item.label === option.label);
          newArray = exists ? currentArray : [...currentArray, option];
        } else {
          newArray = currentArray.filter(item => item.label !== option.label);
        }
        return {
          ...prev,
          selectedWaterbodyValues: {
            ...(prev.selectedWaterbodyValues || {}),
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

  const applyWaterbodyFilters = (mwsIds, wbFilters,isVisualizeOn) => {
    if (!waterbodiesLayerRef.current) return;

    const wbSource = waterbodiesLayerRef.current.getSource();
    const filterKeys = Object.keys(wbFilters || {}).filter(k => wbFilters[k]);
    const hasMWSFilter = mwsIds.length > 0;
    const hasAttrFilter = filterKeys.length > 0;

    if (!hasMWSFilter && !hasAttrFilter && !isVisualizeOn) {
      waterbodiesLayerRef.current.updateStyleVariables({ wbFilterActive: 0 });
      return;
    }

    const applyToFeatures = (wbFeatures, mwsFeatures) => {
      if (!wbFeatures.length) return;
    
      const selectedMWSPolygons = hasMWSFilter
        ? mwsFeatures.filter(f => mwsIds.includes(f.get('uid')))
        : [];
    
      wbFeatures.forEach((feature) => {
        const props = feature.getProperties();
    
        // Always compute ALL category properties regardless of active filters
        const wbCategory = props.waterbody_type === "river" ? "onRiver" : "offRiver";
        feature.set("wbCategory", wbCategory, true);
    
        const area = Number(props.area_ored ?? 0);
        let wbSizeCategory = null;
        if (area < 1) wbSizeCategory = "small";
        else if (area < 5) wbSizeCategory = "medium";
        else if (area < 10) wbSizeCategory = "large";
        else wbSizeCategory = "veryLarge";
        feature.set("wbSizeCategory", wbSizeCategory, true);
    
        // Always compute trend
        const areas = Object.keys(props)
          .filter(key => key.startsWith("area_") && key !== "area_ored")
          .sort()
          .map(key => Number(props[key] ?? 0));
        const trend = calculateTrend(areas);
        const wbTrend = trend > 0 ? "positive" : trend < 0 ? "negative" : "steady";
        feature.set("wbTrend", wbTrend, true);
    
        // Always compute drainage
        const drainageValue = Number(props.on_drainage_line ?? 0);
        const wbDrainage = drainageValue === 1 ? "onDrainage" : "offDrainage";
        feature.set("wbDrainage", wbDrainage, true);
    
        let matches = true;

        const wbGeom = feature.getGeometry();
        if (!wbGeom) {
          matches = false;
        } else {
          // 1. MWS intersection check
          if (hasMWSFilter) {
            if (selectedMWSPolygons.length === 0) {
              matches = false;
            } else {
              const coordinates = wbGeom.getType() === 'Polygon'
                ? wbGeom.getCoordinates()[0]
                : wbGeom.getCoordinates()[0]?.[0] ?? [];
    
              const intersects = selectedMWSPolygons.some(mwsFeature => {
                const mwsGeom = mwsFeature.getGeometry();
                if (!mwsGeom) return false;
                return coordinates.some(coord => mwsGeom.intersectsCoordinate(coord));
              });
    
              if (!intersects) matches = false;
            }
          }

          // 2. Attribute filter check
          if (matches && hasAttrFilter) {
            filterKeys.forEach((filterName) => {
              const selectedOptions = wbFilters[filterName];
              if (!selectedOptions) return;

              if (filterName === "waterbody_size") {
                const area = Number(
                  props.area_ored ?? props.AREA_HA ?? props.area ?? props.Area ?? 0
                );
                const pass = selectedOptions.some(
                  opt => area >= opt.value.lower && area <= opt.value.upper
                );
                if (!pass) matches = false;
              }

              if (filterName === "drainage_line") {
                const value = Number(props.on_drainage_line ?? 0);
                const pass = selectedOptions.some(opt => value === opt.value);
                if (!pass) matches = false;
              }

              if (filterName === "surface_water_trend") {
                const areas = Object.keys(props)
                  .filter(key => key.startsWith("area_") && key !== "area_ored")
                  .sort()
                  .map(key => Number(props[key] ?? 0));
                const trend = calculateTrend(areas);
                const pass = selectedOptions.some(opt => trend === opt.value);
                if (!pass) matches = false;
              }
            });
          }
        }
    
        if (isVisualizeOn) {
          feature.set("wbMatch", 1, true);
        } else {
          feature.set("wbMatch", matches ? 1 : 0, true);
        }
      });
    
      wbSource.changed();
      // const activeWBFilter = Object.keys(wbFilters || {}).find(
      //   key => wbFilters[key]
      // );
      
      const finalMode =
      activeWBVisualize === "waterbody_type" ? 1 :
      activeWBVisualize === "waterbody_size" ? 2 :
      activeWBVisualize === "surface_water_trend" ? 3 :
      activeWBVisualize === "drainage_line" ? 4 :
      0;
    
    waterbodiesLayerRef.current.updateStyleVariables({
      wbFilterActive: isVisualizeOn ? 0 : 1,
      visualizeMode: finalMode
    });
    };

    const waitForBothAndApply = () => {
      const wbFeatures = wbSource.getFeatures();
      const mwsSource = mwsLayerRef.current?.getSource();
      const mwsFeatures = mwsSource ? mwsSource.getFeatures() : [];

      const wbReady = wbFeatures.length > 0;
      const mwsReady = !hasMWSFilter || mwsFeatures.length > 0;

      if (wbReady && mwsReady) {
        applyToFeatures(wbFeatures, mwsFeatures);
        return;
      }

      let attempts = 0;
      const maxAttempts = 50;
      const poll = setInterval(() => {
        attempts++;
        const wbF = wbSource.getFeatures();
        const mwsF = mwsLayerRef.current?.getSource()?.getFeatures() || [];
        const wbOk = wbF.length > 0;
        const mwsOk = !hasMWSFilter || mwsF.length > 0;

        if (wbOk && mwsOk) {
          clearInterval(poll);
          applyToFeatures(wbF, mwsF);
        } else if (attempts >= maxAttempts) {
          clearInterval(poll);
          console.warn("applyWaterbodyFilters: timed out waiting for features");
        }
      }, 100);
    };

    waitForBothAndApply();
  };

  useEffect(() => {
    if (!mwsLayerRef.current) return;

    mwsLayerRef.current.updateStyleVariables({
      highlightMWS: highlightMWS ?? -1
    });

  }, [highlightMWS]);

  const resetMWSStyle = () => {
    setHighlightMWS(null);
  };

  const updateFilteredMWS = (filteredIds) => {
    if (!mwsLayerRef.current) return;

    const source = mwsLayerRef.current.getSource();
    const features = source.getFeatures();

    const idSet = new Set(filteredIds.map(id => String(id)));

    features.forEach((f) => {
      const uid = String(f.get("uid") || "");
      f.set("isFiltered", idSet.has(uid) ? 1 : 0);
    });

    source.changed();
  };

   const fetchMWSLayer = async (tempMWS) => {
    if (!district || !block) return;
      try {
        if (!mwsLayerRef.current) {
          const layerName = `deltaG_well_depth_${transformName(district.label)}_${transformName(block.label)}`;
        
          const mwsLayer = await getWebGlPolygonLayers("mws_layers", layerName);
        
          if (mapRef.current) {
            mapRef.current.removeLayer(boundaryLayerRef.current);
            mapRef.current.addLayer(mwsLayer);
            mapRef.current.addLayer(boundaryLayerRef.current);
          }
        
          mwsLayerRef.current = mwsLayer;
        }
        mwsLayerRef.current.setStyle({
          variables: {
            highlightMWS: -1,
            isVisualizeOn: false,
            isWBVisualizeOn: false 
          },
        
          "stroke-color": [
            "case",
        
            ["==", ["get", "uid"], ["var", "highlightMWS"]],
            [22,101,52,1],
        
            ["==", ["get", "isFiltered"], 1],
            [
              "case",
              ["var", "isVisualizeOn"],
              [37, 72, 113, 1],   //  visualize → blue
              [102, 30, 30, 1],      //  normal → red
            ],

            ["==", ["get", "isFiltered"], 0],
            [0,0,0,0],
        
            [74,144,226,1]
          ],
        
          "stroke-width": [
            "case",
        
            ["==", ["get", "uid"], ["var", "highlightMWS"]],
            2,
        
            ["==", ["get", "isFiltered"], 1],
            1.5,
        
            1
          ],
        
          "fill-color": [
            "case",

            ["var", "isWBVisualizeOn"],
            [0, 0, 0, 0],
        
            ["==", ["get", "uid"], ["var", "highlightMWS"]],
            [34,197,94,0.4],
        
            ["==", ["get", "isFiltered"], 1],
            [
              "case",
              ["var", "isVisualizeOn"],
              [0,0,0,0],            //  visualize → transparent
              [255,75,75,0.8]       // normal → red
            ],

            ["==", ["get", "isFiltered"], 0],
            [0,0,0,0],
        
            [85,152,229,0.2]
          ]
        });
        
      } catch (error) {
        console.error("Error fetching MWS layer:", error);
        toast.error("Please Refresh the Page !")
      }
  };

  const waitForFeatures = (source, label) => {
    return new Promise((resolve) => {
      let attempts = 0;

      const interval = setInterval(() => {
        const features = source.getFeatures();

        if (features.length > 0) {
          clearInterval(interval);
          resolve(features);
        }

        attempts++;

        if (attempts > 20) {
          // ~2 seconds max
          clearInterval(interval);
          resolve([]);
        }
      }, 100);
    });
  };

  const fetchMWSConnectivityLayers = async () => {
    if (!district || !block || !mapRef.current) return;

    try {
      const dist = transformName(district.label);

      const blk = transformName(block.label);

      const connectivityLayerName = `${dist}_${blk}_mws_connectivity`;

      const connectivityLayer = await getVectorLayers(
        "mws_connectivity",
        connectivityLayerName,
        true,
        true
      );

      mapRef.current.addLayer(connectivityLayer);
      mwsConnectivityLayerRef.current = connectivityLayer;

      const connectivitySource = connectivityLayer.getSource();
      await waitForFeatures(connectivitySource, "Connectivity");

      const centroidLayerName = `${dist}_${blk}_mws_centroid`;

      const centroidLayer = await getVectorLayers(
        "mws_centroid",
        centroidLayerName,
        true,
        true
      );

      mapRef.current.addLayer(centroidLayer);
      mwsCentroidLayerRef.current = centroidLayer;

      const centroidSource = centroidLayer.getSource();
      await waitForFeatures(centroidSource, "Centroid");
      generateConnectivityArrows();

    } catch (error) {
      console.error("Error fetching connectivity layers:", error);
    }
  };

  const generateConnectivityArrows = () => {
    if (
      !mwsConnectivityLayerRef.current ||
      !mwsCentroidLayerRef.current ||
      !mapRef.current
    ) {
      console.warn("Connectivity or centroid layer not ready");
      return;
    }

    const connectivityFeatures =
      mwsConnectivityLayerRef.current.getSource().getFeatures();

    const centroidFeatures =
      mwsCentroidLayerRef.current.getSource().getFeatures();

    if (!connectivityFeatures.length || !centroidFeatures.length) {
      console.warn("No features found for arrow generation");
      return;
    }

    // -------------------------
    // UID → coordinate map
    // -------------------------
    const uidToCoord = {};

    centroidFeatures.forEach((feature) => {
      const uid = feature.get("uid") || feature.get("UID");
      if (!uid) return;

      const coord = feature.getGeometry().getCoordinates();
      uidToCoord[uid.toString().trim()] = coord;
    });

    // -------------------------
    // Build pairs with side index BEFORE creating features
    // -------------------------
    const pairMap = {};
    const arrowFeatures = [];

    connectivityFeatures.forEach((feature) => {
      const uid = feature.get("uid");
      const downstream = feature.get("downstream");

      if (!uid || !downstream) return;

      const start = uidToCoord[uid.toString().trim()];
      const end = uidToCoord[downstream.toString().trim()];
      if (!start || !end) return;

      const key =
        start[0] < end[0]
          ? `${start.join(",")}_${end.join(",")}`
          : `${end.join(",")}_${start.join(",")}`;

      if (!pairMap[key]) pairMap[key] = 0;
      const index = pairMap[key]++;
      const side = index % 2 === 0 ? -1 : 1;

      // --- Compute offset geometry in map coords (not pixels) ---
      const dx = end[0] - start[0];
      const dy = end[1] - start[1];
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 1e-6) return;

      const ux = dx / len;
      const uy = dy / len;

      // Perpendicular in map coords
      const px = -uy;
      const py = ux;

      // Use a fixed map-unit offset (tune this to your projection/zoom level)
      const MAP_OFFSET = len * 0.04; // 4% of line length — adjust as needed
      const MAP_PULLBACK = len * 0.06;
      const MAP_ARROW_LEN = len * 0.14;

      const offStart = [
        start[0] + px * MAP_OFFSET * side,
        start[1] + py * MAP_OFFSET * side,
      ];
      const offEnd = [
        end[0] + px * MAP_OFFSET * side,
        end[1] + py * MAP_OFFSET * side,
      ];
      const trimEnd = [
        offEnd[0] - ux * MAP_PULLBACK,
        offEnd[1] - uy * MAP_PULLBACK,
      ];

      // Arrow head points
      const arrowAngle = Math.PI / 7;
      const angle = Math.atan2(dy, dx);

      const left = [
        trimEnd[0] - MAP_ARROW_LEN * Math.cos(angle - arrowAngle),
        trimEnd[1] - MAP_ARROW_LEN * Math.sin(angle - arrowAngle),
      ];
      const right = [
        trimEnd[0] - MAP_ARROW_LEN * Math.cos(angle + arrowAngle),
        trimEnd[1] - MAP_ARROW_LEN * Math.sin(angle + arrowAngle),
      ];
      arrowFeatures.push(
        new Feature({
          geometry: new LineString([offStart, trimEnd]),
          featureType: "arrowLine",
          upstream: uid,
          downstream,
        })
      );
      arrowFeatures.push(
        new Feature({
          geometry: new LineString([left, trimEnd, right]),
          featureType: "arrowHead",
          upstream: uid,
          downstream,
        })
      );
      arrowFeatures.push(
        new Feature({
          geometry: new Point(offStart),
          featureType: "arrowDot",
          upstream: uid,
          downstream,
        })
      );
    });

    const arrowSource = new VectorSource({ features: arrowFeatures });

    const arrowLayer = new VectorLayer({
      source: arrowSource,
      style: (feature) => {
        const color = "white";
        const type = feature.get("featureType");

        if (type === "arrowLine" || type === "arrowHead") {
          return new Style({
            stroke: new Stroke({ color, width: 1.2 }),
          });
        }
        if (type === "arrowDot") {
          return new Style({
            image: new CircleStyle({
              radius: 3,
              fill: new Fill({ color }),
              stroke: new Stroke({ color, width: 1 }),
            }),
          });
        }
      },
    });
    arrowLayer.setZIndex(9999);
    arrowLayer.setVisible(false);
    mapRef.current.addLayer(arrowLayer);
    mwsArrowLayerRef.current = arrowLayer;
  };

const fetchWaterBodiesLayer = async () => {
  if (!district || !block || !mapRef.current) return;
  if (waterbodiesLayerRef.current) return;

  const dist = transformName(district.label);
  const blk = transformName(block.label);
  const layerName = `surface_waterbodies_${dist}_${blk}`;

  const wbLayer = await getWebGlPolygonLayers("swb", layerName);
  if (!wbLayer) { console.warn("Failed loading waterbodies"); return; }

  wbLayer.setStyle({
    variables: {
      wbFilterActive: 0,
      isVisualizeOn: false,
      visualizeMode: 0   // 0=none, 1=type, 2=size, 3=trend
    },

    "stroke-color": [
      "case",
      // --- MODE 4 : Drainge ----------------------
      ["all",
        ["==", ["var", "visualizeMode"], 4],
        ["var", "isVisualizeOn"],
        ["==", ["get", "wbDrainage"], "onDrainage"]
      ],
      [59, 130, 246, 1],   // blue
      
      ["all",
        ["==", ["var", "visualizeMode"], 4],
        ["var", "isVisualizeOn"],
        ["==", ["get", "wbDrainage"], "offDrainage"]
      ],
      [168, 85, 247, 1], 

      // ── MODE 3: TREND ──────────────────────────────
      ["all", 
        ["==", ["var", "visualizeMode"], 3],
        ["var", "isVisualizeOn"],
                ["==", ["get", "wbTrend"], "positive"]
      ]  ,    [34, 197, 94, 1],

      ["all", 
        ["==", ["var", "visualizeMode"], 3],
        ["var", "isVisualizeOn"],
                ["==", ["get", "wbTrend"], "negative"]
      ]   ,   [239, 68, 68, 1],

["all", 
  ["==", ["var", "visualizeMode"], 3],
  ["var", "isVisualizeOn"],
    ["==", ["get", "wbTrend"], "steady"]
]   ,   [156, 163, 175, 1],

      // ── MODE 2: SIZE ───────────────────────────────
      ["all", 
        ["==", ["var", "visualizeMode"], 2],
        ["var", "isVisualizeOn"],
        ["==", ["get", "wbSizeCategory"], "small"]
      ],      [191, 239, 255, 0.7],

      ["all", 
        ["==", ["var", "visualizeMode"], 2],
        ["var", "isVisualizeOn"],
        ["==", ["get", "wbSizeCategory"], "medium"]
      ],      [135, 206, 250, 0.7],

      ["all", 
        ["==", ["var", "visualizeMode"], 2],
        ["var", "isVisualizeOn"],
        ["==", ["get", "wbSizeCategory"], "large"]
      ],      [30, 144, 255, 0.7],

      ["all", 
        ["==", ["var", "visualizeMode"], 2],
        ["var", "isVisualizeOn"],
        ["==", ["get", "wbSizeCategory"], "veryLarge"]
      ],      [0, 70, 180, 0.7],

      // ── MODE 1: TYPE ───────────────────────────────
      ["all", 
        ["==", ["var", "visualizeMode"], 1],
        ["var", "isVisualizeOn"],
        ["==", ["get", "wbCategory"], "onRiver"]
      ],      [135, 206, 250, 1],

      ["all", 
        ["==", ["var", "visualizeMode"], 1],
        ["var", "isVisualizeOn"],
        ["==", ["get", "wbCategory"], "offRiver"]
      ],      [30, 144, 255, 1],

      // ── FILTER: hide non-matching when visualize OFF
      ["all",
        ["==", ["var", "wbFilterActive"], 1],
        ["==", ["get", "wbMatch"], 0],
        ["!", ["var", "isVisualizeOn"]]
      ],
      [0, 0, 0, 0],

      // ── DEFAULT ────────────────────────────────────
      [246, 252, 83, 0.8]
    ],

    "stroke-width": [
      "case",
      ["all", ["==", ["var", "wbFilterActive"], 1], ["==", ["get", "wbMatch"], 0]],
      0,
      2
    ],

    "fill-color": [
      "case",


      ["all",
        ["==", ["var", "visualizeMode"], 4],
        ["var", "isVisualizeOn"],
        ["==", ["get", "wbDrainage"], "onDrainage"]
      ],
      [59, 130, 246, 0.55],
      
      ["all",
        ["==", ["var", "visualizeMode"], 4],
        ["var", "isVisualizeOn"],
        ["==", ["get", "wbDrainage"], "offDrainage"]
      ],
      [168, 85, 247, 0.55],


      // ── MODE 3: TREND ──────────────────────────────
      ["all",
        ["==", ["var", "visualizeMode"], 3],
        ["var", "isVisualizeOn"],  
        ["==", ["get", "wbTrend"], "positive"]
      ],      [34, 197, 94, 0.55],

      ["all",
        ["==", ["var", "visualizeMode"], 3],
        ["var", "isVisualizeOn"],  
        ["==", ["get", "wbTrend"], "negative"]
      ],      [239, 68, 68, 0.55],

      ["all",
        ["==", ["var", "visualizeMode"], 3],
        ["var", "isVisualizeOn"],   
        ["==", ["get", "wbTrend"], "steady"]
      ],      [156, 163, 175, 0.55],

      // ── MODE 2: SIZE ───────────────────────────────
      ["all", 
        ["==", ["var", "visualizeMode"], 2],
        ["var", "isVisualizeOn"],
        ["==", ["get", "wbSizeCategory"], "small"]
      ],      [191, 239, 255, 0.7],

      ["all", 
        ["==", ["var", "visualizeMode"], 2],
        ["var", "isVisualizeOn"],
        ["==", ["get", "wbSizeCategory"], "medium"]
      ],      [135, 206, 250, 0.7],

      ["all", 
        ["==", ["var", "visualizeMode"], 2],
        ["var", "isVisualizeOn"],
        ["==", ["get", "wbSizeCategory"], "large"]
      ],      [30, 144, 255, 0.7],

      ["all", 
        ["==", ["var", "visualizeMode"], 2],
        ["var", "isVisualizeOn"],
        ["==", ["get", "wbSizeCategory"], "veryLarge"]
      ],      [0, 70, 180, 0.7],

      // ── MODE 1: TYPE ───────────────────────────────
      ["all", 
        ["==", ["var", "visualizeMode"], 1],
        ["var", "isVisualizeOn"],
        ["==", ["get", "wbCategory"], "onRiver"]
      ],      [135, 206, 250, 0.7],

      ["all", 
        ["==", ["var", "visualizeMode"], 1],
        ["var", "isVisualizeOn"],
        ["==", ["get", "wbCategory"], "offRiver"]
      ],      [30, 144, 255, 0.7],

      // ── FILTER: hide non-matching when visualize OFF
      ["all",
        ["==", ["var", "wbFilterActive"], 1],
        ["==", ["get", "wbMatch"], 0],
        ["!", ["var", "isVisualizeOn"]]
      ],
      [0, 0, 0, 0],

      // ── DEFAULT ────────────────────────────────────
      [246, 252, 83, 0.45]
    ]
  });

  waterbodiesLayerRef.current = wbLayer;
};
  const fetchAdminLayer = async (tempVillages) => {
    if (!district || !block || !boundaryLayerRef.current) return;
  
    const source = boundaryLayerRef.current.getSource();
    if (!source) return;
  
    const selectedSet = new Set(tempVillages);
  
    source.getFeatures().forEach((feature) => {
      feature.set(
        "isSelected",
        selectedSet.has(feature.get("vill_ID")) ? 1 : 0,
        true
      );
    });
    
    
    boundaryLayerRef.current.updateStyleVariables({
      hasSelection: selectedSet.size > 0,
      isVisualizeOn: currentLayer.length > 0
    });
    
    source.changed();
  };

  const fetchBoundaryAndZoom = async (districtName, blockName) => {
    setIsLayerLoaded(true);
    try {
      const boundaryLayer = await getWebGlPolygonLayers(
        "panchayat_boundaries",
        `${transformName(districtName)}_${transformName(blockName)}`,
        true,
        true
      );

      const layerName = `deltaG_well_depth_${transformName(district.label)}_${transformName(block.label)}`;

      const mwsLayer = await getWebGlPolygonLayers("mws_layers", layerName);

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

      boundaryLayer.setStyle({
        variables: {
          hasSelection: false,
          isVisualizeOn: false 
        },
          "stroke-color": [
          "case",

          // Visualize ON → FULL BLACK 
          ["var", "isVisualizeOn"],
          [0, 0, 0, 1],

          //  Selected → GOLD
          ["==", ["get", "isSelected"], 1],
          [255, 215, 0, 1],

          // Others
          ["==", ["get", "isSelected"], 0],
          [
            "case",
            ["var", "hasSelection"],
            [0, 0, 0, 0],
            [0, 0, 0, 1]
          ],

          [0, 0, 0, 1]
        ],
        "stroke-width": [
          "case",
          ["==", ["get", "isSelected"], 1],
          2.0,
          1.2
        ],
        "fill-color": [0, 0, 0, 0]
      });
      await fetchMWSLayer([]);
      setIsLayerLoaded(false)
    } catch (error) {
      console.error("Error loading boundary:", error);
      setIsLayerLoaded(false);
      const view = mapRef.current.getView();
      view.setCenter([78.9, 23.6]);
      view.setZoom(5);
    }
  };

  const fetchDataJson = async () => {
    try {
      setIsLoading(true);
      const apiUrl = "https://geoserver.core-stack.org/api/v1";
      const response = await fetch(
        `${apiUrl}/download_kyl_data/?state=${transformName(state.label)}&district=${transformName(district.label)}&block=${transformName(block.label)}&file_type=json`
      );

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const result = await response.json();
      console.log("Raw fetchDataJson result:", result);

      // Handle multi-sheet object format by merging into a flat array for existing logic
      if (!Array.isArray(result) && result.mws) {
        console.log("Detected multi-sheet JSON format. Sheet names:", Object.keys(result));
        const mws = result.mws;
        const villages = result.mws_intersect_villages || [];
        const swbs = result.mws_intersect_swb || [];
        console.log("Sheet sizes - mws:", mws.length, "villages:", villages.length, "swbs:", swbs.length);

        mws.forEach(item => {
          const mwsId = item.mws_id || item.uid;

          // Merge villages mapping if missing or empty
          if (!item.mws_intersect_villages || (Array.isArray(item.mws_intersect_villages) && item.mws_intersect_villages.length === 0)) {
            const vMapping = villages.find(v => (v['mws uid'] || v.uid || v.mws_id || v.mws_uid) === mwsId);
            if (vMapping) {
              let ids = vMapping['village ids'] || vMapping.village_ids || vMapping.ids;
              if (typeof ids === 'string') {
                try {
                  // Handle potential single quotes or bad JSON format from backend
                  ids = JSON.parse(ids.replace(/'/g, '"'));
                } catch (_) {
                  ids = [];
                }
              }
              item.mws_intersect_villages = Array.isArray(ids) ? ids : [];
            }
          }

          // Merge waterbodies mapping if missing or empty
          if (!item.mws_intersect_swb || (Array.isArray(item.mws_intersect_swb) && item.mws_intersect_swb.length === 0)) {
            const mwsSwbs = swbs.filter(s => (s.uid || s.mws_id || s['mws uid'] || s.mws_uid) === mwsId);
            if (mwsSwbs.length > 0) {
              // Store as array of objects containing ID and name if available
              item.mws_intersect_swb = mwsSwbs.map(s => ({
                swbId: String(s.swb_uid || s.uid || s.id || ''),
                swbName: s.waterbodies_name || s.name || s.swb_name || ''
              }));
            }
          }
        });
        setDataJson(mws);
      } else {
        const itemKeys = result.length > 0 ? Object.keys(result[0]) : [];
        console.log("Detected simple array JSON format", result.length, "items. First item keys:", itemKeys);
        setDataJson(result);
      }

      setIsLoading(false);
    } catch (e) {
      console.log(e);
      setIsLoading(false);
    }
  };

  const fetchVillageJson = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL
        }/download_kyl_village_data?state=${transformName(state.label)}&district=${transformName(district.label)}&block=${transformName(block.label)}&file_type=json`
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
      tempArr = currentLayer.filter((item) => item.name !== filter.name);
      setToggleStates((prevStates) => ({
        ...prevStates,
        [filter.name]: false,
      }));

      if (
        filter.name === "waterbody_type" ||
        filter.name === "waterbody_size" ||
        filter.name === "drainage_line" ||
        filter.name === "surface_water_trend"
      ) {
        setIsWBVisualizeOn(false);
        setActiveWBVisualize(null);
      
        if (mwsLayerRef.current) {
          mwsLayerRef.current.setVisible(true);
        }
      }
      boundaryLayerRef.current.updateStyleVariables({
      isVisualizeOn: false
    });
    mwsLayerRef.current.updateStyleVariables({
      isVisualizeOn: false
    });
    if (waterbodiesLayerRef.current) {
      waterbodiesLayerRef.current.updateStyleVariables({
        isVisualizeOn: false,
        wbFilterActive: 1 ,  //  filters activate
        visualizeMode: 0
      });
      applyWaterbodyFilters(
        selectedMWS,
        filterSelections.selectedWaterbodyValues || {},
        false   //visualize OFF
      );
    }
      //setFiltersEnabled(true);
    }
    else if (currentLayer.length === 0) {
      const isWBVisualize =
      filter.name === "waterbody_type" ||
      filter.name === "waterbody_size" ||
      filter.name === "drainage_line" ||
      filter.name === "surface_water_trend";
  
    if (isWBVisualize && !showWB) {
      toast.error("Please enable 'Show Waterbodies' to apply waterbody filters.");
      return;
    }
      let layerRef = [];
      mapRef.current.removeLayer(mwsLayerRef.current);
      mapRef.current.removeLayer(boundaryLayerRef.current);
      for (let i = 0; i < len; ++i) {
        let tempLayer;
        if (filter.layer_store[i] === "terrain") {
          tempLayer = await getImageLayer(
            filter.layer_store[i],
            `${transformName(district.label)}_${transformName(block.label)}_${filter.layer_name[i]}`,
            true,
            filter.rasterStyle
          );
          layerRef.push(tempLayer);
          mapRef.current.addLayer(tempLayer);
        }
        else if (filter.layer_store[i] === "LULC" && filter.rasterStyle === "lulc_water_pixels") {
          tempLayer = await getImageLayer(
            `${filter.layer_store[i]}_${filter.layer_name[i]}`,
            `LULC_24_25_${transformName(district.label)}_${transformName(block.label)}_${filter.layer_name[i]}`,
            true,
            filter.rasterStyle
          );
          layerRef.push(tempLayer);
          mapRef.current.addLayer(tempLayer);
        }
        else if (filter.layer_store[i] === "change_detection") {
          tempLayer = await getImageLayer(
            `${filter.layer_store[i]}`,
            `change_${transformName(district.label)}_${transformName(block.label)}_${filter.layer_name[i]
            }`,
            true,
            filter.rasterStyle[i]
          );
          layerRef.push(tempLayer);
          mapRef.current.addLayer(tempLayer);
        }
        else if (filter.layer_store[i] === "nrega_assets") {
          const nregaLayerName = `${transformName(district.label)}_${transformName(block.label)}`;
          tempLayer = await getWebGlLayers(
            filter.layer_store[i],
            nregaLayerName,
            true,
            true,
            null,
            null,
            transformName(district.label),
            transformName(block.label)
          );
          layerRef.push(tempLayer);
          mapRef.current.addLayer(tempLayer);
        }
        else if (["lcw", "factory_csr", "mining"].includes(filter.layer_store[i])) {
          const industryLayerName = `${transformName(district.label)}_${transformName(block.label)}`;

          const tempLayer = await getWebGlLayers(
            filter.layer_store[i],
            industryLayerName,
            true,
            true,
            null,
            null,
            transformName(district.label),
            transformName(block.label)
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
        }
        else if (filter.layer_store[i] === "drought" || filter.layer_store[i] === "green_credit") {
          tempLayer = await getVectorLayers(
            filter.layer_store[i],
            `${transformName(district.label)}_${transformName(block.label)}_${filter.layer_name[i]}`
          );
        }
        else if (filter.layer_store[i] === "panchayat_boundaries") {
          tempLayer = await getVectorLayers(
            filter.layer_store[i],
            `${transformName(district.label)}_${transformName(block.label)}`
          );
        }
        else if (filter.layer_store[i] === "restoration") {
          tempLayer = await getVectorLayers(
            filter.layer_store[i],
            `${filter.layer_name[i]}_${transformName(district.label)}_${transformName(block.label)}_vector`
          );
        }
        else {
          tempLayer = await getVectorLayers(
            filter.layer_store[i],
            `${filter.layer_name[i]}_${transformName(district.label)}_${transformName(block.label)}`
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
      boundaryLayerRef.current.updateStyleVariables({
        isVisualizeOn: true
      });
      mwsLayerRef.current.updateStyleVariables({
        isVisualizeOn: true
      });
      if (waterbodiesLayerRef.current) {
        const visualizeMode =
          filter.name === "waterbody_type" ? 1 :
          filter.name === "waterbody_size" ? 2 :
          filter.name === "surface_water_trend" ? 3 :
          filter.name === "drainage_line" ? 4 : 0;
      
        waterbodiesLayerRef.current.updateStyleVariables({
          isVisualizeOn: true,
          wbFilterActive: 0,
          visualizeMode: visualizeMode
        });
      
        applyWaterbodyFilters(
          selectedMWS,
          filterSelections.selectedWaterbodyValues || {},
          true
        );
      }
      
      
      // Remove both first (safe reset)
        mapRef.current.removeLayer(mwsLayerRef.current);
        mapRef.current.removeLayer(boundaryLayerRef.current);

        // Add in correct order
        mapRef.current.addLayer(mwsLayerRef.current);      // below
        mapRef.current.addLayer(boundaryLayerRef.current); // TOP

        // Force always on top
        boundaryLayerRef.current.setZIndex(9999);
      let tempObj = {
        name: filter.name,
        layerRef: layerRef,
      };
      tempArr.push(tempObj);
      if (isWBVisualizeOn) {
        setIsWBVisualizeOn(true);
        if (mwsLayerRef.current) {
          mwsLayerRef.current.setVisible(false);
        }
      }
      
      setToggleStates((prevStates) => ({
        ...prevStates,
        [filter.name]: true,
      }));

      if (isWBVisualize) {
        setIsWBVisualizeOn(true);
        setActiveWBVisualize(filter.name);
        if (mwsLayerRef.current) {
          mwsLayerRef.current.setVisible(false);
        }
      }
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
        crossOrigin: 'anonymous',
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

    const map = new OLMap({
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

    if (setter === setState) {
      setDistrict(null);
      setBlock(null);
    }
    else if (setter === setDistrict) {
      setBlock(null);
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

    if (currentLayer.length > 0 && mapRef.current) {
      currentLayer.forEach((layer) => {
        layer.layerRef.forEach((ref) => {
          mapRef.current.removeLayer(ref);
        });
      });
    }

    setCurrentLayer([]);
    setToggleStates({});


    setFilterSelections({
      selectedMWSValues: {},
      selectedVillageValues: {},
      selectedWaterbodyValues: {},
    });

    setPatternSelections({
      selectedMWSPatterns: {},
      selectedVillagePatterns: {},
    });

    setIndicatorType(null);

    setSelectedMWS([]);
    setVillageIdList(new Set([]));
    setSelectedMWSProfile(null);

    setShowMWS(true);
    setShowVillages(true);


    setShowWB(false);
    if (waterbodiesLayerRef.current && mapRef.current) {
      mapRef.current.removeLayer(waterbodiesLayerRef.current);
      waterbodiesLayerRef.current = null;
    }

    if (mwsLayerRef.current) {
      fetchMWSLayer([]);   // This restores default blue style properly
    }
    setSidebarResetKey(prev => prev + 1);
  };

  const searchUserLatLong = async () => {
    setIsLoading(true);
    try {
      let response = await fetch(`${process.env.REACT_APP_API_URL
        }/get_mwsid_by_latlon/?latitude=${searchLatLong[0]}&longitude=${searchLatLong[1]}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": `${process.env.REACT_APP_API_KEY}`
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
      setHighlightMWS(response.mws_id)
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

  function calculateTrend(values) {
    let S = 0;
    for (let i = 0; i < values.length - 1; i++) {
      for (let j = i + 1; j < values.length; j++) {
        if (values[j] > values[i]) S++;
        else if (values[j] < values[i]) S--;
      }
    }
    if (S > 0) return 1;
    if (S < 0) return -1;
    return 0;
  }

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    const handleWaterbodyClick = (event) => {
      if (!waterbodiesLayerRef.current || !mapRef.current) return;

      const map = mapRef.current;
    
      //  Get clicked waterbody feature
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
    
      // 2 Construct Waterbody GeoJSON (existing logic)
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
    
      // 3 FIND MATCHED MWS FEATURE (IMPORTANT PART)
 let matchedMws = [];

      if (mwsLayerRef.current && wbFeature) {
        const props = wbFeature.getProperties();
        const raw = props.MWS_UID || props.mws_uid;

   if (raw) {
     // Convert UID string "12_315970 12_308838..." → ["12_315970","12_308838",...]
     const uidList = raw
       .split("_")
       .reduce((acc, val, idx, arr) => {
         if (idx % 2 === 0 && arr[idx + 1]) {
           acc.push(`${val}_${arr[idx + 1]}`);
         }
         return acc;
       }, []);

     //  Filter REAL MWS GEOJSON FEATURES from mwsGeoData
     const allMws = mwsLayerRef.current.getSource().getFeatures();

          const matched = allMws.filter((f) => {
            const uid = f.get("uid")?.toString().trim();
            return uidList.includes(uid);
          });

          matchedMws = matched;

        }
      }

    // SAVE ARRAY OF FULL GEOJSON FEATURES
    if (matchedMws.length > 0) {
      const geojsonWriter = new GeoJSON();

        const jsonArray = matchedMws.map((m) =>
          geojsonWriter.writeFeatureObject(m, {
            dataProjection: "EPSG:4326",
            featureProjection: "EPSG:4326",
          })
        );

        localStorage.setItem("matched_mws_features", JSON.stringify(jsonArray));
      } else {
        console.warn("⚠️ No matching MWS found for clicked WB");
      }
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

        setHighlightMWS(clickedMwsId);
        setSelectedMWSProfile(feature.getProperties());
        if (toastId) {
          toast.dismiss(toastId);
          setToastId(null);
        }
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
      fetchMWSConnectivityLayers();
    }

    // Cleanup function
    return () => {
      if (mapRef.current) {
        const view = mapRef.current.getView();
        view.cancelAnimations();
      }
    };
  }, [block, mapRef.current]);

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

  // ============================================
  // 1. PROCESS MWS FILTERS
  // ============================================
  useEffect(() => {
    try {
      if (!dataJson || !Array.isArray(dataJson)) {
        console.warn("DataJson not loaded");
        return;
      }

      const mwsFilterKeys = Object.keys(filterSelections.selectedMWSValues || {});

      if (mwsFilterKeys.length === 0) {
        setSelectedMWS([]);
        setHasFilters(false);


        const source = mwsLayerRef.current?.getSource();
        if (source) {
          source.getFeatures().forEach((f) => f.unset("isFiltered"));
          source.changed();
        }
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
                if (
                  !isNaN(value) &&
                  value >= selectedOption.value.lower &&
                  value <= selectedOption.value.upper
                ) {
                  if (!tempArr.includes(item.mws_id)) tempArr.push(item.mws_id);
                }
              }
            });
          } else {
            dataJson.forEach((item) => {
              if (item && item[filterName] === selectedOption.value && item.mws_id) {
                if (!tempArr.includes(item.mws_id)) tempArr.push(item.mws_id);
              }
            });
          }
        });

        if (resultMWS.length > 0) {
          resultMWS = resultMWS.filter((id) => tempArr.includes(id));
        } else {
          resultMWS = tempArr;
        }
      });

      setSelectedMWS(resultMWS);
      updateFilteredMWS(resultMWS); // 

      let villages = new Set();
      dataJson.forEach((item) => {
        if (resultMWS.includes(item.mws_id) && Array.isArray(item.mws_intersect_villages)) {
          item.mws_intersect_villages.forEach((v) => villages.add(v));
        }
      });
      setVillageIdList(villages);

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
      const hasMwsFilters = mwsFilterKeys.some(
        (key) => filterSelections.selectedMWSValues[key] !== null
      );
      const hasMwsPatterns = mwsPatternKeys.some(
        (key) => patternSelections.selectedMWSPatterns[key] !== null
      );

      if (!hasMwsPatterns) {
        if (hasMwsFilters) {
          // Recompute filter results
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
                    if (
                      !isNaN(value) &&
                      value >= selectedOption.value.lower &&
                      value <= selectedOption.value.upper
                    ) {
                      if (!tempArr.includes(item.mws_id)) tempArr.push(item.mws_id);
                    }
                  }
                });
              } else {
                dataJson.forEach((item) => {
                  if (item && item[filterName] === selectedOption.value && item.mws_id) {
                    if (!tempArr.includes(item.mws_id)) tempArr.push(item.mws_id);
                  }
                });
              }
            });

            if (resultMWS.length > 0) {
              resultMWS = resultMWS.filter((id) => tempArr.includes(id));
            } else {
              resultMWS = tempArr;
            }
          });

          setSelectedMWS(resultMWS);
          updateFilteredMWS(resultMWS); // OLD: highlights MWS boundary
          return;
        } else {
          // No patterns AND no filters - clear everything
          setSelectedMWS([]);
          //  OLD: reset MWS layer
          const source = mwsLayerRef.current?.getSource();
          if (source) {
            source.getFeatures().forEach((f) => f.unset("isFiltered"));
            source.changed();
          }
          return;
        }
      }

      // Patterns exist - process them
      let resultMWS = new Set();

      mwsPatternKeys.forEach((patternName) => {
        const pattern = patternSelections.selectedMWSPatterns[patternName];
        if (!pattern) return;

        let patternMatches = new Set();

        pattern.conditions.forEach((condition) => {
          dataJson.forEach((item) => {
            let matches = false;

            if (condition.type === 1 && item[condition.key] === condition.value) {
              matches = true;
            } else if (
              condition.type === 2 &&
              item[condition.key] >= condition.value.lower &&
              item[condition.key] <= condition.value.upper
            ) {
              matches = true;
            } else if (condition.type === 3 && item[condition.key] != condition.value) {
              matches = true;
            }

            if (matches) patternMatches.add(item.mws_id);
          });
        });

        if (resultMWS.size > 0) {
          resultMWS = new Set([...resultMWS].filter((x) => patternMatches.has(x)));
        } else {
          resultMWS = patternMatches;
        }
      });

      // Intersect with MWS from filters if they exist
      if (hasMwsFilters) {
        let filterResults = [];

        mwsFilterKeys.forEach((filterName) => {
          const filterValues = filterSelections.selectedMWSValues[filterName];
          if (!filterValues) return;

          let tempArr = [];
          const filter = getAllFilters().find((f) => f.name === filterName);

          filterValues.forEach((selectedOption) => {
            dataJson.forEach((item) => {
              if (!item || !item.mws_id) return;

              if (filter?.type === 2) {
                const value = Number(item[filterName]);
                if (
                  !isNaN(value) &&
                  value >= selectedOption.value.lower &&
                  value <= selectedOption.value.upper
                ) {
                  if (!tempArr.includes(item.mws_id)) tempArr.push(item.mws_id);
                }
              } else {
                if (item[filterName] === selectedOption.value) {
                  if (!tempArr.includes(item.mws_id)) tempArr.push(item.mws_id);
                }
              }
            });
          });

          if (filterResults.length > 0) {
            filterResults = filterResults.filter((id) => tempArr.includes(id));
          } else {
            filterResults = tempArr;
          }
        });

        const finalMWS = [...resultMWS].filter((id) => filterResults.includes(id));
        setSelectedMWS(finalMWS);
        updateFilteredMWS(finalMWS); //  OLD: highlights MWS boundary

        // NEW: derive villages
        const v1 = new Set();
        dataJson.forEach((item) => {
          if (finalMWS.includes(item.mws_id) && Array.isArray(item.mws_intersect_villages)) {
            item.mws_intersect_villages.forEach((v) => v1.add(v));
          }
        });
        setVillageIdList(v1);

      } else {
        const finalMWS = [...resultMWS];
        setSelectedMWS(finalMWS);
        updateFilteredMWS(finalMWS); // OLD: highlights MWS boundary

        //  NEW: derive villages
        const v2 = new Set();
        dataJson.forEach((item) => {
          if (finalMWS.includes(item.mws_id) && Array.isArray(item.mws_intersect_villages)) {
            item.mws_intersect_villages.forEach((v) => v2.add(v));
          }
        });
        setVillageIdList(v2);
      }

    } catch (error) {
      console.error("Error in MWS pattern processing:", error);
    }
  }, [patternSelections.selectedMWSPatterns, filterSelections.selectedMWSValues, dataJson]);


  // ============================================
  // 3. PROCESS VILLAGE FILTERS
  // ============================================
  useEffect(() => {
    try {
      if (!villageJson || !Array.isArray(villageJson)) return;
      if (!dataJson || !Array.isArray(dataJson)) return;

      const villageFilterKeys = Object.keys(filterSelections.selectedVillageValues || {});
      const hasVillageFilters = villageFilterKeys.some(
        (key) => filterSelections.selectedVillageValues[key] !== null
      );

      if (!hasVillageFilters) {
        setPatternVillageList(new Set());
        return;
      }

      let candidateVillages = new Set();
      if (selectedMWS.length > 0) {
        dataJson.forEach((mwsItem) => {
          if (
            selectedMWS.includes(mwsItem.mws_id) &&
            Array.isArray(mwsItem.mws_intersect_villages)
          ) {
            mwsItem.mws_intersect_villages.forEach((id) => candidateVillages.add(id));
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
            if (!village || !village.village_id) return;
            const value = Number(village[filterName]);
            if (
              !isNaN(value) &&
              value >= selectedOption.value.lower &&
              value <= selectedOption.value.upper
            ) {
              if (candidateVillages.size === 0 || candidateVillages.has(village.village_id)) {
                tempArr.add(village.village_id);
              }
            }
          });
        });

        if (resultVillages.size > 0) {
          resultVillages = new Set([...resultVillages].filter((x) => tempArr.has(x)));
        } else {
          resultVillages = tempArr;
        }
      });

      setPatternVillageList(resultVillages);

    } catch (error) {
      console.error("Error in village filter processing:", error);
    }
  }, [filterSelections.selectedVillageValues, villageJson, dataJson, selectedMWS]);


  // ============================================
  // 4. PROCESS VILLAGE PATTERNS
  // ============================================
  useEffect(() => {
    try {
      if (!villageJson || !Array.isArray(villageJson)) return;
      if (!dataJson || !Array.isArray(dataJson)) return;

      const villagePatternKeys = Object.keys(patternSelections.selectedVillagePatterns || {});
      const villageFilterKeys = Object.keys(filterSelections.selectedVillageValues || {});

      const hasVillagePatterns = villagePatternKeys.some(
        (key) => patternSelections.selectedVillagePatterns[key] !== null
      );
      const hasVillageFilters = villageFilterKeys.some(
        (key) => filterSelections.selectedVillageValues[key] !== null
      );

      const mwsFilterKeys = Object.keys(filterSelections.selectedMWSValues || {});
      const hasMwsFilters = mwsFilterKeys.some(
        (key) => filterSelections.selectedMWSValues[key] !== null
      );
      const mwsPatternKeys = Object.keys(patternSelections.selectedMWSPatterns || {});
      const hasMwsPatterns = mwsPatternKeys.some(
        (key) => patternSelections.selectedMWSPatterns[key] !== null
      );

      if (!hasVillagePatterns && !hasVillageFilters && !hasMwsFilters && !hasMwsPatterns) {
        setVillageIdList(new Set());
        return;
      }

      if (!hasVillagePatterns && !hasVillageFilters) return;

      if (!hasVillagePatterns && hasVillageFilters) {
        setVillageIdList(patternVillageList);
        return;
      }

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
            } else if (
              condition.type === 2 &&
              village[condition.key] >= condition.value.lower &&
              village[condition.key] <= condition.value.upper
            ) {
              matches = true;
            } else if (condition.type === 3 && village[condition.key] != condition.value) {
              matches = true;
            }

            if (matches) patternMatches.add(village.village_id);
          });
        });

        if (resultVillages.size > 0) {
          resultVillages = new Set([...resultVillages].filter((x) => patternMatches.has(x)));
        } else {
          resultVillages = patternMatches;
        }
      });

      let candidateVillages = new Set();
      if (selectedMWS.length > 0) {
        dataJson.forEach((mwsItem) => {
          if (
            selectedMWS.includes(mwsItem.mws_id) &&
            Array.isArray(mwsItem.mws_intersect_villages)
          ) {
            mwsItem.mws_intersect_villages.forEach((id) => candidateVillages.add(id));
          }
        });
      }

      if (candidateVillages.size > 0) {
        resultVillages = new Set([...resultVillages].filter((id) => candidateVillages.has(id)));
      }

      if (hasVillageFilters && patternVillageList.size > 0) {
        resultVillages = new Set([...resultVillages].filter((id) => patternVillageList.has(id)));
      }

      setVillageIdList(resultVillages);

    } catch (error) {
      console.error("Error in village pattern processing:", error);
    }
  }, [
    patternSelections.selectedVillagePatterns,
    filterSelections.selectedVillageValues,
    patternVillageList,
    villagePatternTrigger,
    selectedMWS,
    dataJson,
    villageJson,
    filterSelections.selectedMWSValues,
    patternSelections.selectedMWSPatterns,
  ]);


  // ============================================
  // 5. SYNC villageIdList → Admin boundary layer
  // ============================================
  useEffect(() => {
    fetchAdminLayer([...villageIdList]);
    setFinalVillageList(villageIdList);
  }, [villageIdList]);

  useEffect(() => {
    if (!showWB || !waterbodiesLayerRef.current) {
      setSelectedWaterbodyIds(new Set([]));
      return;
    }
    applyWaterbodyFilters(
      selectedMWS,
      filterSelections.selectedWaterbodyValues || {},
      isWBVisualizeOn 
    );
    // After applying, collect IDs of features where wbMatch===1
    const collectMatchedIds = () => {
      const src = waterbodiesLayerRef.current?.getSource();
      if (!src) return;
      const features = src.getFeatures();
      if (features.length === 0) return;
      const ids = new Set();
      features.forEach(f => {
        if (f.get('wbMatch') === 1) {
          const p = f.getProperties();
          const id = String(p.UID ?? p.swb_id ?? p.SWB_UID ?? p.swb_uid ?? p.uid ?? p.id ?? '');
          if (id) ids.add(id);
        }
      });
      setSelectedWaterbodyIds(ids);
    };
    // Give applyWaterbodyFilters time to finish its potential polling
    const timer = setTimeout(collectMatchedIds, 600);
    return () => clearTimeout(timer);
  }, [selectedMWS, filterSelections.selectedWaterbodyValues, showWB]);

  useEffect(() => {
    // Enable filters only when boundary + MWS + data are fully loaded
    if (
      !islayerLoaded &&
      !isLoading &&
      district &&
      block
    ) {
      setFiltersEnabled(true);
    } else {
      setFiltersEnabled(false);
    }
  }, [islayerLoaded, isLoading, district, block]);

  useEffect(() => {
    if (district && block) {
      resetAllStates();
    }
  }, [district, block]);

  const mwsVillageIntersections = useMemo(() => {
    const hasWaterbodySelections = selectedWaterbodyIds && selectedWaterbodyIds.size > 0;
    if ((!selectedMWS || selectedMWS.length === 0) && !hasWaterbodySelections) return [];
    if (!dataJson) return [];

    const result = [];

    // Group villages and waterbodies by MWS
    dataJson.forEach((mwsItem) => {
      const mwsId = mwsItem.mws_id || mwsItem.uid;
      const isMWSSelected = selectedMWS?.includes(mwsId);

      const swbsInMWS = Array.isArray(mwsItem.mws_intersect_swb) ? mwsItem.mws_intersect_swb : [];
      const matchedSWBsCount = swbsInMWS.filter(swb => {
        const id = typeof swb === 'object' ? String(swb.swbId) : String(swb);
        return selectedWaterbodyIds.has(id);
      }).length;

      // Include this MWS if it's selected OR it contains matched waterbodies
      if (isMWSSelected || matchedSWBsCount > 0) {
        const villagesInThisMWS = [];
        const waterbodiesInThisMWS = [];

        // 1. Process Villages (only if MWS is selected)
        if (isMWSSelected && Array.isArray(mwsItem.mws_intersect_villages)) {
          mwsItem.mws_intersect_villages.forEach((villageId) => {
            const villageIdStr = String(villageId);
            let vName = '';
            if (villageJson && Array.isArray(villageJson)) {
              const v = villageJson.find(v => String(v.village_id || v.vill_ID) === villageIdStr);
              if (v) vName = v.village_name || v.vill_name || v.name || '';
            }
            villagesInThisMWS.push({ villageId: villageIdStr, villageName: vName });
          });
        }

        // 2. Process Waterbodies
        if (swbsInMWS.length > 0) {
          swbsInMWS.forEach((swb) => {
            const swbIdStr = typeof swb === 'object' ? String(swb.swbId) : String(swb);
            const isMatched = selectedWaterbodyIds.has(swbIdStr);

            // Include if waterbody matches filters OR if parent MWS is selected
            if (isMatched || isMWSSelected) {
              const swbName = typeof swb === 'object' ? (swb.swbName || '') : '';
              const lat = typeof swb === 'object' ? (swb.latitude || 0) : 0;
              const lon = typeof swb === 'object' ? (swb.longitude || 0) : 0;

              waterbodiesInThisMWS.push({
                swbId: swbIdStr,
                swbName: swbName,
                latitude: lat,
                longitude: lon
              });
            }
          });
        }

        if (villagesInThisMWS.length > 0 || waterbodiesInThisMWS.length > 0) {
          result.push({
            mwsId: mwsId,
            villages: villagesInThisMWS,
            waterbodies: waterbodiesInThisMWS
          });
        }
      }
    });

    console.log(`Found intersections for ${result.length} MWS items`);

    // 3. Fallback enrichment for villages from map features
    if (boundaryLayerRef.current) {
      try {
        const features = boundaryLayerRef.current.getSource().getFeatures();
        result.forEach(group => {
          group.villages.forEach(v => {
            if (!v.villageName) {
              const f = features.find(feat => {
                const props = feat.getProperties();
                return String(props.vill_ID ?? props.village_id) === v.villageId;
              });
              if (f) {
                const props = f.getProperties();
                v.villageName = props.vill_name || props.village_name || props.name || '';
              }
            }
          });
        });
      } catch (_) { }
    }

    // 4. Fallback enrichment for waterbodies from map features
    if (waterbodiesLayerRef.current) {
      try {
        const features = waterbodiesLayerRef.current.getSource().getFeatures();
        result.forEach(group => {
          group.waterbodies.forEach(swb => {
            if (!swb.swbName) {
              const f = features.find(feat => {
                const props = feat.getProperties();
                const propsId = String(props.UID ?? props.swb_id ?? props.SWB_UID ?? props.swb_uid ?? props.uid ?? props.id ?? '');
                return propsId === swb.swbId;
              });
              if (f) {
                const props = f.getProperties();
                swb.swbName = props.name || props.waterbody_name || props.wb_name || props.swb_name || '';
                Object.assign(swb, props); // ENRICH FOR HIGHLIGHTING
              }
            }
          });
        });
      } catch (_) { }
    }

    return result;
  }, [selectedMWS, selectedWaterbodyIds, dataJson, villageJson, waterbodiesLayerRef.current]);


  return (
    <div className="min-h-screenbg-white flex flex-col">
      <Toaster />
      <div className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <LandingNavbar />
      </div>
      <div className="flex h-[calc(100vh-48px)] p-4 gap-4">
        {/* Left Sidebar */}
        <KYLLeftSidebar
          key={sidebarResetKey}
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
          mapElement={mapElement}
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
          mwsConnectivityLayerRef={mwsConnectivityLayerRef}
          showConnectivity={showConnectivity}
          setShowConnectivity={setShowConnectivity}
          mwsArrowLayerRef={mwsArrowLayerRef}
          baseLayerRef={baseLayerRef}
          mwsVillageIntersections={mwsVillageIntersections}
          villageJson={villageJson}
          dataJson={dataJson}
          selectedWaterbodyIds={selectedWaterbodyIds}
        />
      </div>
    </div>
  );
};

export default KYLDashboardPage;
