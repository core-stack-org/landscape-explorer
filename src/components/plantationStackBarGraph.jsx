import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  LineController,
  Title,
} from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
import { Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  annotationPlugin,
  PointElement,
  LineElement,
  LineController,
  Title
);

const PlantationStackBarGraph = ({ plantation, plantationData }) => {
  console.log(plantation);
  console.log(plantationData);
  const features = plantationData?.features || [];
  const farmerId = plantation?.farmerId;

  // Match by farmerId inside description
  const matchedFeature = features.find((feature) => {
    const desc = feature?.properties?.description || "";
    return desc.includes(`Farmer ID: ${farmerId}`);
  });

  console.log("Selected plantation farmerId:", farmerId);
  console.log("Matched feature:", matchedFeature);

  let lulcData = [];
  try {
    if (matchedFeature?.properties?.LULC) {
      lulcData = JSON.parse(matchedFeature.properties.LULC);
    }
  } catch (e) {
    console.error("Failed to parse LULC:", e);
  }
  console.log("LULC data by year:");
  lulcData.forEach((yearEntry) => {
    console.log(`Year ${yearEntry.year}:`, yearEntry);
  });

  const categories = {
    "1.0": { label: "Built-up", color: "#ff0000" },
    "2.0": { label: "Water in Kharif", color: "#74CCF4" },
    "3.0": { label: "Water in Kharif and Rabi", color: "#1ca3ec" },
    "4.0": { label: "Water in Kharif, Rabi and Zaid", color: "#0f5e9c" },
    "5.0": { label: "Croplands", color: "#f1c232" },
    "6.0": { label: "Tree/Forest", color: "#38761d" },
    "7.0": { label: "Barren lands", color: "#A9A9A9" },
    "8.0": { label: "Single Kharif Cropping", color: "#BAD93E" },
    "9.0": { label: "Single non Kharif Cropping", color: "#f59d22" },
    "10.0": { label: "Double Cropping", color: "#FF9371" },
    "11.0": { label: "Triple cropping", color: "#b3561d" },
    "12.0": { label: "Shrubs_scrubs", color: "#eaa4f0" },
  };

  const years = lulcData.map((row) => row.year);
  const datasets = Object.entries(categories).map(
    ([key, { label, color }]) => ({
      label,
      backgroundColor: color,
      data: lulcData.map((row) => (row[key] ? row[key] * 100 : 0)), // convert to %
      stack: "landUse",
    })
  );

  console.log(datasets);

  const data = { labels: years, datasets };

  const options = {
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: {
        display: true,
        text: "Plantation Land Use Over Time",
      },
    },
    scales: {
      x: { stacked: true, title: { display: true, text: "Year" } },
      y: {
        stacked: true,
        title: { display: true, text: "Land Use (%)" },
        min: 0,
        max: 100,
        ticks: { callback: (value) => `${value}%` },
      },
    },
  };

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Bar options={options} data={data} />
    </div>
  );
};

export default PlantationStackBarGraph;
