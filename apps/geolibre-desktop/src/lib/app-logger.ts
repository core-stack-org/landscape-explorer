import { useAppStore } from "@geolibre/core";
import type { Map as MapLibreMap } from "maplibre-gl";

export type AppLogLevel = "debug" | "info" | "warn" | "error";
export type AppLogPrimitive = string | number | boolean | null;

export interface AppLogEvent {
  schemaVersion: 1;
  id: string;
  sessionId: string;
  sequence: number;
  timestamp: string;
  level: AppLogLevel;
  name: string;
  context: Record<string, AppLogPrimitive>;
  data: Record<string, AppLogPrimitive>;
}

export interface AppLogSnapshot {
  eventCount: number;
  pendingRemoteCount: number;
  lastEventAt?: string;
}

export type AppLogContextProvider = () => Record<string, AppLogPrimitive | undefined>;

interface AppLoggerDebugApi {
  getEvents: () => readonly AppLogEvent[];
  clear: () => void;
  download: () => void;
  flush: () => Promise<void>;
}

declare global {
  interface Window {
    __GEOLIBRE_LOGGER__?: AppLoggerDebugApi;
  }
}

const STORAGE_KEY = "geolibre:interaction-log:v1";
const DEFAULT_MAX_EVENTS = 1_000;
const REMOTE_BATCH_SIZE = 25;
const REMOTE_FLUSH_MS = 15_000;
const SAFE_KEY_PATTERN = /^(mode|state|district|tehsil|source|kind|status|action|target|role|tag|inputType|key|code|count|total|matched|visible|zoom|bearing|pitch|reason|errorName|summary|chapterCount|layerCount|filterCount|storyId|schema)$/;
const SENSITIVE_KEY_PATTERN =
  /(authorization|cookie|credential|email|html|password|query|secret|text|token|url|value)/i;
const NON_TEXT_KEYS = new Set([
  "Enter",
  "Escape",
  " ",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Home",
  "End",
  "PageUp",
  "PageDown",
  "Tab",
]);

const metaEnv = (import.meta as ImportMeta & { env?: Record<string, unknown> }).env;

function envValue(name: string): string | null {
  const value = metaEnv?.[name];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function envBoolean(name: string, fallback: boolean): boolean {
  const value = envValue(name)?.toLowerCase();
  if (value === "true" || value === "1" || value === "yes") return true;
  if (value === "false" || value === "0" || value === "no") return false;
  return fallback;
}

function envInteger(name: string, fallback: number): number {
  const value = Number(envValue(name));
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function telemetryEndpoint(): string | null {
  const raw = envValue("VITE_GEOLIBRE_LOG_ENDPOINT");
  if (!raw) return null;
  try {
    const url = new URL(raw, typeof window === "undefined" ? "http://localhost" : window.location.href);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

function safeString(value: string): string {
  return value
    .replace(/https?:\/\/[^\s]+/gi, "[url]")
    .replace(/\?.*$/g, "")
    .replace(/\/home\/[^/\s]+/g, "/home/[user]")
    .slice(0, 240);
}

export function sanitizeAppLogData(
  input: Record<string, unknown>,
): Record<string, AppLogPrimitive> {
  const sanitized: Record<string, AppLogPrimitive> = {};
  for (const [key, value] of Object.entries(input)) {
    if (SENSITIVE_KEY_PATTERN.test(key) || !SAFE_KEY_PATTERN.test(key)) continue;
    if (value === null || typeof value === "boolean") {
      sanitized[key] = value;
    } else if (typeof value === "number" && Number.isFinite(value)) {
      sanitized[key] = value;
    } else if (typeof value === "string") {
      sanitized[key] = safeString(value);
    }
  }
  return sanitized;
}

function targetDescriptor(target: EventTarget | null): Record<string, AppLogPrimitive> {
  if (!(target instanceof Element)) return { target: "unknown" };
  const element = target.closest<HTMLElement>(
    "[data-log-action],button,a,input,select,textarea,[role]",
  );
  if (!element) {
    return {
      target: target instanceof HTMLElement ? target.tagName.toLowerCase() : "node",
    };
  }
  const tag = element.tagName.toLowerCase();
  const role = element.getAttribute("role") ?? (tag === "button" ? "button" : tag === "a" ? "link" : "");
  const action =
    element.dataset.logAction ??
    (element.id && /^[a-zA-Z][\w:-]{0,80}$/.test(element.id) ? element.id : "") ??
    "";
  const inputType =
    element instanceof HTMLInputElement ? element.type || "text" : tag === "select" ? "select" : "";
  return sanitizeAppLogData({
    target: action || `${tag}${role ? `:${role}` : ""}`,
    tag,
    role,
    inputType,
  });
}

let events: AppLogEvent[] = [];
let pendingRemote: AppLogEvent[] = [];
let contextProvider: AppLogContextProvider | null = null;
let sequence = 0;
let sessionId = createId("session");
let loaded = false;
let installCount = 0;
let persistTimer: number | null = null;
let remoteTimer: number | null = null;
let remoteSending = false;
let lastScrollAt = 0;
let snapshot: AppLogSnapshot = { eventCount: 0, pendingRemoteCount: 0 };
const listeners = new Set<() => void>();

function publishSnapshot(): void {
  snapshot = {
    eventCount: events.length,
    pendingRemoteCount: pendingRemote.length,
    ...(events.at(-1)?.timestamp ? { lastEventAt: events.at(-1)?.timestamp } : {}),
  };
  for (const listener of listeners) listener();
}

function loadPersistedEvents(): void {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as unknown;
    if (Array.isArray(parsed)) {
      events = parsed
        .filter(
          (event): event is AppLogEvent =>
            Boolean(event) &&
            typeof event === "object" &&
            (event as Partial<AppLogEvent>).schemaVersion === 1,
        )
        .slice(-envInteger("VITE_GEOLIBRE_LOG_MAX_EVENTS", DEFAULT_MAX_EVENTS));
    }
  } catch {
    events = [];
  }
  publishSnapshot();
}

function persistEvents(): void {
  if (typeof window === "undefined") return;
  if (persistTimer !== null) window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => {
    persistTimer = null;
    persistEventsNow();
  }, 250);
}

function persistEventsNow(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    // A full or unavailable localStorage must never break the application.
  }
}

function defaultContext(): Record<string, AppLogPrimitive> {
  const state = useAppStore.getState();
  const visibleLayers = state.layers.filter((layer) => layer.visible).length;
  return {
    layerCount: state.layers.length,
    visible: visibleLayers,
    storyId: state.storymap?.chapters[0]?.id?.startsWith("core-tehsil-v1:")
      ? "core-tehsil-v1"
      : state.storymap
        ? "custom"
        : "none",
  };
}

function currentContext(): Record<string, AppLogPrimitive> {
  const extra = contextProvider?.() ?? {};
  return {
    ...defaultContext(),
    ...sanitizeAppLogData(extra),
  };
}

function scheduleRemoteFlush(): void {
  if (typeof window === "undefined" || !telemetryEndpoint()) return;
  if (pendingRemote.length >= REMOTE_BATCH_SIZE) {
    void flushAppLog();
    return;
  }
  if (remoteTimer !== null) return;
  remoteTimer = window.setTimeout(() => {
    remoteTimer = null;
    void flushAppLog();
  }, REMOTE_FLUSH_MS);
}

export function recordAppEvent(
  name: string,
  data: Record<string, unknown> = {},
  level: AppLogLevel = "info",
): AppLogEvent {
  loadPersistedEvents();
  const event: AppLogEvent = {
    schemaVersion: 1,
    id: createId("event"),
    sessionId,
    sequence: ++sequence,
    timestamp: new Date().toISOString(),
    level,
    name: safeString(name),
    context: currentContext(),
    data: sanitizeAppLogData(data),
  };
  const maxEvents = envInteger("VITE_GEOLIBRE_LOG_MAX_EVENTS", DEFAULT_MAX_EVENTS);
  events = [...events.slice(-(maxEvents - 1)), event];
  if (telemetryEndpoint()) {
    pendingRemote = [...pendingRemote.slice(-(maxEvents - 1)), event];
  }
  persistEvents();
  scheduleRemoteFlush();
  publishSnapshot();
  if (envBoolean("VITE_GEOLIBRE_LOG_CONSOLE", Boolean(metaEnv?.DEV))) {
    console.debug("[GeoLibre log]", event);
  }
  return event;
}

export function getAppLogEvents(): readonly AppLogEvent[] {
  loadPersistedEvents();
  return events;
}

export function getAppLogSnapshot(): AppLogSnapshot {
  loadPersistedEvents();
  return snapshot;
}

export function subscribeAppLog(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setAppLogContextProvider(provider: AppLogContextProvider | null): void {
  contextProvider = provider;
}

export async function flushAppLog(options: { beacon?: boolean } = {}): Promise<void> {
  const endpoint = telemetryEndpoint();
  if (!endpoint || !pendingRemote.length || remoteSending) return;
  if (typeof navigator !== "undefined" && navigator.doNotTrack === "1") return;
  const batch = pendingRemote.splice(0, REMOTE_BATCH_SIZE);
  publishSnapshot();
  const body = JSON.stringify({ schemaVersion: 1, events: batch });
  if (options.beacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
    const sent = navigator.sendBeacon(endpoint, new Blob([body], { type: "application/json" }));
    if (!sent) pendingRemote.unshift(...batch);
    publishSnapshot();
    return;
  }
  remoteSending = true;
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        // The diagnostics fetch wrapper removes this local-only marker before
        // sending. It keeps an unavailable optional telemetry receiver from
        // recursively generating more telemetry failure events.
        "x-geolibre-optional-resource": "app-activity-log",
      },
      body,
      keepalive: true,
    });
    if (!response.ok) pendingRemote.unshift(...batch);
  } catch {
    pendingRemote.unshift(...batch);
  } finally {
    remoteSending = false;
    publishSnapshot();
    if (pendingRemote.length) scheduleRemoteFlush();
  }
}

export function clearAppLog(): void {
  events = [];
  pendingRemote = [];
  sequence = 0;
  sessionId = createId("session");
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore unavailable storage.
    }
  }
  publishSnapshot();
}

export function downloadAppLog(): void {
  if (typeof document === "undefined") return;
  recordAppEvent("logger.downloaded", { count: events.length });
  const content = JSON.stringify(
    {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      events,
    },
    null,
    2,
  );
  const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `geolibre-interaction-log-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function handleClick(event: MouseEvent): void {
  recordAppEvent("interaction.click", targetDescriptor(event.target));
}

function handleChange(event: Event): void {
  recordAppEvent("interaction.change", targetDescriptor(event.target));
}

function handleSubmit(event: SubmitEvent): void {
  recordAppEvent("interaction.submit", targetDescriptor(event.target));
}

function handleKeydown(event: KeyboardEvent): void {
  if (!NON_TEXT_KEYS.has(event.key) && !(event.ctrlKey || event.metaKey || event.altKey)) return;
  recordAppEvent("interaction.key", {
    ...targetDescriptor(event.target),
    key: event.key,
    code: event.code,
  });
}

function handleScroll(event: Event): void {
  const now = Date.now();
  if (now - lastScrollAt < 1_000) return;
  lastScrollAt = now;
  recordAppEvent("interaction.scroll", targetDescriptor(event.target));
}

function handlePageHide(): void {
  if (persistTimer !== null) {
    window.clearTimeout(persistTimer);
    persistTimer = null;
  }
  persistEventsNow();
  void flushAppLog({ beacon: true });
}

export function installAppInteractionLogger(): () => void {
  if (typeof window === "undefined" || typeof document === "undefined") return () => {};
  installCount += 1;
  if (installCount > 1) {
    return () => {
      installCount = Math.max(0, installCount - 1);
    };
  }
  loadPersistedEvents();
  document.addEventListener("click", handleClick, true);
  document.addEventListener("change", handleChange, true);
  document.addEventListener("submit", handleSubmit, true);
  document.addEventListener("keydown", handleKeydown, true);
  document.addEventListener("scroll", handleScroll, true);
  window.addEventListener("pagehide", handlePageHide);
  window.__GEOLIBRE_LOGGER__ = {
    getEvents: getAppLogEvents,
    clear: clearAppLog,
    download: downloadAppLog,
    flush: flushAppLog,
  };
  recordAppEvent("logger.started", {
    status: telemetryEndpoint() ? "local-and-remote" : "local",
    count: events.length,
  });
  return () => {
    installCount = Math.max(0, installCount - 1);
    if (installCount) return;
    document.removeEventListener("click", handleClick, true);
    document.removeEventListener("change", handleChange, true);
    document.removeEventListener("submit", handleSubmit, true);
    document.removeEventListener("keydown", handleKeydown, true);
    document.removeEventListener("scroll", handleScroll, true);
    window.removeEventListener("pagehide", handlePageHide);
    handlePageHide();
  };
}

export function attachMapInteractionLogger(map: MapLibreMap): () => void {
  const onClick = () => recordAppEvent("map.click", { action: "inspect-or-select" });
  const onMoveEnd = () =>
    recordAppEvent("map.move_end", {
      zoom: Number(map.getZoom().toFixed(2)),
      bearing: Number(map.getBearing().toFixed(1)),
      pitch: Number(map.getPitch().toFixed(1)),
    });
  const onError = (event: { error?: Error }) =>
    recordAppEvent(
      "map.error",
      {
        errorName: event.error?.name ?? "MapError",
        summary: "Map runtime error",
      },
      "error",
    );
  map.on("click", onClick);
  map.on("moveend", onMoveEnd);
  map.on("error", onError);
  recordAppEvent("map.logger_attached", { status: "ready" });
  return () => {
    map.off("click", onClick);
    map.off("moveend", onMoveEnd);
    map.off("error", onError);
  };
}
