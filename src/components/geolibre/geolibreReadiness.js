import { geoLibreVersionStatus } from "../../config/geolibre.config";

export const projectScopeKey = project => {
  const scope = project?.metadata?.scope;
  return scope ? [scope.state, scope.district, scope.tehsil].join("|") : "";
};

// The public bridge confirms project acknowledgement and live map commands.
// It does not expose tile completion; readiness never claims verified rendering.
export class GeoLibreReadiness {
  constructor({ post, log, update, onProjectState, onReady, now = () => performance.now() }) {
    Object.assign(this, { post, log, update, onProjectState, onReady, now });
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
      this.fail("delayed");
    }, 90000);
  }

  fail(issue, details) {
    if (details) this.log("viewer_failed", details);
    this.failed = true;
    clearTimeout(this.timeout);
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
    this.interactive = false;
    this.failed = false;
    this.projectSentAt = this.now();
    this.deferred = project.layers.filter(layer => layer.metadata?.startupDelayMs && !this.startedLayers.has(`${this.scopeKey}:${layer.id}`)).sort((a, b) => a.metadata.startupDelayMs - b.metadata.startupDelayMs);
    if (!this.bootComplete) this.update({ state: "preparing", issue: "" });
    this.post({ type: "geolibre:load-project", project, seq: this.sequence });
    this.log("project_sent", { sequence: this.sequence, layerCount: project.layers.length });
    this.armTimeout("map_initialization");
    this.poll();
  }

  command(method, params, done) {
    const requestId = `kyl-${this.sequence}-${method}-${++this.commandCount}`;
    this.pendingCommands.set(requestId, { done, method });
    this.post({ type: "geolibre:command", requestId, method, params });
  }

  poll() {
    if (!this.handshake || !this.project || this.failed || this.interactive) return;
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
    this.interactive = true;
    clearTimeout(this.timeout);
    this.log("workspace_interactive", { sequence: this.sequence, renderVerified: false });
    this.completeStartup({ renderVerified: false, handshakeToMapMs: Math.round(this.now() - this.handshakeAt) });
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
  }

  dispose() {
    clearTimeout(this.timeout);
    clearTimeout(this.stageTimer);
    clearInterval(this.pollTimer);
    this.pendingCommands.clear();
  }
}
