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

import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
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
  const [infoText, setInfoText] = useState("");
  const [infoAnchorEl, setInfoAnchorEl] = useState(null);
  const [openInfoKey, setOpenInfoKey] = useState(null);
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

  function filteredGeoJSON(geojson) {
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

    const safeData = filteredGeoJSON(geoData);

    const vectorSource = new VectorSource({
      features: new GeoJSON().readFeatures(safeData, {
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:3857",
      }),
    });

    const plantationStyle = (feature) => {
      const styles = [
        new Style({
          stroke: new Stroke({ color: "green", width: 3 }),
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

  useEffect(() => {
    const map = mapRef1.current;
    const plantationLayer = plantationLayerRef.current;

    if (!map || !plantationLayer) return;

    const source = plantationLayer.getSource();

    if (view === "table") {
      setSelectedPlantation(null);
      setSelectedFeature(null);
      setMapClickedPlantation(null);

      if (source) source.clear();
      map.getOverlays().clear();
    }

    if (view === "map" && geoData?.features?.length) {
      const format = new GeoJSON();
      const features = format.readFeatures(geoData, {
        featureProjection: "EPSG:3857",
      });

      if (source) {
        source.clear();
        source.addFeatures(features);
      }

      if (!selectedFeature && features.length) {
        const extent = source.getExtent();
        if (extent.every(Number.isFinite)) {
          map.getView().fit(extent, {
            padding: [50, 50, 50, 50],
            duration: 1000,
            maxZoom: 18,
          });
        }
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [view, geoData, selectedFeature]);

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

    source.clear();

    const singleFeature = new GeoJSON().readFeature(selectedFeature, {
      dataProjection: "EPSG:4326",
      featureProjection: "EPSG:3857",
    });

    source.addFeature(singleFeature);

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

    const olFeature = new GeoJSON({
      dataProjection: "EPSG:4326",
      featureProjection: "EPSG:3857",
    }).readFeature(feature);

    const geometry = olFeature.getGeometry();
    if (!geometry) {
      console.warn("No geometry for clicked feature");
      return;
    }

    setSelectedPlantation(row);
    setSelectedFeature(feature);
    setView("map");

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

      let avgTreeCover = 0;
      let preTreeCover = 0;
      let postTreeCover = 0;
      let treeCoverChange = 0;

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
          const preInterventionValues = [];
          const postInterventionValues = [];

          lulcArray.forEach((entry) => {
            const year = parseInt(entry.year);
            const treeCover = entry["6.0"];

            if (treeCover !== undefined) {
              if (year < 2020) {
                preInterventionValues.push(treeCover);
              } else {
                postInterventionValues.push(treeCover);
              }
            }
          });

          if (preInterventionValues.length > 0) {
            const preInterventionSum = preInterventionValues.reduce(
              (a, b) => a + b,
              0
            );
            preTreeCover = (
              (preInterventionSum / preInterventionValues.length) *
              100
            ).toFixed(2);
          }

          if (postInterventionValues.length > 0) {
            const postInterventionSum = postInterventionValues.reduce(
              (a, b) => a + b,
              0
            );
            postTreeCover = (
              (postInterventionSum / postInterventionValues.length) *
              100
            ).toFixed(2);
          }

          if (preTreeCover !== "NA" && postTreeCover !== "NA") {
            treeCoverChange = (postTreeCover - preTreeCover).toFixed(2);
          } else {
            treeCoverChange = "NA";
          }
        } catch (err) {
          console.error("Error parsing LULC:", err);
        }
      }
      let treeCoverChangeColor = "";
      if (treeCoverChange !== "NA") {
        treeCoverChangeColor =
          treeCoverChange > 0 ? "green" : treeCoverChange < 0 ? "red" : "";
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
        suitabilityScore: props.patch_score || "NA",
        averageTreeCover: avgTreeCover,
        treeCoverChange,
        treeCoverChangeColor,
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

  const handleInfoClick = (key) => {
    setOpenInfoKey(openInfoKey === key ? null : key);
  };

  // Close tooltip on outside click
  useEffect(() => {
    const close = () => setOpenInfoKey(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const handleInfoClose = () => {
    setInfoAnchorEl(null);
    setInfoText("");
  };

  const infoOpen = Boolean(infoAnchorEl);

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

    const cleanName = mapClickedPlantation.name
      .replace(/\s*\(.*\)$/, "")
      .trim();

    const matchingRow = rows.find((row) => row.farmerName === cleanName);
    if (matchingRow) {
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
    <div sx={{ position: "relative" }}>
      <HeaderSelect
        showExtras
        organization={organization}
        project={project}
        setView={setView}
      />
      {/* Project Dashboard Text */}
      <div
        className="
    absolute top-[20%] left-[12%] -translate-x-1/2 -translate-y-1/2 z-[1] text-white text-2xl font-bold flex flex-col items-center
  "
      >
        {/* Toggle Button Group */}
        <div className="flex items-center gap-2 mt-2">
          <div
            className="
        flex justify-between items-center
        w-[280px] px-2 py-1
        rounded-md border-2 border-black
        bg-white/30 backdrop-blur-sm
      "
          >
            {/* Table Button */}
            <button
              type="button"
              onClick={() => handleViewChange(null, "table")}
              className={` flex items-center justify-center gap-2 flex-1
          font-semibold text-black py-2.5 rounded
          transition-all duration-150 ease-in-out
          ${
            view === "table"
              ? "bg-white/70 shadow-inner scale-[0.99]"
              : "hover:bg-white/40 active:scale-[0.98]"
          }
        `}
            >
              <span className="text-base">Table</span>
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
          font-semibold text-black py-1.5 rounded
          transition-all duration-150 ease-in-out
          ${
            view === "map"
              ? "bg-white/70 shadow-inner scale-[0.99]"
              : "hover:bg-white/40 active:scale-[0.98]"
          }
        `}
            >
              <span className="text-base">Map</span>
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
      </div>

      {/* Conditional Rendering for Table or Map */}
      <div className="absolute top-[calc(20%+88px+16px)] left-[2.5%] w-[92%] h-auto bg-white p-5 rounded-md z-[1]">
        {view === "table" ? (
          <>
            <p className="text-center flex items-center gap-2 border-[10px] border-[#11000080] text-xl">
              <Lightbulb size={94} color="black" />
              Under the project {project?.label}, {totalRows} sites have had
              plantations covering {totalArea} hectares.
            </p>

            {/* Table Section */}
            <div className="mt-4 bg-white shadow-none rounded-md overflow-hidden">
              <div className="w-full overflow-x-auto">
                <table className="min-w-full border border-gray-200 text-sm text-gray-800">
                  <thead className="bg-gray-100 font-semibold">
                    <tr className="border-b">
                      {/* ---- State ---- */}
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
                            <FilterListIcon
                              fontSize="small"
                              className="text-gray-600"
                            />
                          </button>
                          <button
                            title="Click the Info icon for details"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInfoClick("state");
                            }}
                            className="p-1 text-blue-600 hover:scale-110 transition-transform"
                          >
                            <InfoOutlinedIcon
                              fontSize="small"
                              className="text-blue-600 transition-transform duration-150 hover:scale-125"
                            />
                          </button>
                        </div>

                        {openInfoKey === "state" && (
                          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 bg-white border border-gray-300 rounded-md shadow-md p-2 text-xs text-gray-800 w-64 z-50">
                            State where the plantation site is located.
                          </div>
                        )}
                      </th>

                      {/* ---- District ---- */}
                      <th className="relative px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          District
                          <button
                            onClick={(e) => handleFilterClick(e, "district")}
                            className="p-1 hover:scale-110 transition-transform"
                          >
                            <FilterListIcon
                              fontSize="small"
                              className="text-gray-600"
                            />
                          </button>
                          <button
                            title="Click the Info icon for details"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInfoClick("district");
                            }}
                            className="p-1 text-blue-600 hover:scale-110 transition-transform"
                          >
                            <InfoOutlinedIcon
                              fontSize="small"
                              className="text-blue-600 transition-transform duration-150 hover:scale-125"
                            />
                          </button>
                        </div>

                        {openInfoKey === "district" && (
                          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 bg-white border border-gray-300 rounded-md shadow-md p-2 text-xs text-gray-800 w-64 z-50">
                            District where the plantation site is located.
                          </div>
                        )}
                      </th>

                      {/* ---- Taluka ---- */}
                      <th className="relative px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          Taluka
                          <button
                            onClick={(e) => handleFilterClick(e, "block")}
                            className="p-1 hover:scale-110 transition-transform"
                          >
                            <FilterListIcon
                              fontSize="small"
                              className="text-gray-600"
                            />
                          </button>
                          <button
                            title="Click the Info icon for details"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInfoClick("taluka");
                            }}
                            className="p-1 text-blue-600 hover:scale-110 transition-transform"
                          >
                            <InfoOutlinedIcon
                              fontSize="small"
                              className="text-blue-600 transition-transform duration-150 hover:scale-125"
                            />
                          </button>
                        </div>

                        {openInfoKey === "taluka" && (
                          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 bg-white border border-gray-300 rounded-md shadow-md p-2 text-xs text-gray-800 w-64 z-50">
                            Taluka where the plantation site is located.
                          </div>
                        )}
                      </th>

                      {/* ---- GP/Village ---- */}
                      <th className="relative px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          GP/Village
                          <button
                            onClick={(e) => handleFilterClick(e, "village")}
                            className="p-1 hover:scale-110 transition-transform"
                          >
                            <FilterListIcon
                              fontSize="small"
                              className="text-gray-600"
                            />
                          </button>
                          <button
                            title="Click the Info icon for details"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInfoClick("village");
                            }}
                            className="p-1 text-blue-600 hover:scale-110 transition-transform"
                          >
                            <InfoOutlinedIcon
                              fontSize="small"
                              className="text-blue-600 transition-transform duration-150 hover:scale-125"
                            />
                          </button>
                        </div>

                        {openInfoKey === "village" && (
                          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 bg-white border border-gray-300 rounded-md shadow-md p-2 text-xs text-gray-800 w-64 z-50">
                            GP/Village where the plantation site is located.
                          </div>
                        )}
                      </th>

                      {/* ---- Farmer's Name ---- */}
                      <th className="relative px-4 py-3 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="flex items-center gap-1 mb-1">
                            <span>Farmer's Name</span>
                            <button
                              title="Click the Info icon for details"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleInfoClick("farmerName");
                              }}
                              className="p-1 text-blue-600 hover:scale-110 transition-transform"
                            >
                              <InfoOutlinedIcon
                                fontSize="small"
                                className="text-blue-600 transition-transform duration-150 hover:scale-125"
                              />
                            </button>
                          </div>
                          <input
                            type="text"
                            placeholder="Search Farmer's name"
                            value={plantationSearch}
                            onChange={(e) =>
                              setplantationSearch(e.target.value)
                            }
                            className="border-b border-gray-700 bg-gray-100 text-xs text-gray-700 px-1 py-0.5 w-40 focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        {openInfoKey === "farmerName" && (
                          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 bg-white border border-gray-300 rounded-md shadow-md p-2 text-xs text-gray-800 w-64 z-50">
                            Name of the Farmer whose plantation site is being
                            monitored.
                          </div>
                        )}
                      </th>

                      {/* ---- Intervention Year ---- */}
                      <th className="relative px-4 py-3 text-center cursor-pointer select-none">
                        <div className="flex items-center justify-center gap-1">
                          Intervention Year
                          <button
                            title="Click the Info icon for details"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInfoClick("interventionYear");
                            }}
                            className="p-1 text-blue-600 hover:scale-110 transition-transform"
                          >
                            <InfoOutlinedIcon
                              fontSize="small"
                              className="text-blue-600 transition-transform duration-150 hover:scale-125"
                            />
                          </button>
                        </div>

                        {openInfoKey === "interventionYear" && (
                          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 bg-white border border-gray-300 rounded-md shadow-md p-2 text-xs text-gray-800 w-64 z-50">
                            The year in which intervention was carried out for
                            the plantation site.
                          </div>
                        )}
                      </th>

                      {/* ---- Area ---- */}
                      <th className="relative px-4 py-3 text-center cursor-pointer select-none">
                        <div className="flex items-center justify-center gap-1">
                          Area (in hectares)
                          <button
                            title="Click the Info icon for details"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInfoClick("area");
                            }}
                            className="p-1 text-blue-600 hover:scale-110 transition-transform"
                          >
                            <InfoOutlinedIcon
                              fontSize="small"
                              className="text-blue-600 transition-transform duration-150 hover:scale-125"
                            />
                          </button>
                        </div>

                        {openInfoKey === "area" && (
                          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 bg-white border border-gray-300 rounded-md shadow-md p-2 text-xs text-gray-800 w-64 z-50">
                            Total area of the plantation site measured in
                            hectares.
                          </div>
                        )}
                      </th>

                      {/* ---- Patch Suitability ---- */}
                      <th
                        className="relative px-4 py-3 text-center cursor-pointer select-none"
                        onClick={() => handleSort("patchSuitability")}
                      >
                        <div className="flex items-center justify-center gap-1">
                          Patch Suitability
                          <span className="ml-1">
                            {sortField === "patchSuitability" &&
                            sortOrder === "asc"
                              ? "🔼"
                              : "🔽"}
                          </span>
                          <button
                            title="Click the Info icon for details"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInfoClick("patchSuitability");
                            }}
                            className="p-1 text-blue-600 hover:scale-110 transition-transform"
                          >
                            <InfoOutlinedIcon
                              fontSize="small"
                              className="text-blue-600 transition-transform duration-150 hover:scale-125"
                            />
                          </button>
                        </div>

                        {openInfoKey === "patchSuitability" && (
                          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 bg-white border border-gray-300 rounded-md shadow-md p-2 text-xs text-gray-800 w-64 z-50">
                            It shows whether the plantation site is suitable or
                            not.
                          </div>
                        )}
                      </th>

                      {/* ---- Average Tree Cover ---- */}
                      <th
                        className="relative px-4 py-3 text-center cursor-pointer select-none"
                        onClick={() => handleSort("averageTreeCover")}
                      >
                        <div className="flex items-center justify-center gap-1">
                          Average tree cover (%)
                          <span className="ml-1">
                            {sortField === "averageTreeCover" &&
                            sortOrder === "asc"
                              ? "🔼"
                              : "🔽"}
                          </span>
                          <button
                            title="Click the Info icon for details"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInfoClick("averageTreeCover");
                            }}
                            className="p-1 text-blue-600 hover:scale-110 transition-transform"
                          >
                            <InfoOutlinedIcon
                              fontSize="small"
                              className="text-blue-600 transition-transform duration-150 hover:scale-125"
                            />
                          </button>
                        </div>

                        {openInfoKey === "averageTreeCover" && (
                          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 bg-white border border-gray-300 rounded-md shadow-md p-2 text-xs text-gray-800 w-64 z-50">
                            It shows the average of trees covered for that
                            plantation site.
                          </div>
                        )}
                      </th>
                    </tr>
                  </thead>

                  {/* ---- Table Body ---- */}
                  <tbody className="text-sm text-gray-700">
                    {sortedRows.map((row) => (
                      <tr
                        key={row.id}
                        onClick={() => handlePlantationClick(row)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors border-b"
                      >
                        <td className="px-4 py-5 text-center">{row.state}</td>
                        <td className="px-4 py-2 text-center">
                          {row.district}
                        </td>
                        <td className="px-4 py-2 text-center">{row.block}</td>
                        <td className="px-4 py-2 text-center">{row.village}</td>
                        <td className="px-4 py-2 text-center">
                          {row.farmerName}
                        </td>
                        <td className="px-4 py-2 text-center">2020-21</td>
                        <td className="px-4 py-2 text-center">{row.area}</td>
                        <td className="px-4 py-2 text-center">
                          {row.patchSuitability}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {row.averageTreeCover}
                          {row.treeCoverChange !== "NA" && (
                            <span
                              className={`ml-1 ${
                                row.treeCoverChangeColor === "green"
                                  ? "text-green-600"
                                  : row.treeCoverChangeColor === "red"
                                  ? "text-red-600"
                                  : ""
                              }`}
                            >
                              ({row.treeCoverChange > 0 ? "+" : ""}
                              {row.treeCoverChange})
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ---- Filter Menu ---- */}
              {anchorEl && (
                <div
                  className="absolute z-50 bg-white border border-gray-300 rounded-md shadow-md p-3 mt-1"
                  style={{
                    top:
                      anchorEl?.getBoundingClientRect()?.bottom +
                      window.scrollY +
                      8,
                    left: anchorEl?.getBoundingClientRect()?.left,
                  }}
                >
                  {/* Search inside filter */}
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="border border-gray-300 rounded-md px-2 py-1 text-sm w-full mb-2 focus:outline-none focus:border-blue-500"
                  />

                  <button
                    onClick={() => handleClearSingleFilter(filterType)}
                    className="text-left text-sm text-red-600 hover:text-red-700 mb-2"
                  >
                    Clear {filterType} Filter
                  </button>

                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {Array.from(new Set(rows.map((r) => String(r[filterType]))))
                      .filter((option) =>
                        option
                          .toLowerCase()
                          .startsWith(searchText.toLowerCase())
                      )
                      .map((option) => (
                        <label
                          key={option}
                          className="flex items-center gap-2 cursor-pointer text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={filters[filterType]?.includes(option)}
                            onChange={() =>
                              handleFilterChange(filterType, option)
                            }
                            className="accent-blue-600"
                          />
                          <span>{option}</span>
                        </label>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {infoOpen && infoAnchorEl && (
              <div
                className="absolute z-50 bg-white border border-gray-300 rounded-md shadow-md p-2 text-sm text-gray-800 max-w-xs"
                style={{
                  top:
                    infoAnchorEl.getBoundingClientRect().bottom +
                    window.scrollY +
                    6,
                  left: infoAnchorEl.getBoundingClientRect().left,
                }}
              >
                {infoText}
              </div>
            )}
          </>
        ) : view === "map" ? (
          <div className="flex flex-col gap-8 mt-2 w-full px-4 sm:px-8 md:px-12">
            {selectedPlantation && (
              <div className="flex flex-col gap-2 w-full p-4 sm:p-6 md:p-4 rounded-xl bg-white shadow">
                {/* Heading */}
                <h2 className="text-xl font-bold text-blue-600 border-b-2 border-blue-600 pb-1">
                  Section 1: Tree Cover and Land Use Change
                </h2>

                {/* Explanation */}
                <p className="text-gray-600 leading-relaxed">
                  The map shows the plantation site and what it looks like
                  currently. Alongside, the stacked bar chart shows the shifts
                  in tree cover, cropland, and non-vegetated areas in the
                  plantation site. We can expect plantations to mature over the
                  years and gain perennial vegetation cover. Also shown is the
                  NDVI values over time — an index that reflects the greenness
                  of the site. Peaks show seasonality based on cropping patterns
                  and phenology cycles of trees, and an overall increasing trend
                  can be expected over the years. Together, these indicators can
                  summarize vegetation recovery, cropping patterns, and the
                  impact of plantation efforts.
                </p>
              </div>
            )}

            <div className="flex flex-col md:flex-row items-start gap-8 w-full">
              {/* Map Section */}
              <div
                className={`relative w-full ${
                  selectedPlantation ? "md:w-2/3" : "md:w-full"
                }`}
              >
                <div
                  ref={mapElement1}
                  className="h-[900px] w-full border border-gray-300 rounded-md relative"
                />

                {/* Top-left Label */}
                {selectedPlantation && (
                  <div className="absolute top-4 left-4 bg-white/90 p-3 rounded-md font-semibold shadow flex flex-col items-start gap-1 z-50 max-w-[90%] sm:max-w-[300px]">
                    <div className="flex items-center gap-1">
                      <LocationOnIcon
                        fontSize="small"
                        className="text-blue-600"
                      />
                      <span className="font-semibold">
                        {selectedPlantation?.farmerName || "NA"}
                      </span>
                    </div>
                    <p className="text-gray-600 font-bold text-sm">
                      Patch Suitability:{" "}
                      {selectedPlantation?.patchSuitability || "NA"}
                    </p>
                    <p className="text-gray-600 font-bold text-sm">
                      Suitability Score:{" "}
                      {selectedPlantation?.suitabilityScore || "NA"}
                    </p>
                    <p className="text-gray-600 font-bold text-sm">
                      Area (in hectares):{" "}
                      {(selectedFeature.properties?.area_ha || 0).toFixed(2)}{" "}
                      hectares
                    </p>
                  </div>
                )}

                {/* Zoom Controls */}
                <div className="absolute top-4 right-4 flex flex-col gap-2 z-[60]">
                  {["+", "–"].map((sign) => (
                    <button
                      key={sign}
                      className="bg-white border border-gray-300 rounded-md w-10 h-10 text-lg hover:scale-105 transition-transform"
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

                {/* Map Click Popup */}
                {mapClickedPlantation && !selectedPlantation && (
                  <div
                    className="absolute transform -translate-x-1/2 -translate-y-full bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-[250px] flex flex-col gap-1 cursor-pointer transition-all duration-200 hover:shadow-xl hover:-translate-y-[102%] hover:border-blue-600 z-[9999]"
                    style={{
                      top: `${mapClickedPlantation.pixel[1]}px`,
                      left: `${mapClickedPlantation.pixel[0] + 15}px`,
                    }}
                    onClick={handleMapBoxClick}
                  >
                    <h3 className="text-blue-600 font-bold border-b border-gray-200 pb-1">
                      {mapClickedPlantation.name}
                    </h3>

                    <div className="flex justify-between text-sm">
                      <span className="font-semibold text-gray-600">
                        Village:
                      </span>
                      <span className="text-gray-800">
                        {mapClickedPlantation.Village ?? "NA"}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="font-semibold text-gray-600">
                        Taluka:
                      </span>
                      <span className="text-gray-800">
                        {mapClickedPlantation.Taluka ?? "NA"}
                      </span>
                    </div>

                    <p className="text-blue-600 font-semibold text-right text-sm mt-1">
                      View details →
                    </p>
                  </div>
                )}
              </div>

              {/* Charts Section */}
              {selectedPlantation && (
                <div className="w-full md:w-[45%] flex flex-col items-center gap-10 sm:gap-12 md:gap-14 lg:gap-16">
                  {/* Stacked Bar Chart */}
                  <div className="w-full h-[400px] mt-2 relative">
                    <PlantationStackBarGraph
                      plantation={selectedPlantation}
                      plantationData={geoData}
                    />
                    
                  </div>

                  {/* NDVI Chart */}
                  <div className="w-full h-[400px]">
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
                  </div>
                </div>
              )}
            </div>

            <SoilPropertiesSection feature={selectedFeature} />
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default PlantationProjectDashboard;
