import { createGraduatedClassBreaks, interpolateRampColors } from "@geolibre/core";

export const MISSING_DATA_COLOR = "#3b3b3b";

// Number(null), Number("") and Number(false) are zero: none are measurements.
export const finiteMeasurement = (value) => {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && !value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export const validNumberExpression = (field) => [
  "all",
  ["has", field],
  ["!=", ["get", field], null],
  ["!=", ["to-string", ["get", field]], ""],
  ["in", ["typeof", ["get", field]], ["literal", ["number", "string"]]],
  ["!=", ["to-number", ["get", field], -1e308], -1e308],
];

export const paletteCategories = (field, categories, palette, overrides = {}) => {
  const colors = interpolateRampColors(palette, categories.length);
  return {
    ...overrides,
    fillColor: MISSING_DATA_COLOR,
    vectorStyleMode: "categorized",
    vectorStyleProperty: field,
    vectorStyleColorRamp: palette,
    vectorStyleClassCount: categories.length,
    vectorStyleClassificationScheme: "unique-values",
    vectorStyleStops: categories.map((value, index) => ({ value, label: value, color: colors[index] })),
    vectorStyleExpression: "",
  };
};

export const fixedPaletteExpression = ({ fields, value, thresholds, palette, colors, guard, ...overrides }) => {
  const samples = colors || interpolateRampColors(palette, thresholds.length + 1);
  return {
    ...overrides,
    fillColor: MISSING_DATA_COLOR,
    vectorStyleMode: "expression",
    vectorStyleProperty: fields.join("; "),
    vectorStyleColorRamp: palette || "viridis",
    vectorStyleClassCount: samples.length,
    vectorStyleClassificationScheme: "fixed-thresholds",
    vectorStyleStops: [],
    vectorStyleExpression: JSON.stringify([
      "case",
      ["all", ...fields.map(validNumberExpression), ...(guard ? [guard] : [])],
      ["step", value, samples[0], ...thresholds.flatMap((limit, index) => [limit, samples[index + 1]])],
      MISSING_DATA_COLOR,
    ]),
  };
};

export const naturalBreaksStyle = (field, palette, data, overrides = {}) => {
  const values = (data?.features || []).map((feature) => finiteMeasurement(feature.properties?.[field])).filter((value) => value !== null);
  const breaks = createGraduatedClassBreaks(values, 6, "natural-breaks");
  const colors = interpolateRampColors(palette, breaks.length);
  return {
    ...overrides,
    fillColor: breaks.length === 1 ? colors[0] : MISSING_DATA_COLOR,
    simpleStyleEnabled: true,
    vectorStyleMode: "graduated",
    vectorStyleProperty: field,
    vectorStyleColorRamp: palette,
    vectorStyleClassCount: 6,
    vectorStyleClassificationScheme: "natural-breaks",
    vectorStyleStops: breaks.map((value, index) => ({ value, color: colors[index], label: String(value) })),
    vectorStyleExpression: "",
  };
};

// Native graduated symbology coerces null to zero. Simplestyle overrides only
// missing features, leaving the real property, ramp and classes editable.
// The saved originals allow the overrides to be removed when the field changes.
export const applyMissingDataStyle = (layer) => {
  if (layer.type !== "geojson" || !layer.geojson) return layer;
  const style = layer.style || {};
  const property = style.vectorStyleProperty;
  const expressionFields = style.vectorStyleMode === "expression" && property ? property.split("; ") : [];
  const thematic = (["graduated", "categorized"].includes(style.vectorStyleMode) || expressionFields.length || property === "WorkCatego") && property;
  const features = layer.geojson.features.map((feature) => {
    const properties = { ...feature.properties };
    const previous = properties.__corestack_missing_style;
    if (previous) {
      for (const key of ["fill", "stroke", "marker-color"]) {
        if (Object.prototype.hasOwnProperty.call(previous, key)) properties[key] = previous[key];
        else delete properties[key];
      }
      delete properties.__corestack_missing_style;
    }
    const value = properties[property];
    const missing = thematic && (expressionFields.length
      ? expressionFields.some(field => finiteMeasurement(properties[field]) === null)
      : style.vectorStyleMode === "graduated"
      ? finiteMeasurement(value) === null || (property === "l2_essential_education_distance_km" && properties.facilities_status !== "computed")
      : value == null || String(value).trim() === "");
    if (missing) {
      const original = {};
      for (const key of ["fill", "stroke", "marker-color"]) {
        if (Object.prototype.hasOwnProperty.call(properties, key)) original[key] = properties[key];
        properties[key] = MISSING_DATA_COLOR;
      }
      properties.__corestack_missing_style = original;
    }
    return { ...feature, properties };
  });
  const geojson = { ...layer.geojson, features };
  const nextStyle = thematic ? { ...style, simpleStyleEnabled: true } : style;
  if (JSON.stringify(geojson) === JSON.stringify(layer.geojson) && JSON.stringify(nextStyle) === JSON.stringify(style)) return layer;
  return { ...layer, style: nextStyle, geojson };
};
