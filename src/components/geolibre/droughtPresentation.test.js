import { withDroughtIntensity } from "./droughtPresentation";
const derive = properties => withDroughtIntensity({ features: [{ properties }] }).features[0].properties;
const counts = (year, values) => Object.fromEntries(["no", "mld", "mod", "sev"].map((p, i) => [`w_${p}_${year}`, values[i]]));
test("uses recorded weekly intensity including new years, preserving all source counts", () => {
  const input = { ...counts(2017, [20, 3, 0, 0]), ...counts(2024, [0, 10, 12, 1]) };
  expect(derive(input)).toMatchObject({ ...input, drought_peak_2017: "Mild", drought_peak_2024: "Severe", drought_peak_intensity: "Severe", drought_stress_weeks_2024: 13, drought_year_count: 2 });
  expect(input.drought_peak_intensity).toBeUndefined();
});
test.each([[23, 0, 0, 0, "None"], [0, 23, 0, 0, "Mild"], [0, 0, 23, 0, "Moderate"], [0, 0, 0, 23, "Severe"]])("classifies the observed intensity %p %p %p %p", (a, b, c, d, expected) => {
  expect(derive(counts(2024, [a, b, c, d])).drought_peak_intensity).toBe(expected);
});
test.each([[0, 0, 0, 0], [1, null, 0, 0], [1, "", 0, 0], [1, -1, 0, 0], [1, 0.5, 0, 0]])("keeps invalid counts distinct from None: %p", (...values) => {
  expect(derive(counts(2024, values)).drought_peak_intensity).toBeNull();
});
test("reports coverage for partial data", () => {
  expect(derive({ ...counts(2024, [1, null, 0, 0]), ...counts(2023, [23, 0, 0, 0]) })).toMatchObject({ drought_peak_2024: null, drought_peak_intensity: "None", drought_observed_years: "2023" });
});

const { withDroughtImpact, droughtPathImpact } = require("./droughtPresentation");
const impact = properties => withDroughtImpact({ features: [{ properties }] }).features[0].properties;
test("maps every documented pathway to its impact combination", () => {
  for (let p = 1; p <= 18; p++) expect(droughtPathImpact(`moderate_drought_path${p}`)).toBe(Math.ceil(p / 6));
  for (let p = 1; p <= 3; p++) expect(droughtPathImpact(`severe_drought_path${p}`)).toBe(4);
  expect(droughtPathImpact("moderate_drought_path19")).toBeNull();
});
test("aggregates recorded impacts across triggers and years, with explicit ties", () => {
  expect(impact({ se_mo_2023: { moderate_drought_path1: 3, moderate_drought_path3: 4 }, se_mo_2024: '{"moderate_drought_path7":6}' })).toMatchObject({ drought_dominant_impact: "Crop area + soil moisture stress", drought_impact_2024: "Crop area + vegetation stress", drought_impact_year_count: 2 });
  expect(impact({ se_mo_2024: { moderate_drought_path1: 4, moderate_drought_path13: 4 } }).drought_dominant_impact).toBe("Mixed / tied impacts");
  expect(impact({ se_mo_2024: { severe_drought_path2: 1 } }).drought_dominant_impact).toBe("Combined crop, soil and vegetation stress");
});
test.each([null, "", "bad JSON", [], { unknown_path: 5 }, { moderate_drought_path1: -1 }, { moderate_drought_path1: "" }])("keeps missing, unknown and malformed pathways missing: %p", record => {
  expect(impact({ se_mo_2024: record }).drought_dominant_impact).toBeNull();
});
test("empty pathways mean no recorded moderate/severe pathway, not no drought", () => {
  expect(impact({ se_mo_2024: "{}", mild_2024: '{"mild_drought_spi_score":10}' }).drought_dominant_impact).toBe("No recorded moderate/severe pathway");
  expect(impact({}).drought_dominant_impact).toBeNull();
});
