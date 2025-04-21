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
  Checkbox,
} from "@mui/material";
import { Download, Lightbulb } from "lucide-react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import XYZ from "ol/source/XYZ";
import { Control, defaults as defaultControls } from "ol/control";

const WaterProjectDashboard = () => {
  const { projectId } = useParams();
  const [view, setView] = useState("table");
  const [selectedRows, setSelectedRows] = useState([]);
  const mapElement = useRef();
  const mapRef = useRef();
  const baseLayerRef = useRef();

  const [organization, setOrganization] = useState(() => {
    const storedOrg = sessionStorage.getItem("selectedOrganization");
    return storedOrg ? JSON.parse(storedOrg) : null;
  });

  const [project, setProject] = useState(() => {
    const storedProject = sessionStorage.getItem("selectedProject");
    return storedProject || "";
  });

  useEffect(() => {
    const storedOrg = sessionStorage.getItem("selectedOrganization");
    const storedProject = sessionStorage.getItem("selectedProject");

    if (storedOrg) {
      setOrganization(JSON.parse(storedOrg)); // selectReact expects object: { label, value }
    }
    if (storedProject) {
      setProject(storedProject); // this is just the string value
    }
  }, []);

  const handleViewChange = (event, newView) => {
    if (newView !== null) {
      setView(newView);
    }
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
      state: "Bihar",
      district: "Patna",
      village: "Rampur",
      waterbody: "Pond B",
      siltRemoved: 1800,
      waterAvailability: "20%",
    },
  ];

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedRows(rows.map((row) => row.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
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
                    <TableCell padding="checkbox">
                      <Checkbox
                        indeterminate={
                          selectedRows.length > 0 &&
                          selectedRows.length < rows.length
                        }
                        checked={
                          rows.length > 0 && selectedRows.length === rows.length
                        }
                        onChange={handleSelectAll}
                      />
                    </TableCell>
                    <TableCell>
                      <strong>State</strong>
                    </TableCell>
                    <TableCell>
                      <strong>District</strong>
                    </TableCell>
                    <TableCell>
                      <strong>GP/Village</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Waterbody</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Silt Removed (Cu.m.)</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Avg. Water Availability During Zaid (%)</strong>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedRows.includes(row.id)}
                          onChange={() => handleSelectRow(row.id)}
                        />
                      </TableCell>
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
            </TableContainer>
          </>
        ) : (
          <Box sx={{ display: "flex", gap: 2, marginTop: 2 }}>
            {/* Map */}
            <div
              ref={mapElement}
              style={{
                height: "400px",
                width: "50%", // Adjust width as needed
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
                  textAlign: "left", // textAlign "center" doesn't behave well with flex text wrapping
                  display: "flex",
                  alignItems: "flex-start", // or "center" depending on vertical alignment preference
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
