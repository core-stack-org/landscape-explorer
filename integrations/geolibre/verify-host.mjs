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
