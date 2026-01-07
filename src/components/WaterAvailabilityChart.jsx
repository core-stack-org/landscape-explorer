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

  const yearSourceProps = useMemo(() => {
    if (isTehsil) {
      return water_rej_data?.features?.[0]?.properties || {};
    }
  
    if (!water_rej_data?.features?.length || !waterbody) return {};
  
    const feature = water_rej_data.features.find(
      (f) => f.properties?.UID === waterbody.UID
    );
  
    if (!isTehsil) {
      console.log("📌 Matched Project Feature =>", feature);
    }

    return feature?.properties || {};
  }, [isTehsil, water_rej_data, waterbody]);

  
  const years = useMemo(() => {
    const extracted = extractSeasonYears(yearSourceProps);
    console.log("✅ WaterAvailabilityChart extracted years:", extracted);
    return extracted;
  }, [yearSourceProps]);
  

  console.log("isTehsil:", isTehsil);
console.log("years:", years);


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
  console.log(f)
  let iv = f?.properties?.intervention_year;
  if (!iv || typeof iv !== "string" || !iv.includes("-")) {
    iv = "22-23";
  }
  return iv;
    })();
  
  console.log(interventionYear)
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

  console.log(
    "🎯 IMPACT YEAR SELECTION →",
    "intervention:", interventionYear,
    "pre:", selected?.pre,
    "post:", selected?.post
  );
  
  return selected;
}, [years, totalRainfall]);

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

  if (!showImpact || !computedImpactYear) {
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
          // ✅ only show bars for impact years, set others to 0
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
      padding: { top: 10, bottom: 10, left: 10, right: 10 },
    },
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: isTehsil
          ? "Water Availabilty & Land use inside Waterbody"
          : !showImpact
            ? "Water Availabilty & Land use inside Waterbody (Black line = intervention year)"
            : "Impact Analysis Graph (Black line = intervention year)",
        font: { size: 16, weight: "bold" },
      },
      
      annotation: {
        annotations: isTehsil
          ? {}
          : (() => {
              const f = water_rej_data?.features?.find(
                (x) => x.properties?.UID === waterbody?.UID
              );
              const interventionYear = (() => {
                if (isTehsil) return "22-23";
              
                const iv = f?.properties?.intervention_year;
                return typeof iv === "string" && iv.includes("-")
                  ? iv
                  : "22-23";
              })();
              
      
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
        },
      },
      // ✅ always reserve y1 scale space even if not visible
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
    <div className="w-full">
      <div
        className="flex flex-col mb-2 px-4"
        style={{
          minHeight: "120px",
          maxHeight: "134px",
          overflow: "hidden",
          fontSize: "clamp(0.55rem, 0.8vw, 0.8rem)",
          transition: "all 0.3s ease-in-out",
        }}
      >
        <div className="flex flex-wrap items-start w-full relative gap-x-3 gap-y-1">
          {/* Keep your original legend rendering exactly as before */}
          {!showImpact &&
            Object.entries(groups).map(([group, items]) => (
              <div key={group} className="min-w-[130px] mb-1">
                <strong className="block mb-1">{group}</strong>
                {items.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center ml-2 mt-1 whitespace-nowrap"
                  >
                    <span
                      className="inline-block rounded-sm mr-2"
                      style={{
                        width: "clamp(10px, 1.5vw, 14px)",
                        height: "clamp(10px, 1.5vw, 14px)",
                        backgroundColor: item.color,
                      }}
                    ></span>
                    <span className="legend-label">{item.label}</span>
                  </div>
                ))}
                {group === "Water Indicators" && (
                  <div className="flex items-center mt-2 ml-2">
                    <span
                      className="inline-block mr-2"
                      style={{
                        width: "clamp(20px, 3vw, 30px)",
                        height: 2,
                        backgroundColor: "#4F555F",
                      }}
                    ></span>
                    <span className="font-medium text-gray-700">
                      Total Rainfall (mm)
                    </span>
                  </div>
                )}
              </div>
            ))}

          {/* Toggle always rendered once (unchanged) */}
          {!isTehsil && (
          <div className="flex items-center ml-auto mt-2 sm:mt-0 absolute right-0 top-0 text-right">
            <span
              className="font-medium mr-2 leading-tight w-auto whitespace-nowrap text-gray-700"
              style={{ fontSize: "clamp(0.55rem, 0.8vw, 0.75rem)" }}
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
              <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-blue-600 transition-all"></div>
              <div className="absolute left-0.5 top-0.5 bg-white w-5 h-5 rounded-full peer-checked:translate-x-5 transition-all"></div>
            </label>
          </div>
          )}
        </div>

        {/* Impact-only legends (keeps same place, doesn't change layout since minHeight above is set) */}
        {showImpact && (
          <div className="flex flex-col items-start justify-start gap-2 mt-4 whitespace-nowrap">
            <div className="flex items-center">
              <span
                className="inline-block w-4 h-4 rounded-sm mr-2"
                style={{ backgroundColor: "#74CCF4" }}
              ></span>
              <span className="text-sm text-gray-700 font-medium">
                Kharif : Water available in Kharif
              </span>
            </div>
            <div className="flex items-center">
              <span
                className="inline-block w-4 h-4 rounded-sm mr-2"
                style={{ backgroundColor: "#1ca3ec" }}
              ></span>
              <span className="text-sm text-gray-700 font-medium">
                Kharif Rabi : Water available in Kharif, Rabi
              </span>
            </div>
            <div className="flex items-center">
              <span
                className="inline-block w-4 h-4 rounded-sm mr-2"
                style={{ backgroundColor: "#0f5e9c" }}
              ></span>
              <span className="text-sm text-gray-700 font-medium">
                Kharif Rabi Zaid : Water available in Kharif, Rabi And Zaid
              </span>
            </div>
            {showImpact && computedImpactYear && (
              <div className=" mx-auto w-fit text-xs sm:text-xs text-gray-700 rounded-md px-1 py-0.5  text-center shadow-sm">
                <p>
                  Criteria for selecting the pre and post intervention years
                  selected are <br /> with minimum difference in rainfall.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chart wrapper: fix the chart area height so it doesn't reflow */}
      <div className="w-full px-0" style={{ minHeight: "280px" }}>
        <Bar data={data} options={options} />
      </div>
    </div>
  );
};

export default WaterAvailabilityChart;
