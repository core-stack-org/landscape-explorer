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
