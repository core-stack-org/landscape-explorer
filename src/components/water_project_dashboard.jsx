import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRecoilValue ,useRecoilState} from "recoil";
import GeoJSON from "ol/format/GeoJSON";
import PrecipitationStackChart from "./PrecipitationStackChart.jsx";
import CroppingIntensityStackChart from "./CroppingIntensityStackChart.jsx";
import { yearAtomFamily } from "../store/locationStore";
import NDVIChart from "./NDVIChart.jsx";
import WaterAvailabilityChart from "./WaterAvailabilityChart";
import { useLocation, useNavigate } from "react-router-dom";
import DroughtChart from "./droughtchart.jsx";
import TableView from "./tableView.jsx";
import { WATER_DASHBOARD_CONFIG } from "../config/dashboard_configs/waterDashboard.config.js";
import { Lightbulb } from "lucide-react";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import TableRowsIcon from "@mui/icons-material/TableRows";
import PublicIcon from "@mui/icons-material/Public";
import CircularProgress from "@mui/material/CircularProgress";
import DashboardBasemap from "./dashboard_basemap.jsx";
import { useGlobalWaterData } from "../store/useGlobalWaterData";
import { getWaterbodyData } from "../actions/getWaterbodyData";
import {getRainfallByYear,calculateImpactYear} from "../components/utils/impactYear.js";
import { waterGeoDataAtom, waterMwsDataAtom, zoiFeaturesAtom,selectedWaterbodyForTehsilAtom,tehsilZoiFeaturesAtom,tehsilDroughtDataAtom } from "../store/locationStore.jsx";

const WaterProjectDashboard = () => {
  const [selectedWaterbody, setSelectedWaterbody] = useState(null);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [infoAnchor, setInfoAnchor] = useState(null);
  const [impactYear, setImpactYear] = useState({ pre: null, post: null });
  const [autoOpened, setAutoOpened] = useState(false);
  const [showMap, setShowMap] = useState(false);  
  const [tehsilMap, setTehsilMap] = useState(null);
  const lulcYear1 = useRecoilValue(yearAtomFamily("map1"));
  const lulcYear2 = useRecoilValue(yearAtomFamily("map2"));
  const [waterbodySearch, setWaterbodySearch] = useState("");
  const [organization, setOrganization] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [tehsilGeoData, setTehsilGeoData] = useState(null);
  const [mwsFromLocalStorage, setMwsFromLocalStorage] = useState(null);
  const [extractedSeasonalYears, setExtractedSeasonalYears] = useState([]);
  const [timeoutReached, setTimeoutReached] = useState(false);
  const [selectedWaterbodyForTehsil, setSelectedWaterbodyForTehsil] = useRecoilState(selectedWaterbodyForTehsilAtom);
  const tehsilDrought = useRecoilValue(tehsilDroughtDataAtom);
  const location = useLocation();
  const navigate = useNavigate();
  let tempGeoData =  useRecoilValue(waterGeoDataAtom);
    // Extract URL parameters 
    const params = new URLSearchParams(location.search);

    const projectIdParam = params.get("projectId");
    const projectNameParam = params.get("project_name");
    const typeParam = params.get("type");

    const mode = typeParam === "project" ? "project" : "tehsil";
  
    const stateParam = params.get("state");
    const districtParam = params.get("district");
    const blockParam = params.get("block");
  
    const waterbodyParam = params.get("waterbody");
    const isTehsilMode = typeParam === "tehsil";
    const geoData = isTehsilMode ? selectedWaterbodyForTehsil : tempGeoData
    const mwsGeoData = useRecoilValue(waterMwsDataAtom);
    const projectZoi = useRecoilValue(zoiFeaturesAtom);
    const tehsilZoi = useRecoilValue(tehsilZoiFeaturesAtom);
    const zoiFeatures = isTehsilMode ? tehsilZoi : projectZoi;
    const activeSelectedWaterbody = isTehsilMode ? selectedWaterbodyForTehsil : selectedWaterbody;

    const [view, setView] = useState(
      isTehsilMode ? "map" : typeParam === "tehsil" ? "map" : "table"
    );

  useGlobalWaterData({
    type: typeParam,
    projectName: projectNameParam,
    projectId: projectIdParam,
    state: stateParam,
    district: districtParam,
    block: blockParam,
  });

  const handleCloseInfo = () => {
    setInfoAnchor(null);
  };

  useEffect(() => {
    const stored = localStorage.getItem("selectedWaterbody");
    if (stored) {
      const parsed = JSON.parse(stored);
      setSelectedWaterbodyForTehsil(parsed);
    }
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem("matched_mws_features");
    if (!raw) return;
    const parsed = JSON.parse(raw);
    setMwsFromLocalStorage(
      Array.isArray(parsed) ? parsed : [parsed]
    );  }, []);

    useEffect(() => {
      if (typeParam === "tehsil") {
        setShowMap(true);
      }
    }, [typeParam]);

    useEffect(() => {
      if (!isTehsilMode) return;
      if (!tehsilMap) return;
      if (!districtParam || !blockParam) return;
    
      if (mwsFromLocalStorage?.length && selectedWaterbodyForTehsil) return;
    
    
      const fetchTehsilData = async () => {
        const result = await getWaterbodyData({
          district: { label: districtParam },
          block: { label: blockParam },
          map: tehsilMap,
          waterbodyUID: waterbodyParam,
        });
    
        if (result?.waterbody?.geojson) {
          setSelectedWaterbodyForTehsil(result.waterbody.geojson);
          localStorage.setItem("selectedWaterbody", JSON.stringify(result.waterbody.geojson));
        }
    
        if (Array.isArray(result?.mws) && result.mws.length) {
          const allGeo = result.mws.map(o => o.geojson);
          setMwsFromLocalStorage(allGeo);
          localStorage.setItem("matched_mws_features", JSON.stringify(allGeo));
        }
      };
      fetchTehsilData();
    }, [
      isTehsilMode,
      tehsilMap,
      districtParam,
      blockParam,
      waterbodyParam,
    ]);
    
  const matchedMwsOlFeatures = useMemo(() => {
    if (!mwsFromLocalStorage?.length) return [];
    const reader = new GeoJSON();
    return mwsFromLocalStorage.map(f =>
      reader.readFeature(f, {
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:4326",
      })
    );
  }, [mwsFromLocalStorage]);
  
  
  useEffect(() => {
    if (typeParam === "tehsil" && selectedWaterbodyForTehsil?.geometry) {
        
      // 1) create a FeatureCollection with only 1 feature  
      const fc = {
        type: "FeatureCollection",
        features: [selectedWaterbodyForTehsil],
      };

      setTehsilGeoData(fc);

      // 2) Convert to OL Feature
      const featureOL = new GeoJSON().readFeature(
        selectedWaterbodyForTehsil,
        {
          dataProjection: "EPSG:4326",
          featureProjection: "EPSG:4326",
        }
      );

    }
  }, [selectedWaterbodyForTehsil, typeParam]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (infoAnchor instanceof HTMLElement && !infoAnchor.contains(e.target)) {
        handleCloseInfo();
      }
    };

    window.addEventListener("click", handleClickOutside);
    window.addEventListener("scroll", handleCloseInfo);
    return () => {
      window.removeEventListener("click", handleClickOutside);
      window.removeEventListener("scroll", handleCloseInfo);
    };
  }, [infoAnchor]);

  useEffect(() => {
    if (view === "table") {
      setSelectedWaterbody(null);
      setSelectedFeature(null);
    }
  }, [view]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
  
    // agar waterbody param nahi hai
    if (!params.get("waterbody")) {
      setShowMap(false);
      setSelectedWaterbody(null);
      setSelectedFeature(null);
  
      // tehsil cleanup
      setSelectedWaterbodyForTehsil(null);
      setExtractedSeasonalYears([]);
    }
  }, [location.search]);

  useEffect(() => {
    if (!loadingData) return;
  
    const t = setTimeout(() => {
      setTimeoutReached(true);
      setLoadingData(false);   // loader off
    }, 10000); // 10 seconds
  
    return () => clearTimeout(t);
  }, [loadingData]);
  
  const extractMwsUidList = (mwsUidString) => {
    if (!mwsUidString) return [];

    return mwsUidString
      .split("_")
      .reduce((acc, val, idx, arr) => {
        // join pairs: 12 + 33823 → 12_33823
        if (idx % 2 === 0 && arr[idx + 1]) {
          acc.push(`${val}_${arr[idx + 1]}`);
        }
        return acc;
      }, []);
  };

  const getMatchedMWSFeaturesProject = (mwsGeoData, activeSelectedWaterbody) => {
    if (!mwsGeoData?.features?.length || !activeSelectedWaterbody) return [];

    const raw = activeSelectedWaterbody.MWS_UID ||  activeSelectedWaterbody.properties?.MWS_UID;

    if (!raw) return [];

    const wbMwsList = extractMwsUidList(raw);

    const matchedFeatures = mwsGeoData.features.filter((f) => {
      const uid = f.properties?.uid?.toString().trim();
      return wbMwsList.includes(uid);
    });

    return matchedFeatures;
  };
  
  const matchedMWSFeaturesProject = useMemo(() => {
    return getMatchedMWSFeaturesProject(
      mwsGeoData,
      activeSelectedWaterbody
    );
  }, [mwsGeoData, activeSelectedWaterbody]);

  const getFirstMwsWithValues = (features = []) => {
    if (!Array.isArray(features) || !features.length) return null;
  
    return (
      features.find((f) => {
        const p = f.properties || {};
        return Object.keys(p).some((k) => {
          if (/^precipitation_(kharif|rabi|zaid)_/.test(k)) {
            return Number(p[k]) > 0;   // <-- VALUE CHECK
          }
          return false;
        });
      }) || features[0]
    );
  };
  
  const mwsForMap = matchedMWSFeaturesProject;

  const mwsForCharts = useMemo(() => {
    return getFirstMwsWithValues(matchedMWSFeaturesProject);
  }, [matchedMWSFeaturesProject]);

  const matchedZoiFeature = useMemo(() => {
    if (!zoiFeatures || !activeSelectedWaterbody) return null;
  
    // In tehsil mode → feature.properties
    const wb = activeSelectedWaterbody.properties || activeSelectedWaterbody;
  
    const wbUID = wb.UID?.toString()?.trim();
    if (!wbUID) return null;
  
    return zoiFeatures.find(f => {
      const zoiUid =
        f.get("UID")?.toString()?.trim() ||
        f.get("uid")?.toString()?.trim();
  
      return zoiUid === wbUID;
    });
  }, [zoiFeatures, activeSelectedWaterbody]);

  
  const zoiAreaFromFeature = matchedZoiFeature
  ? Number(matchedZoiFeature.get("zoi_area")) || 0
  : 0;

// ====================== FIXED LOADING HANDLER ======================
  useEffect(() => {
    if (geoData === null) {
      setLoadingData(true);          // data not arrived yet
    } else {
      setLoadingData(false);         // data arrived (even if empty)
    }
  }, [geoData]);
  useEffect(() => {
    if (isTehsilMode) return; 
    if (!geoData || !waterbodyParam || autoOpened) return;

    const matchedFeatureIndex = geoData.features.findIndex(
      (f) => f.id?.toString() === waterbodyParam?.toString()
    );
    
  
    if (matchedFeatureIndex !== -1) {
      const feature = geoData.features[matchedFeatureIndex];
      const props = feature.properties ?? {};
      const row = {
        featureIndex: matchedFeatureIndex,
        UID: props.UID,
        waterbody: props.waterbody_name ?? props.waterbody ?? "NA",
        waterbody_name: props.waterbody_name ?? props.waterbody ?? "NA",
        MWS_UID:props.MWS_UID || "NA",    
        state: props.State || "NA",
        district: props.District || "NA",
        block: props.Taluka || "NA",
        village: props.Village || "NA",
        latitude: Number(props.latitude) || null,
        longitude: Number(props.longitude) || null,
        waterbody_id:props.id || null,
        siltRemoved: Number(props.slit_excavated) || 0,
        areaOred: props.area_ored || 0,
        maxCatchmentArea: props.max_catchment_area || 0,
        maxStreamOrder: props.max_stream_order || 0,
        intervention_year:props.intervention_year || 0,
        coordinates: null,
        geometry: feature.geometry,
        drainageFlag:props.on_drainage_line || 0,
      };

      setSelectedWaterbody(row);
      setSelectedFeature(feature);
      setShowMap(true); 

      setAutoOpened(true);
    }
  }, [geoData, waterbodyParam, autoOpened]);

  const extractSeasonYears = (props) => {  
    const years = new Set();
    Object.keys(props).forEach((key) => {
      const match = key.match(/^(k_|kr_|krz_)(\d{2}[-_]\d{2})$/);
  
      if (match) {  
        let yr = match[2];
        yr = yr.replace("_", "-");
        years.add(yr);
      }
    });
    const result = Array.from(years).sort();  
    return result;
  };
  
  const fullWaterbodyFeature = useMemo(() => {
    if (!geoData?.features || !selectedFeature) return null;
  
    return geoData.features.find(
      (f) =>
        f.properties?.UID?.toString() ===
        selectedFeature.properties?.UID?.toString()
    );
  }, [geoData, selectedFeature]);

  useEffect(() => {
    if (!fullWaterbodyFeature?.properties) return;
  
    const years = extractSeasonYears(fullWaterbodyFeature.properties);
  
    setExtractedSeasonalYears(years);
  }, [fullWaterbodyFeature]);

  
  const impactYearMap = useMemo(() => {
    const map = {};
  
    if (!geoData?.features || !mwsGeoData?.features) return map;
  
    geoData.features.forEach((wb) => {
      const uid = wb.properties?.UID;
      const raw = wb.properties?.MWS_UID;
      if (!uid || !raw) return;
  
      const wbMwsList = extractMwsUidList(raw);
  
      const mws = mwsGeoData.features.find((f) =>
        wbMwsList.includes(f.properties?.uid?.toString().trim())
      );
  
      if (!mws) return;
  
      const rainfall = getRainfallByYear(mws);
      const ivRaw = wb.properties?.intervention_year;
      const impact = calculateImpactYear(rainfall, ivRaw);
  
      if (impact) {
        map[uid] = impact;
      }
    });
  
    return map;
  }, [geoData, mwsGeoData]);
    
  const getFirstNonZeroYearIndex = (props) => {
    const years = extractSeasonYears(props); // dynamic years like ["17-18","18-19",...]

    for (let i = 0; i < years.length; i++) {
      const y = years[i];

      if (
        Number(props[`k_${y}`]) > 0 ||
        Number(props[`kr_${y}`]) > 0 ||
        Number(props[`krz_${y}`]) > 0
      ) {
        return i; // return index of FIRST year that has any non-zero season value
      }
    }

    return -1; // no non-zero data found
  };

  const computeTotalSeasonAverages = (props) => {
    const years = extractSeasonYears(props); // all seasonal years

    if (!years.length) {
      return {
        avgKharif: "0.00",
        avgRabi: "0.00",
        avgZaid: "0.00",
        totalYears: 0,
        usedYears: [],
      };
    }

    // Use your existing function
    const startIndex = getFirstNonZeroYearIndex(props);

    // If everything is zero
    if (startIndex === -1) {
      return {
        avgKharif: "0.00",
        avgRabi: "0.00",
        avgZaid: "0.00",
        totalYears: 0,
        usedYears: [],
      };
    }

    // Years to use for total season average
    const usedYears = years.slice(startIndex);

    const getAvg = (prefix) => {
      const vals = usedYears.map((y) => Number(props[`${prefix}${y}`]) || 0);
      const sum = vals.reduce((a, b) => a + b, 0);
      const avg = vals.length ? sum / vals.length : 0;
      return avg.toFixed(2);
    };

    return {
      avgKharif: getAvg("k_"),
      avgRabi: getAvg("kr_"),
      avgZaid: getAvg("krz_"),
    };
  };

  const computeAvgSeason = (props, preYears, postYears, prefix) => {
    const avg = (arr) =>
      arr.length
        ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2)
        : "0.00";

    const beforeValues = preYears.map(
      (y) => Number(props[`${prefix}${y}`]) || 0
    );
    const afterValues = postYears.map(
      (y) => Number(props[`${prefix}${y}`]) || 0
    );

    return {
      before: avg(beforeValues),
      after: avg(afterValues),
    };
  };

  const computeImpact = (before, after) => {
    const b = Number(before);
    const a = Number(after);
    if (isNaN(b) || isNaN(a)) return 0;
    return Number((a - b).toFixed(2));
  };

  const getImpactColor = (impact) => (impact >= 0 ? "green" : "red");

  // Impacted Area for ONE waterbody — Rabi
  const computeImpactedAreaRabi = (areaOred, impactRabi) => {
    const area = Number(areaOred) || 0;
    const impact = Number(impactRabi) || 0;
    return Number((area * impact).toFixed(2));
  };

  // Impacted Area for ONE waterbody — Zaid
  const computeImpactedAreaZaid = (areaOred, impactZaid) => {
    const area = Number(areaOred) || 0;
    const impact = Number(impactZaid) || 0;
    return Number((area * impact).toFixed(2));
  };

  // Sum Area-ored of all rows
  const computeTotalAreaOred = (rows) => {
    return rows.reduce((sum, r) => sum + (Number(r.areaOred) || 0), 0);
  };

  // Sum of all impacted areas for rabi
  const computeTotalRabiImpactedArea = (rows) => {
    return rows.reduce((sum, r) => sum + (Number(r.rabiImpactedArea) || 0), 0);
  };

  // Sum of all impacted areas for zaid
  const computeTotalZaidImpactedArea = (rows) => {
    return rows.reduce((sum, r) => sum + (Number(r.zaidImpactedArea) || 0), 0);
  };

  const computeDoubleTripleAvg = (matchedZoi) => {
    if (!matchedZoi) return { avgDouble: "0.00", avgTriple: "0.00" };

    const doubleVals = [];
    const tripleVals = [];

    matchedZoi.getKeys().forEach((key) => {
      const match = key.match(
        /(doubly_cropped_area_|triply_cropped_area_)(\d{4})/
      );
      if (match) {
        const year = match[2];
        const value = Number(matchedZoi.get(key)) || 0;

        if (match[1] === "doubly_cropped_area_") doubleVals.push(value);
        if (match[1] === "triply_cropped_area_") tripleVals.push(value);
      }
    });

    const avg = (arr) =>
      arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length / 10000 : 0;

    return {
      avgDouble: avg(doubleVals).toFixed(2),
      avgTriple: avg(tripleVals).toFixed(2),
    };
  };

  const getCoordinatesFromGeometry = (geometry) => {
    if (!geometry) return null;

    const { type, coordinates } = geometry;

    switch (type) {
      case "Point":
        return coordinates;

      case "Polygon":
        if (!coordinates?.[0]?.length) return null;
        const ring = coordinates[0];
        const sumX = ring.reduce((acc, coord) => acc + coord[0], 0);
        const sumY = ring.reduce((acc, coord) => acc + coord[1], 0);
        return [sumX / ring.length, sumY / ring.length];

      case "LineString":
        if (!coordinates?.length) return null;
        const middleIndex = Math.floor(coordinates.length / 2);
        return coordinates[middleIndex];

      default:
        return null;
    }
  };

  const formatInterventionYear = (year) => {
    if (!year) return "—";
  
    // already correct: 2023-2024
    if (/^\d{4}-\d{4}$/.test(year)) return year;
  
    // short format: 2024-25
    const shortMatch = year.match(/^(\d{4})-(\d{2})$/);
    if (shortMatch) {
      const start = Number(shortMatch[1]);
      const end = 2000 + Number(shortMatch[2]);
      return `${start}-${end}`;
    }
  
    // only single year: 2024 → 2024-2025
    if (/^\d{4}$/.test(year)) {
      const y = Number(year);
      return `${y}-${y + 1}`;
    }
  
    return year; // fallback
  };

  const getTotalWaterAvailability = (props, year) => {
    return (
      (Number(props[`k_${year}`]) || 0) +
      (Number(props[`kr_${year}`]) || 0) +
      (Number(props[`krz_${year}`]) || 0)
    );
  };
  

  const {
    rows,
    totalSiltRemoved,
    projectLevelRabiImpact,
    projectLevelZaidImpact,
  } = useMemo(() => {
    if (!geoData?.features) {
      return {
        rows: [],
        totalSiltRemoved: 0,
        totalRabiImpactedArea: 0,
        totalZaidImpactedArea: 0,
        projectLevelRabiImpact: 0,
        projectLevelZaidImpact: 0,
      };
    }
    let totalSiltRemoved = 0;
    const mappedRows = geoData.features.map((feature, index) => {
      const props = feature.properties ?? {};
      const waterbody_id = feature.id ?? null; 

      // const { preYears, postYears } = getPrePostYears(props, props.intervention_year);
      const impactPairs = impactYearMap[props.UID];

      let selectedPair = null;
      let maxWater = -Infinity;
      
      if (Array.isArray(impactPairs)) {
        impactPairs.forEach((pair) => {
          const postYear = pair.post;
          const water = getTotalWaterAvailability(props, postYear);
      
          if (water > maxWater) {
            maxWater = water;
            selectedPair = pair;
          }
        });
      }
      const preYears = selectedPair ? [selectedPair.pre] : [];
      const postYears = selectedPair ? [selectedPair.post] : [];

      const { avgRabi, avgZaid } = computeTotalSeasonAverages(props);

      const rabi = computeAvgSeason(props, preYears, postYears, "kr_");
      const zaid = computeAvgSeason(props, preYears, postYears, "krz_");

      const ImpactRabi = computeImpact(rabi.before, rabi.after);
      const ImpactZaid = computeImpact(zaid.before, zaid.after);

      const rabiImpactedArea = computeImpactedAreaRabi(
        props.area_ored,
        ImpactRabi
      );
      const zaidImpactedArea = computeImpactedAreaZaid(
        props.area_ored,
        ImpactZaid
      );

      const { avgDouble, avgTriple } = computeDoubleTripleAvg(
        zoiFeatures.find(
          (f) =>
            f.get("UID")?.toString().trim() === props?.UID?.toString().trim()
        )
      );

      const coordinates = getCoordinatesFromGeometry(feature.geometry);
      totalSiltRemoved += Number(props.slit_excavated) || 0;

      return {
        id: index + 1,
        state: props.State || "NA",
        district: props.District || "NA",
        block: props.Taluka || "NA",
        village: props.Village || "NA",
        waterbody: props.waterbody_name || "NA",
        UID: props.UID || "NA",
        areaOred: props.area_ored || 0,
        interventionYear: formatInterventionYear(props.intervention_year) ?? null,
        maxCatchmentArea: props.max_catchment_area || 0,
        maxStreamOrder: props.max_stream_order || 0,
        MWS_UID: props.MWS_UID || 0,
        drainageFlag: props.on_drainage_line ?? props.drainage ?? 0,
        siltRemoved: Number(props.slit_excavated) || 0,
        avgWaterAvailabilityRabi: avgRabi,
        avgWaterAvailabilityZaid: avgZaid,
        ImpactRabi,
        ImpactRabiColor: getImpactColor(ImpactRabi),
        ImpactZaid,
        ImpactZaidColor: getImpactColor(ImpactZaid),
        rabiImpactedArea,
        zaidImpactedArea,
        avgDoubleCropped: avgDouble,
        avgTripleCropped: avgTriple,
        latitude: props.latitude,
        longitude:props.longitude,
        waterbody_id: feature.id ?? null,
        coordinates,
        featureIndex: index,
        selectedPair
      };
    });

    // TOTALS
    const totalAreaOred = computeTotalAreaOred(mappedRows);
    const totalRabiImpactedArea = computeTotalRabiImpactedArea(mappedRows);
    const totalZaidImpactedArea = computeTotalZaidImpactedArea(mappedRows);

    return {
      rows: mappedRows,
      totalSiltRemoved,
      totalAreaOred,
      totalRabiImpactedArea,
      totalZaidImpactedArea,

      projectLevelRabiImpact: totalAreaOred
        ? totalRabiImpactedArea / totalAreaOred
        : 0,

      projectLevelZaidImpact: totalAreaOred
        ? totalZaidImpactedArea / totalAreaOred
        : 0,
    };
  }, [geoData, zoiFeatures]);
 
  const selectedPair = useMemo(() => {
    if (!activeSelectedWaterbody || !rows?.length) return null;
  
    const uid =
      activeSelectedWaterbody.properties?.UID ??
      activeSelectedWaterbody.UID;
  
    const row = rows.find((r) => r.UID === uid);
  
    return row?.selectedPair ?? null;
  }, [rows, activeSelectedWaterbody]);

  const selectedInterventionYear = useMemo(() => {
    if (!activeSelectedWaterbody || !rows?.length) return null;
  
    const uid =
      activeSelectedWaterbody.properties?.UID ??
      activeSelectedWaterbody.UID;
  
    const row = rows.find((r) => r.UID === uid);
  
    return row?.interventionYear ?? null;
  }, [rows, activeSelectedWaterbody]);
  
  const projectSummaryByInterventionYear = useMemo(() => {
    if (!rows?.length) return {};
  
    return rows.reduce((acc, row) => {
      const year = row.interventionYear;
      if (!year) return acc;
  
      if (!acc[year]) {
        acc[year] = {
          interventionYear: year,
          waterbodyCount: 0,
          totalSiltRemoved: 0,
          totalAreaOred: 0,
          totalRabiImpactArea: 0,
          totalZaidImpactArea: 0,
        };
      }
  
      acc[year].waterbodyCount += 1;
      acc[year].totalSiltRemoved += Number(row.siltRemoved) || 0;
      acc[year].totalAreaOred += Number(row.areaOred) || 0;
      acc[year].totalRabiImpactArea += Number(row.rabiImpactedArea) || 0;
      acc[year].totalZaidImpactArea += Number(row.zaidImpactedArea) || 0;
  
      return acc;
    }, {});
  }, [rows]);

  
  const totalRows = rows.length;

    const handleWaterbodyClick = (row) => {
      const params = new URLSearchParams(location.search);
    
      params.set("type", "project");
    
      if (projectIdParam) {
        params.set("projectId", projectIdParam);
      }
      if (projectNameParam) {
        params.set("project_name", projectNameParam);
      }
    
      //  USE waterbody_id IN URL
      params.set("waterbody", row.waterbody_id);
    
      navigate(`/rwb?${params.toString()}`);
    
      //  MATCH FEATURE USING feature.id
      const feature = geoData.features.find(
        (f) => f.id === row.waterbody_id
      );
    
      if (!feature) return;
      setSelectedWaterbody(row);
      setSelectedFeature(feature);
      setShowMap(true);
    
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    

  const TableLoader = () => (
    <div className="w-full h-[60vh] flex items-center justify-center">
      <CircularProgress />
    </div>
  );

  const printReport=()=>{
    window.print();
  }

  const handleSelectWaterbody = (wb) => {

    //  PROJECT MODE
    if (typeParam === "project" && wb?.UID && geoData?.features) {
  
      const feature = geoData.features.find(
        f => f.properties?.UID?.toString() === wb.UID.toString()
      );
  
      if (!feature) return;
  
      const props = feature.properties;
  
      const resolvedRow = {
        UID: props.UID,
        waterbody_name: props.waterbody_name,
        intervention_year: props.intervention_year, // 🔒 GUARANTEED
        areaOred: props.area_ored,
        latitude: props.latitude,
        longitude: props.longitude,
        geometry: feature.geometry,
        MWS_UID: props.MWS_UID,
      };
  
      setSelectedWaterbody(resolvedRow);
      setSelectedFeature(feature);
      setShowMap(true);
      return;
    }
  
    //  TEHSIL MODE (AS IS)
    setSelectedWaterbody(wb);
  };
  
  return (
    <div className={`${isTehsilMode ? "pb-8 w-full" : "mx-6 my-8 bg-white rounded-xl shadow-md p-6"}`}>
  
      {/* HEADER FOR TEHSIL MODE */}
      {isTehsilMode && activeSelectedWaterbody && (
        <div className="w-full overflow-hidden">
          <div className="w-full py-10 bg-[#2c3e50] text-white relative shadow-md">
            <button
              className="absolute top-4 right-6 flex items-center gap-2
                bg-green-600 hover:bg-green-700 text-white font-semibold 
                px-4 py-2 rounded-md shadow-md transition-all"
              onClick={printReport}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
                viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect x="6" y="14" width="12" height="8"></rect>
              </svg>
              Save as PDF
            </button>
  
            <h1 className="text-3xl font-bold text-center">
              Waterbody Data Analysis Report
            </h1>
  
            <p className="text-base text-blue-100 text-center mt-1">
              Tehsil: {activeSelectedWaterbody?.properties?.Taluka || blockParam || "NA"} • UID: {activeSelectedWaterbody?.properties?.UID}
            </p>
          </div>
        </div>
      )}
  
  {/* ====================== TOP BUTTONS + SUMMARY ====================== */}
  <div className="flex flex-col gap-1 mb-6 lg:flex-row lg:items-start lg:justify-between">
  
    {mode === "project" && (
      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={() => navigate("/rwb", { replace: true })}
          className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm hover:bg-purple-600 flex items-center gap-2 flex-shrink-0"
        >
          <ArrowBackIosNewIcon sx={{ fontSize: 16 }} />
          <span>Back to Projects</span>
        </button>
  
        <button
          onClick={() => {
            setSelectedWaterbody(null);
            setSelectedFeature(null);
            setShowMap((prev) => !prev);
          }}
          className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm hover:bg-purple-600 flex items-center gap-2 flex-shrink-0"
        >
          {showMap ? (
            <TableRowsIcon sx={{ fontSize: 18 }} />
          ) : (
            <PublicIcon sx={{ fontSize: 18 }} />
          )}
          <span>{showMap ? "View Table" : "View Map"}</span>
        </button>
      </div>
    )}
  
    {mode === "project" && projectNameParam && !activeSelectedWaterbody && (
      loadingData ? (
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm w-full md:max-w-[90%]">
          <CircularProgress size={20} />
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      ) : (
        <div className="flex items-start gap-2 bg-white px-0 py-2 rounded-xl shadow-sm
          w-full md:max-w-[90%] lg:max-w-[60%] xl:max-w-[80%] flex-grow mt-1 lg:mt-0 sm:max-w-[99%]">
          <Lightbulb size={32} className="text-gray-800 flex-shrink-0" />
          <p className="text-gray-800 text-sm md:text-base font-medium leading-snug">
            {WATER_DASHBOARD_CONFIG.project.topSectionText({
              projectName: projectNameParam,
              totalRows,
              totalSiltRemoved,
              projectSummaryByInterventionYear
              // projectImpactByInterventionYear
            })}
          </p>
        </div>
      )
    )}
  </div>
  
  {/* ====================== MAIN CONTENT SWITCH ====================== */}
  <div className="px-6 md:px-10 w-full box-border overflow-x-hidden">
  
    {/*  TABLE MODE */}
    {!showMap && (
      loadingData ? (
        <div className="w-full h-[60vh] flex items-center justify-center">
          <CircularProgress />
        </div>
      ) : (rows.length === 0 ? (
        <div className="w-full h-[60vh] flex items-center justify-center text-gray-500 text-sm">
          No data available
        </div>
      ) : (
        <TableView
          headers={WATER_DASHBOARD_CONFIG[mode].tableHeaders}
          rows={rows}
          waterbodySearch={waterbodySearch}
          onSearchChange={setWaterbodySearch}
          pageSize={50}
          onRowClick={handleWaterbodyClick}
        />
      ))
    )}
  
    {/* MAP MODE — ALWAYS SHOW MAP */}
    {showMap && (
      <>
      {activeSelectedWaterbody &&(
                <div className="bg-white rounded-xl shadow-sm p-6 mb-6 mt-6">
                <h2 className="font-bold text-blue-600 border-b-2 border-blue-600 pb-1 text-[clamp(1.1rem,1.7vw,1.5rem)]">
                  {WATER_DASHBOARD_CONFIG[mode].sections.section1.title}
                </h2>
                <div className="space-y-3 leading-relaxed mt-3">
                  {WATER_DASHBOARD_CONFIG[mode].sections.section1.paragraphs.map(
                    (text, idx) => (
                      <p key={idx} className="text-gray-700 leading-relaxed" style={{ fontSize: "clamp(0.70rem, 1vw, 1rem)" }}>{text}</p>
                    )
                  )}
                </div>
              </div>
      )}
  
        {/* MAP BLOCK */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden flex">
          <div className="h-full flex-[2] min-w-[50%]">
            <DashboardBasemap
              mode="waterbody"
              geoData={isTehsilMode ? tehsilGeoData : geoData}
              selectedWaterbody={activeSelectedWaterbody}
              showMap={showMap}
              projectName={typeParam === "project" ? projectNameParam : null}
              projectId={typeParam === "project" ? projectIdParam : null}
              onSelectWaterbody={handleSelectWaterbody}
              // onSelectWaterbody={(wb) => {
              //   setSelectedWaterbody(wb);
              //   setShowMap(true);
              // }}
              lulcYear={lulcYear1}
              district={districtParam}
              block={blockParam}
              onMapReady={(map) => {
                setTehsilMap(map);
              }}
              interventionYear={selectedInterventionYear} 
            />
             {showMap && activeSelectedWaterbody && (
          <div className="text-gray-500 text-[clamp(0.65rem,0.95vw,0.7rem)] mt-2 pl-2 w-full">
            <p><b>Water Availability : </b> We use Sentinel-1 (SAR data) VV band for water pixel detection in Kharif season and Dynamic World to detect water pixels in Rabi and Zaid seasons.This method reliably detects waterbodies of more than 1000 m² surface area.</p>
            <p><b>Land Use Land Cover : </b> Data remotely sensed from satellites including LandSat-7, LandSat-8, Sentinel-2, Sentinel-1, MODIS and Dynamic World</p>
            <p><b>Rainfall : </b> Precipitation data is calculated from the Global Satellite Mapping of Precipitation (GSMaP) dataset available on Google Earth Engine's data catalogue. GSMaP provides a global precipitation in mm/hr at spatial resolution of approximately 11 km.</p>
          </div>
        )}
          </div>
  
          {activeSelectedWaterbody && (
            <div className="h-full border-l bg-white overflow-y-auto p-4 flex-[1] min-w-[350px] flex flex-col gap-6">
  
              <div className="min-h-[320px] bg-white rounded-lg shadow-sm p-2 overflow-visible">
                <WaterAvailabilityChart
                  isTehsil={isTehsilMode}
                  waterbody={isTehsilMode ? activeSelectedWaterbody.properties.UID: activeSelectedWaterbody }
                  water_rej_data={isTehsilMode ? geoData ? { features: [geoData]} : null : geoData }        
                  mwsFeature={isTehsilMode ? matchedMwsOlFeatures[0] : mwsForCharts}
                  onImpactYearChange={setImpactYear} 
                  years={extractedSeasonalYears} 
                  impactPair={selectedPair} 
                />
              </div>
  
              <div className="min-h-[320px] bg-white rounded-lg shadow-sm p-2 overflow-visible min-w-[320px]">
                <PrecipitationStackChart
                  feature={isTehsilMode ? matchedMwsOlFeatures[0] : mwsForCharts}
                  waterbody={activeSelectedWaterbody}
                  water_rej_data={isTehsilMode ? geoData ? { features: [geoData]} : null : geoData }
                  typeparam={typeParam}
                />
              </div>
  
            </div>
          )}
        </div>
  
        {/* LOADING OVERLAY */}
        {isTehsilMode && loadingData && !activeSelectedWaterbody && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-[9999]">
            <div className="bg-white rounded-lg shadow-xl p-6 flex flex-col items-center gap-3">
              <CircularProgress />
              <p className="text-gray-700 font-medium">Loading waterbody data...</p>
            </div>
          </div>
        )}
  
        {/* EVERYTHING BELOW SHOWS ONLY AFTER YOU GET WB */}
        {activeSelectedWaterbody && (
          <>
            {/* SECTION 2 */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6 mt-6">
              <h2 className="font-bold text-blue-600 border-b-2 border-blue-600 pb-1 text-[clamp(1.1rem,1.7vw,1.5rem)]">
                {WATER_DASHBOARD_CONFIG[mode].sections.section2.title}
              </h2>
              <div className="space-y-3 leading-relaxed mt-3">
                {WATER_DASHBOARD_CONFIG[mode].sections.section2.paragraphs.map(
                  (text, idx) => (
                    <p key={idx} className="text-gray-700 leading-relaxed" style={{ fontSize: "clamp(0.70rem, 1vw, 1rem)" }}>{text}</p>
                  )
                )}
              </div>
            </div>
  
            {/* ZOI BLOCK */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden flex mt-6">
              <div className="w-[60%] h-full">
                <DashboardBasemap
                  mode="zoi"
                  geoData={isTehsilMode ? tehsilGeoData : geoData}
                  zoiFeatures={zoiFeatures}
                  selectedWaterbody={activeSelectedWaterbody}
                  projectName={projectNameParam}
                  projectId={projectIdParam}
                  showMap={showMap}
                  lulcYear={lulcYear2}
                  district={districtParam}
                  block={blockParam}
                  interventionYear={selectedInterventionYear} 

                />
                {showMap && activeSelectedWaterbody && (
                  <div className="text-gray-500 text-[clamp(0.65rem,0.95vw,0.7rem)] mt-2 pl-2 w-full">
                    <p><b>Cropping Intensity : </b> We use annual land use land cover (LULC), to identify areas under single cropping, double cropping and triple cropping using pixels which are classified as single kharif, single non-kharif, double and triple classes of LULC classifier to determine cropping intensity. The data used is from 2017 to 2024.</p>
                    <p><b>Drought Incidence : </b> Drought is defined as per the Government of India's Drought Manual and considered moderate or severe if the number of weeks of drought is five or more. Drought weeks are identified based on whether meteorological drought occurred in that week (i.e. the rains were less than usual in that week as compared to previous years, possibly intensified by dry spells defined as consecutive weeks of low rainfall) and/or agricultural drought occurred in that week (i.e. cropped area or crop health were lower than usual in that week as compared to previous years). Severe drought weeks are those when meteorological and agricultural drought are both coincident.</p>  
                  </div>
                )}
              </div>
  
              <div className="h-full border-l bg-white overflow-y-auto p-4 flex-[1] min-w-[350px] flex flex-col gap-6">
                <CroppingIntensityStackChart
                  zoiFeatures={zoiFeatures}
                  waterbody={activeSelectedWaterbody}
                  impactYear={impactYear}
                  isTehsil={isTehsilMode}
                  years={extractedSeasonalYears}
                  water_rej_data={isTehsilMode ? geoData ? { features: [geoData]} : null : geoData }
                />
  
                <DroughtChart
                  mwsGeoData={isTehsilMode ? tehsilDrought : mwsGeoData}
                  waterbody={activeSelectedWaterbody}
                  typeparam={typeParam}
                  years={extractedSeasonalYears} 
                />
              </div>
            </div>
  
            {/* NDVI */}
            {showMap && activeSelectedWaterbody && (
  <div className="bg-white rounded-xl shadow-md p-6 mt-8">
    <div className="w-full min-h-[420px]">
    <NDVIChart
                      zoiFeatures={zoiFeatures}
                      waterbody={activeSelectedWaterbody}
                      years={WATER_DASHBOARD_CONFIG.ndviYears}
                    />
    </div>
    {showMap && activeSelectedWaterbody && (
  <div className="text-gray-500 text-[clamp(0.65rem,0.95vw,0.7rem)] mt-2 pl-2 w-full">
    <p><b>NDVI : </b> Used harmonized Landsat-7, Landsat-8 and Sentinel-2 NDVI values to construct 16-day NDVI time series, gap-filled with MODIS NDVI values.</p>
  </div>
)}
  </div>
)}
  
            {/* SECTION 3 */}
            <div className="bg-white rounded-xl shadow-sm p-6 mt-6 mb-6">
              <h2 className="font-bold text-blue-600 border-b-2 border-blue-600 pb-1 text-[clamp(1.1rem,1.7vw,1.5rem)]">
                {WATER_DASHBOARD_CONFIG[mode].sections.section3.title}
              </h2>
              <div className="space-y-3 leading-relaxed mt-3">
                {WATER_DASHBOARD_CONFIG[mode].sections.section3.paragraphs.map(
                  (text, idx) => (
                    <p key={idx} className="text-gray-700 leading-relaxed"
                       style={{ fontSize: "clamp(0.70rem, 1vw, 1rem)" }}>
                      {text}
                    </p>
                  )
                )}
              </div>
            </div>
  
            {/* SUMMARY CARDS */}
            <div className="w-full mt-4 px-2 md:px-0">
              <div className="w-full flex flex-col md:flex-row justify-between gap-3">
  
                {[
                  {
                    title: "Max Catchment Area",
                    value: (() => {
                      const props = activeSelectedWaterbody?.properties ?? activeSelectedWaterbody ?? {};
                      const v =
                        props.max_catchment_area ??
                        props.maxCatchmentArea ??
                        props.max_catchment ??
                        null;
                      return v ? `${Number(v).toFixed(2)} hectares` : "N/A";
                    })(),
                    color: "text-blue-600",
                  },
                  {
                    title: "Drainage Line",
                    value: (() => {
                      const props = activeSelectedWaterbody?.properties ?? activeSelectedWaterbody ?? {};
                      const onDrain = props.on_drainage_line ?? props.drainage ?? props.drainageFlag;
                      const streamOrder = props.max_stream_order ?? props.maxStreamOrder;
                      if (onDrain !== 1)
                        return <span className="text-red-500">Not On Drainage Line</span>;
                      return streamOrder ? `ON Drainage Line Stream Order ${streamOrder}` : "N/A";
                    })(),
                    color: "text-blue-600",
                  },
                  {
                    title: "Watershed Position",
                    value: (() => {
                      const props = activeSelectedWaterbody?.properties ?? activeSelectedWaterbody ?? {};
                      const streamOrder = props.max_stream_order ?? props.maxStreamOrder;
                      return streamOrder ? `Order ${streamOrder}` : "N/A";
                    })(),
                    color: "text-blue-600",
                  },
                ].map((card, idx) => (
                  <div key={idx}
                    className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100
                      rounded-xl border border-gray-200 shadow-sm
                      flex flex-col items-center text-center
                      transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                    style={{
                      padding: "clamp(10px, 2vw, 24px)",
                      minHeight: "clamp(100px, 16vh, 140px)",
                    }}
                  >
                    <p
                      className="uppercase tracking-wide font-bold text-gray-800"
                      style={{ fontSize: "clamp(0.55rem, 0.8vw, 0.9rem)" }}
                    >
                      {card.title}
                    </p>
  
                    <p
                      className={`font-semibold mt-1 ${card.color}`}
                      style={{ fontSize: "clamp(0.9rem, 1.5vw, 1.4rem)" }}
                    >
                      {card.value}
                    </p>
                  </div>
                ))}
  
              </div>
            </div>
  
            {/* MWS FULL WIDTH MAP */}
            <div className="w-full mt-6">
              <div className="relative w-full bg-white rounded-xl shadow-md overflow-hidden">
  
                <DashboardBasemap
                  id="map3"
                  mode="mws"
                  geoData={typeParam === "tehsil" ? tehsilGeoData : geoData}
                  mwsData={isTehsilMode ? matchedMwsOlFeatures : mwsGeoData}
                  selectedWaterbody={activeSelectedWaterbody}
                  selectedFeature={isTehsilMode ? matchedMwsOlFeatures : mwsForMap}
                  lulcYear={lulcYear2}
                  projectName={projectNameParam}
                  projectId={projectIdParam}
                  organizationLabel={organization?.label}
                  district={districtParam}
                  block={blockParam}
                  type={typeParam}
                />
                {showMap && activeSelectedWaterbody && (
  <div className="text-gray-500 text-[clamp(0.65rem,0.95vw,0.7rem)] mt-2 pl-2 w-full">
    <p><b>Terrain : </b> We used NASA's SRTM Digital Elevation Model at 30m resolution to generate landform classification.</p>
    <p><b>Drainage Lines : </b> Drainage lines use digital elevation model (DEM) raster dataset as input. The DEM provides pixel level information on the elevation of the terrain, which is used to determine the flow of water across the landscape.
    </p>
    <p><b>Catchment Area : </b>  We use a digital elevation model (DEM) that provides pixel-level elevation information. We preprocessed the elevation data to generate depression-less elevation data, which is further used to compute flow accumulation. Flow accumulation represents the number of upstream pixels flowing to a pixel. The upstream pixels flowing to a pixel forms the catchment area of that pixel.</p>
    <p><b>Stream Order/Watershed Position : </b>  We use digital elevation model (DEM) data that provides pixel level information on the elevation and drainage lines (with stream orders) as inputs to compute stream order rasters.
    </p>
  </div>
)}
  
              </div>
            </div>
  
          </>
        )}
      </>
    )}
  
  </div>
  
  {/* FOOTER */}
  <footer className="mt-10 border-t border-gray-300 pt-5 text-center text-[#2c2d2d]">
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
      <a href="mailto:contact@core-stack.org" className="underline text-blue-600">
        contact@core-stack.org
      </a>.
    </p>
  </footer>
  
  </div>
  );
  
};

export default WaterProjectDashboard;

