import { geoLibreVersionStatus } from "../../config/geolibre.config";

export const projectScopeKey = project => {
  const scope = project?.metadata?.scope;
  return scope ? [scope.state, scope.district, scope.tehsil].join("|") : "";
};

// Handshake, project acknowledgement, map creation and rendering are separate
// events. A successful postMessage is not evidence that any of them completed.
export class GeoLibreReadiness {
  constructor({ post, log, update, onProjectState, onReady, onBounds, requireRenderConfirmation = false, now = () => performance.now() }) {
    Object.assign(this, { post, log, update, onProjectState, onReady, onBounds, requireRenderConfirmation, now });
    this.sequence = 0;
    this.commandCount = 0;
    this.pendingCommands = new Map();
    this.fittedScopes = new Set();
    this.startedLayers = new Set();
    this.startedAt = now();
    this.bootComplete = false;
    this.armTimeout("handshake");
    this.pollTimer = setInterval(() => this.poll(), 500);
  }

  armTimeout(phase) {
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => {
      this.log(`${phase}_timeout`, { sequence: this.sequence, timeoutMs: 90000 });
      if (!this.bootComplete) this.fail("delayed");
      else this.renderTimedOut = true;
    }, 90000);
  }

  fail(issue, details) {
    if (details) this.log("viewer_failed", details);
    this.failed = true;
    clearTimeout(this.stageTimer);
    this.pendingCommands.clear();
    if (this.bootComplete) this.update({ backgroundIssue: "A layer could not finish loading. Toggle it off and on to retry." });
    else this.update({ state: "error", issue });
  }

  load(project) {
    this.project = project;
    if (!project || !this.handshake) return;
    clearTimeout(this.stageTimer);
    this.pendingCommands.clear();
    this.sequence += 1;
    this.scopeKey = projectScopeKey(project);
    this.liveProject = project;
    this.acknowledged = false;
    this.mapChecked = false;
    this.awaitingRender = false;
    this.interactive = false;
    this.rendered = false;
    this.failed = false;
    this.renderTimedOut = false;
    this.projectSentAt = this.now();
    this.deferred = project.layers.filter(layer => layer.metadata?.startupDelayMs && !this.startedLayers.has(`${this.scopeKey}:${layer.id}`)).sort((a, b) => a.metadata.startupDelayMs - b.metadata.startupDelayMs);
    if (!this.bootComplete) this.update({ state: "preparing", issue: "" });
    this.post({ type: "geolibre:load-project", project, seq: this.sequence });
    this.log("project_sent", { sequence: this.sequence, layerCount: project.layers.length });
    this.armTimeout("map_render");
    this.poll();
  }

  command(method, params, done) {
    const requestId = `kyl-${this.sequence}-${method}-${++this.commandCount}`;
    this.pendingCommands.set(requestId, { done, method });
    this.post({ type: "geolibre:command", requestId, method, params });
  }

  poll() {
    if (!this.handshake || !this.project || this.failed || this.rendered || this.renderTimedOut) return;
    this.post({ type: "corestack:connect", seq: this.sequence, scopeKey: this.scopeKey });
    if (!this.acknowledged) {
      this.post({ type: "geolibre:request-state" });
    } else if (!this.mapChecked && ![...this.pendingCommands.values()].some(command => command.method === "getView")) {
      this.command("getView", {}, value => {
        if (!value || !Array.isArray(value.center) || !value.center.every(Number.isFinite)) return;
        this.mapChecked = true;
        this.log("map_initialized", { sequence: this.sequence, handshakeToMapMs: Math.round(this.now() - this.handshakeAt) });
        const afterFit = () => this.startNextLayer();
        if (!this.fittedScopes.has(this.scopeKey) && this.project.mapView?.bbox?.length === 4) {
          this.command("fitBounds", { bounds: this.project.mapView.bbox }, () => {
            this.fittedScopes.add(this.scopeKey);
            this.log("initial_bounds_fit_confirmed", { sequence: this.sequence });
            afterFit();
          });
        } else afterFit();
      });
    }
    if (this.awaitingRender) this.requestRender();
  }

  startNextLayer() {
    const layer = this.deferred.shift();
    if (layer) {
      this.stageTimer = setTimeout(() => this.command("setVisibility", { layerId: layer.id, visible: true }, () => {
        this.startedLayers.add(`${this.scopeKey}:${layer.id}`);
        this.liveProject = { ...this.liveProject, layers: this.liveProject.layers.map(item => item.id === layer.id ? { ...item, visible: true } : item) };
        this.log("startup_layer_enabled", { layerId: layer.id, sequence: this.sequence });
        this.startNextLayer();
      }), 1000);
      return;
    }
    this.awaitingRender = true;
    if (!this.bootComplete) this.update({ state: "rendering", issue: "" });
    this.requestRender();
    if (!this.requireRenderConfirmation) {
      this.interactive = true;
      this.log("workspace_interactive", { sequence: this.sequence, renderVerified: false });
      this.completeStartup({ renderVerified: false, handshakeToMapMs: Math.round(this.now() - this.handshakeAt) });
    }
  }

  requestRender() {
    const expectedLayerIds = this.liveProject.layers.filter(layer =>
      layer.visible &&
      (layer.type === "raster" || (layer.type === "geojson" && layer.geojson?.features?.length))
    ).map(layer => layer.id);
    this.post({ type: "corestack:await-render", seq: this.sequence, scopeKey: this.scopeKey, expectedLayerIds });
  }

  completeStartup(timing) {
    if (this.bootComplete) return;
    this.bootComplete = true;
    this.log("viewer_startup_complete", { ...timing, handshakeToReadyMs: Math.round(this.now() - this.handshakeAt) });
    this.update({ state: "loaded", issue: "" });
    this.onReady?.(timing);
  }

  receive(data) {
    if (data.type === "geolibre:ready") {
      const status = geoLibreVersionStatus(data.version);
      if (!status.compatible) { this.fail("unavailable", { message: status.message }); return; }
      this.handshake = true;
      this.bootComplete = false;
      this.fittedScopes.clear();
      this.startedLayers.clear();
      this.handshakeAt = this.now();
      this.log("iframe_ready", { version: data.version, sinceStartMs: Math.round(this.handshakeAt - this.startedAt) });
      this.update({ version: String(data.version), state: "preparing", issue: "" });
      this.armTimeout("project_preparation");
      if (this.project) this.load(this.project);
      return;
    }
    if (data.type === "geolibre:error") { this.fail("unavailable", { message: data.message }); return; }
    if (data.type === "geolibre:result") {
      const command = this.pendingCommands.get(data.requestId);
      if (!command) return;
      this.pendingCommands.delete(data.requestId);
      if (!data.ok) { this.fail("unavailable", { method: command.method, message: data.error }); return; }
      command.done(data.value);
      return;
    }
    if (data.type === "geolibre:state") {
      if (!this.sequence || data.seq !== this.sequence || projectScopeKey(data.project) !== this.scopeKey) return;
      this.liveProject = data.project;
      if (!this.acknowledged) {
        this.acknowledged = true;
        this.log("project_acknowledged", { sequence: this.sequence, sinceSendMs: Math.round(this.now() - this.projectSentAt) });
      }
      this.onProjectState?.(data.project);
      this.poll();
      return;
    }
    if (!this.sequence || data.seq !== this.sequence || data.scopeKey !== this.scopeKey) return;
    if (data.type === "corestack:map-bounds") {
      const bounds = data.bounds;
      if (bounds && [bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite) && bounds.width > 0 && bounds.height > 0) this.onBounds?.(bounds);
    }
    if (data.type === "corestack:render-error" && this.awaitingRender) this.fail("unavailable", { message: data.message, sourceId: data.sourceId });
    if (data.type === "corestack:map-rendered" && this.awaitingRender && !this.rendered && !this.failed) {
      this.rendered = true;
      clearTimeout(this.timeout);
      const timing = { sequence: this.sequence, handshakeToRenderMs: Math.round(this.now() - this.handshakeAt), projectToRenderMs: Math.round(this.now() - this.projectSentAt), totalMs: Math.round(this.now() - this.startedAt), renderVerified: true };
      this.log("map_render_confirmed", timing);
      this.completeStartup(timing);
    }
  }

  dispose() {
    clearTimeout(this.timeout);
    clearTimeout(this.stageTimer);
    clearInterval(this.pollTimer);
    this.pendingCommands.clear();
  }
}
