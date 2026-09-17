import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import * as core from "@geolibre/core";

const require = createRequire(import.meta.url);
const babel = require("@babel/core");
const { createExpression } = require("@maplibre/maplibre-gl-style-spec");
const checkout = process.argv[2];
if (!checkout) throw new Error("Usage: node verify-host.mjs /path/to/patched/GeoLibre");
const compile = (relative) => babel.transformSync(fs.readFileSync(path.join(checkout, relative), "utf8"), {
  filename: relative,
  presets: [require.resolve("@babel/preset-typescript"), require.resolve("@babel/preset-react")],
  plugins: [require.resolve("@babel/plugin-transform-modules-commonjs")],
  configFile: false, babelrc: false,
}).code;
const load = (relative) => {
  const context = { exports: {}, require: () => core };
  vm.runInNewContext(compile(relative), context);
  return context.exports;
};
compile("apps/geolibre-desktop/src/components/panels/StylePanel.tsx");
compile("apps/geolibre-desktop/src/components/layout/DesktopShell.tsx");
compile("apps/geolibre-desktop/src/hooks/usePlugins.ts");
compile("packages/plugins/src/plugins/maplibre-time-slider.ts");
compile("packages/plugins/src/plugins/deckgl-viz/diagrams.ts");
const diagramCode = compile("packages/core/src/diagram.ts");
const diagramContext = { exports: {}, require: () => ({ ...core, styleValue: (style, key) => style[key] ?? core.DEFAULT_LAYER_STYLE[key] }) };
vm.runInNewContext(diagramCode, diagramContext);
const diagramStyle = { ...core.DEFAULT_LAYER_STYLE, diagramType: "bar", diagramFields: [{ property: "__delta_g_mm_2025-01-01", color: "#2166ac" }] };
const diagrams = diagramContext.exports.collectDiagramData({ features: [-12, 0, null, 20].map(value => ({ geometry: { type: "Point", coordinates: [0, 0] }, properties: { "__delta_g_mm_2025-01-01": value } })) }, diagramStyle);
assert.equal(diagrams.data.length, 3);
assert.equal(diagrams.data[0].values[0], -12);
assert.equal(diagrams.data[1].values[0], 0);
assert.equal(diagrams.maxFieldValue, 20);
// Exercise the actual hydration hook against a store, including an irregular
// axis and three LULC levels sharing one complete byte response.
const hooks = fs.readFileSync(path.join(checkout, "apps/geolibre-desktop/src/hooks/usePlugins.ts"), "utf8");
const hookSource = hooks.slice(hooks.indexOf("export function useCoreStackSources("), hooks.indexOf("export function createAppAPI("));
const hookCode = babel.transformSync(hookSource, { filename: "hook.ts", presets: [require.resolve("@babel/preset-typescript")], plugins: [require.resolve("@babel/plugin-transform-modules-commonjs")], configFile: false, babelrc: false }).code;
const series = { mode: "date-keyed-series", dates: ["2025-01-01", "2025-01-16", "2025-02-01"], fields: ["2025-01-01", "2025-01-16", "2025-02-01"].map(date => ({ date, property: `__delta_g_mm_${date}` })), dateProperty: "__observation_date", valueProperty: "__delta_g_mm" };
const state = { layers: [{ id: "water", source: {}, metadata: { corestack: { timeSeries: series } }, geojson: { features: [{ properties: { "__delta_g_mm_2025-01-01": -12, "__delta_g_mm_2025-01-16": 0, "__delta_g_mm_2025-02-01": null } }] } }, ...[1, 2, 3].map(id => ({ id: `lulc${id}`, visible: true, metadata: { corestack: { year: "24_25", geoserverLayer: "LULC_example", rasterDownload: { url: "https://example.test/full.tif" } } } }))] };
let notify = () => {}, cleanup, temporal, fetchCount = 0, blob;
state.updateLayer = (id, patch) => { state.layers = state.layers.map(layer => layer.id === id ? { ...layer, ...patch } : layer); notify(); };
const context = { exports: {}, AbortController, Blob, URL: { createObjectURL: value => { blob = value; return "blob:full"; }, revokeObjectURL: () => {} }, useEffect: effect => { cleanup = effect(); }, useAppStore: { getState: () => state, subscribe: callback => { notify = callback; return () => {}; } }, registerTemporalLayer: (_id, adapter) => { temporal = adapter; return () => {}; }, bindTemporalLayer: () => true, fetch: async () => { fetchCount++; return { ok: true, arrayBuffer: async () => new Uint8Array([73, 73, 42, 0, 4, 5, 6, 7]).buffer }; } };
vm.runInNewContext(hookCode, context);
context.exports.useCoreStackSources({ current: null });
assert.equal(fetchCount, 1);
assert.deepEqual(temporal.getTimeValues(), series.dates);
temporal.setTime(new Date("2025-01-16"));
assert.equal(state.layers[0].geojson.features[0].properties.__delta_g_mm, 0);
temporal.setTime(new Date("2025-02-01"));
assert.equal(state.layers[0].geojson.features[0].properties.__delta_g_mm, null);
await new Promise(resolve => setTimeout(resolve, 0));
assert.deepEqual([...new Uint8Array(await blob.arrayBuffer())], [73, 73, 42, 0, 4, 5, 6, 7]);
assert.ok(state.layers.slice(1).every(layer => layer.metadata.localBytesUrl === "blob:full"));
cleanup();
const renderer = load("packages/core/src/vector-color.ts");
const style = { ...core.DEFAULT_LAYER_STYLE, vectorStyleMode: "graduated", vectorStyleProperty: "value", vectorStyleStops: [{ value: 0, color: "#0000ff" }, { value: 5, color: "#ff0000" }] };
const expression = createExpression(renderer.vectorColorExpression(style, "#ffffff"), "layers[0].paint.fill-color");
assert.equal(expression.result, "success");
for (const value of [undefined, null, "", false, "bad"]) assert.equal(expression.value.evaluate({ zoom: 1 }, { properties: { value } }), "#3b3b3b");
assert.equal(expression.value.evaluate({ zoom: 1 }, { properties: { value: 0 } }), "#0000ff");
assert.equal(expression.value.evaluate({ zoom: 1 }, { properties: { value: 5 } }), "#ff0000");
const { recolorCoreStackExpression } = load("apps/geolibre-desktop/src/lib/corestack-expression-style.ts");
const input = ["case", ["has", "x"], ["step", ["get", "x"], "#111111", 1, "#222222", 2, "#333333"], "#3b3b3b"];
const output = JSON.parse(recolorCoreStackExpression(JSON.stringify(input), "rdylgn", true));
assert.deepEqual(output[2], ["step", ["get", "x"], "#fbc58d", 1, "#c2e59a", 2, "#52ac5a"]);
assert.equal(output.at(-1), "#3b3b3b");
assert.equal(recolorCoreStackExpression("invalid", "blues"), null);
console.log("Patched viewer syntax, real MapLibre missing-data evaluation, and expression palette recoloring passed. Full viewer build remains a deployment check.");
