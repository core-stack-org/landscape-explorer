import React, { useState, useEffect, useRef } from "react";
import HeaderSelect from "../components/water_headerSection";
import { useParams } from "react-router-dom";
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
  Select,
  MenuItem,
  Checkbox,
  Menu,
  IconButton,
  ListItemText,
  TextField,
} from "@mui/material";
import { Download, Lightbulb } from "lucide-react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import XYZ from "ol/source/XYZ";
import { Control, defaults as defaultControls } from "ol/control";
import FilterListIcon from "@mui/icons-material/FilterList";

const WaterProjectDashboard = () => {
  const { projectId } = useParams();
  const [view, setView] = useState("table");
  const [selectedRows, setSelectedRows] = useState([]);
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
  const rows = [
    {
      id: 1,
      state: "Bihar",
      district: "Patna",
      village: "Rampur",
      waterbody: "Pond A",
      siltRemoved: 1500,
      waterAvailability: "25%",
    },
    {
      id: 2,
      state: "Jharkhand",
      district: "Patna",
      village: "Rampur",
      waterbody: "Pond B",
      siltRemoved: 1800,
      waterAvailability: "20%",
    },
    {
      id: 3,
      state: "Gujarat",
      district: "Valsad",
      village: "Kaprada",
      waterbody: "Pond C",
      siltRemoved: 15000,
      waterAvailability: "35%",
    },
    {
      id: 4,
      state: "Rajasthan",
      district: "Bhilwada",
      village: "Manadalgarh",
      waterbody: "Pond D",
      siltRemoved: 1880,
      waterAvailability: "50%",
    },
    {
      id: 5,
      state: "Bihar",
      district: "Patna",
      village: "Rampur",
      waterbody: "Pond E",
      siltRemoved: 500,
      waterAvailability: "5%",
    },
    {
      id: 6,
      state: "Jharkhand",
      district: "Dumka",
      village: "Masalia",
      waterbody: "Pond F",
      siltRemoved: 2800,
      waterAvailability: "10%",
    },
  ];
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

  const [anchorEl, setAnchorEl] = useState(null);
  const [filterType, setFilterType] = useState("");

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
    console.log("Row:", row); // Check the current row being evaluated
    return (
      Object.keys(row).some((key) => {
        if (!row[key]) return false; // Ignore null/undefined values
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
  console.log("Filtered Rows:", filteredRows);

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

  const initializeMap = () => {
    console.log("Map target:", mapElement.current);
    console.log("Map instance created");

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
      center: [78.9, 23.6], // EPSG:4326, center over India
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
          height: "600px",
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
              Under the project {projectId}, 79 waterbodies have been de-silted,
              spanning around 90 hectares. On average, the surface water
              availability during summer season has changed from 16% to 25%. The
              average zone of influence distance has increased from 200 m to 450
              m.
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
                  </TableRow>
                </TableHead>

                <TableBody>
                  {sortedRows.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell>{row.state}</TableCell>
                      <TableCell>{row.district}</TableCell>
                      <TableCell>{row.village}</TableCell>
                      <TableCell>{row.waterbody}</TableCell>
                      <TableCell>{row.siltRemoved}</TableCell>
                      <TableCell>{row.waterAvailability}</TableCell>
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
        ) : (
          <Box sx={{ display: "flex", gap: 2, marginTop: 2 }}>
            {/* Map */}
            <div
              ref={mapElement}
              style={{
                height: "400px",
                width: "50%",
                border: "1px solid #ccc",
                borderRadius: "5px",
              }}
            />

            {/* Paragraph */}
            <Box
              sx={{
                width: "50%",
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
                  Under the project {projectId}, 79 waterbodies have been
                  de-silted, spanning around 90 hectares. On average, the
                  surface water availability during summer season has changed
                  from 16% to 25%. The average zone of influence distance has
                  increased from 200 m to 450 m.
                </span>
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default WaterProjectDashboard;
