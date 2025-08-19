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

const DroughtChart = ({ feature }) => {
  if (!feature) return null;

  // handle OL feature or plain GeoJSON
  const props = feature.get
    ? feature.getProperties()
    : feature.properties || feature;

  const years = [2017, 2018, 2019, 2020, 2021, 2022];

  // extract arrays from properties
  const w_mod = years.map((y) => props[`w_mod_${y}`] ?? 0);
  const w_sev = years.map((y) => props[`w_sev_${y}`] ?? 0);
  const drysp = years.map((y) => props[`drysp_${y}`] ?? 0);

  const data = {
    labels: years,
    datasets: [
      {
        label: "Moderate Drought (w_mod)",
        data: w_mod,
        borderColor: "#ff8c00",
        backgroundColor: "#ff8c00",
        tension: 0.3,
      },
      {
        label: "Severe Drought (w_sev)",
        data: w_sev,
        borderColor: "#cd5c5c",
        backgroundColor: "#cd5c5c",
        tension: 0.3,
      },
      {
        label: "Dry Spells (drysp)",
        data: drysp,
        borderColor: "#1e90ff",
        backgroundColor: "#1e90ff",
        tension: 0.3,
      },
    ],
  };

  const options = {
    maintainAspectRatio: false,
    responsive: true,
    layout: {
      padding: { bottom: 30 }, // same padding for both
    },
    interaction: { mode: "index", intersect: false },
    position: "top",
    plugins: {
      title: { display: true, text: "Drought Indicators per Year" },
    },
    scales: {
      y: {
        title: { display: true, text: "Values" },
      },
    },
  };

  return <Bar data={data} options={options} />;
};

export default DroughtChart;
