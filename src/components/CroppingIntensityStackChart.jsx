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

  const yearSuffix = ["2017", "2018", "2019", "2020", "2021", "2022", "2023"];

  const matchedFeature = zoiFeatures.find(
    (feature) =>
      feature.get("waterbody_name")?.toLowerCase() ===
      waterbody?.waterbody?.toLowerCase()
  );

  if (!matchedFeature) return null;
  console.log("Matched Feature:", matchedFeature);
  const zoiArea = matchedFeature.get("zoi_area");
  const areaByType = yearSuffix.map((year) => ({
    year,
    triple: (matchedFeature.get(`triply_cropped_area_${year}`) || 0) / 10000,
    double: (matchedFeature.get(`doubly_cropped_area_${year}`) || 0) / 10000,
    single_kharif:
      (matchedFeature.get(`single_kharif_cropped_area_${year}`) || 0) / 10000,
    single_non_kharif:
      (matchedFeature.get(`single_non_kharif_cropped_area_${year}`) || 0) /
      10000,
  }));

  console.log(areaByType);

  const maxValue = Math.max(
    ...areaByType.map(
      (a) => a.triple + a.double + a.single_kharif + a.single_non_kharif
    )
  );

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
        backgroundColor: "#BAD93E",
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
        min: 0,
        // max: zoiArea,
        max: maxValue,
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
