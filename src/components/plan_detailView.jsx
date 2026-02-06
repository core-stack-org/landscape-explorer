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
  const districtLookup = useRecoilValue(districtLookupAtom);
  const blockLookup = useRecoilValue(blockLookupAtom);

  const districtName = useMemo(
    () => districtLookup[plan?.district_soi] || plan?.district_soi,
    [plan, districtLookup]
  );

  const blockName = useMemo(
    () => blockLookup[plan?.tehsil_soi] || plan?.tehsil_soi,
    [plan, blockLookup]
  );

  if (!plan) return <div className="p-10">No plan data found</div>;

  const districtNameSafe = (districtName || "").toLowerCase().replace(/\s+/g, "_");
  const blockNameSafe = (blockName || "").toLowerCase().replace(/\s+/g, "_");

  const loadNothing = async () => {};

  const zoomToLayerWithFallback = (
    map,
    primaryLayer,
    fallbackLayer,
    options = {}
  ) => {
    const view = map.getView();
    let zoomed = false;
  
    const fitExtent = (extent, buffer) => {
      if (!extent || extent.some(isNaN) || zoomed) return;
  
      view.fit(
        [
          extent[0] - buffer,
          extent[1] - buffer,
          extent[2] + buffer,
          extent[3] + buffer,
        ],
        {
          padding: options.padding || [30, 30, 30, 30],
          maxZoom: options.maxZoom || 20,
          duration: 300,
        }
      );
  
      zoomed = true;
    };
  
    /* 1️⃣ PRIMARY → WELL VECTOR */
    const primarySource = primaryLayer.getSource();
  
    const tryPrimary = () => {
      if (primarySource.getFeatures().length > 0) {
        fitExtent(
          primarySource.getExtent(),
          options.primaryBuffer ?? 0.0012
        );
      }
    };
  
    //  THIS IS THE KEY FIX
    primarySource.on("addfeature", tryPrimary);
  
    // safety retry (in case features load instantly)
    setTimeout(tryPrimary, 300);
  
    /* 2️FALLBACK → STREAM ORDER RASTER */
    if (!fallbackLayer) return;
  
    const rasterSource = fallbackLayer.getSource();
    rasterSource.on("imageloadend", () => {
      if (zoomed) return;
  
      const extent = rasterSource.getImageExtent();
      fitExtent(extent, options.fallbackBuffer ?? 0.0035);
    });
  };
  
  

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
    console.group("🧱 loadAdminBoundary CALLED");
    console.log("District (safe):", districtNameSafe);
    console.log("Block (safe):", blockNameSafe);
    console.log(
      "Workspace:",
      "panchayat_boundaries"
    );
    console.log(
      "Layer key:",
      `${districtNameSafe}_${blockNameSafe}`
    );
    console.log("Map instance:", map);
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
  
  const loadMWS = async (map, districtNameSafe, blockNameSafe) => {
    const mwsLayer = await getVectorLayers(
      "mws_layers",
      `deltaG_well_depth_${districtNameSafe}_${blockNameSafe}`,
      true
    );
  
    mwsLayer.setStyle(
      new Style({
        stroke: new Stroke({ color: "#000", width: 2 }),
        fill: new Fill({ color: "rgba(0,0,0,0)" }),
      })
    );
  
    map.addLayer(mwsLayer);
    return mwsLayer;
  };
  
  const loadSettlement = async (map) => {
    const mwsLayer = await loadMWS(map, districtNameSafe, blockNameSafe);
  
    // Load Settlement (priority)
    const settlementLayer = await getVectorLayers(
      "resources",
      `settlement_${plan.id}_${districtNameSafe}_${blockNameSafe}`,
      true
    );
  
    settlementLayer.setStyle((feature) => {
      if (feature.getGeometry()?.getType() === "Point") {
        return new Style({
          image: new Icon({ src: SettlementIcon, scale: 1.1 }),
        });
      }
      return null;
    });
  
    map.addLayer(settlementLayer);
      zoomToLayerWithFallback(map, settlementLayer, mwsLayer, {
      maxZoom: 18,
      primaryBuffer: 0.001,
      fallbackBuffer: 0.003,
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
      return streamOrderLayer;
  };
  
  const loadWell = async (map) => {
    const mwsLayer = await loadMWS(map, districtNameSafe, blockNameSafe);

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
    zoomToLayerWithFallback(map, layer, mwsLayer, {
      maxZoom: 18,
      primaryBuffer: 0.001,
      fallbackBuffer: 0.003,
    });    
  };

  const loadClart = async(map,districtNameSafe,blockNameSafe)=>{
    const claryLayer = await getImageLayer(
      "clart",
      `${districtNameSafe}_${blockNameSafe}_clart`,
      true,
      "testClart"
    );
      claryLayer.set("layerName", "clartLayer");
      claryLayer.setOpacity(0.5);
      map.addLayer(claryLayer);
  }

  const loadWaterStructure = async (map) => {
    // await loadClart(map, districtNameSafe, blockNameSafe);
    const mwsLayer = await loadMWS(map, districtNameSafe, blockNameSafe);

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
    zoomToLayerWithFallback(map, layer, mwsLayer, {
      maxZoom: 18,
      primaryBuffer: 0.001,
      fallbackBuffer: 0.003,
    });  };

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

  const zoomToCombinedOrFallback = (
    map,
    primaryLayers = [],
    fallbackLayer,
    options = {}
  ) => {
    const view = map.getView();
    let zoomed = false;
  
    const fit = (extent, buffer = 0) => {
      if (!extent || extent.some(isNaN) || zoomed) return;
  
      view.fit(
        [
          extent[0] - buffer,
          extent[1] - buffer,
          extent[2] + buffer,
          extent[3] + buffer,
        ],
        {
          padding: options.padding || [50, 50, 50, 50],
          maxZoom: options.maxZoom || 18,
          duration: 400,
        }
      );
  
      zoomed = true;
    };
  
    const getCombinedExtent = () => {
      const validSources = primaryLayers
        .map((l) => l.getSource())
        .filter((s) => s.getFeatures().length > 0); // KEY FIX
  
      if (validSources.length === 0) return null;
  
      return validSources
        .map((s) => s.getExtent())
        .reduce((acc, curr) => [
          Math.min(acc[0], curr[0]),
          Math.min(acc[1], curr[1]),
          Math.max(acc[2], curr[2]),
          Math.max(acc[3], curr[3]),
        ]);
    };
  
    const tryZoom = () => {
      // PRIMARY: recharge / irrigation
      const hasFeatures = primaryLayers.some(
        (l) => l.getSource().getFeatures().length > 0
      );
  
      if (hasFeatures) {
        const combinedExtent = getCombinedExtent();
        if (combinedExtent) {
          fit(combinedExtent, options.primaryBuffer ?? 0.0015);
        }
        return;
      }
  
      //  FALLBACK: MWS
      if (
        fallbackLayer &&
        fallbackLayer.getSource().getState() === "ready" &&
        fallbackLayer.getSource().getFeatures().length > 0
      ) {
        fit(
          fallbackLayer.getSource().getExtent(),
          options.fallbackBuffer ?? 0.003
        );
      }
    };
  
    //  Listen to primary layers
    primaryLayers.forEach((layer) => {
      const source = layer.getSource();
      source.on("addfeature", tryZoom);
      source.on("change", () => {
        if (source.getState() === "ready") tryZoom();
      });
    });
  
    //  Listen to fallback
    if (fallbackLayer) {
      fallbackLayer.getSource().on("change", () => {
        if (!zoomed && fallbackLayer.getSource().getState() === "ready") {
          tryZoom();
        }
      });
    }
  
    // Safety
    setTimeout(tryZoom, 300);
  };
  
  

  const loadRechargeAndIrrigation = async (map) => {
    // 1️ MWS = fallback boundary
    const mwsLayer = await loadMWS(map, districtNameSafe, blockNameSafe);
  
    // 2 Recharge
    const rechargeLayer = await getVectorLayers(
      "works",
      `plan_gw_${plan.id}_${districtNameSafe}_${blockNameSafe}`,
      true
    );
  
    rechargeLayer.setStyle((feature) => {
      if (feature.getGeometry()?.getType() === "Point") {
        return new Style({
          image: new Icon({ src: RechargeIcon, scale: 1.1 }),
        });
      }
      return null;
    });
  
    map.addLayer(rechargeLayer);
  
    // 3️Irrigation
    const irrigationLayer = await getVectorLayers(
      "works",
      `plan_agri_${plan.id}_${districtNameSafe}_${blockNameSafe}`,
      true
    );
  
    irrigationLayer.setStyle((feature) => {
      if (feature.getGeometry()?.getType() === "Point") {
        return new Style({
          image: new Icon({ src: IrrigationIcon, scale: 1.1 }),
        });
      }
      return null;
    });
  
    map.addLayer(irrigationLayer);
  
    // 4️ ZOOM (primary → fallback)
    zoomToCombinedOrFallback(
      map,
      [rechargeLayer, irrigationLayer], // primary
      mwsLayer,                         // fallback
      {
        maxZoom: 18,
        primaryBuffer: 0.001,
        fallbackBuffer: 0.003,
      }
    );
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
          {/* <p><span>District:{plan.district}</span><span>Tehsil:{plan.block}</span></p> */}
        </div>
      </div>

      {/* MAP SECTIONS */}
{/*Base Map + Panchayat/Admin Boundary + LULC (Latest year) */}
      <MapSection
        title="Admin Boundary"
        loadLayer={loadAdminBoundary}
        loadBoundary={loadAdminBoundary}
        districtNameSafe={districtNameSafe}
        blockNameSafe={blockNameSafe}
        plan={plan}
      />
      <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 20 ,justifyContent:"center"}}>
        <div style={{ display: "flex", alignItems: "center", gap: 8  ,fontWeight:"bold"}}>
          LULC Legends:
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 14, height: 14, background: "#A9A9A9", display: "inline-block" }} />
          Barren Lands
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 14, height: 14, background: "#c6e46d", display: "inline-block" }} />
          Single Kharif
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 14, height: 14, background: "#eee05d", display: "inline-block" }} />
          Single Non-Kharif
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 14, height: 14, background: "#f9b249", display: "inline-block" }} />
          Double Cropping
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 14, height: 14, background: "#fb5139", display: "inline-block" }} />
          Triple / Annual / Perennial Cropping
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 14, height: 14, background: "#4c4ef5", display: "inline-block" }} />
          Shrubs and Scrubs
        </div>
      </div>
      <br/>

{/*Base Map + MWS Layer (deltaGWell Depth only boundary) + Settlement layer */}

      <MapSection
        title="Settlement Overview"
        loadLayer={loadSettlement}
        loadBoundary={loadNothing}
        districtNameSafe={districtNameSafe}
        blockNameSafe={blockNameSafe}
        plan={plan}
      />



      {/* Base Map + Streamorder raster + Well layer */}

      <MapSection
        title="Well Structure Overview"
        loadLayer={loadWell}
        loadBoundary={loadStreamOrderRaster}
        districtNameSafe={districtNameSafe}
        blockNameSafe={blockNameSafe}
        plan={plan}
      />

<div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 20,justifyContent:"center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8  ,fontWeight:"bold"}}>
        Well Demands on Stream Order Raster
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 14, height: 14, background: "#f7fbff", display: "inline-block" }} />
          1
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 14, height: 14, background: "#e4eff9", display: "inline-block" }} />
          2
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 14, height: 14, background: "#d1e2f3", display: "inline-block" }} />
          3
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 14, height: 14, background: "#bad6eb", display: "inline-block" }} />
          4
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 14, height: 14, background: "#9ac8e0", display: "inline-block" }} />
         5
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 14, height: 14, background: "#73b2d8", display: "inline-block" }} />
          6
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 14, height: 14, background: "#529dcc", display: "inline-block" }} />
          7
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 14, height: 14, background: "#3585bf", display: "inline-block" }} />
          8
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 14, height: 14, background: "#1d6cb1", display: "inline-block" }} />
          9
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 14, height: 14, background: "#08519c", display: "inline-block" }} />
          10
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 14, height: 14, background: "#08306b", display: "inline-block" }} />
          11
        </div>
      </div>
      <br/>


{/* Base Map + CLART + Waterstructure */}
      <MapSection
        title="Water Structures Overview"
        loadLayer={loadWaterStructure}
        loadBoundary={loadClart}
        districtNameSafe={districtNameSafe}
        blockNameSafe={blockNameSafe}
        plan={plan}
      />

    <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 20 ,justifyContent:"center"}}>
        <div style={{ display: "flex", alignItems: "center", gap: 8  ,fontWeight:"bold"}}>
        Water Structures Overview 
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 14, height: 14, background: "#4ade80", display: "inline-block" }} />
          Good Recharge
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 14, height: 14, background: "#fde047", display: "inline-block" }} />
          Moderate Recharge
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 14, height: 14, background: "#be185d", display: "inline-block" }} />
         Regeneration
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 14, height: 14, background: "#3b82f6", display: "inline-block" }} />
          High runoff zone
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 14, height: 14, background: "#dc2626", display: "inline-block" }} />
          Surface water harvesting
        </div>
      </div>
      <br/>

{/*Base Map + Terrain + Irrigation Structure + Recharge Structure */}
      <MapSection
        title="Recharge & Irrigation Structures"
        loadLayer={loadRechargeAndIrrigation}
        loadBoundary={loadTerrain}
        districtNameSafe={districtNameSafe}
        blockNameSafe={blockNameSafe}
        plan={plan}
      />

      <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 20 ,justifyContent:"center"}}>
        <div style={{ display: "flex", alignItems: "center", gap: 8  ,fontWeight:"bold"}}>
        Recharge and Irrigation Structures Overview 
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 14, height: 14, background: "#313695", display: "inline-block" }} />
          V-shape river valleys, Deep narrow canyons
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 14, height: 14, background: "#4575b4", display: "inline-block" }} />
          Lateral midslope incised drainages, Local valleys in plains
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 14, height: 14, background: "#a50026", display: "inline-block" }} />
          Upland incised drainages, Stream headwaters
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 14, height: 14, background: "#e0f3f8", display: "inline-block" }} />
          U-shape valleys
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 14, height: 14, background: "#fffc00", display: "inline-block" }} />
          Broad Flat Areas
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 14, height: 14, background: "#feb24c", display: "inline-block" }} />
          Broad open slopes
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 14, height: 14, background: "#f46d43", display: "inline-block" }} />
          Mesa tops
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 14, height: 14, background: "#d73027", display: "inline-block" }} />
          Upper Slopes
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 14, height: 14, background: "#91bfdb", display: "inline-block" }} />
          Local ridge/hilltops within broad valleys
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 14, height: 14, background: "#800000", display: "inline-block" }} />
          Lateral midslope drainage divides, Local ridges in plains
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 14, height: 14, background: "#4d0000", display: "inline-block" }} />
          Mountain tops, high ridges
        </div>
      </div>
      <br/>

{/* Livelihood */}

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
