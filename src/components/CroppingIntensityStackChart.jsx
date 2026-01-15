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

  // ---------------- FORMAT FOR UI (17-18) ----------------
  const convertToRange = (rawYears) =>
    rawYears.map((y, i) => {
      if (i === rawYears.length - 1) return null;
      const start = y.slice(2);
      const end = (parseInt(y) + 1).toString().slice(2);
      return `${start}-${end}`;
    }).filter(Boolean);

  // ---------------- BUILD YEAR LISTS ----------------
  const extracted = extractYearsFromZoi(matchedFeature);     // ["2017","2018","2019",...]
  const labelYears = isTehsil
    ? convertToRange(extracted)              // ["17-18","18-19",...]
    : years;                                 // already like "21-22"

  const rawYearsToFetch = isTehsil
    ? extracted                              // feed 2017,2018..
    : years.map((y) => `20${y.split("-")[0]}`);  // convert 22-23→2022

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
    if (parts[0].length === 4) clean = `${parts[0].slice(2)}-${parts[1]}`;
    if (parts[1].length === 4) clean = `${parts[0]}-${parts[1].slice(2)}`;
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
        <div className="flex justify-end mb-2">
          <label className="flex items-center gap-2">
            <span>Comparison years</span>
            <input
              type="checkbox"
              checked={showImpact}
              onChange={() => setShowImpact(!showImpact)}
            />
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
