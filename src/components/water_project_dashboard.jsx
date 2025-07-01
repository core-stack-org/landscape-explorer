import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
// import { yearAtom } from "../store/locationStore.jsx";
import HeaderSelect from "../components/water_headerSection";
import { useParams } from "react-router-dom";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import Map from "ol/Map";
import { Style, Fill, Stroke } from "ol/style";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import YearSlider from "./yearSlider";
import PrecipitationStackChart from "./PrecipitationStackChart.jsx";
import { yearAtomFamily } from "../store/locationStore";

import {
  Box,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  MenuItem,
  Checkbox,
  Menu,
  IconButton,
  ListItemText,
  TextField,
} from "@mui/material";
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

const useWaterRejData = (projectName, projectId) => {
  const [geoData, setGeoData] = useState(null);
  const [mwsGeoData, setMwsGeoData] = useState(null);
  const [zoiFeatures, setZoiFeatures] = useState([]);

  useEffect(() => {
    if (!projectName || !projectId) return;

    const fetchGeoJSON = async () => {
      const typeName = `waterrej:WaterRejapp-${projectName}_${projectId}`;
      const url =
        `https://geoserver.core-stack.org:8443/geoserver/waterrej/ows?` +
        new URLSearchParams({
          service: "WFS",
          version: "1.0.0",
          request: "GetFeature",
          typeName,
          outputFormat: "application/json",
        });
      console.log(url);

      try {
        const response = await fetch(url);
        if (!response.ok) {
          const errorText = await response.text();
          console.error("GeoServer error response:", errorText);
          throw new Error(`GeoServer returned status ${response.status}`);
        }

        const data = await response.json();
        setGeoData(data);
      } catch (err) {
        console.error("❌ Failed to fetch or parse GeoJSON:", err);
        setGeoData(null);
      }
    };

    fetchGeoJSON();
  }, [projectName, projectId]);

  useEffect(() => {
    if (!projectName || !projectId) return;

    const fetchMWSGeoJSON = async () => {
      const typeName = `waterrej:WaterRejapp_mws_${projectName}_${projectId}`;
      const url =
        `https://geoserver.core-stack.org:8443/geoserver/waterrej/ows?` +
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
          console.error("MWS GeoServer error response:", errorText);
          throw new Error(`GeoServer returned status ${response.status}`);
        }

        const data = await response.json();
        setMwsGeoData(data);
      } catch (err) {
        console.error("Failed to fetch or parse MWS GeoJSON:", err);
      }
    };

    fetchMWSGeoJSON();
  }, [projectName, projectId]);

  useEffect(() => {
    if (!projectName || !projectId) return;

    const zoiTypeName = `waterrej:WaterRejapp_zoi_${projectName}_${projectId}`;
    const zoiUrl =
      `https://geoserver.core-stack.org:8443/geoserver/waterrej/ows?` +
      new URLSearchParams({
        service: "WFS",
        version: "1.0.0",
        request: "GetFeature",
        typeName: zoiTypeName,
        outputFormat: "application/json",
      });

    console.log("[ZOI] Fetching from URL:", zoiUrl);

    const fetchZOI = async () => {
      try {
        const response = await fetch(zoiUrl);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("ZOI GeoServer error response:", errorText);
          throw new Error(`GeoServer returned status ${response.status}`);
        }

        const data = await response.json();

        const features = new GeoJSON().readFeatures(data, {
          dataProjection: "EPSG:4326",
          featureProjection: "EPSG:4326",
        });

        if (!features || features.length === 0) {
          console.warn("No ZOI features found");
          return;
        }

        setZoiFeatures(features);
      } catch (error) {
        console.error("Error fetching ZOI:", error);
      }
    };

    fetchZOI();
  }, [projectName, projectId]);

  return { geoData, mwsGeoData, zoiFeatures };
};

const WaterProjectDashboard = () => {
  // const { projectId } = useParams();
  const [view, setView] = useState("table");
  const [anchorEl, setAnchorEl] = useState(null);
  const [filterType, setFilterType] = useState("");

  const [selectedWaterbody, setSelectedWaterbody] = useState(null);
  const [waterBodyLayer, setWaterBodyLayer] = useState(null);
  // const lulcYear = useRecoilValue(yearAtom);
  const [currentLayer, setCurrentLayer] = useState([]);

  const [selectedFeature, setSelectedFeature] = useState(null);

  const mapElement1 = useRef();
  const mapElement2 = useRef();
  const mapRef1 = useRef();
  const mapRef2 = useRef();
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

  useEffect(() => {
    const storedOrg = sessionStorage.getItem("selectedOrganization");
    const storedProject = sessionStorage.getItem("selectedProject");

    // Only update if something changed
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
  }, [location.key]); // ✅ Triggers on actual route change

  const projectName = project?.label;
  const projectId = project?.value;

  const { geoData, mwsGeoData, zoiFeatures } = useWaterRejData(
    projectName,
    projectId
  );

  // const geoData = useWaterRejData(project, projectId);
  const { rows, totalSiltRemoved } = useMemo(() => {
    if (!geoData?.features) return { rows: [], avgSiltRemoved: 0 };

    let totalSiltRemoved = 0;

    const mappedRows = geoData.features.map((feature, index) => {
      const props = feature.properties || {};

      const geometry = feature.geometry || {};

      let coordinates = null;
      if (geometry.type === "Point") {
        coordinates = geometry.coordinates;
      } else if (geometry.type === "Polygon") {
        const coords = geometry.coordinates[0];
        if (coords?.length > 0) {
          const sumX = coords.reduce((acc, coord) => acc + coord[0], 0);
          const sumY = coords.reduce((acc, coord) => acc + coord[1], 0);
          coordinates = [sumX / coords.length, sumY / coords.length];
        }
      } else if (
        geometry.type === "LineString" &&
        geometry.coordinates?.length > 0
      ) {
        const middleIndex = Math.floor(geometry.coordinates.length / 2);
        coordinates = geometry.coordinates[middleIndex];
      }

      const seasonKeys = ["k_", "kr_", "krz_"];
      const seasonYears = [
        "17-18",
        "18-19",
        "19-20",
        "20-21",
        "21-22",
        "22-23",
        "23-24",
      ];

      let startIndex = -1;

      // Step 1: Find the first year from where we have any non-zero value in any season
      for (let i = 0; i < seasonYears.length; i++) {
        const year = seasonYears[i];

        const k = Number(props[`k_${year}`]) || 0;
        const kr = Number(props[`kr_${year}`]) || 0;
        const krz = Number(props[`krz_${year}`]) || 0;

        if (k !== 0 || kr !== 0 || krz !== 0) {
          startIndex = i;
          break;
        }
      }

      let kharifValues = [];
      let rabiValues = [];
      let zaidValues = [];
      let meanKharif = "0.00";
      let meanRabi = "0.00";
      let meanZaid = "0.00";

      if (startIndex !== -1) {
        for (let i = startIndex; i < seasonYears.length; i++) {
          const year = seasonYears[i];

          const k = Number(props[`k_${year}`]);
          const kr = Number(props[`kr_${year}`]);
          const krz = Number(props[`krz_${year}`]);

          kharifValues.push(!isNaN(k) ? k : 0);
          rabiValues.push(!isNaN(kr) ? kr : 0);
          zaidValues.push(!isNaN(krz) ? krz : 0);
        }

        const numYears = seasonYears.length - startIndex;

        meanKharif = (
          kharifValues.reduce((a, b) => a + b, 0) / numYears
        ).toFixed(2);

        meanRabi = (rabiValues.reduce((a, b) => a + b, 0) / numYears).toFixed(
          2
        );

        meanZaid = (zaidValues.reduce((a, b) => a + b, 0) / numYears).toFixed(
          2
        );
      }

      // // KHARIF
      // const kharifEntries = Object.entries(props).filter(([key]) =>
      //   /^k_\d{2}-\d{2}$/i.test(key)
      // );
      // const kharifValues = kharifEntries
      //   .map(([_, value]) => Number(value))
      //   .filter((val) => !isNaN(val));
      // // console.log(kharifValues);
      // let nonZeroStartIndexK = kharifValues.findIndex((val) => val !== 0);

      // const filteredKharifValues = kharifValues.slice(nonZeroStartIndexK);
      // // console.log(filteredKharifValues);
      // const sumFilteredKharif = filteredKharifValues.reduce(
      //   (acc, val) => acc + val,
      //   0
      // );
      // const meanFilteredKharif =
      //   filteredKharifValues.length > 0
      //     ? (sumFilteredKharif / filteredKharifValues.length).toFixed(2)
      //     : "0.00";

      // // console.log("Mean of filteredKharifValues:", meanFilteredKharif);

      // const sumKharif = kharifValues.reduce((acc, val) => acc + val, 0);
      // const avgKharif = (sumKharif / 7).toFixed(2);

      // // RABI
      // const rabiEntries = Object.entries(props).filter(([key]) =>
      //   /^kr_\d{2}-\d{2}$/i.test(key)
      // );
      // const rabiValues = rabiEntries
      //   .map(([_, value]) => Number(value))
      //   .filter((val) => !isNaN(val));

      // let nonZeroStartIndexR = rabiValues.findIndex((val) => val !== 0);

      // const filteredRabiValues = rabiValues.slice(nonZeroStartIndexR);
      // // console.log(filteredRabiValues);
      // const sumFilteredRabi = filteredRabiValues.reduce(
      //   (acc, val) => acc + val,
      //   0
      // );
      // const meanFilteredRabi =
      //   filteredRabiValues.length > 0
      //     ? (sumFilteredRabi / filteredRabiValues.length).toFixed(2)
      //     : "0.00";

      // // console.log("Mean of filteredRabiValues:", meanFilteredRabi);

      // const sumRabi = rabiValues.reduce((acc, val) => acc + val, 0);
      // const avgRabi = (sumRabi / 7).toFixed(2);

      // // ZAID
      // const zaidEntries = Object.entries(props).filter(([key]) =>
      //   /^krz_\d{2}-\d{2}$/i.test(key)
      // );
      // const zaidValues = zaidEntries
      //   .map(([_, value]) => Number(value))
      //   .filter((val) => !isNaN(val));

      // let nonZeroStartIndexZ = zaidValues.findIndex((val) => val !== 0);

      // const filteredZaidValues = zaidValues.slice(nonZeroStartIndexZ);
      // // console.log(filteredZaidValues);
      // const sumFilteredzaid = filteredZaidValues.reduce(
      //   (acc, val) => acc + val,
      //   0
      // );
      // const meanFilteredZaid =
      //   filteredZaidValues.length > 0
      //     ? (sumFilteredzaid / filteredZaidValues.length).toFixed(2)
      //     : "0.00";

      // // console.log("Mean of filteredZaidValues:", meanFilteredZaid);

      // const sumZaid = zaidValues.reduce((acc, val) => acc + val, 0);
      // const avgZaid = (sumZaid / 7).toFixed(2);

      // Parse silt removed safely, default to 0 if missing or NaN

      const siltRemoved = Number(props.slit_excavated) || 0;
      totalSiltRemoved += siltRemoved;

      return {
        id: index + 1,
        state: props.State || "NA",
        district: props.District || "NA",
        block: props.Taluka || "NA",
        village: props.village || "NA",
        waterbody: props.waterbody_name || "NA",
        siltRemoved,
        avgWaterAvailabilityKharif: meanKharif,
        avgWaterAvailabilityRabi: meanRabi,
        avgWaterAvailabilityZaid: meanZaid,
        areaOred: props.area_ored || 0,
        // avgWaterAvailabilityKharif: avgKharif,
        // avgWaterAvailabilityRabi: avgRabi,
        // avgWaterAvailabilityZaid: avgZaid,

        coordinates,
        featureIndex: index,
      };
    });

    const avgSiltRemoved = mappedRows.length
      ? totalSiltRemoved / mappedRows.length
      : 0;

    return { rows: mappedRows, totalSiltRemoved };
  }, [geoData]);

  const totalRows = rows.length;

  const [year, setYear] = useState(2024);
  const handleYearChange = (newYear) => setYear(newYear);

  const [filters, setFilters] = useState({
    state: [],
    district: [],
    block: [],
    village: [],
  });

  const handleFilterChange = (type, option) => {
    setFilters((prev) => {
      const prevOptions = prev[type] || [];
      const isSelected = prevOptions.includes(option);
      let updatedOptions;
      if (isSelected) {
        updatedOptions = prevOptions.filter((o) => o !== option);
      } else {
        updatedOptions = [...prevOptions, option];
      }
      return {
        ...prev,
        [type]: updatedOptions,
      };
    });
  };

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
      if (!lulcYear1 || !lulcYear1.includes("_")) {
        console.warn("[LULC] Invalid lulcYear:", lulcYear1);
        return;
      }

      if (!project || typeof project !== "object") {
        console.error("[LULC] Invalid project object:", project);
        return;
      }

      const fullYear = lulcYear1
        .split("_")
        .map((part) => `20${part}`)
        .join("_")
        .toLowerCase()
        .replace(/\s/g, "_");

      const projectName = project.label;
      const projectId = project.value;

      const layerName = `clipped_lulc_filtered_mws_${projectName}_${projectId}_${fullYear}`;
      const uniqueLayerId = "lulcWaterrejLayer1";

      if (mapRef1.current) {
        const layersBefore = mapRef1.current.getLayers().getArray();

        layersBefore.forEach((layer) => {
          if (layer.get("id") === uniqueLayerId) {
            mapRef1.current.removeLayer(layer);
          }
        });
      }

      const newLayer = await getImageLayer(
        "waterrej",
        layerName,
        true,
        "lulc_water_pixels"
      );

      newLayer.setZIndex(0);
      newLayer.set("id", uniqueLayerId);

      if (mapRef1.current) {
        mapRef1.current.addLayer(newLayer);
      }

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
                fill: new Fill({ color: "rgba(255, 0, 0, 0.3)" }),
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

  useEffect(() => {
    const fetchUpdateLulcZOI = async () => {
      if (!lulcYear2 || !lulcYear2.includes("_")) {
        console.warn("Invalid lulcYear:", lulcYear2);
        return;
      }

      if (currentLayer !== null && currentLayer.length > 0) {
        let tempArr = [...currentLayer];
        let tempLen = tempArr.length;

        for (let i = 0; i < tempLen; ++i) {
          if (tempArr[i].name === "lulcWaterrejZOI") {
            if (mapRef2.current && tempArr[i].layerRef?.[0]) {
              mapRef2.current.removeLayer(tempArr[i].layerRef[0]);
            }

            const fullYear = lulcYear2
              .split("_")
              .map((part) => `20${part}`)
              .join("_")
              .toLowerCase()
              .replace(/\s/g, "_");

            if (!project || typeof project !== "object") {
              console.error("Invalid project object:", project);
              return;
            }

            const projectName = project.label;
            const projectId = project.value;

            const layerName = `clipped_lulc_filtered_mws_${projectName}_${projectId}_${fullYear}`;

            let tempLayer = await getImageLayer(
              "waterrej",
              layerName,
              true,
              "lulc_water_pixels"
            );
            tempLayer.setZIndex(1);
            if (mapRef2.current) {
              mapRef2.current.addLayer(tempLayer);
            }

            const fetchZOI = async () => {
              try {
                const response = await fetch(
                  "https://geoserver.core-stack.org:8443/geoserver/waterrej/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=waterrej%3AWaterRejapp_zoi_ATCEF_MP_CHATTARPUR_15&outputFormat=application%2Fjson"
                );
                const data = await response.json();
                const features = new GeoJSON().readFeatures(data, {
                  dataProjection: "EPSG:4326",
                  featureProjection: "EPSG:4326",
                });

                return features || [];
              } catch (err) {
                console.error("Failed to fetch ZOI:", err);
                return [];
              }
            };

            const zoiFeatures = await fetchZOI();

            if (zoiFeatures.length > 0) {
              const zoiLayer = new VectorLayer({
                source: new VectorSource({ features: zoiFeatures }),
                style: new Style({
                  stroke: new Stroke({ color: "yellow", width: 2 }),
                  fill: new Fill({ color: "rgba(255, 255, 153, 0.3)" }),
                }),
              });
              zoiLayer.setZIndex(0);
              mapRef2.current.addLayer(zoiLayer);

              zoiFeatures.forEach((feature) => {
                const crop = new Crop({
                  feature,
                  wrapX: true,
                  inner: false,
                });
                // tempLayer.addFilter(crop);
              });
            }

            tempArr[i].layerRef[0] = tempLayer;
          }
        }

        setCurrentLayer(tempArr);

        if (selectedWaterbody?.geometry && mapRef2.current && waterBodyLayer) {
          const source = waterBodyLayer.getSource();
          const features = source.getFeatures();

          features.forEach((feature) => feature.setStyle(null));

          const extent = selectedWaterbody.geometry.getExtent();

          mapRef2.current.getView().fit(extent, {
            padding: [40, 40, 40, 40],
            duration: 500,
            maxZoom: 15,
          });

          features.forEach((feature) => {
            if (feature.getGeometry().intersectsExtent(extent)) {
              feature.setStyle(
                new Style({
                  stroke: new Stroke({ color: "#FF0000", width: 5 }),
                  fill: new Fill({ color: "rgba(255, 0, 0, 0.3)" }),
                })
              );
            }
          });
        }
      } else {
        setCurrentLayer([{ name: "lulcWaterrejZOI", layerRef: [] }]);
      }
    };

    fetchUpdateLulcZOI().catch(console.error);
  }, [lulcYear2, selectedWaterbody, waterBodyLayer, project]);

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
    // First: global searchText (any field)
    const matchesGlobalSearch = Object.keys(row).some((key) => {
      if (!row[key]) return false;
      if (typeof row[key] === "object") return false; // skip objects like coordinates
      return row[key]
        .toString()
        .toLowerCase()
        .includes(searchText.toLowerCase());
    });

    // Second: your existing filters object per field
    const matchesFilters = Object.keys(filters).every((key) => {
      if (filters[key].length === 0) return true;
      return filters[key].includes(String(row[key]));
    });

    // Third: waterbodySearch only on waterbody column
    const matchesWaterbodySearch = row.waterbody
      ?.toString()
      .toLowerCase()
      .includes(waterbodySearch.toLowerCase());

    // Final combined condition:
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
        maxZoom: 30,
        transition: 500,
        zoom: 18,
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

    const waterBodyLayerSecond = new VectorLayer({
      source: vectorLayerWater,
      style: new Style({
        stroke: new Stroke({ color: "#ff0000", width: 5 }),
        // fill: new Fill({ color: "rgba(100, 149, 237, 0.5)" }),
      }),
    });
    waterBodyLayerSecond.setZIndex(1);

    map.addLayer(waterBodyLayerSecond);
    setWaterBodyLayer(waterBodyLayerSecond);

    const features = vectorLayerWater.getFeatures();
    if (!selectedWaterbody && features.length > 0) {
      const extent = vectorLayerWater.getExtent();
      view.fit(extent, {
        padding: [50, 50, 50, 50],
        duration: 1000,
        maxZoom: 35,
        zoom: 18,
      });
    }

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

    // Create the same waterBodyLayer using geoData
    const vectorSource = new VectorSource({
      features: new GeoJSON({
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:4326",
      }).readFeatures(geoData),
    });

    const waterBodyLayer2 = new VectorLayer({
      source: vectorSource,
      style: new Style({
        stroke: new Stroke({ color: "#ff0000", width: 5 }),
      }),
    });

    map.addLayer(waterBodyLayer2);

    const features = vectorSource.getFeatures();

    if (selectedWaterbody && selectedFeature) {
      // Zoom to the selected waterbody's geometry (just like map 1)
      const feature = new GeoJSON().readFeature(selectedFeature, {
        dataProjection: "EPSG:4326",
        featureProjection: view.getProjection(),
      });

      const geometry = feature.getGeometry();
      if (geometry) {
        view.fit(geometry.getExtent(), {
          duration: 1000,
          padding: [50, 50, 50, 50],
          maxZoom: 18,
        });
      }
    } else if (features.length > 0) {
      // fallback: zoom to all features
      const extent = vectorSource.getExtent();
      view.fit(extent, {
        padding: [50, 50, 50, 50],
        duration: 1000,
        maxZoom: 18,
      });
    }
  };

  useEffect(() => {
    if (view === "map") {
      if (mapElement1.current) initializeMap1();
      if (mapElement2.current) initializeMap2();
    }

    return () => {
      if (mapRef1.current) mapRef1.current.setTarget(null);
      if (mapRef2.current) mapRef2.current.setTarget(null);
    };
  }, [view]);

  useEffect(() => {
    if (view === "map" && selectedWaterbody && selectedFeature) {
      zoomToWaterbody(selectedWaterbody, selectedFeature, mapRef1);
      zoomToWaterbody(selectedWaterbody, selectedFeature, mapRef2);
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

    const extent = geometry.getExtent();
    view.fit(extent, {
      duration: 1000,
      padding: [50, 50, 50, 50],
      maxZoom: 18,
    });

    if (waterBodyLayer) {
      const source = waterBodyLayer.getSource();
      const features = source.getFeatures();

      features.forEach((feature) => feature.setStyle(null));

      if (
        waterbody.featureIndex !== undefined &&
        features[waterbody.featureIndex]
      ) {
        features[waterbody.featureIndex].setStyle(
          new Style({
            stroke: new Stroke({ color: "#FF0000", width: 5 }),
            fill: new Fill({ color: "rgba(255, 0, 0, 0.5)" }),
          })
        );
      }
    }

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
      console.log(mwsId);

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
      const matchingMWSFeature = mwsGeoData?.features?.find(
        (f) => f.properties?.uid === mwsId
      );

      if (matchingMWSFeature) {
        console.log(
          "✅ Matching MWS Feature:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqeeeeeeeeeeeeee",
          matchingMWSFeature
        );
        setSelectedMWSFeature(matchingMWSFeature);
      } else {
        console.warn("❌ No matching MWS found for:", mwsId);
      }

      setSelectedWaterbody(row);
      setSelectedFeature(feature);
      setView("map");
    } else {
      console.error("Feature not found.");
    }
  };

  const downloadCSV = () => {
    if (!sortedRows || sortedRows.length === 0) {
      return;
    }

    const headers = [
      "State",
      "District",
      "Taluka",
      "GP/Village",
      "Waterbody",
      "Silt Removed (Cu.m.)",
      "Mean Water Availability During Kharif (%)",
      "Mean Water Availability During Rabi (%)",
      "Mean Water Availability During Zaid (%)",
    ];

    const csvRows = [
      headers.join(","),
      ...sortedRows.map((row) =>
        [
          row.state,
          row.district,
          row.block,
          row.village,
          row.waterbody,
          row.siltRemoved,
          row.avgWaterAvailabilityKharif,
          row.avgWaterAvailabilityRabi,
          row.avgWaterAvailabilityZaid,
        ]
          .map((cell) => `"${cell}"`)
          .join(",")
      ),
    ];
    let parsedProject;
    try {
      parsedProject = JSON.parse(project);
    } catch (err) {
      console.error("Failed to parse project string:", err);
      return;
    }

    const projectName = parsedProject.label;
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    const fileName = `${projectName}_waterbodies_report.csv`;
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Box sx={{ position: "relative" }}>
      <HeaderSelect
        showExtras
        organization={organization}
        project={project}
        setView={setView}
      />

      {/* Project Dashboard Text */}
      <Box
        sx={{
          position: "absolute",
          top: "20%",
          left: "12%",
          transform: "translate(-50%, -50%)",
          zIndex: 1,
          color: "white",
          fontSize: "2rem",
          fontWeight: "bold",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Toggle Button Group */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            marginTop: 2,
          }}
        >
          <ToggleButtonGroup
            value={view}
            exclusive
            onChange={handleViewChange}
            sx={{
              backgroundColor: "rgba(255, 255, 255, 0.3)",
              borderRadius: "5px",
              border: "2px solid black",
              width: "280px",
              px: 2,
              py: 1,
              justifyContent: "space-between",
              display: "flex",
            }}
          >
            <ToggleButton
              value="table"
              sx={{ color: "black", gap: 1, flex: 1, justifyContent: "center" }}
            >
              Table
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="20"
                viewBox="0 0 24 24"
                fill="black"
              >
                <path d="M3 3h18v18H3V3zm2 2v4h4V5H5zm6 0v4h4V5h-4zm6 0v4h4V5h-4zM5 11v4h4v-4H5zm6 0v4h4v-4h-4zm6 0v4h4v-4h-4zM5 17v2h4v-2H5zm6 0v2h4v-2h-4zm6 0v2h4v-2h-4z" />
              </svg>
            </ToggleButton>

            <ToggleButton
              value="map"
              sx={{ color: "black", gap: 1, flex: 1, justifyContent: "center" }}
            >
              Map
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="20"
                viewBox="0 0 512 512"
                fill="black"
              >
                <path
                  d="M256 8C119 8 8 119 8 256s111 248 248 248 
 248-111 248-248S393 8 256 8zm82.4 368.2-17.6 17.6h-64l-32-32v-32h-32l-48-48 
 16-48 32-16v-32l32-32h32l16 16 32-32-16-48h-32l-48 16-16-16v-48l64-16 80 
 32v48l16 16 48-16 16 16v80l-32 48h-32v32l16 48-32 32z"
                />
              </svg>
            </ToggleButton>
          </ToggleButtonGroup>

          {/* Download Icon */}
          <Box
            sx={{
              p: 1.2,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "88px",
              width: "48px",
            }}
            onClick={downloadCSV}
          >
            <Download size={94} strokeWidth={1.2} color="black" />
          </Box>
        </Box>
      </Box>

      {/* Conditional Rendering for Table or Map */}
      <Box
        sx={{
          position: "absolute",
          top: "calc(20% + 88px + 16px)",
          left: "2.5%",
          width: "92%",
          height: "auto",
          backgroundColor: "white",
          padding: "20px",
          borderRadius: "5px",
          zIndex: 1,
        }}
      >
        {view === "table" ? (
          <>
            <Typography
              variant="h6"
              sx={{
                textAlign: "center",
                display: "flex",
                alignItems: "center",
                gap: 2,
                border: "10px solid #11000080",
              }}
            >
              <Lightbulb size={94} color="black" />
              Under the project {project?.label}, {totalRows} waterbodies have
              been de-silted, spanning around{" "}
              {(totalSiltRemoved || 0).toFixed(2)} Cu.m.
              {/* On average, the surface
              water availability during summer season has changed from 16% to
              25%. */}
            </Typography>
            <TableContainer component={Paper} sx={{ mt: 4, boxShadow: 0 }}>
              <Table>
                <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
                  <TableRow>
                    <TableCell>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        State
                        <IconButton
                          onClick={(e) => handleFilterClick(e, "state")}
                          size="small"
                        >
                          <FilterListIcon fontSize="small" />
                        </IconButton>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        District
                        <IconButton
                          onClick={(e) => handleFilterClick(e, "district")}
                          size="small"
                        >
                          <FilterListIcon fontSize="small" />
                        </IconButton>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        Taluka
                        <IconButton
                          onClick={(e) => handleFilterClick(e, "block")}
                          size="small"
                        >
                          <FilterListIcon fontSize="small" />
                        </IconButton>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        GP/Village
                        <IconButton
                          onClick={(e) => handleFilterClick(e, "village")}
                          size="small"
                        >
                          <FilterListIcon fontSize="small" />
                        </IconButton>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span>Waterbody</span>
                        <TextField
                          variant="standard"
                          placeholder="Search Waterbody"
                          value={waterbodySearch}
                          onChange={(e) => setWaterbodySearch(e.target.value)}
                          size="small"
                          InputProps={{ style: { fontSize: 12 } }}
                        />
                      </div>
                    </TableCell>

                    {/* Silt Removed Column */}
                    <TableCell
                      onClick={() => handleSort("siltRemoved")}
                      sx={{ cursor: "pointer", userSelect: "none" }}
                    >
                      <div style={{ display: "flex", alignItems: "center" }}>
                        Silt Removed (Cu.m.)
                        <span
                          style={{
                            marginLeft: 4,
                            fontWeight:
                              sortField === "siltRemoved" ? "bold" : "normal",
                          }}
                        >
                          {sortField === "siltRemoved" && sortOrder === "asc"
                            ? "🔼"
                            : "🔽"}
                        </span>
                      </div>
                    </TableCell>

                    {/* Water Availability Column */}

                    <TableCell
                      onClick={() => handleSort("avgWaterAvailabilityKharif")}
                      sx={{ cursor: "pointer", userSelect: "none" }}
                    >
                      <div style={{ display: "flex", alignItems: "center" }}>
                        Mean Water Availability During Kharif (%)
                        <span
                          style={{
                            marginLeft: 4,
                            fontWeight:
                              sortField === "avgWaterAvailabilityKharif"
                                ? "bold"
                                : "normal",
                          }}
                        >
                          {sortField === "avgWaterAvailabilityKharif" &&
                          sortOrder === "asc"
                            ? "🔼"
                            : "🔽"}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell
                      onClick={() => handleSort("avgWaterAvailabilityRabi")}
                      sx={{ cursor: "pointer", userSelect: "none" }}
                    >
                      <div style={{ display: "flex", alignItems: "center" }}>
                        Mean Water Availability During Rabi (%)
                        <span
                          style={{
                            marginLeft: 4,
                            fontWeight:
                              sortField === "avgWaterAvailabilityRabi"
                                ? "bold"
                                : "normal",
                          }}
                        >
                          {sortField === "avgWaterAvailabilityRabi" &&
                          sortOrder === "asc"
                            ? "🔼"
                            : "🔽"}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell
                      onClick={() => handleSort("avgWaterAvailabilityZaid")}
                      sx={{ cursor: "pointer", userSelect: "none" }}
                    >
                      <div style={{ display: "flex", alignItems: "center" }}>
                        Mean Water Availability During Zaid (%)
                        <span
                          style={{
                            marginLeft: 4,
                            fontWeight:
                              sortField === "avgWaterAvailabilityZaid"
                                ? "bold"
                                : "normal",
                          }}
                        >
                          {sortField === "avgWaterAvailabilityZaid" &&
                          sortOrder === "asc"
                            ? "🔼"
                            : "🔽"}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {sortedRows.map((row) => (
                    <TableRow
                      key={row.id}
                      hover
                      sx={{ cursor: "pointer" }}
                      onClick={() => handleWaterbodyClick(row)}
                    >
                      <TableCell>{row.state}</TableCell>
                      <TableCell>{row.district}</TableCell>
                      <TableCell>{row.block}</TableCell>
                      <TableCell>{row.village}</TableCell>{" "}
                      <TableCell>{row.waterbody}</TableCell>
                      <TableCell>{row.siltRemoved}</TableCell>
                      <TableCell>
                        {row.avgWaterAvailabilityKharif ?? "NA"}
                      </TableCell>
                      <TableCell>
                        {row.avgWaterAvailabilityRabi ?? "NA"}
                      </TableCell>
                      <TableCell>
                        {row.avgWaterAvailabilityZaid ?? "NA"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleFilterClose}
              >
                <TextField
                  size="small"
                  placeholder="Search..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  sx={{ marginBottom: "16px" }}
                />

                <MenuItem onClick={() => handleClearSingleFilter(filterType)}>
                  Clear {filterType} Filter
                </MenuItem>

                {Array.from(new Set(rows.map((row) => String(row[filterType]))))
                  .filter((option) => {
                    // To make sure we are handling first letter case properly:
                    return option
                      .toLowerCase()
                      .startsWith(searchText.toLowerCase());
                  })
                  .map((option) => (
                    <MenuItem
                      key={option}
                      onClick={() => handleFilterChange(filterType, option)}
                    >
                      <Checkbox
                        size="small"
                        checked={filters[filterType]?.includes(option)}
                      />
                      <ListItemText primary={option} />
                    </MenuItem>
                  ))}
              </Menu>
            </TableContainer>
          </>
        ) : view === "map" ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              mt: 2,
              width: "100%",
              px: { xs: 2, sm: 4, md: 6 },
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                alignItems: "flex-start",
                gap: 4,
                width: "100%",
              }}
            >
              {/* Map 1 */}
              <Box
                sx={{
                  position: "relative",
                  width: { xs: "100%", md: "65%" },
                }}
              >
                <div
                  ref={mapElement1}
                  style={{
                    height: "850px",
                    width: "100%",
                    border: "1px solid #ccc",
                    borderRadius: "5px",
                  }}
                />
                {/* Top-left Label */}
                <Box
                  sx={{
                    position: "absolute",
                    top: 16,
                    left: 16,
                    backgroundColor: "rgba(255, 255, 255, 0.9)",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    fontWeight: "bold",
                    boxShadow: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: 1,
                  }}
                >
                  <Box display="flex" alignItems="center" gap={1}>
                    <LocationOnIcon fontSize="small" color="primary" />
                    <Typography variant="body1" fontWeight={600}>
                      {selectedWaterbody?.waterbody || "Waterbody Name"}
                    </Typography>
                  </Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    fontWeight={800}
                  >
                    Silt Removed: {selectedWaterbody?.siltRemoved || "silt"}{" "}
                    cubic metre
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    fontWeight={800}
                  >
                    Area (in hectare):{" "}
                    {(selectedWaterbody?.areaOred || 0).toFixed(2)} hectares
                  </Typography>
                </Box>

                {/* Legend */}
                <Box
                  sx={{
                    position: "absolute",
                    bottom: 16,
                    left: 16,
                    backgroundColor: "rgba(255, 255, 255, 0.9)",
                    padding: 2,
                    borderRadius: 1,
                    boxShadow: 2,
                  }}
                >
                  <Typography variant="subtitle2">
                    Water Layer Legend
                  </Typography>
                  {[
                    { color: "#74CCF4", label: "Kharif Water" },
                    { color: "#1ca3ec", label: "Kharif and Rabi Water" },
                    { color: "#0f5e9c", label: "Kharif, Rabi and Zaid Water" },
                  ].map((item, idx) => (
                    <Box
                      key={idx}
                      display="flex"
                      alignItems="center"
                      gap={1}
                      mt={1}
                    >
                      <Box
                        sx={{
                          width: 20,
                          height: 20,
                          backgroundColor: item.color,
                          opacity: 0.7,
                          border: "1px solid #000",
                        }}
                      />
                      <Typography variant="body2">{item.label}</Typography>
                    </Box>
                  ))}
                </Box>

                {/* YearSlider */}
                <Box
                  sx={{
                    position: "absolute",
                    bottom: 16,
                    right: 16,
                    backgroundColor: "rgba(255, 255, 255, 0.9)",
                    padding: 2,
                    borderRadius: 1,
                    boxShadow: 2,
                    zIndex: 1000,
                    minWidth: "500px",
                  }}
                >
                  <YearSlider
                    currentLayer={{ name: "lulcWaterrej" }}
                    sliderId="map1"
                  />
                </Box>

                {/* Zoom Controls */}
                <Box
                  sx={{
                    position: "absolute",
                    top: 80,
                    right: 16,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                    zIndex: 1100,
                  }}
                >
                  <button
                    style={{
                      backgroundColor: "#fff",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      width: "40px",
                      height: "40px",
                      fontSize: "20px",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      const view = mapRef1.current?.getView();
                      view?.animate({
                        zoom: view.getZoom() + 1,
                        duration: 300,
                      });
                    }}
                  >
                    +
                  </button>
                  <button
                    style={{
                      backgroundColor: "#fff",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      width: "40px",
                      height: "40px",
                      fontSize: "20px",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      const view = mapRef1.current?.getView();
                      view?.animate({
                        zoom: view.getZoom() - 1,
                        duration: 300,
                      });
                    }}
                  >
                    –
                  </button>
                </Box>
              </Box>

              {/* Charts Section */}
              <Box
                sx={{
                  width: { xs: "100%", md: "45%" },
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  alignItems: "center",
                }}
              >
                {selectedWaterbody && (
                  <Box sx={{ width: "700px", height: "400px" }}>
                    <WaterAvailabilityChart
                      waterbody={selectedWaterbody}
                      water_rej_data={geoData}
                    />
                    This <b>Black line</b> represents the year of intervention.
                    {/* <Typography fontSize={14} color="#333">
                      The{" "}
                      <Box
                        component="span"
                        fontWeight="bold"
                        color="black"
                        display="inline"
                      >
                        black line
                      </Box>{" "}
                      represents the year of intervention.
                    </Typography> */}
                  </Box>
                )}

                {selectedMWSFeature && (
                  <Box
                    sx={{ width: "700px", height: "400px", marginTop: "1%" }}
                  >
                    <PrecipitationStackChart feature={selectedMWSFeature} />
                  </Box>
                )}
              </Box>
            </Box>

            {/* Map 2 (ZOI Map) */}
            <Box
              sx={{
                position: "relative",
                width: "100%",
                maxWidth: "100%",
              }}
            >
              <div
                ref={mapElement2}
                style={{
                  height: "800px",
                  width: "100%",
                  border: "1px solid #ccc",
                  borderRadius: "5px",
                }}
              />
              {/* YearSlider */}
              <Box
                sx={{
                  position: "absolute",
                  bottom: 16,
                  right: 16,
                  backgroundColor: "rgba(255, 255, 255, 0.9)",
                  padding: 2,
                  borderRadius: 1,
                  boxShadow: 2,
                  zIndex: 1000,
                  minWidth: "500px",
                }}
              >
                <YearSlider
                  currentLayer={{ name: "lulcWaterrej" }}
                  sliderId="map2"
                />
              </Box>

              {/* Zoom Controls */}
              <Box
                sx={{
                  position: "absolute",
                  top: 80,
                  right: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                  zIndex: 1100,
                }}
              >
                <button
                  style={{
                    backgroundColor: "#fff",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    width: "40px",
                    height: "40px",
                    fontSize: "20px",
                    cursor: "pointer",
                  }}
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
                  style={{
                    backgroundColor: "#fff",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    width: "40px",
                    height: "40px",
                    fontSize: "20px",
                    cursor: "pointer",
                  }}
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
              </Box>
            </Box>
          </Box>
        ) : null}
      </Box>
    </Box>
  );
};

export default WaterProjectDashboard;
