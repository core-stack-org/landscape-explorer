import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const years = [
  "17-18",
  "18-19",
  "19-20",
  "20-21",
  "21-22",
  "22-23",
  "23-24",
  "24-25",
];

const WaterAvailabilityChart = ({ waterbody, water_rej }) => {
  // Prepare empty arrays that will hold season‑wise values for each year
  const kharifData = new Array(years.length).fill(0);
  const rabiData   = new Array(years.length).fill(0);
  const zaidData   = new Array(years.length).fill(0);

  // Populate the arrays from feature properties
  water_rej.features.forEach((feature) => {
    if (feature.properties.waterbody_name === waterbody.waterbody) {
      const p = feature.properties;

      years.forEach((year, i) => {
        kharifData[i] += p[`k_${year}`]  ?? 0; // Kharif
        rabiData[i]   += p[`kr_${year}`] ?? 0; // Rabi
        zaidData[i]   += p[`krz_${year}`]?? 0; // Zaid
      });
    }
  });

  // Chart.js dataset structure
  const data = {
    labels: years,
    datasets: [
      {
        label: "Kharif",
        data: kharifData,
        backgroundColor: "#74CCF4",
      },
      {
        label: "Rabi",
        data: rabiData,
        backgroundColor: "#1ca3ec",
      },
      {
        label: "Zaid",
        data: zaidData,
        backgroundColor: "#0f5e9c",
      },
    ],
  };

  // Options: turn *off* stacking so bars are grouped
  const options = {
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: {
        display: true,
        text: "Water Availability Over Time",
      },
    },
    scales: {
      x: {
        stacked: false,       // grouped bars on X‑axis
        title: { display: true, text: "Year" },
      },
      y: {
        stacked: false,       // independent Y values
        title: { display: true, text: "Area (in Percent)" },
      },
    },
  };

  return (
    <div style={{ width: "100%", height: "400px" }}>
      <Bar options={options} data={data} />
    </div>
  );
};

export default WaterAvailabilityChart;
