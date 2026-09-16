/** @jest-environment node */
import fs from "fs";
import path from "path";
import vm from "vm";

const pluginPath = path.join(process.cwd(), "integrations/geolibre/plugins/corestack-embed/index.js");

test("bundled bridge reports native map bounds only to its verified parent and cleans up", () => {
  const listeners = new Map();
  const parent = { postMessage: jest.fn() };
  const window = { parent, addEventListener: jest.fn((name, fn) => listeners.set(name, fn)), removeEventListener: jest.fn(), setInterval: jest.fn(() => 1) };
  const disconnect = jest.fn();
  const mapListeners = new Map();
  let tilesLoaded = false;
  const map = {
    getContainer: () => ({ getBoundingClientRect: () => ({ x: 240, y: 40, width: 900, height: 600 }) }),
    on: jest.fn((name, callback) => mapListeners.set(name, callback)), off: jest.fn(), triggerRepaint: jest.fn(),
    loaded: () => true, areTilesLoaded: () => tilesLoaded,
    getSource: () => ({}), isSourceLoaded: () => true,
    getStyle: () => ({ layers: [{ id: "layer-corestack-lulc-raster" }] }),
  };
  const context = { window, document: { referrer: "https://kyl.example/explore_data" }, URL, ResizeObserver: class { observe() {} disconnect() { disconnect(); } }, clearInterval: jest.fn() };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(pluginPath, "utf8").replace("export default", "globalThis.plugin ="), context);
  context.plugin.activate({ getMap: () => map, getProjectSnapshot: () => ({ metadata: { scope: { state: "S", district: "D", tehsil: "T" } }, layers: [{ id: "corestack-lulc", visible: true }] }) });
  const data = { type: "corestack:connect", seq: 1, scopeKey: "S|D|T" };
  const receive = listeners.get("message");
  receive({ source: parent, origin: "https://evil.example", data });
  receive({ source: {}, origin: "https://kyl.example", data });
  receive({ source: parent, origin: "https://kyl.example", data: { ...data, scopeKey: "wrong" } });
  expect(parent.postMessage).not.toHaveBeenCalled();
  receive({ source: parent, origin: "https://kyl.example", data });
  expect(parent.postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: "corestack:map-bounds", seq: 1, bounds: { x: 240, y: 40, width: 900, height: 600 } }), "https://kyl.example");
  const awaitRender = { ...data, type: "corestack:await-render", expectedLayerIds: ["corestack-lulc"] };
  receive({ source: parent, origin: "https://kyl.example", data: awaitRender });
  expect(map.triggerRepaint).toHaveBeenCalledTimes(1);
  mapListeners.get("idle")();
  expect(parent.postMessage.mock.calls.some(([message]) => message.type === "corestack:map-rendered")).toBe(false);
  tilesLoaded = true;
  mapListeners.get("idle")();
  expect(parent.postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: "corestack:map-rendered", seq: 1 }), "https://kyl.example");
  receive({ source: parent, origin: "https://kyl.example", data: { ...data, seq: 2 } });
  mapListeners.get("error")({ sourceId: "source-corestack-lulc", error: { message: "WMS failed" } });
  receive({ source: parent, origin: "https://kyl.example", data: { ...awaitRender, seq: 2 } });
  parent.postMessage.mockClear();
  mapListeners.get("idle")();
  expect(parent.postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: "corestack:render-error", seq: 2 }), "https://kyl.example");
  expect(parent.postMessage.mock.calls.some(([message]) => message.type === "corestack:map-rendered")).toBe(false);
  context.plugin.deactivate();
  expect(disconnect).toHaveBeenCalled();
  expect(window.removeEventListener).toHaveBeenCalledWith("message", receive);
});
