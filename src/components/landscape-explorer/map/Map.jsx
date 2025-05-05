import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle } from "react";

// Import OL modules
import OLMap from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import XYZ from "ol/source/XYZ";
import Point from "ol/geom/Point";
import { Style, Fill, Stroke, Circle as CircleStyle, Icon } from "ol/style";
import { defaults as defaultControls } from "ol/control";
import WebGLPointsLayer from 'ol/layer/WebGLPoints.js';
import MapControls from './MapControls';
import Feature from 'ol/Feature';

// Import action functions
import getVectorLayers from "../../../actions/getVectorLayers";
import getWebGlLayers from "../../../actions/getWebGlLayers";
import getImageLayers from "../../../actions/getImageLayers";
import getStates from "../../../actions/getStates";

// Import asset icons
import settlementIcon from '../../../assets/settlement_icon.svg';
import wellIcon from '../../../assets/well_proposed.svg';
import waterbodyIcon from '../../../assets/waterbodies_proposed.svg';
import farmPondIcon from '../../../assets/farm_pond_proposed.svg';
import landLevelingIcon from '../../../assets/land_leveling_proposed.svg';
import tcbIcon from '../../../assets/tcb_proposed.svg';
import checkDamIcon from '../../../assets/check_dam_proposed.svg';
import boulderIcon from '../../../assets/boulder_proposed.svg';
import livelihoodIcon from '../../../assets/livelihood_proposed.svg';
import mapMarker from '../../../assets/map_marker.svg';

const Map = forwardRef(({
  isLoading,
  setIsLoading,
  state,
  district,
  block,
  filterSelections,
  lulcYear,
  toggledLayers = {},
  toggleLayer,
  showMWS = true,
  setShowMWS,
  showVillages = true,
  setShowVillages,
  selectedPlan = null
}, ref) => {
  const mapElement = useRef(null);
  const mapRef = useRef(null);
  const baseLayerRef = useRef(null);
  const markersLayer = useRef(null);
  
  // Added flag to prevent recursion
  const handlingExternalToggle = useRef(false);
  
  // Layer arrays matching original implementation structure
  const LayersArray = [
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
  ];
  
  const ResourceLayersArray = [
    { LayerRef: useRef(null), name: "Settlement" },
    { LayerRef: useRef(null), name: "Water Structure" },
    { LayerRef: useRef(null), name: "Well Structure" },
  ];
  
  const PlanningLayersArray = [
    { LayerRef: useRef(null), name: "Agriculture Structure" },
    { LayerRef: useRef(null), name: "Livelihood Structure" },
    { LayerRef: useRef(null), name: "Recharge Structures" },
  ];

  // Track active layers
  const [currentLayers, setCurrentLayers] = useState([]);
  const [bbox, setBBox] = useState(null);
  const [layerErrors, setLayerErrors] = useState({});
  const [isLayersFetched, setIsLayersFetched] = useState(false);
  const [isOtherLayersFetched, setIsOtherLayersFetched] = useState(false);
  const [stateData, setStateData] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Color constants from original implementation
  const terrainClusterColors = ["#324A1C", "#97C76B", "#673A13", "#E5E059"];
  const drainageColors = [
    "03045E", "023E8A", "0077B6", "0096C7", "00B4D8", "48CAE4", "90E0EF", "ADE8F4", "CAF0F8",
  ];

  // Helper function to change polygon color (from original)
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

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    toggleLayer: (layerId, isVisible) => {
      // Set flag to prevent recursion
      handlingExternalToggle.current = true;
      
      try {
        // Convert ID format from parent component (e.g., hydrological_boundaries)
        // to the format used internally in this component (e.g., Hydrological Boundries)
        const layerMap = {
          'demographics': 'Demographics',
          'drainage': 'Drainage',
          'remote_sensed_waterbodies': 'Remote-Sensed Waterbodies',
          'hydrological_boundaries': 'Hydrological Boundries',
          'clart': 'CLART',
          'hydrological_variables': 'Hydrological Variables',
          'nrega': 'NREGA',
          'drought': 'Drought',
          'terrain': 'Terrain',
          'administrative_boundaries': 'Administrative Boundaries',
          'cropping_intensity': 'Cropping Intensity',
          'terrain_vector': 'Terrain Vector',
          'terrain_lulc_slope': 'Terrain Lulc Slope',
          'terrain_lulc_plain': 'Terrain Lulc Plain',
          'settlement': 'Settlement',
          'water_structure': 'Water Structure',
          'well_structure': 'Well Structure',
          'agri_structure': 'Agriculture Structure',
          'livelihood_structure': 'Livelihood Structure',
          'recharge_structure': 'Recharge Structures'
        };
        
        const layerName = layerMap[layerId] || layerId;
        
        // Find layer reference
        const findLayerRef = (name) => {
          // Check basic layers
          for (const layer of LayersArray) {
            if (layer.name === name) {
              return layer.LayerRef;
            }
          }
          
          // Check resource layers
          for (const layer of ResourceLayersArray) {
            if (layer.name === name) {
              return layer.LayerRef;
            }
          }
          
          // Check planning layers
          for (const layer of PlanningLayersArray) {
            if (layer.name === name) {
              return layer.LayerRef;
            }
          }
          
          return null;
        };
        
        const layerRef = findLayerRef(layerName);
        
        if (layerRef) {
          handleLayerToggle(layerName, layerRef);
        } else {
          console.warn(`Layer reference not found for: ${layerName} (ID: ${layerId})`);
        }
      } finally {
        // Reset flag regardless of success or failure
        handlingExternalToggle.current = false;
      }
    },
    prepareLayers: () => {
      handleLocationChange();
    },
    zoomToExtent: (extent) => {
      if (mapRef.current && extent) {
        const view = mapRef.current.getView();
        view.fit(extent, {
          padding: [50, 50, 50, 50],
          duration: 1000
        });
      }
    },
    getMap: () => mapRef.current
  }));
  
  // Get block features (copied from original implementation)
  const getblockFeatures = async (data) => {
    let coordinates = null;
    let unAvailableStates = [];

    let AdminURl = `https://geoserver.core-stack.org:8443/geoserver/panchayat_boundaries/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=panchayat_boundaries:${data.district.toLowerCase().split(" ").join("_")}_${data.block.toLowerCase().split(" ").join("_")}&outputFormat=application/json&screen=main`;
    
    try {
      await fetch(AdminURl)
        .then((res) => res.json())
        .then((Geojson) => {
          if (Geojson.features && Geojson.features.length > 0 && 
              Geojson.features[0].geometry && 
              Geojson.features[0].geometry.coordinates &&
              Geojson.features[0].geometry.coordinates[0] &&
              Geojson.features[0].geometry.coordinates[0][0] &&
              Geojson.features[0].geometry.coordinates[0][0][0]) {
            coordinates = Geojson.features[0].geometry.coordinates[0][0][0];
          } else {
            console.log("Invalid GeoJSON structure for: ", data.block.toLowerCase());
            coordinates = [78.9, 23.6]; // Fallback coordinates
          }
        });
    } catch (e) {
      console.log("error in fetching for : ", data.block.toLowerCase());
      unAvailableStates.push(data);
      return { coordinates: [78.9, 23.6], data: data }; // Fallback coordinates
    }
    return { coordinates: coordinates || [78.9, 23.6], data: data };
  };
  
  // Initialize map
  const initializeMap = () => {
    // Create Google base layer - using same URL as original implementation
    const baseLayer = new TileLayer({
      source: new XYZ({
        url: "https://www.google.cn/maps/vt?lyrs=s@189&gl=cn&x={x}&y={y}&z={z}",
        maxZoom: 30,
      }),
      visible: true,
    });
    
    baseLayerRef.current = baseLayer;
    
    // Create map view with same center as original
    const view = new View({
      center: [80.0, 22.0], // Center of India
      zoom: 5,
      projection: "EPSG:4326",
      maxZoom: 19,
    });
    
    // Create the map
    const map = new OLMap({
      target: mapElement.current,
      layers: [baseLayer],
      controls: defaultControls(),
      view: view,
    });
    
    mapRef.current = map;
    
    // Add click handler (from original implementation)
    map.on("singleclick", (e) => {
      map.forEachFeatureAtPixel(e.pixel, (feature, layer) => {
        if (layer === markersLayer.current) {
          // Handle marker click - update state
          if (feature.values_.data) {
            const featureData = feature.values_.data;
            if (toggleLayer) {
              // Handle setState action
              if (featureData.state) {
                toggleLayer('setState', {
                  district: featureData.disGrp,
                  label: featureData.state,
                });
              }
            }
          }
        }
      });
    });
    
    // Add pointer move handler for cursor change
    map.on("pointermove", function (e) {
      const pixel = map.getEventPixel(e.originalEvent);
      const hit = map.hasFeatureAtPixel(pixel);
      map.getTarget().style.cursor = hit ? "pointer" : "";
    });
  };
  
  // Load state markers on initial load
  const getStatesData = async () => {
    setIsLoading(true);
    
    try {
      let data = await getStates();
      let temp_blockNames = [];
      let unAvailableStates = [];
  
      data.forEach((item) => {
        if (item.district && item.district.length > 0 && 
            item.district[0].blocks && item.district[0].blocks.length > 0) {
          let tempDS = {
            state: item.label,
            district: item.district[0].label,
            block: item.district[0].blocks[0].label,
            disGrp: item.district,
          };
          temp_blockNames.push(tempDS);
        }
      });
  
      let layer_features = await Promise.all(
        temp_blockNames.map((item) => {
          return getblockFeatures(item);
        })
      ).then((res) => {
        return res
          .filter(item => item.coordinates && item.coordinates.length >= 2) // Filter valid coordinates
          .map((item) => {
            return new Feature({
              geometry: new Point(item.coordinates),
              data: item.data,
            });
          });
      });
  
      const StateMarkers = new Style({
        image: new Icon({
          src: mapMarker,
          scale: 0.8,
        }),
      });
  
      let StateLevelLayer = new VectorLayer({
        source: new VectorSource({
          features: layer_features,
        }),
        style: StateMarkers,
        zIndex: 99
      });
  
      let availableData = [];
      let dataLen = unAvailableStates.length;
  
      data.forEach((item) => {
        let unavailable = false;
        for (let i = 0; i < dataLen; ++i) {
          if (item.label === unAvailableStates[i]?.state) {
            unavailable = true;
            break;
          }
        }
        if (!unavailable) {
          availableData.push(item);
        }
      });
  
      setStateData(availableData);
  
      if (mapRef.current) {
        // Remove any existing markers layer
        if (markersLayer.current) {
          mapRef.current.removeLayer(markersLayer.current);
        }
        
        mapRef.current.addLayer(StateLevelLayer);
        markersLayer.current = StateLevelLayer;
      }
    } catch (error) {
      console.error("Error loading state data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle district selection - add district markers
  const getDistrictData = async () => {
    if (!state || !state.district) return;
    
    try {
      setIsLoading(true);
      
      let temp_blocks = state.district.map((item) => {
        return {
          district: item.label,
          block: item.blocks && item.blocks.length > 0 ? item.blocks[0].label : '',
          disGrp: item.blocks,
        };
      }).filter(item => item.block); // Filter out items without blocks
  
      let temp_coordinates = null;
  
      let layer_features = await Promise.all(
        temp_blocks.map((item) => {
          return getblockFeatures(item);
        })
      ).then((res) => {
        return res
          .filter(item => item.coordinates && item.coordinates.length >= 2) // Filter valid coordinates
          .map((item) => {
            if (temp_coordinates == null) temp_coordinates = item.coordinates;
            return new Feature({
              geometry: new Point(item.coordinates),
              data: item.data,
            });
          });
      });
  
      const DistrictMarkers = new Style({
        image: new Icon({
          src: mapMarker,
          scale: 0.8,
        }),
      });
  
      let districtLevelLayer = new VectorLayer({
        source: new VectorSource({
          features: layer_features,
        }),
        style: DistrictMarkers,
        zIndex: 99
      });
  
      // Remove previous markers layer if it exists
      if (markersLayer.current && mapRef.current) {
        mapRef.current.removeLayer(markersLayer.current);
      }
  
      // Add new district markers
      if (mapRef.current) {
        mapRef.current.addLayer(districtLevelLayer);
        markersLayer.current = districtLevelLayer;
      }
  
      // Zoom to district with animation
      if (mapRef.current && temp_coordinates) {
        const view = mapRef.current.getView();
        view.animate({
          center: temp_coordinates,
          zoom: 8,
          duration: 1000,
          easing: (t) => t
        });
      }
    } catch (error) {
      console.error("Error loading district data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle block selection - add block markers  
  const getBlockData = async () => {
    if (!district || !district.blocks) return;
    
    try {
      setIsLoading(true);
      
      const temp_blocks = district.blocks.map((item) => {
        return { district: district.label, block: item.label };
      }).filter(item => item.block); // Ensure all blocks have a name
  
      let temp_coordinates = null;
  
      let layer_features = await Promise.all(
        temp_blocks.map((item) => {
          return getblockFeatures(item);
        })
      ).then((res) => {
        return res
          .filter(item => item.coordinates && item.coordinates.length >= 2) // Filter valid coordinates
          .map((item) => {
            if (temp_coordinates == null) temp_coordinates = item.coordinates;
            return new Feature({
              geometry: new Point(item.coordinates),
              data: item.data,
            });
          });
      });
  
      const BlockMarkers = new Style({
        image: new Icon({
          src: mapMarker,
          scale: 0.8,
        }),
      });
  
      let blockLevelLayer = new VectorLayer({
        source: new VectorSource({
          features: layer_features,
        }),
        style: BlockMarkers,
        zIndex: 99
      });
  
      // Remove previous markers layer if it exists
      if (markersLayer.current && mapRef.current) {
        mapRef.current.removeLayer(markersLayer.current);
      }
  
      // Add new block markers
      if (mapRef.current) {
        mapRef.current.addLayer(blockLevelLayer);
        markersLayer.current = blockLevelLayer;
      }
  
      // Zoom to block with animation
      if (mapRef.current && temp_coordinates) {
        const view = mapRef.current.getView();
        view.animate({
          center: temp_coordinates,
          zoom: 11,
          duration: 1000,
          easing: (t) => t
        });
      }
    } catch (error) {
      console.error("Error loading block data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Safe add layer function to prevent adding null or undefined layers
  const safeAddLayer = (layer) => {
    if (!mapRef.current) return;
    if (!layer) {
      console.warn("Attempted to add null/undefined layer");
      return;
    }
    
    try {
      // Check if layer is already in the map
      const mapLayers = mapRef.current.getLayers().getArray();
      const exists = mapLayers.some(l => l === layer);
      
      if (!exists) {
        mapRef.current.addLayer(layer);
      } else {
        console.log("Layer already exists in map");
      }
    } catch (error) {
      console.error("Error adding layer:", error);
    }
  };
  
  // Safe remove layer function
  const safeRemoveLayer = (layer) => {
    if (!mapRef.current || !layer) return;
    
    try {
      mapRef.current.removeLayer(layer);
    } catch (error) {
      console.error("Error removing layer:", error);
    }
  };

  // Handle location change - fetch all layers
  const handleLocationChange = async () => {
    if (!block) return;
    
    setIsLoading(true);
    let currentActiveLayers = [];

    try {
      // Get admin boundary layer
      let adminLayer = await getVectorLayers(
        "panchayat_boundaries",
        district.label.toLowerCase().split(" ").join("_") +
          "_" +
          block.label.toLowerCase().split(" ").join("_"),
        true,
        true
      );

      // Remove the admin Layer if exists to display only one admin layer at a time
      if (LayersArray[0].LayerRef.current != null) {
        safeRemoveLayer(LayersArray[0].LayerRef.current);
      }

      if (adminLayer) {
        safeAddLayer(adminLayer);
        currentActiveLayers.push(LayersArray[0].name);
        LayersArray[0].LayerRef.current = adminLayer;

        // Centering the Map to the Selected Block
        const Vectorsource = adminLayer.getSource();
        if (Vectorsource) {
          Vectorsource.once("change", function (e) {
            if (Vectorsource.getState() === "ready") {
              try {
                const arr = Vectorsource.getExtent();
                setBBox(arr);
                const mapcenter = [(arr[0] + arr[2]) / 2, (arr[1] + arr[3]) / 2];
                if (mapRef.current) {
                  mapRef.current.getView().animate({
                    center: mapcenter,
                    zoom: 11,
                    duration: 1000,
                    easing: (t) => t
                  });
                }
              } catch (error) {
                console.error("Error centering map:", error);
              }
            }
          });
        }
      }

      // Fetch and configure all other layers following original implementation
      // === Drainage Layer ===
      let DrainageLayer = await getVectorLayers(
        "drainage",
        district.label.toLowerCase().split(" ").join("_") +
          "_" +
          block.label.toLowerCase().split(" ").join("_"),
        true,
        true,
        "drainage",
      );

      if (DrainageLayer) {
        DrainageLayer.setStyle(function (feature) {
          if (!feature || !feature.values_) return null;
          
          let order = feature.values_.ORDER || 1;
          return new Style({
            stroke: new Stroke({
              color: `#${drainageColors[order - 1] || drainageColors[0]}`,
              width: 2.0,
            }),
          });
        });

        if (LayersArray[1].LayerRef.current != null) {
          safeRemoveLayer(LayersArray[1].LayerRef.current);
        }
        LayersArray[1].LayerRef.current = DrainageLayer;
      }

      // === Remote Sensed Waterbodies Layer ===
      let RemoteSensedWaterbodiesLayer = await getVectorLayers(
        "water_bodies",
        "surface_waterbodies_" + district.label.toLowerCase().split(" ").join("_") +
        "_" +
        block.label.toLowerCase().split(" ").join("_"),
        true,
        true,
        "Water_bodies",
      );

      if (RemoteSensedWaterbodiesLayer) {
        RemoteSensedWaterbodiesLayer.setStyle(
          new Style({
            stroke: new Stroke({ color: "#6495ed", width: 5 }),
            fill: new Fill({ color: "rgba(100, 149, 237, 0.5)" }),
          })
        );

        if (LayersArray[2].LayerRef.current != null) {
          safeRemoveLayer(LayersArray[2].LayerRef.current);
        }
        LayersArray[2].LayerRef.current = RemoteSensedWaterbodiesLayer;
      }

      // === MicroWatershed Layer ===
      let MicroWaterShedLayer = await getVectorLayers(
        "mws_layers",
        "deltaG_well_depth_" + district.label.toLowerCase().split(" ").join("_") +
        "_" +
        block.label.toLowerCase().split(" ").join("_"),
        true,
        true,
        "Watershed",
      );

      if (MicroWaterShedLayer) {
        MicroWaterShedLayer.setStyle(function (feature) {
          if (!feature || !feature.values_) return null;
          
          let bin = feature.values_.Net2018_23;
          if (bin < -5) {
            return changePolygonColor("rgba(255, 0, 0, 0.5)"); // red
          } else if (bin >= -5 && bin < -1) {
            return changePolygonColor("rgba(255, 255, 0, 0.5)"); // yellow
          } else if (bin >= -1 && bin <= 1) {
            return changePolygonColor("rgba(0, 255, 0, 0.5)"); // green
          } else if (bin > 1) {
            return changePolygonColor("rgba(0, 0, 255, 0.5)"); // blue
          }
          return null;
        });

        if (LayersArray[3].LayerRef.current != null) {
          safeRemoveLayer(LayersArray[3].LayerRef.current);
        }
        LayersArray[3].LayerRef.current = MicroWaterShedLayer;
      }

      // === CLART Layer ===
      let clartLayer = await getImageLayers(
        "clart",
        district.label.toLowerCase().split(" ").join("_") + "_" + 
        block.label.toLowerCase().split(" ").join("_") + "_clart",
        true
      );

      if (clartLayer) {
        if (LayersArray[4].LayerRef.current != null) {
          safeRemoveLayer(LayersArray[4].LayerRef.current);
        }
        LayersArray[4].LayerRef.current = clartLayer;
      }

      // === Well Depth Layer ===
      let wellDepthLayer = MicroWaterShedLayer;
      LayersArray[5].LayerRef.current = wellDepthLayer;

      // === NREGA Layer ===
      let NregaLayer = await getWebGlLayers(
        "nrega_assets",
        district.label.toLowerCase().split(" ").join("_") +
          "_" +
          block.label.toLowerCase().split(" ").join("_")
      );

      if (NregaLayer) {
        if (LayersArray[6].LayerRef.current != null) {
          safeRemoveLayer(LayersArray[6].LayerRef.current);
        }

        safeAddLayer(NregaLayer);
        LayersArray[6].LayerRef.current = NregaLayer;
        currentActiveLayers.push(LayersArray[6].name);
      }

      // === Drought Layer ===
      let DroughtLayer = await getVectorLayers(
        "cropping_drought",
        district.label.toLowerCase().split(" ").join("_") +
          "_" +
          block.label.toLowerCase().split(" ").join("_") +
          "_drought",
        true,
        true
      );

      if (DroughtLayer) {
        if (LayersArray[7].LayerRef.current != null) {
          safeRemoveLayer(LayersArray[7].LayerRef.current);
        }
        LayersArray[7].LayerRef.current = DroughtLayer;
      }

      // === Terrain Layer ===
      let TerrainLayer = await getImageLayers(
        "terrain",
        district.label.toLowerCase().split(" ").join("_") +
          "_" +
          block.label.toLowerCase().split(" ").join("_") + "_terrain_raster",
        true
      );

      if (TerrainLayer) {
        if (LayersArray[8].LayerRef.current != null) {
          safeRemoveLayer(LayersArray[8].LayerRef.current);
        }
        LayersArray[8].LayerRef.current = TerrainLayer;
      }

      // === Admin Without Metadata Layer ===
      let AdminBoundaryLayer = await getVectorLayers(
        "admin_boundaries",
        district.label.toLowerCase().split(" ").join("_") +
          "_" +
          block.label.toLowerCase().split(" ").join("_") +
          "_boundaries",
        true,
        true
      );

      if (AdminBoundaryLayer) {
        if (LayersArray[9].LayerRef.current != null) {
          safeRemoveLayer(LayersArray[9].LayerRef.current);
        }
        LayersArray[9].LayerRef.current = AdminBoundaryLayer;
      }

      // === Cropping Intensity Layer ===
      let CroppingIntensityLayer = await getVectorLayers(
        "cropping_intensity",
        district.label.toLowerCase().split(" ").join("_") +
        "_" +
        block.label.toLowerCase().split(" ").join("_") + "_intensity",
        true,
        true
      );

      if (CroppingIntensityLayer) {
        if (LayersArray[10].LayerRef.current != null) {
          safeRemoveLayer(LayersArray[10].LayerRef.current);
        }
        LayersArray[10].LayerRef.current = CroppingIntensityLayer;
      }

      // === Terrain Vector Layer ===
      let TerrainVectorLayer = await getVectorLayers(
        "terrain",
        district.label.toLowerCase().split(" ").join("_") +
          "_" +
          block.label.toLowerCase().split(" ").join("_") +
          "_cluster",
        true,
        true
      );

      if (TerrainVectorLayer) {
        TerrainVectorLayer.setStyle(function (feature) {
          if (!feature || !feature.values_) return null;
          
          return new Style({
            fill: new Fill({
              color: terrainClusterColors[feature.values_.terrainClu] || "#000000",
            }),
          });
        });

        if (LayersArray[11].LayerRef.current != null) {
          safeRemoveLayer(LayersArray[11].LayerRef.current);
        }
        LayersArray[11].LayerRef.current = TerrainVectorLayer;
      }

      // === Terrain Lulc Slope Layer ===
      let TerrainLulcSlopeLayer = await getVectorLayers(
        "terrain_lulc",
        district.label.toLowerCase().split(" ").join("_") +
          "_" +
          block.label.toLowerCase().split(" ").join("_") +
          "_lulc_slope",
        true,
        true
      );

      if (TerrainLulcSlopeLayer) {
        if (LayersArray[12].LayerRef.current != null) {
          safeRemoveLayer(LayersArray[12].LayerRef.current);
        }
        LayersArray[12].LayerRef.current = TerrainLulcSlopeLayer;
      }

      // === Terrain Lulc Plain Layer ===
      let TerrainLulcPlainLayer = await getVectorLayers(
        "terrain_lulc",
        district.label.toLowerCase().split(" ").join("_") +
          "_" +
          block.label.toLowerCase().split(" ").join("_") +
          "_lulc_plain",
        true,
        true
      );

      if (TerrainLulcPlainLayer) {
        if (LayersArray[13].LayerRef.current != null) {
          safeRemoveLayer(LayersArray[13].LayerRef.current);
        }
        LayersArray[13].LayerRef.current = TerrainLulcPlainLayer;
      }

      // Enable Demographics layer by default
      if (LayersArray[0].LayerRef.current && !currentLayers.includes("Demographics")) {
        currentActiveLayers.push("Demographics");
      }

      setCurrentLayers(currentActiveLayers);
      setIsLayersFetched(true);
      
    } catch (error) {
      console.error("Error fetching layers:", error);
      setLayerErrors(prev => ({
        ...prev,
        fetchLayers: error.message
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch resource layers
  const fetchResourcesLayers = async () => {
    if (!selectedPlan || !district || !block) return;
    
    setIsLoading(true);
    try {
      // Format district and block names
      const districtFormatted = district.label.toLowerCase().split(" ").join("_");
      const blockFormatted = block.label.toLowerCase().split(" ").join("_");
      
      //? Code for settlement Layer
      let settlementLayer = await getVectorLayers(
        "resources",
        "hemlet_layer" + block.label.toLowerCase(),
        true,
        true,
        "settlement",
        selectedPlan.value.plan_id,
        districtFormatted,
        blockFormatted
      );

      if (settlementLayer) {
        if (ResourceLayersArray[0].LayerRef.current != null) {
          safeRemoveLayer(ResourceLayersArray[0].LayerRef.current);
        }

        ResourceLayersArray[0].LayerRef.current = settlementLayer;

        ResourceLayersArray[0].LayerRef.current.setStyle(
          new Style({
            image: new Icon({ src: settlementIcon }),
          })
        );
        
        safeAddLayer(settlementLayer);
      }

      //? Code For Water Structures Layer
      let WaterStructuresLayer = await getVectorLayers(
        "resources",
        "plan_layer_gw" + block.label.toLowerCase(),
        true,
        false,
        "plan_gw",
        selectedPlan.value.plan_id,
        districtFormatted,
        blockFormatted
      );

      if (WaterStructuresLayer) {
        if (ResourceLayersArray[1].LayerRef.current != null) {
          safeRemoveLayer(ResourceLayersArray[1].LayerRef.current);
        }

        ResourceLayersArray[1].LayerRef.current = WaterStructuresLayer;

        ResourceLayersArray[1].LayerRef.current.setStyle(function (feature) {
          if (!feature || !feature.values_) return null;
          
          const status = feature.values_;

          if (status.work_type == "new farm pond") {
            return new Style({
              image: new Icon({ src: farmPondIcon }),
            });
          } else if (status.work_type == "new trench cum bund network") {
            return new Style({
              image: new Icon({ src: tcbIcon }),
            });
          } else if (status.work_type == "new check dam") {
            return new Style({
              image: new Icon({ src: checkDamIcon }),
            });
          } else {
            return new Style({
              image: new Icon({ src: boulderIcon }),
            });
          }
        });
        
        safeAddLayer(WaterStructuresLayer);
      }

      //? Code for Well Layer
      let WellLayer = await getVectorLayers(
        "resources",
        "well_layer" + block.label.toLowerCase(),
        true,
        true,
        "well",
        selectedPlan.value.plan_id,
        districtFormatted,
        blockFormatted
      );

      if (WellLayer) {
        if (ResourceLayersArray[2].LayerRef.current != null) {
          safeRemoveLayer(ResourceLayersArray[2].LayerRef.current);
        }

        ResourceLayersArray[2].LayerRef.current = WellLayer;

        ResourceLayersArray[2].LayerRef.current.setStyle(
          new Style({
            image: new Icon({ src: wellIcon }),
          })
        );
        
        safeAddLayer(WellLayer);
      }

      setIsOtherLayersFetched(true);
    } catch (error) {
      console.error("Error fetching resource layers:", error);
      setLayerErrors(prev => ({
        ...prev,
        resources: error.message
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch planning layers
  const fetchPlanningLayers = async () => {
    if (!selectedPlan || !district || !block) return;
    
    setIsLoading(true);
    try {
      // Format district and block names
      const districtFormatted = district.label.toLowerCase().split(" ").join("_");
      const blockFormatted = block.label.toLowerCase().split(" ").join("_");
      
      //? Code for Agri Structures Layer
      let AgriStructuresLayer = await getVectorLayers(
        "works",
        "plan_layer_agri" + block.label.toLowerCase(),
        true,
        false,
        "plan_agri",
        selectedPlan.value.plan_id,
        districtFormatted,
        blockFormatted
      );

      if (AgriStructuresLayer) {
        if (PlanningLayersArray[0].LayerRef.current != null) {
          safeRemoveLayer(PlanningLayersArray[0].LayerRef.current);
        }

        PlanningLayersArray[0].LayerRef.current = AgriStructuresLayer;

        PlanningLayersArray[0].LayerRef.current.setStyle(function (feature) {
          if (!feature || !feature.values_) return null;
          
          const status = feature.values_;

          if (status.TYPE_OF_WO == "New farm pond") {
            return new Style({
              image: new Icon({ src: farmPondIcon }),
            });
          } else if (status.TYPE_OF_WO == "Land leveling") {
            return new Style({
              image: new Icon({ src: landLevelingIcon }),
            });
          } else if (status.TYPE_OF_WO == "New well") {
            return new Style({
              image: new Icon({ src: wellIcon }),
            });
          } else {
            return new Style({
              image: new Icon({ src: waterbodyIcon }),
            });
          }
        });
        
        safeAddLayer(AgriStructuresLayer);
      }

      //? Code for Livelihood Layer
      let LivelihoodLayer = await getVectorLayers(
        "works",
        "hemlet_layer" + block.label.toLowerCase(),
        true,
        false,
        "livelihood",
        selectedPlan.value.plan_id,
        districtFormatted,
        blockFormatted
      );

      if (LivelihoodLayer) {
        if (PlanningLayersArray[1].LayerRef.current != null) {
          safeRemoveLayer(PlanningLayersArray[1].LayerRef.current);
        }

        PlanningLayersArray[1].LayerRef.current = LivelihoodLayer;

        PlanningLayersArray[1].LayerRef.current.setStyle(
          new Style({
            image: new Icon({ src: livelihoodIcon }),
          })
        );
        
        safeAddLayer(LivelihoodLayer);
      }

      //? Code for Water Structure Layer
      let WaterStructureLayer = await getVectorLayers(
        "works",
        "plan_layer_gw" + block.label.toLowerCase(),
        true,
        false,
        "plan_gw",
        selectedPlan.value.plan_id,
        districtFormatted,
        blockFormatted
      );

      if (WaterStructureLayer) {
        if (PlanningLayersArray[2].LayerRef.current != null) {
          safeRemoveLayer(PlanningLayersArray[2].LayerRef.current);
        }

        PlanningLayersArray[2].LayerRef.current = WaterStructureLayer;

        PlanningLayersArray[2].LayerRef.current.setStyle((feature) => {
          if (!feature || !feature.values_) return null;
          
          const status = feature.values_;

          if (status.selected_w == "new farm pond") {
            return new Style({
              image: new Icon({ src: farmPondIcon }),
            });
          } else if (status.selected_w == "new trench cum bund network") {
            return new Style({
              image: new Icon({ src: tcbIcon }),
            });
          } else if (status.selected_w == "new check dam") {
            return new Style({
              image: new Icon({ src: checkDamIcon }),
            });
          } else if (status.selected_w == "Loose Boulder Structure") {
            return new Style({
              image: new Icon({ src: boulderIcon }),
            });
          } else if (status.selected_w == "Works in Drainage lines") {
            return new Style({
              image: new Icon({ src: waterbodyIcon }),
            });
          } else {
            return new Style({
              image: new Icon({ src: waterbodyIcon }),
            });
          }
        });
        
        safeAddLayer(WaterStructureLayer);
      }
      
    } catch (error) {
      console.error("Error fetching planning layers:", error);
      setLayerErrors(prev => ({
        ...prev,
        planning: error.message
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle layer toggling - using the same approach as original
  const handleLayerToggle = (name, layerRef) => {
    if (!isLayersFetched && name !== "Demographics") {
      return;
    }
    
    let tempLayer = [...currentLayers];

    // Helper function to find layer reference
    const findLayerRef = (name) => {
      for (let i = 0; i < LayersArray.length; i++) {
        if (LayersArray[i].name === name) {
          return LayersArray[i].LayerRef;
        }
      }
      
      for (let i = 0; i < ResourceLayersArray.length; i++) {
        if (ResourceLayersArray[i].name === name) {
          return ResourceLayersArray[i].LayerRef;
        }
      }
      
      for (let i = 0; i < PlanningLayersArray.length; i++) {
        if (PlanningLayersArray[i].name === name) {
          return PlanningLayersArray[i].LayerRef;
        }
      }
      
      return null;
    };

    // If name is a string, find the layer reference
    if (typeof layerRef === 'string' || layerRef instanceof String) {
      const foundRef = findLayerRef(layerRef);
      if (foundRef) {
        layerRef = foundRef;
      } else {
        console.error(`Layer reference not found for: ${layerRef}`);
        return;
      }
    }

    // Special handling for NREGA layer
    if (name === "NREGA" && currentLayers.includes(name)) {
      tempLayer = tempLayer.filter(item => item !== name);
      if (LayersArray[6].LayerRef.current) {
        safeRemoveLayer(LayersArray[6].LayerRef.current);
      }
    }
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
      
      if (LayersArray[6].LayerRef.current) {
        const nregaVectorSource = LayersArray[6].LayerRef.current.getSource();
        if (nregaVectorSource) {
          safeRemoveLayer(LayersArray[6].LayerRef.current);
          
          let nregaWebGlLayer = new WebGLPointsLayer({
            source: nregaVectorSource,
            style: tempNregaStyle,
          });
          
          safeAddLayer(nregaWebGlLayer);
          LayersArray[6].LayerRef.current = nregaWebGlLayer;
          tempLayer.push(name);
        }
      }
    }
    // Regular handling for other layers
    else if (currentLayers.includes(name)) {
      tempLayer = tempLayer.filter(item => item !== name);
      if (layerRef?.current) {
        safeRemoveLayer(layerRef.current);
      }
    }
    else if (name === "Hydrological Boundries" && currentLayers.includes("Hydrological Variables")) {
      tempLayer = tempLayer.filter(item => item !== "Hydrological Variables");
      if (LayersArray[5].LayerRef.current) {
        safeRemoveLayer(LayersArray[5].LayerRef.current);
      }
      tempLayer.push(name);
      if (layerRef?.current) {
        safeAddLayer(layerRef.current);
      }
    }
    else if (name === "Hydrological Variables" && currentLayers.includes("Hydrological Boundries")) {
      tempLayer = tempLayer.filter(item => item !== "Hydrological Boundries");
      if (LayersArray[3].LayerRef.current) {
        safeRemoveLayer(LayersArray[3].LayerRef.current);
      }
      tempLayer.push(name);
      if (layerRef?.current) {
        safeAddLayer(layerRef.current);
      }
    }
    else {
      tempLayer.push(name);
      if (layerRef?.current) {
        safeAddLayer(layerRef.current);
      }
    }

    setCurrentLayers(tempLayer);
    
    // Notify parent about layer toggling if necessary
    // IMPORTANT: Only notify parent if this is not triggered by parent
    if (!handlingExternalToggle.current && toggleLayer && typeof toggleLayer === 'function') {
      const layerName = name.toLowerCase().replace(/\s+/g, '_');
      toggleLayer(layerName, tempLayer.includes(name));
    }
  };

  // Initialize map once
  useEffect(() => {
    if (!mapRef.current) {
      initializeMap();
      getStatesData(); // Load state markers on init
      setIsInitialized(true);
    }
    
    return () => {
      if (mapRef.current) {
        mapRef.current.setTarget(null);
      }
    };
  }, []);
  
  // When state changes, update district markers
  useEffect(() => {
    if (mapRef.current && state && !district) {
      getDistrictData();
    }
  }, [state]);
  
  // When district changes, update block markers
  useEffect(() => {
    if (mapRef.current && district && !block) {
      getBlockData();
    }
  }, [district]);

  // When district and block change, load relevant data
  useEffect(() => {
    if (mapRef.current && district && block) {
      handleLocationChange();
      
      // If Demographics is not in currentLayers, add it
      if (!currentLayers.includes("Demographics") && LayersArray[0].LayerRef.current) {
        handleLayerToggle("Demographics", LayersArray[0].LayerRef);
      }
    }
  }, [district, block]);
  
  // Handle select plan changes
  useEffect(() => {
    if (selectedPlan && district && block && isLayersFetched) {
      fetchResourcesLayers();
      fetchPlanningLayers();
    }
  }, [selectedPlan, isLayersFetched]);
  
  // Handle toggle layer changes from parent
  useEffect(() => {
    if (!mapRef.current || !isLayersFetched) return;
    
    // Set flag to prevent recursion
    handlingExternalToggle.current = true;
    
    try {
      // Handle toggles from parent UI
      Object.entries(toggledLayers).forEach(([id, isVisible]) => {
        // Map the UI toggle ID to our layer name
        const layerMap = {
          'demographics': 'Demographics',
          'drainage': 'Drainage',
          'remote_sensed_waterbodies': 'Remote-Sensed Waterbodies',
          'hydrological_boundaries': 'Hydrological Boundries',
          'clart': 'CLART',
          'hydrological_variables': 'Hydrological Variables',
          'nrega': 'NREGA',
          'drought': 'Drought',
          'terrain': 'Terrain',
          'administrative_boundaries': 'Administrative Boundaries',
          'cropping_intensity': 'Cropping Intensity',
          'terrain_vector': 'Terrain Vector',
          'terrain_lulc_slope': 'Terrain Lulc Slope',
          'terrain_lulc_plain': 'Terrain Lulc Plain',
          'settlement': 'Settlement',
          'water_structure': 'Water Structure',
          'well_structure': 'Well Structure',
          'agri_structure': 'Agriculture Structure',
          'livelihood_structure': 'Livelihood Structure',
          'recharge_structure': 'Recharge Structures'
        };
        
        const layerName = layerMap[id];
        if (!layerName) return;
        
        // Find the layer reference
        let layerRef = null;
        
        const basicLayer = LayersArray.find(l => l.name === layerName);
        const resourceLayer = ResourceLayersArray.find(l => l.name === layerName);
        const planningLayer = PlanningLayersArray.find(l => l.name === layerName);
        
        if (basicLayer) {
          layerRef = basicLayer.LayerRef;
        } else if (resourceLayer) {
          layerRef = resourceLayer.LayerRef;
        } else if (planningLayer) {
          layerRef = planningLayer.LayerRef;
        }
        
        if (layerRef && layerRef.current) {
          // Toggle the layer directly
          const isCurrentlyVisible = currentLayers.includes(layerName);
          
          if (isVisible !== isCurrentlyVisible) {
            // Direct manipulation instead of calling handleLayerToggle to avoid recursion
            if (isVisible) {
              if (!currentLayers.includes(layerName)) {
                setCurrentLayers(prev => [...prev, layerName]);
                safeAddLayer(layerRef.current);
              }
            } else {
              if (currentLayers.includes(layerName)) {
                setCurrentLayers(prev => prev.filter(item => item !== layerName));
                safeRemoveLayer(layerRef.current);
              }
            }
          }
        }
      });
    } finally {
      // Reset flag after processing
      handlingExternalToggle.current = false;
    }
  }, [toggledLayers, isLayersFetched]);

  return (
    <div className="relative w-full h-full">
      <div 
        ref={mapElement} 
        className="w-full h-full rounded-xl overflow-hidden"
        aria-label="Map"
      />
      
      <MapControls 
        showMWS={showMWS}
        setShowMWS={setShowMWS}
        showVillages={showVillages}
        setShowVillages={setShowVillages}
        mapRef={mapRef}
        toggleLayer={(layerId, isVisible) => {
          // Call the parent's toggleLayer function directly
          if (toggleLayer) {
            toggleLayer(layerId, isVisible);
          }
        }}
        toggledLayers={toggledLayers}
      />
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white p-4 rounded-lg shadow-lg flex items-center space-x-3">
            <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-gray-700">Loading map...</span>
          </div>
        </div>
      )}
      
      {/* Layer error notifications */}
      {Object.keys(layerErrors).length > 0 && (
        <div className="absolute bottom-24 right-6 bg-white p-2 rounded-lg shadow-lg text-sm max-w-xs">
          <div className="text-red-500 font-medium">Some layers failed to load:</div>
          <ul className="text-gray-600 text-xs mt-1">
            {Object.entries(layerErrors).map(([layer, error]) => (
              <li key={layer}>{layer}: {error ? error.substring(0, 50) : 'Unknown error'}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
});

export default Map;