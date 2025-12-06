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

const DroughtChart = ({ mwsGeoData, waterbody }) => {
  if (!mwsGeoData || !waterbody) return null;

  const mwsUid = waterbody?.MWS_UID?.toString();
  if (!mwsUid) return null;

  const matchedFeature = mwsGeoData.features?.find(
    (f) => f.properties?.uid?.toString().trim() === mwsUid.trim()
  );

  if (!matchedFeature) return null;

  const props = matchedFeature.properties;

  const years = [2017, 2018, 2019, 2020, 2021, 2022];

  const w_mod = years.map((y) => props[`drought_w_mod_${y}`] ?? 0);
  const w_sev = years.map((y) => props[`drought_w_sev_${y}`] ?? 0);
  const drysp = years.map((y) => props[`drought_drysp_${y}`] ?? 0);

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
