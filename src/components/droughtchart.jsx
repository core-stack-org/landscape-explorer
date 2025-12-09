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

  // --------------------------------------------------
  // ⭐ UID SELECTION
  // --------------------------------------------------
  // PROJECT MODE → working logic (unchanged)
  let mwsUid = waterbody?.MWS_UID?.toString()?.trim();

  // TEHSIL MODE → UID comes from waterbody.properties.MWS_UID
  if (typeparam === "tehsil") {
    mwsUid = waterbody?.properties?.MWS_UID?.toString()?.trim();
  }

  if (!mwsUid) return null;

  // --------------------------------------------------
  // ⭐ MATCH FEATURE BASED ON MODE
  // --------------------------------------------------

  let matchedFeature;

  if (typeparam === "project") {
    // Existing project logic uses GeoJSON-like structure
    matchedFeature = mwsGeoData.features?.find(
      (f) => f.properties?.uid?.toString()?.trim() === mwsUid
    );
  } 
  
  else if (typeparam === "tehsil") {
    // Tehsil mode: mwsGeoData is array of OpenLayers Features
    matchedFeature = mwsGeoData.find((f) => {
      const props = f.getProperties();
      return props?.uid?.toString()?.trim() === mwsUid;
    });
  }

  if (!matchedFeature) return null;

  // --------------------------------------------------
  // ⭐ PROPERTIES
  // --------------------------------------------------
  const props =
    typeparam === "project"
      ? matchedFeature.properties
      : matchedFeature.getProperties();

  // --------------------------------------------------
  // ⭐ YEARS
  // --------------------------------------------------
  const years = [2017, 2018, 2019, 2020, 2021, 2022];

  // --------------------------------------------------
  // ⭐ VALUE EXTRACTOR DEPENDING ON MODE
  // --------------------------------------------------
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

  // --------------------------------------------------
  // ⭐ CHART DATA
  // --------------------------------------------------
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

  return <Bar data={data} options={{ responsive: true }} />;
};

export default DroughtChart;
