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
import { Proportions } from "lucide-react";

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
const PrecipitationStackChart = ({ feature ,waterbody,typeparam}) => {
  console.log("Reached in the pRecippatiton",feature,waterbody,typeparam)
  if (!feature) return null;
  console.log(feature)

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
        label: "Kharif",
        data: seasonData.kharif,
        backgroundColor: "#1E90FF",
        stack: "precip",
      },
      {
        label: "Kharif Rabi",
        data: seasonData.rabi,
        backgroundColor: "#87CEFA",
        stack: "precip",
      },
      {
        label: "Kharif Rabi Zaid",
        data: seasonData.zaid,
        backgroundColor: "#B0E0E6",
        stack: "precip",
      },
    ];
  }

  const data = { labels, datasets };

  const options = {
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      legend: { position: "top" },
      tooltip: { mode: "index", intersect: false },
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
    <div style={{ width: "100%", height: "100%" }}>
      <Bar data={data} options={options} />
    </div>
  );
};

export default PrecipitationStackChart;
