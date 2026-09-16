import { applyMissingDataStyle, finiteMeasurement, fixedPaletteExpression, naturalBreaksStyle } from "./geolibreStyleUtils";

test("missing observations remain distinct from valid numeric zero", () => {
  [null, undefined, "", "  ", false, "bad", Infinity].forEach(value => expect(finiteMeasurement(value)).toBeNull());
  [0, "0", " 0 "].forEach(value => expect(finiteMeasurement(value)).toBe(0));
});

test("native graduated controls retain palette and ignore missing values in breaks", () => {
  const data = { features: [null, "", 0, 2, 3, 8, 12, 50].map(value => ({ properties: { value } })) };
  const style = naturalBreaksStyle("value", "coolwarm", data);
  expect(style.vectorStyleStops).toHaveLength(6);
  expect(style.vectorStyleStops[0]).toMatchObject({ value: 0, color: "#3b4cc0" });
  expect(style.vectorStyleStops[5].color).toBe("#b40426");
  expect(style.vectorStyleClassificationScheme).toBe("natural-breaks");
});

test("missing overrides can be removed when the user selects another field", () => {
  const original = { type: "geojson", style: { vectorStyleMode: "graduated", vectorStyleProperty: "a" }, geojson: { features: [{ properties: { a: null, b: 0, fill: "#123456" } }] } };
  const missing = applyMissingDataStyle(original);
  expect(missing.geojson.features[0].properties.fill).toBe("#3b3b3b");
  expect(applyMissingDataStyle(missing)).toBe(missing);
  const valid = applyMissingDataStyle({ ...missing, style: { ...missing.style, vectorStyleProperty: "b" } });
  expect(valid.geojson.features[0].properties.fill).toBe("#123456");
  expect(original.geojson.features[0].properties.fill).toBe("#123456");
});

test("fixed expressions use the native ramp and a missing-data branch", () => {
  const style = fixedPaletteExpression({ fields: ["net"], value: ["to-number", ["get", "net"]], thresholds: [-1, 1], palette: "rdbu" });
  const expression = JSON.parse(style.vectorStyleExpression);
  expect(expression.at(-1)).toBe("#3b3b3b");
  expect(expression[2]).toEqual(["step", ["to-number", ["get", "net"]], "#b2182b", -1, "#f7f7f7", 1, "#2166ac"]);
});
