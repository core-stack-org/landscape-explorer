import React from "react";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

  // PROJECT MODE PARSING (unchanged)
const extractProjectSeasonalData = (properties) => {
  
  const seasons = ["kharif", "rabi", "zaid"];
  const yearMap = new Map();

  Object.keys(properties).forEach((key) => {
    const match = key.match(
      /^precipitation_(kharif|rabi|zaid)_(\d{4})-(\d{4})$/
    );
    if (match) {
      const fullYear = `${match[2]}-${match[3]}`;
      const shortYear = `${match[2].slice(2)}-${match[3].slice(2)}`;
      yearMap.set(fullYear, shortYear);
    }
  });

  const sortedFullYears = Array.from(yearMap.keys()).sort();
  const seasonData = { kharif: [], rabi: [], zaid: [] };

  sortedFullYears.forEach((fullYear) => {
    seasons.forEach((season) => {
      seasonData[season].push(
        properties[`precipitation_${season}_${fullYear}`] ?? 0
      );
    });
  });

  return {
    years: sortedFullYears.map((full) => yearMap.get(full)),
    seasonData,
  };
};

   //TEHSIL MODE PARSING (ONLY precipitation, short years)
const extractTehsilRainfall = (values_) => {
  const years = [];
  const rainfall = [];

  Object.keys(values_)
    .filter((key) => /^\d{4}_\d{4}$/.test(key)) // only 2017_2018 type
    .sort()
    .forEach((key) => {
      const raw = values_[key];
      let parsed = {};

      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        console.warn("Invalid JSON in tehsil precipitation:", raw);
      }

      // Convert 2017_2018 → 17-18
      const [y1, y2] = key.split("_");
      const shortYear = `${y1.slice(2)}-${y2.slice(2)}`;

      years.push(shortYear);
      rainfall.push(Number(parsed.Precipitation ?? 0));
    });

  return { years, rainfall };
};

   //MAIN COMPONENT
const PrecipitationStackChart = ({ feature ,waterbody,typeparam,water_rej_data}) => {
  if (!feature) return null;

  const isTehsil = feature.values_ !== undefined;
  let labels = [];
  let datasets = [];


    // TEHSIL MODE
  if (isTehsil) {
    const { years, rainfall } = extractTehsilRainfall(feature.values_);

    labels = years;
    datasets = [
      {
        label: "Rainfall (mm)",
        data: rainfall,
        backgroundColor: "#1E90FF",
      },
    ];
  }

     //PROJECT MODE

  else {
    if (!feature.properties) return null;

    const { years, seasonData } =
      extractProjectSeasonalData(feature.properties);

    labels = years;
    datasets = [
      {
        label: "Zaid",
        data: seasonData.zaid,
        backgroundColor: "#0f5e9c",
        stack: "precip",
      },
      {
        label: "Rabi",
        data: seasonData.rabi,
        backgroundColor: "#1ca3ec",
        stack: "precip",
      },
      {
        label: "Kharif",
        data: seasonData.kharif,
        backgroundColor: "#74CCF4",
        stack: "precip",
      },

 
    ];
  }

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

  const interventionYear = (() => {
    if (isTehsil) return "22-23"; // fallback for now
  
    const f = water_rej_data?.features?.find(
      (x) => x.properties?.UID === waterbody?.UID
    );
    let iv = f?.properties?.intervention_year;
    const normalized = normalizeYear(iv);
    console.log("🎯 Normalized IV:", normalized);
    return normalized;
    })();

  const data = { labels, datasets };

  const options = {
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      legend: { position: "bottom" },
      title:{display:true,text:"Rainfall (in mm) (Black line = intervention year)",position:"top",font: { size: 16, weight: "bold" },},
      tooltip: { mode: "index", intersect: false },
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
      x: { stacked: !isTehsil },
      y: {
        stacked: !isTehsil,
        title: { display: true, text: "Rainfall (mm)" },
      },
    },
  };

  return (
<div
  className="chart-container px-0 w-full"
  style={{ height: "clamp(280px, 40vh, 450px)" }}
>
  <Bar data={data} options={options} />
</div>
     
  );
};

export default PrecipitationStackChart;
