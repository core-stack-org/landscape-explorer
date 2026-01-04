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
import DashboardBasemap from "./dashboard_basemap.jsx";
import { useGlobalWaterData } from "../store/useGlobalWaterData";
import { getWaterbodyData } from "../actions/getWaterbodyData";
import {getRainfallByYear,calculateImpactYear} from "../components/utils/impactYear.js";
import { waterGeoDataAtom, waterMwsDataAtom, zoiFeaturesAtom,selectedWaterbodyForTehsilAtom,tehsilZoiFeaturesAtom,tehsilDroughtDataAtom } from "../store/locationStore.jsx";

const WaterProjectDashboard = () => {
  const [selectedWaterbody, setSelectedWaterbody] = useState(null);
  const [mapClickedWaterbody, setMapClickedWaterbody] = useState(null);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [zoiArea, setZoiArea] = useState(null);
  const [terrainLegend, setTerrainLegend] = useState(false);
  const [drainageLegend, setDrainageLegend] = useState(false);
  const [infoText, setInfoText] = useState("");
  const [infoAnchor, setInfoAnchor] = useState(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [openInfoKey, setOpenInfoKey] = useState(null);
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
  const [tehsilSelectedFeature, setTehsilSelectedFeature] = useState(null);
  const [mwsFromLocalStorage, setMwsFromLocalStorage] = useState(null);

  const [selectedWaterbodyForTehsil, setSelectedWaterbodyForTehsil] =
  useRecoilState(selectedWaterbodyForTehsilAtom);

  const tehsilDrought = useRecoilValue(tehsilDroughtDataAtom);

  const location = useLocation();
  const navigate = useNavigate();

const tehsilRefetchDoneRef = useRef(false);

  // Extract URL parameters 
  const params = new URLSearchParams(location.search);

  const typeParam = params.get("type");
  const projectIdParam = params.get("projectId");
  const projectNameParam = params.get("project_name");
  
  const mode = typeParam === "project" ? "project" : "tehsil";

  const stateParam = params.get("state");
  const districtParam = params.get("district");
  const blockParam = params.get("block");

  const waterbodyParam = params.get("waterbody");
  const isTehsilMode = typeParam === "tehsil";


  const activeSelectedWaterbody = isTehsilMode
    ? selectedWaterbodyForTehsil
    : selectedWaterbody;

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
  console.log(districtParam,blockParam)

  const handleCloseInfo = () => {
    setInfoAnchor(null);
    setInfoText("");
    setInfoOpen(false);
    setOpenInfoKey(null);
  };

  useEffect(() => {
    const stored = localStorage.getItem("selectedWaterbody");
    if (stored) {
      const parsed = JSON.parse(stored);
      setSelectedWaterbodyForTehsil(parsed);
    }
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem("matched_mws_feature");
    if (!raw) return;
    const parsed = JSON.parse(raw);
    setMwsFromLocalStorage(parsed);
  }, []);



  useEffect(() => {
    if (!isTehsilMode) return;
  
    console.log("🟡 effect chala");
  
    if (!tehsilMap) {
      console.log("❌ map abhi nahi aaya");
      return;
    }
  
    if (selectedWaterbodyForTehsil && mwsFromLocalStorage) {
      console.log("✅ data already hai");
      return;
    }
  
    console.log("🔁 refetch kar raha hoon");
  
    getWaterbodyData({
      district: { label: districtParam },
      block: { label: blockParam },
      map: tehsilMap,
      waterbodyUID: waterbodyParam,
    });
  }, [
    isTehsilMode,
    tehsilMap,
    selectedWaterbodyForTehsil,
    mwsFromLocalStorage,
  ]);
  


  useEffect(() => {
    if (typeParam === "tehsil") {
      setShowMap(true);
    }
  }, [typeParam]);

  const matchedMwsFeature = useMemo(() => {
    return mwsFromLocalStorage || null;
  }, [mwsFromLocalStorage]);
  
  const matchedMwsOlFeature = useMemo(() => {
    if (!matchedMwsFeature) return null;
  
    return new GeoJSON().readFeature(matchedMwsFeature, {
      dataProjection: "EPSG:4326",
      featureProjection: "EPSG:4326",
    });
  }, [matchedMwsFeature]);
  
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

      setTehsilSelectedFeature(featureOL);
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

  // useEffect(() => {
  //   const storedOrg = localStorage.getItem("selectedOrganization");
  //   const storedProject = localStorage.getItem("selectedProject");

  //   if (storedOrg) {
  //     const parsedOrg = JSON.parse(storedOrg);

  //     setOrganization((prev) =>
  //       prev?.value !== parsedOrg.value ? parsedOrg : prev
  //     );
  //   } else {
  //     setOrganization(null);
  //   }

  //   if (storedProject) {
  //     const parsedProj = JSON.parse(storedProject);
  //     setProject((prev) =>
  //       prev?.value !== parsedProj.value ? parsedProj : prev
  //     );
  //   } else {
  //     setProject(null);
  //   }
  // }, [location.key]);

  useEffect(() => {
    if (view === "table") {
      setSelectedWaterbody(null);
      setSelectedFeature(null);
      setMapClickedWaterbody(null);
    }
  }, [view]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
  
    // agar waterbody param nahi hai
    if (!params.get("waterbody")) {
      setShowMap(false);
      setSelectedWaterbody(null);
      setSelectedFeature(null);
      setMapClickedWaterbody(null);
  
      // tehsil cleanup
      setSelectedWaterbodyForTehsil(null);
    }
  }, [location.search]);
  
  let tempGeoData =  useRecoilValue(waterGeoDataAtom);
  const geoData = isTehsilMode ? selectedWaterbodyForTehsil : tempGeoData
  const mwsGeoData = useRecoilValue(waterMwsDataAtom);
  const projectZoi = useRecoilValue(zoiFeaturesAtom);
  const tehsilZoi = useRecoilValue(tehsilZoiFeaturesAtom);
  const zoiFeatures = isTehsilMode ? tehsilZoi : projectZoi;

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

  const raw =
    activeSelectedWaterbody.MWS_UID ||
    activeSelectedWaterbody.properties?.MWS_UID;

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

  const mwsForMap = matchedMWSFeaturesProject;
  const mwsForCharts = matchedMWSFeaturesProject?.[0] || null;

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

  useEffect(() => {
    if (!window.__userSelectedOrgProject && geoData === null) {
      setLoadingData(false);
      return;
    }
      if (geoData?.features) {
      setLoadingData(false);
    } else {
      setLoadingData(true);
    }
  }, [geoData]);
  
  useEffect(() => {
    if (isTehsilMode) return; 
    if (!geoData || !waterbodyParam || autoOpened) return;

    const matchedFeatureIndex = geoData.features.findIndex((f) => {
      const props = f.properties ?? {};
      return (
        props.UID?.toString() === waterbodyParam.toString() ||
        props.uid?.toString() === waterbodyParam.toString() ||
        props.waterbody_uid?.toString() === waterbodyParam.toString()
      );
    });
    

    if (matchedFeatureIndex !== -1) {
      const feature = geoData.features[matchedFeatureIndex];
      const props = feature.properties ?? {};
console.log(props)
      const row = {
        featureIndex: matchedFeatureIndex,
        UID: props.UID,
        waterbody: props.waterbody_name ?? props.waterbody ?? "NA",
        waterbody_name: props.waterbody_name ?? props.waterbody ?? "NA",
        MWS_UID:props.MWS_UID || "NA",    
        state: props.State || "NA",
        district: props.District || "NA",
        block: props.Taluka || "NA",
        village: props.village || "NA",

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

  const impactYearMap = useMemo(() => {
    const map = {};
  
    if (!geoData?.features || !mwsGeoData?.features) return map;
  
    geoData.features.forEach((wb) => {
      const uid = wb.properties?.UID;
      if (!uid) return;
  
      // matching MWS
      const mws = mwsGeoData.features.find((m) =>
        m.properties?.uid?.includes(wb.properties?.MWS_UID)
      );
  
      if (!mws) return;
  
      const rainfall = getRainfallByYear(mws);
      const impact = calculateImpactYear(rainfall);
  
      if (impact) {
        map[uid] = impact;
      }
    });
  
    return map;
  }, [geoData, mwsGeoData]);
  
  const extractSeasonYears = (props) => {
    const years = new Set();

    Object.keys(props).forEach((key) => {
      const match = key.match(/^(k_|kr_|krz_)(\d{2}[-_]\d{2})$/);
      if (match) {
        let yr = match[2];
        // normalize 17_18 → 17-18
        yr = yr.replace("_", "-");
        years.add(yr);
      }
    });

    return Array.from(years).sort(); // sorted list: ["17-18", "18-19", ...]
  };

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

      // const { preYears, postYears } = getPrePostYears(props, props.intervention_year);
      const impact = impactYearMap[props.UID];

      const preYears = impact ? [impact.pre] : [];
      const postYears = impact ? [impact.post] : [];

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
        village: props.village || "NA",
        waterbody: props.waterbody_name || "NA",
        UID: props.UID || "NA",
        areaOred: props.area_ored || 0,
        interventionYear: props.intervention_year ?? "—",
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

        coordinates,
        featureIndex: index,
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
      params.set("waterbody", row.UID);
  
    navigate(`/rwb?${params.toString()}`);
  
    const feature = geoData.features.find((f, idx) => idx === row.featureIndex);
    if (!feature) return;
  
    setSelectedWaterbody(row);
    setSelectedFeature(feature);
    setShowMap(true);
  
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  
  return (
    <div className="mx-6 my-8 bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
        {mode === "project" && (
          <div className="flex gap-3">
            <button onClick={() => {navigate("/rwb", { replace: true });}}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm hover:bg-purple-600 flex items-center gap-2">
                <ArrowBackIosNewIcon sx={{ fontSize: 16 }} />
                <span>Back to Projects</span>
            </button>
            <button onClick={() => {  setSelectedWaterbody(null);      
                                      setSelectedFeature(null);   
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
          {mode === "project" && projectNameParam && (
            <div className="flex items-center gap-6 bg-white px-6 py-2 rounded-xl shadow-sm">
              <Lightbulb size={36} className="text-gray-800" />
              <p className="text-gray-800 text-sm md:text-base font-medium text-center">
                {WATER_DASHBOARD_CONFIG.project.topSectionText({
                  projectName: projectNameParam,
                  totalRows,
                  totalSiltRemoved,
                  interventionYear:
                    WATER_DASHBOARD_CONFIG.project.interventionYear,
                  rabiImpact: projectLevelRabiImpact,
                  zaidImpact: projectLevelZaidImpact,
                })}
              </p>
            </div>
          )}
          </div>
          </div>
        )}
    </div>
    {/* SECTION TEXT — show only when zoomed on a waterbody */}
      {showMap && activeSelectedWaterbody && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-2xl font-bold text-blue-600 border-b-2 border-blue-600 pb-1">
            {WATER_DASHBOARD_CONFIG[mode].sections.section1.title}
          </h2>

          <div className="space-y-3 leading-relaxed mt-3">
            {WATER_DASHBOARD_CONFIG[mode].sections.section1.paragraphs.map(
              (text, idx) => (
                <p
                  key={idx}
                  className="text-gray-700 leading-relaxed"
                >
                  {text}
                </p>
              )
            )}
          </div>
        </div>
      )}

    {showMap ? (
      <>
      <div className="h-[80vh] bg-white rounded-xl shadow-md overflow-hidden flex">

{/* MAP */}
<div
  className={`transition-all duration-300 h-full ${
     "w-[60%]" 
  }`}
>
  <DashboardBasemap
    mode="waterbody"
    geoData={typeParam === "tehsil" ? tehsilGeoData : geoData}
    selectedWaterbody={activeSelectedWaterbody}
    showMap={showMap}
    projectName={typeParam === "project" ? projectNameParam : null}
    projectId={typeParam === "project" ? projectIdParam : null}
    onSelectWaterbody={(wb) => {
      setSelectedWaterbody(wb);
      setShowMap(true);  
    }}
    lulcYear={lulcYear1}
    district={districtParam}
    block={blockParam}
    onMapReady={(map) => {
      console.log("✅ map mil gaya");
      setTehsilMap(map);
    }}
  />
</div>

{/* RIGHT PANEL */}
{showMap && activeSelectedWaterbody && (
  <div className="w-[40%] h-full border-l bg-white overflow-y-auto p-4 flex flex-col gap-6">

    {/* WATER AVAILABILITY */}
    <div className="min-h-[320px] bg-white rounded-lg shadow-sm p-2 overflow-hidden">
      <WaterAvailabilityChart
        isTehsil={isTehsilMode}
        waterbody={
          isTehsilMode
            ? activeSelectedWaterbody.properties.UID
            : activeSelectedWaterbody
        }
        water_rej_data={
          isTehsilMode
            ? { features: [geoData] }
            : geoData
        }
        mwsFeature={
          isTehsilMode
            ? matchedMwsOlFeature
            : mwsForCharts
        }
        impactYear={impactYearMap[activeSelectedWaterbody?.UID]}
        />
    </div>

    {/* PRECIPITATION */}
    <div className="min-h-[320px] bg-white rounded-lg shadow-sm p-2 overflow-hidden">
      <PrecipitationStackChart
        feature={
          typeParam === "tehsil"
            ? matchedMwsOlFeature
            : mwsForCharts
        }
        waterbody={activeSelectedWaterbody}
          typeparam={typeParam}
        />
    </div>

  </div>
)}
</div>
{showMap && activeSelectedWaterbody && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-2xl font-bold text-blue-600 border-b-2 border-blue-600 pb-1">
            {WATER_DASHBOARD_CONFIG[mode].sections.section2.title}
          </h2>

          <div className="space-y-3 leading-relaxed mt-3">
            {WATER_DASHBOARD_CONFIG[mode].sections.section2.paragraphs.map(
              (text, idx) => (
                <p
                  key={idx}
                  className="text-gray-700 leading-relaxed"
                >
                  {text}
                </p>
              )
            )}
          </div>
        </div>
      )}
      {/* SECOND MAP + GRAPHS (Cropping + Drought) */}
{showMap && activeSelectedWaterbody && (
  <div className="h-[80vh] bg-white rounded-xl shadow-md overflow-hidden flex mt-6">

    {/* MAP */}
    <div className="w-[60%] h-full">
      <DashboardBasemap
        mode="zoi"
        geoData={typeParam === "tehsil" ? tehsilGeoData : geoData}
        zoiFeatures={zoiFeatures}
        selectedWaterbody={activeSelectedWaterbody}
        projectName={typeParam === "project" ? projectNameParam : null}
        projectId={typeParam === "project" ? projectIdParam : null}
        showMap={showMap}
        lulcYear={lulcYear2}  
        district={districtParam}
        block={blockParam}
      />
    </div>

    {/* RIGHT PANEL */}
    <div className="w-[40%] h-full border-l bg-white overflow-y-auto p-4 flex flex-col gap-6">

      {/* CROPPING INTENSITY */}
      <div className="min-h-[320px] bg-white rounded-lg shadow-sm p-2 overflow-hidden">
      <CroppingIntensityStackChart
                        zoiFeatures={zoiFeatures}
                        waterbody={activeSelectedWaterbody}
                        impactYear={impactYear}
                        isTehsil={isTehsilMode}
                      />
      </div>

      {/* DROUGHT */}
      <div className="min-h-[320px] bg-white rounded-lg shadow-sm p-2 overflow-hidden">
      <DroughtChart
                      mwsGeoData={isTehsilMode ? tehsilDrought : mwsGeoData}
                        waterbody={activeSelectedWaterbody}
                        typeparam={typeParam}
                      />
      </div>
    </div>
  </div>
  
)}
{/* NDVI — FULL WIDTH SECTION */}
{showMap && activeSelectedWaterbody && (
  <div className="bg-white rounded-xl shadow-md p-6 mt-8">
    <div className="w-full min-h-[420px]">
    <NDVIChart
                      zoiFeatures={zoiFeatures}
                      waterbody={activeSelectedWaterbody}
                      years={WATER_DASHBOARD_CONFIG.ndviYears}
                    />
    </div>
  </div>
)}
{/* SECTION 3 TEXT — BELOW NDVI */}
{showMap && activeSelectedWaterbody && (
  <div className="bg-white rounded-xl shadow-sm p-6 mt-6 mb-6">
    <h2 className="text-2xl font-bold text-blue-600 border-b-2 border-blue-600 pb-1">
      {WATER_DASHBOARD_CONFIG[mode].sections.section3.title}
    </h2>

    <div className="space-y-3 leading-relaxed mt-3">
      {WATER_DASHBOARD_CONFIG[mode].sections.section3.paragraphs.map(
        (text, idx) => (
          <p key={idx} className="text-gray-700 leading-relaxed">
            {text}
          </p>
        )
      )}
    </div>
  </div>
)}

{/* SECTION 3 — SUMMARY CARDS */}
{showMap && activeSelectedWaterbody && (
  <div className="w-full mt-4 px-2 md:px-0">
    <div className="w-full flex flex-col md:flex-row justify-between gap-3">

      {/* MAX CATCHMENT AREA */}
      <div
        className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6 rounded-xl
        border border-gray-200 shadow-sm flex flex-col items-center text-center min-h-[120px]
        transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
      >
        <p className="uppercase tracking-wide font-bold text-sm text-gray-800">
          Max Catchment Area
        </p>

        <p className="mt-1 text-xl md:text-2xl font-semibold text-blue-600">
          {(() => {
            const props =
              activeSelectedWaterbody?.properties ??
              activeSelectedWaterbody ??
              {};

            const value =
              isTehsilMode
                ? props.max_catchment_area
                : props.max_catchment_area;

            return value ? `${Number(value).toFixed(2)} hectares` : "N/A";
          })()}
        </p>
      </div>

      {/* DRAINAGE LINE */}
      <div
        className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6 rounded-xl
        border border-gray-200 shadow-sm flex flex-col items-center text-center min-h-[120px]
        transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
      >
        <p className="uppercase tracking-wide font-bold text-sm text-gray-800">
          Drainage Line
        </p>

        {(() => {
          const props =
            activeSelectedWaterbody?.properties ??
            activeSelectedWaterbody ??
            {};

          const drainageFlag =
            props.on_drainage_line ??
            props.drainage ??
            props.drainageFlag;

          const streamOrder =
            props.max_stream_order ??
            props.maxStreamOrder;

          if (drainageFlag !== 1) {
            return (
              <p className="mt-1 text-xl md:text-2xl font-semibold text-red-500">
                Not On Drainage Line
              </p>
            );
          }

          return (
            <p className="mt-1 text-xl md:text-2xl font-semibold text-blue-600">
              {streamOrder
                ? `ON Drainage Line Stream Order ${streamOrder}`
                : "N/A"}
            </p>
          );
        })()}
      </div>

      {/* WATERSHED POSITION */}
      <div
        className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6 rounded-xl
        border border-gray-200 shadow-sm flex flex-col items-center text-center min-h-[120px]
        transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
      >
        <p className="uppercase tracking-wide font-bold text-sm text-gray-800">
          Watershed Position
        </p>

        <p className="mt-1 text-xl md:text-2xl font-semibold text-blue-600">
          {(() => {
            const props =
              activeSelectedWaterbody?.properties ??
              activeSelectedWaterbody ??
              {};

            const streamOrder =
              props.max_stream_order ??
              props.maxStreamOrder;

            return streamOrder ? `Order ${streamOrder}` : "N/A";
          })()}
        </p>
      </div>

    </div>
  </div>
)}

{/* FULL WIDTH MWS MAP — AFTER SECTION 3 */}
{showMap && activeSelectedWaterbody && (
  <div className="w-full mt-6">
    <div className="relative w-full h-[85vh] bg-white rounded-xl shadow-md overflow-hidden">

    <DashboardBasemap
                    id="map3"
                    mode="mws"
                    geoData={typeParam === "tehsil" ? tehsilGeoData : geoData}
                    mwsData={typeParam === "tehsil" ? matchedMwsOlFeature : mwsGeoData}

                    // mwsData={mwsGeoData}
                    selectedWaterbody={activeSelectedWaterbody}
                    selectedFeature={typeParam === "tehsil" ? mwsFromLocalStorage : mwsForMap}
                    lulcYear={lulcYear2} 
                    projectName={typeParam === "project" ? projectNameParam : null}
                    projectId={typeParam === "project" ? projectIdParam : null}
                    organizationLabel={organization?.label}
                    onZoiArea={setZoiArea}
                    district={districtParam}
                    block={blockParam}
                    type={typeParam}
                  />
      {/* LEGENDS OVERLAY */}
      <div className="absolute inset-0 z-20 pointer-events-none">

        {/* TERRAIN LEGEND */}
        <div className="absolute left-0 bottom-0 p-4 pointer-events-auto">
          {!terrainLegend ? (
            <div
              onClick={() => setTerrainLegend(true)}
              className="bg-white/90 px-2 py-1 rounded-r-md shadow-md cursor-pointer font-bold text-gray-800"
              style={{ writingMode: "vertical-rl" }}
            >
              Terrain Legend ▶
            </div>
          ) : (
            <div className="bg-white/90 p-4 rounded-md shadow-md min-w-[220px]">
              <div className="flex justify-between mb-2">
                <p className="text-sm font-semibold">Terrain Layer Legend</p>
                <button onClick={() => setTerrainLegend(false)}>◀</button>
              </div>

              {WATER_DASHBOARD_CONFIG.legends.terrain.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 mt-1">
                  <div
                    className="w-5 h-5 border border-black"
                    style={{ backgroundColor: item.color }}
                  />
                  <p className="text-xs">{item.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* DRAINAGE LEGEND */}
        <div className="absolute right-0 bottom-0 p-4 pointer-events-auto">
          {!drainageLegend ? (
            <div
              onClick={() => setDrainageLegend(true)}
              className="bg-white/90 px-2 py-1 rounded-l-md shadow-md cursor-pointer font-bold text-gray-800"
              style={{ writingMode: "vertical-rl" }}
            >
              Drainage Legend ▶
            </div>
          ) : (
            <div className="bg-white/90 p-4 rounded-md shadow-md min-w-[220px]">
              <div className="flex justify-between mb-2">
                <p className="text-sm font-semibold">Drainage Layer Legend</p>
                <button onClick={() => setDrainageLegend(false)}>◀</button>
              </div>

              {WATER_DASHBOARD_CONFIG.legends.drainage.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 mt-1">
                  <div
                    className="w-5 h-5 border border-black"
                    style={{ backgroundColor: item.color }}
                  />
                  <p className="text-xs">{item.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  </div>
)}
      </> 
      ) : (
        <TableView
          headers={WATER_DASHBOARD_CONFIG[mode].tableHeaders}
          rows={rows}
          waterbodySearch={waterbodySearch}
          onSearchChange={setWaterbodySearch}
          pageSize={50}
          onRowClick={handleWaterbodyClick}

        />
      )}
      </div>
  );
};

export default WaterProjectDashboard;

