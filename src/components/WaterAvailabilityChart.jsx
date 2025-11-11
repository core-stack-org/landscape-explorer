import React, { useState, useEffect, useRef } from "react";
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

const WaterAvailabilityChart = ({
  waterbody,
  water_rej_data,
  mwsFeature,
  onImpactYearChange,
}) => {
  const [showImpact, setShowImpact] = useState(false);
  const prevImpactRef = useRef(null);

  const yearMap = {
    "17-18": "2017-2018",
    "18-19": "2018-2019",
    "19-20": "2019-2020",
    "20-21": "2020-2021",
    "21-22": "2021-2022",
    "22-23": "2022-2023",
    "23-24": "2023-2024",
  };

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
    if (feature.properties.UID === waterbody.UID) {
      const p = feature.properties;
      years.forEach((year, i) => {
        const k = p[`k_${year}`] ?? 0;
        const kr = p[`kr_${year}`] ?? 0;
        const krz = p[`krz_${year}`] ?? 0;

        const kharif = Math.max(0, k - kr);
        const rabi = Math.max(0, kr - krz);
        const zaid = krz;

        rawData[i].rabi += rabi;
        rawData[i].zaid += zaid;
        rawData[i].kharif += kharif;
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

  const interventionYear = "22-23";
  const preYears = years.filter((y) => y < interventionYear);
  const postYears = years.filter((y) => y > interventionYear);
  let minDiff = Infinity;
  let impactYear = null;

  preYears.forEach((pre) => {
    const preRain = totalRainfall[`TR${pre}`] ?? 0;
    postYears.forEach((post) => {
      const postRain = totalRainfall[`TR${post}`] ?? 0;
      const diff = Math.abs(preRain - postRain);
      if (diff < minDiff) {
        minDiff = diff;
        impactYear = { pre, post, diff };
      }
    });
  });

  useEffect(() => {
    if (!impactYear || !onImpactYearChange) return;
    const hasChanged =
      !prevImpactRef.current ||
      prevImpactRef.current.pre !== impactYear.pre ||
      prevImpactRef.current.post !== impactYear.post;
    if (hasChanged) {
      prevImpactRef.current = impactYear;
      onImpactYearChange(impactYear);
    }
  }, [impactYear, onImpactYearChange]);

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

  if (!showImpact) {
    data = baseData;
  } else if (impactYear) {
    const waterIndicators = ["kharif", "rabi", "zaid"];

    data = {
      labels: years, // ✅ keep all years visible
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
              year === impactYear.pre || year === impactYear.post;
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
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: !showImpact
          ? "Land Use Categories vs Rainfall (Black line = intervention year)"
          : "Impact Analysis Graph",
        font: { size: 16, weight: "bold" },
      },
      annotation: {
        annotations: !showImpact
          ? {
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
            }
          : {},
      },
    },
    scales: {
      x: {
        stacked: true,
        title: {
          display: true,
          text: showImpact
            ? "Year (All years shown, only pre & post visible)"
            : "Year",
        },
      },
      y: {
        stacked: true,
        title: {
          display: true,
          text: showImpact
            ? "Water Availability (%) in Waterbody area"
            : "Land Use (%) in Waterbody area ",
        },
        min: 0,
        max: 100,
      },
      y1: !showImpact
        ? {
            position: "right",
            title: { display: true, text: "Rainfall (mm)" },
            grid: { drawOnChartArea: false },
          }
        : undefined,
    },
  };

  return (
    <div style={{ width: "100%", height: "80%" }}>
      <div className="flex flex-col mb-2 px-4">
        <div className="flex flex-wrap items-start text-xs sm:text-sm w-full relative gap-x-3 gap-y-1">
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
                    {item.label}
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
                    <span className="text-sm font-medium text-gray-700">
                      Total Rainfall (mm)
                    </span>
                  </div>
                )}
              </div>
            ))}

          {/* Toggle always rendered once */}
          <div className="flex items-center ml-auto mt-2 sm:mt-0 absolute right-0 top-0 text-right">
            <span className="text-[0.8rem] text-gray-700 font-medium mr-2 leading-tight w-[130px] sm:w-[150px]">
              {showImpact ? (
                <>
                  Toggle to see <br /> Water availability Graph
                </>
              ) : (
                <>
                  Toggle to see <br /> Impact Analysis Graph
                </>
              )}
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
        </div>

        {/* Impact-only legends */}
        {showImpact && (
          <div className="flex flex-col items-start justify-start gap-2 mt-4 whitespace-nowrap">
            <div className="flex items-center">
              <span
                className="inline-block w-4 h-4 rounded-sm mr-2"
                style={{ backgroundColor: "#74CCF4" }}
              ></span>
              <span className="text-sm text-gray-700 font-medium">
                Kharif (k) : Water available in Kharif
              </span>
            </div>
            <div className="flex items-center">
              <span
                className="inline-block w-4 h-4 rounded-sm mr-2"
                style={{ backgroundColor: "#1ca3ec" }}
              ></span>
              <span className="text-sm text-gray-700 font-medium">
                Kharif Rabi (kr) : Water available in Kharif, Rabi
              </span>
            </div>
            <div className="flex items-center">
              <span
                className="inline-block w-4 h-4 rounded-sm mr-2"
                style={{ backgroundColor: "#0f5e9c" }}
              ></span>
              <span className="text-sm text-gray-700 font-medium">
                Kharif Rabi Zaid (krz) : Water available in Kharif, Rabi And
                Zaid
              </span>
            </div>
          </div>
        )}
      </div>

      <Bar data={data} options={options} />

      {showImpact && impactYear && (
        <div className="mt-4 mx-auto w-fit text-xs sm:text-sm text-gray-700 border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-center shadow-sm">
          <p className="mt-1">
            Pre and post intervention years selected with minimum difference in
            rainfall:
          </p>
          <div className="mt-1">
            <p>
              <span className="font-semibold">Year of Intervention:</span>{" "}
              <span className=" text-blue-700">{interventionYear}</span>.
            </p>
            <p>
              <span className="font-semibold">Pre-intervention year:</span>{" "}
              <span className="text-blue-700">{impactYear.pre}</span>
            </p>
            <p>
              <span className="font-semibold">Post-intervention year:</span>{" "}
              <span className="text-green-700">{impactYear.post}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WaterAvailabilityChart;
