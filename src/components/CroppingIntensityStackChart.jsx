import React, { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend
);

const CroppingIntensityStackChart = ({ zoiFeatures }) => {
  console.log(zoiFeatures);
  const featuresWithArea = zoiFeatures.map((feature) => {
    const zoiRadius = feature.get("zoi"); // in meters
    const areaSqMeters = Math.PI * Math.pow(zoiRadius, 2);
    const areaHectares = areaSqMeters / 10000; // 1 ha = 10,000 m²

    feature.set("zoi_area_sqm", areaSqMeters);
    feature.set("zoi_area_ha", areaHectares);

    return feature;
  });
  console.log(featuresWithArea);
  const yearLabels = [
    "2017-18",
    "2018-19",
    "2019-20",
    "2020-21",
    "2021-22",
    "2022-23",
    "2023-24",
  ];

  const yearSuffix = ["2017", "2018", "2019", "2020", "2021", "2022", "2023"];

  const areaByType = useMemo(() => {
    const initData = yearSuffix.map(() => ({
      triple: 0,
      double: 0,
      single_kharif: 0,
      single_non_kharif: 0,
    }));

    zoiFeatures.forEach((feature) => {
      yearSuffix.forEach((year, index) => {
        const triple = feature.get(`triply_cropped_area_${year}`) || 0;
        const double = feature.get(`doubly_cropped_area_${year}`) || 0;
        const singleKharif =
          feature.get(`single_kharif_cropped_area_${year}`) || 0;
        const singleNonKharif =
          feature.get(`single_non_kharif_cropped_area_${year}`) || 0;

        initData[index].triple += triple;
        initData[index].double += double;
        initData[index].single_kharif += singleKharif;
        initData[index].single_non_kharif += singleNonKharif;
      });
    });

    return initData;
  }, [zoiFeatures]);

  const data = {
    labels: yearLabels,
    datasets: [
      {
        label: "Triple Crop",
        data: areaByType.map((a) => a.triple),
        backgroundColor: "#b3561d", // orange
      },
      {
        label: "Double Crop",
        data: areaByType.map((a) => a.double),
        backgroundColor: "#FF9371", // green
      },
      {
        label: "Single Non-Kharif",
        data: areaByType.map((a) => a.single_non_kharif),
        backgroundColor: "#f59d22", // purple
      },
      {
        label: "Single Kharif",
        data: areaByType.map((a) => a.single_kharif),
        backgroundColor: "#74CCF4", // blue
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "bottom",
      },
      title: {
        display: true,
        text: "Cropping Intensity by Year (ZOI-wise)",
      },
    },
    scales: {
      x: {
        stacked: true,
        title: {
          display: true,
          text: "Year",
        },
      },
      y: {
        stacked: true,
        title: {
          display: true,
          text: "Area (hectares)",
        },
      },
    },
  };

  return <Bar data={data} options={options} />;
};

export default CroppingIntensityStackChart;
