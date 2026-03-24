import { useEffect, useRef, useState } from "react";
import "ol/ol.css";
import { Icon, Style, Stroke, Fill } from "ol/style.js";
import XYZ from "ol/source/XYZ";
import { Map, View, Feature } from "ol";
import Point from "ol/geom/Point.js";
import VectorLayer from "ol/layer/Vector";
import TileLayer from "ol/layer/Tile";
import VectorSource from "ol/source/Vector";
import WebGLPointsLayer from "ol/layer/WebGLPoints.js";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import GeoJSON from "ol/format/GeoJSON";
import KML from "ol/format/KML.js";

import getStates from "../actions/getStates";
import getPlans from "../actions/getPlans";
import getVectorLayers from "../actions/getVectorLayers";
import getImageLayer from "../actions/getImageLayers";
import getWebGlLayers from "../actions/getWebGlLayers";

import mapMarker from "../assets/map_marker.svg";
import well_mrker from "../assets/well_proposed.svg";
import wb_mrker from "../assets/waterbodies_proposed.svg";
import settlementIcon from "../assets/settlement_icon.svg";
import tcb_proposed from "../assets/tcb_proposed.svg";
import boulder_proposed from "../assets/boulder_proposed.svg";
import farm_pond_proposed from "../assets/farm_pond_proposed.svg";
import check_dam_proposed from "../assets/check_dam_proposed.svg";
import land_leveling_proposed from "../assets/land_leveling_proposed.svg";
import livelihood_proposed from "../assets/livelihood_proposed.svg";

import ToggleButton from "./buttons/toggleButton";
import DownloadButton from "./buttons/download_button";
import FetchButton from "./buttons/fetch_button";
import SelectButton from "./buttons/select_button";

// ✅ Utility function
const formatName = (name) =>
  name
    ?.toLowerCase()
    .replace(/\s*\(\s*/g, "_")
    .replace(/\s*\)\s*/g, "")
    .replace(/\s+/g, "_");

const MapArea = () => {
  // ✅ Refs for map and layers
  let mapElement = useRef(null);
  let mapRef = useRef(null);
  let BaseLayerRef = useRef(null);
  let markersLayer = useRef(null);

  // ✅ Layers Arrays
  const LayersArray = useRef([
    { LayerRef: useRef(null), name: "Demographics", isRaster: false },
    { LayerRef: useRef(null), name: "Drainage", isRaster: false },
    { LayerRef: useRef(null), name: "Remote-Sensed Waterbodies", isRaster: false },
    { LayerRef: useRef(null), name: "Hydrological Boundries", isRaster: false },
    { LayerRef: useRef(null), name: "CLART", isRaster: true },
    { LayerRef: useRef(null), name: "Hydrological Variables", isRaster: false },
    { LayerRef: useRef(null), name: "NREGA", isRaster: false },
    { LayerRef: useRef(null), name: "Drought", isRaster: false },
    { LayerRef: useRef(null), name: "Terrain", isRaster: true },
    { LayerRef: useRef(null), name: "Administrative Boundaries", isRaster: false },
    { LayerRef: useRef(null), name: "Cropping Intensity", isRaster: false },
    { LayerRef: useRef(null), name: "Terrain Vector", isRaster: false },
    { LayerRef: useRef(null), name: "Terrain Lulc Slope", isRaster: false },
    { LayerRef: useRef(null), name: "Terrain Lulc Plain", isRaster: false },
  ]).current;

  const ResourceLayersArray = useRef([
    { LayerRef: useRef(null), name: "Settlement" },
    { LayerRef: useRef(null), name: "Water Structures" },
    { LayerRef: useRef(null), name: "Well" },
  ]).current;

  const PlanningLayersArray = useRef([
    { LayerRef: useRef(null), name: "Agri Structures" },
    { LayerRef: useRef(null), name: "Livelihood" },
    { LayerRef: useRef(null), name: "Water Structures" },
  ]).current;

  // ✅ State setup
  const [stateData, setStateData] = useState(null);
  const [state, setState] = useState(null);
  const [district, setDistrict] = useState(null);
  const [block, setBlock] = useState(null);

  const [plans, setPlans] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const [isLayersFetched, setIsLayersFetched] = useState(false);
  const [isOtherLayersFetched, setIsOtherLayersFetched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLayersLoading, setIsLayersLoading] = useState(false);
  const [hrefData, setHrefData] = useState(null);
  const [currentLayers, setCurrentLayers] = useState(["Demographics", "NREGA"]);

  const [bbox, setBBox] = useState(null);

  // ✅ Cached names for performance
  const districtName = district ? formatName(district.label) : null;
  const blockName = block ? formatName(block.label) : null;
  // ✅ Helper Functions

  const getblockFeatures = async (data) => {
    let coordinates = null;
    let AdminURl = `https://geoserver.core-stack.org:8443/geoserver/panchayat_boundaries/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=panchayat_boundaries:${data.district.toLowerCase().split(" ").join("_")}_${data.block.toLowerCase().split(" ").join("_")}&outputFormat=application/json&screen=main`;

    try {
      await fetch(AdminURl)
        .then((res) => res.json())
        .then((Geojson) => {
          coordinates = Geojson.features[0].geometry.coordinates[0][0][0];
        });
    } catch (e) {
      console.log("error in fetching for : ", data.block.toLowerCase());
      return { coordinates: [], data: data };
    }

    return { coordinates: coordinates, data: data };
  };

  const getStatesData = async () => {
    let data = await getStates();
    let temp_blockNames = [];

    data.map((item) => {
      let tempDS = {
        state: item.label,
        district: item.district[0].label,
        block: item.district[0].blocks[0].label,
        disGrp: item.district,
      };
      temp_blockNames.push(tempDS);
    });

    let layer_features = await Promise.all(
      temp_blockNames.map((item) => getblockFeatures(item))
    ).then((res) =>
      res.map((item) => {
        return new Feature({
          geometry: new Point(item.coordinates),
          data: item.data,
        });
      })
    );

    const StateMarkers = new Style({
      image: new Icon({ src: mapMarker }),
    });

    let StateLevelLayer = new VectorLayer({
      source: new VectorSource({ features: layer_features }),
      style: StateMarkers,
    });

    setStateData(data);
    mapRef.current.addLayer(StateLevelLayer);
    markersLayer.current = StateLevelLayer;
  };

  const getDistrictData = async () => {
    let temp_blocks = state.district.map((item) => {
      return {
        district: item.label,
        block: item.blocks[0].label,
        disGrp: item.blocks,
      };
    });

    let temp_coordinates = null;

    let layer_features = await Promise.all(
      temp_blocks.map((item) => getblockFeatures(item))
    ).then((res) =>
      res.map((item) => {
        if (temp_coordinates == null) temp_coordinates = item.coordinates;
        return new Feature({
          geometry: new Point(item.coordinates),
          data: item.data,
        });
      })
    );

    const StateMarkers = new Style({
      image: new Icon({ src: mapMarker }),
    });

    let districtLevelLayer = new VectorLayer({
      source: new VectorSource({ features: layer_features }),
      style: StateMarkers,
    });

    mapRef.current.removeLayer(markersLayer.current);
    mapRef.current.addLayer(districtLevelLayer);
    markersLayer.current = districtLevelLayer;

    mapRef.current.getView().setCenter(temp_coordinates);
    mapRef.current.getView().setZoom(8);
  };

  const getBlockData = async () => {
    const districtName = formatName(district.label);
    const temp_blocks = district.blocks.map((item) => ({
      district: districtName,
      block: formatName(item.label),
    }));

    let temp_coordinates = null;

    let layer_features = await Promise.all(
      temp_blocks.map((item) => getblockFeatures(item))
    ).then((res) =>
      res.map((item) => {
        if (temp_coordinates == null) temp_coordinates = item.coordinates;
        return new Feature({
          geometry: new Point(item.coordinates),
          data: item.data,
        });
      })
    );

    const StateMarkers = new Style({
      image: new Icon({ src: mapMarker }),
    });

    let blockLevelLayer = new VectorLayer({
      source: new VectorSource({ features: layer_features }),
      style: StateMarkers,
    });

    mapRef.current.removeLayer(markersLayer.current);
    mapRef.current.addLayer(blockLevelLayer);
    markersLayer.current = blockLevelLayer;

    mapRef.current.getView().setCenter(temp_coordinates);
    mapRef.current.getView().setZoom(11);
  };
  // ✅ Effects for initializing map
  useEffect(() => {

  const BaseLayer = new TileLayer({
    source: new XYZ({
      url: "https://www.google.cn/maps/vt?lyrs=s@189&gl=cn&x={x}&y={y}&z={z}",
      maxZoom: 30,
    }),
    visible: true,
  });

  BaseLayerRef.current = BaseLayer;

  const view = new View({
    center: [99.9, 23.6],
    zoom: 5,
    projection: "EPSG:4326",
  });

  const initialMap = new Map({
    target: mapElement.current,
    layers: [BaseLayer],
    view,
  });

  mapRef.current = initialMap;

  // ✅ NOW SAFE
  getStatesData();

  initialMap.on("singleclick", (e) => {
    initialMap.forEachFeatureAtPixel(e.pixel, (feature, layer) => {
      if (layer === markersLayer.current) {
        setState({
          district: feature.values_.data.disGrp,
          label: feature.values_.data.state,
        });
      }
    });
  });

  initialMap.on("pointermove", (e) => {
    const pixel = initialMap.getEventPixel(e.originalEvent);
    const hit = initialMap.hasFeatureAtPixel(pixel);
    initialMap.getTarget().style.cursor = hit ? "pointer" : "";
  });

  return () => initialMap.setTarget(null);

}, []);
  // ✅ Split effects to avoid premature block fetch
  useEffect(() => {
    if (state) getDistrictData();
  }, [state]);

  useEffect(() => {
    if (district) getBlockData();
  }, [district]);

  // ✅ Fetch Resource Layers
  const fetchResourcesLayers = async () => {
    if (!district || !block || !selectedPlan) return;

    const districtName = formatName(district.label);
    const blockName = formatName(block.label);

    setIsLayersLoading(true);

    // Settlement Layer
    let settlementLayer = await getVectorLayers(
      "resources",
      "hemlet_layer_" + blockName,
      true,
      true,
      "settlement",
      selectedPlan.value.plan_id,
      districtName,
      blockName
    );
    if (ResourceLayersArray[0].LayerRef.current) {
      mapRef.current.removeLayer(ResourceLayersArray[0].LayerRef.current);
    }
    ResourceLayersArray[0].LayerRef.current = settlementLayer;
    ResourceLayersArray[0].LayerRef.current.setStyle(
      new Style({ image: new Icon({ src: settlementIcon }) })
    );

    // Water Structures Layer
    let WaterStructuresLayer = await getVectorLayers(
      "resources",
      "plan_layer_gw_" + blockName,
      true,
      false,
      "plan_gw",
      selectedPlan.value.plan_id,
      districtName,
      blockName
    );
    if (ResourceLayersArray[1].LayerRef.current) {
      mapRef.current.removeLayer(ResourceLayersArray[1].LayerRef.current);
    }
    ResourceLayersArray[1].LayerRef.current = WaterStructuresLayer;
    ResourceLayersArray[1].LayerRef.current.setStyle((feature) => {
      const status = feature.values_;
      if (status.work_type === "new farm pond") {
        return new Style({ image: new Icon({ src: farm_pond_proposed }) });
      } else if (status.work_type === "new trench cum bund network") {
        return new Style({ image: new Icon({ src: tcb_proposed }) });
      } else if (status.work_type === "new check dam") {
        return new Style({ image: new Icon({ src: check_dam_proposed }) });
      } else {
        return new Style({ image: new Icon({ src: boulder_proposed }) });
      }
    });

    // Well Layer
    let WellLayer = await getVectorLayers(
      "resources",
      "well_layer_" + blockName,
      true,
      true,
      "well",
      selectedPlan.value.plan_id,
      districtName,
      blockName
    );
    if (ResourceLayersArray[2].LayerRef.current) {
      mapRef.current.removeLayer(ResourceLayersArray[2].LayerRef.current);
    }
    ResourceLayersArray[2].LayerRef.current = WellLayer;
    ResourceLayersArray[2].LayerRef.current.setStyle(
      new Style({ image: new Icon({ src: well_mrker }) })
    );

    setIsLayersLoading(false);
    setIsOtherLayersFetched(true);
  };

  // ✅ Fetch Planning Layers
  const fetchPlanningLayers = async () => {
    if (!district || !block || !selectedPlan) return;

    const districtName = formatName(district.label);
    const blockName = formatName(block.label);

    // Agri Structures Layer
    let AgriStructuresLayer = await getVectorLayers(
      "works",
      "plan_layer_agri_" + blockName,
      true,
      false,
      "plan_agri",
      selectedPlan.value.plan_id,
      districtName,
      blockName
    );
    if (PlanningLayersArray[0].LayerRef.current) {
      mapRef.current.removeLayer(PlanningLayersArray[0].LayerRef.current);
    }
    PlanningLayersArray[0].LayerRef.current = AgriStructuresLayer;
    PlanningLayersArray[0].LayerRef.current.setStyle((feature) => {
      const status = feature.values_;
      if (status.TYPE_OF_WO === "New farm pond") {
        return new Style({ image: new Icon({ src: farm_pond_proposed }) });
      } else if (status.TYPE_OF_WO === "Land leveling") {
        return new Style({ image: new Icon({ src: land_leveling_proposed }) });
      } else if (status.TYPE_OF_WO === "New well") {
        return new Style({ image: new Icon({ src: well_mrker }) });
      } else {
        return new Style({ image: new Icon({ src: wb_mrker }) });
      }
    });

    // Livelihood Layer
    let LivelihoodLayer = await getVectorLayers(
      "works",
      `hemlet_layer_${blockName}`,
      true,
      false,
      "livelihood",
      selectedPlan.value.plan_id,
      districtName,
      blockName
    );
    if (PlanningLayersArray[1].LayerRef.current) {
      mapRef.current.removeLayer(PlanningLayersArray[1].LayerRef.current);
    }
    PlanningLayersArray[1].LayerRef.current = LivelihoodLayer;
    PlanningLayersArray[1].LayerRef.current.setStyle(
      new Style({ image: new Icon({ src: livelihood_proposed }) })
    );

    // Water Structures Layer
    let WaterStructureLayer = await getVectorLayers(
      "works",
      `plan_layer_gw_${blockName}`,
      true,
      false,
      "plan_gw",
      selectedPlan.value.plan_id,
      districtName,
      blockName
    );
    if (PlanningLayersArray[2].LayerRef.current) {
      mapRef.current.removeLayer(PlanningLayersArray[2].LayerRef.current);
    }
    PlanningLayersArray[2].LayerRef.current = WaterStructureLayer;
    PlanningLayersArray[2].LayerRef.current.setStyle((feature) => {
      const status = feature.values_;
      if (status.selected_w === "new farm pond") {
        return new Style({ image: new Icon({ src: farm_pond_proposed }) });
      } else if (status.selected_w === "new trench cum bund network") {
        return new Style({ image: new Icon({ src: tcb_proposed }) });
      } else if (status.selected_w === "new check dam") {
        return new Style({ image: new Icon({ src: check_dam_proposed }) });
      } else if (status.selected_w === "Loose Boulder Structure") {
        return new Style({ image: new Icon({ src: boulder_proposed }) });
      } else {
        return new Style({ image: new Icon({ src: wb_mrker }) });
      }
    });
  };
  // ✅ Handle Location Change
  const handleLocationChange = async () => {
    if (!district || !block) return;

    const districtName = formatName(district.label);
    const blockName = formatName(block.label);

    setIsLoading(true);
    let currentActiveLayers = [];

    let temp_plan = await getPlans(block.block_id);
    setPlans(temp_plan);

    let adminLayer = await getVectorLayers(
      "panchayat_boundaries",
      `${districtName}_${blockName}`,
      true,
      true
    );

    if (LayersArray[0].LayerRef.current) {
      mapRef.current.removeLayer(LayersArray[0].LayerRef.current);
    }
    mapRef.current.addLayer(adminLayer);
    currentActiveLayers.push(LayersArray[0].name);
    LayersArray[0].LayerRef.current = adminLayer;

    const Vectorsource = adminLayer.getSource();
    Vectorsource.once("change", function () {
      if (Vectorsource.getState() === "ready") {
        const arr = Vectorsource.getExtent();
        setBBox(arr);
        const mapcenter = [(arr[0] + arr[2]) / 2, (arr[1] + arr[3]) / 2];
        mapRef.current.getView().setCenter(mapcenter);
        mapRef.current.getView().setZoom(11);
      }
    });

    mapRef.current.removeLayer(markersLayer.current);
    setCurrentLayers(currentActiveLayers);
    setIsLoading(false);
    setIsLayersFetched(true);
  };

  // ✅ Handle Excel Download
  const handleExcelDownload = async () => {
    if (!state || !district || !block) return;

    setIsDownloading(true);

    let response = await fetch(
      `https://geoserver.core-stack.org/api/v1/download_excel_layer?state=${state.label}&district=${district.label}&block=${block.label}`,
      {
        method: "GET",
        headers: {
          "ngrok-skip-browser-warning": "1",
          "Content-Type": "blob",
        },
      }
    );

    let arybuf = await response.arrayBuffer();
    const url = window.URL.createObjectURL(new Blob([arybuf]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${block.label}_data.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();

    setIsDownloading(false);
  };

  // ✅ Handle Item Select
  const handleItemSelect = (setter, value) => {
    setter(value);
  };

  // ✅ Handle GeoJSON Export
  const handleGeoJsonLayers = async (layerRef, name) => {
    if (layerRef.current && currentLayers.includes(name)) {
      const format = new GeoJSON({ featureProjection: "EPSG:4326" });
      const features = layerRef.current.getSource().getFeatures();
      let json = format.writeFeatures(features);

      setHrefData(
        "data:application/json;charset=utf-8," + encodeURIComponent(json)
      );
    } else {
      toast.error("Please Turn on the Layer First !!");
    }
  };

  // ✅ Handle KML Export
  const handleKMLLayers = (layerRef, name) => {
    if (layerRef.current && currentLayers.includes(name)) {
      const format = new KML({ featureProjection: "EPSG:4326" });
      const layerSource = layerRef.current.getSource();
      const features = layerSource.getFeatures();
      const kmlData = format.writeFeatures(features);

      setHrefData(
        "data:application/kml;charset=utf-8," + encodeURIComponent(kmlData)
      );
    } else {
      toast.error("Please Turn on the Layer First !!");
    }
  };

  // ✅ Handle Image Layers Download
  const handleImageLayers = (name) => {
    if (name === "CLART") {
      const downloadurl = `https://geoserver.core-stack.org:8443/geoserver/clart/wcs?service=WCS&version=2.0.1&request=GetCoverage&CoverageId=clart:${districtName}_${blockName}_clart&format=geotiff&compression=LZW&tiling=false`;
      window.open(downloadurl);
    } else if (bbox && name === "Terrain") {
      const downloadurl = `https://geoserver.core-stack.org:8443/geoserver/terrain/wcs?service=WCS&version=2.0.1&request=GetCoverage&CoverageId=terrain:${districtName}_${blockName}_terrain_raster&format=geotiff&compression=LZW&tiling=true&tileheight=256&tilewidth=256`;
      window.open(downloadurl);
    } else {
      toast.info("Wait !");
    }
  };

  // ✅ Handle LULC Image Layers Download
  const handleImageLulcLayers = (type) => {
    if (bbox && type === "type1" && block && district && selectedPlan) {
      const downloadurl = `https://geoserver.core-stack.org:8443/geoserver/LULC_level_1/wcs?service=WCS&version=2.0.1&request=GetCoverage&CoverageId=LULC_level_1:LULC_${blockName}_level_1&format=geotiff&compression=LZW&tiling=false`;
      window.open(downloadurl);
    } else if (bbox && type === "type2") {
      const downloadurl = `https://geoserver.core-stack.org:8443/geoserver/LULC_level_2/wcs?service=WCS&version=2.0.1&request=GetCoverage&CoverageId=LULC_level_2:LULC_${blockName}_level_2&format=geotiff&compression=LZW&tiling=false`;
      window.open(downloadurl);
    } else if (bbox && type === "type3") {
      const downloadurl = `https://geoserver.core-stack.org:8443/geoserver/LULC_level_3/wcs?service=WCS&version=2.0.1&request=GetCoverage&CoverageId=LULC_level_3:LULC_${blockName}_level_3&format=geotiff&compression=LZW&tiling=false`;
      window.open(downloadurl);
    } else {
      toast.info("Wait !");
    }
  };
  // ✅ Async Layer Toggle with WebGLPointsLayer fix + cleanup
  const handleLayerToggle = async (name, layerRef) => {
    if (!isLayersFetched) return;

    let tempLayer = [...currentLayers];

    // OFF toggle
    if (name === "NREGA" && currentLayers.includes(name)) {
      const layer = LayersArray[6].LayerRef.current;
      mapRef.current.removeLayer(layer);
      layer.setSource(null); // ✅ cleanup GPU memory
      tempLayer = tempLayer.filter((item) => item !== name);
    }

    // ON toggle
    else if (name === "NREGA" && !currentLayers.includes(name)) {
      const tempNregaStyle = {
        "shape-points": 12,
        "shape-radius": 6,
        "shape-fill-color": [
          "match",
          ["get", "itemColor"],
          4, "#6495ED",
          1, "#C2678D",
          3, "#FFA500",
          5, "#1A759F",
          6, "#52B69A",
          2, "#355070",
          7, "#6D597A",
          "#00000000"
        ]
      };

      const existingLayer = LayersArray[6].LayerRef.current;
if (!existingLayer) return;

const source = existingLayer.getSource();

      // Remove old layer before recreating
      mapRef.current.removeLayer(LayersArray[6].LayerRef.current);

      // ✅ Correct way: recreate WebGLPointsLayer with style
      const webglLayer = new WebGLPointsLayer({
        source,
        style: tempNregaStyle,
      });

      mapRef.current.addLayer(webglLayer);
      LayersArray[6].LayerRef.current = webglLayer;

      tempLayer.push(name);
    }

    setCurrentLayers(tempLayer);
  };

  // ✅ Component Return
  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <div ref={mapElement} style={{ width: "100%", height: "100%" }} />
      <ToastContainer />

      {/* Example Controls */}
      <div className="controls">
        <ToggleButton
          label="Toggle NREGA"
          onClick={() => handleLayerToggle("NREGA", LayersArray[6].LayerRef)}
        />
        <FetchButton label="Fetch Resources" onClick={fetchResourcesLayers} />
        <FetchButton label="Fetch Planning" onClick={fetchPlanningLayers} />
        <DownloadButton label="Download Excel" onClick={handleExcelDownload} />
        <SelectButton
          label="Select Plan"
          options={plans || []}
          onChange={(plan) => setSelectedPlan(plan)}
        />
      </div>
    </div>
  );
};

export default MapArea;
