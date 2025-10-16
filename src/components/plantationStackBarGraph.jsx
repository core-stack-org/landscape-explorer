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

const PlantationStackBarGraph = ({
  plantation,
  plantationData,
  selectedFeature,
}) => {
  const features = plantationData?.features || [];
  const farmerId = plantation?.farmerId;

  // Match by farmerId inside description
  const matchedFeature = features.find((feature) => {
    const desc = feature?.properties?.description || "";
    return desc.includes(`Farmer ID: ${farmerId}`);
  });

  let lulcData = [];
  try {
    if (matchedFeature?.properties?.IS_LULC) {
      lulcData = JSON.parse(matchedFeature.properties.IS_LULC);
    }
  } catch (e) {
    console.error("Failed to parse LULC:", e);
  }

  const groups = {
    "Water Indicators": [
      { key: "kharif", label: "Kharif ", color: "#74CCF4" },
      { key: "rabi", label: "Kharif Rabi", color: "#1ca3ec" },
      { key: "zaid", label: "Kharif Rabi Zaid", color: "#0f5e9c" },
    ],
    "Crop Indicators": [
      { key: "single_kharif", label: "Single Kharif", color: "#BAD93E" },
      {
        key: "single_non_kharif",
        label: "Single Non-Kharif",
        color: "#f59d22",
      },
      { key: "double_cropping", label: "Double Cropping", color: "#FF9371" },
      { key: "triple_cropping", label: "Triple Cropping", color: "#b3561d" },
    ],
    "Other Vegetation": [
      { key: "tree", label: "Tree/Forest", color: "#38761d" },
      { key: "shrubs", label: "Shrubs/Scrubs", color: "#eaa4f0" },
    ],
    "Non-Vegetation": [
      { key: "barren_land", label: "Barren", color: "#A9A9A9" },
      { key: "builtup", label: "Built-up", color: "#ff0000" },
    ],
  };

  console.log(matchedFeature);
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
      data: lulcData.map((row) => row[key] || 0), // raw area (ha)
      stack: "landUse",
    })
  );

  const maxLulcSum = Math.max(
    ...lulcData.map((row) =>
      Object.keys(categories).reduce((sum, key) => sum + (row[key] || 0), 0)
    )
  );

  const totalArea = Number(selectedFeature?.properties?.area_ha || 0);

  const data = { labels: years, datasets };

  const options = {
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: "Plantation Land Use Over Time",
      },
    },
    scales: {
      x: { stacked: true, title: { display: true, text: "Year" } },
      y: {
        stacked: true,
        title: { display: true, text: `Area (ha)` },
        min: 0,
        max: maxLulcSum.toFixed(2),
        ticks: {
          callback: (value) => `${value} ha`,
        },
      },
    },
  };

  return (
    <div style={{ width: "100%", height: "80%" }}>
      <div
        className="custom-legend"
        style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
      >
        {Object.entries(groups).map(([groupName, items]) => (
          <div key={groupName}>
            <strong>{groupName}</strong>
            {items.map((item) => (
              <div
                key={item.key}
                style={{ display: "flex", alignItems: "center", marginLeft: 8 }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 14,
                    height: 14,
                    backgroundColor: item.color,
                    marginRight: 6,
                  }}
                ></span>
                {item.label}
              </div>
            ))}
          </div>
        ))}
      </div>

      <Bar options={options} data={data} />
    </div>
  );
};

export default PlantationStackBarGraph;
