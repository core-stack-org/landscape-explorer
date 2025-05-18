import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import { yearAtom } from "../store/locationStore.jsx";

import HeaderSelect from "../components/water_headerSection";
import water_rej from "../components/data/waterbody_rej_data.json";
import { useParams } from "react-router-dom";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import Map from "ol/Map";
import { Style, Fill, Stroke } from "ol/style";
import SurfaceWaterBodiesChart from "./WaterUsedChart";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import YearSlider from "./yearSlider";

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

const useWaterRejData = () => {
  const [geoData, setGeoData] = useState(null);

  const [project, setProject] = useState(() => {
    const stored = sessionStorage.getItem("selectedProject");
    try {
      return stored ? JSON.parse(stored) : null;
    } catch (err) {
      console.error("Failed to parse stored project:", err);
      return null;
    }
  });

  const projectName = project?.label; // e.g. "ATCF_UP"
  const projectId = project?.value; // e.g. "5"

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
          maxFeatures: "50",
          outputFormat: "application/json",
        });

      console.log("Fetching GeoJSON from:", url);

      try {
        const response = await fetch(url);
        if (!response.ok) {
          const errorText = await response.text();
          console.error("GeoServer error response:", errorText);
          throw new Error(`GeoServer returned status ${response.status}`);
        }

        const data = await response.json();
        console.log(data);
        setGeoData(data);
      } catch (err) {
        console.error("❌ Failed to fetch or parse GeoJSON:", err);
        setGeoData(null);
      }
    };

    fetchGeoJSON();
  }, [projectName, projectId]);

  return geoData;
};

const WaterProjectDashboard = () => {
  const { projectId } = useParams();
  const [view, setView] = useState("table");
  const [anchorEl, setAnchorEl] = useState(null);
  const [filterType, setFilterType] = useState("");

  const [selectedWaterbody, setSelectedWaterbody] = useState(null);
  const [waterBodyLayer, setWaterBodyLayer] = useState(null);
  const lulcYear = useRecoilValue(yearAtom);
  const [currentLayer, setCurrentLayer] = useState([]);

  const mapElement = useRef();
  const mapRef = useRef();
  const baseLayerRef = useRef();

  const [sortField, setSortField] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc");
  const [searchText, setSearchText] = useState("");

  const [organization, setOrganization] = useState(() => {
    const storedOrg = sessionStorage.getItem("selectedOrganization");
    return storedOrg ? JSON.parse(storedOrg) : null;
  });

  const [project, setProject] = useState(() => {
    const storedProject = sessionStorage.getItem("selectedProject");
    return storedProject || "";
  });

  const geoData = useWaterRejData(project, projectId);
  const rows = useMemo(() => {
    if (!geoData?.features) return [];

    return geoData.features.map((feature, index) => {
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

      const kKrValues = Object.entries(props)
        .filter(
          ([key]) =>
            (key.startsWith("k_") || key.startsWith("kr_")) &&
            !key.startsWith("krz_")
        )
        .map(([_, value]) => Number(value))
        .filter((val) => !isNaN(val));

      const avgKKr = kKrValues.length
        ? (
            kKrValues.reduce((acc, val) => acc + val, 0) / kKrValues.length
          ).toFixed(2)
        : null;

      const krzValues = Object.entries(props)
        .filter(([key]) => key.startsWith("krz_"))
        .map(([_, value]) => Number(value))
        .filter((val) => !isNaN(val));

      const avgKrz = krzValues.length
        ? (
            krzValues.reduce((acc, val) => acc + val, 0) / krzValues.length
          ).toFixed(2)
        : null;

      return {
        id: index + 1,
        state: props.State || "NA",
        district: props.District || "NA",
        block: props.Taluka || "NA",
        waterbody: props.waterbody_name || "NA",
        siltRemoved: props.slit_excavated || 0,
        avgWaterAvailabilityZaid: avgKrz,
        avgWaterAvailabilityKharifAndRabi: avgKKr,
        coordinates,
        featureIndex: index,
      };
    });
  }, [geoData]);

  const [year, setYear] = useState(2024);
  const handleYearChange = (newYear) => setYear(newYear);

  const [filters, setFilters] = useState({
    state: [],
    district: [],
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
    const storedOrg = sessionStorage.getItem("selectedOrganization");
    const storedProject = sessionStorage.getItem("selectedProject");

    if (storedOrg) {
      setOrganization(JSON.parse(storedOrg));
    }
    if (storedProject) {
      setProject(storedProject);
    }
  }, []);
  useEffect(() => {
    console.log("slider vala useEffect");

    const fetchUpdateLulc = async () => {
      if (!lulcYear || !lulcYear.includes("_")) {
        console.warn("Invalid lulcYear:", lulcYear);
        return;
      }

      if (currentLayer !== null && currentLayer.length > 0) {
        let tempArr = currentLayer;
        let tempLen = tempArr.length;

        for (let i = 0; i < tempLen; ++i) {
          if (tempArr[i].name === "lulcWaterrej") {
            if (mapRef.current && tempArr[i].layerRef?.[0]) {
              mapRef.current.removeLayer(tempArr[i].layerRef[0]);
            }

            const fullYear = lulcYear
              .split("_")
              .map((part) => `20${part}`)
              .join("_")
              .toLowerCase()
              .replace(/\s/g, "_");
            console.log(project);
            console.log("project in useEffect:", project);
            console.log("typeof project:", typeof project);
            let parsedProject;
            try {
              parsedProject = JSON.parse(project); // project is a string
            } catch (err) {
              console.error("Failed to parse project string:", err);
              return;
            }

            const projectName = parsedProject.label;
            const projectId = parsedProject.value;
            const layerName = `clipped_lulc_filtered_mws_${projectName}_${projectId}_${fullYear}`;
            console.log(layerName);
            let tempLayer = await getImageLayer(
              "waterrej",
              layerName,
              true,
              ""
            );
            tempLayer.setZIndex(0);

            if (mapRef.current) {
              mapRef.current.addLayer(tempLayer);
            }

            tempArr[i].layerRef[0] = tempLayer;
          }
        }

        setCurrentLayer(tempArr);

        if (selectedWaterbody?.geometry && mapRef.current && waterBodyLayer) {
          const source = waterBodyLayer.getSource();
          const features = source.getFeatures();

          features.forEach((feature) => feature.setStyle(null));

          const extent = selectedWaterbody.geometry.getExtent();

          mapRef.current.getView().fit(extent, {
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
        setCurrentLayer([{ name: "lulcWaterrej", layerRef: [] }]);
      }
    };

    fetchUpdateLulc().catch(console.error);
  }, [lulcYear, currentLayer, selectedWaterbody, waterBodyLayer]);

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
    return (
      Object.keys(row).some((key) => {
        if (!row[key]) return false;
        if (typeof row[key] === "object") return false; // Skip objects like coordinates
        return row[key]
          .toString()
          .toLowerCase()
          .includes(searchText.toLowerCase());
      }) &&
      Object.keys(filters).every((key) => {
        if (filters[key].length === 0) return true;
        return filters[key].includes(String(row[key]));
      })
    );
  });

  const sortedRows = [...filteredRows].sort((a, b) => {
    if (!sortField) return 0;
    const aValue = a[sortField];
    const bValue = b[sortField];

    if (sortField === "waterAvailability") {
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

  const initializeMap = async () => {
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
      target: mapElement.current,
      layers: [baseLayer],
      controls: defaultControls().extend([new GoogleLogoControl()]),
      view: view,
      loadTilesWhileAnimating: true,
      loadTilesWhileInteracting: true,
    });

    mapRef.current = map;

    // Create water body layer
    const vectorLayerWater = new VectorSource({
      features: new GeoJSON({
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:4326",
      }).readFeatures(water_rej),
    });

    const waterBodyLayer = new VectorLayer({
      source: vectorLayerWater,
      style: new Style({
        stroke: new Stroke({ color: "#6495ed", width: 5 }),
        fill: new Fill({ color: "rgba(100, 149, 237, 0.5)" }),
      }),
    });
    waterBodyLayer.setZIndex(1);

    // const lulcWaterRej = await getImageLayer(
    //   "waterrej",
    //   "clipped_lulc_filtered_mws_ATCF_UP_2017_2018",
    //   true,
    //   "lulc_level_3_style"
    // );

    // map.addLayer(lulcWaterRej);
    map.addLayer(waterBodyLayer);
    setWaterBodyLayer(waterBodyLayer);

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
        zoomToWaterbody(selectedWaterbody);
      }
    });
  };

  useEffect(() => {
    if (view === "map" && mapElement.current) {
      initializeMap();
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.setTarget(null);
      }
    };
  }, [view]);

  useEffect(() => {
    if (
      view === "map" &&
      mapRef.current &&
      selectedWaterbody &&
      selectedWaterbody.coordinates
    ) {
      zoomToWaterbody(selectedWaterbody);
    }
  }, [selectedWaterbody, view]);

  const zoomToWaterbody = (waterbody) => {
    if (!waterbody.coordinates) {
      console.error("No coordinates found for waterbody:", waterbody.waterbody);
      return;
    }

    const mapView = mapRef.current.getView();
    mapView.animate({
      center: waterbody.coordinates,
      zoom: 18,
      duration: 1000,
    });
    if (waterBodyLayer) {
      const source = waterBodyLayer.getSource();
      const features = source.getFeatures();

      features.forEach((feature) => {
        feature.setStyle(null);
      });

      if (
        waterbody.featureIndex !== undefined &&
        features[waterbody.featureIndex]
      ) {
        const selectedFeature = features[waterbody.featureIndex];
        selectedFeature.setStyle(
          new Style({
            stroke: new Stroke({ color: "#FF0000", width: 5 }),
            fill: new Fill({ color: "rgba(255, 0, 0, 0.5)" }),
          })
        );
      }
    }
  };

  const handleWaterbodyClick = (row) => {
    const feature = geoData.features.find((f, idx) => idx === row.featureIndex);

    if (
      feature &&
      feature.properties?.latitude &&
      feature.properties?.longitude
    ) {
      const coordinates = [
        feature.properties.longitude,
        feature.properties.latitude,
      ];
      row.coordinates = coordinates;

      setSelectedWaterbody(row);
      setView("map");

      zoomToWaterbody(coordinates, mapRef); // ✅ Direct zoom
    } else {
      console.error("Coordinates not found in feature properties.");
    }
  };

  return (
    <Box sx={{ position: "relative" }}>
      <HeaderSelect showExtras organization={organization} project={project} />

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
              Under the project {projectId}, 18 waterbodies have been de-silted,
              spanning around 90 hectares. On average, the surface water
              availability during summer season has changed from 16% to 25%.
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
                        GP/Village
                        <IconButton
                          onClick={(e) => handleFilterClick(e, "village")}
                          size="small"
                        >
                          <FilterListIcon fontSize="small" />
                        </IconButton>
                      </div>
                    </TableCell>

                    <TableCell>Waterbody</TableCell>

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
                      onClick={() => handleSort("waterAvailability")}
                      sx={{ cursor: "pointer", userSelect: "none" }}
                    >
                      <div style={{ display: "flex", alignItems: "center" }}>
                        Avg. Water Availability During Zaid (%)
                        <span
                          style={{
                            marginLeft: 4,
                            fontWeight:
                              sortField === "waterAvailability"
                                ? "bold"
                                : "normal",
                          }}
                        >
                          {sortField === "waterAvailability" &&
                          sortOrder === "asc"
                            ? "🔼"
                            : "🔽"}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell
                      onClick={() => handleSort("waterAvailability")}
                      sx={{ cursor: "pointer", userSelect: "none" }}
                    >
                      <div style={{ display: "flex", alignItems: "center" }}>
                        Avg. Water Availability During Kharif and Rabi (%)
                        <span
                          style={{
                            marginLeft: 4,
                            fontWeight:
                              sortField === "waterAvailability"
                                ? "bold"
                                : "normal",
                          }}
                        >
                          {sortField === "waterAvailability" &&
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
                    <TableRow key={row.id} hover>
                      <TableCell>{row.state}</TableCell>
                      <TableCell>{row.district}</TableCell>
                      <TableCell>{row.block}</TableCell>{" "}
                      <TableCell
                        onClick={() => handleWaterbodyClick(row)}
                        sx={{ cursor: "pointer" }}
                      >
                        {row.waterbody}
                      </TableCell>
                      <TableCell>{row.siltRemoved}</TableCell>
                      <TableCell>{row.avgWaterAvailabilityZaid}</TableCell>
                      <TableCell>
                        {row.avgWaterAvailabilityKharifAndRabi}
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
              gap: 2,
              marginTop: 2,
            }}
          >
            {/* Map and paragraph side by side */}
            <Box sx={{ display: "flex" }}>
              {/* Map */}

              <Box
                sx={{
                  position: "relative",
                  width: "100%",
                  height: "100%",
                }}
              >
                {/* OpenLayers map container */}
                <div
                  ref={mapElement}
                  style={{
                    height: "800px",

                    border: "1px solid #ccc",
                    borderRadius: "5px",
                  }}
                />
                {/* Top-left label */}
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

                  <Typography variant="body2" color="text.secondary">
                    Silt Removed: {selectedWaterbody?.siltRemoved || "silt"}{" "}
                    cubic metre
                  </Typography>
                </Box>

                {/* Legend overlayed on the map */}
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

                  <Box display="flex" alignItems="center" gap={1} mt={1}>
                    <Box
                      sx={{
                        width: 20,
                        height: 20,
                        backgroundColor: "#74CCF4",
                        opacity: 0.7,
                        border: "1px solid #000",
                      }}
                    />
                    <Typography variant="body2">Kharif Water</Typography>
                  </Box>

                  <Box display="flex" alignItems="center" gap={1} mt={1}>
                    <Box
                      sx={{
                        width: 20,
                        height: 20,
                        backgroundColor: "#1ca3ec",
                        opacity: 0.7,
                        border: "1px solid #000",
                      }}
                    />
                    <Typography variant="body2">
                      Kharif and Rabi Water
                    </Typography>
                  </Box>

                  <Box display="flex" alignItems="center" gap={1} mt={1}>
                    <Box
                      sx={{
                        width: 20,
                        height: 20,
                        backgroundColor: "#0f5e9c",
                        opacity: 0.7,
                        border: "1px solid #000",
                      }}
                    />
                    <Typography variant="body2">
                      Kharif, Rabi and Zaid Water
                    </Typography>
                  </Box>
                </Box>
                <Box
                  sx={{
                    position: "absolute",
                    bottom: 16,
                    right: 16,
                    backgroundColor: "rgba(255, 255, 255, 0.9)",
                    padding: 2,
                    borderRadius: 1,
                    boxShadow: 2,
                    zIndex: 1000, // Make sure it stays on top
                    minWidth: "600px",
                  }}
                >
                  <YearSlider currentLayer={{ name: "lulcWaterrej" }} />
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
                      const view = mapRef.current?.getView();
                      if (view) {
                        view.animate({
                          zoom: view.getZoom() + 1,
                          duration: 300,
                        });
                      }
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
                      const view = mapRef.current?.getView();
                      if (view) {
                        view.animate({
                          zoom: view.getZoom() - 1,
                          duration: 300,
                        });
                      }
                    }}
                  >
                    –
                  </button>
                </Box>
              </Box>

              {/* Paragraph */}
              <Box
                sx={{
                  width: "80%",
                  padding: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    textAlign: "left",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 2,
                    border: "10px solid #11000080",
                    padding: 2,
                    backgroundColor: "#f5f5f5",
                    borderRadius: "5px",
                  }}
                >
                  <Lightbulb size={48} color="black" />
                  <span>
                    Under the project {projectId}, 18 waterbodies have been
                    de-silted, spanning around 90 hectares. On average, the
                    surface water availability during summer season has changed
                    from 16% to 25%.
                  </span>
                </Typography>
              </Box>
            </Box>
            {selectedWaterbody !== undefined && selectedWaterbody !== null && (
              <>
                <div style={{ display: "flex", gap: "16px" }}>
                  <div style={{ width: "50%", height: "400px" }}>
                    <WaterAvailabilityChart
                      waterbody={selectedWaterbody}
                      water_rej={geoData}
                    />
                    {/* <SurfaceWaterChart
                      waterbody={selectedWaterbody}
                      water_rej={water_rej}
                    /> */}
                  </div>
                </div>
                <Box sx={{ display: "flex" }}>
                  <div style={{ width: "50%", height: "400px" }}></div>
                </Box>
              </>
            )}
          </Box>
        ) : null}
      </Box>
    </Box>
  );
};

export default WaterProjectDashboard;
