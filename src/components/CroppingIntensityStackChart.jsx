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
import annotationPlugin from "chartjs-plugin-annotation";


ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  LineController,
  annotationPlugin
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
  console.log(matchedFeature)

  // ---------------- GET AREA VALUES ----------------
  const getAreaData = (rawYears) =>
    rawYears.map((year) => ({
      year,
      triple: matchedFeature.get(`triply_cropped_area_${year}`) || 0,
      double: matchedFeature.get(`doubly_cropped_area_${year}`) || 0,
      single_kharif:
        matchedFeature.get(`single_kharif_cropped_area_${year}`) || 0,
      single_non_kharif:
        matchedFeature.get(`single_non_kharif_cropped_area_${year}`) || 0,
    }));

  // ---------------- EXTRACT RAW YEARS ----------------
  const extractYearsFromZoi = (feature) => {
    const years = new Set();
    feature.getKeys().forEach((key) => {
      const match = key.match(/_(20\d{2})$/);
      if (match) years.add(match[1]);
    });
    return Array.from(years).sort(); // ["2017","2018",...]
  };

  

  // ---------------- BUILD YEAR LISTS ----------------
  const extracted = extractYearsFromZoi(matchedFeature);     // ["2017","2018","2019",...]
  const labelYears = extracted.map((y) => {
    const start = y.slice(2);
    const end = (parseInt(y) + 1).toString().slice(2);
    return `${start}-${end}`;
  });
  const rawYearsToFetch = extracted;

  // ---------------- FETCH DATA WITH RAW YEARS ----------------
  const fullYearData = getAreaData(rawYearsToFetch);

  // ---------------- AXIS MAX ----------------
  const maxFullValue = Math.max(
    ...fullYearData.map(
      (a) => a.triple + a.double + a.single_kharif + a.single_non_kharif
    )
  );

  // ---------------- INTERVENTION YEAR FIX ----------------
  const normalizeYear = (iv) => {
    if (!iv || typeof iv !== "string") return "22-23";
  
    let clean = iv.replace(/_/g, "-").trim();
    const parts = clean.split("-");
  
    // 22-23 → already correct
    if (parts[0].length === 2 && parts[1].length === 2) return clean;
  
    // 2022-23 → trim first part only
    if (parts[0].length === 4 && parts[1].length === 2) {
      return `${parts[0].slice(2)}-${parts[1]}`;
    }
  
    // 22-2023 → trim second part only
    if (parts[0].length === 2 && parts[1].length === 4) {
      return `${parts[0]}-${parts[1].slice(2)}`;
    }
  
    // 2022-2023 → trim BOTH parts
    if (parts[0].length === 4 && parts[1].length === 4) {
      return `${parts[0].slice(2)}-${parts[1].slice(2)}`;
    }
  
    return clean;
  };
  

  // ---------------- IMPACT MODE MASKING ----------------
  const visibleIndices = labelYears.map((lbl, i) =>
    lbl === impactYear.pre || lbl === impactYear.post ? i : -1
  );

  // ---------------- CHART DATA ----------------
  const maskedData = {
    labels: labelYears,
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

  // ---------------- OPTIONS ----------------
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom" },
      title: {
        display: true,
        text: isTehsil
          ? "Cropping Intensity (Area in hectares)"
          : !showImpact
          ? "Cropping Intensity (Area in hectares) (Black line = intervention year)"
          : `Impact Analysis: Showing Only Pre (${impactYear.pre}) and Post (${impactYear.post}) Years`,
      },
      annotation: isTehsil
      ? {}
      : (() => {
          const f = water_rej_data?.features?.find(
            (x) => x.properties?.UID === waterbody?.UID
          );
          const iv = f?.properties?.intervention_year;
          const interventionYear = normalizeYear(iv);
    
          console.log("📍 Intervention Year:", iv, "→ normalized:", interventionYear);
    
          return {
            annotations: {
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
                  font: { weight: "bold" },
                },
              },
            },
          };
        })(),
    
    },

  
    scales: {
      x: {
        title: {
          display: true,
          text: "Years",   
        },
      },
      y: {
        min: 0,
        max: maxFullValue,
        title: {
          display: true,
          text: "Area (in hectares)",
        },
      },
    },
  };

  return (
    <div className="w-full">
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

      <div style={{ height: "clamp(300px, 40vh, 450px)" }}>
        <Bar data={maskedData} options={options} />
      </div>
    </div>
  );
};

export default CroppingIntensityStackChart;
