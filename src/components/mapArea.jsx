import { useEffect, useRef, useState } from "react";

import "ol/ol.css";
import { Icon, Style, Stroke, Fill } from "ol/style.js";

import XYZ from "ol/source/XYZ";
import { Map, View, Feature } from "ol";
import Point from "ol/geom/Point.js";
import VectorLayer from "ol/layer/Vector";
import TileLayer from "ol/layer/Tile";
import VectorSource from "ol/source/Vector";
import WebGLPointsLayer from 'ol/layer/WebGLPoints.js';

import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import GeoJSON from "ol/format/GeoJSON";
import KML from "ol/format/KML.js";

import getStates from "../actions/getStates";
import getPlans from "../actions/getPlans";
import getVectorLayers from "../actions/getVectorLayers";
import getImageLayer from "../actions/getImageLayers";

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

//? Temprorary Imports
import landscape_icon from "../assets/eco.png";
import getWebGlLayers from "../actions/getWebGlLayers";
import ToggleButton from "./buttons/toggleButton";
import DownloadButton from "./buttons/download_button";
import FetchButton from "./buttons/fetch_button";
import SelectButton from "./buttons/select_button";

const MapArea = () => {
  let mapElement = useRef(null);
  let mapRef = useRef(null);
  let BaseLayerRef = useRef(null);

  //? Layers Ref Group
  let LayersArray = [
    { LayerRef: useRef(null), name: "Demographics", isRaster: false },
    { LayerRef: useRef(null), name: "Drainage", isRaster: false },
    {
      LayerRef: useRef(null),
      name: "Remote-Sensed Waterbodies",
      isRaster: false,
    },
    { LayerRef: useRef(null), name: "Hydrological Boundries", isRaster: false },
    { LayerRef: useRef(null), name: "CLART", isRaster: true },
    { LayerRef: useRef(null), name: "Hydrological Variables", isRaster: false },
    { LayerRef: useRef(null), name: "NREGA", isRaster: false },
    { LayerRef: useRef(null), name: "Drought", isRaster: false },
    { LayerRef: useRef(null), name: "Terrain", isRaster: true },
    {
      LayerRef: useRef(null),
      name: "Administrative Boundaries",
      isRaster: false,
    },
    { LayerRef: useRef(null), name: "Cropping Intensity", isRaster: false },
    { LayerRef: useRef(null), name: "Terrain Vector", isRaster: false },
    { LayerRef: useRef(null), name: "Terrain Lulc Slope", isRaster: false },
    { LayerRef: useRef(null), name: "Terrain Lulc Plain", isRaster: false },
  ];
  let ResourceLayersArray = [
    { LayerRef: useRef(null), name: "Settlement" },
    { LayerRef: useRef(null), name: "Water Structure" },
    { LayerRef: useRef(null), name: "Well Structure" },
  ];
  let PlanningLayersArray = [
    { LayerRef: useRef(null), name: "Agriculture Structure" },
    { LayerRef: useRef(null), name: "Livelihood Structure" },
    { LayerRef: useRef(null), name: "Recharge Structures" },
  ];

  let markersLayer = useRef(null);

  const [stateData, setStateData] = useState(null);

  //? States for handling the Selection of states, district and block
  const [state, setState] = useState(null);
  const [district, setDistrict] = useState(null);
  const [block, setBlock] = useState(null);
  let unAvailableStates = [];

  //? States for Handling the plan selection
  const [plans, setPlans] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);

  //? LULC Toggle Group
  const [lulcYear1, setLulcYear1] = useState(null);
  const [lulcYear2, setLulcYear2] = useState(null);
  const [lulcYear3, setLulcYear3] = useState(null);

  //? Layers Present
  const [isLayersFetched, setIsLayersFetched] = useState(false);
  const [isOtherLayersFetched, setIsOtherLayersFetched] = useState(false);

  //? Miscellaneous States and Variables
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLayersLoading, setIsLayersLoading] = useState(false);
  const [hrefData, setHrefData] = useState(null);
  const [currentLayers, setCurrentLayers] = useState(["Demographics", "NREGA"]);
  const terrainClusterColors = ["#324A1C", "#97C76B", "#673A13", "#E5E059"];

  function changePolygonColor(color) {
    return new Style({
      fill: new Fill({
        color: color,
        opacity: 0.4,
      }),
      stroke: new Stroke({
        color: "transparent",
        width: 0,
      }),
    });
  }

  const drainageColors = [
    "03045E",
    "023E8A",
    "0077B6",
    "0096C7",
    "00B4D8",
    "48CAE4",
    "90E0EF",
    "ADE8F4",
    "CAF0F8",
  ];

  const yearDataLulc = [
    {
      label: "2016-2017",
      value: "16_17",
    },
    {
      label: "2017-2018",
      value: "17_18",
    },
    {
      label: "2018-2019",
      value: "18_19",
    },
    {
      label: "2019-2020",
      value: "19_20",
    },
    {
      label: "2020-2021",
      value: "20_21",
    },
    {
      label: "2021-2022",
      value: "21_22",
    },
    {
      label: "2022-2023",
      value: "22_23",
    },
  ];

  const [bbox, setBBox] = useState(null);

  const getblockFeatures = async (data) => {
    let coordinates = null;

    let AdminURl = `https://geoserver.core-stack.org:8443/geoserver/panchayat_boundaries/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=panchayat_boundaries:${data.district.toLowerCase().split(" ").join("_")}_${data.block.toLowerCase().split(" ").join("_")}&outputFormat=application/json&screen=main`;
    console.log(AdminURl)
    try {
      await fetch(AdminURl)
        .then((res) => res.json())
        .then((Geojson) => {
          coordinates = Geojson.features[0].geometry.coordinates[0][0][0];
        });
    } catch (e) {
      console.log("error in fetching for : ", data.block.toLowerCase());
      unAvailableStates.push(data);
      return { coordinates: [], data: data };
    }
    return { coordinates: coordinates, data: data };
  };

  const getStatesData = async () => {
    let data = await getStates();

    let temp_blockNames = [];

    console.log(data);

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
      temp_blockNames.map((item) => {
        return getblockFeatures(item);
      })
    ).then((res) => {
      return res.map((item) => {
        return new Feature({
          geometry: new Point(item.coordinates),
          data: item.data,
        });
      });
    });

    const StateMarkers = new Style({
      image: new Icon({
        src: mapMarker,
      }),
    });

    let StateLevelLayer = new VectorLayer({
      source: new VectorSource({
        features: layer_features,
      }),
      style: StateMarkers,
    });

    let availableData = [];
    let dataLen = unAvailableStates.length;

    data.map((item) => {
      for (let i = 0; i < dataLen; ++i) {
        if (item.label === unAvailableStates[i].state) {
          return;
        }
      }
      availableData.push(item);
    });

    setStateData(availableData);

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
      temp_blocks.map((item) => {
        return getblockFeatures(item);
      })
    ).then((res) => {
      return res.map((item) => {
        if (temp_coordinates == null) temp_coordinates = item.coordinates;
        return new Feature({
          geometry: new Point(item.coordinates),
          data: item.data,
        });
      });
    });

    const StateMarkers = new Style({
      image: new Icon({
        src: mapMarker,
      }),
    });

    let districtLevelLayer = new VectorLayer({
      source: new VectorSource({
        features: layer_features,
      }),
      style: StateMarkers,
    });

    mapRef.current.removeLayer(markersLayer.current);

    mapRef.current.addLayer(districtLevelLayer);

    markersLayer.current = districtLevelLayer;

    mapRef.current.getView().setCenter(temp_coordinates);
    mapRef.current.getView().setZoom(8);
  };

  const getBlockData = async () => {
    const temp_blocks = district.blocks.map((item) => {
      return { district: district.label, block: item.label };
    });

    let temp_coordinates = null;

    let layer_features = await Promise.all(
      temp_blocks.map((item) => {
        return getblockFeatures(item);
      })
    ).then((res) => {
      return res.map((item) => {
        if (temp_coordinates == null) temp_coordinates = item.coordinates;

        return new Feature({
          geometry: new Point(item.coordinates),
          data: item.data,
        });
      });
    });

    const StateMarkers = new Style({
      image: new Icon({
        src: mapMarker,
      }),
    });

    let blockLevelLayer = new VectorLayer({
      source: new VectorSource({
        features: layer_features,
      }),
      style: StateMarkers,
    });

    mapRef.current.removeLayer(markersLayer.current);

    mapRef.current.addLayer(blockLevelLayer);

    markersLayer.current = blockLevelLayer;

    mapRef.current.getView().setCenter(temp_coordinates);
    mapRef.current.getView().setZoom(11);
  };

  useEffect(() => {
    getStatesData();

    let BaseLayer = new TileLayer({
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
      view: view,
    });

    mapRef.current = initialMap;

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

    initialMap.on("pointermove", function (e) {
      const pixel = initialMap.getEventPixel(e.originalEvent);
      const hit = initialMap.hasFeatureAtPixel(pixel);
      initialMap.getTarget().style.cursor = hit ? "pointer" : "";
    });

    return () => {
      initialMap.setTarget(null);
    };
  }, []);

  useEffect(() => {
    if (state != null) {
      getDistrictData();
    }
    if (district != null) {
      getBlockData();
    }
  }, [state, district]);

  const fetchResourcesLayers = async () => {
    if (selectedPlan != null) {
      setIsLayersLoading(true);
      //? Code for settlement Layer
      let settlementLayer = await getVectorLayers(
        "resources",
        "hemlet_layer" + block.label.toLowerCase(),
        true,
        true,
        "settlement",
        selectedPlan.value.plan_id,
        district.label.toLowerCase().split(" ").join("_"),
        block.label.toLowerCase().split(" ").join("_")
      );

      if (ResourceLayersArray[0].LayerRef.current != null) {
        mapRef.current.removeLayer(ResourceLayersArray[0].LayerRef.current);
      }

      ResourceLayersArray[0].LayerRef.current = settlementLayer;

      ResourceLayersArray[0].LayerRef.current.setStyle(
        new Style({
          image: new Icon({ src: settlementIcon }),
        })
      );

      //? Code For Water Structures Layer
      let WaterStructuresLayer = await getVectorLayers(
        "resources",
        "plan_layer_gw" + block.label.toLowerCase(),
        true,
        false,
        "plan_gw",
        selectedPlan.value.plan_id,
        district.label.toLowerCase().split(" ").join("_"),
        block.label.toLowerCase().split(" ").join("_")
      );

      if (ResourceLayersArray[1].LayerRef.current != null) {
        mapRef.current.removeLayer(ResourceLayersArray[1].LayerRef.current);
      }

      ResourceLayersArray[1].LayerRef.current = WaterStructuresLayer;

      ResourceLayersArray[1].LayerRef.current.setStyle(function (feature) {
        const status = feature.values_;

        if (status.work_type == "new farm pond") {
          return new Style({
            image: new Icon({ src: farm_pond_proposed }),
          });
        } else if (status.work_type == "new trench cum bund network") {
          return new Style({
            image: new Icon({ src: tcb_proposed }),
          });
        } else if (status.work_type == "new check dam") {
          return new Style({
            image: new Icon({ src: check_dam_proposed }),
          });
        } else {
          return new Style({
            image: new Icon({ src: boulder_proposed }),
          });
        }
      });

      //? Code for Well Layer
      let WellLayer = await getVectorLayers(
        "resources",
        "well_layer" + block.label.toLowerCase(),
        true,
        true,
        "well",
        selectedPlan.value.plan_id,
        district.label.toLowerCase().split(" ").join("_"),
        block.label.toLowerCase().split(" ").join("_")
      );

      if (ResourceLayersArray[2].LayerRef.current != null) {
        mapRef.current.removeLayer(ResourceLayersArray[2].LayerRef.current);
      }

      ResourceLayersArray[2].LayerRef.current = WellLayer;

      ResourceLayersArray[2].LayerRef.current.setStyle(
        new Style({
          image: new Icon({ src: well_mrker }),
        })
      );

      setIsLayersLoading(false);
      setIsOtherLayersFetched(true);
    }
  };

  const fetchPlanningLayers = async () => {
    //? Code for Agri Structures Layer
    let AgriStructuresLayer = await getVectorLayers(
      "works",
      "plan_layer_agri" + block.label.toLowerCase(),
      true,
      false,
      "plan_agri",
      selectedPlan.value.plan_id,
      district.label.toLowerCase(),
      block.label.toLowerCase()
    );

    if (PlanningLayersArray[0].LayerRef.current != null) {
      mapRef.current.removeLayer(PlanningLayersArray[0].LayerRef.current);
    }

    PlanningLayersArray[0].LayerRef.current = AgriStructuresLayer;

    PlanningLayersArray[0].LayerRef.current.setStyle(function (feature) {
      const status = feature.values_;

      if (status.TYPE_OF_WO == "New farm pond") {
        return new Style({
          image: new Icon({ src: farm_pond_proposed }),
        });
      } else if (status.TYPE_OF_WO == "Land leveling") {
        return new Style({
          image: new Icon({ src: land_leveling_proposed }),
        });
      } else if (status.TYPE_OF_WO == "New well") {
        return new Style({
          image: new Icon({ src: well_mrker }),
        });
      } else {
        return new Style({
          image: new Icon({ src: wb_mrker }),
        });
      }
    });

    //? Code for Livelihood Layer
    let LivelihoodLayer = await getVectorLayers(
      "works",
      "hemlet_layer" + block.label.toLowerCase(),
      true,
      false,
      "livelihood",
      selectedPlan.value.plan_id,
      district.label.toLowerCase(),
      block.label.toLowerCase()
    );

    if (PlanningLayersArray[1].LayerRef.current != null) {
      mapRef.current.removeLayer(PlanningLayersArray[1].LayerRef.current);
    }

    PlanningLayersArray[1].LayerRef.current = LivelihoodLayer;

    PlanningLayersArray[1].LayerRef.current.setStyle(
      new Style({
        image: new Icon({ src: livelihood_proposed }),
      })
    );

    let WaterStructureLayer = await getVectorLayers(
      "works",
      "plan_layer_gw" + block.label.toLowerCase(),
      true,
      false,
      "plan_gw",
      selectedPlan.value.plan_id,
      district.label.toLowerCase(),
      block.label.toLowerCase()
    );

    if (PlanningLayersArray[2].LayerRef.current != null) {
      mapRef.current.removeLayer(PlanningLayersArray[2].LayerRef.current);
    }

    PlanningLayersArray[2].LayerRef.current = WaterStructureLayer;

    PlanningLayersArray[2].LayerRef.current.setStyle((feature) => {
      const status = feature.values_;

      if (status.selected_w == "new farm pond") {
        return new Style({
          image: new Icon({ src: farm_pond_proposed }),
        });
      } else if (status.selected_w == "new trench cum bund network") {
        return new Style({
          image: new Icon({ src: tcb_proposed }),
        });
      } else if (status.selected_w == "new check dam") {
        return new Style({
          image: new Icon({ src: check_dam_proposed }),
        });
      } else if (status.selected_w == "Loose Boulder Structure") {
        return new Style({
          image: new Icon({ src: boulder_proposed }),
        });
      } else if (status.selected_w == "Works in Drainage lines") {
        return new Style({
          image: new Icon({ src: wb_mrker }),
        });
      } else {
        return new Style({
          image: new Icon({ src: wb_mrker }),
        });
      }
    });
  };

  const handleLocationChange = async () => {
    if (block != null) {
      setIsLoading(true);

      let currentActiveLayers = [];

      let temp_plan = await getPlans(block.block_id);

      setPlans(temp_plan);

      let adminLayer = await getVectorLayers(
        "panchayat_boundaries",
        district.label.toLowerCase().split(" ").join("_") +
          "_" +
          block.label.toLowerCase().split(" ").join("_"),
        true,
        true
      );

      //? Remove the admin Layer if exists to display only one admin layer at a time
      if (LayersArray[0].LayerRef.current != null) {
        mapRef.current.removeLayer(LayersArray[0].LayerRef.current);
      }

      mapRef.current.addLayer(adminLayer);
      currentActiveLayers.push(LayersArray[0].name);

      LayersArray[0].LayerRef.current = adminLayer;

      //? Centering the Map to the Selected Block
      const Vectorsource = adminLayer.getSource();
      Vectorsource.once("change", function (e) {
        if (Vectorsource.getState() === "ready") {
          const arr = Vectorsource.getExtent();
          setBBox(arr);
          const mapcenter = [(arr[0] + arr[2]) / 2, (arr[1] + arr[3]) / 2];
          mapRef.current.getView().setCenter(mapcenter);
          mapRef.current.getView().setZoom(11);
        }
      });

      //? Remove the Marker Layer to display only the Plan layer
      mapRef.current.removeLayer(markersLayer.current);

      //? Code For Drainage Layer
      let DrainageLayer = await getVectorLayers(
        "drainage",
        district.label.toLowerCase().split(" ").join("_") +
          "_" +
          block.label.toLowerCase().split(" ").join("_"),
        true,
        true,
        "drainage",
      );

      DrainageLayer.setStyle(function (feature) {
        let order = feature.values_.ORDER;

        return new Style({
          stroke: new Stroke({
            color: `#${drainageColors[order - 1]}`,
            width: 2.0,
          }),
        });
      });

      if (
        LayersArray[1].LayerRef.current != null &&
        currentLayers.includes(LayersArray[2].name)
      ) {
        mapRef.current.removeLayer(LayersArray[1].LayerRef.current);
      }

      LayersArray[1].LayerRef.current = DrainageLayer;

      //? Code for Remote Sensed Waterbodies Layer

      let RemoteSensedWaterbodiesLayer = await getVectorLayers(
        "water_bodies",
        "surface_waterbodies_" + district.label.toLowerCase().split(" ").join("_") +
        "_" +
        block.label.toLowerCase().split(" ").join("_"),
        true,
        true,
        "Water_bodies",
      );

      RemoteSensedWaterbodiesLayer.setStyle(
        new Style({
          stroke: new Stroke({ color: "#6495ed", width: 5 }),
          fill: new Fill({ color: "rgba(100, 149, 237, 0.5)" }),
        })
      );

      if (
        LayersArray[2].LayerRef.current != null &&
        currentLayers.includes(LayersArray[2].name)
      ) {
        mapRef.current.removeLayer(LayersArray[2].LayerRef.current);
      }

      //mapRef.current.addLayer(RemoteSensedWaterbodiesLayer);
      LayersArray[2].LayerRef.current = RemoteSensedWaterbodiesLayer;

      //? Code For MicroWatershed Layer

      let MicroWaterShedLayer = await getVectorLayers(
        "mws_layers",
        "deltaG_well_depth_" +  district.label.toLowerCase().split(" ").join("_") +
        "_" +
        block.label.toLowerCase().split(" ").join("_"),
        true,
        true,
        "Watershed",
      );

      MicroWaterShedLayer.setStyle(function (feature) {
        //console.log(feature)
        let bin = feature.values_.Net2018_23;
        if (bin < -5) {
          feature.setStyle(changePolygonColor("rgba(255, 0, 0, 0.5)")); // red
        } else if (bin >= -5 && bin < -1) {
          feature.setStyle(changePolygonColor("rgba(255, 255, 0, 0.5)")); // yellow
        } else if (bin >= -1 && bin <= 1) {
          feature.setStyle(changePolygonColor("rgba(0, 255, 0, 0.5)")); // green
        } else if (bin > 1) {
          feature.setStyle(changePolygonColor("rgba(0, 0, 255, 0.5)")); // blue
        }
      });

      if (
        LayersArray[3].LayerRef.current != null &&
        currentLayers.includes(LayersArray[3].name)
      ) {
        mapRef.current.removeLayer(LayersArray[3].LayerRef.current);
      }

      // mapRef.current.addLayer(MicroWaterShedLayer);
      LayersArray[3].LayerRef.current = MicroWaterShedLayer;

      //? Code For Clart Layer
      let clartLayer = await getImageLayer(
        "clart",
        district.label.toLowerCase().split(" ").join("_")+ "_" + block.label.toLowerCase().split(" ").join("_") + "_clart",
        true
      );

      if (
        LayersArray[4].LayerRef.current != null &&
        currentLayers.includes(LayersArray[4].name)
      ) {
        mapRef.current.removeLayer(LayersArray[4].LayerRef.current);
      }

      //mapRef.current.addLayer(clartLayer);
      LayersArray[4].LayerRef.current = clartLayer;

      //? Code for Well Depth Layer
      let wellDepthLayer = MicroWaterShedLayer;

      LayersArray[5].LayerRef.current = wellDepthLayer;

      //? Code For NREGA Layer

      let NregaLayer = await getWebGlLayers(
        "nrega_assets",
        district.label.toLowerCase().split(" ").join("_") +
          "_" +
          block.label.toLowerCase().split(" ").join("_")
      );

      if (
        LayersArray[6].LayerRef.current != null &&
        currentLayers.includes(LayersArray[6].name)
      ) {
        mapRef.current.removeLayer(LayersArray[6].LayerRef.current);
      }

      mapRef.current.addLayer(NregaLayer);
      LayersArray[6].LayerRef.current = NregaLayer;
      currentActiveLayers.push(LayersArray[6].name);

      //? Code for Drought Layer
      let DroughtLayer = await getVectorLayers(
        "cropping_drought",
        district.label.toLowerCase().split(" ").join("_") +
          "_" +
          block.label.toLowerCase().split(" ").join("_") +
          "_drought",
        true,
        true
      );

      if (
        LayersArray[7].LayerRef.current != null &&
        currentLayers.includes(LayersArray[7].name)
      ) {
        mapRef.current.removeLayer(LayersArray[7].LayerRef.current);
      }

      //mapRef.current.addLayer(DroughtLayer);
      LayersArray[7].LayerRef.current = DroughtLayer;

      //? Code for Terrain Layer
      let TerrainLayer = await getImageLayer(
        "terrain",
        district.label.toLowerCase().split(" ").join("_") +
          "_" +
          block.label.toLowerCase().split(" ").join("_") + "_terrain_raster",
        true
      );

      if (
        LayersArray[8].LayerRef.current != null &&
        currentLayers.includes(LayersArray[8].name)
      ) {
        mapRef.current.removeLayer(LayersArray[8].LayerRef.current);
      }

      //mapRef.current.addLayer(TerrainLayer);
      LayersArray[8].LayerRef.current = TerrainLayer;

      //? Code for Admin Without Metadata Layer
      let AdminBoundaryLayer = await getVectorLayers(
        "admin_boundaries",
        district.label.toLowerCase().split(" ").join("_") +
          "_" +
          block.label.toLowerCase().split(" ").join("_") +
          "_boundaries",
        true,
        true
      );

      if (
        LayersArray[9].LayerRef.current != null &&
        currentLayers.includes(LayersArray[9].name)
      ) {
        mapRef.current.removeLayer(LayersArray[9].LayerRef.current);
      }

      //mapRef.current.addLayer(AdminBoundaryLayer);
      LayersArray[9].LayerRef.current = AdminBoundaryLayer;

      //? Code for Cropping Intensity Layer
      let CroppingIntensityLayer = await getVectorLayers(
        "cropping_intensity",
        district.label.toLowerCase().split(" ").join("_") +
        "_" +
        block.label.toLowerCase().split(" ").join("_") + "_intensity",
        true,
        true
      );

      if (
        LayersArray[10].LayerRef.current != null &&
        currentLayers.includes(LayersArray[10].name)
      ) {
        mapRef.current.removeLayer(LayersArray[10].LayerRef.current);
      }

      //mapRef.current.addLayer(CroppingIntensityLayer);
      LayersArray[10].LayerRef.current = CroppingIntensityLayer;

      //? Code for Terrain Vector Layer
      let TerrainVectorLayer = await getVectorLayers(
        "terrain",
        district.label.toLowerCase().split(" ").join("_") +
          "_" +
          block.label.toLowerCase().split(" ").join("_") +
          "_cluster",
        true,
        true
      );

      TerrainVectorLayer.setStyle(function (feature) {
        return new Style({
          fill: new Fill({
            color: terrainClusterColors[feature.values_.terrainClu], // Fully opaque black
          }),
        });
      });

      if (
        LayersArray[11].LayerRef.current != null &&
        currentLayers.includes(LayersArray[11].name)
      ) {
        mapRef.current.removeLayer(LayersArray[11].LayerRef.current);
      }

      //mapRef.current.addLayer(TerrainVectorLayer);
      LayersArray[11].LayerRef.current = TerrainVectorLayer;

      //? Code for Terrain Lulc Slope Layer
      let TerrainLulcSlopeLayer = await getVectorLayers(
        "terrain_lulc",
        district.label.toLowerCase().split(" ").join("_") +
          "_" +
          block.label.toLowerCase().split(" ").join("_") +
          "_lulc_slope",
        true,
        true
      );

      if (
        LayersArray[12].LayerRef.current != null &&
        currentLayers.includes(LayersArray[12].name)
      ) {
        mapRef.current.removeLayer(LayersArray[12].LayerRef.current);
      }

      //mapRef.current.addLayer(TerrainVectorLayer);
      LayersArray[12].LayerRef.current = TerrainLulcSlopeLayer;

      //? Code for Terrain Lulc Plain Layer
      let TerrainLulcPlainLayer = await getVectorLayers(
        "terrain_lulc",
        district.label.toLowerCase().split(" ").join("_") +
          "_" +
          block.label.toLowerCase().split(" ").join("_") +
          "_lulc_plain",
        true,
        true
      );

      if (
        LayersArray[13].LayerRef.current != null &&
        currentLayers.includes(LayersArray[13].name)
      ) {
        mapRef.current.removeLayer(LayersArray[13].LayerRef.current);
      }

      //mapRef.current.addLayer(TerrainVectorLayer);
      LayersArray[13].LayerRef.current = TerrainLulcPlainLayer;

      setCurrentLayers(currentActiveLayers);
      setIsLoading(false);
      setIsLayersFetched(true);
    }
  };

  const handleExcelDownload = async () => {
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

  const handleItemSelect = (setter, state) => {
    setter(state);
  };

  const handleGeoJsonLayers = async (layerRef, name) => {
    if (layerRef.current != null && currentLayers.includes(name)) {
      const format = new GeoJSON({ featureProjection: "EPSG:4326" });

      const features = layerRef.current.getSource().getFeatures();

      let json;

      if (name === "Hydrological Boundries Layer") {
        let len = features.length;
        let temp_Features = [];

        for (let i = 0; i < len; ++i) {
          let temp_geo = features[i].getGeometry();
          let tempFeature = new Feature({
            geometry: temp_geo,
          });
          temp_Features.push(tempFeature);
        }

        json = format.writeFeatures(temp_Features);
      } else {
        json = format.writeFeatures(features);
      }
      setHrefData(
        "data:application/json;charset=utf-8," + encodeURIComponent(json)
      );
    } else {
      toast.error("Please Turn on the Layer First !!");
    }
  };

  const handleKMLLayers = (layerRef, name) => {
    if (layerRef.current != null && currentLayers.includes(name)) {
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

  const handleImageLayers = (name) => {
    if (name === "CLART") {
      const downloadurl = `https://geoserver.core-stack.org:8443/geoserver/clart/wcs?service=WCS&version=2.0.1&request=GetCoverage&CoverageId=clart:${district.label.toLowerCase().split(" ").join("_")}_${block.label.toLowerCase().split(" ").join("_")}_clart&format=geotiff&compression=LZW&tiling=false;`;
      window.open(downloadurl);
    } else if (bbox !== null && name === "Terrain") {
      const downloadurl = `https://geoserver.core-stack.org:8443/geoserver/terrain/wcs?service=WCS&version=2.0.1&request=GetCoverage&CoverageId=terrain:${district.label.toLowerCase().split(" ").join("_")}_${block.label.toLowerCase().split(" ").join("_")}_terrain_raster&format=geotiff&compression=LZW&tiling=true&tileheight=256&tilewidth=256`;
      window.open(downloadurl);
    } else {
      toast.info("Wait !");
    }
  };

  const handleImageLulcLayers = (type) => {
    if (bbox !== null && lulcYear1 !== null && type === "type1") {
      const downloadurl = `https://geoserver.core-stack.org:8443/geoserver/LULC_level_1/wcs?service=WCS&version=2.0.1&request=GetCoverage&CoverageId=LULC_level_1:LULC_${lulcYear1.value}_${block.label.toLowerCase().split(" ").join("_")}_level_1&format=geotiff&compression=LZW&tiling=false`;
      console.log(downloadurl)  
      window.open(downloadurl);
    } else if (bbox !== null && lulcYear2 !== null && type === "type2") {
      const downloadurl = `https://geoserver.core-stack.org:8443/geoserver/LULC_level_2/wcs?service=WCS&version=2.0.1&request=GetCoverage&CoverageId=LULC_level_2:LULC_${lulcYear2.value}_${block.label.toLowerCase().split(" ").join("_")}_level_2&format=geotiff&compression=LZW&tiling=false`;
      window.open(downloadurl);
    } else if (bbox !== null && lulcYear3 !== null && type === "type3") {
      const downloadurl = `https://geoserver.core-stack.org:8443/geoserver/LULC_level_3/wcs?service=WCS&version=2.0.1&request=GetCoverage&CoverageId=LULC_level_3:LULC_${lulcYear3.value}_${block.label.toLowerCase().split(" ").join("_")}_level_3&format=geotiff&compression=LZW&tiling=false`;
      window.open(downloadurl);
    } else {
      toast.info("Wait !");
    }
  };

  const handleLayerToggle = async(name, layerRef) => {
    if (!isLayersFetched) {
      return;
    }
    let tempLayer = currentLayers;

    if(name === "NREGA" && currentLayers.includes(name)){
      tempLayer = tempLayer.filter(function (item) {
        return item !== name;
      });
      mapRef.current.removeLayer(LayersArray[6].LayerRef.current)
      //LayersArray[6].LayerRef.current = nregaWebGlLayer
    }
    else if(name === "NREGA" && !currentLayers.includes(name)){
      const tempNregaStyle = {
        "shape-points": 12,
        "shape-radius": 6,
        "shape-fill-color": [
            "match",
            [
                "get",
                "itemColor"
            ],
            4,
            "#6495ED",
            1,
            "#C2678D",
            3,
            "#FFA500",
            5,
            "#1A759F",
            6,
            "#52B69A",
            2,
            "#355070",
            7,
            "#6D597A",
            "#00000000"
        ]
      }
      const nregaVectorSource = await LayersArray[6].LayerRef.current.getSource();
      mapRef.current.removeLayer(LayersArray[6].LayerRef.current)
      let nregaWebGlLayer = new WebGLPointsLayer({
        source : nregaVectorSource,
        style: tempNregaStyle,
      })
      mapRef.current.addLayer(nregaWebGlLayer)
      LayersArray[6].LayerRef.current = nregaWebGlLayer
      tempLayer.push(name);
    }
    else if (currentLayers.includes(name)) {
      tempLayer = tempLayer.filter(function (item) {
        return item !== name;
      });
      mapRef.current.removeLayer(layerRef.current);
    } 
    else if (name === "Hydrological Boundries" && currentLayers.includes("Hydrological Variables")) {

      tempLayer = tempLayer.filter(function (item) {
        return item !== "Hydrological Variables";
      });
      mapRef.current.removeLayer(LayersArray[5].LayerRef.current);
      tempLayer.push(name);
      mapRef.current.addLayer(layerRef.current);
    } 
    else if (name === "Hydrological Variables" && currentLayers.includes("Hydrological Boundries")) {
      tempLayer = tempLayer.filter(function (item) {
        return item !== "Hydrological Boundries";
      });
      mapRef.current.removeLayer(LayersArray[3].LayerRef.current);
      tempLayer.push(name);
      mapRef.current.addLayer(layerRef.current);
    } 
    else {
      tempLayer.push(name);
      mapRef.current.addLayer(layerRef.current);
    }

    setCurrentLayers(tempLayer);
  };

  return (
    <>
      <div className="h-screen mx-auto flex sm:flex-nowrap flex-wrap justify-end">
        <ToastContainer position="bottom-left" autoClose={4000} />
        <div className="w-full bg-gray-300 rounded-lg inset-0 flex items-end justify-start ">
          <div ref={mapElement} className="h-full w-full" />
        </div>

        <div className="w-2/6 mr-5 fixed flex items-center h-screen justify-center">
          <div className="bg-gray-500 bg-clip-padding backdrop-filter backdrop-blur-sm bg-opacity-25 border border-gray-100 rounded-2xl h-[95vh] flex-col w-full">
            <header className="flex justify-center items-center m-5">
              <img src={landscape_icon} className="h-14 w-14" />
              <span className="text-transparent ml-3 text-3xl font-extrabold bg-clip-text bg-gradient-to-r to-emerald-500 from-sky-400">
                Landscape Explorer
              </span>
            </header>
            <div className="flex flex-col items-center mr-2 w-full h-[75vh] overflow-y-auto overflow-x-hidden">
              <h2 className="text-slate-300 text-md mb-1 font-semibold title-font text-center font-mono">
                Select Location
              </h2>

              <div className="flex flex-row justify-center mb-4 w-3/5">
                <SelectButton
                  currVal={state === null ? { label: "Select State" } : state}
                  stateData={stateData}
                  handleItemSelect={handleItemSelect}
                  setState={setState}
                />
              </div>
              <div className="flex flex-row justify-center mb-4 w-3/5">
                <SelectButton
                  currVal={
                    district === null ? { label: "Select District" } : district
                  }
                  stateData={state !== null ? state.district : null}
                  handleItemSelect={handleItemSelect}
                  setState={setDistrict}
                />
              </div>
              <div className="flex flex-row justify-center mb-4 w-3/5">
                <SelectButton
                  currVal={block === null ? { label: "Select Block" } : block}
                  stateData={district !== null ? district.blocks : null}
                  handleItemSelect={handleItemSelect}
                  setState={setBlock}
                />
              </div>

              <div className="flex flex-wrap gap-x-4 m-1 justify-center">
                <FetchButton
                  name={
                    isLoading ? (
                      <>
                        <svg
                          aria-hidden="true"
                          role="status"
                          className="inline mr-3 w-4 h-4 text-white animate-spin"
                          viewBox="0 0 100 101"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                            fill="#E5E7EB"
                          ></path>
                          <path
                            d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                            fill="currentColor"
                          ></path>
                        </svg>
                        Loading...
                      </>
                    ) : (
                      "Fetch Layers"
                    )
                  }
                  onClickEvent={handleLocationChange}
                  isDisabled={block == null}
                />
                <FetchButton
                  name={
                    isDownloading ? (
                      <>
                        <svg
                          aria-hidden="true"
                          role="status"
                          className="inline mr-3 w-4 h-4 text-white animate-spin"
                          viewBox="0 0 100 101"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                            fill="#E5E7EB"
                          ></path>
                          <path
                            d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                            fill="currentColor"
                          ></path>
                        </svg>
                        Loading...
                      </>
                    ) : (
                      "Download Excel"
                    )
                  }
                  onClickEvent={handleExcelDownload}
                  isDisabled={block == null}
                />
              </div>

              <div className="flex flex-wrap gap-x-4 m-1 justify-center">
                {LayersArray.map((item) => {
                  return (
                    <div
                      className="w-44 mt-3 flex flex-col justify-around bg-white rounded-lg bg-clip-padding backdrop-filter backdrop-blur-md bg-opacity-90 border"
                      key={item.name}
                    >
                      <div className="w-full flex flex-row justify-between text-left p-2 items-center">
                        <span
                          className={
                            isLayersFetched && block !== null
                              ? "font-semibold font-mono mr-1 text-wrap text-sm"
                              : "font-semibold font-mono text-gray-400 mr-1 text-wrap text-sm"
                          }
                        >
                          {item.name}
                        </span>

                        <ToggleButton
                          currentLayers={currentLayers}
                          handleCheckboxChange={() =>
                            handleLayerToggle(item.name, item.LayerRef)
                          }
                          checkboxId={item.name}
                          disabled={isLayersFetched && item.LayerRef !== null}
                        />
                      </div>
                      <div className="flex w-full justify-center mb-1">
                        {!item.isRaster ? (
                          <>
                            <div className="mr-1">
                              <DownloadButton
                                name={"GeoJson"}
                                onClickEvent={() =>
                                  handleGeoJsonLayers(item.LayerRef, item.name)
                                }
                                href={hrefData}
                                download={`${item.name}features.json`}
                                isDisabled={
                                  isLayersFetched &&
                                  block !== null &&
                                  item.LayerRef !== null
                                }
                              />
                            </div>
                            <div className="ml-1">
                              <DownloadButton
                                name={"KML"}
                                onClickEvent={() =>
                                  handleKMLLayers(item.LayerRef, item.name)
                                }
                                href={hrefData}
                                download={`${item.name}features.kml`}
                                isDisabled={
                                  isLayersFetched &&
                                  block !== null &&
                                  item.LayerRef !== null
                                }
                              />
                            </div>
                          </>
                        ) : (
                          <DownloadButton
                            name={"GeoTiff"}
                            onClickEvent={() => handleImageLayers(item.name)}
                            isDisabled={isLayersFetched &&
                              block !== null &&
                              item.LayerRef !== null}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* LULC LEVEL 1 */}
              <h2 className="text-gray-900 text-md mb-1 mt-4 font-semibold title-font text-center font-mono">
                <label
                  htmlFor="toggle"
                  className={`text-md font-semibold ${
                    isLayersFetched && block !== null
                      ? "text-gray-800"
                      : "text-gray-400"
                  }`}
                >
                  {"LULC Layer Level 1"}
                </label>
              </h2>

              <div className="flex flex-row justify-center mb-2 w-3/5">
                <SelectButton
                  label={lulcYear1 == null ? "Select Year" : lulcYear1}
                  stateData={yearDataLulc}
                  handleItemSelect={handleItemSelect}
                  setState={setLulcYear1}
                />
              </div>
              <div className="flex">
                <a
                  className={`flex mx-auto mt-2 ${
                    lulcYear1 != null
                      ? "text-white bg-emerald-600 "
                      : "text-gray-400 bg-gray-300"
                  } border-0 py-2 px-8 focus:outline-none  rounded text-sm cursor-pointer`}
                  onClick={() => handleImageLulcLayers("type1")}
                  href={hrefData}
                  download="KMLfeatures.kml"
                >
                  GeoTiff
                </a>
              </div>

              {/* LULC LEVEL 2 */}

              <h2 className="text-gray-900 text-md mb-1 mt-4 font-semibold title-font text-center font-mono">
                <label
                  htmlFor="toggle"
                  className={`text-md font-semibold ${
                    isLayersFetched && block !== null
                      ? "text-gray-800"
                      : "text-gray-400"
                  }`}
                >
                  {"LULC Layer Level 2"}
                </label>
              </h2>

              <div className="flex flex-row justify-center mb-2 w-3/5">
                <SelectButton
                  label={lulcYear2 == null ? "Select Year" : lulcYear2}
                  stateData={yearDataLulc}
                  handleItemSelect={handleItemSelect}
                  setState={setLulcYear2}
                />
              </div>

              <div className="relative mb-2 mt-3 w-3/5">
                <div className="flex">
                  <a
                    className={`flex mx-auto mt-2 ${
                      lulcYear2 != null
                        ? "text-white bg-emerald-600 "
                        : "text-gray-400 bg-gray-300"
                    } border-0 py-2 px-8 focus:outline-none  rounded text-sm cursor-pointer`}
                    onClick={() => handleImageLulcLayers("type2")}
                    href={hrefData}
                    download="KMLfeatures.kml"
                  >
                    GeoTiff
                  </a>
                </div>
              </div>

              {/* LULC LEVEL 3 */}

              <h2 className="text-gray-900 text-md mb-1 mt-4 font-semibold title-font text-center font-mono">
                <label
                  htmlFor="toggle"
                  className={`text-md font-semibold ${
                    isLayersFetched && block !== null
                      ? "text-gray-800"
                      : "text-gray-400"
                  }`}
                >
                  {"LULC Layer Level 3"}
                </label>
              </h2>

              <div className="flex flex-row justify-center mb-2 w-3/5">
                <SelectButton
                  label={lulcYear3 == null ? "Select Year" : lulcYear3}
                  stateData={yearDataLulc}
                  handleItemSelect={handleItemSelect}
                  setState={setLulcYear3}
                />
              </div>

              <div className="relative mb-2 mt-3 w-3/5">
                <div className="flex">
                  <a
                    className={`flex mx-auto mt-2 ${
                      lulcYear3 != null
                        ? "text-white bg-emerald-600 "
                        : "text-gray-400 bg-gray-300"
                    } border-0 py-2 px-8 focus:outline-none  rounded text-sm cursor-pointer`}
                    onClick={() => handleImageLulcLayers("type3")}
                    href={hrefData}
                    download="KMLfeatures.kml"
                  >
                    GeoTiff
                  </a>
                </div>
              </div>

              <h2 className="text-slate-300 text-lg mb-1 font-semibold title-font text-center font-mono mt-5">
                Select Plan
              </h2>

              <div className="flex flex-row justify-center mb-2 w-3/5">
                <SelectButton
                  label={
                    selectedPlan == null ? "Select Plan" : selectedPlan.plan
                  }
                  stateData={plans}
                  handleItemSelect={handleItemSelect}
                  setState={setSelectedPlan}
                />
              </div>

              <button
                className={`flex mx-auto mt-2 ${
                  isLayersFetched
                    ? "text-white bg-emerald-600 "
                    : "text-gray-400 bg-gray-300"
                } border-0 py-2 px-8 focus:outline-none  rounded text-sm cursor-pointer`}
                onClick={() => {
                  fetchResourcesLayers();
                  fetchPlanningLayers();
                }}
              >
                {isLayersLoading ? (
                  <>
                    <svg
                      aria-hidden="true"
                      role="status"
                      className="inline mr-3 w-4 h-4 text-white animate-spin"
                      viewBox="0 0 100 101"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                        fill="#E5E7EB"
                      ></path>
                      <path
                        d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                        fill="currentColor"
                      ></path>
                    </svg>
                    Loading...
                  </>
                ) : (
                  "Fetch Layers"
                )}
              </button>

              <div className="flex-col gap-x-4 ml-10 mt-5 mb-2 w-full">
                <h1 className="text-2xl title-font font-semibold mb-2 text-gray-300">
                  Resources Layers
                </h1>
                <div className="h-0.5 w-36 bg-gray-400 rounded"></div>
              </div>

              <div className="flex flex-wrap gap-x-4 m-3 justify-center w-full">
                {ResourceLayersArray.map((item) => {
                  return (
                    <div
                      className="w-2/5 mt-3 flex flex-col justify-around bg-white rounded-lg bg-clip-padding backdrop-filter backdrop-blur-md bg-opacity-90 border"
                      key={item.name}
                    >
                      <div className="w-full flex justify-between text-left p-2 items-center">
                        <label
                          className={
                            isOtherLayersFetched && block !== null
                              ? "font-semibold text-sm font-mono"
                              : "font-semibold text-sm font-mono text-gray-400"
                          }
                        >
                          {item.name}
                        </label>
                        <ToggleButton
                          currentLayers={currentLayers}
                          handleCheckboxChange={() =>
                            handleLayerToggle(item.name, item.LayerRef)
                          }
                          checkboxId={item.name}
                          disabled={isOtherLayersFetched}
                        />
                      </div>
                      <div className="flex w-full justify-center mb-1">
                        <div className="mr-1">
                          <DownloadButton
                            name={"GeoJson"}
                            onClickEvent={() =>
                              handleGeoJsonLayers(item.LayerRef, item.name)
                            }
                            href={hrefData}
                            download={`${item.name}features.json`}
                            isDisabled={isOtherLayersFetched}
                          />
                        </div>
                        <div className="ml-1">
                          <DownloadButton
                            name={"KML"}
                            onClickEvent={() =>
                              handleKMLLayers(item.LayerRef, item.name)
                            }
                            href={hrefData}
                            download={`${item.name}features.kml`}
                            isDisabled={isOtherLayersFetched}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex-col gap-x-4 ml-10 mt-5 mb-2 w-full">
                <h1 className="text-2xl title-font font-semibold mb-2 text-gray-300">
                  Planning Layers
                </h1>
                <div className="h-0.5 w-36 bg-gray-400 rounded"></div>
              </div>

              <div className="flex flex-wrap gap-x-4 m-3 justify-center w-full">
                {PlanningLayersArray.map((item) => {
                  return (
                    <div
                      className="w-2/5 mt-3 flex flex-col justify-around bg-white rounded-lg bg-clip-padding backdrop-filter backdrop-blur-md bg-opacity-90 border"
                      key={item.name}
                    >
                      <div className="w-full flex justify-between text-left p-2 items-center">
                        <label
                          className={
                            isOtherLayersFetched && block !== null
                              ? "font-semibold text-sm font-mono"
                              : "font-semibold text-sm font-mono text-gray-400"
                          }
                        >
                          {item.name}
                        </label>
                        <ToggleButton
                          currentLayers={currentLayers}
                          handleCheckboxChange={() =>
                            handleLayerToggle(item.name, item.LayerRef)
                          }
                          checkboxId={item.name}
                          disabled={isOtherLayersFetched}
                        />
                      </div>
                      <div className="flex w-full justify-center mb-1">
                        <div className="mr-1">
                          <DownloadButton
                            name={"GeoJson"}
                            onClickEvent={() =>
                              handleGeoJsonLayers(item.LayerRef, item.name)
                            }
                            href={hrefData}
                            download={`${item.name}features.json`}
                            isDisabled={isOtherLayersFetched}
                          />
                        </div>
                        <div className="ml-1">
                          <DownloadButton
                            name={"KML"}
                            onClickEvent={() =>
                              handleKMLLayers(item.LayerRef, item.name)
                            }
                            href={hrefData}
                            download={`${item.name}features.kml`}
                            isDisabled={isOtherLayersFetched}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MapArea;
