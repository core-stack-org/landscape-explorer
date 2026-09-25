import { withDroughtIntensity } from "./droughtPresentation";
const derive = properties => withDroughtIntensity({ features: [{ properties }] }).features[0].properties;
test("summarizes published weekly classes across years without changing source fields", () => {
  const input = { drlb_2017: "[0,1]", drlb_2024: "[1,2,3]", frth2_2024: 2 };
  expect(derive(input)).toMatchObject({ ...input, drought_peak_2017: "Mild drought", drought_peak_2024: "Severe drought", drought_peak_intensity: "Severe drought" });
  expect(derive(input)).not.toHaveProperty("drought_stress_weeks_2024");
  expect(derive(input)).not.toHaveProperty("drought_observed_years");
  expect(input.drought_peak_intensity).toBeUndefined();
});
test.each([[0, "No drought"], [1, "Mild drought"], [2, "Moderate drought"], [3, "Severe drought"]])("uses documented weekly class %p", (code, expected) => {
  expect(derive({ drlb_2024: `[${code}]` }).drought_peak_intensity).toBe(expected);
});
test("does not substitute counts for missing or malformed weekly records", () => {
  const result = derive({ drlb_2024: "bad JSON", w_mod_2024: 3, drlb_2023: "[0]" });
  expect(result).toMatchObject({ drought_peak_2024: null, drought_peak_intensity: "No drought" });
  expect(derive({ w_mod_2024: 3 }).drought_peak_intensity).toBeNull();
  expect(derive({ drlb_2024: "[0,4]" }).drought_peak_intensity).toBeNull();
});

const { withDroughtImpact, droughtPathImpact } = require("./droughtPresentation");
const impact = properties => withDroughtImpact({ features: [{ properties }] }).features[0].properties;
test("maps every documented pathway to its impact combination", () => {
  for (let p = 1; p <= 18; p++) expect(droughtPathImpact(`moderate_drought_path${p}`)).toBe(Math.ceil(p / 6));
  for (let p = 1; p <= 3; p++) expect(droughtPathImpact(`severe_drought_path${p}`)).toBe(4);
  expect(droughtPathImpact("moderate_drought_path19")).toBeNull();
});
test("aggregates recorded impacts across triggers and years, with explicit ties", () => {
  expect(impact({ se_mo_2023: { moderate_drought_path1: 3, moderate_drought_path3: 4 }, se_mo_2024: '{"moderate_drought_path7":6}' })).toMatchObject({ drought_dominant_impact: "Moderate: VCI Fair/Good, MAI Severe, cropped area Severe", drought_impact_2024: "Moderate: VCI Poor, MAI Moderate/Mild, cropped area Severe" });
  expect(impact({ se_mo_2024: { moderate_drought_path1: 4, moderate_drought_path13: 4 } }).drought_dominant_impact).toBe("Mixed / tied pathways");
  expect(impact({ se_mo_2024: { severe_drought_path2: 1 } }).drought_dominant_impact).toBe("Severe: VCI Poor, MAI Severe, cropped area Severe");
});
test.each([null, "", "bad JSON", [], { unknown_path: 5 }, { moderate_drought_path1: -1 }, { moderate_drought_path1: "" }])("keeps missing, unknown and malformed pathways missing: %p", record => {
  expect(impact({ se_mo_2024: record }).drought_dominant_impact).toBeNull();
});
test("empty pathways mean no recorded moderate/severe pathway, not no drought", () => {
  expect(impact({ se_mo_2024: "{}", mild_2024: '{"mild_drought_spi_score":10}' }).drought_dominant_impact).toBe("No recorded moderate/severe pathway");
  expect(impact({}).drought_dominant_impact).toBeNull();
});
