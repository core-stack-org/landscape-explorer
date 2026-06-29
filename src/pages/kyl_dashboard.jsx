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
import TileWMS     from 'ol/source/TileWMS.js';
import Control from "ol/control/Control.js";
import { defaults as defaultControls } from "ol/control/defaults.js";
import { Map, View } from "ol";
import { Fill, Stroke, Style, Circle as CircleStyle } from "ol/style.js";
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

import { LayerLoadError } from "../actions/getWebGlVectorLayers.js";
import { layerErrorBus, emitLayerError, LAYER_ERROR_TYPES } from "../actions/layerErrorBus.js";
import { useLayerErrors } from '../actions/useLayerErrors';
import LayerErrorToast from '../actions/LayerErrorToast';

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
  const mwsDrainageLayerRef = useRef(null);
  const topoLevelDataRef = useRef(null);

  const [isLoading, setIsLoading] = useState(false);
  const [islayerLoaded, setIsLayerLoaded] = useState(false);
  const [highlightMWS, setHighlightMWS] = useState(null);
  const [selectedMWS, setSelectedMWS] = useState([]);
  const [selectionMode, setSelectionMode] = useState("single");

  const [dataJson, setDataJson] = useRecoilState(dataJsonAtom);
  const [villageJson, setVillageJson] = useState(null);


  const [currentLayer, setCurrentLayer] = useState([]);
  const [toggleStates, setToggleStates] = useState({});
  const [villageIdList, setVillageIdList] = useState(new Set([]));
  const [patternVillageList, setPatternVillageList] = useState(new Set([]));
  const [finalVillageList, setFinalVillageList] = useState(new Set([]));

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

  const [toastId, setToastId] = useState(null);
  const [selectedMWSProfile, setSelectedMWSProfile] = useState(null);
  const [searchLatLong, setSearchLatLong] = useState(null);

  // * Triggers
  const [clickedWaterbodyId, setClickedWaterbodyId] = useState(null);
  const [waterbodyDashboardUrl, setWaterbodyDashboardUrl] = useState(null);
  const [selectedWaterbodyProfile, setSelectedWaterbodyProfile] = useState(null);

  const waterbodyClickedRef = useRef(false);

  const [selectedWaterbodyForTehsil, setSelectedWaterbodyForTehsil] = useRecoilState(selectedWaterbodyForTehsilAtom);
  const [showWB, setShowWB] = useState(false);
  const [showConnectivity, setShowConnectivity] = useState(false);
  const [hasFilters, setHasFilters] = useState(false);
  const [selectedWaterbodyIds, setSelectedWaterbodyIds] = useState(new Set([]));
  const [isWBVisualizeOn, setIsWBVisualizeOn] = useState(false);
  const [activeWBVisualize, setActiveWBVisualize] = useState(null);
  const [selectedWaterbodyData, setSelectedWaterbodyData] = useState([]);
  const [isLayerSelecting, setIsLayerSelecting] = useState(false);
  const showConnectivityRef = useRef(false);


  const [dataJsonError, setDataJsonError] = useState(null);
  const [villageJsonError, setVillageJsonError] = useState(null);
  const INDIA_CENTER = [78.9, 23.6];
  const INDIA_ZOOM   = 5;
  const { errors: layerErrors, dismiss: dismissLayerError, retry: retryLayerError } = useLayerErrors();


  const dataJsonIndex = useMemo(() => {
    if (!dataJson || !Array.isArray(dataJson)) return null;

    const byId = new Map();          // mws_id → mwsItem
    const mwsToVillages = new Map(); // mws_id → village_id[]
    const mwsToSWBIds = new Map();   // mws_id → swbId[] (string)
    const fieldIndex = {};           // fieldName → { value → Set<mws_id> }

    dataJson.forEach(item => {
      if (!item?.mws_id) return;
      const id = item.mws_id;

      byId.set(id, item);
      mwsToVillages.set(id, item.mws_intersect_villages || []);
      mwsToSWBIds.set(
        id,
        (item.mws_intersect_swb || []).map(swb =>
          typeof swb === 'object' ? String(swb.swbId) : String(swb)
        )
      );

      Object.keys(item).forEach(field => {
        if (
          field === 'mws_id' ||
          field === 'mws_intersect_villages' ||
          field === 'mws_intersect_swb'
        ) return;

        if (!fieldIndex[field]) fieldIndex[field] = {};
        const key = String(item[field]);
        if (!fieldIndex[field][key]) fieldIndex[field][key] = new Set();
        fieldIndex[field][key].add(id);
      });
    });

    return { byId, mwsToVillages, mwsToSWBIds, fieldIndex };
  }, [dataJson]);

  // ─── Contour interval based on zoom resolution ───────────────────────────────
  const getContourInterval = (resolution) => {
    if (resolution < 0.00005)  return 10;   // zoom 15+  → 10m  (street level)
    if (resolution < 0.0001)   return 20;   // zoom 14   → 20m
    if (resolution < 0.0002)   return 25;   // zoom 13   → 25m
    if (resolution < 0.0005)   return 50;   // zoom 12   → 50m  ← tehsil (was 10m)
    if (resolution < 0.001)    return 100;  // zoom 11   → 100m
    if (resolution < 0.003)    return 200;  // zoom 9-10 → 200m
    if (resolution < 0.008)    return 300;  // zoom 7-8  → 300m
    return 500;                             // zoom < 7  → 500m (overview)
  };

  const addLayerSafe = (layer) => layer && mapRef.current && mapRef.current.addLayer(layer);

  const transformName = (name) => {
    if (!name) return name;
    return name
      .replace(/[()]/g, "")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
      .toLowerCase()
  };

  const handleResetMWS = () => {
    // if (!selectedMWSProfile) return;
    setSelectedMWSProfile(null);
     setSelectedMWS([]);
       setHighlightMWS(null);
    if (mwsLayerRef.current) resetMWSStyle();
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
            allFilters.push({ ...filter, category: type });
          }
        });
      });
    });
    return allFilters;
  };

  const getFormattedSelectedFilters = () => {
    const allSelections = [];
    const groupedSelections = {};

    const processSelections = (selections, dataSource) => {
      if (!selections) return;
      Object.entries(selections).forEach(([name, values]) => {
        if (!values) return;

        let filterGroup = null;
        outerLoop: for (const ind of Object.keys(filtersDetails)) {
          for (const type of Object.keys(filtersDetails[ind])) {
            const found = filtersDetails[ind][type].find((group) => group.name === name);
            if (found) { filterGroup = found; break outerLoop; }
          }
        }

        if (filterGroup) {
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
          values.forEach((selectedOption) => {
            groupedSelections[name].values.push(selectedOption.label);
          });
        }
      });
    };

    processSelections(filterSelections.selectedMWSValues, "MWS");
    processSelections(filterSelections.selectedVillageValues, "Village");
    processSelections(filterSelections.selectedWaterbodyValues, "Waterbody");
    Object.values(groupedSelections).forEach(group => allSelections.push(group));
    return allSelections;
  };

  const getFormattedSelectedPatterns = () => {
    const allSelections = [];

    const processSelections = (selections) => {
      if (!selections) return;
      Object.entries(selections).forEach(([name, values]) => {
        if (!values) return;
        let filterGroup = null;
        outerLoop: for (const ind of Object.keys(PatternsData)) {
          for (const x of Object.keys(PatternsData[ind])) {
            for (const y of Object.keys(PatternsData[ind][x])) {
              const found = PatternsData[ind][x][y].find((group) => group.Name === name);
              if (found) { filterGroup = found; break outerLoop; }
            }
          }
        }
        if (filterGroup) {
          allSelections.push({
            patternName: filterGroup.Name,
            category: filterGroup.Category,
            level: filterGroup.level,
            values: filterGroup.Values,
            characterstics: filterGroup.Characteristics,
          });
        }
      });
    };

    processSelections(patternSelections.selectedMWSPatterns);
    processSelections(patternSelections.selectedVillagePatterns);
    return allSelections;
  };

  const determineFilterSource = (filterName) => {
    for (const topLevelKey of Object.keys(filtersDetails)) {
      if (filtersDetails[topLevelKey]) {
        for (const categoryKey of Object.keys(filtersDetails[topLevelKey])) {
          const found = filtersDetails[topLevelKey][categoryKey].find(
            (f) => f.name === filterName
          );
          if (found) return { ...found, name: topLevelKey };
        }
      }
    }
    return null;
  };

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
        const currentArray = prev.selectedMWSValues[name] || [];
        let newArray;
        if (isChecked) {
          const exists = currentArray.some(item => item.label === option.label);
          newArray = exists ? currentArray : [...currentArray, option];
        } else {
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
        const currentArray = prev.selectedVillageValues[name] || [];
        let newArray;
        if (isChecked) {
          const exists = currentArray.some(item => item.label === option.label);
          newArray = exists ? currentArray : [...currentArray, option];
        } else {
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

  const handlePatternSelection = (pattern, isSelected) => {
    handlePatternSelectionLogic(pattern, isSelected, patternSelections, setPatternSelections);
  };

  // ─── WB filters: ID-based lookup via dataJsonIndex, no geometry ───
  const applyWaterbodyFilters = (mwsIds, wbFilters, isVisualizeOn) => {
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

        const areas = Object.keys(props)
          .filter(key => key.startsWith("area_") && key !== "area_ored")
          .sort()
          .map(key => Number(props[key] ?? 0));
        const trend = calculateTrend(areas);
        const wbTrend = trend > 0 ? "positive" : trend < 0 ? "negative" : "steady";
        feature.set("wbTrend", wbTrend, true);

        const drainageValue = Number(props.on_drainage_line ?? 0);
        const wbDrainage = drainageValue === 1 ? "onDrainage" : "offDrainage";
        feature.set("wbDrainage", wbDrainage, true);

        let matches = true;

        if (hasMWSFilter) {
          if (selectedMWSPolygons.length === 0) {
            matches = false;
          } else {
            const wbGeom = feature.getGeometry();
            if (!wbGeom) {
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
        }

        if (matches && hasAttrFilter) {
          filterKeys.forEach((filterName) => {
            const selectedOptions = wbFilters[filterName];
            if (!selectedOptions) return;

            if (filterName === "waterbody_type") {
              const isOnRiver = props.waterbody_type === "river";
              const pass = selectedOptions.some(opt => {
                if (opt.value === 1) return isOnRiver;
                if (opt.value === 0) return !isOnRiver;
                return false;
              });
              if (!pass) matches = false;
            }

            if (filterName === "waterbody_size") {
              const a = Number(props.area_ored ?? props.AREA_HA ?? props.area ?? props.Area ?? 0);
              const pass = selectedOptions.some(
                opt => a >= opt.value.lower && a <= opt.value.upper
              );
              if (!pass) matches = false;
            }

            if (filterName === "drainage_line") {
              const pass = selectedOptions.some(opt => drainageValue === opt.value);
              if (!pass) matches = false;
            }

            if (filterName === "surface_water_trend") {
              const pass = selectedOptions.some(opt => trend === opt.value);
              if (!pass) matches = false;
            }
          });
        }

        if (isVisualizeOn) {
          feature.set("wbMatch", 1, true);
        } else {
          feature.set("wbMatch", matches ? 1 : 0, true);
        }
      });

      if (hasAttrFilter && !hasMWSFilter) {
        const wbData = [];
        wbFeatures.forEach(f => {
          if (f.get('wbMatch') === 1) {
            const p = f.getProperties();
            const swbId = String(
              p.UID ?? p.swb_id ?? p.SWB_UID ?? p.swb_uid ?? p.uid ?? p.id ?? ''
            );
            if (swbId) {
              wbData.push({
                swbId,
                swbName:          p.name || p.NAME || p.swb_name || p.SWB_NAME || '',
                latitude:  (() => {
                  if (p.latitude ?? p.lat ?? p.centroid_lat) {
                    return Number(p.latitude ?? p.lat ?? p.centroid_lat);
                  }
                  try {
                    const geom = f.getGeometry();
                    if (!geom) return 0;
                    const extent = geom.getExtent();
                    return (extent[1] + extent[3]) / 2; // center Y = latitude
                  } catch (_) { return 0; }
                })(),
                longitude: (() => {
                  if (p.longitude ?? p.long ?? p.centroid_long ?? p.lng) {
                    return Number(p.longitude ?? p.long ?? p.centroid_long ?? p.lng);
                  }
                  try {
                    const geom = f.getGeometry();
                    if (!geom) return 0;
                    const extent = geom.getExtent();
                    return (extent[0] + extent[2]) / 2; // center X = longitude
                  } catch (_) { return 0; }
                })(),
                waterbody_type:   p.waterbody_type,
                area_ored:        p.area_ored,
                on_drainage_line: p.on_drainage_line,
                wbDrainage:       f.get('wbDrainage'),
                wbTrend:          f.get('wbTrend'),
                wbSizeCategory:   f.get('wbSizeCategory'),
                wbCategory:       f.get('wbCategory'),
              });
            }
          }
        });
        setSelectedWaterbodyData(wbData);
      } else if (!hasAttrFilter) {
        setSelectedWaterbodyData([]);
      }

      // Set selectedWaterbodyIds here — only place wbMatch is guaranteed fresh
      if (hasAttrFilter) {
        const ids = new Set();
        wbFeatures.forEach(f => {
          if (f.get('wbMatch') !== 1) return;
          const p = f.getProperties();
          const wbId = String(p.UID ?? p.swb_id ?? p.SWB_UID ?? p.swb_uid ?? p.uid ?? p.id ?? '');
          if (!wbId) return;
          if (hasMWSFilter) {
            const inMWS = mwsIds.some(mwsId =>
              (dataJsonIndex?.mwsToSWBIds.get(mwsId) || []).includes(wbId)
            );
            if (!inMWS) return;
          }
          ids.add(wbId);
        });
        setSelectedWaterbodyIds(ids);
      }

      wbSource.changed();

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
        const mwsF = mwsSource ? mwsSource.getFeatures() : [];

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
    mwsLayerRef.current.updateStyleVariables({ highlightMWS: highlightMWS ?? -1 });
  }, [highlightMWS]);

  useEffect(() => {
    if (!mwsArrowLayerRef.current) return;
  
    if (showConnectivity) {
      mwsArrowLayerRef.current.setVisible(true);
      boundaryLayerRef.current.setVisible(false);
      if (mwsDrainageLayerRef.current) mwsDrainageLayerRef.current.setVisible(true);
      if (topoLevelDataRef.current) {
        const { topoLevel, maxLevel } = topoLevelDataRef.current;
        applyTopoColorToMWS(topoLevel, maxLevel);
      }
    } else {
      mwsArrowLayerRef.current.setVisible(false);
      boundaryLayerRef.current.setVisible(true);
      if (mwsDrainageLayerRef.current) mwsDrainageLayerRef.current.setVisible(false);
      applyDefaultMWSStyle();
      // fetchMWSLayer(selectedMWS);
    }
  }, [showConnectivity]);

  useEffect(() => {
    showConnectivityRef.current = showConnectivity;
  }, [showConnectivity]);

  const resetMWSStyle = () => setHighlightMWS(null);


  const updateFilteredMWS = (filteredIds) => {
    if (!mwsLayerRef.current) return;
    const source = mwsLayerRef.current.getSource();
    const idSet = new Set(filteredIds);
    const hasAnyFilters = filteredIds.length > 0;

    source.getFeatures().forEach((f) => {
      f.set("isFiltered", idSet.has(f.get("uid")) ? 1 : 0, true);
      if (hasAnyFilters) {
        f.set("hasFilters", 1, true);
      } else {
        f.unset("hasFilters");  // Clear the property entirely
      }
    });
    source.changed();
    if (showConnectivityRef.current && topoLevelDataRef.current) {
      const { topoLevel, maxLevel } = topoLevelDataRef.current;
      applyTopoColorToMWS(topoLevel, maxLevel);
    }
  };

  const applyDefaultMWSStyle = () => {
    if (!mwsLayerRef.current) return;
    
    mwsLayerRef.current.setStyle({
      variables: {
        highlightMWS: highlightMWS ?? -1,
      },
  
      // NORMAL BLUE BORDER
      "stroke-color": [
        "case",

          ["==", ["get", "isSelected"], 1],
          [22, 101, 52, 1],

        // matched MWS
        ["==", ["get", "isFiltered"], 1],
        [127, 29, 29, 1], // dark mehroon

        // hide unmatched when filters active
        ["==", ["get", "hasFilters"], 1],
        [0, 0, 0, 0],

        // normal MWS
        [74, 144, 226, 1],
      ],
        
      "stroke-width": [
        "case",

        ["==", ["get", "isSelected"], 1],
        2.5,

        ["==", ["get", "isFiltered"], 1],
        1.8,

        ["==", ["get", "hasFilters"], 1],
        0,

        1.2,
      ],
  
      // NORMAL LIGHT BLUE FILL
      "fill-color": [
        "case",

        ["==", ["get", "isSelected"], 1],
        [34, 197, 94, 0.4],

        ["==", ["get", "isFiltered"], 1],
        [239, 68, 68, 0.55],

        ["==", ["get", "hasFilters"], 1],
        [0, 0, 0, 0],

        [85, 152, 229, 0.15],
      ],
    });
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
    
    } catch (error) {
      console.error("Error fetching MWS layer:", error);
      toast.error("Please Refresh the Page !");
    }
  };

  const waitForFeatures = (source, label) => {
    return new Promise((resolve) => {
      let attempts = 0;
      const interval = setInterval(() => {
        const features = source.getFeatures();
        if (features.length > 0) { clearInterval(interval); resolve(features); }
        attempts++;
        if (attempts > 20) { clearInterval(interval); resolve([]); }
      }, 100);
    });
  };

  const fetchMWSConnectivityLayers = async () => {
    if (!district || !block || !mapRef.current) return;
    try {
      const dist = transformName(district.label);
      const blk = transformName(block.label);

      const connectivityLayer = await getVectorLayers(
        "mws_connectivity",
        `${dist}_${blk}_mws_connectivity`,
        true, true
      );
      mapRef.current.addLayer(connectivityLayer);
      mwsConnectivityLayerRef.current = connectivityLayer;
      await waitForFeatures(connectivityLayer.getSource(), "Connectivity");

      const centroidLayer = await getVectorLayers(
        "mws_centroid",
        `${dist}_${blk}_mws_centroid`,
        true, true
      );
      mapRef.current.addLayer(centroidLayer);
      mwsCentroidLayerRef.current = centroidLayer;
      await waitForFeatures(centroidLayer.getSource(), "Centroid");

      const drainageLayer = await getWebGlPolygonLayers(
        "drainage",
        `${dist}_${blk}`
      );
      mapRef.current.addLayer(drainageLayer);
      await waitForFeatures(drainageLayer.getSource(), "Drainage");
      mwsDrainageLayerRef.current = drainageLayer

      generateConnectivityArrows();
    } catch (error) {
      console.error("Error fetching connectivity layers:", error);
    }
  };

  const generateConnectivityArrows = () => {
    if (!mwsConnectivityLayerRef.current || !mwsCentroidLayerRef.current || !mapRef.current) {
      console.warn("Connectivity or centroid layer not ready");
      return;
    }
  
    const connectivityFeatures = mwsConnectivityLayerRef.current.getSource().getFeatures();
    const centroidFeatures = mwsCentroidLayerRef.current.getSource().getFeatures();
  
    if (!connectivityFeatures.length || !centroidFeatures.length) {
      console.warn("No features found for arrow generation");
      return;
    }
  
    // ── 1. UID → coord map ───────────────────────────────────────────────────
    const uidToCoord = {};
    centroidFeatures.forEach((feature) => {
      const uid = feature.get("uid") || feature.get("UID");
      if (!uid) return;
      uidToCoord[uid.toString().trim()] = feature.getGeometry().getCoordinates();
    });
  
    // ── 2. Build adjacency graph ──────────────────────────────────────────────
    const inDegree = {};
    const outEdges = {};
    const allUids  = new Set();
  
    connectivityFeatures.forEach((f) => {
      const uid = f.get("uid")?.toString().trim();
      const ds  = f.get("downstream")?.toString().trim();
      if (!uid || !ds) return;
      allUids.add(uid);
      allUids.add(ds);
      if (!outEdges[uid]) outEdges[uid] = [];
      if (!inDegree[uid]) inDegree[uid] = 0;
      if (!inDegree[ds])  inDegree[ds]  = 0;
      outEdges[uid].push(ds);
      inDegree[ds] = (inDegree[ds] || 0) + 1;
    });
  
    // ── 3. Kahn's algorithm → topo level per node ────────────────────────────
    const topoLevel = {};
    const queue     = [];
  
    allUids.forEach((uid) => {
      if ((inDegree[uid] || 0) === 0) {
        queue.push(uid);
        topoLevel[uid] = 0;
      }
    });
  
    while (queue.length) {
      const cur = queue.shift();
      (outEdges[cur] || []).forEach((ds) => {
        topoLevel[ds] = Math.max(topoLevel[ds] ?? 0, (topoLevel[cur] ?? 0) + 1);
        inDegree[ds]--;
        if (inDegree[ds] === 0) queue.push(ds);
      });
    }
  
    const maxLevel = Math.max(1, ...Object.values(topoLevel));
  
    // Store for use by applyTopoColorToMWS
    topoLevelDataRef.current = { topoLevel, maxLevel };
  
    // ── 4. Color helper ───────────────────────────────────────────────────────
    const levelToColor = (level) => {
      const t = level / maxLevel;
      let r, g, b;
      if (t < 0.5) {
        const s = t * 2;
        r = Math.round(34  + (251 - 34)  * s);
        g = Math.round(197 + (146 - 197) * s);
        b = Math.round(94  + (0   - 94)  * s);
      } else {
        const s = (t - 0.5) * 2;
        r = Math.round(251 + (239 - 251) * s);
        g = Math.round(146 + (68  - 146) * s);
        b = Math.round(0   + (68  - 0)   * s);
      }
      return `rgb(${r},${g},${b})`;
    };
  
    // ── 5. Apply topo colors to MWS polygons ─────────────────────────────────
    // applyTopoColorToMWS(topoLevel, maxLevel);
  
    // ── 6. Build arrow features ───────────────────────────────────────────────
    const pairMap  = {};
    const features = [];
  
    connectivityFeatures.forEach((feature) => {
      const uid        = feature.get("uid")?.toString().trim();
      const downstream = feature.get("downstream")?.toString().trim();
      if (!uid || !downstream) return;
  
      const start = uidToCoord[uid];
      const end   = uidToCoord[downstream];
      if (!start || !end) return;
  
      const key =
        start[0] < end[0]
          ? `${start.join(",")}_${end.join(",")}`
          : `${end.join(",")}_${start.join(",")}`;
  
      if (!pairMap[key]) pairMap[key] = 0;
      const side = pairMap[key]++ % 2 === 0 ? -1 : 1;
  
      const dx  = end[0] - start[0];
      const dy  = end[1] - start[1];
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 1e-6) return;
  
      const px = -(dy / len);
      const py =   dx / len;
      const MAP_OFFSET = len * 0.04;
  
      const offStart = [start[0] + px * MAP_OFFSET * side, start[1] + py * MAP_OFFSET * side];
      const offEnd   = [end[0]   + px * MAP_OFFSET * side, end[1]   + py * MAP_OFFSET * side];
  
      const avgLevel = ((topoLevel[uid] ?? 0) + (topoLevel[downstream] ?? 0)) / 2;
      const color    = levelToColor(avgLevel);
  
      const ARROW_HEAD = 10;
      const DOT_R      = 3;
  
      const f = new Feature({
        geometry:    new LineString([offStart, offEnd]),
        featureType: "arrow",
        upstream:    uid,
        downstream,
        topoLevel:   topoLevel[uid] ?? 0,
      });
  
      f.setStyle(
        new Style({
          renderer: (pixelCoords, state) => {
            const ctx = state.context;
            const [[x1, y1], [x2, y2]] = pixelCoords;
            const angle = Math.atan2(y2 - y1, x2 - x1);
  
            ctx.save();
            ctx.strokeStyle = "white";
            ctx.fillStyle   = "white";
            ctx.lineWidth   = 1.8;
            ctx.lineCap     = "round";
            ctx.lineJoin    = "round";
  
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
  
            ctx.beginPath();
            ctx.moveTo(x2 - ARROW_HEAD * Math.cos(angle - Math.PI / 7),
                       y2 - ARROW_HEAD * Math.sin(angle - Math.PI / 7));
            ctx.lineTo(x2, y2);
            ctx.lineTo(x2 - ARROW_HEAD * Math.cos(angle + Math.PI / 7),
                       y2 - ARROW_HEAD * Math.sin(angle + Math.PI / 7));
            ctx.stroke();
  
            ctx.beginPath();
            ctx.arc(x1, y1, DOT_R, 0, Math.PI * 2);
            ctx.fill();
  
            ctx.restore();
          },
        })
      );
  
      features.push(f);
    });
  
    // ── 7. Arrow layer ────────────────────────────────────────────────────────
    const arrowLayer = new VectorLayer({
      source: new VectorSource({ features }),
    });
  
    arrowLayer.setZIndex(9999);
    arrowLayer.setVisible(false);
    mwsDrainageLayerRef.current.setVisible(false);
    mapRef.current.addLayer(arrowLayer);
    mwsArrowLayerRef.current = arrowLayer;
  };

  const applyTopoColorToMWS = (topoLevel, maxLevel) => {
    if (!mwsLayerRef.current) return;
  
    const mwsSource = mwsLayerRef.current.getSource();
    const mwsFeatures = mwsSource.getFeatures();
  
    if (!mwsFeatures.length) {
      mwsSource.once("featuresloadend", () => {
        applyTopoColorToMWS(topoLevel, maxLevel);
      });
      return;
    }
  
    // store topo value
    mwsFeatures.forEach((feature) => {
      const uid = feature.get("uid")?.toString().trim();
      const level = topoLevel[uid] ?? 0;
  
      const norm = Math.round((level / maxLevel) * 255);
  
      feature.set("topoNorm", norm, true);
    });
  
    mwsSource.changed();
  
    // APPLY STYLE
    mwsLayerRef.current.setStyle({
      variables: {
        highlightMWS: highlightMWS ?? -1,
      },
  
      "stroke-color": [
        "case",
        // selected MWS
        ["==", ["get", "uid"], ["var", "highlightMWS"]],
        [22, 101, 52, 1],
        // ALL boundaries red
        [255, 0, 0, 1],
      ],
      "stroke-width": [
        "case", ["==", ["get", "uid"], ["var", "highlightMWS"]], 2.5, 1.2,
      ],
  
      // ───────────── TOPO FILL ─────────────
      "fill-color": [ "interpolate",["linear"],["get", "topoNorm"],
          0, [34, 197, 94, 0.55],
        128, [251, 191, 36, 0.55],
        255, [239, 68, 68, 0.55],
      ],
    });
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
        visualizeMode: 0
      },

      "stroke-color": [
        "case",
        ["all", ["==", ["var", "visualizeMode"], 4], ["var", "isVisualizeOn"], ["==", ["get", "wbDrainage"], "onDrainage"]],
        [59, 130, 246, 1],

        ["all", ["==", ["var", "visualizeMode"], 4], ["var", "isVisualizeOn"], ["==", ["get", "wbDrainage"], "offDrainage"]],
        [168, 85, 247, 1],

        ["all", ["==", ["var", "visualizeMode"], 3], ["var", "isVisualizeOn"], ["==", ["get", "wbTrend"], "positive"]],
        [34, 197, 94, 1],

        ["all", ["==", ["var", "visualizeMode"], 3], ["var", "isVisualizeOn"], ["==", ["get", "wbTrend"], "negative"]],
        [239, 68, 68, 1],

        ["all", ["==", ["var", "visualizeMode"], 3], ["var", "isVisualizeOn"], ["==", ["get", "wbTrend"], "steady"]],
        [156, 163, 175, 1],

        ["all", ["==", ["var", "visualizeMode"], 2], ["var", "isVisualizeOn"], ["==", ["get", "wbSizeCategory"], "small"]],
        [191, 239, 255, 0.7],

        ["all", ["==", ["var", "visualizeMode"], 2], ["var", "isVisualizeOn"], ["==", ["get", "wbSizeCategory"], "medium"]],
        [135, 206, 250, 0.7],

        ["all", ["==", ["var", "visualizeMode"], 2], ["var", "isVisualizeOn"], ["==", ["get", "wbSizeCategory"], "large"]],
        [30, 144, 255, 0.7],

        ["all", ["==", ["var", "visualizeMode"], 2], ["var", "isVisualizeOn"], ["==", ["get", "wbSizeCategory"], "veryLarge"]],
        [0, 70, 180, 0.7],

        ["all", ["==", ["var", "visualizeMode"], 1], ["var", "isVisualizeOn"], ["==", ["get", "wbCategory"], "onRiver"]],
        [135, 206, 250, 1],

        ["all", ["==", ["var", "visualizeMode"], 1], ["var", "isVisualizeOn"], ["==", ["get", "wbCategory"], "offRiver"]],
        [30, 144, 255, 1],

        ["all", ["==", ["var", "wbFilterActive"], 1], ["==", ["get", "wbMatch"], 0], ["!", ["var", "isVisualizeOn"]]],
        [0, 0, 0, 0],

        [85, 255, 255, 1]
      ],

      "stroke-width": [
        "case",
        ["all", ["==", ["var", "wbFilterActive"], 1], ["==", ["get", "wbMatch"], 0]],
        0,
        2
      ],

      "fill-color": [
        "case",
        ["all", ["==", ["var", "visualizeMode"], 4], ["var", "isVisualizeOn"], ["==", ["get", "wbDrainage"], "onDrainage"]],
        [59, 130, 246, 0.55],

        ["all", ["==", ["var", "visualizeMode"], 4], ["var", "isVisualizeOn"], ["==", ["get", "wbDrainage"], "offDrainage"]],
        [168, 85, 247, 0.55],

        ["all", ["==", ["var", "visualizeMode"], 3], ["var", "isVisualizeOn"], ["==", ["get", "wbTrend"], "positive"]],
        [34, 197, 94, 0.55],

        ["all", ["==", ["var", "visualizeMode"], 3], ["var", "isVisualizeOn"], ["==", ["get", "wbTrend"], "negative"]],
        [239, 68, 68, 0.55],

        ["all", ["==", ["var", "visualizeMode"], 3], ["var", "isVisualizeOn"], ["==", ["get", "wbTrend"], "steady"]],
        [156, 163, 175, 0.55],

        ["all", ["==", ["var", "visualizeMode"], 2], ["var", "isVisualizeOn"], ["==", ["get", "wbSizeCategory"], "small"]],
        [191, 239, 255, 0.7],

        ["all", ["==", ["var", "visualizeMode"], 2], ["var", "isVisualizeOn"], ["==", ["get", "wbSizeCategory"], "medium"]],
        [135, 206, 250, 0.7],

        ["all", ["==", ["var", "visualizeMode"], 2], ["var", "isVisualizeOn"], ["==", ["get", "wbSizeCategory"], "large"]],
        [30, 144, 255, 0.7],

        ["all", ["==", ["var", "visualizeMode"], 2], ["var", "isVisualizeOn"], ["==", ["get", "wbSizeCategory"], "veryLarge"]],
        [0, 70, 180, 0.7],

        ["all", ["==", ["var", "visualizeMode"], 1], ["var", "isVisualizeOn"], ["==", ["get", "wbCategory"], "onRiver"]],
        [135, 206, 250, 0.7],

        ["all", ["==", ["var", "visualizeMode"], 1], ["var", "isVisualizeOn"], ["==", ["get", "wbCategory"], "offRiver"]],
        [30, 144, 255, 0.7],

        ["all", ["==", ["var", "wbFilterActive"], 1], ["==", ["get", "wbMatch"], 0], ["!", ["var", "isVisualizeOn"]]],
        [0, 0, 0, 0],

        [85, 255, 255, 0.45]
      ]
    });

    waterbodiesLayerRef.current = wbLayer;
    wbLayer.setZIndex(9998);
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
      isVisualizeOn: currentLayer.length > 0,
    });
    source.changed();
  };

  const fetchBoundaryAndZoom = async (districtName, blockName) => {
    // ── Guard: map must be initialised ────────────────────────────────────────
    if (!mapRef.current) {
      console.warn("[fetchBoundaryAndZoom] map not ready, skipping");
      return;
    }
  
    setIsLayerLoaded(true);

    let zoomStarted = false;
    // RESET CONNECTIVITY ON LOCATION CHANGE
    setShowConnectivity(false);

    if (mwsArrowLayerRef.current) {
      mwsArrowLayerRef.current.setVisible(false);
    }

    if (mwsDrainageLayerRef.current) {
      mwsDrainageLayerRef.current.setVisible(false);
    }

    if (boundaryLayerRef.current) {
      boundaryLayerRef.current.setVisible(true);
    }

    try {
      // ── 1. Fetch layers ──────────────────────────────────────────────────────
      const [boundaryLayer, mwsLayer] = await Promise.all([
        getWebGlPolygonLayers(
          "panchayat_boundaries",
          `${transformName(districtName)}_${transformName(blockName)}`
        ),
        getWebGlPolygonLayers(
          "mws_layers",
          `deltaG_well_depth_${transformName(district.label)}_${transformName(block.label)}`
        ),
      ]);
  
      // ── 2. Swap layers on the map ────────────────────────────────────────────
      if (mwsLayerRef.current)      mapRef.current.removeLayer(mwsLayerRef.current);
      if (boundaryLayerRef.current) mapRef.current.removeLayer(boundaryLayerRef.current);
  
      boundaryLayer.setOpacity(0);
      addLayerSafe(mwsLayer);
      addLayerSafe(boundaryLayer);
  
      mwsLayerRef.current      = mwsLayer;
      boundaryLayerRef.current = boundaryLayer;
  
      // ── 3. Style boundary ────────────────────────────────────────────────────
      boundaryLayer.setStyle({
        variables: { hasSelection: false, isVisualizeOn: false },
        "stroke-color": [
          "case",
          ["var", "isVisualizeOn"],       [0, 0, 0, 1],
          ["==", ["get", "isSelected"], 1], [255, 225, 0, 1],
          ["==", ["get", "isSelected"], 0], [
            "case", ["var", "hasSelection"], [0, 0, 0, 0], [0, 0, 0, 1],
          ],
          [0, 0, 0, 1],
        ],
        "stroke-width": ["case", ["==", ["get", "isSelected"], 1], 2.0, 1.2],
        "fill-color": [0, 0, 0, 0],
      });
  
      // ── 4. Zoom animation ────────────────────────────────────────────────────
      const vectorSource = boundaryLayer.getSource();
      const extent       = vectorSource.getExtent();
      const view         = mapRef.current.getView();
  
      view.cancelAnimations();
      zoomStarted = true;
  
      // Brief zoom-out for visual context
      await new Promise((resolve) =>
        view.animate({ zoom: Math.max(view.getZoom() - 0.5, 5), duration: 200 }, resolve)
      );
  
      // Fit to boundary extent
      await new Promise((resolve) =>
        view.fit(extent, {
          padding:  [50, 50, 50, 50],
          duration: 1000,
          maxZoom:  15,
          easing:   (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
          callback: resolve,
        })
      );
  
      // ── 5. Fade-in ───────────────────────────────────────────────────────────
      let opacity = 0;
      const fadeInterval = setInterval(() => {
        opacity += 0.1;
        boundaryLayer.setOpacity(Math.min(opacity, 1));
        if (opacity >= 1) clearInterval(fadeInterval);
      }, 50);
  
      // ── 6. Dependent data ────────────────────────────────────────────────────
      await Promise.allSettled([
        fetchMWSLayer([]),
        applyDefaultMWSStyle(),   // synchronous but wrapped for uniformity
      ]);
  
    } catch (error) {
      // ── Differentiated recovery ──────────────────────────────────────────────
  
      if (error instanceof LayerLoadError) {
        console.error('[fetchBoundaryAndZoom] Layer load failed:', {
          layer:  error.layerName,
          type:   error.layerErrorType,
          status: error.httpStatus,
        });

        const locationLabel = `${districtName} › ${blockName}`;

        const isLayerMissing = error.layerErrorType === LAYER_ERROR_TYPES.FETCH_FAILED;
      
        toast.custom(
          (t) => (
            <div
              className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex`}
            >
              <div className="flex-1 w-0 p-4">
                <div className="flex items-start gap-3">
                  {/* Icon column */}
                  <div className={`mt-0.5 shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                    ${isLayerMissing ? 'bg-amber-100' : 'bg-red-100'}`}
                  >
                    {/* Inline SVG — no extra import needed */}
                    <svg
                      className={`w-4 h-4 ${isLayerMissing ? 'text-amber-600' : 'text-red-600'}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                      />
                    </svg>
                  </div>
      
                  {/* Text column */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {isLayerMissing
                        ? 'Map data not available'
                        : 'Failed to load map data'
                      }
                    </p>
                    <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                      {isLayerMissing
                        ? <>Map layers for <span className="font-medium text-gray-700">{locationLabel}</span> haven't been generated yet.</>
                        : <>Could not load layers for <span className="font-medium text-gray-700">{locationLabel}</span>. This may be a temporary server issue.</>
                      }
                    </p>
                    {/* Support email — always shown so users have an escalation path */}
                    <p className="mt-2 text-[11px] text-gray-400">
                      If this keeps happening, contact{' '}
                      <a
                        href={`mailto:support@core-stack.org?subject=Map%20layer%20missing%3A%20${encodeURIComponent(locationLabel)}&body=The%20map%20layer%20for%20${encodeURIComponent(locationLabel)}%20failed%20to%20load%20(${error.layerErrorType}).`}
                        className="text-indigo-500 hover:text-indigo-700 underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        support@core-stack.org
                      </a>
                    </p>
                  </div>
                </div>
              </div>
      
              {/* Action buttons */}
              <div className="flex flex-col border-l border-gray-200">
                {/* Retry — only useful for transient failures, not missing layers */}
                {!isLayerMissing && (
                  <button
                    type="button"
                    onClick={() => {
                      toast.dismiss(t.id);
                      fetchBoundaryAndZoom(districtName, blockName);
                    }}
                    className="flex-1 border-b border-gray-200 px-4 py-3 flex items-center justify-center text-xs font-semibold text-indigo-600 hover:text-indigo-500 hover:bg-indigo-50 transition-colors"
                  >
                    Retry
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => toast.dismiss(t.id)}
                  className="flex-1 px-4 py-3 flex items-center justify-center text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ),
          { duration: isLayerMissing ? 15000 : 10000, position: 'top-right' }
        );
      
        if (!zoomStarted) {
          resetMapToIndia();
        }
      } else {
        console.error("[fetchBoundaryAndZoom] Unexpected error:", error);
  
        toast.custom(
          (t) => (
            <div
              className={`${t.visible ? "animate-enter" : "animate-leave"} max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex`}
            >
              <div className="flex-1 w-0 p-4">
                <div className="flex items-start">
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      Something went wrong
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      The map couldn't load this location. Try selecting the
                      block again, or refresh if the problem persists.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex border-l border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    toast.dismiss(t.id);
                    // Retry the whole operation — user explicitly asked for it
                    fetchBoundaryAndZoom(districtName, blockName);
                  }}
                  className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none"
                >
                  Retry
                </button>
                <button
                  type="button"
                  onClick={() => {
                    toast.dismiss(t.id);
                    window.location.reload();
                  }}
                  className="border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-gray-500 hover:text-gray-400 focus:outline-none"
                >
                  Reload
                </button>
              </div>
            </div>
          ),
          { duration: 10000, position: "top-right" }
        );
  
        if (!zoomStarted) {
          resetMapToIndia();
        }
      }
  
    } finally {
      setIsLayerLoaded(false);
    }
  };
  
  // ── Helper: reset map to India overview ─────────────────────────────────────
  // Extracted so both catch branches can call it without duplication.
  function resetMapToIndia() {
    if (!mapRef.current) return;
    const view = mapRef.current.getView();
    view.cancelAnimations();
    view.animate({ center: INDIA_CENTER, zoom: INDIA_ZOOM, duration: 400 });
  }

  const fetchDataJson = async () => {
    if (!process.env.REACT_APP_API_URL) {
      console.error('[fetchDataJson] REACT_APP_API_URL is not set');
      return;
    }
  
    const endpoint =
      `${process.env.REACT_APP_API_URL}/download_kyl_data/` +
      `?state=${transformName(state.label)}` +
      `&district=${transformName(district.label)}` +
      `&block=${transformName(block.label)}` +
      `&file_type=json`;
  
    setDataJsonError(null);
    setIsLoading(true);
  
    try {
      let response;
      try {
        response = await fetch(endpoint);
      } catch (networkError) {
        // Console log for debugging — no emitLayerError, no toast.
        // The sidebar banner (FiltersDisabledBanner) is the single source
        // of truth for telling the user MWS data failed to load.
        console.error('[fetchDataJson] Network error:', networkError);
        setDataJson(null);
        setDataJsonError('network');
        return;
      }
  
      if (!response.ok) {
        const is404 = response.status === 404;
        console.error(`[fetchDataJson] HTTP ${response.status} from ${endpoint}`);
        setDataJson(null);
        setDataJsonError(is404 ? 'not_found' : 'network');
        return;
      }
  
      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        console.error('[fetchDataJson] Parse error:', parseError);
        setDataJson(null);
        setDataJsonError('parse');
        return;
      }
  
      setDataJsonError(null);
      setDataJson(result);
  
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVillageJson = async () => {
    if (!process.env.REACT_APP_API_URL) {
      console.error('[fetchVillageJson] REACT_APP_API_URL is not set');
      return;
    }
  
    const endpoint =
      `${process.env.REACT_APP_API_URL}/download_kyl_village_data` +
      `?state=${transformName(state.label)}` +
      `&district=${transformName(district.label)}` +
      `&block=${transformName(block.label)}` +
      `&file_type=json`;
  
    setVillageJsonError(null);
  
    let response;
    try {
      response = await fetch(endpoint);
    } catch (networkError) {
      // VillageFiltersBanner handles the message — no emitLayerError, no toast.
      console.error('[fetchVillageJson] Network error:', networkError);
      setVillageJson(null);
      setVillageJsonError('network');
      return;
    }
  
    if (!response.ok) {
      const is404 = response.status === 404;
      console.error(`[fetchVillageJson] HTTP ${response.status} from ${endpoint}`);
      setVillageJson(null);
      setVillageJsonError(is404 ? 'not_found' : 'network');
      return;
    }
  
    let result;
    try {
      result = await response.json();
    } catch (parseError) {
      console.error('[fetchVillageJson] Parse error:', parseError);
      setVillageJson(null);
      setVillageJsonError('parse');
      return;
    }
  
    setVillageJsonError(null);
    setVillageJson(result);
  };

  function watchForImageLoadError(layerName, onError, timeoutMs = 8000) {
    let settled = false;
  
    const unsubscribe = layerErrorBus.subscribe((payload) => {
      if (settled) return;
      if (
        payload.type      === LAYER_ERROR_TYPES.IMAGE_LOAD_ERROR &&
        payload.layerName === layerName
      ) {
        settled = true;
        unsubscribe();
        onError(payload);
      }
    });
  
    // Auto-cancel after timeout — prevents memory leaks if the layer loads fine
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        unsubscribe();
      }
    }, timeoutMs);
  
    // Return a cancel function for the success path
    return () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        unsubscribe();
      }
    };
  }

  const handleLayerSelection = async (filter) => {
    if (showConnectivityRef.current) {
      alert("Please turn off MWS Connectivity before using Visualize.");
      return;
    }
  
    setIsLayerSelecting(true);
    await new Promise(resolve => setTimeout(resolve, 0));
  
    const startTime = Date.now();

    const addedLayersThisCall = [];
  
    let coreLayersRemoved = false;
  
    try {
      let checkIfPresent = currentLayer.find((f) => f.name === filter.name);
      let checkIfInMap   = mapRef.current.getLayers().getArray();
      let existingLayer  = checkIfInMap.find((layer) => layer.ol_uid === boundaryLayerRef.current.ol_uid);
      let tempArr        = currentLayer;
      let len            = filter.layer_store.length;
  
      // ── BRANCH A: layer already on — toggle it off ──────────────────────────
      if (checkIfPresent) {
        checkIfPresent.layerRef.forEach((item) => mapRef.current.removeLayer(item));
        if (!existingLayer) mapRef.current.addLayer(boundaryLayerRef.current);
  
        tempArr = currentLayer.filter((item) => item.name !== filter.name);
        setToggleStates((prevStates) => ({ ...prevStates, [filter.name]: false }));
  
        const isWBVisualize =
          filter.name === "waterbody_type" ||
          filter.name === "waterbody_size" ||
          filter.name === "drainage_line" ||
          filter.name === "surface_water_trend";
  
        if (isWBVisualize) {
          setIsWBVisualizeOn(false);
          setActiveWBVisualize(null);
          if (mwsLayerRef.current) mwsLayerRef.current.setVisible(true);
        }
  
        boundaryLayerRef.current.updateStyleVariables({ isVisualizeOn: false });
        mwsLayerRef.current.updateStyleVariables({ isVisualizeOn: false });
        setShowMWS(true);
  
        if (waterbodiesLayerRef.current) {
          waterbodiesLayerRef.current.updateStyleVariables({
            isVisualizeOn: false,
            wbFilterActive: 1,
            visualizeMode: 0,
          });
          applyWaterbodyFilters(
            selectedMWS,
            filterSelections.selectedWaterbodyValues || {},
            false
          );
        }
  
      // ── BRANCH B: no layer on — add new layer ───────────────────────────────
      } else if (currentLayer.length === 0) {
        const isWBVisualize =
          filter.name === "waterbody_type" ||
          filter.name === "waterbody_size" ||
          filter.name === "drainage_line" ||
          filter.name === "surface_water_trend";
  
        if (isWBVisualize && !showWB) {
          toast.error("Please enable 'Show Waterbodies' to apply waterbody filters.");
          return;
        }
  
        // Remove core layers before the loop — track this so catch can restore
        mapRef.current.removeLayer(mwsLayerRef.current);
        mapRef.current.removeLayer(boundaryLayerRef.current);
        coreLayersRemoved = true;
  
        let layerRef = [];
  
        for (let i = 0; i < len; ++i) {
          let tempLayer;
  
          if (filter.layer_store[i] === "terrain") {
            tempLayer = await getImageLayer(
              filter.layer_store[i],
              `${transformName(district.label)}_${transformName(block.label)}_${filter.layer_name[i]}`,
              true, filter.rasterStyle
            );
            layerRef.push(tempLayer);
            mapRef.current.addLayer(tempLayer);
            addedLayersThisCall.push(tempLayer);

            const cancelWatch = watchForImageLoadError(
              `${transformName(district.label)}_${transformName(block.label)}_${filter.layer_name[i]}`,
              () => {
                // Remove the failed layer from the map
                try { mapRef.current.removeLayer(tempLayer); } catch (_) {}
          
                // Restore core layers if they were removed (they were, for this branch)
                try {
                  if (!mapRef.current.getLayers().getArray().includes(mwsLayerRef.current)) {
                    mapRef.current.addLayer(mwsLayerRef.current);
                  }
                  if (!mapRef.current.getLayers().getArray().includes(boundaryLayerRef.current)) {
                    mapRef.current.addLayer(boundaryLayerRef.current);
                  }
                  boundaryLayerRef.current.setZIndex(9999);
                  boundaryLayerRef.current.updateStyleVariables({ isVisualizeOn: false });
                  mwsLayerRef.current.updateStyleVariables({ isVisualizeOn: false });
                  setShowMWS(true);
                } catch (_) {}
          
                // Reset toggle and currentLayer so the user can retry
                setToggleStates(prev => ({ ...prev, [filter.name]: false }));
                setCurrentLayer(prev => prev.filter(l => l.name !== filter.name));
              }
            );
            layerRef._cancelImageWatch = cancelWatch;
          } else if (filter.layer_store[i] === "change_detection") {
            tempLayer = await getVectorLayers(
              `${filter.layer_store[i]}`,
              `change_vector_${transformName(district.label)}_${transformName(block.label)}_${filter.layer_name[i]}`
            );
  
          } else if (filter.layer_store[i] === "nrega_assets") {
            tempLayer = await getWebGlLayers(
              filter.layer_store[i],
              `${transformName(district.label)}_${transformName(block.label)}`,
              true, true, null, null,
              transformName(district.label), transformName(block.label)
            );
            layerRef.push(tempLayer);
            mapRef.current.addLayer(tempLayer);
            addedLayersThisCall.push(tempLayer);
  
          } else if (["lcw", "factory_csr", "mining"].includes(filter.layer_store[i])) {
            tempLayer = await getWebGlLayers(
              filter.layer_store[i],
              `${transformName(district.label)}_${transformName(block.label)}`,
              true, true, null, null,
              transformName(district.label), transformName(block.label)
            );
            layerRef.push(tempLayer);
            mapRef.current.addLayer(tempLayer);
            addedLayersThisCall.push(tempLayer);
  
          } else if (filter.layer_store[i] === "LULC") {
            tempLayer = await getImageLayer(
              `${filter.layer_store[i]}_${filter.layer_name[i]}`,
              `LULC_${lulcYear}_${transformName(district.label)}_${transformName(block.label)}_${filter.layer_name[i]}`,
              true, filter.rasterStyle
            );
            layerRef.push(tempLayer);
            mapRef.current.addLayer(tempLayer);
            addedLayersThisCall.push(tempLayer);
          
            watchForImageLoadError(
              `LULC_${lulcYear}_${transformName(district.label)}_${transformName(block.label)}_${filter.layer_name[i]}`,
              () => {
                try { mapRef.current.removeLayer(tempLayer); } catch (_) {}
                try {
                  if (!mapRef.current.getLayers().getArray().includes(mwsLayerRef.current)) {
                    mapRef.current.addLayer(mwsLayerRef.current);
                  }
                  if (!mapRef.current.getLayers().getArray().includes(boundaryLayerRef.current)) {
                    mapRef.current.addLayer(boundaryLayerRef.current);
                  }
                  boundaryLayerRef.current.setZIndex(9999);
                  boundaryLayerRef.current.updateStyleVariables({ isVisualizeOn: false });
                  mwsLayerRef.current.updateStyleVariables({ isVisualizeOn: false });
                  setShowMWS(true);
                } catch (_) {}
                setToggleStates(prev => ({ ...prev, [filter.name]: false }));
                setCurrentLayer(prev => prev.filter(l => l.name !== filter.name));
              }
            );
          } else if (
            filter.layer_store[i] === "drought" ||
            filter.layer_store[i] === "green_credit" ||
            filter.layer_store[i] === "terrain_lulc" ||
            filter.layer_store[i] === "river" ||
            filter.layer_store[i] === "canal"
          ) {
            tempLayer = await getVectorLayers(
              filter.layer_store[i],
              `${transformName(district.label)}_${transformName(block.label)}_${filter.layer_name[i]}`
            );
  
          } else if (filter.layer_store[i] === "panchayat_boundaries") {
            tempLayer = await getVectorLayers(
              filter.layer_store[i],
              `${transformName(district.label)}_${transformName(block.label)}`
            );
  
          } else if (filter.layer_store[i] === "restoration") {
            tempLayer = await getImageLayer(
              filter.layer_store[i],
              `${filter.layer_name[i]}_${transformName(district.label)}_${transformName(block.label)}_raster`,
              true, filter.rasterStyle
            );
            layerRef.push(tempLayer);
            mapRef.current.addLayer(tempLayer);
            addedLayersThisCall.push(tempLayer);
          
            watchForImageLoadError(
              `${filter.layer_name[i]}_${transformName(district.label)}_${transformName(block.label)}_raster`,
              () => {
                try { mapRef.current.removeLayer(tempLayer); } catch (_) {}
                try {
                  if (!mapRef.current.getLayers().getArray().includes(mwsLayerRef.current)) {
                    mapRef.current.addLayer(mwsLayerRef.current);
                  }
                  if (!mapRef.current.getLayers().getArray().includes(boundaryLayerRef.current)) {
                    mapRef.current.addLayer(boundaryLayerRef.current);
                  }
                  boundaryLayerRef.current.setZIndex(9999);
                  boundaryLayerRef.current.updateStyleVariables({ isVisualizeOn: false });
                  mwsLayerRef.current.updateStyleVariables({ isVisualizeOn: false });
                  setShowMWS(true);
                } catch (_) {}
                setToggleStates(prev => ({ ...prev, [filter.name]: false }));
                setCurrentLayer(prev => prev.filter(l => l.name !== filter.name));
              }
            );
          } else if (filter.name === "relative_mean_elevation") {
            const view = mapRef.current.getView();
  
            tempLayer = await getImageLayer(
              filter.layer_store[i],
              `${transformName(district.label)}_${transformName(block.label)}_${filter.layer_name[i]}`,
              true, filter.rasterStyle
            );
  
            const contourSource = new TileWMS({
              url: `${process.env.REACT_APP_GEOSERVER_URL}wms`,
              params: {
                LAYERS:      `${filter.layer_store[i]}:${transformName(district.label)}_${transformName(block.label)}_${filter.layer_name[i]}`,
                STYLES:      'dem_contours',
                TILED:       true,
                TRANSPARENT: true,
                FORMAT:      'image/png',
                ENV:         `interval:${getContourInterval(view.getResolution())}`,
              },
              serverType: 'geoserver',
            });
  
            const contourLayer = new TileLayer({ source: contourSource, opacity: 0.9, zIndex: 2 });
  
            layerRef.push(tempLayer);
            layerRef.push(contourLayer);
            mapRef.current.addLayer(tempLayer);
            mapRef.current.addLayer(contourLayer);
            addedLayersThisCall.push(tempLayer, contourLayer);
  
            let lastInterval = getContourInterval(view.getResolution());
            mapRef.current.on('moveend', () => {
              const interval = getContourInterval(view.getResolution());
              if (interval !== lastInterval) {
                lastInterval = interval;
                contourSource.updateParams({ ENV: `interval:${interval}` });
              }
            });
  
          } else {
            tempLayer = await getVectorLayers(
              filter.layer_store[i],
              `${filter.layer_name[i]}_${transformName(district.label)}_${transformName(block.label)}`
            );
          }
  
          // ── Post-loop: style + add to map for vector/unstyled layers ─────────
          if (filter.layer_store[i] === "river" || filter.layer_store[i] === "canal") {
            tempLayer.setStyle(new Style({
              stroke: new Stroke({ color: "rgba(0, 0, 255, 1)", width: 2.5 }),
            }));
            tempLayer.setZIndex(9998);
            layerRef.push(tempLayer);
            mapRef.current.addLayer(tempLayer);
            addedLayersThisCall.push(tempLayer);
  
          } else if (
            filter.layer_store[i] !== "terrain" &&
            filter.layer_store[i] !== "LULC" &&
            filter.layer_store[i] !== "restoration" &&
            filter.layer_store[i] !== "nrega_assets" &&
            filter.layer_store[i] !== "lcw" &&
            filter.layer_store[i] !== "factory_csr" &&
            filter.layer_store[i] !== "mining" &&
            filter.layer_store[i] !== "dem"
          ) {
            tempLayer.setStyle((feature) =>
              layerStyle(feature, filter.vectorStyle, filter.styleIdx, villageJson, dataJson)
            );
            tempLayer.setZIndex(10);
            layerRef.push(tempLayer);
            mapRef.current.addLayer(tempLayer);
            addedLayersThisCall.push(tempLayer);
          }
        }
  
        // ── Restore core layers above the new visualize layer ─────────────────
        boundaryLayerRef.current.updateStyleVariables({ isVisualizeOn: true });
        mwsLayerRef.current.updateStyleVariables({ isVisualizeOn: true });
  
        if (showConnectivityRef.current && topoLevelDataRef.current) {
          const { topoLevel, maxLevel } = topoLevelDataRef.current;
          applyTopoColorToMWS(topoLevel, maxLevel);
        }
  
        if (waterbodiesLayerRef.current) {
          const visualizeMode =
            filter.name === "waterbody_type"        ? 1 :
            filter.name === "waterbody_size"         ? 2 :
            filter.name === "surface_water_trend"    ? 3 :
            filter.name === "drainage_line"          ? 4 : 0;
  
          waterbodiesLayerRef.current.updateStyleVariables({
            isVisualizeOn: true,
            wbFilterActive: 0,
            visualizeMode,
          });
          applyWaterbodyFilters(selectedMWS, filterSelections.selectedWaterbodyValues || {}, true);
        }
  
        mapRef.current.removeLayer(mwsLayerRef.current);
        mapRef.current.removeLayer(boundaryLayerRef.current);
        mapRef.current.addLayer(mwsLayerRef.current);
        setShowMWS(false);
        mapRef.current.addLayer(boundaryLayerRef.current);
        boundaryLayerRef.current.setZIndex(9999);
        coreLayersRemoved = false;  // restored successfully
  
        tempArr = [...currentLayer, { name: filter.name, layerRef }];
        setToggleStates((prevStates) => ({ ...prevStates, [filter.name]: true }));
  
        if (isWBVisualize) {
          setIsWBVisualizeOn(true);
          setActiveWBVisualize(filter.name);
          if (mwsLayerRef.current) mwsLayerRef.current.setVisible(false);
        }
  
      // ── BRANCH C: another layer already on ─────────────────────────────────
      } else {
        toast.error("Please turn off the current layer before turning on a new one.");
        return;
      }
  
      setCurrentLayer(tempArr);
  
    } catch (error) {
      addedLayersThisCall.forEach((layer) => {
        try { mapRef.current.removeLayer(layer); } catch (_) {}
      });
  
      if (coreLayersRemoved) {
        try {
          // Add in correct z-order: mws below boundary
          if (mwsLayerRef.current)      mapRef.current.addLayer(mwsLayerRef.current);
          if (boundaryLayerRef.current) mapRef.current.addLayer(boundaryLayerRef.current);
          boundaryLayerRef.current.setZIndex(9999);
  
          // Reset visualize state flags that were set before the error
          boundaryLayerRef.current.updateStyleVariables({ isVisualizeOn: false });
          mwsLayerRef.current.updateStyleVariables({ isVisualizeOn: false });
          setShowMWS(true);
        } catch (restoreError) {
          console.error('[handleLayerSelection] Failed to restore core layers:', restoreError);
        }
      }
  
      // Reset the toggle state for this filter — it was never successfully added
      setToggleStates((prevStates) => ({ ...prevStates, [filter.name]: false }));

      console.error('[handleLayerSelection] Unexpected error adding layer:', {
        filter: filter.name,
        error,
      });
  
      toast.custom(
        (t) => (
          <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex`}>
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">
                    Layer failed to load
                  </p>
                  <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                    Could not add <span className="font-medium text-gray-700">{filter.name}</span> to the map.
                    Your existing map view has been restored.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col border-l border-gray-200">
              <button
                type="button"
                onClick={() => { toast.dismiss(t.id); handleLayerSelection(filter); }}
                className="flex-1 border-b border-gray-200 px-4 py-3 flex items-center justify-center text-xs font-semibold text-indigo-600 hover:text-indigo-500 hover:bg-indigo-50 transition-colors"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={() => toast.dismiss(t.id)}
                className="flex-1 px-4 py-3 flex items-center justify-center text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        ),
        { duration: 10000, position: 'top-right' }
      );
  
    } finally {
      const elapsed   = Date.now() - startTime;
      const remaining = Math.max(0, 400 - elapsed);
      await new Promise(resolve => setTimeout(resolve, remaining));
      setIsLayerSelecting(false);
    }
  };

  const initializeMap = () => {
    // Guard: element must be in the DOM
    if (!mapElement.current) return;
  
    const doInit = () => {
      // Don't double-initialise if a previous ResizeObserver callback already ran
      if (mapRef.current) return;
  
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
          const element = document.createElement('div');
          element.style.pointerEvents = 'none';
          element.style.position      = 'absolute';
          element.style.bottom        = '5px';
          element.style.left          = '5px';
          element.style.background    = '#f2f2f27f';
          element.style.fontSize      = '10px';
          element.style.padding       = '5px';
          element.innerHTML = '&copy; Google Satellite Hybrid contributors';
          super({ element });
        }
      }
  
      const map = new Map({
        target: mapElement.current,
        layers: [baseLayer],
        controls: defaultControls().extend([new GoogleLogoControl()]),
        view: new View({
          center: [78.9, 23.6],
          zoom: 5,
          projection: 'EPSG:4326',
          constrainResolution: true,
          smoothExtentConstraint: true,
          smoothResolutionConstraint: true,
        }),
        loadTilesWhileAnimating: true,
        loadTilesWhileInteracting: true,
      });
  
      mapRef.current = map;
    };
  
    const { offsetWidth, offsetHeight } = mapElement.current;
  
    if (offsetWidth > 0 && offsetHeight > 0) {
      // Container already has dimensions (e.g. hot-reload, subsequent renders)
      doInit();
      return;
    }
  
    // Container is 0×0 — wait for the first layout pass that gives it size
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          observer.disconnect();
          doInit();
          break;
        }
      }
    });
  
    observer.observe(mapElement.current);
    return () => observer.disconnect();
  };

  const handleItemSelect = (setter, value) => {
    setter(value);
    if (setter === setState) { setDistrict(null); setBlock(null); }
    else if (setter === setDistrict) { setBlock(null); }
  };

  const handlePatternRemoval = (pattern) => {
    const key = pattern.patternName || pattern.name;
    if (pattern.level) {
      setPatternSelections((prev) => ({
        ...prev,
        selectedVillagePatterns: { ...prev.selectedVillagePatterns, [key]: null },
      }));
    } else {
      setPatternSelections((prev) => ({
        ...prev,
        selectedMWSPatterns: { ...prev.selectedMWSPatterns, [key]: null },
      }));
    }
  };

  const resetAllStates = () => {
    if (currentLayer.length > 0 && mapRef.current) {
      currentLayer.forEach((layer) => {
        layer.layerRef.forEach((ref) => mapRef.current.removeLayer(ref));
      });
    }
    setDataJsonError(null);
    setVillageJsonError(null);
    setCurrentLayer([]);
    setToggleStates({});
    setFilterSelections({
      selectedMWSValues: {},
      selectedVillageValues: {},
      selectedWaterbodyValues: {},
    });
    setPatternSelections({ selectedMWSPatterns: {}, selectedVillagePatterns: {} });
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
    if (mwsLayerRef.current) fetchMWSLayer([]);
    setSidebarResetKey(prev => prev + 1);
    setSelectedWaterbodyIds(new Set([]));
    setSelectedWaterbodyData([]); 
  };

  const searchUserLatLong = async () => {
    setIsLoading(true);
    try {
      let response = await fetch(
        `${process.env.REACT_APP_API_URL}/get_mwsid_by_latlon/?latitude=${searchLatLong[0]}&longitude=${searchLatLong[1]}`,
        { method: "GET", headers: { "Content-Type": "application/json", "X-API-Key": `${process.env.REACT_APP_API_KEY}` } }
      );
      response = await response.json();

      const matchedState = statesData.find(
        (s) => s.label.trim().toLowerCase() === response.State.toLowerCase()
      );
      const matchedDistrict = matchedState.district.find(
        (s) => s.label.trim().toLowerCase() === response.District.toLowerCase()
      );
      const matchedTehsil = matchedDistrict.blocks.find(
        (s) => s.label.trim().toLowerCase() === response.Tehsil.toLowerCase()
      );

      setState(matchedState);
      setDistrict(matchedDistrict);
      setBlock(matchedTehsil);
      setHighlightMWS(response.mws_id);
    } catch (err) {
      console.log(err);
      toast.custom(
        (t) => (
          <div className={`${t.visible ? "animate-enter" : "animate-leave"} max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex`}>
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-900">Location Request</p>
                  <p className="mt-1 text-sm text-gray-500">
                    We have not generated maps for this location as yet. Would you like to submit a request?
                  </p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-gray-200">
              <button
                onClick={() => { window.open("https://forms.gle/qBkYmmU7AhyKnc4N9", "_blank"); toast.dismiss(t.id); }}
                className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-blue-600 hover:text-blue-500 focus:outline-none"
              >
                Submit Request
              </button>
            </div>
          </div>
        ),
        { duration: 5000, position: "top-right" }
      );
      setIsLoading(false);
    }
  };

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

      const wbFeature = map.forEachFeatureAtPixel(
        event.pixel,
        (feature, layer) => { if (layer === waterbodiesLayerRef.current) return feature; },
        { hitTolerance: 8 }
      );

      if (!wbFeature) { setSelectedWaterbodyProfile(null); return; }

      waterbodyClickedRef.current = true;
      setTimeout(() => (waterbodyClickedRef.current = false), 150);

      const props = wbFeature.getProperties();
      const wb_id = props?.UID;
      if (!wb_id) return;

      const geojson = new GeoJSON();
      const fullFeature = {
        type: "Feature",
        properties: props,
        geometry: geojson.writeGeometryObject(wbFeature.getGeometry()),
      };

      setSelectedWaterbodyForTehsil(fullFeature);
      localStorage.setItem("selectedWaterbody", JSON.stringify(fullFeature));

      setSelectedWaterbodyProfile({
        id: wb_id,
        dashboardUrl: `/rwb?type=tehsil&state=${state.label}&district=${district.label}&block=${block.label}&waterbody=${wb_id}`,
        properties: props,
        geometry: geojson.writeGeometryObject(wbFeature.getGeometry()),
      });

      let matchedMws = [];
      if (mwsLayerRef.current && wbFeature) {
        const raw = props.MWS_UID || props.mws_uid;
        if (raw) {
          const uidList = raw.split("_").reduce((acc, val, idx, arr) => {
            if (idx % 2 === 0 && arr[idx + 1]) acc.push(`${val}_${arr[idx + 1]}`);
            return acc;
          }, []);

          const allMws = mwsLayerRef.current.getSource().getFeatures();
          matchedMws = allMws.filter((f) => uidList.includes(f.get("uid")?.toString().trim()));
        }
      }

      if (matchedMws.length > 0) {
        const geojsonWriter = new GeoJSON();
        localStorage.setItem(
          "matched_mws_features",
          JSON.stringify(matchedMws.map((m) =>
            geojsonWriter.writeFeatureObject(m, { dataProjection: "EPSG:4326", featureProjection: "EPSG:4326" })
          ))
        );
      } else {
        console.warn("⚠️ No matching MWS found for clicked WB");
      }
    };

    map.on("click", handleWaterbodyClick);
    return () => map.un("click", handleWaterbodyClick);
  }, [mapRef.current, state, district, block]);

  // useEffect(() => {
  //   if (!mapRef.current) return;

  //   const handleMapClick = (event) => {
  //     const feature = mapRef.current.forEachFeatureAtPixel(
  //       event.pixel,
  //       (feature, layer) => { if (layer === mwsLayerRef.current) return feature; }
  //     );
  //     if (feature) {
  //       setHighlightMWS(feature.get("uid"));
  //       setSelectedMWSProfile(feature.getProperties());
  //       if (toastId) { toast.dismiss(toastId); setToastId(null); }
  //     }
  //   };

  //   mapRef.current.on("click", handleMapClick);
  //   return () => { if (mapRef.current) mapRef.current.un("click", handleMapClick); };
  // }, [mapRef.current, selectedMWS]);

const updateSelectedMWSStyle = (selectedIds) => {
  if (!mwsLayerRef.current) return;

  const features = mwsLayerRef.current.getSource().getFeatures();

  features.forEach((feature) => {
    const uid = feature.get("uid");

    feature.set(
      "isSelected",
      selectedIds.includes(uid) ? 1 : 0,
      true
    );
    console.log(
  uid,
  feature.get("isSelected")
);
  });

  mwsLayerRef.current.getSource().changed();
  // applyDefaultMWSStyle();
};

useEffect(() => {
  if (!mapRef.current) return;

  const handleMapClick = (event) => {
    console.log("Map clicked");
    const feature = mapRef.current.forEachFeatureAtPixel(
      event.pixel,
      (feature, layer) => {
        if (layer === mwsLayerRef.current) return feature;
      }
    );

    if (!feature) return;

    const uid = feature.get("uid");

    if (selectionMode === "single") {
      // Existing behaviour
      setHighlightMWS(uid);
      updateSelectedMWSStyle([uid]);
      setSelectedMWS([uid]);
      setSelectedMWSProfile(feature.getProperties());
    } else {
      // Multi-select
    setSelectedMWS((prev) => {
      let updated;

      if (selectionMode === "single") {
        updated = [uid];
      } else {
        if (prev.includes(uid)) {
          updated = prev.filter((id) => id !== uid);
        } else {
          updated = [...prev, uid];
        }
      }

  updateSelectedMWSStyle(updated);

  console.log("Selected MWS:", updated);

  return updated;
});

      // Temporary: keep last clicked highlighted
      setHighlightMWS(uid);

      setSelectedMWSProfile(feature.getProperties());
    }

    if (toastId) {
      toast.dismiss(toastId);
      setToastId(null);
    }
  };

  mapRef.current.on("click", handleMapClick);

  return () => {
    if (mapRef.current) {
      mapRef.current.un("click", handleMapClick);
    }
  };
}, [selectionMode, toastId,mapRef.current, selectedMWS]);
  
  useEffect(() => {
    if (mapRef.current && waterbodiesLayerRef.current) {
      mapRef.current.removeLayer(waterbodiesLayerRef.current);
      waterbodiesLayerRef.current = null;
    }
    setShowWB(false);
    setSelectedWaterbodyProfile(null);
    localStorage.removeItem("selectedWaterbody");
    localStorage.removeItem("matched_mws_feature");
  }, [state, district, block]);

  useEffect(() => {
    if (mwsLayerRef.current) mwsLayerRef.current.setVisible(showMWS);
    if (boundaryLayerRef.current) boundaryLayerRef.current.setVisible(showVillages);
  }, [showMWS, showVillages]);

  useEffect(() => {
    if (statesData === null) getStates().then((data) => setStatesData(data));
  }, [statesData, setStatesData]);

  useEffect(() => {
    initializeAnalytics();
    trackPageView('/kyl_dashboard');
  
    if (!mapRef.current) {
      const cleanup = initializeMap();
      // If initializeMap returned a ResizeObserver cleanup, use it
      return () => {
        cleanup?.();
        if (mapRef.current) mapRef.current.getView().cancelAnimations();
      };
    }
  
    if (district && block) {
      try {
        const view = mapRef.current.getView();
        view.cancelAnimations();
        fetchBoundaryAndZoom(district.label, block.label);
        fetchDataJson();
        fetchVillageJson();
        setToggleStates({});
        setCurrentLayer([]);
        fetchWaterBodiesLayer();
        fetchMWSConnectivityLayers();
      } catch (err) {
        toast.custom(
          (t) => (
            <div className={`${t.visible ? "animate-enter" : "animate-leave"} max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex`}>
              <div className="flex-1 w-0 p-4">
                <div className="flex items-start">
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-gray-900">Network Error !</p>
                    <p className="mt-1 text-sm text-gray-500">Not able to load data , Please Refresh the Page !</p>
                  </div>
                </div>
              </div>
              <div className="flex border-l border-gray-200">
                <button
                  type="button"
                  onClick={() => { toast.dismiss(t.id); window.location.reload(); }}
                  className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-blue-600 hover:text-blue-500 focus:outline-none"
                >
                  Reload
                </button>
              </div>
            </div>
          ),
          { duration: 10000, position: "top-right" }
        );
      }
    }
  
    return () => {
      if (mapRef.current) mapRef.current.getView().cancelAnimations();
    };
  }, [block, mapRef.current]);

  useEffect(() => {
    const fetchUpdateLulc = async () => {
      if (currentLayer !== null) {
        let tempArr = currentLayer;
        for (let i = 0; i < tempArr.length; ++i) {
          if (tempArr[i].name === "avg_double_cropped" || tempArr[i].name === "lulc_crop_percent" || tempArr[i].name === "lulc_forest_percent" || tempArr[i].name === "lulc_shrub_percent") {
            mapRef.current.removeLayer(tempArr[i].layerRef[0]);
            const tempLayer = await getImageLayer(
              `LULC_level_3`,
              `LULC_${lulcYear}_${transformName(district.label)}_${transformName(block.label)}_level_3`,
              true,
              "lulc_land_use_KYL"
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
    if (searchLatLong !== null) searchUserLatLong();
  }, [searchLatLong]);

  // ============================================
  // 1. PROCESS MWS FILTERS
  // ============================================
  useEffect(() => {
    try {
      if (!dataJson || !Array.isArray(dataJson) || !dataJsonIndex) return;

      const mwsFilterKeys = Object.keys(filterSelections.selectedMWSValues || {});
      const activeKeys = mwsFilterKeys.filter(k => filterSelections.selectedMWSValues[k]);

      if (activeKeys.length === 0) {
        setSelectedMWS([]);
        setHasFilters(false);
        applyDefaultMWSStyle()
        const source = mwsLayerRef.current?.getSource();
        if (source) {
          source.getFeatures().forEach((f) => {
            f.unset("isFiltered");
            f.unset("hasFilters");
          });
          source.changed();
        }
        return;
      }

      let resultSet = null; // null = not yet restricted

      activeKeys.forEach(filterName => {
        const filterValues = filterSelections.selectedMWSValues[filterName];
        if (!filterValues) return;

        const filter = getAllFilters().find(f => f.name === filterName);
        const matchedIds = new Set();

        filterValues.forEach(selectedOption => {
          if (filter?.type === 2) {
            // Range filter — linear scan but only once per field
            dataJson.forEach(item => {
              if (!item?.mws_id) return;
              const value = Number(item[filterName]);
              if (!isNaN(value) && value >= selectedOption.value.lower && value <= selectedOption.value.upper) {
                matchedIds.add(item.mws_id);
              }
            });
          } else {
            // Exact match — O(1) via pre-built fieldIndex
            const key = String(selectedOption.value);
            const indexedSet = dataJsonIndex.fieldIndex[filterName]?.[key];
            if (indexedSet) indexedSet.forEach(id => matchedIds.add(id));
          }
        });

        // AND across filter names
        if (resultSet === null) {
          resultSet = matchedIds;
        } else {
          resultSet.forEach(id => { if (!matchedIds.has(id)) resultSet.delete(id); });
        }
      });

      const resultMWS = resultSet ? [...resultSet] : [];
      setSelectedMWS(resultMWS);
      setHasFilters(resultMWS.length > 0);
      updateFilteredMWS(resultMWS);

      // Village derivation — O(selectedMWS) via mwsToVillages map, no dataJson loop
      const villages = new Set();
      resultMWS.forEach(mwsId => {
        (dataJsonIndex.mwsToVillages.get(mwsId) || []).forEach(v => villages.add(v));
      });
      setVillageIdList(villages);

    } catch (error) {
      console.error("Error in MWS filter processing:", error);
    }
  }, [filterSelections.selectedMWSValues, dataJson, dataJsonIndex]);


  // ============================================
  // 2. PROCESS MWS PATTERNS
  // ============================================
  useEffect(() => {
    try {
      if (!dataJson || !Array.isArray(dataJson)) return;

      const mwsPatternKeys = Object.keys(patternSelections.selectedMWSPatterns || {});
      const mwsFilterKeys = Object.keys(filterSelections.selectedMWSValues || {});
      const hasMwsFilters = mwsFilterKeys.some(key => filterSelections.selectedMWSValues[key] !== null);
      const hasMwsPatterns = mwsPatternKeys.some(key => patternSelections.selectedMWSPatterns[key] !== null);

      if (!hasMwsPatterns) {
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
            if (resultMWS.length > 0) resultMWS = resultMWS.filter((id) => tempArr.includes(id));
            else resultMWS = tempArr;
          });
          setSelectedMWS(resultMWS);
          updateFilteredMWS(resultMWS);
          return;
        } else {
          setSelectedMWS([]);
          const source = mwsLayerRef.current?.getSource();
          if (source) { source.getFeatures().forEach((f) => f.unset("isFiltered")); source.changed(); }
          return;
        }
      }

      let resultMWS = new Set();
      mwsPatternKeys.forEach((patternName) => {
        const pattern = patternSelections.selectedMWSPatterns[patternName];
        if (!pattern) return;
        let patternMatches = new Set();
        pattern.conditions.forEach((condition) => {
          dataJson.forEach((item) => {
            let matches = false;
            if (condition.type === 1 && item[condition.key] === condition.value) matches = true;
            else if (condition.type === 2 && item[condition.key] >= condition.value.lower && item[condition.key] <= condition.value.upper) matches = true;
            else if (condition.type === 3 && item[condition.key] != condition.value) matches = true;
            if (matches) patternMatches.add(item.mws_id);
          });
        });
        if (resultMWS.size > 0) resultMWS = new Set([...resultMWS].filter((x) => patternMatches.has(x)));
        else resultMWS = patternMatches;
      });

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
                if (!isNaN(value) && value >= selectedOption.value.lower && value <= selectedOption.value.upper) {
                  if (!tempArr.includes(item.mws_id)) tempArr.push(item.mws_id);
                }
              } else {
                if (item[filterName] === selectedOption.value && !tempArr.includes(item.mws_id)) tempArr.push(item.mws_id);
              }
            });
          });
          if (filterResults.length > 0) filterResults = filterResults.filter((id) => tempArr.includes(id));
          else filterResults = tempArr;
        });

        const finalMWS = [...resultMWS].filter((id) => filterResults.includes(id));
        setSelectedMWS(finalMWS);
        updateFilteredMWS(finalMWS);
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
        updateFilteredMWS(finalMWS);
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
        key => filterSelections.selectedVillageValues[key] !== null
      );

      if (!hasVillageFilters) {
        setPatternVillageList(new Set());
        return;
      }

      const candidateVillages = new Set();
      if (selectedMWS.length > 0) {
        dataJson.forEach(mwsItem => {
          if (selectedMWS.includes(mwsItem.mws_id) && Array.isArray(mwsItem.mws_intersect_villages)) {
            mwsItem.mws_intersect_villages.forEach(villageId => candidateVillages.add(villageId));
          }
        });
      }

      let resultVillages = new Set();

      villageFilterKeys.forEach(filterName => {
        const filterValues = filterSelections.selectedVillageValues[filterName];
        if (!filterValues) return;

        const tempArr = new Set();
        filterValues.forEach(selectedOption => {
          villageJson.forEach(village => {
            if (village && typeof village[filterName] !== 'undefined' && village.village_id) {
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
        key => patternSelections.selectedVillagePatterns[key] !== null
      );
      const hasVillageFilters = villageFilterKeys.some(
        key => filterSelections.selectedVillageValues[key] !== null
      );

      if (!hasVillagePatterns && !hasVillageFilters) {
        const mwsFilterKeys = Object.keys(filterSelections.selectedMWSValues || {});
        const hasMwsFilters = mwsFilterKeys.some(k => filterSelections.selectedMWSValues[k] !== null);
        const mwsPatternKeys = Object.keys(patternSelections.selectedMWSPatterns || {});
        const hasMwsPatterns = mwsPatternKeys.some(k => patternSelections.selectedMWSPatterns[k] !== null);

        if (!hasMwsFilters && !hasMwsPatterns) {
          // No selections at any level — clear villages
          setVillageIdList(new Set());
        }
        // If MWS filters/patterns are active, leave villageIdList alone —
        // Effect 1 already derived and set the correct villages from selectedMWS
        return;
      }

      if (!hasVillagePatterns && hasVillageFilters) {
        setVillageIdList(patternVillageList);
        return;
      }

      let resultVillages = new Set();

      villagePatternKeys.forEach(patternName => {
        const pattern = patternSelections.selectedVillagePatterns[patternName];
        if (!pattern) return;

        const patternMatches = new Set();

        pattern.conditions.forEach(condition => {
          villageJson.forEach(village => {
            let matches = false;
            if (condition.type === 1 && village[condition.key] === condition.value) matches = true;
            else if (condition.type === 2 && village[condition.key] >= condition.value.lower && village[condition.key] <= condition.value.upper) matches = true;
            else if (condition.type === 3 && village[condition.key] != condition.value) matches = true;
            if (matches) patternMatches.add(village.village_id);
          });
        });

        if (resultVillages.size > 0) {
          resultVillages = new Set([...resultVillages].filter(x => patternMatches.has(x)));
        } else {
          resultVillages = patternMatches;
        }
      });

      const candidateVillages = new Set();
      if (selectedMWS.length > 0) {
        dataJson.forEach(mwsItem => {
          if (selectedMWS.includes(mwsItem.mws_id) && Array.isArray(mwsItem.mws_intersect_villages)) {
            mwsItem.mws_intersect_villages.forEach(villageId => candidateVillages.add(villageId));
          }
        });
      }

      if (candidateVillages.size > 0) {
        resultVillages = new Set([...resultVillages].filter(id => candidateVillages.has(id)));
      }

      if (hasVillageFilters && patternVillageList.size > 0) {
        resultVillages = new Set([...resultVillages].filter(id => patternVillageList.has(id)));
      }

      setVillageIdList(resultVillages);
    } catch (error) {
      console.error("Error in village pattern processing:", error);
    }
  }, [
    patternSelections.selectedVillagePatterns,
    filterSelections.selectedVillageValues,  // restored — production includes this
    patternVillageList,
    selectedMWS,
    dataJson,
    villageJson,
  ]);


  // ============================================
  // 5. SYNC villageIdList → Admin boundary layer
  // ============================================
  useEffect(() => {
    fetchAdminLayer([...villageIdList]);
    setFinalVillageList(villageIdList);
  }, [villageIdList]);

  useEffect(() => {
    if (!dataJsonIndex) return;

    const hasActiveWBFilters = Object.keys(filterSelections.selectedWaterbodyValues || {})
      .some(k => filterSelections.selectedWaterbodyValues[k] !== null);
    if (hasActiveWBFilters) return;

    if (selectedMWS.length === 0) {
      setSelectedWaterbodyIds(new Set());
      return;
    }

    const ids = new Set();
    selectedMWS.forEach(mwsId => {
      (dataJsonIndex.mwsToSWBIds.get(mwsId) || []).forEach(id => ids.add(id));
    });
    setSelectedWaterbodyIds(ids);

  }, [selectedMWS, filterSelections.selectedWaterbodyValues, dataJsonIndex]);

  useEffect(() => {
    if (!showWB || !waterbodiesLayerRef.current) return;
    applyWaterbodyFilters(
      selectedMWS,
      filterSelections.selectedWaterbodyValues || {},
      isWBVisualizeOn
    );
  }, [selectedMWS, filterSelections.selectedWaterbodyValues, showWB, isWBVisualizeOn]);


  useEffect(() => {
    const loadingDone  = !islayerLoaded && !isLoading;
    const locationSet  = Boolean(district && block);
    const dataReady    = Boolean(dataJson && Array.isArray(dataJson));
    const dataFailed   = dataJsonError !== null;
  
    setFiltersEnabled(loadingDone && locationSet && dataReady && !dataFailed);
  
  }, [islayerLoaded, isLoading, district, block, dataJson, dataJsonError]);


  useEffect(() => {
    if (district && block) resetAllStates();
  }, [district, block]);


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
          filtersDisabledReason={
            dataJsonError === 'not_found' ? 'No MWS data available for this block.' :
            dataJsonError === 'network'   ? 'MWS data failed to load — use Retry in the error notification.' :
            dataJsonError === 'parse'     ? 'MWS data response was malformed — try refreshing.' :
            islayerLoaded                 ? 'Map is still loading...' :
            null
          }
          villageFiltersDisabledReason={
            villageJsonError === 'not_found' ? 'No village data for this block.' :
            villageJsonError === 'network'   ? 'Village data failed to load — use Retry.' :
            villageJsonError === 'parse'     ? 'Village data response was malformed.' :
            null
          }
          getFormattedSelectedFilters={getFormattedSelectedFilters}
          getAllPatternTypes={getAllPatternTypes}
          handlePatternRemoval={handlePatternRemoval}
          getSubcategoriesForCategory={getSubcategoriesForCategory}
          getPatternsForSubcategory={getPatternsForSubcategory}
          patternSelections={patternSelections}
          handlePatternSelection={handlePatternSelection}
          isPatternSelected={isPatternSelected}
          isLayerSelecting={isLayerSelecting}
          showConnectivityRef={showConnectivityRef}
        />

        {/* Map Container */}
        <div className="relative flex-1 h-full flex flex-col">
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
            setSearchLatLong={setSearchLatLong}
            showConnectivity={showConnectivity}
          selectionMode={selectionMode}
          setSelectionMode={setSelectionMode}
          />
          <LayerErrorToast
            errors={layerErrors}
            onDismiss={dismissLayerError}
            onRetry={retryLayerError}
          />
        </div>

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
          mwsConnectivityLayerRef={mwsConnectivityLayerRef}
          showConnectivity={showConnectivity}
          setShowConnectivity={setShowConnectivity}
          mwsArrowLayerRef={mwsArrowLayerRef}
          dataJson={dataJson}
          selectedWaterbodyIds={selectedWaterbodyIds}
          selectedWaterbodyData={selectedWaterbodyData}
          mwsDrainageLayerRef={mwsDrainageLayerRef}
          villageJson={villageJson}
          isLoading={isLoading}
          mwsLayerRef={mwsLayerRef}
           selectionMode={selectionMode}
          setSelectionMode={setSelectionMode}

        />
      </div>
    </div>
  );
};

export default KYLDashboardPage;