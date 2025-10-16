import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
// import { yearAtom } from "../store/locationStore.jsx";
import HeaderSelect from "../pages/HeaderSelect.jsx";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import Map from "ol/Map";
import { Style, Fill, Stroke, Icon } from "ol/style";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import YearSlider from "./yearSlider";
import { yearAtomFamily } from "../store/locationStore.jsx";
import { fromLonLat } from "ol/proj";
import Point from "ol/geom/Point";
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
} from "@mui/material";
import { Lightbulb } from "lucide-react";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import XYZ from "ol/source/XYZ";
import { Control, defaults as defaultControls } from "ol/control";
import FilterListIcon from "@mui/icons-material/FilterList";
import getImageLayer from "../actions/getImageLayers";
import Crop from "ol-ext/filter/Crop";
import MultiPolygon from "ol/geom/MultiPolygon";
import Feature from "ol/Feature";
import MouseWheelZoom from "ol/interaction/MouseWheelZoom";
import PinchZoom from "ol/interaction/PinchZoom";
import DoubleClickZoom from "ol/interaction/DoubleClickZoom";
import { useLocation } from "react-router-dom";
import PlantationStackBarGraph from "./plantationStackBarGraph.jsx";
import PlantationNDVIChart from "./plantationNDVIChart.jsx";
import SoilPropertiesSection from "./soilPropertiesSection.jsx";
const usePlantationData = (orgName, projectName, projectId) => {
  const [geoData, setGeoData] = useState(null);

  useEffect(() => {
    if (!orgName || !projectName || !projectId) return;

    const fetchGeoJSON = async () => {
      const safeOrgName = orgName.replace(/\s+/g, "_");
      const safeProjectName = projectName.replace(/\s+/g, "_");
      const typeName = `plantation:${safeOrgName}_${safeProjectName}_site_suitability`;

      const url =
        `https://geoserver.core-stack.org:8443/geoserver/plantation/ows?` +
        new URLSearchParams({
          service: "WFS",
          version: "1.0.0",
          request: "GetFeature",
          typeName,
          outputFormat: "application/json",
        });

      console.log("GeoServer WFS URL:", url);

      try {
        const response = await fetch(url);
        if (!response.ok) {
          const errorText = await response.text();
          console.error("GeoServer error response:", errorText);
          throw new Error(`GeoServer returned status ${response.status}`);
        }

        const data = await response.json();
        console.log(" GeoJSON data:", data);
        setGeoData(data);
      } catch (err) {
        console.error(" Failed to fetch or parse GeoJSON:", err);
        setGeoData(null);
      }
    };

    fetchGeoJSON();
  }, [orgName, projectName, projectId]);

  return { geoData };
};

const PlantationProjectDashboard = () => {
  const [view, setView] = useState("table");
  const [anchorEl, setAnchorEl] = useState(null);
  const [filterType, setFilterType] = useState("");

  const [selectedPlantation, setSelectedPlantation] = useState(null);
  const [mapClickedPlantation, setMapClickedPlantation] = useState(null);

  const [selectedFeature, setSelectedFeature] = useState(null);
  const plantationLayerRef = useRef(null);

  const mapElement1 = useRef();
  const mapRef1 = useRef();
  const popupContainer = useRef(null);
  const popupOverlay = useRef(null);

  const baseLayerRef = useRef();
  const location = useLocation();
  const lulcYear1 = useRecoilValue(yearAtomFamily("map1"));

  const [sortField, setSortField] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc");
  const [searchText, setSearchText] = useState("");
  const [plantationSearch, setplantationSearch] = useState("");

  const [organization, setOrganization] = useState(null);
  const [project, setProject] = useState(null);
  const projectName = project?.label;
  const projectId = project?.value;
  const orgName = organization?.label;

  const { geoData } = usePlantationData(orgName, projectName, projectId);
  const hasZoomedRef = useRef(false);

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
  }, [location.key]);

  function sanitizeGeoJSON(geojson) {
    if (!geojson || !geojson.features)
      return { type: "FeatureCollection", features: [] };

    geojson.features = geojson.features
      .filter(
        (f) =>
          f.geometry &&
          f.geometry.coordinates &&
          f.geometry.coordinates.length > 0
      )
      .map((feature) => {
        let geom = feature.geometry;

        if (geom.type === "Polygon") {
          feature.geometry = {
            type: "MultiPolygon",
            coordinates: [geom.coordinates],
          };
        }

        if (geom.type === "MultiPolygon") {
          feature.geometry.coordinates = geom.coordinates
            .filter((poly) => Array.isArray(poly) && poly.length > 0)
            .map((poly) => {
              if (!Array.isArray(poly[0][0])) return [poly];
              return poly;
            });
        }

        return feature;
      });

    return geojson;
  }

  const initializeMap = async () => {
    const baseLayer = new TileLayer({
      source: new XYZ({
        url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
        maxZoom: 40,
      }),
    });
    baseLayerRef.current = baseLayer;

    const view = new View({
      projection: "EPSG:3857",
      center: fromLonLat([78.9629, 20.5937]),
      zoom: 5,
      constrainResolution: true,
    });

    const map = new Map({
      target: mapElement1.current,
      layers: [baseLayer],
      view,
      controls: defaultControls(),
      loadTilesWhileAnimating: true,
      loadTilesWhileInteracting: true,
    });

    mapRef1.current = map;

    popupOverlay.current = new Overlay({
      element: popupContainer.current,
      positioning: "top-center",
      stopEvent: false,
      offset: [0, -10],
    });
    map.addOverlay(popupOverlay.current);

    map.getInteractions().forEach((interaction) => {
      if (
        interaction instanceof MouseWheelZoom ||
        interaction instanceof PinchZoom ||
        interaction instanceof DoubleClickZoom
      ) {
        interaction.setActive(false);
      }
    });

    if (!geoData?.features) return;

    if (plantationLayerRef.current) {
      map.removeLayer(plantationLayerRef.current);
      plantationLayerRef.current = null;
    }

    const safeData = sanitizeGeoJSON(geoData);

    const vectorSource = new VectorSource({
      features: new GeoJSON().readFeatures(safeData, {
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:3857",
      }),
    });

    const plantationStyle = (feature) => {
      const styles = [
        new Style({
          stroke: new Stroke({ color: "red", width: 2 }),
          // fill: new Fill({ color: "rgba(34,139,34,0.25)" }),
        }),
      ];

      const geometry = feature.getGeometry();
      if (geometry) {
        let center;
        switch (geometry.getType()) {
          case "Polygon":
            center = geometry.getInteriorPoint().getCoordinates();
            break;
          case "MultiPolygon":
            center = geometry.getInteriorPoints().getFirstCoordinate();
            break;
          case "Point":
            center = geometry.getCoordinates();
            break;
          default:
            const extent = geometry.getExtent();
            center = [(extent[0] + extent[2]) / 2, (extent[1] + extent[3]) / 2];
        }

        styles.push(
          new Style({
            geometry: new Point(center),
            image: new Icon({
              anchor: [0.5, 1],
              src: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
              scale: 0.05,
            }),
          })
        );
      }
      return styles;
    };

    const plantationLayer = new VectorLayer({
      source: vectorSource,
      style: plantationStyle,
    });
    plantationLayer.setZIndex(100);
    map.addLayer(plantationLayer);
    plantationLayerRef.current = plantationLayer;

    // Fit extent
    const extent = vectorSource.getExtent();
    if (extent.every(Number.isFinite)) {
      view.fit(extent, { padding: [50, 50, 50, 50], maxZoom: 18 });
    }

    map.on("pointermove", (evt) => {
      const hit = map.hasFeatureAtPixel(evt.pixel, {
        layerFilter: (layer) => layer === plantationLayer,
      });
      map.getTargetElement().style.cursor = hit ? "pointer" : "";
    });

    const parseDescription = (desc) => {
      if (!desc) return { Village: "NA", Taluka: "NA" };

      const villageMatch = desc.match(/Village:\s*(.+)/);
      const talukaMatch = desc.match(/Taluka:\s*(.+)/);

      // Remove trailing parts if present
      const Village = villageMatch
        ? villageMatch[1].split("\n")[0].trim()
        : "NA";
      const Taluka = talukaMatch ? talukaMatch[1].split("\n")[0].trim() : "NA";

      return { Village, Taluka };
    };

    map.on("singleclick", (evt) => {
      let found = false;
      map.forEachFeatureAtPixel(evt.pixel, (clickedFeature) => {
        if (!clickedFeature) return;
        console.log(clickedFeature);
        const description = clickedFeature.get("description");
        const { Village, Taluka } = parseDescription(description);
        const geometry = clickedFeature.getGeometry();
        let coordinates;

        switch (geometry.getType()) {
          case "Polygon":
            coordinates = geometry.getInteriorPoint().getCoordinates();
            break;
          case "MultiPolygon":
            coordinates = geometry.getInteriorPoints().getFirstCoordinate();
            break;
          case "Point":
            coordinates = geometry.getCoordinates();
            break;
          default:
            const ext = geometry.getExtent();
            coordinates = [(ext[0] + ext[2]) / 2, (ext[1] + ext[3]) / 2];
        }
        const data = {
          name: clickedFeature.get("Name") || "NA", // or farmerName if needed
          Village: clickedFeature.get("Village") || "NA",
          Taluka:
            clickedFeature.get("Taluka") || clickedFeature.get("block") || "NA",
          coordinates,
        };

        console.log("Clicked plantation data:", data);

        setMapClickedPlantation({
          name: clickedFeature.get("Name") || "NA",
          Village,
          Taluka,
          coordinates: coordinates,
          pixel: evt.pixel,
        });
        found = true;
      });

      if (!found) setMapClickedPlantation(null);
    });
  };

  useEffect(() => {
    if (view === "map" && mapElement1.current) {
      if (!mapRef1.current) {
        initializeMap();
      } else {
        mapRef1.current.setTarget(mapElement1.current);
      }
    }
  }, [view]);

  // useEffect(() => {
  //   if (mapRef1.current && geoData?.features && view === "map") {
  //     initializeMap(mapRef1.current, !hasZoomedRef.current);
  //     hasZoomedRef.current = true;
  //   }
  // }, [geoData, view]);

  useEffect(() => {
    if (
      !selectedFeature ||
      !mapRef1.current ||
      !plantationLayerRef.current ||
      view !== "map"
    )
      return;

    const map = mapRef1.current;
    const source = plantationLayerRef.current.getSource();

    // Clear all other features
    source.clear();

    // Add only the selected feature
    const singleFeature = new GeoJSON().readFeature(selectedFeature, {
      dataProjection: "EPSG:4326",
      featureProjection: "EPSG:3857",
    });

    source.addFeature(singleFeature);

    // Style it prominently
    singleFeature.setStyle(
      new Style({
        stroke: new Stroke({ color: "green", width: 3 }),
        // fill: new Fill({ color: "rgba(255,0,0,0.3)" }),
      })
    );

    // Zoom to the selected feature
    const geometry = singleFeature.getGeometry();
    if (geometry) {
      const extent = geometry.getExtent();
      if (extent.every(Number.isFinite)) {
        map.getView().fit(extent, {
          padding: [50, 50, 50, 50],
          maxZoom: 22,
          duration: 1000,
        });
      }
    }
  }, [selectedFeature, view]);

  const handlePlantationClick = (row) => {
    if (!geoData?.features) return;

    const feature = geoData.features.find(
      (f) => f.properties.uid === row.uid || f.properties.UID === row.uid
    );
    if (!feature) {
      console.error("Feature not found for row:", row);
      return;
    }

    // Convert to OL Feature
    const olFeature = new GeoJSON({
      dataProjection: "EPSG:4326",
      featureProjection: "EPSG:3857",
    }).readFeature(feature);

    const geometry = olFeature.getGeometry();
    if (!geometry) {
      console.warn("No geometry for clicked feature");
      return;
    }

    // Save state + switch view
    setSelectedPlantation(row);
    setSelectedFeature(feature);
    setView("map");

    // Zoom to that feature (when map is ready)
    setTimeout(() => {
      if (!mapRef1.current) return;
      const view = mapRef1.current.getView();

      if (geometry.getType() === "Point") {
        view.animate({
          center: geometry.getCoordinates(),
          zoom: 35,
          duration: 0,
        });
      } else {
        view.fit(geometry.getExtent(), {
          padding: [50, 50, 50, 50],
          duration: 1000,
          maxZoom: 35,
        });
      }
    }, 5);
  };

  const { rows, totalArea } = useMemo(() => {
    if (!geoData?.features) return { rows: [], totalArea: 0 };
    let totalArea = 0;

    const mappedRows = geoData.features.map((feature, index) => {
      const props = feature.properties || {};
      const geometry = feature.geometry || {};

      const area = parseFloat(props.area_ha) || 0;
      totalArea += area;

      let descFields = {};
      if (props.description) {
        props.description.split("\n").forEach((line) => {
          const [key, ...rest] = line.split(":");
          if (key && rest.length > 0) {
            descFields[key.trim().toLowerCase()] = rest.join(":").trim();
          }
        });
      }

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

      const interventionYear = "20-21";
      let avgTreeCover = "NA";
      if (props.IS_LULC) {
        try {
          const lulcArray = JSON.parse(props.IS_LULC);
          const treeValues = lulcArray
            .map((y) => y["6.0"])
            .filter((v) => v !== undefined);
          if (treeValues.length > 0) {
            const sum = treeValues.reduce((a, b) => a + b, 0);
            avgTreeCover = ((sum / treeValues.length) * 100).toFixed(2);
          }
        } catch (err) {
          console.error("Error parsing LULC:", err);
        }
      }

      return {
        id: index + 1,
        state: descFields["state"] || "NA",
        district: descFields["district"] || "NA",
        block: descFields["block"] || descFields["taluka"] || "NA",
        village: descFields["village"] || "NA",
        farmerName: descFields["name"] || "NA",
        farmerId: descFields["farmer id"] || "NA",
        siteId: descFields["site id"] || "NA",
        area: props.area_ha ? parseFloat(props.area_ha).toFixed(2) : "NA",
        patchScore: props.patch_score ?? "NA",
        patchSuitability: props.patch_suitability || "NA",
        averageTreeCover: avgTreeCover,
        coordinates,
        featureIndex: index,
        uid: props.uid || props["UID"] || "NA",
        area_ha: area,
      };
    });

    return {
      rows: mappedRows,
      totalArea: totalArea.toFixed(2),
    };
  }, [geoData]);

  const totalRows = rows.length;

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
      if (typeof row[key] === "object") return false;
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

    const matchesplantationSearch = row.farmerName
      ?.toString()
      .toLowerCase()
      .includes(plantationSearch.toLowerCase());

    return matchesGlobalSearch && matchesFilters && matchesplantationSearch;
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

  const handleMapBoxClick = () => {
    if (!mapClickedPlantation) return;

    // Remove ID in parentheses
    const cleanName = mapClickedPlantation.name
      .replace(/\s*\(.*\)$/, "")
      .trim();
    console.log("All plantation rows:");
    console.log("All rows:", rows);

    rows.forEach((row) => console.log(row.farmerName));

    const matchingRow = rows.find((row) => row.farmerName === cleanName);
    console.log(matchingRow);
    if (matchingRow) {
      console.log("Passing to handlePlantationClick:", matchingRow);
      handlePlantationClick(matchingRow);
    } else {
      console.warn("No matching plantation row found for:", cleanName);
    }
  };

  useEffect(() => {
    if (view === "table" && plantationLayerRef.current) {
      const source = plantationLayerRef.current.getSource();
      source.getFeatures().forEach((f) => f.setStyle(null)); // reset all styles
    }
  }, [view]);

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
              Under the project {project?.label}, {totalRows} sites have had
              plantations covering {totalArea} hectares.
            </Typography>
            <TableContainer component={Paper} sx={{ mt: 4, boxShadow: 0 }}>
              <Table>
                <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
                  <TableRow>
                    <TableCell align="center">
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        State
                        <IconButton
                          onClick={(e) => handleFilterClick(e, "state")}
                          size="small"
                        >
                          <FilterListIcon fontSize="small" />
                        </IconButton>
                      </div>
                    </TableCell>

                    <TableCell align="center">
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
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
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
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
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
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
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <span>Farmer's name</span>
                        <TextField
                          variant="standard"
                          placeholder="Search Farmer's name"
                          value={plantationSearch}
                          onChange={(e) => setplantationSearch(e.target.value)}
                          size="small"
                          InputProps={{ style: { fontSize: 12 } }}
                        />
                      </div>
                    </TableCell>

                    {/* Intervention year Column */}
                    <TableCell sx={{ cursor: "pointer", userSelect: "none" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        Intervention Year
                        <span
                          style={{
                            marginLeft: 4,
                            fontWeight: "normal",
                          }}
                        ></span>
                      </div>
                    </TableCell>

                    {/* Area Column */}
                    <TableCell sx={{ cursor: "pointer", userSelect: "none" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        Area (in hectares)
                        <span
                          style={{
                            marginLeft: 4,
                            fontWeight: "normal",
                          }}
                        ></span>
                      </div>
                    </TableCell>

                    {/* Patch suitablity*/}
                    <TableCell
                      align="center"
                      sx={{ cursor: "pointer", userSelect: "none" }}
                      onClick={() => handleSort("patchSuitability")}
                    >
                      Patch Suitability
                      <span
                        style={{
                          marginLeft: 4,
                          fontWeight:
                            sortField === "patchSuitability"
                              ? "bold"
                              : "normal",
                        }}
                      >
                        {sortField === "patchSuitability" && sortOrder === "asc"
                          ? "🔼"
                          : "🔽"}
                      </span>
                    </TableCell>

                    <TableCell
                      sx={{ cursor: "pointer", userSelect: "none" }}
                      onClick={() => handleSort("averageTreeCover")}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        Average tree cover (%)
                        <span
                          style={{
                            marginLeft: 4,
                            fontWeight:
                              sortField === "averageTreeCover"
                                ? "bold"
                                : "normal",
                          }}
                        >
                          {sortField === "averageTreeCover" &&
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
                      onClick={() => handlePlantationClick(row)}
                    >
                      <TableCell align="center">{row.state}</TableCell>
                      <TableCell align="center">{row.district}</TableCell>
                      <TableCell align="center">{row.block}</TableCell>
                      <TableCell align="center">{row.village}</TableCell>{" "}
                      <TableCell align="center">{row.farmerName}</TableCell>
                      <TableCell align="center">2020-21</TableCell>
                      <TableCell align="center">{row.area}</TableCell>
                      <TableCell align="center">
                        {row.patchSuitability}
                      </TableCell>
                      <TableCell align="center">
                        {row.averageTreeCover}
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
                  width: {
                    xs: "100%",
                    md: selectedPlantation ? "65%" : "100%",
                  },
                }}
              >
                <div
                  ref={mapElement1}
                  style={{
                    height: "1000px",
                    width: "100%",
                    border: "1px solid #ccc",
                    borderRadius: "5px",
                    position: "relative",
                  }}
                />

                {/* Top-left Label */}
                {selectedPlantation && (
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
                        {selectedPlantation?.farmerName || "NA"}
                      </Typography>
                    </Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      fontWeight={800}
                    >
                      Patch Suitabilty:{" "}
                      {selectedPlantation?.patchSuitability || "NA"}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      fontWeight={800}
                    >
                      Area (in hectares):{" "}
                      {(selectedFeature.properties?.area_ha || 0).toFixed(2)}{" "}
                      hectares
                    </Typography>
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
              </Box>
              {mapClickedPlantation && !selectedPlantation && (
                <Box
                  sx={{
                    position: "absolute",
                    top: mapClickedPlantation.pixel[1] - 0, // little above marker
                    left: mapClickedPlantation.pixel[0] + 15, // slight offset to right
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
                    {mapClickedPlantation.name}
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
                      {mapClickedPlantation.Village ?? "NA"}
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
                      {mapClickedPlantation.Taluka ?? "NA"}
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
              {selectedPlantation && (
                <Box
                  sx={{
                    width: { xs: "100%", md: "45%" },
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    alignItems: "center",
                  }}
                >
                  <Box
                    sx={{
                      width: "100%",
                      height: { xs: 300, sm: 350, md: 400 },
                    }}
                  >
                    <PlantationStackBarGraph
                      plantation={selectedPlantation}
                      plantationData={geoData}
                    />
                  </Box>

                  <Box
                    sx={{
                      width: "100%",
                      height: { xs: 300, sm: 350, md: 400 },
                      marginTop: "25%",
                    }}
                  >
                    <PlantationNDVIChart
                      plantation={selectedPlantation}
                      plantationData={geoData}
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
                </Box>
              )}
            </Box>
            <SoilPropertiesSection feature={selectedFeature} />
          </Box>
        ) : null}
      </Box>
    </Box>
  );
};

export default PlantationProjectDashboard;
