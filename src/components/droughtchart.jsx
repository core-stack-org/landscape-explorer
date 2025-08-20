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
  console.log(feature);
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
        label: "Moderate Weeks",
        data: w_mod,
        borderColor: "#EB984E",
        backgroundColor: "#EB984E",
        tension: 0.3,
      },
      {
        label: "Severe Weeks",
        data: w_sev,
        borderColor: "#E74C3C",
        backgroundColor: "#E74C3C",
        tension: 0.3,
      },
      {
        label: "Dry Spells Weeks",
        data: drysp,
        borderColor: "#8884d8",
        backgroundColor: "#8884d8",
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
      title: { display: true, text: "Drought Data over the years" },
    },
    scales: {
      y: {
        title: { display: true, text: "No. of weeks" },
      },
    },
  };

  return <Bar data={data} options={options} />;
};

export default DroughtChart;
