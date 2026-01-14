import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const DroughtChart = ({ mwsGeoData, waterbody, typeparam }) => {
  if (!mwsGeoData || !waterbody) return null;

  // GET UID BASED ON MODE
  let mwsUid =
    typeparam === "tehsil"
      ? waterbody?.properties?.MWS_UID?.toString()?.trim()
      : waterbody?.MWS_UID?.toString()?.trim();

  if (!mwsUid) return null;

  // Extract partial UID → "12_96671_12_96925" → "12_96671"
  const parts = mwsUid.split("_");
  const partialUid =
    parts.length >= 2 ? `${parts[0]}_${parts[1]}` : mwsUid;

  let matchedFeature = null;

  // PROJECT MODE → mwsGeoData.features[]
  if (typeparam === "project") {
    const features = mwsGeoData?.features || [];

    // 1 exact match
    matchedFeature = features.find(
      (f) =>
        f.properties?.uid?.toString()?.trim() === mwsUid ||
        f.properties?.MWS_UID?.toString()?.trim() === mwsUid
    );

    // 2️ partial match fallback
    if (!matchedFeature) {
      matchedFeature = features.find((f) => {
        const props = f.properties || {};
        const uid = props.uid?.toString()?.trim() || "";
        const mws_uid = props.MWS_UID?.toString()?.trim() || "";
        return uid.includes(partialUid) || mws_uid.includes(partialUid);
      });
    }
  }

  // --------------------------------------------
  //  TEHSIL MODE → array of OL Features
  // --------------------------------------------
  if (typeparam === "tehsil") {
    // 1️ exact match
    matchedFeature = mwsGeoData.find((f) => {
      const props = f.getProperties();
      return (
        props.uid?.toString()?.trim() === mwsUid ||
        props.MWS_UID?.toString()?.trim() === mwsUid
      );
    });

    // 2️ partial match fallback
    if (!matchedFeature) {
      matchedFeature = mwsGeoData.find((f) => {
        const props = f.getProperties();
        const uid = props.uid?.toString()?.trim() || "";
        const mws_uid = props.MWS_UID?.toString()?.trim() || "";
        return uid.includes(partialUid) || mws_uid.includes(partialUid);
      });
    }
  }

  // If still nothing → return
  if (!matchedFeature) {
    console.warn("No matching MWS found!");
    return null;
  }

  // PROPERTIES EXTRACTOR
  const props =
    typeparam === "project"
      ? matchedFeature.properties
      : matchedFeature.getProperties();

  //  CHART VALUES
  const years = [2017, 2018, 2019, 2020, 2021, 2022];

  const getProjectKeys = (y) => ({
    mod: props[`drought_w_mod_${y}`] ?? 0,
    sev: props[`drought_w_sev_${y}`] ?? 0,
    dry: props[`drought_drysp_${y}`] ?? 0,
  });

  const getTehsilKeys = (y) => ({
    mod: props[`w_mod_${y}`] ?? 0,
    sev: props[`w_sev_${y}`] ?? 0,
    dry: props[`drysp_${y}`] ?? 0,
  });

  const extractor = typeparam === "tehsil" ? getTehsilKeys : getProjectKeys;

  const w_mod = years.map((y) => extractor(y).mod);
  const w_sev = years.map((y) => extractor(y).sev);
  const drysp = years.map((y) => extractor(y).dry);

  const data = {
    labels: years,
    datasets: [
      {
        label: "Moderate Weeks",
        data: w_mod,
        backgroundColor: "#EB984E",
      },
      {
        label: "Severe Weeks",
        data: w_sev,
        backgroundColor: "#E74C3C",
      },
      {
        label: "Dry Spell Weeks",
        data: drysp,
        backgroundColor: "#8884d8",
      },
    ],
  };

  return (
    <div
      className="chart-container w-full px-0"
      style={{
        height: "clamp(300px, 45vh, 400px)",   // never too small
        minHeight: "260px",
        overflow: "visible",
      }}
    >
      <Bar
        data={data}
        options={{
          responsive: true,
          maintainAspectRatio: false,   // SUPER IMPORTANT
          plugins: {
            title: {
              display: true,
              text:
                typeparam === "tehsil"
                  ? "Drought Incidence"
                  : "Drought Incidence",
              font: { size: 16, weight: "bold" },
            },
            legend: {
              position: "bottom",
            },
          },
        }}
      />
    </div>
  );
  
  
};

export default DroughtChart;
