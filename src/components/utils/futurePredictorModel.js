const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const CROP_PROFILES = {
  rice: {
    key: "rice",
    label: "Rice",
    baseYieldTph: 4.8,
    waterDemand: 0.95,
    rainfallNeedMm: 1200,
    tempSensitivity: 0.09,
  },
  wheat: {
    key: "wheat",
    label: "Wheat",
    baseYieldTph: 3.6,
    waterDemand: 0.7,
    rainfallNeedMm: 700,
    tempSensitivity: 0.075,
  },
  maize: {
    key: "maize",
    label: "Maize",
    baseYieldTph: 4.2,
    waterDemand: 0.65,
    rainfallNeedMm: 650,
    tempSensitivity: 0.07,
  },
  pulses: {
    key: "pulses",
    label: "Pulses",
    baseYieldTph: 1.9,
    waterDemand: 0.42,
    rainfallNeedMm: 500,
    tempSensitivity: 0.05,
  },
  millet: {
    key: "millet",
    label: "Millet",
    baseYieldTph: 2.4,
    waterDemand: 0.3,
    rainfallNeedMm: 420,
    tempSensitivity: 0.045,
  },
};

const buildYearSequence = (planningYears) => {
  const years = clamp(Number(planningYears) || 1, 1, 5);
  return Array.from({ length: years }, (_, idx) => `Year ${idx + 1}`);
};

const runCropYear = ({
  crop,
  baseYieldTph,
  baselineRainfallMm,
  baselineWaterScarcityScore,
  rainfallDropPct,
  tempIncreaseC,
  adaptationLevel,
  waterStorageBoostPct,
  progressRatio,
}) => {
  const effectiveRainfallDrop = clamp(rainfallDropPct, 0, 60) * progressRatio;
  const rainfallMm = baselineRainfallMm * (1 - effectiveRainfallDrop / 100);

  const storageBenefitFactor = 1 + (clamp(waterStorageBoostPct, 0, 60) / 100) * 0.4;
  const effectiveRainfallMm = rainfallMm * storageBenefitFactor;

  const rainfallStress = clamp(
    (crop.rainfallNeedMm - effectiveRainfallMm) / crop.rainfallNeedMm,
    0,
    1
  );
  const heatStress = clamp(tempIncreaseC, 0, 4) * progressRatio * crop.tempSensitivity;
  const adaptationBenefit = (clamp(adaptationLevel, 0, 100) / 100) * 0.25;

  const yieldFactor = clamp(
    1 - rainfallStress * 0.9 - heatStress + adaptationBenefit,
    0.3,
    1.35
  );

  const yieldTph = Number((baseYieldTph * yieldFactor).toFixed(2));

  const waterScarcityScore = clamp(
    baselineWaterScarcityScore +
      rainfallStress * 55 +
      crop.waterDemand * 22 +
      tempIncreaseC * progressRatio * 9 -
      adaptationBenefit * 28 -
      clamp(waterStorageBoostPct, 0, 60) * 0.5,
    5,
    95
  );

  return {
    rainfallMm: Number(rainfallMm.toFixed(0)),
    yieldTph,
    waterScarcityScore: Number(waterScarcityScore.toFixed(1)),
  };
};

const classifyRisk = (score) => {
  if (score >= 75) return "Very High";
  if (score >= 60) return "High";
  if (score >= 40) return "Moderate";
  return "Low";
};

const scoreAlternative = (profile, params) => {
  const yearResult = runCropYear({
    crop: profile,
    baseYieldTph: params.baseYieldTph || profile.baseYieldTph,
    baselineRainfallMm: params.baselineRainfallMm || 1000,
    baselineWaterScarcityScore: params.baselineWaterScarcityScore || 30,
    rainfallDropPct: params.rainfallDropPct,
    tempIncreaseC: params.tempIncreaseC,
    adaptationLevel: params.adaptationLevel,
    waterStorageBoostPct: params.waterStorageBoostPct,
    progressRatio: 1,
  });

  return {
    cropKey: profile.key,
    cropLabel: profile.label,
    projectedYield: yearResult.yieldTph,
    scarcityScore: yearResult.waterScarcityScore,
  };
};

export const simulateFutureScenario = ({
  cropKey,
  rainfallDropPct,
  tempIncreaseC,
  planningYears,
  adaptationLevel,
  waterStorageBoostPct,
  baseline = {},
}) => {
  const selectedCrop = CROP_PROFILES[cropKey] || CROP_PROFILES.rice;
  const baseYieldInput = Number.isFinite(Number(baseline.baseYieldTph))
    ? Number(baseline.baseYieldTph)
    : selectedCrop.baseYieldTph;
  const baseYieldTph = Math.max(baseYieldInput, 0.1);
  const baselineRainfallMm = Number.isFinite(Number(baseline.rainfallMm))
    ? Number(baseline.rainfallMm)
    : 1000;
  const baselineWaterScarcityScore = Number.isFinite(Number(baseline.waterScarcityScore))
    ? Number(baseline.waterScarcityScore)
    : 30;
  const yearLabels = buildYearSequence(planningYears);

  const yearly = yearLabels.map((year, index) => {
    const progressRatio = (index + 1) / yearLabels.length;
    const yearResult = runCropYear({
      crop: selectedCrop,
      baseYieldTph,
      baselineRainfallMm,
      baselineWaterScarcityScore,
      rainfallDropPct,
      tempIncreaseC,
      adaptationLevel,
      waterStorageBoostPct,
      progressRatio,
    });

    return {
      year,
      ...yearResult,
    };
  });

  const avgYield = yearly.reduce((sum, item) => sum + item.yieldTph, 0) / yearly.length;
  const finalYearYield = yearly[yearly.length - 1]?.yieldTph || baseYieldTph;
  const finalScarcity = yearly[yearly.length - 1]?.waterScarcityScore || baselineWaterScarcityScore;

  const yieldChangePct = ((avgYield - baseYieldTph) / baseYieldTph) * 100;

  const alternatives = Object.values(CROP_PROFILES)
    .filter((profile) => profile.key !== selectedCrop.key)
    .map((profile) =>
      scoreAlternative(profile, {
        baseYieldTph: profile.baseYieldTph,
        baselineRainfallMm,
        baselineWaterScarcityScore,
        rainfallDropPct,
        tempIncreaseC,
        adaptationLevel,
        waterStorageBoostPct,
      })
    )
    .filter(
      (candidate) =>
        candidate.projectedYield >= finalYearYield * 0.9 &&
        candidate.scarcityScore <= finalScarcity - 5
    )
    .sort((a, b) => a.scarcityScore - b.scarcityScore || b.projectedYield - a.projectedYield)
    .slice(0, 3);

  return {
    cropLabel: selectedCrop.label,
    baseYieldTph,
    baselineRainfallMm: Number(baselineRainfallMm.toFixed(0)),
    baselineWaterScarcityScore: Number(baselineWaterScarcityScore.toFixed(1)),
    finalYearYield,
    yieldChangePct: Number(yieldChangePct.toFixed(1)),
    finalScarcityScore: Number(finalScarcity.toFixed(1)),
    finalRiskLevel: classifyRisk(finalScarcity),
    yearly,
    alternatives,
  };
};
