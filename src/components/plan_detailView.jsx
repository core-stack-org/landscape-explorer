import React, { useMemo, useState, useEffect } from "react";
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

  const [summary, setSummary] = useState(null);
  const [teamDetails, setTeamDetails] = useState(null);
  const [villageBrief, setVillageBrief] = useState(null);

  const [settlements, setSettlements] = useState([]);
  const [crops, setCrops] = useState([]);
  const [livestock, setLivestock] = useState([]);

  

  const [wells, setWells] = useState([]);

  const [waterbodies, setWaterbodies] = useState([]);

  const [nrmWorks, setNrmWorks] = useState([]);
 
  const [maintenanceGW, setMaintenanceGW] = useState([]);
const [maintenanceAgri, setMaintenanceAgri] = useState([]);
const [maintenanceSWB, setMaintenanceSWB] = useState([]);
const [maintenanceSWBRS, setMaintenanceSWBRS] = useState([]);

  const [livelihoodData, setLivelihoodData] = useState([]);

  
  

  const districtName = useMemo(
    () => districtLookup[plan?.district_soi] || plan?.district_soi,
    [plan, districtLookup]
  );

  const blockName = useMemo(
    () => blockLookup[plan?.tehsil_soi] || plan?.tehsil_soi,
    [plan, blockLookup]
  );

// ✅ ADD HERE 👇
useEffect(() => {
  if (!plan?.id) return;

  const fetchData = async () => {
    try {
      const [summaryRes, teamRes, villageRes] = await Promise.all([
        fetch(`${process.env.REACT_APP_API_URL}/dpr_data/${plan.id}/summary/`, {
          headers: { "X-API-Key": process.env.REACT_APP_API_KEY },
        }),
        fetch(`${process.env.REACT_APP_API_URL}/dpr_data/${plan.id}/team-details/`, {
          headers: { "X-API-Key": process.env.REACT_APP_API_KEY },
        }),
        fetch(`${process.env.REACT_APP_API_URL}/dpr_data/${plan.id}/village-brief/`, {
          headers: { "X-API-Key": process.env.REACT_APP_API_KEY },
        }),
      ]);

      const summaryData = await summaryRes.json();
      const teamData = await teamRes.json();
      const villageData = await villageRes.json();

      console.log("Summary:", summaryData);
      console.log("Team:", teamData);
      console.log("Village:", villageData);

      setSummary(summaryData);
      setTeamDetails(teamData);
      setVillageBrief(villageData);



      const [gwRes, agriRes, swbRes, swbRsRes] = await Promise.all([
  fetch(`${process.env.REACT_APP_API_URL}/dpr_data/${plan.id}/maintenance/?type=gw`, {
    headers: { "X-API-Key": process.env.REACT_APP_API_KEY },
  }),
  fetch(`${process.env.REACT_APP_API_URL}/dpr_data/${plan.id}/maintenance/?type=agri`, {
    headers: { "X-API-Key": process.env.REACT_APP_API_KEY },
  }),
  fetch(`${process.env.REACT_APP_API_URL}/dpr_data/${plan.id}/maintenance/?type=swb`, {
    headers: { "X-API-Key": process.env.REACT_APP_API_KEY },
  }),
  fetch(`${process.env.REACT_APP_API_URL}/dpr_data/${plan.id}/maintenance/?type=swb_rs`, {
    headers: { "X-API-Key": process.env.REACT_APP_API_KEY },
  }),
]);

const gwData = await gwRes.json();
const agriData = await agriRes.json();
const swbData = await swbRes.json();
const swbRsData = await swbRsRes.json();

console.log("GW Maintenance:", gwData);
console.log("Agri Maintenance:", agriData);
console.log("SWB Maintenance:", swbData);
console.log("SWB_RS Maintenance:", swbRsData);

// ✅ SAFE HANDLING
setMaintenanceGW(
  Array.isArray(gwData) ? gwData : gwData.results || gwData.data || []
);

setMaintenanceAgri(
  Array.isArray(agriData) ? agriData : agriData.results || agriData.data || []
);

setMaintenanceSWB(
  Array.isArray(swbData) ? swbData : swbData.results || swbData.data || []
);

setMaintenanceSWBRS(
  Array.isArray(swbRsData) ? swbRsData : swbRsData.results || swbRsData.data || []
);




const waterRes = await fetch(
  `${process.env.REACT_APP_API_URL}/dpr_data/${plan.id}/waterbodies/`,
  {
    headers: { "X-API-Key": process.env.REACT_APP_API_KEY },
  }
);

const waterData = await waterRes.json();

console.log("Waterbodies RAW:", waterData);

// ✅ SAFE HANDLING (important)
setWaterbodies(
  Array.isArray(waterData)
    ? waterData
    : waterData.results || waterData.data || []
);

const wellsRes = await fetch(
  `${process.env.REACT_APP_API_URL}/dpr_data/${plan.id}/wells/`,
  {
    headers: { "X-API-Key": process.env.REACT_APP_API_KEY },
  }
);

const wellsData = await wellsRes.json();

console.log("Wells RAW:", wellsData);

// ✅ SAFE HANDLING (same pattern)
setWells(
  Array.isArray(wellsData)
    ? wellsData
    : wellsData.results || wellsData.data || []
);
const [settlementRes, cropRes, livestockRes] = await Promise.all([
  fetch(`${process.env.REACT_APP_API_URL}/dpr_data/${plan.id}/settlements/`, {
    headers: { "X-API-Key": process.env.REACT_APP_API_KEY },
  }),
  fetch(`${process.env.REACT_APP_API_URL}/dpr_data/${plan.id}/crops/`, {
    headers: { "X-API-Key": process.env.REACT_APP_API_KEY },
  }),
  fetch(`${process.env.REACT_APP_API_URL}/dpr_data/${plan.id}/livestock/`, {
    headers: { "X-API-Key": process.env.REACT_APP_API_KEY },
  }),
]);

const settlementData = await settlementRes.json();
const cropData = await cropRes.json();
const livestockData = await livestockRes.json();

console.log("Settlements RAW:", settlementData);
console.log("Crops RAW:", cropData);
console.log("Livestock RAW:", livestockData);

// ✅ SAFE HANDLING
setSettlements(
  Array.isArray(settlementData)
    ? settlementData
    : settlementData.results || settlementData.data || []
);

setCrops(
  Array.isArray(cropData)
    ? cropData
    : cropData.results || cropData.data || []
);

setLivestock(
  Array.isArray(livestockData)
    ? livestockData
    : livestockData.results || livestockData.data || []
);


// ✅ NRM FETCH
const nrmRes = await fetch(
  `${process.env.REACT_APP_API_URL}/dpr_data/${plan.id}/nrm-works/`,
  {
    headers: { "X-API-Key": process.env.REACT_APP_API_KEY },
  }
);

const nrmData = await nrmRes.json();

console.log("NRM RAW:", nrmData);

// ✅ SAFE HANDLING
setNrmWorks(
  Array.isArray(nrmData)
    ? nrmData
    : nrmData.results || nrmData.data || []
);




 
  // ✅ LIVELIHOOD FETCH
const livelihoodRes = await fetch(
  `${process.env.REACT_APP_API_URL}/dpr_data/${plan.id}/livelihood/`,
  {
    headers: { "X-API-Key": process.env.REACT_APP_API_KEY },
  }
);

const livelihoodDataRes = await livelihoodRes.json();

console.log("Livelihood RAW:", livelihoodDataRes);

// ✅ SAFE HANDLING
setLivelihoodData(
  Array.isArray(livelihoodDataRes)
    ? livelihoodDataRes
    : livelihoodDataRes.results || livelihoodDataRes.data || []
);





    } catch (err) {
      console.error("API ERROR:", err);
    }
  };

  fetchData();
}, [plan]);

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

      {summary && (
  <div className="bg-white p-5 rounded shadow mt-6">
    <h2 className="text-xl font-bold mb-3">Summary</h2>

    <div className="overflow-x-auto">
      <table className="w-full border border-gray-200 text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">Plan Name</th>
            <th className="border p-2">Village</th>
            <th className="border p-2">Settlements</th>
            <th className="border p-2">Crops</th>
            <th className="border p-2">Wells</th>
            <th className="border p-2">Waterbodies</th>
            <th className="border p-2">Maint (GW)</th>
            <th className="border p-2">Maint (Agri)</th>
            <th className="border p-2">Maint (SWB)</th>
            <th className="border p-2">Maint (SWB_RS)</th>
            <th className="border p-2">NRM Recharge</th>
            <th className="border p-2">NRM Irrigation</th>
            <th className="border p-2">Livelihood</th>
            <th className="border p-2">Agrohorticulture</th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td className="border p-2">{summary.plan_name || "-"}</td>
            <td className="border p-2">{summary.village_name || "-"}</td>
            <td className="border p-2">{summary.sections?.settlements ?? 0}</td>
            <td className="border p-2">{summary.sections?.crops ?? 0}</td>
            <td className="border p-2">{summary.sections?.wells ?? 0}</td>
            <td className="border p-2">{summary.sections?.waterbodies ?? 0}</td>
            <td className="border p-2">{summary.sections?.maintenance?.gw ?? 0}</td>
            <td className="border p-2">{summary.sections?.maintenance?.agri ?? 0}</td>
            <td className="border p-2">{summary.sections?.maintenance?.swb ?? 0}</td>
            <td className="border p-2">{summary.sections?.maintenance?.swb_rs ?? 0}</td>
            <td className="border p-2">{summary.sections?.nrm_works?.recharge ?? 0}</td>
            <td className="border p-2">{summary.sections?.nrm_works?.irrigation ?? 0}</td>
            <td className="border p-2">{summary.sections?.livelihood ?? 0}</td>
            <td className="border p-2">{summary.sections?.agrohorticulture ?? 0}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
)}
{teamDetails && (
  <div className="bg-white p-5 rounded shadow mt-4">
    <h2 className="text-xl font-bold mb-3">Team Details</h2>

    <div className="overflow-x-auto">
      <table className="w-full border border-gray-200 text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">Organization</th>
            <th className="border p-2">Project</th>
            <th className="border p-2">Plan</th>
            <th className="border p-2">Facilitator</th>
            <th className="border p-2">Process</th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td className="border p-2">{teamDetails.organization || "-"}</td>
            <td className="border p-2">{teamDetails.project || "-"}</td>
            <td className="border p-2">{teamDetails.plan || "-"}</td>
            <td className="border p-2">{teamDetails.facilitator || "-"}</td>
            <td className="border p-2">{teamDetails.process || "-"}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
)}
{villageBrief && (
  <div className="bg-white p-5 rounded shadow mt-4">
    <h2 className="text-xl font-bold mb-3">Village Brief</h2>

    <div className="overflow-x-auto">
      <table className="w-full border border-gray-200 text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">Village</th>
            <th className="border p-2">Gram Panchayat</th>
            <th className="border p-2">Tehsil</th>
            <th className="border p-2">District</th>
            <th className="border p-2">State</th>
            <th className="border p-2">Total Settlements</th>
            <th className="border p-2">Latitude</th>
            <th className="border p-2">Longitude</th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td className="border p-2">{villageBrief.village_name || "-"}</td>
            <td className="border p-2">{villageBrief.gram_panchayat || "-"}</td>
            <td className="border p-2">{villageBrief.tehsil || "-"}</td>
            <td className="border p-2">{villageBrief.district || "-"}</td>
            <td className="border p-2">{villageBrief.state || "-"}</td>
            <td className="border p-2">{villageBrief.total_settlements ?? 0}</td>
            <td className="border p-2">{villageBrief.latitude || "-"}</td>
            <td className="border p-2">{villageBrief.longitude || "-"}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
)}
      
{/*Base Map + MWS Layer (deltaGWell Depth only boundary) + Settlement layer */}

      <MapSection
        title="Settlement Overview"
        loadLayer={loadSettlement}
        loadBoundary={loadNothing}
        districtNameSafe={districtNameSafe}
        blockNameSafe={blockNameSafe}
        plan={plan}
      />

     {Array.isArray(settlements) && settlements.length > 0 && (
  <div className="bg-white p-4 rounded shadow mt-4">
    <h2 className="font-bold text-lg mb-2">Settlements</h2>

    <div className="overflow-x-auto">
      <table className="w-full border border-gray-200 text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">Name</th>
            <th className="border p-2">Households</th>
            <th className="border p-2">Type</th>
            <th className="border p-2">Caste Detail</th>
            <th className="border p-2">SC</th>
            <th className="border p-2">ST</th>
            <th className="border p-2">OBC</th>
            <th className="border p-2">General</th>
            <th className="border p-2">Marginal Farmers</th>
            <th className="border p-2">MGNREGA Applied</th>
            <th className="border p-2">Job Cards</th>
            <th className="border p-2">Work Days</th>
            <th className="border p-2">Past Work</th>
            <th className="border p-2">Demand</th>
            <th className="border p-2">Issues</th>
          </tr>
        </thead>

        <tbody>
          {settlements.map((s, i) => (
            <tr key={i}>
              <td className="border p-2">{s.settlement_name || "-"}</td>
              <td className="border p-2">{s.number_of_households ?? 0}</td>
              <td className="border p-2">{s.settlement_type || "-"}</td>
              <td className="border p-2">{s.caste_group_detail || "-"}</td>
              <td className="border p-2">{s.caste_counts?.sc ?? 0}</td>
              <td className="border p-2">{s.caste_counts?.st ?? 0}</td>
              <td className="border p-2">{s.caste_counts?.obc ?? 0}</td>
              <td className="border p-2">{s.caste_counts?.general ?? 0}</td>
              <td className="border p-2">{s.marginal_farmers ?? 0}</td>
              <td className="border p-2">{s.nrega_job_applied ?? 0}</td>
              <td className="border p-2">{s.nrega_job_card ?? 0}</td>
              <td className="border p-2">{s.nrega_work_days ?? 0}</td>
              <td className="border p-2 whitespace-pre-line">
                {s.nrega_past_work || "-"}
              </td>
              <td className="border p-2">{s.nrega_demand || "-"}</td>
              <td className="border p-2">{s.nrega_issues || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}


{Array.isArray(crops) && crops.length > 0 && (
  <div className="bg-white p-4 rounded shadow mt-4">
    <h2 className="font-bold text-lg mb-2">Crops</h2>

    <div className="overflow-x-auto">
      <table className="w-full border border-gray-200 text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">Settlement</th>
            <th className="border p-2">Irrigation Source</th>
            <th className="border p-2">Land Classification</th>
            <th className="border p-2">Kharif Crops</th>
            <th className="border p-2">Rabi Crops</th>
            <th className="border p-2">Zaid Crops</th>
            <th className="border p-2">Cropping Intensity</th>
          </tr>
        </thead>

        <tbody>
          {crops.map((c, i) => (
            <tr key={i}>
              <td className="border p-2">{c.beneficiary_settlement || "-"}</td>
              <td className="border p-2">{c.irrigation_source || "-"}</td>
              <td className="border p-2">{c.land_classification || "-"}</td>
              <td className="border p-2">
                {c.kharif_crops || "-"} ({c.kharif_acres ?? 0})
              </td>
              <td className="border p-2">
                {c.rabi_crops || "-"} ({c.rabi_acres ?? 0})
              </td>
              <td className="border p-2">
                {c.zaid_crops || "None"} ({c.zaid_acres ?? 0})
              </td>
              <td className="border p-2">{c.cropping_intensity || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}


{Array.isArray(livestock) && livestock.length > 0 && (
  <div className="bg-white p-4 rounded shadow mt-4">
    <h2 className="font-bold text-lg mb-2">Livestock</h2>

    <div className="overflow-x-auto">
      <table className="w-full border border-gray-200 text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">Settlement</th>
            <th className="border p-2">Goats</th>
            <th className="border p-2">Sheep</th>
            <th className="border p-2">Cattle</th>
            <th className="border p-2">Piggery</th>
            <th className="border p-2">Poultry</th>
          </tr>
        </thead>

        <tbody>
          {livestock.map((l, i) => (
            <tr key={i}>
              <td className="border p-2">{l.settlement_name || "-"}</td>
              <td className="border p-2">{l.goats ?? 0}</td>
              <td className="border p-2">{l.sheep ?? 0}</td>
              <td className="border p-2">{l.cattle ?? 0}</td>
              <td className="border p-2">{l.piggery ?? 0}</td>
              <td className="border p-2">{l.poultry ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}
      
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


    {Array.isArray(wells) && wells.length > 0 && (
  <div className="bg-white p-4 rounded shadow mt-4">
    <h2 className="font-bold text-lg mb-2">Wells</h2>

    <div className="overflow-x-auto">
      <table className="w-full border border-gray-200 text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">Settlement</th>
            <th className="border p-2">Type</th>
            <th className="border p-2">Owner</th>
            <th className="border p-2">Beneficiary</th>
            <th className="border p-2">Father Name</th>
            <th className="border p-2">Water Availability</th>
            <th className="border p-2">Households</th>
            <th className="border p-2">Caste Uses</th>
            <th className="border p-2">Usage</th>
            <th className="border p-2">Needs Maintenance</th>
            <th className="border p-2">Repair</th>
            <th className="border p-2">Latitude</th>
            <th className="border p-2">Longitude</th>
          </tr>
        </thead>

        <tbody>
          {wells.map((w, i) => (
            <tr key={i}>
              <td className="border p-2">{w.beneficiary_settlement || "-"}</td>
              <td className="border p-2">{w.well_type || "-"}</td>
              <td className="border p-2">{w.owner || "-"}</td>
              <td className="border p-2">{w.beneficiary_name || "-"}</td>
              <td className="border p-2">{w.beneficiary_father_name || "-"}</td>
              <td className="border p-2">{w.water_availability || "-"}</td>
              <td className="border p-2">{w.households_benefitted ?? 0}</td>
              <td className="border p-2">{w.caste_uses || "-"}</td>
              <td className="border p-2">{w.well_usage || "-"}</td>
              <td className="border p-2">{w.need_maintenance || "-"}</td>
              <td className="border p-2">{w.repair_activities || "-"}</td>
              <td className="border p-2">{w.latitude || "-"}</td>
              <td className="border p-2">{w.longitude || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}

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

      

      {Array.isArray(waterbodies) && waterbodies.length > 0 && (
  <div className="bg-white p-4 rounded shadow mt-4">
    <h2 className="font-bold text-lg mb-2">Waterbodies</h2>

    <div className="overflow-x-auto">
      <table className="w-full border border-gray-200 text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">Settlement</th>
            <th className="border p-2">Owner</th>
            <th className="border p-2">Beneficiary</th>
            <th className="border p-2">Father Name</th>
            <th className="border p-2">Managed By</th>
            <th className="border p-2">Caste Users</th>
            <th className="border p-2">Households</th>
            <th className="border p-2">Structure Type</th>
            <th className="border p-2">Usage</th>
            <th className="border p-2">Needs Maintenance</th>
            <th className="border p-2">Repair Activities</th>
            <th className="border p-2">Latitude</th>
            <th className="border p-2">Longitude</th>
          </tr>
        </thead>

        <tbody>
          {waterbodies.map((w, i) => (
            <tr key={i}>
              <td className="border p-2">{w.beneficiary_settlement || "-"}</td>
              <td className="border p-2">{w.owner || "-"}</td>
              <td className="border p-2">{w.beneficiary_name || "-"}</td>
              <td className="border p-2">{w.beneficiary_father_name || "-"}</td>
              <td className="border p-2">{w.who_manages || "-"}</td>
              <td className="border p-2">{w.caste_who_uses || "-"}</td>
              <td className="border p-2">{w.households_benefitted ?? 0}</td>
              <td className="border p-2">{w.water_structure_type || "-"}</td>
              <td className="border p-2">{w.usage || "-"}</td>
              <td className="border p-2">{w.need_maintenance || "-"}</td>
              <td className="border p-2">{w.repair_activities || "-"}</td>
              <td className="border p-2">{w.latitude || "-"}</td>
              <td className="border p-2">{w.longitude || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}
   
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



      {Array.isArray(nrmWorks) && nrmWorks.length > 0 && (
  <div className="bg-white p-4 rounded shadow mt-4">
    <h2 className="font-bold text-lg mb-2">NRM Works</h2>

    <div className="overflow-x-auto">
      <table className="w-full border border-gray-200 text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">Work Category</th>
            <th className="border p-2">Demand Type</th>
            <th className="border p-2">Work Demand</th>
            <th className="border p-2">Settlement</th>
            <th className="border p-2">Beneficiary</th>
            <th className="border p-2">Gender</th>
            <th className="border p-2">Father Name</th>
            <th className="border p-2">Latitude</th>
            <th className="border p-2">Longitude</th>
          </tr>
        </thead>

        <tbody>
          {nrmWorks.map((n, i) => (
            <tr key={i}>
              <td className="border p-2">{n.work_category || "-"}</td>
              <td className="border p-2">{n.demand_type || "-"}</td>
              <td className="border p-2">{n.work_demand || "-"}</td>
              <td className="border p-2">{n.beneficiary_settlement || "-"}</td>
              <td className="border p-2">{n.beneficiary_name || "-"}</td>
              <td className="border p-2">{n.gender || "-"}</td>
              <td className="border p-2">{n.beneficiary_father_name || "-"}</td>
              <td className="border p-2">{n.latitude || "-"}</td>
              <td className="border p-2">{n.longitude || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}

{Array.isArray(maintenanceGW) && maintenanceGW.length > 0 && (
  <div className="bg-white p-4 rounded shadow mt-4">
    <h2 className="font-bold text-lg mb-2">GW Maintenance</h2>

    <div className="overflow-x-auto">
      <table className="w-full border border-gray-200 text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">Demand Type</th>
            <th className="border p-2">Structure Type</th>
            <th className="border p-2">Repair Activities</th>
            <th className="border p-2">Settlement</th>
            <th className="border p-2">Beneficiary</th>
            <th className="border p-2">Father Name</th>
            <th className="border p-2">Latitude</th>
            <th className="border p-2">Longitude</th>
          </tr>
        </thead>

        <tbody>
          {maintenanceGW.map((m, i) => (
            <tr key={i}>
              <td className="border p-2">{m.demand_type || "-"}</td>
              <td className="border p-2">{m.structure_type || "-"}</td>
              <td className="border p-2">{m.repair_activities || "-"}</td>
              <td className="border p-2">{m.beneficiary_settlement || "-"}</td>
              <td className="border p-2">{m.beneficiary_name || "-"}</td>
              <td className="border p-2">{m.beneficiary_father_name || "-"}</td>
              <td className="border p-2">{m.latitude || "-"}</td>
              <td className="border p-2">{m.longitude || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}


{Array.isArray(maintenanceAgri) && maintenanceAgri.length > 0 && (
  <div className="bg-white p-4 rounded shadow mt-4">
    <h2 className="font-bold text-lg mb-2">Agri Maintenance</h2>

    <div className="overflow-x-auto">
      <table className="w-full border border-gray-200 text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">Demand Type</th>
            <th className="border p-2">Structure Type</th>
            <th className="border p-2">Repair Activities</th>
            <th className="border p-2">Settlement</th>
            <th className="border p-2">Beneficiary</th>
            <th className="border p-2">Father Name</th>
            <th className="border p-2">Latitude</th>
            <th className="border p-2">Longitude</th>
          </tr>
        </thead>

        <tbody>
          {maintenanceAgri.map((m, i) => (
            <tr key={i}>
              <td className="border p-2">{m.demand_type || "-"}</td>
              <td className="border p-2">{m.structure_type || "-"}</td>
              <td className="border p-2">{m.repair_activities || "-"}</td>
              <td className="border p-2">{m.beneficiary_settlement || "-"}</td>
              <td className="border p-2">{m.beneficiary_name || "-"}</td>
              <td className="border p-2">{m.beneficiary_father_name || "-"}</td>
              <td className="border p-2">{m.latitude || "-"}</td>
              <td className="border p-2">{m.longitude || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}

{Array.isArray(maintenanceSWB) && maintenanceSWB.length > 0 && (
  <div className="bg-white p-4 rounded shadow mt-4">
    <h2 className="font-bold text-lg mb-2">SWB Maintenance</h2>

    <div className="overflow-x-auto">
      <table className="w-full border border-gray-200 text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">Demand Type</th>
            <th className="border p-2">Structure Type</th>
            <th className="border p-2">Repair Activities</th>
            <th className="border p-2">Settlement</th>
            <th className="border p-2">Beneficiary</th>
            <th className="border p-2">Father Name</th>
            <th className="border p-2">Latitude</th>
            <th className="border p-2">Longitude</th>
          </tr>
        </thead>

        <tbody>
          {maintenanceSWB.map((m, i) => (
            <tr key={i}>
              <td className="border p-2">{m.demand_type || "-"}</td>
              <td className="border p-2">{m.structure_type || "-"}</td>
              <td className="border p-2">{m.repair_activities || "-"}</td>
              <td className="border p-2">{m.beneficiary_settlement || "-"}</td>
              <td className="border p-2">{m.beneficiary_name || "-"}</td>
              <td className="border p-2">{m.beneficiary_father_name || "-"}</td>
              <td className="border p-2">{m.latitude || "-"}</td>
              <td className="border p-2">{m.longitude || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}


{Array.isArray(maintenanceSWBRS) && maintenanceSWBRS.length > 0 && (
  <div className="bg-white p-4 rounded shadow mt-4">
    <h2 className="font-bold text-lg mb-2">SWB_RS Maintenance</h2>

    <div className="overflow-x-auto">
      <table className="w-full border border-gray-200 text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">Demand Type</th>
            <th className="border p-2">Structure Type</th>
            <th className="border p-2">Repair Activities</th>
            <th className="border p-2">Settlement</th>
            <th className="border p-2">Beneficiary</th>
            <th className="border p-2">Father Name</th>
            <th className="border p-2">Latitude</th>
            <th className="border p-2">Longitude</th>
          </tr>
        </thead>

        <tbody>
          {maintenanceSWBRS.map((m, i) => (
            <tr key={i}>
              <td className="border p-2">{m.demand_type || "-"}</td>
              <td className="border p-2">{m.structure_type || "-"}</td>
              <td className="border p-2">{m.repair_activities || "-"}</td>
              <td className="border p-2">{m.beneficiary_settlement || "-"}</td>
              <td className="border p-2">{m.beneficiary_name || "-"}</td>
              <td className="border p-2">{m.beneficiary_father_name || "-"}</td>
              <td className="border p-2">{m.latitude || "-"}</td>
              <td className="border p-2">{m.longitude || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}
      
{/* Livelihood */}

      

       <MapSection
        title="Livelihood Structure Overview"
        loadLayer={loadLivelihood}
        loadBoundary={loadBoundary}
        districtNameSafe={districtNameSafe}
        blockNameSafe={blockNameSafe}
        plan={plan}
      />
      {Array.isArray(livelihoodData) && livelihoodData.length > 0 && (
  <div className="bg-white p-4 rounded shadow mt-4">
    <h2 className="font-bold text-lg mb-2">Livelihood</h2>

    <div className="overflow-x-auto">
      <table className="w-full border border-gray-200 text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">Work Type</th>
            <th className="border p-2">Demand Type</th>
            <th className="border p-2">Work Demand</th>
            <th className="border p-2">Settlement</th>
            <th className="border p-2">Beneficiary</th>
            <th className="border p-2">Father Name</th>
            <th className="border p-2">Gender</th>
            <th className="border p-2">Total Acres</th>
            <th className="border p-2">Latitude</th>
            <th className="border p-2">Longitude</th>
          </tr>
        </thead>

        <tbody>
          {livelihoodData.map((l, i) => (
            <tr key={i}>
              <td className="border p-2">{l.livelihood_work || "-"}</td>
              <td className="border p-2">{l.demand_type || "-"}</td>
              <td className="border p-2">{l.work_demand || "-"}</td>
              <td className="border p-2">{l.beneficiary_settlement || "-"}</td>
              <td className="border p-2">{l.beneficiary_name || "-"}</td>
              <td className="border p-2">{l.beneficiary_father_name || "-"}</td>
              <td className="border p-2">{l.gender || "-"}</td>
              <td className="border p-2">{l.total_acres ?? 0}</td>
              <td className="border p-2">{l.latitude || "-"}</td>
              <td className="border p-2">{l.longitude || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}
    </div>
  );
};

export default PlanViewPage;
