import { FORTNIGHT_DATE_FIELD, FORTNIGHT_VALUE_FIELD, prepareFortnightData } from "./geolibreFortnight";

test("uses one common latest date and preserves raw time series and geometry", () => {
  const data = { type: "FeatureCollection", features: [
    { geometry: { type: "Point", coordinates: [1, 2] }, properties: { "2025-06-01": '{"DeltaG": 12}', "2025-06-16": '{"DeltaG": 0}' } },
    { properties: { "2025-06-01": { DeltaG: 9 } } },
    { properties: { "2025-06-16": "bad JSON", "2025-02-31": { DeltaG: 50 } } },
  ] };
  const result = prepareFortnightData(data);
  expect(result.dates).toEqual(["2025-06-01", "2025-06-16"]);
  expect(result.data.features.map(feature => feature.properties[FORTNIGHT_VALUE_FIELD])).toEqual([0, null, null]);
  expect(result.data.features.every(feature => feature.properties[FORTNIGHT_DATE_FIELD] === "2025-06-16")).toBe(true);
  expect(result.data.features[0].geometry).toBe(data.features[0].geometry);
  expect(result.data.features[0].properties["2025-06-16"]).toBe('{"DeltaG": 0}');
  expect(data.features[0].properties[FORTNIGHT_VALUE_FIELD]).toBeUndefined();
  expect(prepareFortnightData(data, "2025-06-01").data.features[1].properties[FORTNIGHT_VALUE_FIELD]).toBe(9);
});
