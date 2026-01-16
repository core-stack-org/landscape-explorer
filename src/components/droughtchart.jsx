import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const DroughtChart = ({ mwsGeoData, waterbody, typeparam }) => {
  if (!mwsGeoData || !waterbody) return null;

  // GET UID
  let mwsUid =
    typeparam === "tehsil"
      ? waterbody?.properties?.MWS_UID?.toString()?.trim()
      : waterbody?.MWS_UID?.toString()?.trim();

  if (!mwsUid) return null;

  const parts = mwsUid.split("_");
  const partialUid = parts.length >= 2 ? `${parts[0]}_${parts[1]}` : mwsUid;

  let matchedFeature = null;

  // PROJECT MODE
  if (typeparam === "project") {
    matchedFeature =
      mwsGeoData?.features?.find(
        (f) =>
          f.properties?.uid?.toString()?.trim() === mwsUid ||
          f.properties?.MWS_UID?.toString()?.trim() === mwsUid
      ) ||
      mwsGeoData?.features?.find((f) => {
        const p = f.properties || {};
        return (
          p.uid?.toString()?.trim()?.includes(partialUid) ||
          p.MWS_UID?.toString()?.trim()?.includes(partialUid)
        );
      });
  }

  // TEHSIL MODE
  if (typeparam === "tehsil") {
    matchedFeature =
      mwsGeoData.find((f) => {
        const p = f.getProperties();
        return (
          p.uid?.toString()?.trim() === mwsUid ||
          p.MWS_UID?.toString()?.trim() === mwsUid
        );
      }) ||
      mwsGeoData.find((f) => {
        const p = f.getProperties();
        return (
          p.uid?.toString()?.trim()?.includes(partialUid) ||
          p.MWS_UID?.toString()?.trim()?.includes(partialUid)
        );
      });
  }

  if (!matchedFeature) return null;

  const props =
    typeparam === "project"
      ? matchedFeature.properties
      : matchedFeature.getProperties();

  // -------------------------
  // 🔹 AUTO-DETECT ALL YEARS
  // -------------------------
  const yearSet = new Set();

  Object.keys(props).forEach((key) => {
    // tehsil → w_mod_2017
    let matchTehsil = key.match(/^(w_mod|w_sev|drysp)_(\d{4})$/);
    if (matchTehsil) yearSet.add(matchTehsil[2]);

    // project → drought_w_mod_2017
    let matchProj = key.match(/^drought_(w_mod|w_sev|drysp)_(\d{4})$/);
    if (matchProj) yearSet.add(matchProj[2]);
  });

  const sortedFullYears = Array.from(yearSet).sort();
  const sliderYears = sortedFullYears.map((y) => `${y.slice(2)}-${(+y.slice(2) + 1).toString().padStart(2, "0")}`);

  // -------------------------
  // 🔹 EXTRACT VALUES
  // -------------------------
  const w_mod = sortedFullYears.map((year) =>
    typeparam === "tehsil"
      ? Number(props[`w_mod_${year}`] ?? 0)
      : Number(props[`drought_w_mod_${year}`] ?? 0)
  );

  const w_sev = sortedFullYears.map((year) =>
    typeparam === "tehsil"
      ? Number(props[`w_sev_${year}`] ?? 0)
      : Number(props[`drought_w_sev_${year}`] ?? 0)
  );

  const drysp = sortedFullYears.map((year) =>
    typeparam === "tehsil"
      ? Number(props[`drysp_${year}`] ?? 0)
      : Number(props[`drought_drysp_${year}`] ?? 0)
  );


  const data = {
    labels: sliderYears,
    datasets: [
      { label: "Moderate Weeks", data: w_mod, backgroundColor: "#EB984E" },
      { label: "Severe Weeks", data: w_sev, backgroundColor: "#E74C3C" },
      { label: "Dry Spell Weeks", data: drysp, backgroundColor: "#8884d8" },
    ],
  };

  return (
    <div className=" px-0 ml-6" style={{ height: "clamp(300px, 45vh, 400px)",width:"94%"  }}>
      <Bar
        data={data}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: { display: true, text: "Drought Incidence" },
            legend: { position: "bottom" },
          },
          scales: {
            x: {
              title: {
                display: true,
                text: "Year",
                font: { size: 14 },
              },
            },
            y: {
              title: {
                display: true,
                text: "No. of Weeks",
                font: { size: 14 },
              },
              beginAtZero: true,
            },}
        }}
      />
    </div>
  );
};

export default DroughtChart;
