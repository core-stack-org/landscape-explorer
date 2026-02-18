// impactYears.js

// "23-24" → 2023
const yearToNumber = (yy) => {
  if (!yy) return null;
  const [start] = yy.split("-");
  return Number(`20${start}`);
};

// convert to YY-YY
const normalizeYear = (iv) => {
  if (!iv || typeof iv !== "string" || !iv.includes("-")) return null;

  let clean = iv.replace(/_/g, "-").trim();
  const parts = clean.split("-");

  if (parts[0].length === 2 && parts[1].length === 2) return clean;
  if (parts[0].length === 4 && parts[1].length === 2)
    return `${parts[0].slice(2)}-${parts[1]}`;
  if (parts[0].length === 2 && parts[1].length === 4)
    return `${parts[0]}-${parts[1].slice(2)}`;
  if (parts[0].length === 4 && parts[1].length === 4)
    return `${parts[0].slice(2)}-${parts[1].slice(2)}`;

  return null;
};

// rainfall extraction (KEEP THIS AS IS, but YEAR_MAP must be correct)
export const getRainfallByYear = (mwsFeature) => {
  const rainfall = {};

  Object.keys(mwsFeature?.properties || {}).forEach((key) => {
    const match = key.match(
      /^precipitation_(kharif|rabi|zaid)_(\d{4}-\d{4})$/
    );

    if (!match) return;

    const [, , longYear] = match;
    const short = `${longYear.slice(2, 4)}-${longYear.slice(7, 9)}`;

    rainfall[short] =
      (rainfall[short] || 0) + Number(mwsFeature.properties[key] || 0);
  });

  return rainfall;
};

// ✅ FINAL & SAFE impact year logic
export const calculateImpactYear = (rainfall, ivRaw) => {
  if (!rainfall || !ivRaw) return null;

  const interventionYear = normalizeYear(ivRaw);
  if (!interventionYear) return null;

  const ivNum = yearToNumber(interventionYear);

  // 🔥 ONLY years that actually exist in rainfall data
  const years = Object.keys(rainfall)
    .filter((y) => rainfall[y] > 0)
    .sort((a, b) => yearToNumber(a) - yearToNumber(b));

  const preYears = years.filter((y) => yearToNumber(y) < ivNum);
  const postYears = years.filter((y) => yearToNumber(y) > ivNum);

  // 🚨 NO POST YEAR = NO IMPACT
  if (!preYears.length || !postYears.length) return null;

  let minDiff = Infinity;
  let result = null;

  preYears.forEach((pre) => {
    postYears.forEach((post) => {
      const diff = Math.abs(rainfall[pre] - rainfall[post]);

      if (diff < minDiff) {
        minDiff = diff;
        result = { pre, post };
      }
    });
  });

  return result;
};
