import React, { useState, useEffect, useRef,useMemo } from "react";
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

const WaterAvailabilityChart = ({
  isTehsil,
  waterbody,
  water_rej_data,
  mwsFeature,
  onImpactYearChange,
}) => {
  const [showImpact, setShowImpact] = useState(false);
  const prevImpactRef = useRef(null);

  const extractSeasonYears = (props = {}) => {
    const years = new Set();
  
    Object.keys(props).forEach((key) => {
      const match = key.match(/^(k_|kr_|krz_)(\d{2}[-_]\d{2})$/);
      if (match) {
        years.add(match[2].replace("_", "-"));
      }
    });
  
    return Array.from(years).sort();
  };

  // 🔧 Normalize Year Helper — ALWAYS returns "YY-YY"
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

const getYearIndex = (year, years) => years.indexOf(year);


  const yearSourceProps = useMemo(() => {
    if (isTehsil) {
      return water_rej_data?.features?.[0]?.properties || {};
    }
  
    if (!water_rej_data?.features?.length || !waterbody) return {};
  
    const feature = water_rej_data.features.find(
      (f) => f.properties?.UID === waterbody.UID
    );

    return feature?.properties || {};
  }, [isTehsil, water_rej_data, waterbody]);

  
  const years = useMemo(() => {
    const extracted = extractSeasonYears(yearSourceProps);
    return extracted;
  }, [yearSourceProps]);

const getProp = (feature, key) => {
  if (!feature) return 0;

  // ✔ If OL Feature (tehsil case)
  if (typeof feature.get === "function") {
    return feature.get(key);
  }

  // ✔ If GeoJSON Feature (project case)
  return feature.properties?.[key] ?? 0;
};

const toLongYear = (year) => {
  const [start, end] = year.split("-");
  return `20${start}-20${end}`;
};

// -------------------------------
// RAINFALL LOGIC FOR TEHSIL + PROJECT
// -------------------------------
const totalRainfall = years.reduce((acc, year) => {
  if (!mwsFeature) {
    acc[`TR${year}`] = 0;
    return acc;
  }

  // ✔️ Project Mode → Use original kharif/rabi/zaid fields
  if (!isTehsil) {
    const longYear = toLongYear(year);
    const kharif = Number(getProp(mwsFeature, `precipitation_kharif_${longYear}`));
    const rabi   = Number(getProp(mwsFeature, `precipitation_rabi_${longYear}`));
    const zaid   = Number(getProp(mwsFeature, `precipitation_zaid_${longYear}`));

acc[`TR${year}`] = kharif + rabi + zaid;

    acc[`TR${year}`] = kharif + rabi + zaid;
    return acc;
  }
  //  TEHSIL MODE → Use Precipitation from values_
  const p = mwsFeature?.values_ ?? {};

  // Convert "17-18" → "2017_2018"
  const [yy1, yy2] = year.split("-");
  const key = `20${yy1}_20${yy2}`; // ex: 2017_2018

  const raw = p[key];
  if (!raw) {
    acc[`TR${year}`] = 0;
    return acc;
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.warn("Error parsing mwsFeature precipitation JSON:", raw);
    parsed = {};
  }

  // THE REAL TEHSIL PRECIPITATION
  const rainfall = Number(parsed?.Precipitation ?? 0);
  acc[`TR${year}`] = rainfall;

  return acc;
}, {});

const computedImpactYear = React.useMemo(() => {
  if (!years?.length || !totalRainfall) return null;

  const interventionYear = (() => {
    if (isTehsil) return "22-23"; // fallback for now
  
    const f = water_rej_data?.features?.find(
      (x) => x.properties?.UID === waterbody?.UID
    );
    let iv = f?.properties?.intervention_year;
    const normalized = normalizeYear(iv);
    return normalized;

    })();
  
  const preYears = years.filter((y) => y < interventionYear);
  const postYears = years.filter((y) => y > interventionYear);

  let minDiff = Infinity;
  let selected = null;

  preYears.forEach((pre) => {
    const preRain = totalRainfall[`TR${pre}`] ?? 0;

    postYears.forEach((post) => {
      const postRain = totalRainfall[`TR${post}`] ?? 0;
      const diff = Math.abs(preRain - postRain);

      if (diff < minDiff) {
        minDiff = diff;
        selected = { pre, post, diff };
      }
    });
  });

  return selected;
}, [years, totalRainfall]);

const hasPostYear = React.useMemo(() => {
  if (!years?.length) return false;

  const interventionYear = (() => {
    if (isTehsil) return null;

    const f = water_rej_data?.features?.find(
      (x) => x.properties?.UID === waterbody?.UID
    );
    return normalizeYear(f?.properties?.intervention_year);
  })();

  if (!interventionYear) return false;

  return years.some((y) => y > interventionYear);
}, [years, water_rej_data, waterbody, isTehsil]);


useEffect(() => {
  if (!computedImpactYear || !onImpactYearChange) return;

  if (
    !prevImpactRef.current ||
    prevImpactRef.current.pre !== computedImpactYear.pre ||
    prevImpactRef.current.post !== computedImpactYear.post
  ) {
    prevImpactRef.current = computedImpactYear;
    onImpactYearChange(computedImpactYear);
  }
}, [computedImpactYear, onImpactYearChange]);

  const groups = {
    "Water Indicators": [
      { key: "kharif", label: "Kharif", color: "#74CCF4" },
      { key: "rabi", label: "Kharif Rabi", color: "#1ca3ec" },
      { key: "zaid", label: "Kharif Rabi Zaid", color: "#0f5e9c" },
    ],
    "Non-water Indicators": [
      { key: "crops", label: "Crops", color: "#BAD93E" },
      { key: "tree", label: "Tree/Forest", color: "#38761d" },
      { key: "shrubs", label: "Shrubs/Scrubs", color: "#eaa4f0" },
      { key: "barren_land", label: "Barren", color: "#A9A9A9" },
      { key: "builtup", label: "Built-up", color: "#ff0000" },
    ],
  };

  let rawData;

  if (isTehsil) {
    //  TEHSIL MODE — only ONE feature exists
    const p = water_rej_data?.features?.[0]?.properties || {};
  
    rawData = years.map((year) => {
      // same logic as project, but reading directly
      const k = p[`k_${year}`] ?? 0;
      const kr = p[`kr_${year}`] ?? 0;
      const krz = p[`krz_${year}`] ?? 0;
  
      return {
        kharif: Math.max(0, k - kr),
        rabi: Math.max(0, kr - krz),
        zaid: krz,
  
        shrubs: p[`shrubs_${year}`] ?? 0,
        single_kharif: p[`single_kharif_${year}`] ?? 0,
        single_non_kharif: p[`single_kharif_no_${year}`] ?? 0,
        tree: p[`tree_${year}`] ?? 0,
        barren_land: p[`barren_land_${year}`] ?? 0,
        double_cropping: p[`double_cropping_${year}`] ?? 0,
        triple_cropping: p[`tripple_cropping_${year}`] ?? 0,
        builtup: p[`build_up_${year}`] ?? 0,
      };
    });
  
  } else {
    // PROJECT MODE — original code
    rawData = years.map(() => ({
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
      if (feature.properties.UID === waterbody.UID) {
        const p = feature.properties;
  
        years.forEach((year, i) => {
          const k = p[`k_${year}`] ?? 0;
          const kr = p[`kr_${year}`] ?? 0;
          const krz = p[`krz_${year}`] ?? 0;
  
          rawData[i].kharif += Math.max(0, k - kr);
          rawData[i].rabi += Math.max(0, kr - krz);
          rawData[i].zaid += krz;
  
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
  }
  
  const normalizedData = rawData.map((yearData) => {
    const total = Object.values(yearData).reduce((sum, v) => sum + v, 0);
    const scale = total > 100 ? 100 / total : 1;
    const scaled = Object.fromEntries(
      Object.entries(yearData).map(([key, value]) => [key, value * scale])
    );
    scaled.crops =
      (scaled.single_kharif ?? 0) +
      (scaled.single_non_kharif ?? 0) +
      (scaled.double_cropping ?? 0) +
      (scaled.triple_cropping ?? 0);
    return scaled;
  });

  let data;

  const baseData = {
    labels: years,
    datasets: [],
  };

  Object.entries(groups).forEach(([groupName, items]) => {
    const orderedItems =
      groupName === "Water Indicators" ? [...items].reverse() : items;

    orderedItems.forEach((cat) => {
      baseData.datasets.push({
        label: `${groupName} | ${cat.label}`,
        backgroundColor: cat.color,
        data: normalizedData.map((d) => d[cat.key]),
        order: 2,
        stack: "Stack 0",
      });
    });
  });

  if (!showImpact) {
    baseData.datasets.push({
      type: "line",
      label: "Total Rainfall (mm)",
      data: years.map((year) => totalRainfall[`TR${year}`] ?? 0),
      borderColor: "#4F555F",
      backgroundColor: "#4F555F",
      yAxisID: "y1",
      pointRadius: 4,
      pointBackgroundColor: "#4F555F",
      order: 1,
    });
  }

  if (!showImpact || !computedImpactYear || !hasPostYear) {
    data = baseData;
  } else if (computedImpactYear) {
    const waterIndicators = ["kharif", "rabi", "zaid"];

    data = {
      labels: years, // keep all years visible
      datasets: [...waterIndicators].reverse().map((key) => {
        const cat = groups["Water Indicators"].find((c) => c.key === key);
        return {
          label: `Water Indicators | ${cat.label}`,
          backgroundColor: cat.color,
          stack: "Stack 0",
          order: 2,
          //  only show bars for impact years, set others to 0
          data: years.map((year, i) => {
            const isImpactYear =
            year === computedImpactYear.pre || year === computedImpactYear.post;
            return isImpactYear ? normalizedData[i][key] ?? 0 : 0;
          }),
          position: "center",
        };
      }),
    };
  }

  const options = {
    maintainAspectRatio: false,
    responsive: true,
    layout: {
      padding: { top: 0, bottom: 10, left: 10, right: 10 },
    },
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: isTehsil
          ? "Water Availabilty & Land use inside Waterbody"
          : !showImpact || !computedImpactYear || !hasPostYear
            ? "Water Availabilty & Land use inside Waterbody (Black line = intervention year)"
            : `Impact Analysis: Showing Only Pre (${computedImpactYear.pre}) and Post (${computedImpactYear.post}) Years`,
            font: {
              font: {
                size: Math.max(9, Math.min(window.innerHeight * 0.02, 18)),
                weight: "bold",
              }
                         
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
                    font: { weight: "bold" },
                  },
                },
              };
            })(),
      },
      
      
    },
    scales: {
      x: {
        stacked: true,
        title: { display: true, text: "Year" },
      },
      y: {
        stacked: true,
        min: 0,
        max: 100,
        title: {
          display: true,
          text: "Water Availability (%) in Waterbody area",
          font: {
            size: Math.max(9, Math.min(window.innerWidth * 0.012, 8)), // responsive
          },
        },

      },
      //  always reserve y1 scale space even if not visible
      y1: {
        position: "right",
        display: true,
        title: { display: true, text: "Rainfall (mm)" },
        grid: { drawOnChartArea: false },
        // Trick: keep same pixel width so chart doesn’t expand/shrink
        afterFit: (axis) => {
          axis.width = 60; // force same width always
        },
        ticks: {
          display: !showImpact, // hide ticks visually in impact view
        },
        title: {
          display: !showImpact,
          text: "Rainfall (mm)",
        },
      },
    },
  };

  
  return (
    <div className="w-full chart-wrapper">
<div
  className="legend-container flex flex-col mb-1 px-2"
  style={{
    minHeight: "clamp(6rem, 15vh, 10rem)",
    overflow: "hidden",
    rowGap: "0.15rem",
  }}
>
  <div className="flex flex-wrap items-start w-full relative gap-x-[0.3rem] gap-y-[0.2rem]">

    {/* Keep your original legend rendering exactly as before */}
    {(!showImpact || !computedImpactYear || !hasPostYear) && (
  Object.entries(groups).map(([group, items]) => (
    <div key={group} className="min-w-[5rem] mb-[0.3rem]">
      <strong className="block text-[clamp(0.40rem,0.50rem,0.60rem)] mb-[0.3rem]">
        {group}
      </strong>

      {items.map((item) => (
        <div
          key={item.key}
          className="flex items-center ml-[0.3rem] mt-[0.2rem] whitespace-nowrap"
        >
          <span
            className="inline-block rounded-sm mr-[0.25rem]"
            style={{
              width: "clamp(0.45rem, 0.55rem, 0.65rem)",
              height: "clamp(0.45rem, 0.55rem, 0.65rem)",
              backgroundColor: item.color,
            }}
          ></span>

          <span className="legend-label text-[clamp(0.45rem,0.55rem,0.65rem)]">
            {item.label}
          </span>
        </div>
      ))}

      {group === "Water Indicators" && (
        <div className="flex items-center mt-[0.3rem] ml-[0.3rem]">
          <span
            className="inline-block mr-[0.25rem]"
            style={{
              width: "clamp(0.6rem, 0.8rem, 1rem)",
              height: "0.2rem",
              backgroundColor: "#4F555F",
            }}
          ></span>

          <span className="font-medium text-gray-700 text-[clamp(0.4rem,0.4rem,0.4rem)]">
            Total Rainfall (mm)
          </span>
        </div>
      )}
    </div>
  ))
)}


{showImpact && !hasPostYear && (
  <div className="mx-auto mt-2 text-center text-[clamp(0.55rem,0.6rem,0.8rem)] text-orange-700 bg-orange-50 border border-orange-200 rounded-md px-3 py-2 w-fit">
    No data available for post intervention year.  
    Please wait for next year’s data.
  </div>
)}

    {/* Toggle always rendered once */}
    {!isTehsil && (
  <div
    className="flex items-center ml-auto self-start mt-[0.15rem] sm:mt-0 text-right"
    style={{
      transformOrigin: "right top",
      transform: "scale(0.8)",
      whiteSpace: "nowrap",
    }}
  >
    <span
      className="font-medium mr-[0.4rem] leading-tight text-gray-700"
      style={{ fontSize: "clamp(0.5rem, 0.55rem, 0.8rem)" }}
    >
      {showImpact ? "Comparison years" : "Comparison years"}
    </span>

    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={showImpact}
        onChange={() => setShowImpact(!showImpact)}
        className="sr-only peer"
      />

      <div
        className="bg-gray-300 rounded-full peer peer-checked:bg-blue-600 transition-all"
        style={{
          width: "clamp(1.6rem, 2rem, 2.4rem)",
          height: "clamp(0.9rem, 1.1rem, 1.4rem)",
        }}
      ></div>

      <div
        className="absolute bg-white rounded-full transition-all"
        style={{
          width: "clamp(0.7rem, 0.9rem, 1.1rem)",
          height: "clamp(0.7rem, 0.9rem, 1.1rem)",
          top: "0.1rem",
          left: "0.1rem",
        }}
      ></div>
    </label>
  </div>
)}

  </div>

  {showImpact && hasPostYear &&(
    <div className="flex flex-col items-start justify-start mt-[0.4rem] whitespace-nowrap">
      <div className="flex items-center mb-[0.2rem]">
        <span
          className="inline-block rounded-sm mr-[0.3rem]"
          style={{ width: "0.8rem", height: "0.8rem", backgroundColor: "#74CCF4" }}
        ></span>
        <span className="text-[clamp(0.7rem,0.55rem,0.9rem)] text-gray-700 font-medium">
          Kharif : Water available in Kharif
        </span>
      </div>

      <div className="flex items-center mb-[0.2rem]">
        <span
          className="inline-block rounded-sm mr-[0.3rem]"
          style={{ width: "0.8rem", height: "0.8rem", backgroundColor: "#1ca3ec" }}
        ></span>
        <span className="text-[clamp(0.7rem,0.55rem,0.9rem)] text-gray-700 font-medium">
          Kharif Rabi : Water available in Kharif, Rabi
        </span>
      </div>

      <div className="flex items-center mb-[0.2rem]">
        <span
          className="inline-block rounded-sm mr-[0.3rem]"
          style={{ width: "0.8rem", height: "0.8rem", backgroundColor: "#0f5e9c" }}
        ></span>
        <span className="text-[clamp(0.7rem,0.55rem,0.9rem)] text-gray-700 font-medium">
          Kharif Rabi Zaid : Water available in Kharif, Rabi And Zaid
        </span>
      </div>

      {showImpact && computedImpactYear && (
        <div className="mx-auto w-fit text-[clamp(0.55rem,0.55rem, 0.8rem)] text-gray-700 rounded-md px-[0.3rem] py-[0.15rem] text-center shadow-sm">
          <p>
            Criteria for selecting the pre and post intervention years selected are <br />
            with minimum difference in rainfall.
          </p>
        </div>
      )}
    </div>
  )}
</div>



      {/* Chart wrapper: fix the chart area height so it doesn't reflow */}
      <div className="chart-container w-full px-0"   style={{ height: "clamp(280px, 40vh, 450px)" }}
      >
        <Bar data={data} options={options} />
      </div>
    </div>
  );
};

export default WaterAvailabilityChart;
