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
import annotationPlugin from "chartjs-plugin-annotation";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, annotationPlugin);

const DroughtChart = ({ mwsGeoData, waterbody, typeparam , impactYear, interventionYear, showImpact, setShowImpact }) => {
  if (!mwsGeoData || !waterbody) return null;

  // GET UID
 const rawMwsUid =
  typeparam === "tehsil"
    ? (
        waterbody?.properties?.MWS_UID ??
        waterbody?.properties?.mws_uid_list
      )?.toString()?.trim()
    : (
        waterbody?.MWS_UID ??
        waterbody?.mws_uid_list
      )?.toString()?.trim();

if (!rawMwsUid) return null;

const normalizeYear = (iv) => {
  if (!iv || typeof iv !== "string" || !iv.includes("-")) return null;

  const clean = iv.replace(/_/g, "-").trim();
  const parts = clean.split("-");

  if (parts[0].length === 2 && parts[1].length === 2) {
    return clean;
  }

  if (parts[0].length === 4 && parts[1].length === 2) {
    return `${parts[0].slice(2)}-${parts[1]}`;
  }

  if (parts[0].length === 2 && parts[1].length === 4) {
    return `${parts[0]}-${parts[1].slice(2)}`;
  }

  if (parts[0].length === 4 && parts[1].length === 4) {
    return `${parts[0].slice(2)}-${parts[1].slice(2)}`;
  }

  return null;
};

const normalizedInterventionYear = normalizeYear(interventionYear);


const mwsUidList = rawMwsUid.includes("|")
  ? rawMwsUid
      .split("|")
      .map((id) => id.trim())
      .filter(Boolean)
  : rawMwsUid
      .split("_")
      .reduce((acc, val, idx, arr) => {
        if (idx % 2 === 0 && arr[idx + 1]) {
          acc.push(`${val}_${arr[idx + 1]}`);
        }
        return acc;
      }, []);
  let matchedFeature = null;

  // PROJECT MODE
if (typeparam === "project") {
  matchedFeature = mwsGeoData?.features?.find((f) => {
    const uid =
      f.properties?.uid?.toString()?.trim() ||
      f.properties?.MWS_UID?.toString()?.trim();

    return mwsUidList.includes(uid);
  });
}

  // TEHSIL MODE
 if (typeparam === "tehsil") {
  matchedFeature = mwsGeoData.find((f) => {
    const p = f.getProperties();

    const uid =
      p.uid?.toString()?.trim() ||
      p.MWS_UID?.toString()?.trim();

    return mwsUidList.includes(uid);
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


const isImpactMode = showImpact && impactYear?.pre && impactYear?.post;

const data = {
  labels: sliderYears,
  datasets: [
    {
      label: "Moderate Weeks",
      data: w_mod.map((value, index) =>
        !isImpactMode ||
        sliderYears[index] === impactYear.pre ||
        sliderYears[index] === impactYear.post
          ? value
          : 0
      ),
      backgroundColor: "#EB984E",
    },
    {
      label: "Severe Weeks",
      data: w_sev.map((value, index) =>
        !isImpactMode ||
        sliderYears[index] === impactYear.pre ||
        sliderYears[index] === impactYear.post
          ? value
          : 0
      ),
      backgroundColor: "#E74C3C",
    },
    {
      label: "Dry Spell Weeks",
      data: drysp.map((value, index) =>
        !isImpactMode ||
        sliderYears[index] === impactYear.pre ||
        sliderYears[index] === impactYear.post
          ? value
          : 0
      ),
      backgroundColor: "#8884d8",
    },
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
           title: {
              display: true,
              text:
                showImpact && impactYear?.pre && impactYear?.post
                  ? `Impact Analysis: Showing Only Pre (${impactYear.pre}) and Post (${impactYear.post}) Years`
                  : "Drought Incidence",
            },
            legend: {
              position: "bottom",
            },
            annotation: {
              annotations: normalizedInterventionYear
                ? {
                    interventionLine: {
                      type: "line",
                      scaleID: "x",
                      value: normalizedInterventionYear,
                      borderColor: "black",
                      borderWidth: 2,
                      label: {
                        content: `Intervention Year (${normalizedInterventionYear})`,
                        enabled: true,
                        position: "start",
                        color: "black",
                        font: {
                          weight: "bold",
                        },
                      },
                    },
                  }
                : {},
            },
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
