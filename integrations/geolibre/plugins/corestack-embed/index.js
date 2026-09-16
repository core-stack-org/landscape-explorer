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
    const send = (type, extra = {}) => {
      if (!connection) return;
      window.parent.postMessage({ type, ...connection, ...extra }, parentOrigin);
    };
    const reportBounds = () => {
      if (!map || !connection) return;
      const { x, y, width, height } = map.getContainer().getBoundingClientRect();
      send("corestack:map-bounds", { bounds: { x, y, width, height } });
    };
    const attach = () => {
      const nextMap = app.getMap?.();
      if (!nextMap || nextMap === map) return;
      observer?.disconnect();
      map?.off("resize", reportBounds);
      map = nextMap;
      observer = new ResizeObserver(reportBounds);
      observer.observe(map.getContainer());
      map.on("resize", reportBounds);
      reportBounds();
    };
    const receive = (event) => {
      const data = event.data;
      if (event.source !== window.parent || event.origin !== parentOrigin || data?.type !== "corestack:connect") return;
      if (!Number.isSafeInteger(data.seq) || data.seq < 1 || data.scopeKey !== scopeKey(app.getProjectSnapshot?.())) return;
      if (connection && data.seq < connection.seq) return;
      connection = { seq: data.seq, scopeKey: data.scopeKey };
      attach();
      send("corestack:connected", { version: 1, capabilities: ["map-bounds"] });
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
      window.removeEventListener("message", receive);
      window.removeEventListener("resize", reportBounds);
    };
  },
  deactivate() { dispose?.(); dispose = undefined; },
};
