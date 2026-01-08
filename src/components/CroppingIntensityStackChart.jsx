import React, { useState } from "react";
import { Bar } from "react-chartjs-2";
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

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  LineController
);

const CroppingIntensityStackChart = ({
  zoiFeatures,
  waterbody,
  impactYear,
  isTehsil,
  years
}) => {
  const [showImpact, setShowImpact] = useState(false);

  const wbUID =
  waterbody?.UID ||
  waterbody?.uid ||
  waterbody?.properties?.UID ||
  waterbody?.properties?.uid ||
  null;

  const matchedFeature = zoiFeatures.find(
    (feature) =>
      feature.get("UID")?.toString().trim() ===
      wbUID?.toString().trim()
  );
  if (!matchedFeature) return null;

  const getAreaData = (years) =>
    years.map((year) => ({
      year,
      triple: (matchedFeature.get(`triply_cropped_area_${year}`) || 0),
      double: (matchedFeature.get(`doubly_cropped_area_${year}`) || 0),
      single_kharif:
        (matchedFeature.get(`single_kharif_cropped_area_${year}`) || 0),
      single_non_kharif:
        (matchedFeature.get(`single_non_kharif_cropped_area_${year}`) || 0),
    }));

    const extractYearsFromZoi = (feature) => {
      if (!feature) return [];
    
      const years = new Set();
    
      feature.getKeys().forEach((key) => {
        const match = key.match(/_(20\d{2})$/); // match 2017, 2018, ...
        if (match) {
          years.add(match[1]);
        }
      });
    
      return Array.from(years).sort(); // ["2017","2018",...]
    };
    const chartYears = isTehsil
    ? extractYearsFromZoi(matchedFeature)
    : years.map((y) => `20${y.split("-")[0]}`);
  
  const fullYearData = getAreaData(chartYears);
  
  const maxFullValue = Math.max(
    ...fullYearData.map(
      (a) => a.triple + a.double + a.single_kharif + a.single_non_kharif
    )
  );


  // Get impact years
  const preLabel = impactYear.pre;
  const postLabel = impactYear.post;

  // When in impact mode, zero out non-impact years
  const visibleIndices = years.map((label, i) =>
    label === preLabel || label === postLabel ? i : -1
  );

  const maskedData = {
    labels: isTehsil ? chartYears : years,
    datasets: [
      {
        label: "Triple Crop",
        data: fullYearData.map((a, i) =>
          showImpact && visibleIndices[i] === -1 ? 0 : a.triple
        ),
        backgroundColor: "#b3561d",
        stack: "stack1",
      },
      {
        label: "Double Crop",
        data: fullYearData.map((a, i) =>
          showImpact && visibleIndices[i] === -1 ? 0 : a.double
        ),
        backgroundColor: "#FF9371",
        stack: "stack1",
      },
      {
        label: "Single Non-Kharif",
        data: fullYearData.map((a, i) =>
          showImpact && visibleIndices[i] === -1 ? 0 : a.single_non_kharif
        ),
        backgroundColor: "#f59d22",
        stack: "stack1",
      },
      {
        label: "Single Kharif",
        data: fullYearData.map((a, i) =>
          showImpact && visibleIndices[i] === -1 ? 0 : a.single_kharif
        ),
        backgroundColor: "#BAD93E",
        stack: "stack1",
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: "bottom" },
      title: {
        display: true,
        text: isTehsil
          ? "Cropping Intensity (Area in hectares)"
          : !showImpact
            ? "Cropping Intensity (Area in hectares) (Black line = intervention year)"
            : `Impact Analysis: Showing Only Pre (${impactYear.pre}) and Post (${impactYear.post}) Years`,
            font: { size: 16, weight: "bold" },
      },
      annotation: {
        annotations: isTehsil
          ? {} // hide annotation completely in tehsil mode
          : {
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
      x: {
        title: { display: true, text: "Year" },
      },
      y: {
        min: 0,
        max: maxFullValue,
        title: { display: true, text: "Area (hectares)" },
        ticks: { callback: (v) => `${v.toFixed(1)} ha` },
      },
    },
  };

  return (
    <div>
      {/* Toggle above chart */}
      {!isTehsil && (
      <div className="flex items-center justify-end mb-4">
        <span className="text-[0.7rem] sm:text-[0.75rem] text-gray-700 font-medium mr-2 leading-tight w-auto whitespace-nowrap">
          {showImpact ? "Comparison years" : "Comparison years"}
        </span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={showImpact}
            onChange={() => setShowImpact(!showImpact)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-blue-600 transition-all"></div>
          <div className="absolute left-0.5 top-0.5 bg-white w-5 h-5 rounded-full peer-checked:translate-x-5 transition-all"></div>
        </label>
      </div>
      )}

      <Bar data={maskedData} options={options} />
    </div>
  );
};

export default CroppingIntensityStackChart;
