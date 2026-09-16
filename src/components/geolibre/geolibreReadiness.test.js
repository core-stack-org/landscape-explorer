import { GeoLibreReadiness } from "./geolibreReadiness";

const scope = { state: "S", district: "D", tehsil: "T" };
const project = { metadata: { scope }, mapView: { bbox: [0, 0, 1, 1] }, layers: [
  { id: "level1", type: "raster", visible: true },
  { id: "level2", type: "raster", visible: false, metadata: { startupDelayMs: 300 } },
  { id: "level3", type: "raster", visible: false, metadata: { startupDelayMs: 600 } },
] };
let bridge, post, update, log, onReady, onProjectState;
const reply = (method, value = null) => {
  const message = post.mock.calls.map(([data]) => data).filter(data => data.method === method).at(-1);
  expect(message).toBeTruthy();
  bridge.receive({ type: "geolibre:result", requestId: message.requestId, ok: true, value });
};
const acknowledge = () => bridge.receive({ type: "geolibre:state", seq: bridge.sequence, project });
const handshake = () => bridge.receive({ type: "geolibre:ready", version: "3.0.0" });
const initialize = () => { acknowledge(); reply("getView", { center: [0.5, 0.5] }); reply("fitBounds"); };
const enableRefinements = () => { jest.advanceTimersByTime(300); reply("setVisibility"); jest.advanceTimersByTime(300); reply("setVisibility"); };
beforeEach(() => {
  jest.useFakeTimers();
  post = jest.fn(); update = jest.fn(); log = jest.fn(); onReady = jest.fn(); onProjectState = jest.fn();
  bridge = new GeoLibreReadiness({ post, update, log, onReady, onProjectState, requireRenderConfirmation: true });
  bridge.load(project);
});
afterEach(() => { bridge.dispose(); jest.useRealTimers(); });

test("neither sending a project nor its acknowledgement means the map is rendered", () => {
  expect(post).not.toHaveBeenCalled();
  handshake();
  expect(post).toHaveBeenCalledWith({ type: "geolibre:load-project", project, seq: 1 });
  acknowledge();
  reply("getView", null);
  expect(onReady).not.toHaveBeenCalled();
  expect(update).not.toHaveBeenCalledWith(expect.objectContaining({ state: "loaded" }));
  jest.advanceTimersByTime(90000);
  expect(update).toHaveBeenLastCalledWith({ state: "error", issue: "delayed" });
});

test("fits a live map, staggers refinements, and records only a correlated render event", () => {
  handshake(); initialize();
  expect(post.mock.calls.filter(([data]) => data.method === "setVisibility")).toHaveLength(0);
  enableRefinements();
  expect(post.mock.calls.filter(([data]) => data.method === "setVisibility").map(([data]) => data.params.layerId)).toEqual(["level2", "level3"]);
  expect(post).toHaveBeenCalledWith(expect.objectContaining({ type: "corestack:await-render", expectedLayerIds: ["level1", "level2", "level3"] }));
  bridge.receive({ type: "corestack:map-rendered", seq: 0, scopeKey: "S|D|T" });
  bridge.receive({ type: "corestack:map-rendered", seq: 1, scopeKey: "wrong" });
  expect(onReady).not.toHaveBeenCalled();
  bridge.receive({ type: "corestack:map-rendered", seq: 1, scopeKey: "S|D|T" });
  expect(onReady).toHaveBeenCalledWith(expect.objectContaining({ renderVerified: true, handshakeToRenderMs: 600 }));
  expect(update).toHaveBeenLastCalledWith({ state: "loaded", issue: "" });
  expect(log).toHaveBeenCalledWith("map_render_confirmed", expect.any(Object));
});

test("ignores old snapshots and command responses after replacing a project", () => {
  handshake(); acknowledge();
  const oldRequest = post.mock.calls.map(([data]) => data).find(data => data.method === "getView");
  bridge.load({ ...project, name: "new" });
  onProjectState.mockClear();
  bridge.receive({ type: "geolibre:state", seq: 1, project });
  bridge.receive({ type: "geolibre:result", requestId: oldRequest.requestId, ok: true, value: { center: [0, 0] } });
  expect(onProjectState).not.toHaveBeenCalled();
  expect(post.mock.calls.some(([data]) => data.method === "fitBounds")).toBe(false);
});

test("hydration does not refit or turn back on a default layer that the user disabled", () => {
  handshake(); initialize(); enableRefinements();
  bridge.load(project);
  acknowledge(); reply("getView", { center: [0.5, 0.5] });
  jest.advanceTimersByTime(1000);
  expect(post.mock.calls.filter(([data]) => data.method === "fitBounds")).toHaveLength(1);
  expect(post.mock.calls.filter(([data]) => data.method === "setVisibility")).toHaveLength(2);
  expect(post.mock.calls.filter(([data]) => data.type === "corestack:await-render").at(-1)[0].expectedLayerIds).toEqual(["level1"]);
});

test("tile errors cannot be followed by a false successful render", () => {
  handshake(); initialize(); enableRefinements();
  bridge.receive({ type: "corestack:render-error", seq: 1, scopeKey: "S|D|T", message: "WMS failed" });
  bridge.receive({ type: "corestack:map-rendered", seq: 1, scopeKey: "S|D|T" });
  expect(onReady).not.toHaveBeenCalled();
  expect(update).toHaveBeenLastCalledWith({ state: "error", issue: "unavailable" });
});

test("the public-host fallback confirms map creation without claiming tile completion", () => {
  bridge.requireRenderConfirmation = false;
  handshake(); initialize(); enableRefinements();
  expect(update).toHaveBeenLastCalledWith({ state: "loaded", issue: "" });
  expect(onReady).toHaveBeenCalledTimes(1);
  expect(onReady).toHaveBeenCalledWith(expect.objectContaining({ renderVerified: false }));
  jest.advanceTimersByTime(90000);
  expect(update).toHaveBeenLastCalledWith({ state: "loaded", issue: "" });
});

test("later layer hydration never reopens the completed startup overlay", () => {
  bridge.requireRenderConfirmation = false;
  handshake(); initialize(); enableRefinements();
  update.mockClear();
  bridge.load({ ...project, name: "hydrated" });
  acknowledge(); reply("getView", { center: [0.5, 0.5] });
  expect(update).not.toHaveBeenCalledWith(expect.objectContaining({ state: "preparing" }));
  expect(update).not.toHaveBeenCalledWith(expect.objectContaining({ state: "rendering" }));
  expect(onReady).toHaveBeenCalledTimes(1);
  expect(log.mock.calls.filter(([event]) => event === "viewer_startup_complete")).toHaveLength(1);
});
