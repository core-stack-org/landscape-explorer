import React, { useEffect, useRef,useMemo } from "react";
import TileLayer from "ol/layer/Tile";
import XYZ from "ol/source/XYZ";
import { defaults as defaultControls } from "ol/control";
import { Fill, Stroke, Style, Icon } from "ol/style.js";
import Map from "ol/Map";
import View from "ol/View";
import MouseWheelZoom from "ol/interaction/MouseWheelZoom";
import PinchZoom from "ol/interaction/PinchZoom";
import DoubleClickZoom from "ol/interaction/DoubleClickZoom";
import { useRecoilValue } from "recoil";
import { districtLookupAtom, blockLookupAtom } from "../store/locationStore";
import getVectorLayers from "../actions/getVectorLayers";
import SettlementIcon from '../assets/settlement_icon.svg';
import WellIcon from "../assets/well_proposed.svg";  
import WaterStructureIcon from '../assets/waterbodies_proposed.svg';
import RechargeIcon from '../assets/recharge_icon.svg';
import IrrigationIcon from "../assets/irrigation_icon.svg";
import LivelihoodIcon from "../assets/livelihood_proposed.svg";




const PlanViewDialog = ({ open, onClose, plan }) => {
const districtLookup = useRecoilValue(districtLookupAtom);
const blockLookup = useRecoilValue(blockLookupAtom);

const districtName = useMemo(() => {
    return districtLookup[plan?.district] || plan?.district || "--";
  }, [plan, districtLookup]);
  
  const blockName = useMemo(() => {
    return blockLookup[plan?.block] || plan?.block || "--";
  }, [plan, blockLookup]);

  const mapRef = useRef(null);
  const mapElement = useRef(null);

  // ---------- INIT BASEMAP ----------
  useEffect(() => {
    if (!open) return;
  
    const map = new Map({
      target: mapElement.current,
      layers: [
        new TileLayer({
          source: new XYZ({
            url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
            maxZoom: 20,
          }),
        }),
      ],
      view: new View({
        center: [78.9, 23.6],
        zoom: 6,
        projection: "EPSG:4326",
      }),
      controls: defaultControls(),
    });
  
    // Disable unnecessary interactions
    map.getInteractions().forEach((interaction) => {
      if (
        interaction instanceof MouseWheelZoom ||
        interaction instanceof PinchZoom ||
        interaction instanceof DoubleClickZoom
      ) {
        interaction.setActive(false);
      }
    });
  
    mapRef.current = map;
  
    loadBoundary();
    loadSettlement();
    loadWell();
    loadWaterStructure();
    loadRechargeStructure();
    loadIrrigationStructure();
    loadLivelihood();
  
    return () => {
      if (mapRef.current) {
        mapRef.current.setTarget(null);
      }
    };
  }, [open, plan]);
  

  const loadBoundary = async () => {
    if (!plan) return;
  
    const districtNameSafe = (districtName || "")
      .toLowerCase()
      .replace(/\s+/g, "_");
  
    const blockNameSafe = (blockName || "")
      .toLowerCase()
      .replace(/\s+/g, "_");
  
    const layerStore = "panchayat_boundaries";
    const layerName = `${districtNameSafe}_${blockNameSafe}`;
    
    const boundaryLayer = await getVectorLayers(
      layerStore,
      layerName,
      true
    );
  
    mapRef.current.addLayer(boundaryLayer);
  
    // Remove fill & keep only stroke
    boundaryLayer.setStyle(
      new Style({
        stroke: new Stroke({
          color: "#000",
          width: 2,
        }),
        fill: new Fill({
          color: "rgba(0,0,0,0)",
        }),
      })
    );
  
    // ⭐ FIT ALL FEATURES, NOT ONLY FIRST ONE
    boundaryLayer.getSource().on("change", () => {
      const source = boundaryLayer.getSource();
  
      if (source.getState() === "ready") {
        const extent = source.getExtent();
  
        if (extent) {
          mapRef.current.getView().fit(extent, {
            padding: [40, 40, 40, 40],
            duration: 800,
            maxZoom: 12, // you can increase to 13 for closer view
          });
        }
      }
    });
  };

  const loadSettlement = async () => {
    if (!plan) return;
  
    const districtNameSafe = (districtName || "").toLowerCase().replace(/\s+/g, "_");
    const blockNameSafe = (blockName || "").toLowerCase().replace(/\s+/g, "_");
    const layerStore = "resources";
    const layerName = `settlement_${plan.id}_${districtNameSafe}_${blockNameSafe}`;
    
    // Load as vector
    const settlementLayer = await getVectorLayers(
      layerStore,
      layerName,
      true
    );
  
    //  OVERRIDE STYLE USING STYLE FUNCTION (strongest override in OL)
    settlementLayer.setStyle((feature) => {
      const geom = feature.getGeometry();
      if (!geom) return null;
  
      // If the feature is a POINT → show icon
      if (geom.getType() === "Point") {
        return new Style({
          image: new Icon({
            src: SettlementIcon,
            scale: 1.08,
          }),
        });
      }
       return new Style({
            stroke: new Stroke({
            color: "#000",
            width: 1,
            }),
            fill: new Fill({
            color: "rgba(0,0,0,0)",
            }),
        });
    });
  
    mapRef.current.addLayer(settlementLayer);
  
    return settlementLayer;
  };
  
  const loadWell = async () => {
    if (!plan) return;
  
    const districtNameSafe = (districtName || "").toLowerCase().replace(/\s+/g, "_");
    const blockNameSafe = (blockName || "").toLowerCase().replace(/\s+/g, "_");
  
    // Correct layer name formation (same as GeoServer)
    const layerStore = "resources";
    const layerName = `well_${plan.id}_${districtNameSafe}_${blockNameSafe}`;
    
    // Load as VECTOR
    const wellLayer = await getVectorLayers(
      layerStore,
      layerName,
      true
    );
  
    //  OVERRIDE STYLE COMPLETELY (same trick as settlement)
    wellLayer.setStyle((feature) => {
      const geom = feature.getGeometry();
      if (!geom) return null;
  
      if (geom.getType() === "Point") {
        return new Style({
          image: new Icon({
            src: WellIcon,  // your well icon
            scale: 1.08,
          }),
        });
      }
  
      // fallback for polygons (usually not needed)
      return new Style({
        stroke: new Stroke({ color: "#000", width: 1 }),
        fill: new Fill({ color: "rgba(0,0,0,0)" }),
      });
    });
  
    mapRef.current.addLayer(wellLayer);
  
    return wellLayer;
  };

  const loadWaterStructure = async () => {
    if (!plan) return;

    const districtNameSafe = (districtName || "").toLowerCase().replace(/\s+/g, "_");
    const blockNameSafe = (blockName || "").toLowerCase().replace(/\s+/g, "_");

    // Construct layer name exactly like GeoServer convention
    const layerStore = "resources";
    const layerName = `waterbody_${plan.id}_${districtNameSafe}_${blockNameSafe}`;


    // Load as VECTOR (same as settlement + well)
    const waterLayer = await getVectorLayers(
        layerStore,
        layerName,
        true
    );

    // Apply icon (strong override)
    waterLayer.setStyle((feature) => {
        const geom = feature.getGeometry();
        if (!geom) return null;

        if (geom.getType() === "Point") {
        return new Style({
            image: new Icon({
            src: WaterStructureIcon,
            scale: 1.08,
            }),
        });
        }

        return new Style({
        stroke: new Stroke({ color: "#000", width: 1 }),
        fill: new Fill({ color: "rgba(0,0,0,0)" }),
        });
    });

    mapRef.current.addLayer(waterLayer);
    return waterLayer;
    };

    
  const loadRechargeStructure = async () => {
      if (!plan) return;
    
      // Normalize names
      const districtNameSafe = (districtName || "")
        .toLowerCase()
        .replace(/\s+/g, "_");
    
      const blockNameSafe = (blockName || "")
        .toLowerCase()
        .replace(/\s+/g, "_");
    
      // Workspace + layer name
      const layerStore = "works";
      const layerName = `plan_gw_${plan.id}_${districtNameSafe}_${blockNameSafe}`;
        
      // Load vector layer
      const rechargeLayer = await getVectorLayers(
        layerStore,
        layerName,
        true, // visible
        true
      );
    
      // Apply custom icon (for point features)
      rechargeLayer.setStyle((feature) => {
        const geom = feature.getGeometry();
        if (!geom) return null;
    
        if (geom.getType() === "Point") {
          return new Style({
            image: new Icon({
              src: RechargeIcon,
              scale: 1.09,
            }),
          });
        }
    
        // fallback style for polygons/lines (if any)
        return new Style({
          stroke: new Stroke({ color: "#000", width: 1 }),
          fill: new Fill({ color: "rgba(0,0,0,0)" }),
        });
      });
    
      // Add to map
      mapRef.current.addLayer(rechargeLayer);
    
      return rechargeLayer;
    };


const loadIrrigationStructure = async () => {
  if (!plan) return;

  // Normalize text
  const districtNameSafe = (districtName || "")
    .toLowerCase()
    .replace(/\s+/g, "_");

  const blockNameSafe = (blockName || "")
    .toLowerCase()
    .replace(/\s+/g, "_");

  // Workspace + layer naming
  const layerStore = "works";
  const layerName = `plan_agri_${plan.id}_${districtNameSafe}_${blockNameSafe}`;

  // Load vector layer
  const irrigationLayer = await getVectorLayers(
    layerStore,
    layerName,
    true, // visible
    true  // active
  );

  // Style with custom icon (applies only to points)
  irrigationLayer.setStyle((feature) => {
    const geom = feature.getGeometry();
    if (!geom) return null;

    if (geom.getType() === "Point") {
      return new Style({
        image: new Icon({
          src: IrrigationIcon,
          scale: 1.1,
        }),
      });
    }

    // fallback polygon/line style (if any)
    return new Style({
      stroke: new Stroke({
        color: "#000",
        width: 1.2,
      }),
      fill: new Fill({
        color: "rgba(0,0,0,0)",
      }),
    });
  });

  // Add to map
  mapRef.current.addLayer(irrigationLayer);

  return irrigationLayer;
};


const loadLivelihood = async () => {
  if (!plan) return;

  // Normalize text (district & block)
  const districtNameSafe = (districtName || "")
    .toLowerCase()
    .replace(/\s+/g, "_");

  const blockNameSafe = (blockName || "")
    .toLowerCase()
    .replace(/\s+/g, "_");

  // Workspace + Layer Name
  const layerStore = "works";
  const layerName = `plan_lh_${plan.id}_${districtNameSafe}_${blockNameSafe}`;

  // Load vector layer (WFS)
  const livelihoodLayer = await getVectorLayers(
    layerStore,
    layerName,
    true, // visible
    true  // active
  );

  // Style the layer (Points → icon, others → transparent)
  livelihoodLayer.setStyle((feature) => {
    const geom = feature.getGeometry();
    if (!geom) return null;

    if (geom.getType() === "Point") {
      return new Style({
        image: new Icon({
          src: LivelihoodIcon,
          scale: 1.1,
        }),
      });
    }

    // fallback styling for polygon/line features
    return new Style({
      stroke: new Stroke({
        color: "#000",
        width: 1.2,
      }),
      fill: new Fill({
        color: "rgba(0,0,0,0)",
      }),
    });
  });

  // Add to map
  mapRef.current.addLayer(livelihoodLayer);

  return livelihoodLayer;
};


    

  
  
  
  
  
  


  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[2000]">
      <div className="bg-white w-[1000px] h-[800px] rounded-xl shadow-xl p-6 relative">

        {/* Close Button */}
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-xl"
          onClick={onClose}
        >
          ✕
        </button>

        {/* Heading */}
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          {plan?.plan} 
        </h2>

        {/* MAP CONTAINER */}
        <div className="relative">
        <div
          ref={mapElement}
          className="w-full h-[700px] rounded-lg border border-gray-300 shadow-inner"
        />
                        {/* ZOOM CONTROLS */}
      <div className="absolute top-10 right-4 flex flex-col gap-1 z-[1100]">
        {["+", "–"].map((sign) => (
          <button
            key={sign}
            className="bg-white border border-gray-300 rounded-md w-10 h-10 text-xl 
                     cursor-pointer hover:bg-gray-100 active:scale-95 transition"
            onClick={() => {
              const map = mapRef.current;
              if (!map) return;
              const view = map.getView();
              const delta = sign === "+" ? 1 : -1;

              view.animate({
                zoom: view.getZoom() + delta,
                duration: 300,
              });
            }}
          >
            {sign}
          </button>
        ))}
      </div>
      </div>

      </div>
    </div>
  );
};

export default PlanViewDialog;
