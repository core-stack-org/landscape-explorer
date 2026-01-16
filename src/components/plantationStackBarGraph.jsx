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

const PlantationStackBarGraph = ({ plantation }) => {
  let lulcData = [];

  try {
    const rawIS = plantation?.IS_LULC;
    if (rawIS) {
      lulcData = JSON.parse(rawIS);
    }
  } catch (e) {
    console.error("Failed to parse IS_LULC:", e);
  }

  const groups = {
    "Crop Indicators": [
      { key: "single_kharif", label: "Single Kharif", color: "#BAD93E" },
      { key: "single_non_kharif", label: "Single Non-Kharif", color: "#f59d22" },
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

  const years = lulcData.map((row) => {
    const startYear = Number(row.year);
    return `${startYear}-${(startYear + 1).toString().slice(-2)}`;
  });

  const datasets = Object.entries(categories).map(([key, { label, color }]) => ({
    label,
    backgroundColor: color,
    data: lulcData.map((row) => row[key] || 0),
    stack: "landUse",
  }));

  const maxLulcSum = Math.max(
    ...lulcData.map((row) =>
      Object.keys(categories).reduce((sum, key) => sum + (row[key] || 0), 0)
    )
  );
  const data = { labels: years, datasets };

  const infoIconPlugin = {
  id: "infoIconPlugin",
  afterDraw(chart) {
    const ctx = chart.ctx;
    const opts = chart?.options?.plugins?.title;
    if (!opts?.display) return;

    const titleText = Array.isArray(opts.text) ? opts.text.join(" ") : opts.text;
    const fontSize =
      typeof opts.font === "function"
        ? opts.font(chart).size
        : opts.font?.size || 14;

    ctx.save();
    ctx.font = `${fontSize}px Arial`;

    // Measure text width
    const metrics = ctx.measureText(titleText);
    const titleWidth = metrics.width;

    // Title start x
    const xStart = (chart.width - titleWidth) / 2;

    // Move slightly UP (change -1.15 to adjust more/less)
    const y = chart.chartArea.top - fontSize-15;

    const r = 9;

    // Move RIGHT (+12 instead of +8)
    const x = xStart + titleWidth + r + 25;

    // Draw icon circle
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = "#2563eb";
    ctx.fill();

    // Draw i
    ctx.fillStyle = "white";
    ctx.font = `${fontSize * 0.75}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("i", x, y);

    ctx.restore();

    chart._infoIcon = { x, y, r };
  },
};


  const options = {
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: "Plantation Land Use Over Time (Black line = Intervention year)",
        font: { size: window.innerWidth < 768 ? 14 : 16, weight: "bold" },
        margin:{top:30},
        padding: {
             bottom: 25,   // 👈 title ke niche space
           },
      },
      annotation: {
        annotations: {
          interventionLine: {
            type: "line",
            scaleID: "x",
            value: "2020-21",
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
      x: {
        stacked: true,
        title: { display: true, text: "Year", font: { size: 14 } },
        ticks: { font: { size: window.innerWidth < 768 ? 10 : 12 } },
      },
      y: {
        stacked: true,
        min: 0,
        max: maxLulcSum.toFixed(2),
        title: { display: true, text: "Area (ha)", font: { size: 14 } },
        ticks: {
          callback: (value) => `${value} ha`,
          font: { size: window.innerWidth < 768 ? 10 : 12 },
        },
      },
    },
  };

  return (
    <div className="w-full chart-wrapper">
      {/* CUSTOM LEGEND */}
      <div
        className="custom-legend flex flex-wrap gap-4 p-2"
        style={{
          fontSize: window.innerWidth < 768 ? 10 : 12,
          lineHeight: "1.2rem",
        }}
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

      {/* CHART */}
      <div
        className="chart-container w-full px-0"
        style={{
          height: "clamp(320px, 45vh, 220px)",
          minHeight: "250px",
          overflow: "visible",
        }}
      >
        <Bar
          data={data}
          options={{
            ...options,
            plugins: { ...options.plugins, legend: { display: false } },
          }}
          plugins={[infoIconPlugin]} 
        />
      </div>
    </div>
  );
};

export default PlantationStackBarGraph;
