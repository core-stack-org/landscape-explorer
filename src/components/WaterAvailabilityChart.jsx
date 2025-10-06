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
  LineController
);

const years = ["17-18", "18-19", "19-20", "20-21", "21-22", "22-23", "23-24"];

const WaterAvailabilityChart = ({ waterbody, water_rej_data, mwsFeature }) => {
  const yearMap = {
    "17-18": "2017-2018",
    "18-19": "2018-2019",
    "19-20": "2019-2020",
    "20-21": "2020-2021",
    "21-22": "2021-2022",
    "22-23": "2022-2023",
    "23-24": "2023-2024",
  };

  // --- Rainfall data
  const totalRainfall = years.reduce((acc, year) => {
    const longYear = yearMap[year];
    const kharif =
      mwsFeature?.properties?.[`precipitation_kharif_${longYear}`] ?? 0;
    const rabi =
      mwsFeature?.properties?.[`precipitation_rabi_${longYear}`] ?? 0;
    const zaid =
      mwsFeature?.properties?.[`precipitation_zaid_${longYear}`] ?? 0;
    acc[`TR${year}`] = kharif + rabi + zaid;
    return acc;
  }, {});

  // --- Define grouped structure
  const groups = {
    "Water Indicators": [
      { key: "kharif", label: "Kharif Water", color: "#74CCF4" },
      { key: "rabi", label: "Rabi Water", color: "#1ca3ec" },
      { key: "zaid", label: "Zaid Water", color: "#0f5e9c" },
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
      { key: "barren_land", label: "Barren Land", color: "#A9A9A9" },
      { key: "builtup", label: "Built-up", color: "#ff0000" },
    ],
  };

  // --- Raw Data
  const rawData = years.map(() => ({
    kharif: 0,
    rabi: 0,
    zaid: 0,
    shrubs: 0,
    single_kharif: 0,
    single_non_kharif: 0,
    tree: 0,
    barren_land: 0,
    double_cropping: 0,
    triple_cropping: 0,
    builtup: 0,
  }));

  water_rej_data.features.forEach((feature) => {
    if (feature.properties.waterbody_name === waterbody.waterbody) {
      const p = feature.properties;
      years.forEach((year, i) => {
        const k = p[`k_${year}`] ?? 0;
        const kr = p[`kr_${year}`] ?? 0;
        const krz = p[`krz_${year}`] ?? 0;

        const zaid = krz;
        const rabi = Math.max(0, kr - krz);
        const kharif = Math.max(0, k - kr);

        rawData[i].kharif += kharif;
        rawData[i].rabi += rabi;
        rawData[i].zaid += zaid;
        rawData[i].shrubs += p[`shrubs_${year}`] ?? 0;
        rawData[i].single_kharif += p[`single_kharif_${year}`] ?? 0;
        rawData[i].single_non_kharif += p[`single_kharif_no_${year}`] ?? 0;
        rawData[i].tree += p[`tree_${year}`] ?? 0;
        rawData[i].barren_land += p[`barren_land_${year}`] ?? 0;
        rawData[i].double_cropping += p[`double_cropping_${year}`] ?? 0;
        rawData[i].triple_cropping += p[`tripple_cropping_${year}`] ?? 0;
        rawData[i].builtup += p[`build_up_${year}`] ?? 0;
      });
    }
  });

  // --- Normalize to 100%
  const normalizedData = rawData.map((yearData) => {
    const total = Object.values(yearData).reduce((sum, v) => sum + v, 0);
    const scale = total > 100 ? 100 / total : 1;
    return Object.fromEntries(
      Object.entries(yearData).map(([key, value]) => [key, value * scale])
    );
  });

  // --- Datasets
  const datasets = [];
  Object.entries(groups).forEach(([groupName, items]) => {
    items.forEach((cat) => {
      datasets.push({
        label: `${groupName} | ${cat.label}`,
        backgroundColor: cat.color,
        data: normalizedData.map((d) => d[cat.key]),
        order: 2,
      });
    });
  });

  // --- Rainfall line
  datasets.push({
    type: "line",
    label: "Total Rainfall (mm)",
    data: years.map((year) => totalRainfall[`TR${year}`] ?? 0),
    borderColor: "#4F555F",
    backgroundColor: "#4F555F",
    yAxisID: "y1",
    pointRadius: 4,
    pointBackgroundColor: "#4F555F",
    pointBorderWidth: 2,
    order: 1,
  });

  const data = { labels: years, datasets };

  // --- Custom grouped legend
  const options = {
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      legend: {
        position: "top",
        labels: {
          usePointStyle: true,
          boxWidth: 14,
          font: { size: 12 },
          generateLabels: (chart) => {
            const all = chart.data.datasets.filter((d) => !d.type);
            const structured = [];

            Object.entries(groups).forEach(([group, items]) => {
              // Header
              structured.push({
                text: group,
                fillStyle: "transparent",
                strokeStyle: "transparent",
                fontColor: "#000",
                hidden: true,
              });
              // Sub-items
              items.forEach((item) => {
                structured.push({
                  text: "   " + item.label,
                  fillStyle: item.color,
                  strokeStyle: "#ccc",
                });
              });
            });

            // Add rainfall line legend
            structured.push({
              text: "Total Rainfall (mm)",
              fillStyle: "#4F555F",
            });

            return structured;
          },
        },
      },
      title: {
        display: true,
        text: "Land Use Categories vs Rainfall (Grouped Legend)",
        font: { size: 16, weight: "bold" },
      },
      annotation: {
        annotations: {
          interventionLine: {
            type: "line",
            scaleID: "x",
            value: "22-23",
            borderColor: "black",
            borderWidth: 2,
            label: {
              content: "Intervention Year",
              enabled: true,
              position: "start",
              color: "black",
              font: { weight: "bold" },
            },
          },
        },
      },
    },
    scales: {
      x: { stacked: true, title: { display: true, text: "Year" } },
      y: {
        stacked: true,
        title: { display: true, text: "Land Use (%)" },
        min: 0,
        max: 100,
        ticks: { callback: (v) => `${v}%` },
      },
      y1: {
        position: "right",
        title: { display: true, text: "Rainfall (mm)" },
        grid: { drawOnChartArea: false },
      },
    },
  };

  return (
    <div style={{ width: "100%", height: "80%" }}>
      <div
        className="custom-legend"
        style={{ display: "flex", fontSize: 12, gap: 10 }}
      >
        {Object.entries(groups).map(([group, items]) => (
          <div key={group} style={{ marginBottom: 8 }}>
            <strong>{group}</strong>
            {items.map((item) => (
              <div
                key={item.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginLeft: 12,
                }}
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
        {/* Add Rainfall Line */}
        <div style={{ display: "flex", alignItems: "center", marginTop: 8 }}>
          <span
            style={{
              display: "inline-block",
              width: 14,
              height: 2,
              backgroundColor: "#4F555F",
              marginRight: 6,
            }}
          ></span>
          Total Rainfall (mm)
        </div>
      </div>
      <Bar
        data={data}
        options={{ ...options, plugins: { legend: { display: false } } }}
      />
    </div>
  );
};

export default WaterAvailabilityChart;
