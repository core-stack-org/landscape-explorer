import { createGraduatedClassBreaks, interpolateRampColors } from "@geolibre/core";

export const MISSING_DATA_COLOR = "#3b3b3b";
export const VILLAGE_OUTLINE_COLOR = "#000000";
export const MWS_OUTLINE_COLOR = "#05081c";
const VILLAGE_LAYERS = new Set(["administrative_boundaries", "demographics", "facilities", "antyodaya", "livestock"]);
const MWS_LAYERS = new Set(["hydrological_boundaries", "mws_layers", "mws_layers_fortnight", "terrain_vector", "cropping_intensity", "drought"]);
export const boundaryColorForLayer = id => VILLAGE_LAYERS.has(id) ? VILLAGE_OUTLINE_COLOR : MWS_LAYERS.has(id) ? MWS_OUTLINE_COLOR : null;
export const DATA_AVAILABILITY_STATUS = Object.freeze({ facilities: "computed", antyodaya: "matched", livestock: "matched" });
const LAYER_AVAILABILITY_FIELDS = Object.freeze({
  facilities: "facilities_status",
  antyodaya: "antyodaya_status",
  livestock: "livestock_status",
});

// The data contract is `data_availability_status`. Older GeoServer views expose
// the same value under a layer-specific name, so use that only when the common
// field is absent. Source properties are retained unchanged for the style UI.
export const dataAvailabilityStatus = (id, properties) => {
  if (!properties) return undefined;
  if (Object.prototype.hasOwnProperty.call(properties, "data_availability_status")) {
    return properties.data_availability_status;
  }
  return properties[LAYER_AVAILABILITY_FIELDS[id]];
};

export const hasLayerData = (id, properties) => !DATA_AVAILABILITY_STATUS[id]
  || dataAvailabilityStatus(id, properties) === DATA_AVAILABILITY_STATUS[id];

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
    vectorStyleClassificationScheme: "first-values",
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

export const naturalBreaksStyle = (field, palette, data, overrides = {}, unit = "") => {
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
    vectorStyleStops: breaks.map((value, index) => ({ value, color: colors[index], label: unit ? `${value} ${unit}` : String(value) })),
    vectorStyleExpression: "",
  };
};

// Native graduated symbology coerces null to zero. Simplestyle overrides only
// missing features, leaving the real property, ramp and classes editable.
// The saved originals allow the overrides to be removed when the field changes.
export const applyMissingDataStyle = (layer) => {
  if (layer.type !== "geojson" || !layer.geojson) return layer;
  const style = layer.style || {};
  const catalogId = layer.id?.replace(/^corestack-/, "");
  const outline = boundaryColorForLayer(catalogId);
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
    const missing = !hasLayerData(catalogId, properties) || (thematic && (expressionFields.length
      ? expressionFields.some(field => finiteMeasurement(properties[field]) === null)
      : style.vectorStyleMode === "graduated"
      ? finiteMeasurement(value) === null
      : value == null || String(value).trim() === ""));
    if (missing) {
      const original = {};
      for (const key of ["fill", "stroke", "marker-color"]) {
        if (Object.prototype.hasOwnProperty.call(properties, key)) original[key] = properties[key];
        if (key !== "stroke" || /LineString$/.test(feature.geometry?.type || "")) properties[key] = MISSING_DATA_COLOR;
      }
      properties.__corestack_missing_style = original;
    }
    // GeoLibre also applies expression colors to polygon outlines. Simplestyle
    // explicitly keeps the shared boundary convention independent of the fill.
    if (outline) properties.stroke = outline;
    return { ...feature, properties };
  });
  const geojson = { ...layer.geojson, features };
  const nextStyle = thematic || outline ? { ...style, simpleStyleEnabled: true, ...(outline ? { strokeColor: outline } : {}) } : style;
  if (JSON.stringify(geojson) === JSON.stringify(layer.geojson) && JSON.stringify(nextStyle) === JSON.stringify(style)) return layer;
  return { ...layer, style: nextStyle, geojson };
};
