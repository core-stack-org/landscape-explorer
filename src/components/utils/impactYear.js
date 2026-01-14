export const YEARS = [
  "17-18", "18-19", "19-20", "20-21",
  "21-22", "22-23", "23-24","24-25"
];

export const YEAR_MAP = {
  "17-18": "2017-2018",
  "18-19": "2018-2019",
  "19-20": "2019-2020",
  "20-21": "2020-2021",
  "21-22": "2021-2022",
  "22-23": "2022-2023",
  "23-24": "2023-2024",
  "24-25": "2025-2025",
};

// convert to YY-YY
const normalizeYear = (iv) => {
  if (!iv || typeof iv !== "string" || !iv.includes("-")) return "22-23";

  let clean = iv.replace(/_/g, "-").trim();
  const parts = clean.split("-");

  if (parts[0].length === 2 && parts[1].length === 2) return clean;
  if (parts[0].length === 4 && parts[1].length === 2) return `${parts[0].slice(2)}-${parts[1]}`;
  if (parts[0].length === 2 && parts[1].length === 4) return `${parts[0]}-${parts[1].slice(2)}`;
  if (parts[0].length === 4 && parts[1].length === 4) return `${parts[0].slice(2)}-${parts[1].slice(2)}`;

  return "22-23";
};

// rainfall extraction
export const getRainfallByYear = (mwsFeature) => {
  const rainfall = {};

  YEARS.forEach((y) => {
    const long = YEAR_MAP[y];

    rainfall[y] =
      Number(mwsFeature?.properties?.[`precipitation_kharif_${long}`] || 0) +
      Number(mwsFeature?.properties?.[`precipitation_rabi_${long}`] || 0) +
      Number(mwsFeature?.properties?.[`precipitation_zaid_${long}`] || 0);
  });

  return rainfall;
};

// impact year detection
export const calculateImpactYear = (rainfall, ivRaw) => {
  const interventionYear = normalizeYear(ivRaw);

  console.log("🟦 Intervention Raw:", ivRaw);
  console.log("🟦 Intervention Normalized:", interventionYear);

  const preYears = YEARS.filter((y) => y < interventionYear);
  const postYears = YEARS.filter((y) => y > interventionYear);

  console.log("📌 Available Rainfall:", rainfall);
  console.log("🟩 PRE Years:", preYears);
  console.log("🟪 POST Years:", postYears);

  let minDiff = Infinity;
  let result = null;

  preYears.forEach((pre) => {
    postYears.forEach((post) => {
      const diff = Math.abs((rainfall[pre] ?? 0) - (rainfall[post] ?? 0));

      console.log(
        `🔍 Comparing ${pre} vs ${post} | ${rainfall[pre]} - ${rainfall[post]} = ${diff}`
      );

      if (diff < minDiff) {
        minDiff = diff;
        result = { pre, post, diff };
      }
    });
  });

  console.log("🎯 FINAL IMPACT YEAR:", result);
  console.log("---------------------------------------");

  return result;
};

