// Bundled drop-in for GeoLibre 3.0.0. No remote code or runtime dependencies.
let dispose;
const scopeKey = (project) => {
  const scope = project?.metadata?.scope;
  return scope ? [scope.state, scope.district, scope.tehsil].join("|") : "";
};

export default {
  id: "corestack-embed",
  name: "CoRE Stack embed bridge",
  version: "1.0.0",
  activate(app) {
    dispose?.();
    let parentOrigin;
    try { parentOrigin = new URL(document.referrer).origin; } catch { return false; }
    if (window.parent === window || !/^https?:\/\//.test(parentOrigin)) return false;
    let connection;
    let map;
    let observer;
    let renderRequest;
    let completedRequest;
    const sourceErrors = new Map();
    const send = (type, extra = {}) => {
      if (!connection) return;
      window.parent.postMessage({ type, ...connection, ...extra }, parentOrigin);
    };
    const reportBounds = () => {
      if (!map || !connection) return;
      const { x, y, width, height } = map.getContainer().getBoundingClientRect();
      send("corestack:map-bounds", { bounds: { x, y, width, height } });
    };
    const verifyRender = () => {
      if (!map || !renderRequest || connection.scopeKey !== scopeKey(app.getProjectSnapshot?.())) return;
      const failed = renderRequest.expectedLayerIds.find(id => sourceErrors.has(`source-${id}`));
      if (failed) {
        send("corestack:render-error", { sourceId: `source-${failed}`, message: sourceErrors.get(`source-${failed}`) });
        return;
      }
      if (!map.loaded() || !map.areTilesLoaded()) return;
      const nativeLayers = map.getStyle()?.layers || [];
      const complete = renderRequest.expectedLayerIds.every(id =>
        map.getSource(`source-${id}`) && map.isSourceLoaded(`source-${id}`) &&
        nativeLayers.some(layer => layer.id.startsWith(`layer-${id}-`) && layer.layout?.visibility !== "none")
      );
      if (!complete) return;
      completedRequest = JSON.stringify(renderRequest);
      send("corestack:map-rendered", { visibleLayerCount: renderRequest.expectedLayerIds.length });
    };
    const recordError = event => {
      if (!event.sourceId) return;
      sourceErrors.set(event.sourceId, event.error?.message || "A map source could not be rendered.");
      if (renderRequest?.expectedLayerIds.some(id => `source-${id}` === event.sourceId)) verifyRender();
    };
    const attach = () => {
      const nextMap = app.getMap?.();
      if (!nextMap || nextMap === map) return;
      observer?.disconnect();
      map?.off("resize", reportBounds);
      map?.off("idle", verifyRender);
      map?.off("error", recordError);
      map = nextMap;
      observer = new ResizeObserver(reportBounds);
      observer.observe(map.getContainer());
      map.on("resize", reportBounds);
      map.on("idle", verifyRender);
      map.on("error", recordError);
      reportBounds();
    };
    const receive = (event) => {
      const data = event.data;
      if (event.source !== window.parent || event.origin !== parentOrigin || !["corestack:connect", "corestack:await-render"].includes(data?.type)) return;
      if (!Number.isSafeInteger(data.seq) || data.seq < 1 || data.scopeKey !== scopeKey(app.getProjectSnapshot?.())) return;
      if (connection && data.seq < connection.seq) return;
      if (data.type === "corestack:await-render") {
        if (data.seq !== connection?.seq || !Array.isArray(data.expectedLayerIds)) return;
        const layers = app.getProjectSnapshot?.().layers || [];
        if (data.expectedLayerIds.some(id => typeof id !== "string" || !layers.some(layer => layer.id === id && layer.visible))) return;
        const next = { expectedLayerIds: data.expectedLayerIds, seq: data.seq };
        if (JSON.stringify(next) === completedRequest) { verifyRender(); return; }
        if (JSON.stringify(next) === JSON.stringify(renderRequest)) return;
        renderRequest = next;
        // Force a fresh render, even if the map was idle before the request.
        // Only the subsequent idle event may confirm completion.
        map?.triggerRepaint();
        return;
      }
      if (connection?.seq !== data.seq) { renderRequest = null; completedRequest = null; sourceErrors.clear(); }
      connection = { seq: data.seq, scopeKey: data.scopeKey };
      attach();
      send("corestack:connected", { version: 1, capabilities: ["map-bounds", "render-completion"] });
      reportBounds();
    };
    window.addEventListener("message", receive);
    window.addEventListener("resize", reportBounds);
    const timer = window.setInterval(attach, 500);
    attach();
    dispose = () => {
      clearInterval(timer);
      observer?.disconnect();
      map?.off("resize", reportBounds);
      map?.off("idle", verifyRender);
      map?.off("error", recordError);
      window.removeEventListener("message", receive);
      window.removeEventListener("resize", reportBounds);
    };
  },
  deactivate() { dispose?.(); dispose = undefined; },
};
