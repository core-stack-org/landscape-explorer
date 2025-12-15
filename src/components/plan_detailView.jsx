import React, {  useMemo } from "react";
import { useLocation } from "react-router";
import { useRecoilValue } from "recoil";

import {
  districtLookupAtom,
  blockLookupAtom,
} from "../store/locationStore";

import getVectorLayers from "../actions/getVectorLayers";
import getImageLayer from "../actions/getImageLayers";
import SettlementIcon from "../assets/settlement_icon.svg";
import WellIcon from "../assets/well_proposed.svg";
import WaterStructureIcon from "../assets/waterbodies_proposed.svg";
import RechargeIcon from "../assets/recharge_icon.svg";
import IrrigationIcon from "../assets/irrigation_icon.svg";
import LivelihoodIcon from "../assets/livelihood_proposed.svg";

import MapSection from "./planMapSection";

import { Fill, Stroke, Style, Icon } from "ol/style";

const PlanViewPage = () => {
  const { state } = useLocation();
  const plan = state?.plan;
  console.log(plan)

  const districtLookup = useRecoilValue(districtLookupAtom);
  const blockLookup = useRecoilValue(blockLookupAtom);

  const districtName = useMemo(
    () => districtLookup[plan?.district] || plan?.district,
    [plan, districtLookup]
  );

  const blockName = useMemo(
    () => blockLookup[plan?.block] || plan?.block,
    [plan, blockLookup]
  );

  if (!plan) return <div className="p-10">No plan data found</div>;

  // Normalize names
  const districtNameSafe = (districtName || "").toLowerCase().replace(/\s+/g, "_");
  const blockNameSafe = (blockName || "").toLowerCase().replace(/\s+/g, "_");

  const loadNothing = async () => {};


  const loadLULC = async(map,districtNameSafe,blockNameSafe)=>{
    const lulcLayer = await getImageLayer(
      "LULC_level_3",
      `LULC_24_25_${districtNameSafe}_${blockNameSafe}_level_3`,
      true ,
      "lulc_level_3_style"
    );
  
    lulcLayer.set("layerName", "lulcLayer");
  
    map.addLayer(lulcLayer);
  }

  const loadAdminBoundary = async (map, districtNameSafe, blockNameSafe) => {
    await loadLULC(map, districtNameSafe, blockNameSafe);
  
    const layer = await getVectorLayers(
      "panchayat_boundaries",
      `${districtNameSafe}_${blockNameSafe}`,
      true
    );
  
    layer.setStyle(
      new Style({
        stroke: new Stroke({ color: "#000", width: 2 }),
        fill: new Fill({ color: "rgba(0,0,0,0)" }),
      })
    );
  
    map.addLayer(layer);
  
    layer.getSource().once("change", () => {
      if (layer.getSource().getState() === "ready") {
        const view = map.getView();
        const extent = layer.getSource().getExtent();
  
        view.fit(extent, {
          padding: [30, 30, 30, 30],
          duration: 400,
        });
  
        // optional extra zoom
        setTimeout(() => {
          view.animate({ zoom: view.getZoom() + 1, duration: 300 });
        }, 450);
      }
    });
  };
  
  const loadBoundary = async (map, districtNameSafe, blockNameSafe) => {
    const layer = await getVectorLayers(
      "panchayat_boundaries",
      `${districtNameSafe}_${blockNameSafe}`,
      true
    );
  
    layer.setStyle(
      new Style({
        stroke: new Stroke({ color: "#000", width: 2 }),
        fill: new Fill({ color: "rgba(0,0,0,0)" }),
      })
    );
  
    map.addLayer(layer);
  
    layer.getSource().on("change", () => {
      if (layer.getSource().getState() === "ready") {
        const extent = layer.getSource().getExtent();
        map.getView().fit(extent, {
          padding: [30, 30, 30, 30],
          duration: 400,
        });
      }
    });
  };

  const loadMWS = async (map,districtNameSafe,blockNameSafe)=>{
    const layer = await getVectorLayers("mws_layers",`deltaG_well_depth_${districtNameSafe}_${blockNameSafe}`,true);
    layer.setStyle(
      new Style({
        stroke: new Stroke({ color: "#000", width: 2 }),
        fill: new Fill({ color: "rgba(0,0,0,0)" }),
      })
    );
  
    map.addLayer(layer);
  }
  
  const loadSettlement = async (map) => {
    await loadMWS(map, districtNameSafe, blockNameSafe);
  
    const layer = await getVectorLayers(
      "resources",
      `settlement_${plan.id}_${districtNameSafe}_${blockNameSafe}`,
      true
    );
  
    layer.setStyle((feature) => {
      if (feature.getGeometry()?.getType() === "Point") {
        return new Style({
          image: new Icon({ src: SettlementIcon, scale: 1.1 }),
        });
      }
      return new Style();
    });
  
    map.addLayer(layer);
  
    layer.getSource().once("change", () => {
      if (layer.getSource().getState() !== "ready") return;
  
      const extent = layer.getSource().getExtent();
      if (!extent || extent.some(isNaN)) return;
  
      const view = map.getView();
  
      view.fit(extent, {
        padding: [80, 80, 80, 80],
        duration: 600,
        maxZoom: 15,   
      });
  
    });
  };
  
  const loadStreamOrderRaster = async (map, districtNameSafe, blockNameSafe) => {
    const streamOrderLayer = await getImageLayer(
      "stream_order",
      `stream_order_${districtNameSafe}_${blockNameSafe}_raster`,
      true,
      "stream_order"
    );
      streamOrderLayer.set("layerName", "streamOrderLayer");
      streamOrderLayer.setOpacity(0.5)
      map.addLayer(streamOrderLayer);
  };
  
  const loadWell = async (map) => {
    await loadStreamOrderRaster(map, districtNameSafe, blockNameSafe);
    const layer = await getVectorLayers(
      "resources",
      `well_${plan.id}_${districtNameSafe}_${blockNameSafe}`,
      true
    );

    layer.setStyle((feature) => {
      if (feature.getGeometry()?.getType() === "Point") {
        return new Style({ image: new Icon({ src: WellIcon, scale: 1.1 }) });
      }
      return new Style();
    });

    map.addLayer(layer);
    layer.getSource().once("change", () => {
      if (layer.getSource().getState() !== "ready") return;
    
      let extent = layer.getSource().getExtent();
      if (!extent || extent.some(isNaN)) return;
    
      // 🔥 REQUIRED for wells
      const buffer = 0.005; // ~500m
      extent = [
        extent[0] - buffer,
        extent[1] - buffer,
        extent[2] + buffer,
        extent[3] + buffer,
      ];
    
      const view = map.getView();
      view.fit(extent, {
        padding: [80, 80, 80, 80],
        duration: 600,
        maxZoom: 15,
      });
    });
    
  };

  const loadClart = async(map,districtNameSafe,blockNameSafe)=>{
    const claryLayer = await getImageLayer(
      "clart",
      `${districtNameSafe}_${blockNameSafe}_clart`,
      true,
      "	testClart"
    );
      claryLayer.set("layerName", "clartLayer");
      claryLayer.setOpacity(0.5);
      map.addLayer(claryLayer);
  }

  const loadWaterStructure = async (map) => {
    await loadClart(map, districtNameSafe, blockNameSafe);
    const layer = await getVectorLayers(
      "resources",
      `waterbody_${plan.id}_${districtNameSafe}_${blockNameSafe}`,
      true
    );

    layer.setStyle((feature) => {
      if (feature.getGeometry()?.getType() === "Point") {
        return new Style({
          image: new Icon({ src: WaterStructureIcon, scale: 1.1 }),
        });
      }
      return new Style();
    });

    map.addLayer(layer);
    layer.getSource().once("change", () => {
      if (layer.getSource().getState() !== "ready") return;
    
      let extent = layer.getSource().getExtent();
      if (!extent || extent.some(isNaN)) return;
    
      const buffer = 0.005; // ~500m
      extent = [
        extent[0] - buffer,
        extent[1] - buffer,
        extent[2] + buffer,
        extent[3] + buffer,
      ];
    
      const view = map.getView();
      view.fit(extent, {
        padding: [80, 80, 80, 80],
        duration: 600,
        maxZoom: 15,
      });
    });
  };

  const loadTerrain = async (map,districtNameSafe,blockNameSafe)=>{
    const terrainLayer = await getImageLayer(
      "terrain",
      `${districtNameSafe}_${blockNameSafe}_terrain_raster`,
      true ,
      "Terrain_Style_11_Classes"
    );
  
    terrainLayer.set("layerName", "terrainLayer");
    terrainLayer.setOpacity(0.5);
    map.addLayer(terrainLayer);
  }

  const loadRechargeAndIrrigation = async (map) => {
    await loadTerrain(map,districtNameSafe,blockNameSafe)
    const rechargeLayer = await getVectorLayers(
      "works",
      `plan_gw_${plan.id}_${districtNameSafe}_${blockNameSafe}`,
      true
    );
  
    rechargeLayer.set("layerName", "rechargeLayer");
  
    rechargeLayer.setStyle((feature) => {
      if (feature.getGeometry()?.getType() === "Point") {
        return new Style({
          image: new Icon({
            src: RechargeIcon,
            scale: 1.1,
          }),
        });
      }
      return null;
    });
  
    map.addLayer(rechargeLayer);
  
    // 🔹 Irrigation structures
    const irrigationLayer = await getVectorLayers(
      "works",
      `plan_agri_${plan.id}_${districtNameSafe}_${blockNameSafe}`,
      true
    );
  
    irrigationLayer.set("layerName", "irrigationLayer");
  
    irrigationLayer.setStyle((feature) => {
      if (feature.getGeometry()?.getType() === "Point") {
        return new Style({
          image: new Icon({
            src: IrrigationIcon,
            scale: 1.1,
          }),
        });
      }
      return null;
    });
  
    map.addLayer(irrigationLayer);
  
    // 🔹 Optional: zoom to combined extent
    const fitToCombinedExtent = () => {
      const sources = [
        rechargeLayer.getSource(),
        irrigationLayer.getSource(),
      ];
  
      const extents = sources
        .map((s) => s?.getExtent())
        .filter((e) => e && !e.some(isNaN));
  
      if (extents.length === 0) return;
  
      let combinedExtent = extents[0];
      for (let i = 1; i < extents.length; i++) {
        combinedExtent = [
          Math.min(combinedExtent[0], extents[i][0]),
          Math.min(combinedExtent[1], extents[i][1]),
          Math.max(combinedExtent[2], extents[i][2]),
          Math.max(combinedExtent[3], extents[i][3]),
        ];
      }
  
      map.getView().fit(combinedExtent, {
        padding: [60, 60, 60, 60],
        duration: 600,
        maxZoom: 18,
      });
    };
  
    // wait for both layers
    let readyCount = 0;
    const onReady = () => {
      readyCount += 1;
      if (readyCount === 2) fitToCombinedExtent();
    };
  
    rechargeLayer.getSource().once("change", onReady);
    irrigationLayer.getSource().once("change", onReady);
  };
  

  const loadLivelihood = async (map) => {
    const layer = await getVectorLayers(
      "works",
      `plan_lh_${plan.id}_${districtNameSafe}_${blockNameSafe}`,
      true
    );

    layer.setStyle((feature) => {
      if (feature.getGeometry()?.getType() === "Point") {
        return new Style({ image: new Icon({ src: LivelihoodIcon, scale: 1.1 }) });
      }
      return new Style();
    });

    map.addLayer(layer);
  };


  return (
    <div className="w-full h-full bg-white p-8">

      {/* HEADER */}
      <div className="w-full bg-[#2e4a62] text-white rounded-md py-6 mb-10 shadow">
        <h1 className="text-2xl font-bold text-center">
          Resource & Demand Map Report
        </h1>

        <div className="mt-3 text-center">
          <p className="text-lg font-medium">
            Plan Name: <span className="font-semibold">{plan.plan}</span>
          </p>

          <p className="text-lg font-medium">
            Plan ID: <span className="font-semibold">{plan.id}</span>
          </p>
        </div>
      </div>

      {/* MAP SECTIONS */}

      <MapSection
  title="Admin Boundary"
  loadLayer={loadAdminBoundary}
  loadBoundary={loadAdminBoundary}
  districtNameSafe={districtNameSafe}
  blockNameSafe={blockNameSafe}
  plan={plan}
/>

<MapSection
  title="Settlement Overview"
  loadLayer={loadSettlement}
  loadBoundary={loadNothing}
  districtNameSafe={districtNameSafe}
  blockNameSafe={blockNameSafe}
  plan={plan}
/>

<MapSection
  title="Well Structure Overview"
  loadLayer={loadWell}
  loadBoundary={loadNothing}
  districtNameSafe={districtNameSafe}
  blockNameSafe={blockNameSafe}
  plan={plan}
/>

<MapSection
  title="Water Structures Overview"
  loadLayer={loadWaterStructure}
  loadBoundary={loadNothing}
  districtNameSafe={districtNameSafe}
  blockNameSafe={blockNameSafe}
  plan={plan}
/>

<MapSection
  title="Recharge & Irrigation Structures"
  loadLayer={loadRechargeAndIrrigation}
  loadBoundary={loadNothing}
  districtNameSafe={districtNameSafe}
  blockNameSafe={blockNameSafe}
  plan={plan}
/>



<MapSection
  title="Livelihood Structure Overview"
  loadLayer={loadLivelihood}
  loadBoundary={loadBoundary}
  districtNameSafe={districtNameSafe}
  blockNameSafe={blockNameSafe}
  plan={plan}
/>




    </div>
  );
};

export default PlanViewPage;
