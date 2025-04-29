import { useEffect, useRef, useState } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import {
  stateDataAtom,
  stateAtom,
  districtAtom,
  blockAtom,
  filterSelectionsAtom,
  yearAtom,
  dataJsonAtom,
} from "../store/locationStore.jsx";

//* OpenLayers imports
import "ol/ol.css";
import XYZ from "ol/source/XYZ";
import TileLayer from "ol/layer/Tile";
import Control from "ol/control/Control.js";
import { defaults as defaultControls } from "ol/control/defaults.js";
import { Map, View } from "ol";
import { Fill, Stroke, Style, Icon } from "ol/style.js";

import Navbar from "../components/navbar.jsx";
import getStates from "../actions/getStates.js";
import getVectorLayers from "../actions/getVectorLayers.js";
import getImageLayer from "../actions/getImageLayers.js";
import filtersDetails from "../components/data/Filters.json";

import KYLLeftSidebar from "../components/kyl_leftSidebar";
import KYLRightSidebar from "../components/kyl_rightSidebar.jsx";
import KYLMapContainer from "../components/kyl_mapContainer.jsx";
import getPlans from "../actions/getPlans.js";
import layerStyle from "../components/utils/layerStyle.jsx";

//? Icons Imports
import settlementIcon from "../assets/settlement_icon.svg";
import wellIcon from "../assets/well_proposed.svg";
import waterbodyIcon from "../assets/waterbodies_proposed.svg";
import farmPondIcon from "../assets/farm_pond_proposed.svg";
import landLevelingIcon from "../assets/land_leveling_proposed.svg";
import tcbIcon from "../assets/tcb_proposed.svg";
import checkDamIcon from "../assets/check_dam_proposed.svg";
import boulderIcon from "../assets/boulder_proposed.svg";

import { toast, Toaster } from "react-hot-toast";

const KYLDashboardPage = () => {
  const mapElement = useRef(null);
  const mapRef = useRef(null);
  const baseLayerRef = useRef(null);
  const boundaryLayerRef = useRef(null);
  const mwsLayerRef = useRef(null);

  let assetsLayerRefs = [useRef(null), useRef(null), useRef(null)];
  let demandLayerRefs = [useRef(null), useRef(null)];

  const [isLoading, setIsLoading] = useState(false);
  const [selectedMWS, setSelectedMWS] = useState(null);
  const [selectedVillages, setSelectedVillages] = useState([]);

  const [dataJson, setDataJson] = useRecoilState(dataJsonAtom);
  const [villageJson, setVillageJson] = useState(null);

  const [plans, setPlans] = useState(null);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [mappedAssets, setMappedAssets] = useState(false);
  const [mappedDemands, setMappedDemands] = useState(false);
  const [currentLayer, setCurrentLayer] = useState([]);
  const [toggleStates, setToggleStates] = useState({});
  const [villageIdList, setVillageIdList] = useState(new Set([]));

  const [statesData, setStatesData] = useRecoilState(stateDataAtom);
  const [state, setState] = useRecoilState(stateAtom);
  const [district, setDistrict] = useRecoilState(districtAtom);
  const [block, setBlock] = useRecoilState(blockAtom);
  const [filterSelections, setFilterSelections] =
    useRecoilState(filterSelectionsAtom);
  const lulcYear = useRecoilValue(yearAtom);

  const [indicatorType, setIndicatorType] = useState(null);
  const [showMapControls, setShowMapControls] = useState(false);
  const [showMWS, setShowMWS] = useState(true);
  const [showVillages, setShowVillages] = useState(true);
  const [filtersEnabled, setFiltersEnabled] = useState(false);

  const [toastId, setToastId] = useState(null);
  const [isSelectionEnabled, setIsSelectionEnabled] = useState(false);
  const [selectedMWSProfile, setSelectedMWSProfile] = useState(null);

  const handleAnalyzeClick = () => {
    // Enable selection mode
    setIsSelectionEnabled(true);

    // Show persistent toast
    const id = toast("Please select a micro-watershed on the map", {
      position: "top-center",
      duration: Infinity,
      style: {
        background: "#4B5563",
        color: "#fff",
        padding: "16px",
        borderRadius: "8px",
      },
    });
    setToastId(id);
  };

  const handleResetMWS = () => {
    if (!selectedMWSProfile) return; // If no MWS is selected, do nothing

    setSelectedMWSProfile(null);
    setIsSelectionEnabled(false);

    // Only reset the style of the currently selected (green) MWS
    if (mwsLayerRef.current) {
      fetchMWSLayer(selectedMWS);
    }

    if (toastId) {
      toast.dismiss(toastId);
      setToastId(null);
    }
  };

  const getAllFilterTypes = () => {
    const types = new Set();
    Object.keys(filtersDetails).forEach((indicator) => {
      Object.keys(filtersDetails[indicator]).forEach((type) => {
        types.add(type);
      });
    });
    return Array.from(types);
  };

  const getAllFilters = () => {
    const allFilters = [];
    Object.keys(filtersDetails).forEach((indicator) => {
      Object.keys(filtersDetails[indicator]).forEach((type) => {
        filtersDetails[indicator][type].forEach((filter) => {
          if (
            (filter.type === 1 || filter.type === 2) &&
            filter.values.length > 0
          ) {
            allFilters.push({
              ...filter,
              category: type,
            });
          }
        });
      });
    });
    return allFilters;
  };

  const getFormattedSelectedFilters = () => {
    const allSelections = [];

    const processSelections = (selections, dataSource) => {
      if (!selections) return;
      Object.entries(selections).forEach(([name, values]) => {
        if (!values) return;

        let filterGroup = null;

        outerLoop: for (const ind of Object.keys(filtersDetails)) {
          for (const type of Object.keys(filtersDetails[ind])) {
            const found = filtersDetails[ind][type].find(
              (group) => group.name === name
            );
            if (found) {
              filterGroup = found;
              break outerLoop;
            }
          }
        }

        if (filterGroup) {
          values.forEach((selectedOption) => {
            allSelections.push({
              filterName: filterGroup.label,
              value: selectedOption.label,
              name: filterGroup.name,
              layer_store: selectedOption.layer_store,
              layer_name: selectedOption.layer_name,
              rasterStyle: selectedOption.rasterStyle,
              vectorStyle: selectedOption.vectorStyle,
              styleIdx: selectedOption.styleIdx,
            });
          });
        }
      });
    };

    processSelections(filterSelections.selectedMWSValues, "MWS");
    processSelections(filterSelections.selectedVillageValues, "Village");

    return allSelections;
  };

  const determineFilterSource = (filterName) => {
    for (const topLevelKey of Object.keys(filtersDetails)) {
      if (filtersDetails[topLevelKey]) {
        for (const categoryKey of Object.keys(filtersDetails[topLevelKey])) {
          const found = filtersDetails[topLevelKey][categoryKey].find(
            (f) => f.name === filterName
          );
          if (found) {
            return { ...found, name: topLevelKey };
          }
        }
      }
    }
    return null;
  };

  // Filter selection handlers
  const handleFilterSelection = (name, option, isChecked) => {
    const sourceType = determineFilterSource(name);
    option = {
      ...option,
      layer_store: sourceType["layer_store"],
      layer_name: sourceType["layer_name"],
      rasterStyle: sourceType["rasterStyle"],
      vectorStyle: sourceType["vectorStyle"],
      styleIdx: sourceType["styleIdx"],
    };
    if (sourceType.name === "MWS") {
      setFilterSelections((prev) => ({
        ...prev,
        selectedMWSValues: {
          ...prev.selectedMWSValues,
          [name]: isChecked ? [option] : null,
        },
      }));
    } else if (sourceType.name === "Village") {
      setFilterSelections((prev) => ({
        ...prev,
        selectedVillageValues: {
          ...prev.selectedVillageValues,
          [name]: isChecked ? [option] : null,
        },
      }));
    }
  };

  const fetchMWSLayer = async (tempMWS) => {
    if (!district || !block) return;

    if (tempMWS.length === 0) {
      try {
        if (mwsLayerRef.current === null) {
          const layerName = `deltaG_well_depth_${district.label
            .toLowerCase()
            .split(" ")
            .join("_")}_${block.label.toLowerCase().split(" ").join("_")}`;
          const mwsLayer = await getVectorLayers(
            "mws_layers",
            layerName,
            true,
            true
          );
          if (mapRef.current) {
            mapRef.current.removeLayer(boundaryLayerRef.current);
            mapRef.current.addLayer(mwsLayer);
            mapRef.current.addLayer(boundaryLayerRef.current);
          }
          mwsLayerRef.current = mwsLayer;
        }

        mwsLayerRef.current.setStyle((feature) => {
          if (tempMWS.length > 0 && tempMWS.includes(feature.values_.uid)) {
            // Filtered areas - highlight in red
            return new Style({
              stroke: new Stroke({
                color: "#661E1E",
                width: 1.0,
              }),
              fill: new Fill({
                color: "rgba(255, 75, 75, 0.8)",
              }),
            });
          } else {
            // Default display - light yellow
            return new Style({
              stroke: new Stroke({
                color: "#4a90e2",
                width: 1.0,
              }),
              fill: new Fill({
                color: "rgba(74, 144, 226, 0.2)",
              }),
            });
          }
        });
      } catch (error) {
        console.error("Error fetching MWS layer:", error);
      }
    } else {
      try {
        mwsLayerRef.current.setStyle((feature) => {
          if (
            tempMWS.length > 0 &&
            tempMWS.includes(feature.values_.uid) &&
            currentLayer.length === 0
          ) {
            // Filtered areas - highlight in red
            return new Style({
              stroke: new Stroke({
                color: "#661E1E",
                width: 1.0,
              }),
              fill: new Fill({
                color: "rgba(255, 75, 75, 0.8)",
              }),
            });
          } else if (
            tempMWS.length > 0 &&
            tempMWS.includes(feature.values_.uid)
          ) {
            return new Style({
              stroke: new Stroke({
                color: "#254871",
                width: 1.5,
              }),
            });
          }
        });
      } catch (err) {
        console.log("Error in setting MWS style :", err);
      }
    }
  };

  const fetchAdminLayer = async (tempVillages) => {
    if (!district || !block) return;

    if (tempVillages.length === 0) {
      try {
        boundaryLayerRef.current.setStyle((feature) => {
          if (
            tempVillages.length > 0 &&
            tempVillages.includes(feature.values_.vill_ID)
          ) {
            // Filtered villages - gold
            return new Style({
              stroke: new Stroke({
                color: "#FFD700",
                width: 2,
              }),
            });
          } else {
            // Default village boundaries - light gray
            return new Style({
              stroke: new Stroke({
                color: "#000000",
                width: 1.5,
              }),
            });
          }
        });
      } catch (error) {
        console.log(boundaryLayerRef.current);
        console.error("Error styling admin layer:", error);
      }
    } else {
      boundaryLayerRef.current.setStyle((feature) => {
        if (
          tempVillages.length > 0 &&
          tempVillages.includes(feature.values_.vill_ID)
        ) {
          // Filtered villages - gold
          return new Style({
            stroke: new Stroke({
              color: "#FFD700",
              width: 2,
            }),
          });
        }
      });
    }
  };

  const fetchBoundaryAndZoom = async (districtName, blockName) => {
    setIsLoading(true);

    try {
      const boundaryLayer = await getVectorLayers(
        "panchayat_boundaries",
        `${districtName.toLowerCase().split(" ").join("_")}_${blockName
          .toLowerCase()
          .split(" ")
          .join("_")}`,
        true,
        true
      );

      const layerName = `deltaG_well_depth_${district.label
        .toLowerCase()
        .split(" ")
        .join("_")}_${block.label.toLowerCase().split(" ").join("_")}`;
      const mwsLayer = await getVectorLayers(
        "mws_layers",
        layerName,
        true,
        true
      );

      if (mwsLayerRef.current) {
        mapRef.current.removeLayer(mwsLayerRef.current);
      }

      if (boundaryLayerRef.current) {
        mapRef.current.removeLayer(boundaryLayerRef.current);
      }

      boundaryLayer.setOpacity(0);
      mapRef.current.addLayer(mwsLayer);
      mapRef.current.addLayer(boundaryLayer);
      boundaryLayerRef.current = boundaryLayer;
      mwsLayerRef.current = mwsLayer;

      const vectorSource = boundaryLayer.getSource();

      await new Promise((resolve, reject) => {
        const checkFeatures = () => {
          if (vectorSource.getFeatures().length > 0) {
            resolve();
          } else {
            vectorSource.once("featuresloadend", () => {
              if (vectorSource.getFeatures().length > 0) {
                resolve();
              } else {
                reject(new Error("No features loaded"));
              }
            });

            setTimeout(() => {
              if (vectorSource.getFeatures().length > 0) {
                resolve();
              } else {
                reject(new Error("Features loading timeout"));
              }
            }, 5000);
          }
        };

        checkFeatures();
      });

      const extent = vectorSource.getExtent();
      const view = mapRef.current.getView();
      view.cancelAnimations();

      view.animate(
        {
          zoom: Math.max(view.getZoom() - 0.5, 5),
          duration: 750,
        },
        () => {
          view.fit(extent, {
            padding: [50, 50, 50, 50],
            duration: 1000,
            maxZoom: 15,
            easing: (t) => {
              return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
            },
            callback: () => {
              let opacity = 0;
              const interval = setInterval(() => {
                opacity += 0.1;
                boundaryLayer.setOpacity(opacity);
                if (opacity >= 1) {
                  clearInterval(interval);
                  setIsLoading(false);
                }
              }, 50);
            },
          });
        }
      );

      boundaryLayer.setStyle(
        new Style({
          stroke: new Stroke({
            color: "#000000",
            width: 1.0,
          }),
        })
      );

      if (selectedMWS.length > 0) {
        await fetchMWSLayer(selectedMWS);
      }
    } catch (error) {
      console.error("Error loading boundary:", error);
      setIsLoading(false);

      const view = mapRef.current.getView();
      view.setCenter([78.9, 23.6]);
      view.setZoom(5);
    }
  };

  const fetchDataJson = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/download_kyl_data?state=${state.label
          .toLowerCase()
          .split(" ")
          .join("_")}&district=${district.label
          .toLowerCase()
          .split(" ")
          .join("_")}&block=${block.label
          .toLowerCase()
          .split(" ")
          .join("_")}&file_type=json`
      );

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const result = await response.json();
      setDataJson(result);
    } catch (e) {
      console.log(e);
    }
  };

  const fetchVillageJson = async () => {
    try {
      const response = await fetch(
        `${
          process.env.REACT_APP_API_URL
        }/download_kyl_village_data?state=${state.label
          .toLowerCase()
          .split(" ")
          .join("_")}&district=${district.label
          .toLowerCase()
          .split(" ")
          .join("_")}&block=${block.label
          .toLowerCase()
          .split(" ")
          .join("_")}&file_type=json`
      );

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const result = await response.json();
      setVillageJson(result);
    } catch (e) {
      console.log(e);
    }
  };

  const fetchPlans = async () => {
    let tempPlans = await getPlans(block.block_id);
    setPlans(tempPlans);
  };

  const handleLayerSelection = async (filter) => {
    let checkIfPresent = currentLayer.find((f) => f.name === filter.name);
    let checkIfInMap = mapRef.current.getLayers().getArray();
    let existingLayer = checkIfInMap.find((layer) => {
      return layer.ol_uid === boundaryLayerRef.current.ol_uid;
    });
    let tempArr = currentLayer;
    let len = filter.layer_store.length;
    if (checkIfPresent) {
      checkIfPresent.layerRef.map((item) => {
        mapRef.current.removeLayer(item);
      });
      if (!existingLayer) {
        mapRef.current.addLayer(boundaryLayerRef.current);
      }
      mwsLayerRef.current.setStyle((feature) => {
        if (
          selectedMWS.length > 0 &&
          selectedMWS.includes(feature.values_.uid)
        ) {
          return new Style({
            stroke: new Stroke({
              color: "#661E1E",
              width: 1.0,
            }),
            fill: new Fill({
              color: "rgba(255, 75, 75, 0.8)",
            }),
          });
        } else {
          return new Style({
            stroke: new Stroke({
              color: "#4a90e2",
              width: 1.0,
            }),
            fill: new Fill({
              color: "rgba(74, 144, 226, 0.2)",
            }),
          });
        }
      });
      tempArr = currentLayer.filter((item) => item.name !== filter.name);
      setToggleStates((prevStates) => ({
        ...prevStates,
        [filter.name]: false,
      }));
      setFiltersEnabled(true);
    } else if (currentLayer.length === 0) {
      let layerRef = [];
      mapRef.current.removeLayer(mwsLayerRef.current);
      mapRef.current.removeLayer(boundaryLayerRef.current);
      for (let i = 0; i < len; ++i) {
        let tempLayer;
        if (filter.layer_store[i] === "terrain") {
          tempLayer = await getImageLayer(
            filter.layer_store[i],
            `${district.label.toLowerCase().split(" ").join("_")}_${block.label
              .toLowerCase()
              .split(" ")
              .join("_")}_${filter.layer_name[i]}`,
            true,
            filter.rasterStyle
          );
          layerRef.push(tempLayer);
          mapRef.current.addLayer(tempLayer);
        } else if (
          filter.layer_store[i] === "LULC" &&
          filter.rasterStyle === "lulc_water_pixels"
        ) {
          tempLayer = await getImageLayer(
            `${filter.layer_store[i]}_${filter.layer_name[i]}`,
            `LULC_22_23_${block.label.toLowerCase().split(" ").join("_")}_${
              filter.layer_name[i]
            }`,
            true,
            filter.rasterStyle
          );
          layerRef.push(tempLayer);
          mapRef.current.addLayer(tempLayer);
        }
        //	change_detection:change_west_singhbhum_chaibasa_CropIntensity
        else if (filter.layer_store[i] === "change_detection") {
          tempLayer = await getImageLayer(
            `${filter.layer_store[i]}`,
            `change_${district.label
              .toLowerCase()
              .split(" ")
              .join("_")}_${block.label.toLowerCase().split(" ").join("_")}_${
              filter.layer_name[i]
            }`,
            true,
            filter.rasterStyle
          );
          layerRef.push(tempLayer);
          mapRef.current.addLayer(tempLayer);
        } else if (filter.layer_store[i] === "LULC") {
          tempLayer = await getImageLayer(
            `${filter.layer_store[i]}_${filter.layer_name[i]}`,
            `LULC_${lulcYear}_${block.label
              .toLowerCase()
              .split(" ")
              .join("_")}_${filter.layer_name[i]}`,
            true,
            filter.rasterStyle
          );
          layerRef.push(tempLayer);
          mapRef.current.addLayer(tempLayer);
        } else if (filter.layer_store[i] === "cropping_drought") {
          tempLayer = await getVectorLayers(
            filter.layer_store[i],
            `${district.label.toLowerCase().split(" ").join("_")}_${block.label
              .toLowerCase()
              .split(" ")
              .join("_")}_${filter.layer_name[i]}`
          );
        } else if (filter.layer_store[i] === "panchayat_boundaries") {
          tempLayer = await getVectorLayers(
            filter.layer_store[i],
            `${district.label.toLowerCase().split(" ").join("_")}_${block.label
              .toLowerCase()
              .split(" ")
              .join("_")}`
          );
        } else {
          tempLayer = await getVectorLayers(
            filter.layer_store[i],
            `${filter.layer_name[i]}_${district.label
              .toLowerCase()
              .split(" ")
              .join("_")}_${block.label.toLowerCase().split(" ").join("_")}`
          );
        }
        if (
          filter.layer_store[i] !== "terrain" &&
          filter.layer_store[i] !== "LULC" &&
          filter.layer_store[i] !== "change_detection"
        ) {
          tempLayer.setStyle((feature) => {
            return layerStyle(
              feature,
              filter.vectorStyle,
              filter.styleIdx,
              villageJson,
              dataJson
            );
          });
          layerRef.push(tempLayer);
          mapRef.current.addLayer(tempLayer);
        }
      }
      mwsLayerRef.current.setStyle((feature) => {
        if (
          selectedMWS.length > 0 &&
          selectedMWS.includes(feature.values_.uid)
        ) {
          return new Style({
            stroke: new Stroke({
              color: "#254871",
              width: 2.0,
            }),
          });
        }
      });
      mapRef.current.addLayer(mwsLayerRef.current);
      let tempObj = {
        name: filter.name,
        layerRef: layerRef,
      };
      tempArr.push(tempObj);
      setToggleStates((prevStates) => ({
        ...prevStates,
        [filter.name]: true,
      }));
      setFiltersEnabled(false);
      setIndicatorType(null);
    } else {
      toast.error("Please Turn off previous layer before turning on new one !");
    }
    setCurrentLayer(tempArr);
  };

  //? Assets Selection Handler
  const handleAssetSelection = (assetType, isChecked) => {
    if (currentPlan === null) {
      toast.error("Plan not selected  !");
      return;
    }

    if (assetType) {
      if (isChecked) {
        assetsLayerRefs.forEach((element) => {
          mapRef.current.addLayer(element.current);
        });
        setMappedAssets(true);
      } else {
        assetsLayerRefs.forEach((element) => {
          mapRef.current.removeLayer(element.current);
        });
        setMappedAssets(false);
      }
    } else {
      if (isChecked) {
        demandLayerRefs.forEach((element) => {
          mapRef.current.addLayer(element.current);
        });
        setMappedDemands(true);
      } else {
        demandLayerRefs.forEach((element) => {
          mapRef.current.removeLayer(element.current);
        });
        setMappedDemands(false);
      }
    }
  };

  const initializeMap = async () => {
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
      center: [78.9, 23.6],
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

  const handleItemSelect = (setter, value) => {
    setter(value);
    // Reset everything when location changes
    if (setter === setState) {
      setDistrict(null);
      setBlock(null);
      resetAllStates();
    } else if (setter === setDistrict) {
      setBlock(null);
      resetAllStates();
    } else if (setter === setBlock) {
      resetAllStates();
    }
  };

  const resetAllStates = () => {
    // Reset filters
    setFilterSelections({
      selectedMWSValues: {},
      selectedVillageValues: {},
    });

    setIndicatorType(null);

    setShowMapControls(false);
    setCurrentPlan(null);
    setMappedAssets(false);
    setMappedDemands(false);

    setSelectedMWS([]);
    setSelectedVillages([]);

    setShowMWS(true);
    setShowVillages(true);
    setSelectedMWSProfile(null);
    setIsSelectionEnabled(false);
  };

  useEffect(() => {
    if (!mapRef.current) return;

    const handleMapClick = (event) => {
      if (!isSelectionEnabled) return;

      const feature = mapRef.current.forEachFeatureAtPixel(
        event.pixel,
        (feature, layer) => {
          if (layer === mwsLayerRef.current) {
            return feature;
          }
        }
      );

      if (feature) {
        const clickedMwsId = feature.get("uid");

        if (selectedMWS.includes(clickedMwsId)) {
          setSelectedMWSProfile(feature.getProperties());
          if (toastId) {
            toast.dismiss(toastId);
            setToastId(null);
          }

          mwsLayerRef.current.setStyle((feature) => {
            if (clickedMwsId === feature.values_.uid) {
              return new Style({
                stroke: new Stroke({
                  color: "#166534",
                  width: 2.0,
                }),
                fill: new Fill({
                  color: "rgba(34, 197, 94, 0.4)",
                }),
              });
            } else if (
              selectedMWS.length > 0 &&
              selectedMWS.includes(feature.values_.uid)
            ) {
              return new Style({
                stroke: new Stroke({
                  color: "#661E1E",
                  width: 1.0,
                }),
                fill: new Fill({
                  color: "rgba(255, 75, 75, 0.8)",
                }),
              });
            }
          });

          setIsSelectionEnabled(false);
        } else {
          toast.error("Please Select a valid MWS !");
        }
      }
    };
    mapRef.current.on("click", handleMapClick);

    // Cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.un("click", handleMapClick);
      }
    };
  }, [mapRef.current, isSelectionEnabled, toastId]);

  useEffect(() => {
    if (mwsLayerRef.current) {
      mwsLayerRef.current.setVisible(showMWS);
    }
    if (boundaryLayerRef.current) {
      boundaryLayerRef.current.setVisible(showVillages);
    }
  }, [showMWS, showVillages]);

  useEffect(() => {
    try {
      if (!dataJson || !Array.isArray(dataJson)) {
        console.warn("DataJson not loaded or invalid format");
        return;
      }

      if (
        !filterSelections?.selectedMWSValues ||
        !filterSelections?.selectedVillageValues
      ) {
        console.warn("Invalid filter selections structure");
        return;
      }

      let keys = Object.keys(filterSelections.selectedMWSValues);
      let villageKeys = Object.keys(filterSelections.selectedVillageValues);
      let tempMWS = [];
      let tempVillages = [];
      let mwsVillageList = new Set([]);

      if (keys.length > 0) {
        try {
          const filterHasMatches = {};

          keys.forEach((item) => {
            const mwsValues = filterSelections.selectedMWSValues[item];
            if (!mwsValues) return;

            filterHasMatches[item] = false;

            mwsValues.forEach((selectedOption) => {
              let tempArr = [];
              const filter = getAllFilters().find((f) => f.name === item);

              if (filter?.type === 2) {
                dataJson.forEach((tempItem) => {
                  try {
                    if (
                      tempItem &&
                      typeof tempItem[item] !== "undefined" &&
                      tempItem.mws_id
                    ) {
                      const itemValue = Number(tempItem[item]);
                      if (
                        !isNaN(itemValue) &&
                        itemValue >= selectedOption.value.lower &&
                        itemValue <= selectedOption.value.upper
                      ) {
                        tempArr.push(tempItem.mws_id);
                        tempItem.mws_intersect_villages.forEach((ids) =>
                          mwsVillageList.add(ids)
                        );
                      }
                    }
                  } catch (err) {
                    console.warn("Error processing MWS item:", err);
                  }
                });
              } else {
                dataJson.forEach((tempItem) => {
                  try {
                    if (
                      tempItem &&
                      tempItem[item] === selectedOption.value &&
                      tempItem.mws_id
                    ) {
                      tempArr.push(tempItem.mws_id);
                      tempItem.mws_intersect_villages.forEach((ids) =>
                        mwsVillageList.add(ids)
                      );
                    }
                  } catch (err) {
                    console.warn("Error processing MWS item:", err);
                  }
                });
              }

              if (tempArr.length > 0) {
                filterHasMatches[item] = true;
              }

              if (tempMWS.length > 0) {
                tempMWS = tempMWS.filter((id) => tempArr.includes(id));
              } else {
                tempMWS = tempArr;
              }
            });
          });

          if (
            Object.keys(filterHasMatches).length > 0 &&
            Object.values(filterHasMatches).includes(false)
          ) {
            console.log(
              "At least one filter found no matching MWS, clearing results"
            );
            tempMWS = [];
            mwsVillageList = new Set([]);
          }

          setSelectedMWS(tempMWS);
          fetchMWSLayer(tempMWS);
          setVillageIdList(mwsVillageList);
        } catch (error) {
          console.error("Error processing MWS data:", error);
          setSelectedMWS([]);
          fetchMWSLayer([]);
        }
      } else {
        setSelectedMWS([]);
        fetchMWSLayer([]);
      }

      if (villageKeys.length > 0) {
        try {
          if (!villageJson || !Array.isArray(villageJson)) {
            console.warn("VillageJson not loaded or invalid format");
            return;
          }

          const filterHasMatches = {};

          villageKeys.forEach((item) => {
            const villageValues = filterSelections.selectedVillageValues[item];
            if (!villageValues) return;

            filterHasMatches[item] = false;

            villageValues.forEach((selectedOption) => {
              let tempArr = [];

              if (typeof selectedOption.value === "object") {
                villageJson.forEach((tempItem) => {
                  try {
                    if (
                      tempItem &&
                      typeof tempItem[item] !== "undefined" &&
                      tempItem.village_id
                    ) {
                      const itemValue = Number(tempItem[item]);
                      if (
                        !isNaN(itemValue) &&
                        itemValue >= selectedOption.value.lower &&
                        itemValue <= selectedOption.value.upper
                      ) {
                        // Only include villages that are in MWS selection if we have an MWS selection
                        if (
                          villageIdList.size === 0 ||
                          villageIdList.has(tempItem.village_id)
                        ) {
                          tempArr.push(tempItem.village_id);
                          filterHasMatches[item] = true;
                        }
                      }
                    }
                  } catch (err) {
                    console.warn("Error processing village item:", err);
                  }
                });
              } else {
                villageJson.forEach((tempItem) => {
                  try {
                    if (
                      tempItem &&
                      tempItem[item] === selectedOption.value &&
                      tempItem.village_id
                    ) {
                      // Only include villages that are in MWS selection if we have an MWS selection
                      if (
                        villageIdList.size === 0 ||
                        villageIdList.has(tempItem.village_id)
                      ) {
                        tempArr.push(tempItem.village_id);
                        filterHasMatches[item] = true;
                      }
                    }
                  } catch (err) {
                    console.warn("Error processing village item:", err);
                  }
                });
              }

              if (tempVillages.length > 0) {
                tempVillages = tempVillages.filter((id) =>
                  tempArr.includes(id)
                );
              } else {
                tempVillages = tempArr;
              }
            });
          });

          // If any filter has no matches, clear results
          if (
            Object.keys(filterHasMatches).length > 0 &&
            Object.values(filterHasMatches).includes(false)
          ) {
            console.log(
              "At least one village filter found no matching villages, clearing results"
            );
            tempVillages = [];
          }

          setSelectedVillages(tempVillages);
          fetchAdminLayer(tempVillages);
        } catch (error) {
          console.error("Error processing village data:", error);
          setSelectedVillages([]);
          fetchAdminLayer([]);
        }
      } else {
        setSelectedVillages([]);
        fetchAdminLayer([]);
      }
    } catch (error) {
      console.error("Critical error in filter processing:", error);
      setSelectedMWS([]);
      setSelectedVillages([]);
      fetchMWSLayer([]);
      fetchAdminLayer([]);
    }
  }, [filterSelections, dataJson, villageJson]);

  useEffect(() => {
    // Skip if no village filters or no data
    if (
      !villageJson ||
      !Object.keys(filterSelections.selectedVillageValues).length
    )
      return;

    // Re-process village filters when villageIdList changes
    try {
      let tempVillages = [];
      const villageKeys = Object.keys(filterSelections.selectedVillageValues);

      villageKeys.forEach((item) => {
        const villageValues = filterSelections.selectedVillageValues[item];
        if (!villageValues) return;

        villageValues.forEach((selectedOption) => {
          if (!selectedOption?.value) return;

          let tempArr = [];

          if (typeof selectedOption.value === "object") {
            // Range filter (numeric)
            villageJson.forEach((tempItem) => {
              try {
                // Key change: Always check against villageIdList if it has entries
                if (
                  tempItem &&
                  typeof tempItem[item] !== "undefined" &&
                  tempItem.village_id
                ) {
                  const itemValue = Number(tempItem[item]);

                  if (
                    !isNaN(itemValue) &&
                    itemValue >= selectedOption.value.lower &&
                    itemValue <= selectedOption.value.upper
                  ) {
                    // Only include villages that are in the MWS selection if we have an MWS selection
                    if (
                      villageIdList.size === 0 ||
                      villageIdList.has(tempItem.village_id)
                    ) {
                      tempArr.push(tempItem.village_id);
                    }
                  }
                }
              } catch (err) {
                console.warn("Error processing village item:", err);
              }
            });
          } else {
            // Value match filter
            villageJson.forEach((tempItem) => {
              try {
                if (
                  tempItem &&
                  tempItem[item] === selectedOption.value &&
                  tempItem.village_id
                ) {
                  // Only include villages that are in the MWS selection if we have an MWS selection
                  if (
                    villageIdList.size === 0 ||
                    villageIdList.has(tempItem.village_id)
                  ) {
                    tempArr.push(tempItem.village_id);
                  }
                }
              } catch (err) {
                console.warn("Error processing village item:", err);
              }
            });
          }

          if (tempVillages.length > 0) {
            tempVillages = tempVillages.filter((id) => tempArr.includes(id));
          } else {
            tempVillages = tempArr;
          }
        });
      });

      setSelectedVillages(tempVillages);
      fetchAdminLayer(tempVillages);
    } catch (error) {
      console.error("Error re-processing village data:", error);
      setSelectedVillages([]);
      fetchAdminLayer([]);
    }
  }, [villageIdList, villageJson, filterSelections.selectedVillageValues]);

  useEffect(() => {
    if (currentPlan !== null) {
      const fetchResourcesLayers = async () => {
        assetsLayerRefs[0].current = await getVectorLayers(
          "resources",
          "settlement" +
            "_" +
            currentPlan.value.plan_id +
            "_" +
            district.label.toLowerCase().split(" ").join("_") +
            "_" +
            block.label.toLowerCase().split(" ").join("_"),
          true,
          true
        );
        assetsLayerRefs[0].current.setStyle(
          new Style({
            image: new Icon({ src: settlementIcon }),
          })
        );

        assetsLayerRefs[1].current = await getVectorLayers(
          "resources",
          "well" +
            "_" +
            currentPlan.value.plan_id +
            "_" +
            district.label.toLowerCase().split(" ").join("_") +
            "_" +
            block.label.toLowerCase().split(" ").join("_"),
          true,
          true
        );
        assetsLayerRefs[1].current.setStyle(
          new Style({
            image: new Icon({ src: wellIcon }),
          })
        );

        assetsLayerRefs[2].current = await getVectorLayers(
          "resources",
          "waterbody" +
            "_" +
            currentPlan.value.plan_id +
            "_" +
            district.label.toLowerCase().split(" ").join("_") +
            "_" +
            block.label.toLowerCase().split(" ").join("_"),
          true,
          true
        );
        assetsLayerRefs[2].current.setStyle(
          new Style({
            image: new Icon({ src: waterbodyIcon }),
          })
        );
      };

      const fetchDemandLayers = async () => {
        demandLayerRefs[0].current = await getVectorLayers(
          "works",
          "plan_agri" +
            "_" +
            currentPlan.value.plan_id +
            "_" +
            district.label.toLowerCase().split(" ").join("_") +
            "_" +
            block.label.toLowerCase().split(" ").join("_"),
          true,
          true
        );
        demandLayerRefs[0].current.setStyle((feature) => {
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

        demandLayerRefs[1].current = await getVectorLayers(
          "works",
          "plan_gw" +
            "_" +
            currentPlan.value.plan_id +
            "_" +
            district.label.toLowerCase().split(" ").join("_") +
            "_" +
            block.label.toLowerCase().split(" ").join("_"),
          true,
          true
        );
        demandLayerRefs[2].current.setStyle((feature) => {
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
      };

      fetchResourcesLayers().catch(console.error);
      fetchDemandLayers().catch(console.error);
    } else {
      if (mappedAssets) {
        assetsLayerRefs.forEach((element) => {
          mapRef.current.removeLayer(element.current);
        });
        setMappedAssets(false);
      }
      if (mappedDemands) {
        demandLayerRefs.forEach((element) => {
          mapRef.current.removeLayer(element.current);
        });
        setMappedDemands(false);
      }
    }
  }, [currentPlan]);

  useEffect(() => {
    if (statesData === null) {
      getStates().then((data) => setStatesData(data));
    }
  }, [statesData, setStatesData]);

  useEffect(() => {
    // Initialize map if not already initialized
    if (!mapRef.current) {
      initializeMap();
      // Return early to wait for mapRef.current to be available after initialization
      return;
    }

    // Once mapRef.current is available, proceed with other operations
    if (district && block) {
      const view = mapRef.current.getView();
      view.cancelAnimations();

      fetchBoundaryAndZoom(district.label, block.label);
      setCurrentPlan(null);
      fetchDataJson();
      fetchVillageJson();
      fetchPlans();

      setFiltersEnabled(true);
      setToggleStates({});
      setCurrentLayer([]);
    }

    // Cleanup function
    return () => {
      if (mapRef.current) {
        const view = mapRef.current.getView();
        view.cancelAnimations();

        // Clear layers
        assetsLayerRefs.forEach((ref) => {
          if (ref.current) {
            mapRef.current.removeLayer(ref.current);
          }
        });
      }
    };
  }, [district, block, mapRef.current]); // Add mapRef.current as a dependency

  useEffect(() => {
    const fetchUpdateLulc = async () => {
      if (currentLayer !== null) {
        let tempArr = currentLayer;
        let tempLen = tempArr.length;
        for (let i = 0; i < tempLen; ++i) {
          if (tempArr[i].name === "avg_double_cropped") {
            mapRef.current.removeLayer(tempArr[i].layerRef[0]);
            let tempLayer = await getImageLayer(
              `LULC_level_3`,
              `LULC_${lulcYear}_${block.label
                .toLowerCase()
                .split(" ")
                .join("_")}_level_3`,
              true
            );
            mapRef.current.addLayer(tempLayer);
            tempArr[i].layerRef[0] = tempLayer;
          }
          if (tempArr[i].name === "built_up_area") {
            mapRef.current.removeLayer(tempArr[i].layerRef[0]);
            let tempLayer = await getImageLayer(
              `LULC_level_1`,
              `LULC_${lulcYear}_${block.label
                .toLowerCase()
                .split(" ")
                .join("_")}_level_1`,
              true
            );
            mapRef.current.addLayer(tempLayer);
            tempArr[i].layerRef[0] = tempLayer;
          }
        }
        setCurrentLayer(tempArr);
      }
    };
    fetchUpdateLulc().catch(console.error);
  }, [lulcYear]);

  return (
    <div className="min-h-screenbg-white flex flex-col">
      <Toaster />
      <div className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <Navbar />
      </div>
      <div className="flex h-[calc(100vh-48px)] p-4 gap-4">
        {/* Left Sidebar */}
        <KYLLeftSidebar
          indicatorType={indicatorType}
          setIndicatorType={setIndicatorType}
          filterSelections={filterSelections}
          setFilterSelections={setFilterSelections}
          getAllFilterTypes={getAllFilterTypes}
          getAllFilters={getAllFilters}
          handleFilterSelection={handleFilterSelection}
          state={state} // Pass state
          district={district} // Pass district
          block={block} // Pass block
          setToggleStates={setToggleStates}
          currentLayer={currentLayer}
          setCurrentLayer={setCurrentLayer}
          mapRef={mapRef}
          filtersEnabled={filtersEnabled}
        />

        {/* Map Container */}
        <KYLMapContainer
          isLoading={isLoading}
          statesData={statesData}
          mapElement={mapElement}
          showMWS={showMWS}
          setShowMWS={setShowMWS}
          showVillages={showVillages}
          setShowVillages={setShowVillages}
          mwsLayerRef={mwsLayerRef}
          boundaryLayerRef={boundaryLayerRef}
          mapRef={mapRef}
          currentLayer={currentLayer}
        />

        {/* Right Sidebar */}
        <KYLRightSidebar
          state={state}
          district={district}
          block={block}
          setState={setState}
          setDistrict={setDistrict}
          setBlock={setBlock}
          statesData={statesData}
          handleItemSelect={handleItemSelect}
          setFilterSelections={setFilterSelections}
          getFormattedSelectedFilters={getFormattedSelectedFilters}
          selectedMWS={selectedMWS}
          selectedVillages={selectedVillages}
          plansState={plans}
          currentPlan={currentPlan}
          setCurrentPlan={setCurrentPlan}
          onLocationSelect={(location) => {
            if (location.type === "block") {
              setTimeout(() => {
                fetchBoundaryAndZoom(
                  location.data.district.label,
                  location.data.block.label
                );
                resetAllStates();
              }, 0);
            }
          }}
          handleAssetSelection={handleAssetSelection}
          mappedAssets={mappedAssets}
          mappedDemands={mappedDemands}
          handleLayerSelection={handleLayerSelection}
          toggleStates={toggleStates}
          setToggleStates={setToggleStates}
          currentLayer={currentLayer}
          setCurrentLayer={setCurrentLayer}
          mapRef={mapRef}
          onAnalyzeClick={handleAnalyzeClick}
          onResetMWS={handleResetMWS}
          selectedMWSProfile={selectedMWSProfile}
        />
      </div>
    </div>
  );
};

export default KYLDashboardPage;
