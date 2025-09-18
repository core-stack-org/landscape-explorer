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

import LocationOnIcon from "@mui/icons-material/LocationOn";
import YearSlider from "./yearSlider";
import PrecipitationStackChart from "./PrecipitationStackChart.jsx";
import CroppingIntensityStackChart from "./CroppingIntensityStackChart.jsx";
import { yearAtomFamily } from "../store/locationStore";
import NDVIChart from "./NDVIChart.jsx";
// import DroughtChart from "./droughtchart.jsx";
import Overlay from "ol/Overlay";

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
  Popover,
  Tooltip,
} from "@mui/material";
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
  const [infoText, setInfoText] = useState("");
  const [infoAnchorEl, setInfoAnchorEl] = useState(null);

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
  const handleInfoClick = (anchor, text) => {
    setInfoAnchorEl(anchor); // anchor should be e.currentTarget (DOM element)
    setInfoText(text);
  };

  const handleInfoClose = () => {
    setInfoAnchorEl(null);
    setInfoText("");
  };

  const infoOpen = Boolean(infoAnchorEl);

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
  console.log(organization?.label);

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

  const { geoData, mwsGeoData, zoiFeatures } = useWaterRejData(
    projectName,
    projectId
  );

  console.log(zoiFeatures);
  const yearMap = {
    "17-18": 2017,
    "18-19": 2018,
    "19-20": 2019,
    "20-21": 2020,
    "21-22": 2021,
    "22-23": 2022,
    "23-24": 2023,
  };

  const { rows, totalSiltRemoved } = useMemo(() => {
    console.log(zoiFeatures);
    if (!geoData?.features) return { rows: [], avgSiltRemoved: 0 };

    let totalSiltRemoved = 0;

    const mappedRows = geoData.features.map((feature, index) => {
      const props = feature.properties || {};
      const waterbodyName = props.waterbody_name || "NA";
      const matchedZoi = zoiFeatures.find(
        (f) =>
          f.get("waterbody_name")?.toLowerCase().trim() ===
          waterbodyName?.toLowerCase().trim()
      );

      let avgDouble = "NA";
      let avgTriple = "NA";

      if (matchedZoi) {
        const doubleVals = [];
        const tripleVals = [];

        for (let year = 2017; year <= 2023; year++) {
          const d = matchedZoi.get(`doubly_cropped_area_${year}`);
          const t = matchedZoi.get(`triply_cropped_area_${year}`);
          if (d !== undefined && d !== null) doubleVals.push(Number(d));
          if (t !== undefined && t !== null) tripleVals.push(Number(t));
        }

        if (doubleVals.length > 0) {
          avgDouble = (
            doubleVals.reduce((a, b) => a + b, 0) /
            doubleVals.length /
            10000
          ).toFixed(2);
        }
        if (tripleVals.length > 0) {
          avgTriple = (
            tripleVals.reduce((a, b) => a + b, 0) /
            tripleVals.length /
            10000
          ).toFixed(2);
        }
      }

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

      const seasonYears = [
        "17-18",
        "18-19",
        "19-20",
        "20-21",
        "21-22",
        "22-23",
        "23-24",
      ];
      const yearMap = {
        "17-18": 2017,
        "18-19": 2018,
        "19-20": 2019,
        "20-21": 2020,
        "21-22": 2021,
        "22-23": 2022,
        "23-24": 2023,
      };

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

      const interventionYear = "22-23";

      const preYears = seasonYears.slice(
        0,
        seasonYears.indexOf(interventionYear)
      );
      const postYears = seasonYears.slice(
        seasonYears.indexOf(interventionYear)
      );

      const avgSeason = (years, prefix) => {
        const values = years
          .map((year) => Number(props[`${prefix}${year}`]) || 0)
          .filter((v) => !isNaN(v));
        return values.length
          ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)
          : "0.00";
      };

      const kharifBefore = avgSeason(preYears, "k_");
      const kharifAfter = avgSeason(postYears, "k_");

      const rabiBefore = avgSeason(preYears, "kr_");
      const rabiAfter = avgSeason(postYears, "kr_");

      const zaidBefore = avgSeason(preYears, "krz_");
      const zaidAfter = avgSeason(postYears, "krz_");
      const round2 = (val) => Math.round(val * 100) / 100;

      const ImpactKharif = round2(kharifAfter - kharifBefore);
      const ImpactKharifColor = ImpactKharif >= 0 ? "green" : "red";

      const ImpactRabi = round2(rabiAfter - rabiBefore);
      const ImpactRabiColor = ImpactRabi >= 0 ? "green" : "red";

      const ImpactZaid = round2(zaidAfter - zaidBefore);
      const ImpactZaidColor = ImpactZaid >= 0 ? "green" : "red";

      const avgArea = (years, prefix) => {
        const values = years
          .map((year) => {
            const y = yearMap[year]; // map to numeric year
            const val = matchedZoi?.get(`${prefix}${y}`);
            return val !== undefined && val !== null ? Number(val) : 0;
          })
          .filter((v) => !isNaN(v));
        return values.length
          ? values.reduce((a, b) => a + b, 0) / values.length
          : 0;
      };

      // Double cropped
      const doublePre = avgArea(preYears, "doubly_cropped_area_") / 10000;
      const doublePost = avgArea(postYears, "doubly_cropped_area_") / 10000;
      const ImpactDouble = Math.round((doublePost - doublePre) * 100) / 100;
      const ImpactDoubleColor = ImpactDouble >= 0 ? "green" : "red";

      // Triple cropped
      const triplePre = avgArea(preYears, "triply_cropped_area_") / 10000;
      const triplePost = avgArea(postYears, "triply_cropped_area_") / 10000;
      const ImpactTriple = Math.round((triplePost - triplePre) * 100) / 100;
      const ImpactTripleColor = ImpactTriple >= 0 ? "green" : "red";

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
        ImpactKharif,
        ImpactKharifColor,
        avgWaterAvailabilityRabi: meanRabi,
        ImpactRabi,
        ImpactRabiColor,
        avgWaterAvailabilityZaid: meanZaid,
        ImpactZaid,
        ImpactZaidColor,
        ImpactDouble,
        ImpactDoubleColor,
        ImpactTriple,
        ImpactTripleColor,
        areaOred: props.area_ored || 0,
        avgDoubleCropped: avgDouble,
        avgTripleCropped: avgTriple,
        // avgWaterAvailabilityKharif: avgKharif,
        // avgWaterAvailabilityRabi: avgRabi,
        // avgWaterAvailabilityZaid: avgZaid,
        maxCatchmentArea: props.max_catchment_area || 0,
        maxStreamOrder: props.max_stream_order || 0,

        coordinates,
        featureIndex: index,
      };
    });

    const avgSiltRemoved = mappedRows.length
      ? totalSiltRemoved / mappedRows.length
      : 0;

    return {
      rows: mappedRows,
      totalSiltRemoved,
    };
  }, [geoData, zoiFeatures]);

  const totalRows = rows.length;
  console.log(zoiFeatures);

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
        "lulc_all_pixels"
      );

      newLayer.setZIndex(0);
      newLayer.set("id", uniqueLayerId);

      // ADD CLIPPING HERE - Get waterbody features and clip the LULC layer
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
      if (!lulcYear2 || !lulcYear2.includes("_")) return;
      if (!zoiFeatures?.length) return;
      if (!mapRef2.current) return;

      const map = mapRef2.current;

      // 🔹 Set ZOI area for selected waterbody
      if (selectedWaterbody) {
        const matchedZoi = zoiFeatures.find(
          (f) =>
            f.get("waterbody_name")?.toLowerCase().trim() ===
            selectedWaterbody?.waterbody?.toLowerCase().trim()
        );
        setZoiArea(matchedZoi?.get("zoi_area") || null);
      } else {
        setZoiArea(null);
      }

      // 🔹 Construct LULC layer name
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

      // 🔹 Remove old layers
      const idsToRemove = [
        "lulc_zoi_layer",
        "zoi_border_layer",
        "waterbody_layer",
      ];
      map
        .getLayers()
        .getArray()
        .forEach((layer) => {
          if (idsToRemove.includes(layer.get("id"))) {
            map.removeLayer(layer);
          }
        });

      // 🔹 Add LULC raster layer
      const tempLayer = await getImageLayer(
        "waterrej",
        layerName,
        true,
        "waterrej_lulc"
      );
      tempLayer.setZIndex(0);
      tempLayer.set("id", "lulc_zoi_layer");

      // 🔹 Crop LULC: single ZOI or all ZOIs
      let cropFeature;
      if (selectedWaterbody) {
        const matchedZoi = zoiFeatures.find(
          (f) =>
            f.get("waterbody_name")?.toLowerCase().trim() ===
            selectedWaterbody?.waterbody?.toLowerCase().trim()
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
      map.addLayer(tempLayer);

      // 🔹 Add ZOI border layer (yellow)
      let zoiLayer;
      if (selectedWaterbody) {
        const matchedZoi = zoiFeatures.find(
          (f) =>
            f.get("waterbody_name")?.toLowerCase().trim() ===
            selectedWaterbody?.waterbody?.toLowerCase().trim()
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

      // 🔹 Add waterbody layer (only selected waterbody if any)
      let wbLayer;
      if (selectedWaterbody && waterBodyLayer) {
        const allFeatures = waterBodyLayer.getSource().getFeatures();
        const matchedWb = allFeatures.find(
          (f) =>
            f.get("waterbody_name")?.toLowerCase().trim() ===
            selectedWaterbody?.waterbody?.toLowerCase().trim()
        );

        if (matchedWb) {
          wbLayer = new VectorLayer({
            source: new VectorSource({ features: [matchedWb] }),
            style: new Style({
              stroke: new Stroke({ color: "red", width: 3 }),
            }),
          });
        }
      } else if (waterBodyLayer) {
        // ✅ No selection → show all waterbodies
        wbLayer = waterBodyLayer;
      }

      if (wbLayer) {
        wbLayer.setZIndex(2);
        wbLayer.set("id", "waterbody_layer");
        map.addLayer(wbLayer);
      }

      // 🔹 Track current LULC layer
      setCurrentLayer((prev) => {
        const others = prev.filter((l) => l.name !== "lulcWaterrejZOI");
        return [...others, { name: "lulcWaterrejZOI", layerRef: [tempLayer] }];
      });
    };

    fetchUpdateLulcZOI().catch(console.error);
  }, [lulcYear2, project, zoiFeatures, mapRef2.current, selectedWaterbody]);

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

    const waterBodyStyle = (feature) => {
      const styles = [
        new Style({
          stroke: new Stroke({
            color: "#ff0000",
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
            pixel: evt.pixel, // 👈 save pixel position
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
      const extent = vectorSource.getExtent();
      view.fit(extent, {
        padding: [50, 50, 50, 50],
        duration: 1000,
        maxZoom: 18,
      });
    }
  };

  const initializeMap3 = async (organizationLabel) => {
    if (!organizationLabel || !projectName || !projectId) return;

    // --- Initialize base map immediately ---
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
    const uid = selectedFeature.properties.MWS_UID;
    const wfsUrl =
      "https://geoserver.core-stack.org:8443/geoserver/waterrej/ows?" +
      new URLSearchParams({
        service: "WFS",
        version: "1.0.0",
        request: "GetFeature",
        typeName,
        outputFormat: "application/json",
        CQL_FILTER: `uid='${uid}'`, // only fetch required MWS
      });

    let matchedFeatures = [];
    try {
      const response = await fetch(wfsUrl);
      const json = await response.json();
      matchedFeatures = json.features;
      if (!matchedFeatures.length) {
        console.warn("No match found for selected MWS UID");
        return;
      }
    } catch (err) {
      console.error("WFS boundary fetch error:", err);
      return;
    }

    // --- Read features once ---
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

    // Drainage WMS
    const drainageLineLayer = new TileLayer({
      source: new TileWMS({
        url: "https://geoserver.core-stack.org:8443/geoserver/waterrej/wms",
        params: {
          SERVICE: "WMS",
          VERSION: "1.1.0",
          REQUEST: "GetMap",
          FORMAT: "image/png",
          TRANSPARENT: true,
          LAYERS: drainageLayerName,
          STYLES: "",
        },
        serverType: "geoserver",
        crossOrigin: "anonymous",
      }),
      opacity: 1,
    });

    drainageLineLayer.setZIndex(1);
    map.addLayer(drainageLineLayer);

    // Crop drainage and terrain layers if MultiPolygon exists
    if (multiPoly) {
      const cropFilter = new Crop({
        feature: new Feature({ geometry: multiPoly }),
        wrapX: false,
        inner: false,
      });
      if (typeof drainageLineLayer.addFilter === "function")
        drainageLineLayer.addFilter(cropFilter);
      if (typeof terrainLayer.addFilter === "function")
        terrainLayer.addFilter(cropFilter);
    }

    // Terrain layer
    terrainLayer.setOpacity(0.7);
    terrainLayer.setZIndex(0);
    map.addLayer(terrainLayer);

    // --- Waterbody outlines ---
    if (geoData?.features?.length) {
      const waterSource = new VectorSource({
        features: new GeoJSON().readFeatures(geoData, {
          dataProjection: "EPSG:4326",
          featureProjection: "EPSG:4326",
        }),
      });

      const waterLayer = new VectorLayer({
        source: waterSource,
        style: new Style({
          stroke: new Stroke({ color: "red", width: 3 }),
          fill: null,
        }),
      });
      waterLayer.setZIndex(2);
      map.addLayer(waterLayer);

      // Zoom to selected waterbody or all waterbodies
      if (selectedWaterbody && selectedFeature) {
        const feature = new GeoJSON().readFeature(selectedFeature, {
          dataProjection: "EPSG:4326",
          featureProjection: view.getProjection(),
        });
        const geometry = feature.getGeometry();
        if (geometry)
          view.fit(geometry.getExtent(), {
            padding: [50, 50, 50, 50],
            duration: 1000,
            maxZoom: 14,
          });
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

  useEffect(() => {
    if (view === "map" && organization) {
      if (mapElement1.current) initializeMap1();
      if (mapElement2.current) initializeMap2();
      if (mapElement3.current) initializeMap3(organization.label);
    }

    return () => {
      if (mapRef1.current) mapRef1.current.setTarget(null);
      if (mapRef2.current) mapRef2.current.setTarget(null);
      if (mapRef3.current) mapRef3.current.setTarget(null);
    };
  }, [view, geoData, projectName, projectId, organization]);

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

  const getZoomFromArea = (waterbody) => {
    if (!waterbody || !waterbody.waterbody) {
      return 16;
    }

    // Find matching ZOI feature
    const match = zoiFeatures.find(
      (f) => f.get("waterbody_name") === waterbody.waterbody
    );

    // Get ZOI area from properties
    const area = match.get("zoi");

    if (!area) {
      return 16;
    }

    // Map area to zoom
    if (area === 400) return 16; // special case
    if (area >= 1000) return 15; // very large ZOI → zoomed out
    if (area > 700) return 10; // large ZOI
    if (area > 400) return 15.5; // medium-large ZOI
    if (area > 200) return 16; // medium ZOI
    return 17;
  };

  const zoomToZoiWaterbody = (waterbody, zoiFeatures, targetMapRef) => {
    if (!waterbody || !zoiFeatures || !targetMapRef?.current) return;

    const view = targetMapRef.current.getView();

    // ✅ Find ZOI feature for this waterbody
    const matchedZoi = zoiFeatures.find(
      (f) =>
        f.get("waterbody_name")?.toLowerCase().trim() ===
        waterbody?.waterbody?.toLowerCase().trim()
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

    // ✅ Zoom to ZOI instead of waterbody
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
            fill: new Fill({ color: "rgba(255, 0, 0, 0.5)" }),
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
      const matchingMWSFeature = mwsGeoData?.features?.find(
        (f) => f.properties?.uid === mwsId
      );

      if (matchingMWSFeature) {
        setSelectedMWSFeature(matchingMWSFeature);
      } else {
        console.warn("No matching MWS found for:", mwsId);
      }

      setSelectedWaterbody(row);
      setSelectedFeature(feature);
      setView("map");
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
              Under the project {project?.label},{" "}
              {totalRows.toLocaleString("en-IN")} waterbodies have been
              de-silted, spanning around{" "}
              {(totalSiltRemoved || 0).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              Cu.m.
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
                        {/* Filter button — keep existing handler but stop propagation */}
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFilterClick(e, "state");
                          }}
                          size="small"
                        >
                          <FilterListIcon fontSize="small" />
                        </IconButton>
                        {/* Info button — pass the button DOM node as anchor */}
                        <Tooltip title="Click the info icon for details">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInfoClick(
                                e.currentTarget,
                                "State where the waterbody is located."
                              );
                            }}
                            sx={{
                              color: "primary.main",
                              "&:hover": { transform: "scale(1.2)" },
                            }}
                          >
                            <InfoOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        District
                        {/* Filter button */}
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFilterClick(e, "district");
                          }}
                          size="small"
                        >
                          <FilterListIcon fontSize="small" />
                        </IconButton>
                        {/* Info button */}
                        <Tooltip title="Click the info icon for details">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInfoClick(
                                e.currentTarget,
                                "District in which the waterbody falls."
                              );
                            }}
                            sx={{
                              color: "primary.main",
                              "&:hover": { transform: "scale(1.2)" },
                            }}
                          >
                            <InfoOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        Taluka
                        {/* Filter button */}
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFilterClick(e, "block");
                          }}
                          size="small"
                        >
                          <FilterListIcon fontSize="small" />
                        </IconButton>
                        {/* Info button */}
                        <Tooltip title="Click the info icon for details">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInfoClick(
                                e.currentTarget,
                                "Taluka (administrative block) in which the waterbody is located."
                              );
                            }}
                            sx={{
                              color: "primary.main",
                              "&:hover": { transform: "scale(1.2)" },
                            }}
                          >
                            <InfoOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        GP/Village
                        {/* Filter button */}
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFilterClick(e, "village");
                          }}
                          size="small"
                        >
                          <FilterListIcon fontSize="small" />
                        </IconButton>
                        {/* Info button */}
                        <Tooltip title="Click the info icon for details">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInfoClick(
                                e.currentTarget,
                                "Gram Panchayat or Village where the waterbody is located."
                              );
                            }}
                            sx={{
                              color: "primary.main",
                              "&:hover": { transform: "scale(1.2)" },
                            }}
                          >
                            <InfoOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <span>Waterbody</span>

                          {/* Info button */}
                          <Tooltip title="Click the info icon for details">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleInfoClick(
                                  e.currentTarget,
                                  "Name of the waterbody being monitored."
                                );
                              }}
                              sx={{
                                color: "primary.main",
                                "&:hover": { transform: "scale(1.2)" },
                              }}
                            >
                              <InfoOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </div>

                        {/* Search input */}
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
                      sx={{
                        cursor: "pointer",
                        userSelect: "none",
                      }}
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
                        {/* Info button */}
                        <Tooltip title="Click the info icon for details">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation(); // prevent triggering sort when clicking info
                              handleInfoClick(
                                e.currentTarget,
                                "Volume of silt removed from the waterbody, measured in cubic meters (Cu.m.)."
                              );
                            }}
                            sx={{
                              color: "primary.main",
                              "&:hover": { transform: "scale(1.2)" },
                            }}
                          >
                            <InfoOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </div>
                    </TableCell>

                    {/* Intervention year Column */}
                    <TableCell
                      sx={{
                        cursor: "pointer",
                        userSelect: "none",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center" }}>
                        Intervention Year
                        <span
                          style={{
                            marginLeft: 4,
                            fontWeight: "normal",
                          }}
                        ></span>
                        {/* Info button */}
                        <Tooltip title="Click the info icon for details">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInfoClick(
                                e.currentTarget,
                                "The year in which desilting or related intervention was carried out for the waterbody."
                              );
                            }}
                            sx={{
                              color: "primary.main",
                              "&:hover": { transform: "scale(1.2)" },
                            }}
                          >
                            <InfoOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </div>
                    </TableCell>

                    {/* Size of waterbody Column */}
                    <TableCell
                      sx={{
                        cursor: "pointer",
                        userSelect: "none",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center" }}>
                        Size of Waterbody (in hectares)
                        <span
                          style={{
                            marginLeft: 4,
                            fontWeight: "normal",
                          }}
                        ></span>
                        {/* Info button */}
                        <Tooltip title="Click the info icon for details">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInfoClick(
                                e.currentTarget,
                                "Total surface area of the waterbody measured in hectares."
                              );
                            }}
                            sx={{
                              color: "primary.main",
                              "&:hover": { transform: "scale(1.2)" },
                            }}
                          >
                            <InfoOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </div>
                    </TableCell>

                    {/* Water Availability Column */}

                    <TableCell
                      onClick={() => handleSort("avgWaterAvailabilityRabi")}
                      sx={{
                        cursor: "pointer",
                        userSelect: "none",
                      }}
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
                        {/* Info button */}
                        <Tooltip title="Click the info icon for details">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation(); // prevent triggering sort
                              handleInfoClick(
                                e.currentTarget,
                                "Average percentage of water available in the waterbody during the Rabi season.Statistics within the brackets indicates the change after the intervention and before the intervention."
                              );
                            }}
                            sx={{
                              color: "primary.main",
                              "&:hover": { transform: "scale(1.2)" },
                            }}
                          >
                            <InfoOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </div>
                    </TableCell>

                    <TableCell
                      onClick={() => handleSort("avgWaterAvailabilityZaid")}
                      sx={{
                        cursor: "pointer",
                        userSelect: "none",
                      }}
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
                        {/* Info button */}
                        <Tooltip title="Click the info icon for details">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation(); // avoid triggering sort
                              handleInfoClick(
                                e.currentTarget,
                                "Average percentage of water available in the waterbody during the Zaid season (summer cropping period).Statistics within the brackets indicates the change after the intervention and before the intervention."
                              );
                            }}
                            sx={{
                              color: "primary.main",
                              "&:hover": { transform: "scale(1.2)" },
                            }}
                          >
                            <InfoOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </div>
                    </TableCell>

                    {/*Double cropped area */}
                    {/* <TableCell
                      onClick={() => handleSort("avgWaterAvailabilityZaid")}
                      sx={{
                        cursor: "pointer",
                        userSelect: "none",
                        px: 1,
                        py: 0.5,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center" }}>
                        Mean Double Cropped Area (in hec.)
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
                        {/* Info button 
                        <Tooltip title="Click the info icon for details">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation(); // avoid triggering sort
                              handleInfoClick(
                                e.currentTarget,
                                "Average of double cropped area in the waterbody (summer cropping period).Statistics within the brackets indicates the change after the intervention and before the intervention."
                              );
                            }}
                            sx={{
                              color: "primary.main",
                              "&:hover": { transform: "scale(1.2)" },
                            }}
                          >
                            <InfoOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </div>
                    </TableCell> */}

                    {/*Tripple cropped area*/}
                    {/* <TableCell
                      onClick={() => handleSort("avgWaterAvailabilityZaid")}
                      sx={{
                        cursor: "pointer",
                        userSelect: "none",
                        px: 1,
                        py: 0.5,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center" }}>
                        Mean Tripple Cropped Area (in hec.){" "}
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
                        {/* Info button 
                        <Tooltip title="Click the info icon for details">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation(); // avoid triggering sort
                              handleInfoClick(
                                e.currentTarget,
                                "Average of triple cropped area in the waterbody (summer cropping period).Statistics within the brackets indicates the change after the intervention and before the intervention."
                              );
                            }}
                            sx={{
                              color: "primary.main",
                              "&:hover": { transform: "scale(1.2)" },
                            }}
                          >
                            <InfoOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </div>
                    </TableCell> */}
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
                      <TableCell>2022-23</TableCell>
                      <TableCell>{row.areaOred?.toFixed(2)}</TableCell>
                      {/* <TableCell>
                        {row.avgWaterAvailabilityKharif ?? "NA"}{" "}
                        {row.ImpactKharif !== undefined && (
                          <span style={{ color: row.ImpactKharifColor }}>
                            ({row.ImpactKharif})
                          </span>
                        )}
                      </TableCell> */}
                      <TableCell sx={{ py: 0.5 }}>
                        {row.avgWaterAvailabilityRabi ?? "NA"}{" "}
                        {row.ImpactRabi !== undefined && (
                          <span style={{ color: row.ImpactRabiColor }}>
                            ({row.ImpactRabi})
                          </span>
                        )}
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        {row.avgWaterAvailabilityZaid ?? "NA"}{" "}
                        {row.ImpactZaid !== undefined && (
                          <span style={{ color: row.ImpactZaidColor }}>
                            ({row.ImpactZaid})
                          </span>
                        )}
                      </TableCell>
                      {/* <TableCell sx={{ px: 1, py: 0.5 }}>
                        {row.avgDoubleCropped ?? "NA"}{" "}
                        {row.ImpactDouble !== undefined && (
                          <span style={{ color: row.ImpactDoubleColor }}>
                            ({row.ImpactDouble})
                          </span>
                        )}
                      </TableCell>
                      <TableCell sx={{ px: 1, py: 0.5 }}>
                        {row.avgTripleCropped ?? "NA"}{" "}
                        {row.ImpactTriple !== undefined && (
                          <span style={{ color: row.ImpactTripleColor }}>
                            ({row.ImpactTriple})
                          </span>
                        )}
                      </TableCell> */}
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
            <Popover
              open={infoOpen}
              anchorEl={infoAnchorEl}
              onClose={handleInfoClose}
              anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
              transformOrigin={{ vertical: "top", horizontal: "left" }}
              PaperProps={{ sx: { maxWidth: 320, p: 1 } }}
            >
              <Typography sx={{ fontSize: 13 }}>{infoText}</Typography>
            </Popover>
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
            {selectedWaterbody && (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  width: "100%",
                  p: { xs: 2, sm: 3, md: 2 },
                  borderRadius: 2,
                  bgcolor: "background.paper",
                  boxShadow: 1,
                }}
              >
                {/* Heading */}
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 700,
                    color: "primary.main",
                    borderBottom: "2px solid",
                    borderColor: "primary.main",
                    pb: 1,
                  }}
                >
                  Section 1: Water presence and land-use change in the waterbody
                </Typography>

                {/* Explanation */}
                <Typography
                  variant="body1"
                  sx={{ color: "text.secondary", lineHeight: 1.7 }}
                >
                  This section shows the selected waterbody, silt removal
                  details, and seasonal water availability before and after the
                  intervention, along with yearly trends of cropping patterns
                  within the waterbody boundary.
                </Typography>

                <Typography
                  variant="body1"
                  sx={{ color: "text.secondary", lineHeight: 1.7 }}
                >
                  The boundary shown for the waterbody is the maximal coverage
                  ever gained by the waterbody over the last several years.
                  Depending on rainfall, water use, and other factors like
                  changes in the inlet and outlet channels of the waterbody, not
                  all of the waterbody area will see water in a given year and
                  some of the area may also get utilized for agriculture. This
                  land use in each year can be observed from the map and graphs.
                </Typography>

                <Typography
                  variant="body1"
                  sx={{ color: "text.secondary", lineHeight: 1.7 }}
                >
                  Similarly, the duration of water presence can be seen in terms
                  of how much of the waterbody saw water throughout the year, or
                  during the monsoon and post-monsoon months, or only during the
                  monsoon months.
                </Typography>
              </Box>
            )}

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
                  width: selectedWaterbody ? { xs: "100%", md: "65%" } : "100%",
                }}
              >
                {!selectedWaterbody && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bgcolor: "rgba(255, 255, 255, 0.9)",
                      textAlign: "center",
                      py: 1,
                      fontWeight: 600,
                      fontSize: "16px",
                      borderBottom: "1px solid #ccc",
                      zIndex: 1200,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 1,
                    }}
                  >
                    To view the detailed dashboard of a waterbody, click on
                    <img
                      src="https://cdn-icons-png.flaticon.com/512/684/684908.png"
                      alt="marker"
                      style={{ width: 20, height: 20, margin: "0 6px" }}
                    />
                    its icon
                  </Box>
                )}

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
                {selectedWaterbody && (
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
                      zIndex: 1000,
                      maxWidth: { xs: "90%", sm: "300px" },
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
                )}

                {/* Legend + YearSlider wrapper for responsiveness */}
                {selectedWaterbody && (
                  <Box
                    sx={{
                      position: "absolute",
                      bottom: 16,
                      left: 16,
                      right: 16,
                      display: "flex",
                      flexDirection: { xs: "column", sm: "row" },
                      justifyContent: "space-between",
                      gap: 2,
                      flexWrap: "wrap",
                      zIndex: 1000,
                    }}
                  >
                    {/* Collapsible Legend for Map 1 */}
                    {!waterbodyLegend ? (
                      // collapsed tab
                      <Box
                        onClick={() => setWaterbodyLegend(true)}
                        sx={{
                          backgroundColor: "rgba(255,255,255,0.9)",
                          padding: "6px 4px",
                          borderRadius: "0 6px 6px 0",
                          boxShadow: 2,
                          cursor: "pointer",
                          writingMode: "vertical-rl",
                          textOrientation: "mixed",
                          fontWeight: "bold",
                        }}
                      >
                        Water Layer Legend ▶
                      </Box>
                    ) : (
                      // expanded legend
                      <Box
                        sx={{
                          backgroundColor: "rgba(255, 255, 255, 0.9)",
                          padding: 2,
                          borderRadius: 1,
                          boxShadow: 2,
                          flex: "1 1 180px",
                          minWidth: "260px",
                          maxWidth: "200px",
                        }}
                      >
                        <Box
                          display="flex"
                          justifyContent="space-between"
                          alignItems="center"
                        >
                          <Typography variant="subtitle2">
                            Water Layer Legend
                          </Typography>
                          <button
                            onClick={() => setWaterbodyLegend(false)}
                            style={{
                              border: "none",
                              background: "transparent",
                              cursor: "pointer",
                            }}
                          >
                            ◀
                          </button>
                        </Box>
                        {[
                          { color: "#74CCF4", label: "Kharif Water" },
                          { color: "#1ca3ec", label: "Kharif and Rabi Water" },
                          {
                            color: "#0f5e9c",
                            label: "Kharif, Rabi and Zaid Water",
                          },
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
                            <Typography variant="body2">
                              {item.label}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    )}

                    {/* YearSlider */}
                    <Box
                      sx={{
                        backgroundColor: "rgba(255, 255, 255, 0.9)",
                        padding: 2,
                        borderRadius: 1,
                        boxShadow: 2,
                        flexShrink: 0, // prevent shrinking
                        flexGrow: 0,
                        minWidth: { xs: "220px", sm: "300px", md: "500px" },
                      }}
                    >
                      <YearSlider
                        currentLayer={{ name: "lulcWaterrej" }}
                        sliderId="map1"
                      />
                    </Box>
                  </Box>
                )}

                {/* Zoom Controls */}
                {selectedWaterbody && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: 16,
                      right: 16,
                      display: "flex",
                      flexDirection: "column",
                      gap: 1,
                      zIndex: 1100,
                    }}
                  >
                    {["+", "–"].map((sign) => (
                      <button
                        key={sign}
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
                  </Box>
                )}
              </Box>
              {mapClickedWaterbody && !selectedWaterbody && (
                <Box
                  sx={{
                    position: "absolute",
                    top: mapClickedWaterbody.pixel[1] - 0, // little above marker
                    left: mapClickedWaterbody.pixel[0] + 15, // slight offset to right
                    transform: "translate(-50%, -100%)",
                    width: 250,
                    padding: 2,
                    background: "#ffffff",
                    boxShadow: "0px 4px 16px rgba(0, 0, 0, 0.15)",
                    borderRadius: 2,
                    border: "1px solid #e0e0e0",
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                    cursor: "pointer",
                    transition: "all 0.2s ease-in-out",
                    "&:hover": {
                      boxShadow: "0px 6px 20px rgba(0,0,0,0.25)",
                      transform: "translate(-50%, -102%)",
                      borderColor: "#1976d2",
                    },
                    zIndex: 9999,
                  }}
                  onClick={handleMapBoxClick}
                >
                  <Typography
                    variant="subtitle1"
                    fontWeight={700}
                    sx={{
                      color: "#1976d2",
                      borderBottom: "1px solid #ddd",
                      pb: 1,
                    }}
                  >
                    {mapClickedWaterbody.name}
                  </Typography>

                  <Box display="flex" justifyContent="space-between">
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      color="text.secondary"
                    >
                      Village:
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight={500}
                      color="text.primary"
                    >
                      {mapClickedWaterbody.Village ?? "NA"}
                    </Typography>
                  </Box>

                  <Box display="flex" justifyContent="space-between">
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      color="text.secondary"
                    >
                      Taluka:
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight={500}
                      color="text.primary"
                    >
                      {mapClickedWaterbody.Taluka ?? "NA"}
                    </Typography>
                  </Box>

                  <Typography
                    variant="body2"
                    sx={{
                      mt: 1,
                      color: "#1976d2",
                      fontWeight: 600,
                      textAlign: "right",
                    }}
                  >
                    View details →
                  </Typography>
                </Box>
              )}

              {/* Charts Section */}
              {selectedWaterbody && (
                <Box
                  sx={{
                    width: { xs: "100%", md: "45%" },
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    alignItems: "center",
                  }}
                >
                  <Box
                    sx={{ width: "100%", maxWidth: "700px", height: "400px" }}
                  >
                    <WaterAvailabilityChart
                      waterbody={selectedWaterbody}
                      water_rej_data={geoData}
                      mwsFeature={selectedMWSFeature}
                    />
                    <Typography fontSize={14} color="#333" mt={1}>
                      <b>Black line</b> represents the year of intervention.
                    </Typography>
                  </Box>

                  {selectedMWSFeature && (
                    <Box
                      sx={{
                        width: "100%",
                        maxWidth: "700px",
                        height: "400px",
                        marginTop: "1%",
                      }}
                    >
                      <PrecipitationStackChart feature={selectedMWSFeature} />
                    </Box>
                  )}
                </Box>
              )}
            </Box>
            {selectedWaterbody && (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  width: "100%",
                  p: { xs: 2, sm: 3, md: 2 },
                  borderRadius: 2,
                  bgcolor: "background.paper",
                  boxShadow: 1,
                }}
              >
                {/* Heading */}
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 700,
                    color: "primary.main",
                    borderBottom: "2px solid",
                    borderColor: "primary.main",
                    pb: 1,
                  }}
                >
                  Section 2: Catchment area and stream position
                </Typography>

                {/* Explanation */}
                <Typography
                  variant="body1"
                  sx={{ color: "text.secondary", lineHeight: 1.7 }}
                >
                  This section gives the catchment area from which runoff may
                  drain into the waterbody. A larger catchment area would imply
                  a higher rainfall runoff draining into the waterbody, in turn
                  leading to more storage. This can however get impacted by
                  blocked inlet channels and other changes.
                </Typography>

                <Typography
                  variant="body1"
                  sx={{ color: "text.secondary", lineHeight: 1.7 }}
                >
                  This section also gives the stream order in which the
                  waterbody lies. The stream order indicates the relative
                  position of the waterbody in the drainage network. Waterbodies
                  present in higher stream orders would typically see
                  sub-surface flows from upstream watersheds.
                </Typography>
              </Box>
            )}

            {selectedWaterbody && (
              <Box
                sx={{
                  width: "100%",
                  display: "flex",
                  flexDirection: { xs: "column", md: "row" },
                  justifyContent: "space-between",
                  gap: 3,
                  mt: 4,
                  px: { xs: 2, md: 0 },
                }}
              >
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
                  <Box
                    key={idx}
                    sx={{
                      flex: 1,
                      background:
                        "linear-gradient(135deg, #f9fafb 0%, #f1f3f5 100%)",
                      padding: 3,
                      borderRadius: 3,
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      textAlign: "center",
                      minHeight: "120px",
                      transition: "all 0.3s ease",
                      "&:hover": {
                        transform: "translateY(-2px)",
                        boxShadow: "0 6px 16px rgba(0, 0, 0, 0.08)",
                      },
                      border: "1px solid #e0e0e0",
                    }}
                  >
                    <Typography
                      variant="h6"
                      fontWeight={700}
                      color="text.primary"
                      sx={{
                        textTransform: "uppercase",
                        letterSpacing: 0.8,
                        fontSize: "0.95rem",
                        color: "#333",
                      }}
                    >
                      {item.label}
                    </Typography>
                    <Typography
                      variant="h5"
                      fontWeight={600}
                      color="primary"
                      sx={{
                        mt: 1,
                        fontSize: "1.3rem",
                      }}
                    >
                      {item.value}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
            {/* ZOI Section with Map + Side Chart */}
            {selectedWaterbody && (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  width: "100%",
                  p: { xs: 2, sm: 3, md: 2 },
                  borderRadius: 2,
                  bgcolor: "background.paper",
                  boxShadow: 1,
                }}
              >
                {/* Heading */}
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 700,
                    color: "primary.main",
                    borderBottom: "2px solid",
                    borderColor: "primary.main",
                    pb: 1,
                  }}
                >
                  Section 3: Cropping patterns in the Zone of Influence of the
                  waterbody
                </Typography>

                {/* Explanation */}
                <Typography
                  variant="body1"
                  sx={{ color: "text.secondary", lineHeight: 1.7 }}
                >
                  This section shows the waterbody’s zone of influence (ZoI) and
                  cropping intensities within this zone, along with the NDVI
                  values in the area.
                </Typography>

                <Typography
                  variant="body1"
                  sx={{ color: "text.secondary", lineHeight: 1.7 }}
                >
                  The ZoI of the waterbody is the area impacted by the waterbody
                  through improved soil moisture or use of water for irrigation.
                  Changes before and after the intervention in cropping
                  intensities and NDVI (Normalized Difference Vegetation Index,
                  is a common remote sensed indicator of greenness) in the ZoI
                  can be seen through maps and graphs.
                </Typography>

                <Typography
                  variant="body1"
                  sx={{ color: "text.secondary", lineHeight: 1.7 }}
                >
                  We also show NDMI values, a soil moisture index, at increasing
                  radial distances from the waterbody.
                </Typography>
              </Box>
            )}
            {selectedWaterbody && (
              <>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", md: "row" },
                    alignItems: "flex-start",
                    gap: 4,
                    width: "100%",
                    mt: 6,
                  }}
                >
                  <Box
                    sx={{
                      position: "relative",
                      width: { xs: "100%", md: "65%" },
                    }}
                  >
                    <div
                      ref={mapElement2}
                      style={{
                        height: "850px",
                        width: "100%",
                        border: "1px solid #ccc",
                        borderRadius: "5px",
                      }}
                    />

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
                        zIndex: 1000,
                        maxWidth: { xs: "90%", sm: "300px" },
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
                        ZOI Area:{" "}
                        {zoiArea !== null ? `${zoiArea.toFixed(2)} ha` : "NA"}
                      </Typography>
                    </Box>

                    {/* Legend + YearSlider wrapper */}
                    <Box
                      sx={{
                        position: "absolute",
                        bottom: 16,
                        left: 16,
                        right: 16,
                        display: "flex",
                        flexDirection: { xs: "column", sm: "row" },
                        justifyContent: "space-between",
                        gap: 2,
                        flexWrap: "wrap",
                        zIndex: 1000,
                      }}
                    >
                      {/* Collapsible Legend (left side) */}
                      {!zoiLegend ? (
                        <Box
                          onClick={() => setZoiLegend(true)}
                          sx={{
                            backgroundColor: "rgba(255,255,255,0.9)",
                            padding: "6px 4px",
                            borderRadius: "0 6px 6px 0",
                            boxShadow: 2,
                            cursor: "pointer",
                            writingMode: "vertical-rl",
                            textOrientation: "mixed",
                            fontWeight: "bold",
                          }}
                        >
                          Zoi Legend ▶
                        </Box>
                      ) : (
                        <Box
                          sx={{
                            backgroundColor: "rgba(255, 255, 255, 0.9)",
                            padding: 2,
                            borderRadius: 1,
                            boxShadow: 2,
                            flex: "1 1 180px",
                            minWidth: "260px",
                            maxWidth: "200px",
                          }}
                        >
                          <Box
                            display="flex"
                            justifyContent="space-between"
                            alignItems="center"
                          >
                            <Typography variant="subtitle2">
                              Zoi Legend
                            </Typography>
                            <button
                              onClick={() => setZoiLegend(false)}
                              style={{
                                border: "none",
                                background: "transparent",
                                cursor: "pointer",
                              }}
                            >
                              ◀
                            </button>
                          </Box>
                          {[
                            { color: "#b3561d", label: "Triple Crop" },
                            {
                              color: "#FF9371",
                              label: "Double Crop",
                            },
                            {
                              color: "#f59d22",
                              label: "Single Non-Kharif",
                            },
                            {
                              color: "#BAD93E",
                              label: "Single Kharif",
                            },
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
                              <Typography variant="body2">
                                {item.label}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      )}

                      {/* YearSlider (right side) */}
                      <Box
                        sx={{
                          backgroundColor: "rgba(255, 255, 255, 0.9)",
                          padding: 2,
                          borderRadius: 1,
                          boxShadow: 2,
                          flexShrink: 0, // prevent shrinking
                          flexGrow: 0,
                          minWidth: { xs: "220px", sm: "300px", md: "500px" },
                        }}
                      >
                        <YearSlider
                          currentLayer={{ name: "lulcWaterrej" }}
                          sliderId="map2"
                        />
                      </Box>
                    </Box>

                    {/* Zoom Controls */}
                    <Box
                      sx={{
                        position: "absolute",
                        top: 16,
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

                  <Box
                    sx={{
                      width: { xs: "100%", md: "45%" },
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                    }}
                  >
                    <Box
                      sx={{ width: "100%", maxWidth: "700px", height: "400px" }}
                    >
                      <CroppingIntensityStackChart
                        zoiFeatures={zoiFeatures}
                        waterbody={selectedWaterbody}
                      />
                    </Box>

                    <Box
                      sx={{ width: "100%", maxWidth: "700px", height: "400px" }}
                    >
                      <NDMIPointChart
                        zoiFeatures={zoiFeatures}
                        waterbody={selectedWaterbody}
                      />
                    </Box>
                  </Box>
                </Box>

                <Box
                  sx={{
                    width: "100%",
                    display: "flex",
                    flexDirection: { xs: "column", md: "row" }, // stack on small screens
                    gap: 2,
                    alignItems: "flex-end", // ensures bottom alignment (x-axis same level)
                  }}
                >
                  <Box
                    sx={{
                      flex: 0.65, // takes 65% width
                      height: "400px",
                    }}
                  >
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
                  </Box>

                  {selectedMWSFeature && (
                    <Box
                      sx={{
                        flex: 0.35, // takes 35% width
                        height: "450px",
                      }}
                    >
                      <DroughtChart
                        feature={selectedMWSFeature}
                        waterbody={selectedWaterbody}
                      />
                    </Box>
                  )}
                </Box>
              </>
            )}
            {/*MWS map section */}

            {selectedWaterbody && (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  width: "100%",
                  p: { xs: 2, sm: 3, md: 2 },
                  borderRadius: 2,
                  bgcolor: "background.paper",
                  boxShadow: 1,
                }}
              >
                {/* Heading */}
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 700,
                    color: "primary.main",
                    borderBottom: "2px solid",
                    borderColor: "primary.main",
                    pb: 1,
                  }}
                >
                  Section 4: Micro-watershed context of the waterbody
                </Typography>

                {/* Explanation */}
                <Typography
                  variant="body1"
                  sx={{ color: "text.secondary", lineHeight: 1.7 }}
                >
                  This map displays the micro-watershed boundary along with its
                  drainage network (blue lines), showing how water flows and is
                  distributed within the micro-watershed. The map also shows the
                  terrain in the micro-watershed.
                </Typography>
              </Box>
            )}

            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                alignItems: "flex-start",
                gap: 4,
                width: "100%",
              }}
            >
              {/* Map 3 */}
              {selectedWaterbody && (
                <Box
                  sx={{
                    position: "relative",
                    width: { xs: "100%", md: "100%" },
                  }}
                >
                  <div
                    ref={mapElement3}
                    style={{
                      height: "850px",
                      width: "100%",
                      border: "1px solid #ccc",
                      borderRadius: "5px",
                    }}
                  />

                  {/* Legend */}

                  {/* Collapsible Terrain Legend */}
                  {!terrainLegend ? (
                    // collapsed tab
                    <Box
                      onClick={() => setTerrainLegend(true)}
                      sx={{
                        position: "absolute",
                        bottom: 16,
                        left: 16,
                        backgroundColor: "rgba(255,255,255,0.9)",
                        padding: "6px 4px",
                        borderRadius: "0 6px 6px 0",
                        boxShadow: 2,
                        cursor: "pointer",
                        writingMode: "vertical-rl",
                        textOrientation: "mixed",
                        fontWeight: "bold",
                        zIndex: 1200,
                      }}
                    >
                      Terrain Legend ▶
                    </Box>
                  ) : (
                    // expanded legend
                    <Box
                      sx={{
                        position: "absolute",
                        bottom: 16,
                        left: 16,
                        backgroundColor: "rgba(255, 255, 255, 0.9)",
                        padding: 2,
                        borderRadius: 1,
                        boxShadow: 2,
                        zIndex: 1200,
                        minWidth: "220px",
                        maxWidth: "260px",
                      }}
                    >
                      <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <Typography variant="subtitle2">
                          Terrain Layer Legend
                        </Typography>
                        <button
                          onClick={() => setTerrainLegend(false)}
                          style={{
                            border: "none",
                            background: "transparent",
                            cursor: "pointer",
                          }}
                        >
                          ◀
                        </button>
                      </Box>

                      {[
                        {
                          color: "#313695",
                          label: "V-shape river valleys, Deep narrow canyons",
                        },
                        {
                          color: "#4575b4",
                          label:
                            "Lateral midslope incised drainages, Local valleys in plains",
                        },
                        {
                          color: "#91bfdb",
                          label: "Local ridge/hilltops within broad valleys",
                        },
                        { color: "#e0f3f8", label: "U-shape valleys" },
                        { color: "#fffc00", label: "Broad Flat Areas" },
                        { color: "#feb24c", label: "Broad open slopes" },
                        { color: "#f46d43", label: "Mesa tops" },
                        { color: "#d73027", label: "Upper Slopes" },
                        {
                          color: "#a50026",
                          label: "Upland incised drainages Stream headwaters",
                        },
                        {
                          color: "#800000",
                          label:
                            "Lateral midslope drainage divides, Local ridges in plains",
                        },
                        {
                          color: "#4d0000",
                          label: "Mountain tops, high ridges",
                        },
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
                  )}

                  {/* Zoom Controls */}
                  <Box
                    sx={{
                      position: "absolute",
                      top: 16,
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
                        const view = mapRef3.current?.getView();
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
              )}
            </Box>
          </Box>
        ) : null}
      </Box>
    </Box>
  );
};

export default WaterProjectDashboard;
