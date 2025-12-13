import React, {  useMemo } from "react";
import { useLocation } from "react-router";
import { useRecoilValue } from "recoil";

import {
  districtLookupAtom,
  blockLookupAtom,
} from "../store/locationStore";

import getVectorLayers from "../actions/getVectorLayers";
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
  

  const loadSettlement = async (map) => {
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
      return new Style({
        stroke: new Stroke({ color: "#000", width: 1 }),
        fill: new Fill({ color: "rgba(0,0,0,0)" }),
      });
    });

    map.addLayer(layer);
  };

  const loadWell = async (map) => {
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
  };

  const loadWaterStructure = async (map) => {
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
  };

  const loadRechargeStructure = async (map) => {
    const layer = await getVectorLayers(
      "works",
      `plan_gw_${plan.id}_${districtNameSafe}_${blockNameSafe}`,
      true
    );

    layer.setStyle((feature) => {
      if (feature.getGeometry()?.getType() === "Point") {
        return new Style({ image: new Icon({ src: RechargeIcon, scale: 1.1 }) });
      }
      return new Style();
    });

    map.addLayer(layer);
  };

  const loadIrrigationStructure = async (map) => {
    const layer = await getVectorLayers(
      "works",
      `plan_agri_${plan.id}_${districtNameSafe}_${blockNameSafe}`,
      true
    );

    layer.setStyle((feature) => {
      if (feature.getGeometry()?.getType() === "Point") {
        return new Style({ image: new Icon({ src: IrrigationIcon, scale: 1.1 }) });
      }
      return new Style();
    });

    map.addLayer(layer);
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
  title="Settlement Overview"
  loadLayer={loadSettlement}
  loadBoundary={loadBoundary}
  districtNameSafe={districtNameSafe}
  blockNameSafe={blockNameSafe}
  plan={plan}
/>

<MapSection
  title="Well Structure Overview"
  loadLayer={loadWell}
  loadBoundary={loadBoundary}
  districtNameSafe={districtNameSafe}
  blockNameSafe={blockNameSafe}
  plan={plan}
/>

<MapSection
  title="Water Structures Overview"
  loadLayer={loadWaterStructure}
  loadBoundary={loadBoundary}
  districtNameSafe={districtNameSafe}
  blockNameSafe={blockNameSafe}
  plan={plan}
/>

<MapSection
  title="Groundwater Recharge Overview"
  loadLayer={loadRechargeStructure}
  loadBoundary={loadBoundary}
  districtNameSafe={districtNameSafe}
  blockNameSafe={blockNameSafe}
  plan={plan}
/>

<MapSection
  title="Irrigation Structure Overview"
  loadLayer={loadIrrigationStructure}
  loadBoundary={loadBoundary}
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
