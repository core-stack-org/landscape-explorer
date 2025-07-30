import { Bar } from "react-chartjs-2";

const CroppingIntensityStackChart = ({ zoiFeatures, waterbody }) => {
  const yearLabels = [
    "2017-18",
    "2018-19",
    "2019-20",
    "2020-21",
    "2021-22",
    "2022-23",
    "2023-24",
  ];

  const yearSuffix = [
    "17-18",
    "18-19",
    "19-20",
    "20-21",
    "21-22",
    "22-23",
    "23-24",
  ];

  // ✅ Match only one feature
  const matchedFeature = zoiFeatures.find(
    (feature) =>
      feature.get("waterbody_name")?.toLowerCase() ===
      waterbody?.waterbody?.toLowerCase()
  );

  if (!matchedFeature) return null; // or show "No data found"

  const zoi_area = matchedFeature.get("zoi_area") || 0;

  const areaByType = yearSuffix.map((suffix) => ({
    year: suffix,
    triple: matchedFeature.get(`tripple_cropping_${suffix}`) || 0,
    double: matchedFeature.get(`double_cropping_${suffix}`) || 0,
    single_kharif: matchedFeature.get(`single_kharif_${suffix}`) || 0,
    single_non_kharif: matchedFeature.get(`single_non_kharif_${suffix}`) || 0,
  }));

  const data = {
    labels: yearLabels,
    datasets: [
      {
        label: "Triple Crop",
        data: areaByType.map((a) => a.triple),
        backgroundColor: "#b3561d",
        stack: "stack1",
      },
      {
        label: "Double Crop",
        data: areaByType.map((a) => a.double),
        backgroundColor: "#FF9371",
        stack: "stack1",
      },
      {
        label: "Single Non-Kharif",
        data: areaByType.map((a) => a.single_non_kharif),
        backgroundColor: "#f59d22",
        stack: "stack1",
      },
      {
        label: "Single Kharif",
        data: areaByType.map((a) => a.single_kharif),
        backgroundColor: "#74CCF4",
        stack: "stack1",
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: "bottom" },
      title: {
        display: true,
        text: `Cropping Intensity by Year (Area in ha)`,
      },
    },
    scales: {
      x: {
        stacked: true,
        title: { display: true, text: "Year" },
      },
      y: {
        stacked: true,
        title: { display: true, text: "Area (hectares)" },
        ticks: {
          callback: (value) => `${value.toFixed(1)} ha`,
        },
      },
    },
  };

  return <Bar data={data} options={options} />;
};

export default CroppingIntensityStackChart;
