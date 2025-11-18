import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
// import { yearAtom } from "../store/locationStore.jsx";
import HeaderSelect from "../components/water_headerSection";
import { useParams } from "react-router-dom";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import Map from "ol/Map";
import { Style, Fill, Stroke, Icon } from "ol/style";
import { Point } from "ol/geom";
import { defaults as defaultInteractions, DragPan } from "ol/interaction";
import getVectorLayers from "../actions/getVectorLayers.js";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import YearSlider from "./yearSlider";
import PrecipitationStackChart from "./PrecipitationStackChart.jsx";
import CroppingIntensityStackChart from "./CroppingIntensityStackChart.jsx";
import { yearAtomFamily } from "../store/locationStore";
import NDVIChart from "./NDVIChart.jsx";
// import DroughtChart from "./droughtchart.jsx";
import Overlay from "ol/Overlay";

import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { Download, Lightbulb } from "lucide-react";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import XYZ from "ol/source/XYZ";
import { Control, defaults as defaultControls } from "ol/control";
import FilterListIcon from "@mui/icons-material/FilterList";
import SurfaceWaterChart from "./waterChart";
import getImageLayer from "../actions/getImageLayers";
import WaterAvailabilityChart from "./WaterAvailabilityChart";
import Crop from "ol-ext/filter/Crop";
import MultiPolygon from "ol/geom/MultiPolygon";
import Feature from "ol/Feature";
import MouseWheelZoom from "ol/interaction/MouseWheelZoom";
import PinchZoom from "ol/interaction/PinchZoom";
import DoubleClickZoom from "ol/interaction/DoubleClickZoom";
import { useLocation } from "react-router-dom";
import TileWMS from "ol/source/TileWMS";
import NDMIPointChart from "./NDMIPointChart.jsx";
import DroughtChart from "./droughtchart.jsx";

const useWaterRejData = (projectName, projectId) => {
  const [geoData, setGeoData] = useState(null);
  const [mwsGeoData, setMwsGeoData] = useState(null);
  const [zoiFeatures, setZoiFeatures] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!projectName || !projectId) return;

    let cancelled = false;
    setLoading(true);

    const fetchWFS = async (typeName, retries = 2) => {
      const base =
        "https://geoserver.core-stack.org:8443/geoserver/waterrej/ows?";
      const params = new URLSearchParams({
        service: "WFS",
        version: "1.0.0",
        request: "GetFeature",
        typeName,
        outputFormat: "application/json",
      });
      const url = base + params.toString();

      for (let i = 0; i <= retries; i++) {
        try {
          const res = await fetch(url);
          if (res.ok) return await res.json();
        } catch {}
        await new Promise((r) => setTimeout(r, 500 * (i + 1)));
      }
      return null;
    };

    const loadAll = async () => {
      const geoPromise = fetchWFS(
        `waterrej:WaterRejapp-${projectName}_${projectId}`
      );
      const mwsPromise = fetchWFS(
        `waterrej:WaterRejapp_mws_${projectName}_${projectId}`
      );
      const zoiPromise = fetchWFS(
        `waterrej:WaterRejapp_zoi_${projectName}_${projectId}`
      );

      const [geo, mws, zoi] = await Promise.all([
        geoPromise,
        mwsPromise,
        zoiPromise,
      ]);
      if (cancelled) return;

      setGeoData(geo);
      setMwsGeoData(mws);

      if (zoi?.features?.length) {
        const features = new GeoJSON().readFeatures(zoi, {
          dataProjection: "EPSG:4326",
          featureProjection: "EPSG:4326",
        });
        setZoiFeatures(features);
      } else {
        setZoiFeatures([]);
      }

      setLoading(false);
    };

    loadAll();
    return () => {
      cancelled = true;
    };
  }, [projectName, projectId]);

  return { geoData, mwsGeoData, zoiFeatures, loading };
};

const WaterProjectDashboard = () => {
  const [view, setView] = useState("table");
  const [anchorEl, setAnchorEl] = useState(null);
  const [filterType, setFilterType] = useState("");

  const [selectedWaterbody, setSelectedWaterbody] = useState(null);
  const [mapClickedWaterbody, setMapClickedWaterbody] = useState(null);
  const [waterBodyLayer, setWaterBodyLayer] = useState(null);
  const [currentLayer, setCurrentLayer] = useState([]);

  const [selectedFeature, setSelectedFeature] = useState(null);
  const [zoiArea, setZoiArea] = useState(null);
  const [waterbodyLegend, setWaterbodyLegend] = useState(false);
  const [zoiLegend, setZoiLegend] = useState(false);
  const [terrainLegend, setTerrainLegend] = useState(false);
  const [drainageLegend, setDrainageLegend] = useState(false);
  const [infoText, setInfoText] = useState("");
  const [infoAnchor, setInfoAnchor] = useState(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [openInfoKey, setOpenInfoKey] = useState(null);
  const [impactYear, setImpactYear] = useState({ pre: null, post: null });

  const mapElement1 = useRef();
  const mapElement2 = useRef();
  const mapRef1 = useRef();
  const mapRef2 = useRef();
  const mapElement3 = useRef();
  const mapRef3 = useRef();

  const baseLayerRef = useRef();
  const location = useLocation();
  const lulcYear1 = useRecoilValue(yearAtomFamily("map1"));
  const lulcYear2 = useRecoilValue(yearAtomFamily("map2"));

  const [sortField, setSortField] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc");
  const [searchText, setSearchText] = useState("");
  const [waterbodySearch, setWaterbodySearch] = useState("");
  const [selectedMWSFeature, setSelectedMWSFeature] = useState(null);

  const [organization, setOrganization] = useState(null);
  const [project, setProject] = useState(null);
  const interventionYear = "22-23"; //Later fetched from geojson

  const handleInfoClick = (anchor, text, key = null) => {
    // anchor must be e.currentTarget (DOM element)
    setInfoAnchor(anchor);
    setInfoText(text);
    setInfoOpen(true);
    setOpenInfoKey(key);
  };

  const handleCloseInfo = () => {
    setInfoAnchor(null);
    setInfoText("");
    setInfoOpen(false);
    setOpenInfoKey(null);
  };

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
    const storedOrg = sessionStorage.getItem("selectedOrganization");
    const storedProject = sessionStorage.getItem("selectedProject");
    const selectedOrganization = JSON.parse(
      sessionStorage.getItem("selectedOrganization")
    );
    const organizationName = selectedOrganization?.label;

    if (storedOrg) {
      const parsedOrg = JSON.parse(storedOrg);

      setOrganization((prev) =>
        prev?.value !== parsedOrg.value ? parsedOrg : prev
      );
    } else {
      setOrganization(null);
    }

    if (storedProject) {
      const parsedProj = JSON.parse(storedProject);
      setProject((prev) =>
        prev?.value !== parsedProj.value ? parsedProj : prev
      );
    } else {
      setProject(null);
    }
  }, [location.key]);

  const projectName = project?.label;
  const projectId = project?.value;

  useEffect(() => {
    // Clear all maps when project changes
    if (mapRef1.current) {
      mapRef1.current.setTarget(null);
      mapRef1.current = null;
    }
    if (mapRef2.current) {
      mapRef2.current.setTarget(null);
      mapRef2.current = null;
    }
    if (mapRef3.current) {
      mapRef3.current.setTarget(null);
      mapRef3.current = null;
    }

    // Reset waterbody selections too
    setSelectedWaterbody(null);
    setSelectedFeature(null);
    setMapClickedWaterbody(null);
  }, [projectId]);

  useEffect(() => {
    if (view === "table") {
      // detach maps
      if (mapRef1.current) {
        mapRef1.current.setTarget(null);
        mapRef1.current = null;
      }
      if (mapRef2.current) {
        mapRef2.current.setTarget(null);
        mapRef2.current = null;
      }
      if (mapRef3.current) {
        mapRef3.current.setTarget(null);
        mapRef3.current = null;
      }

      // reset waterbody selections
      setSelectedWaterbody(null);
      setSelectedFeature(null);
      setMapClickedWaterbody(null);
    }
  }, [view]);

  const { geoData, mwsGeoData, zoiFeatures, loading } = useWaterRejData(
    projectName,
    projectId
  );

  if (loading || !geoData || !mwsGeoData || zoiFeatures.length === 0) {
  }

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

  const getPrePostYears = (props, interventionYear) => {
    const years = extractSeasonYears(props);
    if (!years.length) {
      return {
        preYears: [],
        postYears: [],
        startIndex: -1,
        interventionIndex: -1,
      };
    }

    const startIndex = getFirstNonZeroYearIndex(props);
    if (startIndex === -1) {
      return {
        preYears: [],
        postYears: [],
        startIndex: -1,
        interventionIndex: -1,
      };
    }

    // usable years from first non-zero
    const effectiveYears = years.slice(startIndex);

    const interventionIndex = effectiveYears.indexOf(interventionYear);

    // If intervention year missing → all pre
    if (interventionIndex === -1) {
      return {
        preYears: effectiveYears,
        postYears: [],
        startIndex,
        interventionIndex: -1,
      };
    }

    // ⭐ FIX: Do not include intervention year in either group
    const preYears = effectiveYears.slice(0, interventionIndex);
    const postYears = effectiveYears.slice(interventionIndex + 1);

    return {
      preYears,
      postYears,
      startIndex,
      interventionIndex,
      allYears: years,
    };
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

      const { preYears, postYears } = getPrePostYears(props, interventionYear);
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
        maxCatchmentArea: props.max_catchment_area || 0,
        maxStreamOrder: props.max_stream_order || 0,

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

  const [filters, setFilters] = useState({
    state: [],
    district: [],
    block: [],
    village: [],
  });

  const handleFilterClick = (event, type) => {
    setAnchorEl(event.currentTarget);
    setFilterType(type);
    setSearchText("");
  };

  const handleFilterClose = () => {
    setAnchorEl(null);
    setFilterType("");
  };

  useEffect(() => {
    const fetchUpdateLulc = async () => {
      const fullYear = lulcYear1
        .split("_")
        .map((part) => `20${part}`)
        .join("_")
        .toLowerCase()
        .replace(/\s/g, "_");

      const projectName = project.label;
      const projectId = project.value;

      const layerName = `clipped_lulc_filtered_mws_${projectName}_${projectId}_${fullYear}`;
      const uniqueLayerId = "lulcWaterrejLayer1"; //  fixed unique ID

      //  Remove old LULC layer before adding a new one
      if (mapRef1.current) {
        mapRef1.current
          .getLayers()
          .getArray()
          .filter((layer) => layer.get("id") === uniqueLayerId)
          .forEach((layer) => {
            mapRef1.current.removeLayer(layer);
          });
      }

      // Create new LULC layer
      const newLayer = await getImageLayer(
        "waterrej",
        layerName,
        true,
        "lulc_RWB"
      );

      newLayer.setZIndex(0);
      newLayer.set("id", uniqueLayerId);

      //  Add clipping with selected waterbody
      if (waterBodyLayer) {
        const waterBodySource = waterBodyLayer.getSource();
        const waterBodyFeatures = waterBodySource.getFeatures();

        if (waterBodyFeatures.length > 0) {
          let combinedFeature;

          if (waterBodyFeatures.length === 1) {
            combinedFeature = waterBodyFeatures[0];
          } else {
            const geometries = waterBodyFeatures.map((f) => f.getGeometry());
            const firstGeometry = geometries[0];
            if (
              firstGeometry.getType() === "Polygon" ||
              firstGeometry.getType() === "MultiPolygon"
            ) {
              const allCoordinates = [];
              geometries.forEach((geom) => {
                if (geom.getType() === "Polygon") {
                  allCoordinates.push(geom.getCoordinates());
                } else if (geom.getType() === "MultiPolygon") {
                  allCoordinates.push(...geom.getCoordinates());
                }
              });

              const multiPolygon = new MultiPolygon(allCoordinates);
              combinedFeature = new Feature(multiPolygon);
            } else {
              combinedFeature = waterBodyFeatures[0];
            }
          }

          const crop = new Crop({
            feature: combinedFeature,
            wrapX: true,
            inner: false,
          });

          newLayer.addFilter(crop);
        }
      }

      // Add new LULC layer to map
      if (mapRef1.current) {
        mapRef1.current.addLayer(newLayer);
      }

      // Update state with new layer reference
      setCurrentLayer((prev) => {
        const others = prev.filter((l) => l.name !== "lulcWaterrej");
        const updated = [
          ...others,
          {
            name: "lulcWaterrej",
            layerRef: [newLayer],
          },
        ];
        return updated;
      });

      // Zoom to selected waterbody
      if (selectedWaterbody?.geometry && mapRef1.current && waterBodyLayer) {
        const source = waterBodyLayer.getSource();
        const features = source.getFeatures();

        features.forEach((feature) => feature.setStyle(null));

        const extent = selectedWaterbody.geometry.getExtent();
        mapRef1.current.getView().fit(extent, {
          padding: [40, 40, 40, 40],
          duration: 500,
          maxZoom: 15,
        });

        features.forEach((feature) => {
          if (feature.getGeometry().intersectsExtent(extent)) {
            feature.setStyle(
              new Style({
                stroke: new Stroke({ color: "#FF0000", width: 5 }),
                // fill: new Fill({ color: "rgba(255, 0, 0, 0.3)" }),
              })
            );
          }
        });
      }
    };

    fetchUpdateLulc().catch((error) => {
      console.error("[LULC] Error during fetchUpdateLulc:", error);
    });
  }, [lulcYear1, selectedWaterbody, waterBodyLayer, project]);

  // useEffect(() => {
  //   const fetchUpdateLulcZOI = async () => {
  //     if (!lulcYear2 || !lulcYear2.includes("_")) return;
  //     if (!zoiFeatures?.length) return;
  //     if (!mapRef2.current) return;

  //     const map = mapRef2.current;

  //     // 🔹 Set ZOI area for selected waterbody
  //     if (selectedWaterbody) {
  //       const matchedZoi = zoiFeatures.find(
  //         (f) =>
  //           f.get("UID")?.toLowerCase().trim() ===
  //           selectedWaterbody?.UID?.toLowerCase().trim()
  //       );
  //       setZoiArea(matchedZoi?.get("zoi_area") || null);
  //     } else {
  //       setZoiArea(null);
  //     }

  //     // 🔹 Construct LULC layer name
  //     const fullYear = lulcYear2
  //       .split("_")
  //       .map((part) => `20${part}`)
  //       .join("_")
  //       .toLowerCase()
  //       .replace(/\s/g, "_");

  //     const projectName = project?.label;
  //     const projectId = project?.value;
  //     if (!projectName || !projectId) return;

  //     const layerName = `clipped_lulc_filtered_mws_${projectName}_${projectId}_${fullYear}`;

  //     // 🔹 Remove old layers
  //     const idsToRemove = [
  //       "lulc_zoi_layer",
  //       "zoi_border_layer",
  //       "waterbody_layer",
  //     ];
  //     map
  //       .getLayers()
  //       .getArray()
  //       .forEach((layer) => {
  //         if (idsToRemove.includes(layer.get("id"))) {
  //           map.removeLayer(layer);
  //         }
  //       });

  //     // 🔹 Add LULC raster layer
  //     const tempLayer = await getImageLayer(
  //       "waterrej",
  //       layerName,
  //       true,
  //       "waterrej_lulc"
  //     );
  //     tempLayer.setZIndex(0);
  //     tempLayer.set("id", "lulc_zoi_layer");

  //     // 🔹 Crop LULC: single ZOI or all ZOIs (INCLUDE pixels inside ZOI)
  //     let cropFeature;
  //     if (selectedWaterbody) {
  //       const matchedZoi = zoiFeatures.find(
  //         (f) =>
  //           f.get("UID")?.toLowerCase().trim() ===
  //           selectedWaterbody?.UID?.toLowerCase().trim()
  //       );
  //       if (matchedZoi) cropFeature = matchedZoi;
  //     } else {
  //       const geometries = zoiFeatures.map((f) => f.getGeometry().clone());
  //       const multiPolygon = new MultiPolygon(
  //         geometries.map((g) => g.getCoordinates())
  //       );
  //       cropFeature = new Feature(multiPolygon);
  //     }

  //     // Apply ZOI crop filter (keep pixels INSIDE ZOI)
  //     if (cropFeature) {
  //       const crop = new Crop({
  //         feature: cropFeature,
  //         wrapX: true,
  //         inner: false, // Show pixels inside the ZOI boundary
  //       });
  //       tempLayer.addFilter(crop);
  //     }

  //     // 🔹 EXCLUDE LULC pixels from inside waterbody (new addition)
  //     if (waterBodyLayer) {
  //       const allWbFeatures = waterBodyLayer.getSource().getFeatures();

  //       let waterbodyFeaturesToExclude;
  //       if (selectedWaterbody) {
  //         // If a waterbody is selected, only exclude that one
  //         const matchedWb = allWbFeatures.find(
  //           (f) =>
  //             f.get("UID")?.toLowerCase().trim() ===
  //             selectedWaterbody?.UID?.toLowerCase().trim()
  //         );
  //         waterbodyFeaturesToExclude = matchedWb ? [matchedWb] : [];
  //       } else {
  //         // No selection → exclude all waterbodies
  //         waterbodyFeaturesToExclude = allWbFeatures;
  //       }

  //       // Apply exclusion crop for each waterbody
  //       waterbodyFeaturesToExclude.forEach((wbFeature) => {
  //         const excludeCrop = new Crop({
  //           feature: wbFeature,
  //           wrapX: true,
  //           inner: true, // Hide pixels INSIDE the waterbody boundary
  //         });
  //         tempLayer.addFilter(excludeCrop);
  //       });
  //     }

  //     map.addLayer(tempLayer);

  //     // 🔹 Add ZOI border layer (yellow)
  //     let zoiLayer;
  //     if (selectedWaterbody) {
  //       const matchedZoi = zoiFeatures.find(
  //         (f) =>
  //           f.get("UID")?.toLowerCase().trim() ===
  //           selectedWaterbody?.UID?.toLowerCase().trim()
  //       );
  //       if (matchedZoi) {
  //         zoiLayer = new VectorLayer({
  //           source: new VectorSource({ features: [matchedZoi] }),
  //           style: new Style({
  //             stroke: new Stroke({ color: "yellow", width: 3 }),
  //           }),
  //         });
  //       }
  //     } else {
  //       zoiLayer = new VectorLayer({
  //         source: new VectorSource({ features: zoiFeatures }),
  //         style: new Style({
  //           stroke: new Stroke({ color: "yellow", width: 3 }),
  //         }),
  //       });
  //     }

  //     if (zoiLayer) {
  //       zoiLayer.setZIndex(1);
  //       zoiLayer.set("id", "zoi_border_layer");
  //       map.addLayer(zoiLayer);
  //     }

  //     // 🔹 Add waterbody layer (only selected waterbody if any)
  //     let wbLayer;
  //     if (selectedWaterbody && waterBodyLayer) {
  //       const allFeatures = waterBodyLayer.getSource().getFeatures();
  //       const matchedWb = allFeatures.find(
  //         (f) =>
  //           f.get("UID")?.toLowerCase().trim() ===
  //           selectedWaterbody?.UID?.toLowerCase().trim()
  //       );

  //       if (matchedWb) {
  //         wbLayer = new VectorLayer({
  //           source: new VectorSource({ features: [matchedWb] }),
  //           style: new Style({
  //             stroke: new Stroke({ color: "blue", width: 3 }),
  //           }),
  //         });
  //       }
  //     } else if (waterBodyLayer) {
  //       // No selection → show all waterbodies
  //       wbLayer = waterBodyLayer;
  //     }

  //     if (wbLayer) {
  //       wbLayer.setZIndex(2);
  //       wbLayer.set("id", "waterbody_layer");
  //       map.addLayer(wbLayer);
  //     }

  //     // 🔹 Track current LULC layer
  //     setCurrentLayer((prev) => {
  //       const others = prev.filter((l) => l.name !== "lulcWaterrejZOI");
  //       return [...others, { name: "lulcWaterrejZOI", layerRef: [tempLayer] }];
  //     });
  //   };

  //   fetchUpdateLulcZOI().catch(console.error);
  // }, [lulcYear2, project, zoiFeatures, mapRef2.current, selectedWaterbody]);

  useEffect(() => {
    let isCancelled = false;

    const fetchUpdateLulcZOI = async () => {
      if (!lulcYear2 || !lulcYear2.includes("_")) return;
      if (!zoiFeatures?.length) return;
      if (!mapRef2.current) return;

      const map = mapRef2.current;

      const idsToRemove = [
        "lulc_zoi_layer",
        "zoi_border_layer",
        "waterbody_layer",
      ];

      const allLayers = map.getLayers().getArray();
      const layersToRemove = [];

      for (let i = allLayers.length - 1; i >= 0; i--) {
        const layer = allLayers[i];
        const layerId = layer.get("id");

        if (idsToRemove.includes(layerId)) {
          layersToRemove.push(layer);
        } else if (layer.getSource && layer.getSource()?.getParams) {
          const params = layer.getSource().getParams();
          if (params?.LAYERS?.includes("clipped_lulc_filtered_mws")) {
            layersToRemove.push(layer);
          }
        }
      }

      layersToRemove.forEach((layer) => {
        map.removeLayer(layer);
      });

      if (selectedWaterbody) {
        const matchedZoi = zoiFeatures.find(
          (f) =>
            f.get("UID")?.toLowerCase().trim() ===
            selectedWaterbody?.UID?.toLowerCase().trim()
        );
        setZoiArea(matchedZoi?.get("zoi_area") || null);
      } else {
        setZoiArea(null);
      }

      const fullYear = lulcYear2
        .split("_")
        .map((part) => `20${part}`)
        .join("_")
        .toLowerCase()
        .replace(/\s/g, "_");

      const projectName = project?.label;
      const projectId = project?.value;
      if (!projectName || !projectId) return;

      const layerName = `clipped_lulc_filtered_mws_${projectName}_${projectId}_${fullYear}`;

      const tempLayer = await getImageLayer(
        "waterrej",
        layerName,
        true,
        "waterrej_lulc"
      );

      if (isCancelled) {
        return;
      }

      tempLayer.setZIndex(0);
      tempLayer.set("id", "lulc_zoi_layer");

      let cropFeature;
      if (selectedWaterbody) {
        const matchedZoi = zoiFeatures.find(
          (f) =>
            f.get("UID")?.toLowerCase().trim() ===
            selectedWaterbody?.UID?.toLowerCase().trim()
        );
        if (matchedZoi) cropFeature = matchedZoi;
      } else {
        const geometries = zoiFeatures.map((f) => f.getGeometry().clone());
        const multiPolygon = new MultiPolygon(
          geometries.map((g) => g.getCoordinates())
        );
        cropFeature = new Feature(multiPolygon);
      }

      if (cropFeature) {
        const crop = new Crop({
          feature: cropFeature,
          wrapX: true,
          inner: false,
        });
        tempLayer.addFilter(crop);
      }

      if (waterBodyLayer) {
        const allWbFeatures = waterBodyLayer.getSource().getFeatures();

        let waterbodyFeaturesToExclude;
        if (selectedWaterbody) {
          const matchedWb = allWbFeatures.find(
            (f) =>
              f.get("UID")?.toLowerCase().trim() ===
              selectedWaterbody?.UID?.toLowerCase().trim()
          );
          waterbodyFeaturesToExclude = matchedWb ? [matchedWb] : [];
        } else {
          waterbodyFeaturesToExclude = allWbFeatures;
        }

        waterbodyFeaturesToExclude.forEach((wbFeature) => {
          const excludeCrop = new Crop({
            feature: wbFeature,
            wrapX: true,
            inner: true,
          });
          tempLayer.addFilter(excludeCrop);
        });
      }

      const allLayersCheck = map.getLayers().getArray();
      const remainingOldLayers = [];

      for (let i = allLayersCheck.length - 1; i >= 0; i--) {
        const layer = allLayersCheck[i];
        const layerId = layer.get("id");

        if (idsToRemove.includes(layerId)) {
          remainingOldLayers.push(layer);
        } else if (layer.getSource && layer.getSource()?.getParams) {
          const params = layer.getSource().getParams();
          if (params?.LAYERS?.includes("clipped_lulc_filtered_mws")) {
            remainingOldLayers.push(layer);
          }
        }
      }

      remainingOldLayers.forEach((layer) => {
        map.removeLayer(layer);
      });

      map.addLayer(tempLayer);

      let zoiLayer;
      if (selectedWaterbody) {
        const matchedZoi = zoiFeatures.find(
          (f) =>
            f.get("UID")?.toLowerCase().trim() ===
            selectedWaterbody?.UID?.toLowerCase().trim()
        );
        if (matchedZoi) {
          zoiLayer = new VectorLayer({
            source: new VectorSource({ features: [matchedZoi] }),
            style: new Style({
              stroke: new Stroke({ color: "yellow", width: 3 }),
            }),
          });
        }
      } else {
        zoiLayer = new VectorLayer({
          source: new VectorSource({ features: zoiFeatures }),
          style: new Style({
            stroke: new Stroke({ color: "yellow", width: 3 }),
          }),
        });
      }

      if (zoiLayer) {
        zoiLayer.setZIndex(1);
        zoiLayer.set("id", "zoi_border_layer");
        map.addLayer(zoiLayer);
      }

      let wbLayer;
      if (selectedWaterbody && waterBodyLayer) {
        const allFeatures = waterBodyLayer.getSource().getFeatures();
        const matchedWb = allFeatures.find(
          (f) =>
            f.get("UID")?.toLowerCase().trim() ===
            selectedWaterbody?.UID?.toLowerCase().trim()
        );

        if (matchedWb) {
          wbLayer = new VectorLayer({
            source: new VectorSource({ features: [matchedWb] }),
            style: new Style({
              stroke: new Stroke({ color: "blue", width: 3 }),
            }),
          });
        }
      } else if (waterBodyLayer) {
        wbLayer = waterBodyLayer;
      }

      if (wbLayer) {
        wbLayer.setZIndex(2);
        wbLayer.set("id", "waterbody_layer");
        map.addLayer(wbLayer);
      }

      if (!isCancelled) {
        setCurrentLayer((prev) => {
          const others = prev.filter((l) => l.name !== "lulcWaterrejZOI");
          return [
            ...others,
            { name: "lulcWaterrejZOI", layerRef: [tempLayer] },
          ];
        });
      }
    };

    fetchUpdateLulcZOI().catch(console.error);

    return () => {
      isCancelled = true;

      if (!mapRef2.current) return;
      const map = mapRef2.current;

      const idsToRemove = [
        "lulc_zoi_layer",
        "zoi_border_layer",
        "waterbody_layer",
      ];

      const allLayers = map.getLayers().getArray();
      const layersToRemove = [];

      for (let i = allLayers.length - 1; i >= 0; i--) {
        const layer = allLayers[i];
        const layerId = layer.get("id");

        if (idsToRemove.includes(layerId)) {
          layersToRemove.push(layer);
        } else if (layer.getSource && layer.getSource()?.getParams) {
          const params = layer.getSource().getParams();
          if (params?.LAYERS?.includes("clipped_lulc_filtered_mws")) {
            layersToRemove.push(layer);
          }
        }
      }

      layersToRemove.forEach((layer) => {
        map.removeLayer(layer);
      });
    };
  }, [lulcYear2, project, zoiFeatures, selectedWaterbody, waterBodyLayer]);

  const handleViewChange = (event, newView) => {
    if (newView !== null) {
      setView(newView);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder((prevOrder) => (prevOrder === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const filteredRows = rows.filter((row) => {
    const matchesGlobalSearch = Object.keys(row).some((key) => {
      if (!row[key]) return false;
      if (typeof row[key] === "object") return false; // skip objects like coordinates
      return row[key]
        .toString()
        .toLowerCase()
        .includes(searchText.toLowerCase());
    });

    const matchesFilters = Object.keys(filters).every((key) => {
      if (filters[key].length === 0) return true;
      return filters[key].includes(String(row[key]));
    });

    const matchesWaterbodySearch = row.waterbody
      ?.toString()
      .toLowerCase()
      .includes(waterbodySearch.toLowerCase());

    return matchesGlobalSearch && matchesFilters && matchesWaterbodySearch;
  });

  const sortedRows = [...filteredRows].sort((a, b) => {
    if (!sortField) return 0;
    const aValue = a[sortField];
    const bValue = b[sortField];

    if (sortField === "avgWaterAvailabilityZaid") {
      const aNumeric = parseFloat(aValue.replace("%", ""));
      const bNumeric = parseFloat(bValue.replace("%", ""));
      return sortOrder === "asc" ? aNumeric - bNumeric : bNumeric - aNumeric;
    }

    if (!isNaN(parseFloat(aValue)) && !isNaN(parseFloat(bValue))) {
      return sortOrder === "asc"
        ? parseFloat(aValue) - parseFloat(bValue)
        : parseFloat(bValue) - parseFloat(aValue);
    }

    return sortOrder === "asc"
      ? String(aValue).localeCompare(String(bValue))
      : String(bValue).localeCompare(String(aValue));
  });

  const handleClearSingleFilter = (type) => {
    setFilters((prev) => ({
      ...prev,
      [type]: [],
    }));
    handleFilterClose();
  };

  const initializeMap1 = async () => {
    const baseLayer = new TileLayer({
      source: new XYZ({
        url: `https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}`,
        maxZoom: 35,
        transition: 500,
        zoom: 20,
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
        super({ element });
      }
    }

    const view = new View({
      projection: "EPSG:4326",
      constrainResolution: true,
      smoothExtentConstraint: true,
      smoothResolutionConstraint: true,
    });

    const map = new Map({
      target: mapElement1.current,
      layers: [baseLayer],
      controls: defaultControls().extend([new GoogleLogoControl()]),
      view: view,
      loadTilesWhileAnimating: true,
      loadTilesWhileInteracting: true,
    });

    mapRef1.current = map;

    // Create water body layer
    const vectorLayerWater = new VectorSource({
      features: new GeoJSON({
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:4326",
      }).readFeatures(geoData),
    });

    const waterBodyStyle = (feature) => {
      const styles = [
        new Style({
          stroke: new Stroke({
            color: "blue",
            width: 3,
          }),
        }),
      ];

      const geometry = feature.getGeometry();
      if (geometry) {
        let center;

        if (geometry.getType() === "Polygon") {
          center = geometry.getInteriorPoint().getCoordinates();
        } else if (geometry.getType() === "MultiPolygon") {
          center = geometry.getInteriorPoints().getFirstCoordinate();
        } else {
          // fallback: use extent center
          const extent = geometry.getExtent();
          center = [(extent[0] + extent[2]) / 2, (extent[1] + extent[3]) / 2];
        }

        styles.push(
          new Style({
            geometry: new Point(center),
            image: new Icon({
              anchor: [0.5, 1],
              src: "https://cdn-icons-png.flaticon.com/512/684/684908.png", // marker icon
              scale: 0.05,
            }),
          })
        );
      }

      return styles;
    };

    const waterBodyLayerSecond = new VectorLayer({
      source: vectorLayerWater,
      style: waterBodyStyle,
      // style: new Style({
      //   stroke: new Stroke({ color: "#ff0000", width: 5 }),
      //   // fill: new Fill({ color: "rgba(100, 149, 237, 0.5)" }),
      // }),
    });
    waterBodyLayerSecond.setZIndex(2);

    map.addLayer(waterBodyLayerSecond);
    setWaterBodyLayer(waterBodyLayerSecond);

    map.on("pointermove", function (evt) {
      const hit = map.hasFeatureAtPixel(evt.pixel);
      map.getTargetElement().style.cursor = hit ? "pointer" : "";
    });

    map.on("singleclick", (evt) => {
      let found = false;
      map.forEachFeatureAtPixel(evt.pixel, (feature) => {
        const props = feature.getProperties();
        if (props.waterbody_name) {
          setMapClickedWaterbody({
            name: props.waterbody_name,
            Village: props.Village,
            Taluka: props.Taluka,
            pixel: evt.pixel,
          });
          found = true;
        }
      });
      if (!found) {
        setMapClickedWaterbody(null);
      }
    });

    const features = vectorLayerWater.getFeatures();
    if (!selectedWaterbody && features.length > 0) {
      const extent = vectorLayerWater.getExtent();
      view.fit(extent, {
        padding: [20, 20, 20, 20],
        duration: 1000,
        maxZoom: 35,
        zoom: 18,
      });
    }
    view.animate({
      zoom: view.getZoom() + 0.75,
      duration: 500,
    });

    map.once("rendercomplete", () => {
      if (selectedWaterbody && selectedWaterbody.coordinates) {
        zoomToWaterbody(selectedWaterbody, selectedFeature);
      }
    });
  };

  const initializeMap2 = async () => {
    const baseLayer = new TileLayer({
      source: new XYZ({
        url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
        maxZoom: 30,
      }),
    });

    const view = new View({
      projection: "EPSG:4326",
      constrainResolution: true,
    });

    const map = new Map({
      target: mapElement2.current,
      layers: [baseLayer],
      view,
      loadTilesWhileAnimating: true,
      loadTilesWhileInteracting: true,
    });

    mapRef2.current = map;

    // Only show selected waterbody (in blue)
    let selectedFeatureOnly = null;

    if (selectedWaterbody && geoData) {
      const allFeatures = new GeoJSON({
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:4326",
      }).readFeatures(geoData);

      selectedFeatureOnly = allFeatures.find(
        (f) =>
          f.get("UID")?.toLowerCase().trim() ===
          selectedWaterbody?.UID?.toLowerCase().trim()
      );
    }

    const waterBodyLayer2 = new VectorLayer({
      source: new VectorSource({
        features: selectedFeatureOnly ? [selectedFeatureOnly] : [],
      }),
      style: new Style({
        stroke: new Stroke({ color: "#0000FF", width: 4 }),
      }),
    });

    map.addLayer(waterBodyLayer2);

    // Zoom logic
    if (selectedFeatureOnly) {
      const geometry = selectedFeatureOnly.getGeometry();
      if (geometry) {
        view.fit(geometry.getExtent(), {
          duration: 1000,
          padding: [50, 50, 50, 50],
          maxZoom: 18,
        });
      }
    }
  };

  const initializeMap3 = async (organizationLabel) => {
    if (!organizationLabel || !projectName || !projectId) return;

    const baseLayer = new TileLayer({
      source: new XYZ({
        url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
        maxZoom: 30,
      }),
    });

    const view = new View({
      projection: "EPSG:4326",
      constrainResolution: true,
    });

    const map = new Map({
      target: mapElement3.current,
      layers: [baseLayer],
      view,
      loadTilesWhileAnimating: true,
      loadTilesWhileInteracting: true,
    });
    mapRef3.current = map;

    // Disable zoom interactions
    map.getInteractions().forEach((interaction) => {
      if (
        interaction instanceof MouseWheelZoom ||
        interaction instanceof PinchZoom ||
        interaction instanceof DoubleClickZoom
      ) {
        interaction.setActive(false);
      }
    });

    // --- Fetch MWS boundary from WFS (server-side filtered) ---
    const typeName = `waterrej:WaterRejapp_mws_${projectName}_${projectId}`;
    const mwsId = selectedFeature.properties.MWS_UID;
    const uidParts = mwsId?.split("_") || [];
    const uidPrefix =
      uidParts.length >= 2 ? `${uidParts[0]}_${uidParts[1]}` : mwsId;

    const wfsUrl =
      "https://geoserver.core-stack.org:8443/geoserver/waterrej/ows?" +
      new URLSearchParams({
        service: "WFS",
        version: "1.0.0",
        request: "GetFeature",
        typeName,
        outputFormat: "application/json",
        CQL_FILTER: `uid LIKE '${uidPrefix}%'`,
      });

    let matchedFeatures = [];
    try {
      const response = await fetch(wfsUrl);
      const json = await response.json();
      matchedFeatures = json.features;
      if (!matchedFeatures.length) {
        console.warn("No match found for selected MWS UID");
      }
    } catch (err) {
      console.error("WFS boundary fetch error:", err);
    }

    const featureObjs = new GeoJSON().readFeatures(
      { type: "FeatureCollection", features: matchedFeatures },
      { dataProjection: "EPSG:4326", featureProjection: view.getProjection() }
    );

    // --- Add MWS boundary layer ---
    const boundarySource = new VectorSource({ features: featureObjs });
    const boundaryLayer = new VectorLayer({
      source: boundarySource,
      style: new Style({
        stroke: new Stroke({ color: "black", width: 3 }),
        fill: null,
      }),
    });
    boundaryLayer.setZIndex(3);
    map.addLayer(boundaryLayer);

    // --- Create MultiPolygon for cropping once ---
    const multiCoords = [];
    featureObjs.forEach((f) => {
      const g = f.getGeometry();
      if (!g) return;
      if (g.getType() === "Polygon") multiCoords.push(g.getCoordinates());
      else if (g.getType() === "MultiPolygon")
        g.getCoordinates().forEach((poly) => multiCoords.push(poly));
    });
    const multiPoly = multiCoords.length ? new MultiPolygon(multiCoords) : null;

    // --- Drainage & Terrain Layers in parallel ---
    const drainageLayerName = `waterrej:WATER_REJ_drainage_line_${organizationLabel}_${projectName}_${projectId}`;
    const terrainLayerName = `WATER_REJ_terrain_${projectName}_${projectId}`;

    const [terrainLayer] = await Promise.all([
      getImageLayer(
        "waterrej",
        terrainLayerName,
        true,
        "Terrain_Style_11_Classes"
      ),
    ]);

    // --- Drainage Vector Layer ---
    const drainageColors = [
      "#03045E",
      "#023E8A",
      "#0077B6",
      "#0096C7",
      "#00B4D8",
      "#48CAE4",
      "#90E0EF",
      "#ADE8F4",
      "#CAF0F8",
    ];

    const drainageLayer = await getVectorLayers(
      "waterrej",
      `WATER_REJ_drainage_line_${organizationLabel}_${projectName}_${projectId}`,
      true,
      true,
      "drainage"
    );

    if (drainageLayer) {
      drainageLayer.setStyle((feature) => {
        const order = feature.get("ORDER") || 1;
        const color = drainageColors[order - 1] || drainageColors[0];
        return new Style({
          stroke: new Stroke({
            color,
            width: 2,
          }),
        });
      });

      drainageLayer.setZIndex(1);
      map.addLayer(drainageLayer);

      // Crop if MultiPolygon exists
      if (multiPoly) {
        const cropFilter = new Crop({
          feature: new Feature({ geometry: multiPoly }),
          wrapX: false,
          inner: false,
        });
        if (typeof drainageLayer.addFilter === "function")
          drainageLayer.addFilter(cropFilter);
      }
    }

    // --- Terrain layer ---
    terrainLayer.setOpacity(0.7);
    terrainLayer.setZIndex(0);
    map.addLayer(terrainLayer);

    if (multiPoly && typeof terrainLayer.addFilter === "function") {
      const cropFilter = new Crop({
        feature: new Feature({ geometry: multiPoly }),
        wrapX: false,
        inner: false,
      });
      terrainLayer.addFilter(cropFilter);
    }

    // --- Waterbody outlines ---
    if (geoData?.features?.length) {
      const allWaterFeatures = new GeoJSON().readFeatures(geoData, {
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:4326",
      });

      const waterSource = new VectorSource({ features: allWaterFeatures });

      if (selectedWaterbody && selectedFeature) {
        const selectedFeatureObj = new GeoJSON().readFeature(selectedFeature, {
          dataProjection: "EPSG:4326",
          featureProjection: "EPSG:4326",
        });

        const selectedWaterSource = new VectorSource({
          features: [selectedFeatureObj],
        });

        const selectedWaterLayer = new VectorLayer({
          source: selectedWaterSource,
          style: new Style({
            stroke: new Stroke({ color: "blue", width: 3 }),
            fill: null,
          }),
        });
        selectedWaterLayer.setZIndex(3);
        map.addLayer(selectedWaterLayer);

        const geometry = selectedFeatureObj.getGeometry();
        if (geometry) {
          view.fit(geometry.getExtent(), {
            padding: [50, 50, 50, 50],
            duration: 1000,
            maxZoom: 14,
          });
        }
      } else {
        const extent = waterSource.getExtent();
        view.fit(extent, {
          padding: [50, 50, 50, 50],
          duration: 1000,
          maxZoom: 18,
        });
      }
    }
  };

  // const initializeMap3 = async (organizationLabel) => {
  //   if (!organizationLabel || !projectName || !projectId) return;

  //   const baseLayer = new TileLayer({
  //     source: new XYZ({
  //       url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
  //       maxZoom: 30,
  //     }),
  //   });

  //   const view = new View({
  //     projection: "EPSG:4326",
  //     constrainResolution: true,
  //   });

  //   const map = new Map({
  //     target: mapElement3.current,
  //     layers: [baseLayer],
  //     view,
  //     loadTilesWhileAnimating: true,
  //     loadTilesWhileInteracting: true,
  //   });
  //   mapRef3.current = map;

  //   // Disable zoom interactions
  //   map.getInteractions().forEach((interaction) => {
  //     if (
  //       interaction instanceof MouseWheelZoom ||
  //       interaction instanceof PinchZoom ||
  //       interaction instanceof DoubleClickZoom
  //     ) {
  //       interaction.setActive(false);
  //     }
  //   });

  //   // --- Fetch MWS boundary from WFS (server-side filtered) ---
  //   const typeName = `waterrej:WaterRejapp_mws_${projectName}_${projectId}`;
  //   const mwsId = selectedFeature.properties.MWS_UID;
  //   // Always take first two parts of MWS_UID
  //   const uidParts = mwsId?.split("_") || [];
  //   const uidPrefix =
  //     uidParts.length >= 2 ? `${uidParts[0]}_${uidParts[1]}` : mwsId;

  //   const wfsUrl =
  //     "https://geoserver.core-stack.org:8443/geoserver/waterrej/ows?" +
  //     new URLSearchParams({
  //       service: "WFS",
  //       version: "1.0.0",
  //       request: "GetFeature",
  //       typeName,
  //       outputFormat: "application/json",
  //       CQL_FILTER: `uid LIKE '${uidPrefix}%'`,
  //     });

  //   let matchedFeatures = [];
  //   try {
  //     const response = await fetch(wfsUrl);
  //     const json = await response.json();
  //     matchedFeatures = json.features;
  //     if (!matchedFeatures.length) {
  //       console.warn("No match found for selected MWS UID");
  //     }
  //   } catch (err) {
  //     console.error("WFS boundary fetch error:", err);
  //   }

  //   const featureObjs = new GeoJSON().readFeatures(
  //     { type: "FeatureCollection", features: matchedFeatures },
  //     { dataProjection: "EPSG:4326", featureProjection: view.getProjection() }
  //   );

  //   // --- Add MWS boundary layer ---
  //   const boundarySource = new VectorSource({ features: featureObjs });
  //   const boundaryLayer = new VectorLayer({
  //     source: boundarySource,
  //     style: new Style({
  //       stroke: new Stroke({ color: "black", width: 3 }),
  //       fill: null,
  //     }),
  //   });
  //   boundaryLayer.setZIndex(3);
  //   map.addLayer(boundaryLayer);

  //   // --- Create MultiPolygon for cropping once ---
  //   const multiCoords = [];
  //   featureObjs.forEach((f) => {
  //     const g = f.getGeometry();
  //     if (!g) return;
  //     if (g.getType() === "Polygon") multiCoords.push(g.getCoordinates());
  //     else if (g.getType() === "MultiPolygon")
  //       g.getCoordinates().forEach((poly) => multiCoords.push(poly));
  //   });
  //   const multiPoly = multiCoords.length ? new MultiPolygon(multiCoords) : null;

  //   // --- Drainage & Terrain Layers in parallel ---
  //   const drainageLayerName = `waterrej:WATER_REJ_drainage_line_${organizationLabel}_${projectName}_${projectId}`;
  //   const terrainLayerName = `WATER_REJ_terrain_${projectName}_${projectId}`;

  //   const [terrainLayer] = await Promise.all([
  //     getImageLayer(
  //       "waterrej",
  //       terrainLayerName,
  //       true,
  //       "Terrain_Style_11_Classes"
  //     ),
  //   ]);

  //   // Drainage WMS
  //   const drainageLineLayer = new TileLayer({
  //     source: new TileWMS({
  //       url: "https://geoserver.core-stack.org:8443/geoserver/waterrej/wms",
  //       params: {
  //         SERVICE: "WMS",
  //         VERSION: "1.1.0",
  //         REQUEST: "GetMap",
  //         FORMAT: "image/png",
  //         TRANSPARENT: true,
  //         LAYERS: drainageLayerName,
  //         STYLES: "",
  //       },
  //       serverType: "geoserver",
  //       crossOrigin: "anonymous",
  //     }),
  //     opacity: 1,
  //   });

  //   drainageLineLayer.setZIndex(1);
  //   map.addLayer(drainageLineLayer);

  //   // Crop drainage and terrain layers if MultiPolygon exists
  //   if (multiPoly) {
  //     const cropFilter = new Crop({
  //       feature: new Feature({ geometry: multiPoly }),
  //       wrapX: false,
  //       inner: false,
  //     });
  //     if (typeof drainageLineLayer.addFilter === "function")
  //       drainageLineLayer.addFilter(cropFilter);
  //     if (typeof terrainLayer.addFilter === "function")
  //       terrainLayer.addFilter(cropFilter);
  //   }

  //   // Terrain layer
  //   terrainLayer.setOpacity(0.7);
  //   terrainLayer.setZIndex(0);
  //   map.addLayer(terrainLayer);

  //   // --- Waterbody outlines ---
  //   if (geoData?.features?.length) {
  //     const allWaterFeatures = new GeoJSON().readFeatures(geoData, {
  //       dataProjection: "EPSG:4326",
  //       featureProjection: "EPSG:4326",
  //     });

  //     // --- Blue layer for all waterbodies ---
  //     const waterSource = new VectorSource({ features: allWaterFeatures });
  //     // const waterLayer = new VectorLayer({
  //     //   source: waterSource,
  //     //   style: new Style({
  //     //     stroke: new Stroke({ color: "red", width: 2 }),
  //     //     fill: null,
  //     //   }),
  //     // });
  //     // waterLayer.setZIndex(2);
  //     // map.addLayer(waterLayer);

  //     // --- Red layer only for selected waterbody ---
  //     if (selectedWaterbody && selectedFeature) {
  //       const selectedFeatureObj = new GeoJSON().readFeature(selectedFeature, {
  //         dataProjection: "EPSG:4326",
  //         featureProjection: "EPSG:4326",
  //       });

  //       const selectedWaterSource = new VectorSource({
  //         features: [selectedFeatureObj],
  //       });

  //       const selectedWaterLayer = new VectorLayer({
  //         source: selectedWaterSource,
  //         style: new Style({
  //           stroke: new Stroke({ color: "blue", width: 3 }),
  //           fill: null,
  //         }),
  //       });
  //       selectedWaterLayer.setZIndex(3);
  //       map.addLayer(selectedWaterLayer);

  //       // --- Zoom to selected waterbody ---
  //       const geometry = selectedFeatureObj.getGeometry();
  //       if (geometry) {
  //         view.fit(geometry.getExtent(), {
  //           padding: [50, 50, 50, 50],
  //           duration: 1000,
  //           maxZoom: 14,
  //         });
  //       }
  //     } else {
  //       // Zoom to all waterbodies if none selected
  //       const extent = waterSource.getExtent();
  //       view.fit(extent, {
  //         padding: [50, 50, 50, 50],
  //         duration: 1000,
  //         maxZoom: 18,
  //       });
  //     }
  //   }
  // };

  useEffect(() => {
    if (
      view === "map" &&
      organization &&
      geoData &&
      zoiFeatures.length &&
      mwsGeoData
    ) {
      if (mapRef1.current) mapRef1.current.setTarget(null);
      if (mapRef2.current) mapRef2.current.setTarget(null);
      if (mapRef3.current) mapRef3.current.setTarget(null);

      if (mapElement1.current) initializeMap1();
      if (mapElement2.current) initializeMap2();
      if (mapElement3.current) initializeMap3(organization.label);
    }
  }, [
    view,
    organization,
    geoData,
    zoiFeatures,
    mwsGeoData,
    selectedFeature,
    selectedWaterbody,
  ]);

  useEffect(() => {
    if (selectedWaterbody) {
      if (mapElement2.current && !mapRef2.current) {
        initializeMap2();
      }
      if (mapElement3.current && !mapRef3.current && organization) {
        initializeMap3(organization.label);
      }
    }
  }, [selectedWaterbody]);

  useEffect(() => {
    if (view === "map" && selectedWaterbody && selectedFeature) {
      zoomToWaterbody(selectedWaterbody, selectedFeature, mapRef1);
      zoomToZoiWaterbody(selectedWaterbody, zoiFeatures, mapRef2);
      // zoomToMwsWaterbody(selectedWaterbody, selectedFeature, mapRef3);
    }
  }, [selectedWaterbody, selectedFeature, view]);

  const zoomToWaterbody = (waterbody, tempFeature, targetMapRef) => {
    if (!tempFeature || !targetMapRef?.current) return;

    const view = targetMapRef.current.getView();
    const feature = new GeoJSON().readFeature(tempFeature, {
      dataProjection: "EPSG:4326",
      featureProjection: view.getProjection(),
    });

    const geometry = feature.getGeometry();
    if (!geometry) {
      console.error("No geometry found.");
      return;
    }

    // --- Zoom to the selected waterbody
    const extent = geometry.getExtent();
    view.fit(extent, {
      duration: 1000,
      padding: [30, 30, 30, 30],
      maxZoom: 20,
    });

    // --- Reset all waterbodies to blue
    if (waterBodyLayer) {
      const source = waterBodyLayer.getSource();
      const features = source.getFeatures();

      features.forEach((f) => {
        f.setStyle(
          new Style({
            stroke: new Stroke({ color: "blue", width: 3 }),
          })
        );
      });

      // --- Highlight only the selected waterbody in red
      if (
        waterbody.featureIndex !== undefined &&
        features[waterbody.featureIndex]
      ) {
        features[waterbody.featureIndex].setStyle(
          new Style({
            stroke: new Stroke({ color: "#FF0000", width: 4 }),
            // fill: new Fill({ color: "rgba(255, 0, 0, 0.2)" }),
          })
        );
      }
    }

    // Disable zoom interactions if you want to lock map view
    targetMapRef.current.getInteractions().forEach((interaction) => {
      if (
        interaction instanceof MouseWheelZoom ||
        interaction instanceof PinchZoom ||
        interaction instanceof DoubleClickZoom
      ) {
        interaction.setActive(false);
      }
    });
  };

  const zoomToZoiWaterbody = (waterbody, zoiFeatures, targetMapRef) => {
    if (!waterbody || !zoiFeatures || !targetMapRef?.current) return;

    const view = targetMapRef.current.getView();

    // Find ZOI feature for this waterbody
    const matchedZoi = zoiFeatures.find(
      (f) =>
        f.get("UID")?.toLowerCase().trim() ===
        waterbody?.UID?.toLowerCase().trim()
    );
    if (!matchedZoi) {
      console.error("No matching ZOI found for", waterbody);
      return;
    }

    const geometry = matchedZoi.getGeometry();
    if (!geometry) {
      console.error("No geometry in ZOI feature");
      return;
    }

    //  Zoom to ZOI instead of waterbody
    const extent = geometry.getExtent();
    view.fit(extent, {
      duration: 1000,
      padding: [50, 50, 50, 50],
    });

    // (optional) Highlight the waterbody if needed
    if (waterBodyLayer) {
      const source = waterBodyLayer.getSource();
      const features = source.getFeatures();
      features.forEach((f) => f.setStyle(null));

      if (
        waterbody.featureIndex !== undefined &&
        features[waterbody.featureIndex]
      ) {
        features[waterbody.featureIndex].setStyle(
          new Style({
            stroke: new Stroke({ color: "#FF0000", width: 5 }),
          })
        );
      }
    }

    // Disable zoom interactions
    targetMapRef.current.getInteractions().forEach((interaction) => {
      if (
        interaction instanceof MouseWheelZoom ||
        interaction instanceof PinchZoom ||
        interaction instanceof DoubleClickZoom
      ) {
        interaction.setActive(false);
      }
    });
  };

  const handleWaterbodyClick = (row) => {
    const feature = geoData.features.find((f, idx) => idx === row.featureIndex);

    if (feature) {
      // First: extract MWS UID
      const mwsId = feature.properties?.MWS_UID;

      if (feature.geometry?.type === "MultiPolygon") {
        row.coordinates = null;
      } else if (
        feature.properties?.latitude &&
        feature.properties?.longitude
      ) {
        const coordinates = [
          feature.properties.longitude,
          feature.properties.latitude,
        ];
        row.coordinates = coordinates;
      }

      // Then: use mwsId to search MWS GeoData
      const matchingMWSFeature = mwsGeoData?.features?.find((f) =>
        mwsId?.includes(f.properties?.uid)
      );

      if (matchingMWSFeature) {
        setSelectedMWSFeature(matchingMWSFeature);
      } else {
        console.warn("No matching MWS found for:", mwsId);
      }

      setSelectedWaterbody(row);
      setSelectedFeature(feature);
      setView("map");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      console.error("Feature not found.");
    }
  };

  const handleMapBoxClick = () => {
    const matchingRow = rows.find(
      (row) => row.waterbody === mapClickedWaterbody.name
    );

    if (matchingRow) {
      handleWaterbodyClick(matchingRow);
    } else {
      console.warn("No matching row found.");
    }
  };

  return (
    <div className="relative w-full">
      <HeaderSelect
        showExtras
        organization={organization}
        project={project}
        setView={setView}
      />

      {/* Project Dashboard Text */}
      <div
        className="
  absolute top-32 left-6 z-50
    flex flex-col items-start
    text-white font-bold
    sm:top-28 md:top-32
  "
      >
        {/* Toggle Button Group */}
        <div
          className="
      flex items-center justify-between gap-2
      w-[240px] sm:w-[260px] md:w-[280px]
      px-2 py-1
      rounded-md border-2 border-black
      bg-white/40 backdrop-blur-md
      shadow-md
    "
        >
          {/* Table Button */}
          <button
            type="button"
            onClick={() => handleViewChange(null, "table")}
            className={`
        flex items-center justify-center gap-2 flex-1
        font-semibold text-black py-2 rounded
        transition-all duration-150 ease-in-out
        ${
          view === "table"
            ? "bg-white/70 shadow-inner scale-[0.99]"
            : "hover:bg-white/50 active:scale-[0.98]"
        }
      `}
          >
            <span className="text-sm sm:text-base">Table</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M3 3h18v18H3V3zm2 2v4h4V5H5zm6 0v4h4V5h-4zm6 0v4h4V5h-4zM5 11v4h4v-4H5zm6 0v4h4v-4h-4zm6 0v4h4v-4h-4zM5 17v2h4v-2H5zm6 0v2h4v-2h-4zm6 0v2h4v-2h-4z" />
            </svg>
          </button>

          {/* Map Button */}
          <button
            type="button"
            onClick={() => handleViewChange(null, "map")}
            className={`
        flex items-center justify-center gap-2 flex-1
        font-semibold text-black py-2 rounded
        transition-all duration-150 ease-in-out
        ${
          view === "map"
            ? "bg-white/70 shadow-inner scale-[0.99]"
            : "hover:bg-white/50 active:scale-[0.98]"
        }
      `}
          >
            <span className="text-sm sm:text-base">Map</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="20"
              viewBox="0 0 512 512"
              fill="currentColor"
            >
              <path
                d="M256 8C119 8 8 119 8 256s111 248 248 248 
        248-111 248-248S393 8 256 8zm82.4 368.2-17.6 17.6h-64l-32-32v-32h-32l-48-48 
        16-48 32-16v-32l32-32h32l16 16 32-32-16-48h-32l-48 16-16-16v-48l64-16 80 
        32v48l16 16 48-16 16 16v80l-32 48h-32v32l16 48-32 32z"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Conditional Rendering for Table or Map */}
      <div
        className="
    absolute
    top-[calc(20%+72px)]
    md:top-[calc(18%+64px)]
    sm:top-[calc(16%+48px)]
    left-[2.5%]
    w-[92%]
    h-auto
    bg-white
    p-5
    rounded-md
    z-[1]
  "
      >
        {view === "table" ? (
          <>
            <p className="text-center flex items-center justify-center gap-2 border-[10px] border-[#11000080] text-lg md:text-xl font-medium p-4 bg-gray-50 rounded-lg">
              <Lightbulb size={50} color="black" />
              Under the project {project?.label}, a total of{" "}
              {totalRows.toLocaleString("en-IN")} waterbodies have been
              de-silted, spanning around{" "}
              {(totalSiltRemoved || 0).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              Cu.m. After desilting, during the intervention year 2022-23, there
              was a noticeable change in the water spread area across
              agricultural seasons. The impacted area in the Rabi season is{" "}
              {projectLevelRabiImpact.toFixed(2)} hectares and the impacted area
              in the Zaid season is {projectLevelZaidImpact.toFixed(2)}{" "}
              hectares. This represents the variation in surface water extent
              following desilting interventions across different crop seasons.
            </p>

            {/* <p className="text-center flex items-center justify-center gap-2 border-[10px] border-[#11000080] text-lg md:text-xl font-medium p-4 bg-gray-50 rounded-lg">
              <Lightbulb size={50} color="black" />
              Under the project{" "}
              <span className="font-semibold">{project?.label}</span>,{" "}
              {totalRows.toLocaleString("en-IN")} waterbodies have been
              de-silted, spanning around{" "}
              {(totalSiltRemoved || 0).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              Cu.m.
            </p> */}

            <div className="mt-4 bg-white rounded-md shadow-sm overflow-x-auto">
              <table className="w-full border border-gray-200 text-sm md:text-base text-gray-800">
                <thead className="bg-gray-100 font-semibold">
                  <tr className="border-b">
                    {/* State */}
                    <th className="relative px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        State
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFilterClick(e, "state");
                          }}
                          className="p-1 hover:scale-110 transition-transform"
                        >
                          <FilterListIcon fontSize="small" />
                        </button>
                        <button
                          title="Click the Info icon for details"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInfoClick(
                              e.currentTarget,
                              "State where the waterbody is located."
                            );
                          }}
                          className="p-1 text-blue-600 hover:scale-110 transition-transform"
                        >
                          <InfoOutlinedIcon fontSize="small" />
                        </button>
                      </div>
                      {openInfoKey === "state" && (
                        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 bg-white border border-gray-300 rounded-md shadow-md p-2 text-xs text-gray-800 w-64 z-50">
                          State where the waterbody is located.
                        </div>
                      )}
                    </th>

                    {/* District */}
                    <th className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        District
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFilterClick(e, "district");
                          }}
                          className="p-1 hover:scale-110 transition-transform"
                        >
                          <FilterListIcon fontSize="small" />
                        </button>
                        <button
                          title="Click the Info icon for details"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInfoClick(
                              e.currentTarget,
                              "District in which the waterbody falls."
                            );
                          }}
                          className="p-1 text-blue-600 hover:scale-110 transition-transform"
                        >
                          <InfoOutlinedIcon fontSize="small" />
                        </button>
                      </div>
                    </th>

                    {/* Taluka */}
                    <th className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        Taluka
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFilterClick(e, "block");
                          }}
                          className="p-1 hover:scale-110 transition-transform"
                        >
                          <FilterListIcon fontSize="small" />
                        </button>
                        <button
                          title="Click the Info icon for details"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInfoClick(
                              e.currentTarget,
                              "Taluka (administrative block) in which the waterbody is located."
                            );
                          }}
                          className="p-1 text-blue-600 hover:scale-110 transition-transform"
                        >
                          <InfoOutlinedIcon fontSize="small" />
                        </button>
                      </div>
                    </th>

                    {/* GP/Village */}
                    <th className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        GP/Village
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFilterClick(e, "village");
                          }}
                          className="p-1 hover:scale-110 transition-transform"
                        >
                          <FilterListIcon fontSize="small" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInfoClick(
                              e.currentTarget,
                              "Gram Panchayat or Village where the waterbody is located."
                            );
                          }}
                          className="p-1 text-blue-600 hover:scale-110 transition-transform"
                        >
                          <InfoOutlinedIcon fontSize="small" />
                        </button>
                      </div>
                    </th>

                    {/* Waterbody + Search */}
                    <th className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center gap-1">
                          Waterbody
                          <button
                            title="Click the Info icon for details"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInfoClick(
                                e.currentTarget,
                                "Name of the waterbody being monitored."
                              );
                            }}
                            className="p-1 text-blue-600 hover:scale-110 transition-transform"
                          >
                            <InfoOutlinedIcon fontSize="small" />
                          </button>
                        </div>
                        <input
                          type="text"
                          placeholder="Search Waterbody"
                          value={waterbodySearch}
                          onChange={(e) => setWaterbodySearch(e.target.value)}
                          className="border-b border-gray-700 bg-gray-100 text-xs text-gray-700 px-1 py-0.5 w-40 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </th>

                    {/* Silt Removed */}
                    <th
                      className="px-4 py-3 text-center cursor-pointer select-none"
                      onClick={() => handleSort("siltRemoved")}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Silt Removed (Cu.m.)
                        <button
                          title="Click the Info icon for details"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInfoClick(
                              e.currentTarget,
                              "Total amount of silt removed from the waterbody, measured in cubic meters."
                            );
                          }}
                          className="p-1 text-blue-600 hover:scale-110 transition-transform"
                        >
                          <InfoOutlinedIcon fontSize="small" />
                        </button>
                        <span>
                          {sortField === "siltRemoved" && sortOrder === "asc"
                            ? "🔼"
                            : "🔽"}
                        </span>
                      </div>
                    </th>

                    {/* Intervention Year */}
                    <th className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        Intervention Year
                        <button
                          title="Click the Info icon for details"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInfoClick(
                              e.currentTarget,
                              "The year in which rejuvenation or desilting work was carried out on the waterbody."
                            );
                          }}
                          className="p-1 text-blue-600 hover:scale-110 transition-transform"
                        >
                          <InfoOutlinedIcon fontSize="small" />
                        </button>
                      </div>
                    </th>

                    {/* Size */}
                    <th className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        Size of Waterbody (in hectares)
                        <button
                          title="Click the Info icon for details"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInfoClick(
                              e.currentTarget,
                              "Total geographical area covered by the waterbody boundary, measured in hectares."
                            );
                          }}
                          className="p-1 text-blue-600 hover:scale-110 transition-transform"
                        >
                          <InfoOutlinedIcon fontSize="small" />
                        </button>
                      </div>
                    </th>

                    {/* Mean Water Availability Rabi */}
                    <th
                      className="px-4 py-3 text-center cursor-pointer select-none"
                      onClick={() => handleSort("avgWaterAvailabilityRabi")}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Mean Water Availability during Rabi (%)
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInfoClick(
                              e.currentTarget,
                              "Average percentage of water presence in the waterbody area during the Rabi season."
                            );
                          }}
                          className="p-1 text-blue-600 hover:scale-110 transition-transform"
                        >
                          <InfoOutlinedIcon fontSize="small" />
                        </button>
                        <span>
                          {sortField === "avgWaterAvailabilityRabi" &&
                          sortOrder === "asc"
                            ? "🔼"
                            : "🔽"}
                        </span>
                      </div>
                    </th>

                    {/* Mean Water Availability Zaid */}
                    <th
                      className="px-4 py-3 text-center cursor-pointer select-none"
                      onClick={() => handleSort("avgWaterAvailabilityZaid")}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Mean Water Availability during Zaid (%)
                        <button
                          title="Click the Info icon for details"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInfoClick(
                              e.currentTarget,
                              "Average percentage of water presence in the waterbody area during the Zaid (summer) season."
                            );
                          }}
                          className="p-1 text-blue-600 hover:scale-110 transition-transform"
                        >
                          <InfoOutlinedIcon fontSize="small" />
                        </button>
                        <span>
                          {sortField === "avgWaterAvailabilityZaid" &&
                          sortOrder === "asc"
                            ? "🔼"
                            : "🔽"}
                        </span>
                      </div>
                    </th>
                  </tr>
                </thead>

                <tbody className="text-sm text-gray-700">
                  {sortedRows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => handleWaterbodyClick(row)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors border-b"
                    >
                      <td className="px-4 py-5 text-center">{row.state}</td>
                      <td className="px-4 py-2 text-center">{row.district}</td>
                      <td className="px-4 py-2 text-center">{row.block}</td>
                      <td className="px-4 py-2 text-center">{row.village}</td>
                      <td className="px-4 py-2 text-center">{row.waterbody}</td>
                      <td className="px-4 py-2 text-center">
                        {row.siltRemoved}
                      </td>
                      <td className="px-4 py-2 text-center">2022-23</td>
                      <td className="px-4 py-2 text-center">
                        {row.areaOred?.toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {row.avgWaterAvailabilityRabi ?? "NA"}{" "}
                        {row.ImpactRabi && (
                          <span style={{ color: row.ImpactRabiColor }}>
                            ({row.ImpactRabi})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {row.avgWaterAvailabilityZaid ?? "NA"}{" "}
                        {row.ImpactZaid && (
                          <span style={{ color: row.ImpactZaidColor }}>
                            ({row.ImpactZaid})
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {infoOpen && infoAnchor instanceof HTMLElement && (
              <div
                className="fixed z-[9999] bg-white border border-gray-300 rounded-md shadow-md p-2 text-sm text-gray-800 max-w-xs"
                style={{
                  top:
                    infoAnchor.getBoundingClientRect().bottom +
                    window.scrollY +
                    6,
                  left: infoAnchor.getBoundingClientRect().left,
                }}
              >
                {infoText}
              </div>
            )}
          </>
        ) : view === "map" ? (
          <div className="flex flex-col gap-4 mt-2 w-full px-2 sm:px-4 md:px-6">
            {selectedWaterbody && (
              <div className="flex flex-col gap-2 w-full p-4 sm:p-6 md:p-4 rounded-xl bg-white shadow-md">
                {/* Heading */}
                <h2 className="text-xl font-bold text-blue-600 border-b-2 border-blue-600 pb-1">
                  Section 1: Water presence and land-use change in the waterbody
                </h2>

                {/* Paragraphs */}
                <p className="text-gray-600 leading-relaxed">
                  This section shows the selected waterbody, silt removal
                  details, and seasonal water availability before and after the
                  intervention, along with yearly trends of cropping patterns
                  within the waterbody boundary.
                </p>

                <p className="text-gray-600 leading-relaxed">
                  The boundary shown for the waterbody is the maximal coverage
                  ever gained by the waterbody over the last several years.
                  Depending on rainfall, water use, and other factors like
                  changes in the inlet and outlet channels of the waterbody, not
                  all of the waterbody area will see water in a given year and
                  some of the area may also get utilized for agriculture. This
                  land use in each year can be observed from the map and graphs.
                </p>

                <p className="text-gray-600 leading-relaxed">
                  Similarly, the duration of water presence can be seen in terms
                  of how much of the waterbody saw water throughout the year, or
                  during the monsoon and post-monsoon months, or only during the
                  monsoon months.
                </p>
              </div>
            )}

            <div className="flex flex-col md:flex-row items-start gap-4 w-full">
              {/* Map 1 */}
              <div
                className={`relative ${
                  selectedWaterbody ? "w-full md:w-[65%]" : "w-full"
                }`}
              >
                {!selectedWaterbody && (
                  <div
                    className="absolute top-0 left-0 right-0 
                           bg-white/90 text-center 
                           py-1 border-b border-gray-300 
                           font-semibold text-[16px] 
                           z-[1200] 
                           flex items-center justify-center gap-2"
                  >
                    To view the detailed dashboard of a waterbody, click on
                    <img
                      src="https://cdn-icons-png.flaticon.com/512/684/684908.png"
                      alt="marker"
                      className="w-5 h-5 mx-1"
                    />
                    its icon
                  </div>
                )}

                <div
                  ref={mapElement1}
                  style={{
                    height: "900px",
                    width: "100%",
                    border: "1px solid #ccc",
                    borderRadius: "5px",
                  }}
                />

                {/* Top-left Label */}
                {selectedWaterbody && (
                  <div
                    className="absolute top-4 left-4 
                       bg-white/90 p-2 sm:p-3 rounded-md 
                       font-bold shadow 
                       flex flex-col items-start gap-1 
                       z-[1000] max-w-[90%] sm:max-w-[300px]"
                  >
                    <div className="flex items-center gap-1">
                      <LocationOnIcon
                        className="text-blue-600"
                        fontSize="small"
                      />
                      <p className="font-semibold text-gray-900">
                        {selectedWaterbody?.waterbody || "Waterbody Name"}
                      </p>
                    </div>

                    <p className="text-gray-700 text-sm font-semibold">
                      Silt Removed: {selectedWaterbody?.siltRemoved || "silt"}{" "}
                      cubic metres
                    </p>

                    <p className="text-gray-700 text-sm font-semibold">
                      Area (in hectares):{" "}
                      {(selectedWaterbody?.areaOred || 0).toFixed(2)} hectares
                    </p>
                  </div>
                )}

                {/* Legend + YearSlider wrapper for responsiveness */}
                {selectedWaterbody && (
                  <div
                    className="absolute bottom-4 left-4 right-4 
                           flex flex-col sm:flex-row justify-between 
                           gap-2 flex-wrap z-[1000]"
                  >
                    {/* Collapsible Legend for Map 1 */}
                    {!waterbodyLegend ? (
                      // collapsed tab
                      <div
                        onClick={() => setWaterbodyLegend(true)}
                        className="bg-white/90 px-1.5 py-1.5 rounded-r-md shadow-md 
                                 cursor-pointer font-bold text-[13px] select-none 
                                 hover:bg-white transition"
                        style={{
                          writingMode: "vertical-rl",
                          textOrientation: "mixed",
                          borderTopLeftRadius: 0,
                          borderBottomLeftRadius: 0,
                        }}
                      >
                        Water Layer Legend ▶
                      </div>
                    ) : (
                      // expanded legend
                      <div
                        className="bg-white/90 p-4 rounded-md shadow-md flex-[1_1_180px] 
                                 min-w-[260px] max-w-[200px]"
                      >
                        {/* Header row */}
                        <div className="flex justify-between items-center">
                          <p className="text-sm font-semibold">
                            Water Layer Legend
                          </p>
                          <button
                            onClick={() => setWaterbodyLegend(false)}
                            className="border-none bg-transparent cursor-pointer text-lg hover:opacity-75"
                          >
                            ◀
                          </button>
                        </div>

                        {/* Legend items */}
                        {[
                          { color: "#74CCF4", label: "Kharif Water" },
                          { color: "#1ca3ec", label: "Kharif and Rabi Water" },
                          {
                            color: "#0f5e9c",
                            label: "Kharif, Rabi and Zaid Water",
                          },
                        ].map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 mt-2"
                          >
                            <div
                              className="w-5 h-5 border border-black opacity-70"
                              style={{ backgroundColor: item.color }}
                            ></div>
                            <p className="text-sm">{item.label}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* YearSlider */}
                    <div
                      className="bg-white/90 p-4 rounded-md shadow-md flex-shrink-0 flex-grow-0 
             min-w-[220px] sm:min-w-[300px] md:min-w-[500px]"
                    >
                      <YearSlider
                        currentLayer={{ name: "lulcWaterrej" }}
                        sliderId="map1"
                      />
                    </div>
                  </div>
                )}

                {/* Zoom Controls */}
                {selectedWaterbody && (
                  <div className="absolute top-4 right-4 flex flex-col gap-1 z-[1100]">
                    {["+", "–"].map((sign) => (
                      <button
                        key={sign}
                        className="bg-white border border-gray-300 rounded-md w-10 h-10 text-xl 
                             cursor-pointer hover:bg-gray-100 active:scale-95 transition"
                        onClick={() => {
                          const view = mapRef1.current?.getView();
                          const delta = sign === "+" ? 1 : -1;
                          view?.animate({
                            zoom: view.getZoom() + delta,
                            duration: 300,
                          });
                        }}
                      >
                        {sign}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {mapClickedWaterbody && !selectedWaterbody && (
                <div
                  onClick={handleMapBoxClick}
                  className="absolute z-[9999] w-[250px] p-2 bg-white rounded-md border border-gray-300 
                    flex flex-col gap-1 cursor-pointer shadow-md transition-all duration-200 
                    hover:shadow-xl hover:-translate-y-0.5 hover:border-[#1976d2]"
                  style={{
                    top: `${mapClickedWaterbody.pixel[1]}px`,
                    left: `${mapClickedWaterbody.pixel[0] + 15}px`,
                    transform: "translate(-50%, -100%)",
                  }}
                >
                  <p className="text-[#1976d2] font-bold border-b border-gray-200 pb-1 text-base">
                    {mapClickedWaterbody.name}
                  </p>

                  <div className="flex justify-between text-sm">
                    <p className="font-semibold text-gray-600">Village:</p>
                    <p className="font-medium text-gray-900">
                      {mapClickedWaterbody.Village ?? "NA"}
                    </p>
                  </div>

                  <div className="flex justify-between text-sm">
                    <p className="font-semibold text-gray-600">Taluka:</p>
                    <p className="font-medium text-gray-900">
                      {mapClickedWaterbody.Taluka ?? "NA"}
                    </p>
                  </div>

                  <p className="mt-1 text-[#1976d2] font-semibold text-right text-sm cursor-pointer hover:underline">
                    View details →
                  </p>
                </div>
              )}

              {/* Charts Section */}
              {selectedWaterbody && (
                <div className="w-full md:w-[45%] flex flex-col items-center gap-6 sm:gap-8 md:gap-10 lg:gap-12">
                  <div className="w-full max-w-[700px] h-[300px] sm:h-[350px] md:h-[400px] mx-auto">
                    <WaterAvailabilityChart
                      waterbody={selectedWaterbody}
                      water_rej_data={geoData}
                      mwsFeature={selectedMWSFeature}
                      onImpactYearChange={(yearData) => setImpactYear(yearData)}
                    />

                    {/* <p className="text-sm text-gray-800 mt-6 text-center">
                      <b>Black line</b> represents the year of intervention.
                    </p> */}
                  </div>

                  {selectedMWSFeature && (
                    <div className="w-full max-w-[700px] h-[300px] sm:h-[350px] md:h-[350px] mt-28 mx-auto">
                      <PrecipitationStackChart feature={selectedMWSFeature} />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ZOI Section with Map + Side Chart */}
            {selectedWaterbody && (
              <div className="flex flex-col gap-2 w-full p-2 sm:p-3 md:p-2 rounded-xl bg-white shadow-sm">
                {/* Heading */}
                <h2 className="text-xl font-bold text-blue-600 border-b-2 border-blue-600 pb-1">
                  Section 2: Cropping patterns in the Zone of Influence of the
                  waterbody
                </h2>

                {/* Explanation */}
                <p className="text-gray-600 leading-relaxed">
                  This section shows the waterbody’s zone of influence (ZoI) and
                  cropping intensities within this zone, along with the NDVI
                  values in the area.
                </p>

                <p className="text-gray-600 leading-relaxed">
                  The ZoI of the waterbody is the area impacted by the waterbody
                  through improved soil moisture or use of water for irrigation.
                  Changes before and after the intervention in cropping
                  intensities and NDVI (Normalized Difference Vegetation Index,
                  a common remotely sensed indicator of greenness) in the ZoI
                  can be seen through maps and graphs.
                </p>

                {/* <p className="text-gray-600 leading-relaxed">
                  We also show NDMI values, a soil moisture index, at increasing
                  radial distances from the waterbody.
                </p> */}
              </div>
            )}
            {selectedWaterbody && (
              <>
                <div className="flex flex-col md:flex-row items-start gap-4 w-full mt-6">
                  <div className="relative w-full md:w-[65%]">
                    <div
                      ref={mapElement2}
                      style={{
                        height: "850px",
                        width: "100%",
                        border: "1px solid #ccc",
                        borderRadius: "5px",
                      }}
                    />

                    <div className="absolute top-4 left-4 bg-white/90 px-3 py-2 rounded-md font-bold shadow-sm flex flex-col items-start gap-1 z-[1000] max-w-[90%] sm:max-w-[300px]">
                      <div className="flex items-center gap-1">
                        <LocationOnIcon className="text-blue-600 w-4 h-4" />
                        <p className="text-base font-semibold">
                          {selectedWaterbody?.waterbody || "Waterbody Name"}
                        </p>
                      </div>

                      <p className="text-sm text-gray-700 font-extrabold">
                        ZOI Area:{" "}
                        {zoiArea !== null
                          ? `${zoiArea.toFixed(2)} hectares`
                          : "NA"}
                      </p>
                    </div>

                    {/* Legend + YearSlider wrapper */}
                    <div className="absolute bottom-4 left-4 right-4 flex flex-col sm:flex-row justify-between gap-2 flex-wrap z-[1000]">
                      {/* Collapsible Legend (left side) */}
                      {!zoiLegend ? (
                        <div
                          onClick={() => setZoiLegend(true)}
                          className="bg-white/90 px-1.5 py-1.5 rounded-r-md shadow-md cursor-pointer font-bold text-[13px] select-none hover:bg-white transition"
                          style={{
                            writingMode: "vertical-rl",
                            textOrientation: "mixed",
                            borderTopLeftRadius: 0,
                            borderBottomLeftRadius: 0,
                          }}
                        >
                          Zoi Legend ▶
                        </div>
                      ) : (
                        <div className="bg-white/90 p-4 rounded-md shadow-md flex-[1_1_180px] min-w-[260px] max-w-[200px]">
                          <div className="flex justify-between items-center">
                            <p className="text-sm font-semibold">Zoi Legend</p>
                            <button
                              onClick={() => setZoiLegend(false)}
                              className="border-none bg-transparent cursor-pointer text-lg hover:opacity-75"
                            >
                              ◀
                            </button>
                          </div>

                          {[
                            { color: "#b3561d", label: "Triple Crop" },
                            { color: "#FF9371", label: "Double Crop" },
                            { color: "#f59d22", label: "Single Non-Kharif" },
                            { color: "#BAD93E", label: "Single Kharif" },
                          ].map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 mt-2"
                            >
                              <div
                                className="w-5 h-5 border border-black opacity-70"
                                style={{ backgroundColor: item.color }}
                              ></div>
                              <p className="text-sm">{item.label}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* YearSlider (right side) */}
                      <div className="bg-white/90 p-4 rounded-md shadow-md flex-shrink-0 flex-grow-0 min-w-[220px] sm:min-w-[300px] md:min-w-[500px]">
                        <YearSlider
                          currentLayer={{ name: "lulcWaterrej" }}
                          sliderId="map2"
                        />
                      </div>
                    </div>

                    {/* Zoom Controls */}
                    <div className="absolute top-4 right-4 flex flex-col gap-1 z-[1100]">
                      <button
                        className="bg-white border border-gray-300 rounded-md w-10 h-10 text-xl cursor-pointer hover:bg-gray-100 active:scale-95 transition"
                        onClick={() => {
                          const view = mapRef2.current?.getView();
                          view?.animate({
                            zoom: view.getZoom() + 1,
                            duration: 300,
                          });
                        }}
                      >
                        +
                      </button>

                      <button
                        className="bg-white border border-gray-300 rounded-md w-10 h-10 text-xl cursor-pointer hover:bg-gray-100 active:scale-95 transition"
                        onClick={() => {
                          const view = mapRef2.current?.getView();
                          view?.animate({
                            zoom: view.getZoom() - 1,
                            duration: 300,
                          });
                        }}
                      >
                        –
                      </button>
                    </div>
                  </div>

                  <div className="w-full md:w-[45%] flex flex-col items-center">
                    <div className="w-full max-w-[700px] h-[300px] sm:h-[350px] md:h-[400px]">
                      <CroppingIntensityStackChart
                        zoiFeatures={zoiFeatures}
                        waterbody={selectedWaterbody}
                        impactYear={impactYear}
                      />
                    </div>

                    <div className="w-full max-w-[700px] h-[300px] sm:h-[350px] md:h-[400px]">
                      <DroughtChart
                        feature={selectedMWSFeature}
                        waterbody={selectedWaterbody}
                      />
                      {/* <NDMIPointChart
                        zoiFeatures={zoiFeatures}
                        waterbody={selectedWaterbody}
                      /> */}
                    </div>
                  </div>
                </div>

                <div className="w-full flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                  {/* NDVI Chart (Left Side) */}
                  <div className="w-full h-[300px] sm:h-[350px] md:h-[400px]">
                    <NDVIChart
                      zoiFeatures={zoiFeatures}
                      waterbody={selectedWaterbody}
                      years={[
                        "2017",
                        "2018",
                        "2019",
                        "2020",
                        "2021",
                        "2022",
                        "2023",
                        "2024",
                      ]}
                    />
                  </div>

                  {/* Drought Chart (Right Side) */}
                  {/* {selectedMWSFeature && (
                    <div className="w-full md:w-[35%] h-[300px] sm:h-[400px] md:h-[450px]">
                      <DroughtChart
                        feature={selectedMWSFeature}
                        waterbody={selectedWaterbody}
                      />
                    </div>
                  )} */}
                </div>
              </>
            )}
            {/*MWS map section */}
            {selectedWaterbody && (
              <div className="flex flex-col gap-2 w-full p-2 sm:p-3 md:p-4 rounded-lg bg-white shadow-sm">
                {/* Heading */}
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-blue-600 border-b-2 border-blue-600 pb-1">
                  Section 3: Micro-watershed context of the waterbody and
                  Catchment area and stream position
                </h2>

                {/* Explanation Paragraphs */}
                <p className="text-gray-600 leading-relaxed">
                  This section gives the catchment area from which runoff may
                  drain into the waterbody. A larger catchment area would imply
                  a higher rainfall runoff draining into the waterbody, in turn
                  leading to more storage. This can however get impacted by
                  blocked inlet channels and other changes.
                </p>

                <p className="text-gray-600 leading-relaxed">
                  This section also gives the stream order in which the
                  waterbody lies. The stream order indicates the relative
                  position of the waterbody in the drainage network. Waterbodies
                  present in higher stream orders would typically see
                  sub-surface flows from upstream watersheds.
                </p>

                <p className="text-gray-600 leading-relaxed">
                  This map displays the micro-watershed boundary along with its
                  drainage network (blue lines), showing how water flows and is
                  distributed within the micro-watershed. The map also shows the
                  terrain in the micro-watershed.
                </p>
              </div>
            )}

            {selectedWaterbody && (
              <div className="w-full flex flex-col md:flex-row justify-between gap-3 mt-4 px-2 md:px-0">
                {[
                  {
                    label: "Max Catchment Area",
                    value: `${selectedWaterbody?.maxCatchmentArea?.toFixed(
                      2
                    )} sq km`,
                  },
                  {
                    label: "Max Stream Order",
                    value: `Order ${selectedWaterbody?.maxStreamOrder}`,
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="
          flex-1 
          bg-gradient-to-br from-gray-50 to-gray-100 
          p-4 md:p-6 
          rounded-xl 
          border border-gray-200 
          shadow-sm 
          flex flex-col items-center text-center 
          min-h-[120px]
          transition-all duration-300 
          hover:-translate-y-0.5 hover:shadow-md
        "
                  >
                    <p className="uppercase tracking-wide font-bold text-sm text-gray-800">
                      {item.label}
                    </p>
                    <p className="mt-1 text-xl md:text-2xl font-semibold text-blue-600">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col md:flex-row items-start gap-4 w-full">
              {/* Map 3 */}
              {selectedWaterbody && (
                <div className="relative w-full h-[85vh]">
                  {/* MAP */}
                  <div
                    ref={mapElement3}
                    className="w-full h-full border border-gray-300 rounded-md"
                  />

                  {/* Overlay container */}
                  <div className="absolute inset-0 z-20 pointer-events-none">
                    {/* Terrain Legend — Bottom Left */}
                    <div className="absolute left-0 bottom-0 p-4 pointer-events-auto">
                      {!terrainLegend ? (
                        <div
                          onClick={() => setTerrainLegend(true)}
                          className="bg-white/90 px-2 py-1 rounded-r-md shadow-md cursor-pointer font-bold text-gray-800 hover:bg-white transition-colors duration-150"
                          style={{
                            writingMode: "vertical-rl",
                            textOrientation: "mixed",
                          }}
                        >
                          Terrain Legend ▶
                        </div>
                      ) : (
                        <div className="bg-white/90 p-4 rounded-md shadow-md w-full max-w-xs min-w-[220px] pointer-events-auto">
                          <div className="flex justify-between items-center mb-2">
                            <p className="text-sm font-semibold">
                              Terrain Layer Legend
                            </p>
                            <button
                              onClick={() => setTerrainLegend(false)}
                              className="text-gray-700 hover:text-black transition-colors duration-150 cursor-pointer"
                            >
                              ◀
                            </button>
                          </div>

                          {[
                            {
                              color: "#313695",
                              label: "V-shape river valleys",
                            },
                            {
                              color: "#4575b4",
                              label: "Midslope incised drainages",
                            },
                            { color: "#91bfdb", label: "Local ridge/hilltops" },
                            { color: "#e0f3f8", label: "U-shape valleys" },
                            { color: "#fffc00", label: "Broad Flat Areas" },
                            { color: "#feb24c", label: "Broad open slopes" },
                            { color: "#f46d43", label: "Mesa tops" },
                            { color: "#d73027", label: "Upper Slopes" },
                            {
                              color: "#a50026",
                              label: "Upland incised drainages",
                            },
                            { color: "#800000", label: "Drainage divides" },
                            { color: "#4d0000", label: "Mountain tops" },
                          ].map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 mt-1"
                            >
                              <div
                                className="w-5 h-5 opacity-70 border border-black"
                                style={{ backgroundColor: item.color }}
                              ></div>
                              <p className="text-xs sm:text-sm">{item.label}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Zoom Controls — Top Right */}
                    <div className="absolute right-0 top-0 p-4 flex flex-col gap-2 pointer-events-auto">
                      <button
                        className="bg-white border border-gray-300 rounded-md w-10 h-10 text-xl cursor-pointer shadow-sm hover:bg-gray-50 active:scale-95 transition-transform duration-150"
                        onClick={() => {
                          const view = mapRef3.current?.getView();
                          view?.animate({
                            zoom: view.getZoom() + 1,
                            duration: 300,
                          });
                        }}
                      >
                        +
                      </button>
                      <button
                        className="bg-white border border-gray-300 rounded-md w-10 h-10 text-xl cursor-pointer shadow-sm hover:bg-gray-50 active:scale-95 transition-transform duration-150"
                        onClick={() => {
                          const view = mapRef3.current?.getView();
                          view?.animate({
                            zoom: view.getZoom() - 1,
                            duration: 300,
                          });
                        }}
                      >
                        –
                      </button>
                    </div>

                    {/*Drainage Legends */}
                    <div className="absolute right-0 bottom-0 p-4 pointer-events-auto">
                      {!drainageLegend ? (
                        <div
                          onClick={() => setDrainageLegend(true)}
                          className="bg-white/90 px-2 py-1 rounded-r-md shadow-md cursor-pointer font-bold text-gray-800 hover:bg-white transition-colors duration-150"
                          style={{
                            writingMode: "vertical-rl",
                            textOrientation: "mixed",
                          }}
                        >
                          Drainage Legend ▶
                        </div>
                      ) : (
                        <div className="bg-white/90 p-4 rounded-md shadow-md w-full max-w-xs min-w-[220px] pointer-events-auto">
                          <div className="flex justify-between items-center mb-2">
                            <p className="text-sm font-semibold">
                              Drainage Layer Legend
                            </p>
                            <button
                              onClick={() => setDrainageLegend(false)}
                              className="text-gray-700 hover:text-black transition-colors duration-150 cursor-pointer"
                            >
                              ◀
                            </button>
                          </div>

                          {[
                            {
                              color: "#03045E",
                              label: "1",
                            },
                            {
                              color: "#023E8A",
                              label: "2",
                            },
                            { color: "#0077B6", label: "3" },
                            { color: "#0096C7", label: "4" },
                            { color: "#00B4D8", label: "5" },
                            { color: "#48CAE4", label: "6" },
                            { color: "#90E0EF", label: "7" },
                            { color: "#ADE8F4", label: "8" },
                            {
                              color: "#CAF0F8",
                              label: "9",
                            },
                          ].map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 mt-1"
                            >
                              <div
                                className="w-5 h-5 opacity-70 border border-black"
                                style={{ backgroundColor: item.color }}
                              ></div>
                              <p className="text-xs sm:text-sm">{item.label}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default WaterProjectDashboard;
