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
  years,
  water_rej_data
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

  const normalizeYear = (iv) => {
    if (!iv || typeof iv !== "string" || !iv.includes("-")) return "22-23";
  
    let clean = iv.replace(/_/g, "-").trim();
    const parts = clean.split("-");
  
    // 22-23 → already OK
    if (parts[0].length === 2 && parts[1].length === 2) return clean;
  
    // 2022-23 → take last 2 digits of first part
    if (parts[0].length === 4 && parts[1].length === 2) {
      return `${parts[0].slice(2)}-${parts[1]}`;
    }
  
    // 22-2023 → take last 2 digits of last part
    if (parts[0].length === 2 && parts[1].length === 4) {
      return `${parts[0]}-${parts[1].slice(2)}`;
    }
  
    // 2022-2023 → take last 2-2 digits
    if (parts[0].length === 4 && parts[1].length === 4) {
      return `${parts[0].slice(2)}-${parts[1].slice(2)}`;
    }
  
    return "22-23";
  };

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
    maintainAspectRatio: false, // Allow the chart to fill the container without maintaining aspect ratio
    plugins: {
      legend: { 
        position: "bottom",
        labels: {
          font: {
            size: window.innerWidth < 768 ? 10 : 12, // Smaller font on mobile
          },
        },
      },
      title: {
        display: true,
        text: isTehsil
          ? "Cropping Intensity (Area in hectares)"
          : !showImpact
            ? "Cropping Intensity (Area in hectares) (Black line = intervention year)"
            : `Impact Analysis: Showing Only Pre (${impactYear.pre}) and Post (${impactYear.post}) Years`,
        font: { 
          size: window.innerWidth < 768 ? 14 : 16, // Responsive font size
          weight: "bold" 
        },
        padding: {
          bottom: 20,   
          top: 0,
        },
      },
      annotation: {
        annotations: isTehsil
          ? {}
          : (() => {
              const f = water_rej_data?.features?.find(
                (x) => x.properties?.UID === waterbody?.UID
              );
              const iv = f?.properties?.intervention_year;
              const interventionYear = normalizeYear(iv);    
              return {
                interventionLine: {
                  type: "line",
                  scaleID: "x",
                  value: interventionYear,
                  borderColor: "black",
                  borderWidth: 2,
                  label: {
                    content: `Intervention Year (${interventionYear})`,
                    enabled: true,
                    position: "start",
                    color: "black",
                    font: { 
                      weight: "bold",
                      size: window.innerWidth < 768 ? 10 : 12, // Responsive font size
                    },
                  },
                },
              };
            })(),
      },
    },
    scales: {
      x: {
        title: { 
          display: true, 
          text: "Year",
          font: {
            size: window.innerWidth < 768 ? 12 : 14, // Responsive font size
          },
        },
        ticks: {
          font: {
            size: window.innerWidth < 768 ? 10 : 12, // Responsive font size
          },
        },
      },
      y: {
        min: 0,
        max: maxFullValue,
        title: { 
          display: true, 
          text: "Area (hectares)",
          font: {
            size: window.innerWidth < 768 ? 12 : 14, // Responsive font size
          },
        },
        ticks: { 
          callback: (v) => `${v.toFixed(1)} ha`,
          font: {
            size: window.innerWidth < 768 ? 10 : 12, // Responsive font size
          },
        },
      },
    },
  };

  return (
    <div className="w-full chart-wrapper">
      {/* Toggle above chart - Made more responsive */}
      {!isTehsil && (
        <div
          className="flex flex-col sm:flex-row items-start sm:items-center justify-start sm:justify-end mb-2 sm:mb-4"
          style={{
            maxWidth: "100%", // Allow full width on small screens
          }}
        >
          <span
            className="font-medium mr-0 sm:mr-2 mb-1 sm:mb-0 leading-tight text-gray-700 text-xs sm:text-sm"
          >
            Comparison years
          </span>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={showImpact}
              onChange={() => setShowImpact(!showImpact)}
              className="sr-only peer"
            />

            {/* TRACK */}
            <div
              className="bg-gray-300 rounded-full peer-checked:bg-blue-600 transition-all"
              style={{
                width: "clamp(30px, 3vw, 42px)",
                height: "clamp(14px, 1.9vw, 22px)",
              }}
            ></div>

            {/* THUMB */}
            <div
              className="absolute bg-white rounded-full transition-all peer-checked:translate-x-[calc(clamp(30px,3vw,42px)-clamp(14px,1.9vw,22px))]"
              style={{
                width: "clamp(12px, 1.6vw, 18px)",
                height: "clamp(12px, 1.6vw, 18px)",
                top: "2px",
                left: "2px",
              }}
            ></div>
          </label>
        </div>
      )}

      <div 
        className="chart-container w-full px-0"   
        style={{ 
          height: "clamp(300px, 40vh, 450px)", // Adjusted min height for better mobile view
          minHeight: "200px", // Ensure minimum height
        }}
      >
        <Bar data={maskedData} options={options} />
      </div>
    </div>
  );
};

export default CroppingIntensityStackChart;