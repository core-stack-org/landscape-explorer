#!/usr/bin/env node

/**
 * Production-browser memory profiler for the KYL + GeoLibre integration.
 *
 * This runner uses exact UI targets and verifies every state transition. It
 * intentionally keeps resident memory, page heap, transferred bytes, profile
 * disk usage, WebGL details, and origin storage as separate measurements.
 */

import { chromium, firefox } from "playwright";
import { execFile } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const parsedArgs = Object.fromEntries(
  process.argv.slice(2).map((argument) => {
    const [key, ...rest] = argument.replace(/^--/, "").split("=");
    return [key, rest.length ? rest.join("=") : true];
  })
);

const engineName = String(parsedArgs.engine || "chromium").toLowerCase();
if (!["chromium", "firefox"].includes(engineName)) {
  throw new Error(`Unsupported engine: ${engineName}`);
}

const browserType = engineName === "firefox" ? firefox : chromium;
const baseUrl = String(parsedArgs.url || "http://127.0.0.1:4173/");
const outputDirectory = path.resolve(
  String(parsedArgs.out || `artifacts/memory/corrected/${engineName}`)
);
const executablePath = parsedArgs.executable
  ? path.resolve(String(parsedArgs.executable))
  : browserType.executablePath();
const settleMs = Number(parsedArgs.settleMs || 3500);
const stableIntervalMs = Number(parsedArgs.stableIntervalMs || 1500);
const timeoutMs = Number(parsedArgs.timeoutMs || 120000);
const scope = {
  state: String(parsedArgs.state || "Bihar"),
  district: String(parsedArgs.district || "Banka"),
  tehsil: String(parsedArgs.tehsil || "Banka"),
};

const targetRaster = "LULC Level 1 · 2024-2025";
const targetLayers = [
  {
    name: "Micro-watersheds and Hydrological Variables",
    group: "Hydrology",
    type: "vector",
  },
  { name: "Digital Elevation Model", group: "Land", type: "raster" },
  { name: "CLART", group: "Hydrology", type: "raster" },
];

const events = [];
const errors = [];
const assertions = [];
const scenarios = [];
const samples = [];
const networkRecords = [];
const pendingNetworkRecords = new Set();
const requestMetadata = new WeakMap();
let activePhase = "bootstrap";
let previousNetworkCursor = 0;

const now = () => new Date().toISOString();
const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));
const record = (event, details = {}) =>
  events.push({ timestamp: now(), event, phase: activePhase, ...details });

const runCommand = async (command, args, options = {}) => {
  try {
    const result = await execFileAsync(command, args, {
      maxBuffer: 16 * 1024 * 1024,
      ...options,
    });
    return result.stdout.trim();
  } catch (error) {
    return null;
  }
};

const sha256 = async (filename) => {
  try {
    const content = await fsp.readFile(filename);
    return crypto.createHash("sha256").update(content).digest("hex");
  } catch {
    return null;
  }
};

const directorySize = async (directory) => {
  if (!directory) return null;
  const output = await runCommand("du", ["-sb", directory]);
  const value = Number(output?.split(/\s+/)[0]);
  return Number.isFinite(value) ? value : null;
};

const parseSmapsRollup = async (pid) => {
  try {
    const source = await fsp.readFile(`/proc/${pid}/smaps_rollup`, "utf8");
    const value = (name) => {
      const match = source.match(new RegExp(`^${name}:\\s+(\\d+) kB$`, "m"));
      return match ? Number(match[1]) * 1024 : 0;
    };
    return {
      pssBytes: value("Pss"),
      privateBytes: value("Private_Clean") + value("Private_Dirty"),
      swapBytes: value("Swap"),
    };
  } catch {
    return { pssBytes: null, privateBytes: null, swapBytes: null };
  }
};

const classifyProcess = (row, rootPid) => {
  if (row.pid === rootPid) return "browser";
  const type = row.args.match(/--type=([^ ]+)/)?.[1];
  if (type === "gpu-process") return "gpu";
  if (type === "renderer") return "renderer";
  if (type === "zygote") return "zygote";
  if (type === "utility") {
    if (/NetworkService/i.test(row.args)) return "network-service";
    if (/StorageService/i.test(row.args)) return "storage-service";
    return "utility";
  }
  const joined = `${row.command} ${row.args}`;
  if (/Socket Process/i.test(joined)) return "network-service";
  if (/RDD Process/i.test(joined)) return "media-rdd";
  if (/WebExtensions/i.test(joined)) return "web-extensions";
  if (/Utility Process/i.test(joined)) return "utility";
  if (/Web Content|Isolated Web|Privileged Cont|-contentproc/i.test(joined)) {
    return "renderer";
  }
  return "other";
};

const processTreeMemory = async (rootPid) => {
  if (!rootPid) {
    return {
      rootPid: null,
      totalRssBytes: null,
      totalPssBytes: null,
      totalPrivateBytes: null,
      totalSwapBytes: null,
      byRole: {},
      processes: [],
      profileDirectory: null,
      profileDiskBytes: null,
    };
  }
  const output = await runCommand("ps", [
    "-eo",
    "pid=,ppid=,rss=,comm=,args=",
  ]);
  if (!output) return { rootPid, error: "ps failed", processes: [] };
  const rows = output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\d+)\s+(\d+)\s+(\d+)\s+(\S+)\s+(.*)$/);
      return match
        ? {
            pid: Number(match[1]),
            ppid: Number(match[2]),
            rssBytes: Number(match[3]) * 1024,
            command: match[4],
            args: match[5],
          }
        : null;
    })
    .filter(Boolean);
  const byParent = new Map();
  for (const row of rows) {
    const children = byParent.get(row.ppid) || [];
    children.push(row);
    byParent.set(row.ppid, children);
  }
  const selected = [];
  const queue = [Number(rootPid)];
  const seen = new Set();
  while (queue.length) {
    const pid = queue.shift();
    if (seen.has(pid)) continue;
    seen.add(pid);
    const row = rows.find((candidate) => candidate.pid === pid);
    if (row) selected.push(row);
    for (const child of byParent.get(pid) || []) queue.push(child.pid);
  }
  const detailed = await Promise.all(
    selected.map(async (row) => ({
      ...row,
      role: classifyProcess(row, Number(rootPid)),
      ...(await parseSmapsRollup(row.pid)),
    }))
  );
  const byRole = {};
  for (const row of detailed) {
    const aggregate = byRole[row.role] || {
      count: 0,
      rssBytes: 0,
      pssBytes: 0,
      privateBytes: 0,
      swapBytes: 0,
    };
    aggregate.count += 1;
    aggregate.rssBytes += row.rssBytes || 0;
    aggregate.pssBytes += row.pssBytes || 0;
    aggregate.privateBytes += row.privateBytes || 0;
    aggregate.swapBytes += row.swapBytes || 0;
    byRole[row.role] = aggregate;
  }
  const root = detailed.find((row) => row.pid === Number(rootPid));
  const profileDirectory =
    root?.args.match(/--user-data-dir=(?:"([^"]+)"|(\S+))/)?.slice(1).find(Boolean) ||
    root?.args.match(/-profile\s+(?:"([^"]+)"|(\S+))/)?.slice(1).find(Boolean) ||
    null;
  return {
    rootPid: Number(rootPid),
    totalRssBytes: detailed.reduce((sum, row) => sum + (row.rssBytes || 0), 0),
    totalPssBytes: detailed.reduce((sum, row) => sum + (row.pssBytes || 0), 0),
    totalPrivateBytes: detailed.reduce(
      (sum, row) => sum + (row.privateBytes || 0),
      0
    ),
    totalSwapBytes: detailed.reduce((sum, row) => sum + (row.swapBytes || 0), 0),
    byRole,
    processes: detailed,
    profileDirectory,
    profileDiskBytes: await directorySize(profileDirectory),
  };
};

const classifyRequest = (rawUrl) => {
  const url = rawUrl.toLowerCase();
  if (/service=wms|request=getmap/.test(url)) return "raster-wms";
  if (/service=wfs|request=getfeature/.test(url)) return "vector-wfs";
  if (/jupyterlite|pyodide|python_stdlib|\.wasm|micropip/.test(url)) {
    return "jupyter-pyodide";
  }
  if (/mt\d*\.google\.com|openfreemap|\/tiles\//.test(url)) return "basemap";
  if (/geoserver\.core-stack\.org.*\/api\//.test(url)) return "corestack-api";
  if (/geoserver\.core-stack\.org/.test(url)) return "corestack-geoserver";
  if (/web\.geolibre\.app/.test(url)) return "geolibre-app";
  if (/127\.0\.0\.1|localhost/.test(url)) return "kyl-app";
  return "other";
};

const summarizeNetwork = (records) => {
  const summary = {
    requestCount: 0,
    failedCount: 0,
    responseBodyBytes: 0,
    wireBytes: 0,
    serverContentLengthBytes: 0,
    fromServiceWorkerCount: 0,
    byCategory: {},
  };
  for (const item of records) {
    summary.requestCount += 1;
    summary.failedCount += item.failed ? 1 : 0;
    summary.responseBodyBytes += item.responseBodyBytes || 0;
    summary.wireBytes += item.wireBytes || 0;
    summary.serverContentLengthBytes += item.contentLengthBytes || 0;
    summary.fromServiceWorkerCount += item.fromServiceWorker ? 1 : 0;
    const category = summary.byCategory[item.category] || {
      requestCount: 0,
      failedCount: 0,
      responseBodyBytes: 0,
      wireBytes: 0,
      serverContentLengthBytes: 0,
      fromServiceWorkerCount: 0,
    };
    category.requestCount += 1;
    category.failedCount += item.failed ? 1 : 0;
    category.responseBodyBytes += item.responseBodyBytes || 0;
    category.wireBytes += item.wireBytes || 0;
    category.serverContentLengthBytes += item.contentLengthBytes || 0;
    category.fromServiceWorkerCount += item.fromServiceWorker ? 1 : 0;
    summary.byCategory[item.category] = category;
  }
  return summary;
};

const waitForPendingNetwork = async () => {
  if (pendingNetworkRecords.size) {
    await Promise.allSettled([...pendingNetworkRecords]);
  }
};

const frameMetrics = async (frame, role) => {
  if (!frame || frame.isDetached()) return null;
  try {
    return await frame.evaluate(async (frameRole) => {
      const resources = performance.getEntriesByType("resource");
      const resourceTotals = resources.reduce(
        (total, entry) => {
          total.transferBytes += entry.transferSize || 0;
          total.encodedBytes += entry.encodedBodySize || 0;
          total.decodedBytes += entry.decodedBodySize || 0;
          return total;
        },
        { transferBytes: 0, encodedBytes: 0, decodedBytes: 0 }
      );
      const memory = performance.memory
        ? {
            jsHeapUsedBytes: performance.memory.usedJSHeapSize,
            jsHeapTotalBytes: performance.memory.totalJSHeapSize,
            jsHeapLimitBytes: performance.memory.jsHeapSizeLimit,
          }
        : {};
      const storageEstimate = navigator.storage?.estimate
        ? await navigator.storage.estimate().catch(() => null)
        : null;
      const cacheNames = globalThis.caches
        ? await caches.keys().catch(() => [])
        : [];
      const indexedDatabases = indexedDB?.databases
        ? await indexedDB.databases().catch(() => [])
        : [];
      const canvas =
        document.querySelector("canvas.maplibregl-canvas") ||
        document.querySelector("canvas");
      let webgl = null;
      if (canvas) {
        const context =
          canvas.getContext("webgl2") ||
          canvas.getContext("webgl") ||
          canvas.getContext("experimental-webgl");
        if (context) {
          const debug = context.getExtension("WEBGL_debug_renderer_info");
          webgl = {
            version: context.getParameter(context.VERSION),
            shadingLanguageVersion: context.getParameter(
              context.SHADING_LANGUAGE_VERSION
            ),
            vendor: debug
              ? context.getParameter(debug.UNMASKED_VENDOR_WEBGL)
              : context.getParameter(context.VENDOR),
            renderer: debug
              ? context.getParameter(debug.UNMASKED_RENDERER_WEBGL)
              : context.getParameter(context.RENDERER),
          };
        }
      }
      const layers = [...document.querySelectorAll('[data-testid="layer-row"]')].map(
        (row) => ({
          name: row.getAttribute("data-layer-name"),
          type:
            [...row.querySelectorAll("span")]
              .map((node) => node.textContent?.trim().toLowerCase())
              .find((text) => ["vector", "raster", "basemap"].includes(text)) ||
            null,
          visibility:
            row
              .querySelector(
                'button[aria-label="Hide layer"],button[aria-label="Show layer"]'
              )
              ?.getAttribute("aria-label") === "Hide layer"
              ? "visible"
              : "hidden",
        })
      );
      const groups = [...document.querySelectorAll("[data-group-name]")].map(
        (group) => ({
          name: group.getAttribute("data-group-name"),
          expanded:
            group
              .querySelector(
                'button[aria-label="Collapse group"],button[aria-label="Expand group"]'
              )
              ?.getAttribute("aria-label") === "Collapse group",
        })
      );
      return {
        role: frameRole,
        url: location.href,
        title: document.title,
        readyState: document.readyState,
        domNodes: document.getElementsByTagName("*").length,
        visibleTextLength: document.body?.innerText?.length || 0,
        resourceCount: resources.length,
        ...resourceTotals,
        ...memory,
        storageEstimate,
        cacheNames,
        indexedDatabases,
        serviceWorkerControlled: Boolean(navigator.serviceWorker?.controller),
        webgl,
        layers,
        groups,
        jupyterKernelStatus:
          document.querySelector(".jp-KernelStatus")?.textContent?.trim() || null,
      };
    }, role);
  } catch (error) {
    return { role, error: String(error), url: frame.url() };
  }
};

const geoLibreFrame = (page) =>
  page
    .frames()
    .find(
      (frame) =>
        frame !== page.mainFrame() &&
        frame.url().includes("web.geolibre.app") &&
        !frame.url().includes("/jupyterlite/")
    ) || null;

const jupyterFrame = (page) =>
  page.frames().find((frame) => frame.url().includes("/jupyterlite/")) || null;

const waitForJupyterFrame = async (page) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const frame = jupyterFrame(page);
    if (frame) return frame;
    await sleep(500);
  }
  throw new Error("JupyterLite frame did not appear before timeout");
};

const cdpMetrics = async (cdp) => {
  if (!cdp) return null;
  const [domCounters, performance] = await Promise.all([
    cdp.send("Memory.getDOMCounters").catch(() => null),
    cdp.send("Performance.getMetrics").catch(() => null),
  ]);
  return { domCounters, performance: performance?.metrics || [] };
};

const sample = async (page, cdp, browserPid, label, details = {}) => {
  await waitForPendingNetwork();
  const frames = [
    await frameMetrics(page.mainFrame(), "kyl"),
    await frameMetrics(geoLibreFrame(page), "geolibre"),
    await frameMetrics(jupyterFrame(page), "jupyter"),
  ].filter(Boolean);
  const currentNetworkCursor = networkRecords.length;
  const newNetwork = networkRecords.slice(
    previousNetworkCursor,
    currentNetworkCursor
  );
  previousNetworkCursor = currentNetworkCursor;
  const processMemory = await processTreeMemory(browserPid);
  const messages = await page
    .evaluate(() => window.__kylMemoryMessages || [])
    .catch(() => []);
  const item = {
    timestamp: now(),
    label,
    phase: activePhase,
    url: page.url(),
    frames,
    workers: page.workers().map((worker) => worker.url()),
    processMemory,
    cdp: await cdpMetrics(cdp),
    networkCursor: currentNetworkCursor,
    networkCumulative: summarizeNetwork(networkRecords),
    networkSincePreviousSample: summarizeNetwork(newNetwork),
    messages,
    ...details,
  };
  samples.push(item);
  record("sample", { label, sampleIndex: samples.length - 1 });
  return item;
};

const stableSamples = async (page, cdp, browserPid, label, count = 3) => {
  const result = [];
  for (let index = 1; index <= count; index += 1) {
    if (index > 1) await sleep(stableIntervalMs);
    result.push(
      await sample(page, cdp, browserPid, `${label}:stable-${index}`, {
        stableIndex: index,
      })
    );
  }
  return result;
};

const assertProbe = (scenario, name, condition, actual, expected) => {
  const result = {
    timestamp: now(),
    scenario,
    name,
    passed: Boolean(condition),
    actual,
    expected,
  };
  assertions.push(result);
  record("assertion", result);
  if (!condition) {
    throw new Error(
      `Assertion failed (${scenario}: ${name}); expected ${JSON.stringify(
        expected
      )}, got ${JSON.stringify(actual)}`
    );
  }
};

const runScenario = async (page, cdp, browserPid, id, action) => {
  activePhase = `${id}:before`;
  const before = await sample(page, cdp, browserPid, `${id}:before`);
  const assertionStart = assertions.length;
  const sampleStart = samples.length;
  let status = "passed";
  let error = null;
  try {
    activePhase = `${id}:action`;
    await action();
  } catch (caught) {
    status = "failed";
    error = String(caught?.stack || caught);
    errors.push({ timestamp: now(), scenario: id, error });
    record("scenario_error", { scenario: id, error });
  }
  activePhase = `${id}:after`;
  const after = await sample(page, cdp, browserPid, `${id}:after`);
  scenarios.push({
    id,
    status,
    error,
    beforeSampleIndex: samples.indexOf(before),
    afterSampleIndex: samples.indexOf(after),
    interiorSampleIndexes: samples
      .slice(sampleStart, -1)
      .map((entry) => samples.indexOf(entry)),
    assertions: assertions.slice(assertionStart),
  });
};

const route = (pathname) => new URL(pathname, baseUrl).toString();

const navigate = async (page, pathname, waitMilliseconds = settleMs) => {
  record("navigate", { pathname });
  await page.goto(route(pathname), {
    waitUntil: "domcontentloaded",
    timeout: timeoutMs,
  });
  await sleep(waitMilliseconds);
};

const waitForGeoLibre = async (page) => {
  await page
    .locator('iframe[title="GeoLibre GIS workspace"]')
    .waitFor({ state: "attached", timeout: timeoutMs });
  const deadline = Date.now() + timeoutMs;
  let frame = null;
  while (!frame && Date.now() < deadline) {
    frame = geoLibreFrame(page);
    if (!frame) await sleep(250);
  }
  if (!frame) {
    throw new Error("GeoLibre iframe was attached but its loaded frame was missing");
  }
  await frame
    .locator('[data-testid="layer-row"]')
    .first()
    .waitFor({ state: "visible", timeout: timeoutMs });
  await sleep(settleMs);
  return frame;
};

const quotedAttribute = (value) =>
  String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"');

const groupRow = (frame, name) =>
  frame.locator(`[data-group-name="${quotedAttribute(name)}"]`).first();

const layerRow = (frame, name) =>
  frame.locator(`[data-layer-name="${quotedAttribute(name)}"]`).first();

const ensureGroupExpanded = async (page, name) => {
  const frame = geoLibreFrame(page);
  if (!frame) throw new Error(`Cannot expand ${name}: GeoLibre frame missing`);
  const group = groupRow(frame, name);
  await group.waitFor({ state: "visible", timeout: timeoutMs });
  const expand = group.locator('button[aria-label="Expand group"]');
  if (await expand.count()) {
    await expand.click();
    await group
      .locator('button[aria-label="Collapse group"]')
      .waitFor({ state: "attached", timeout: 15000 });
    await sleep(500);
  }
};

const getLayerVisibility = async (page, name) => {
  const frame = geoLibreFrame(page);
  if (!frame) return "missing-frame";
  const row = layerRow(frame, name);
  if (!(await row.count())) return "missing-row";
  if (await row.locator('button[aria-label="Hide layer"]').count()) {
    return "visible";
  }
  if (await row.locator('button[aria-label="Show layer"]').count()) {
    return "hidden";
  }
  return "unknown";
};

const setLayerVisibility = async (page, name, visible) => {
  const frame = geoLibreFrame(page);
  if (!frame) throw new Error(`Cannot toggle ${name}: GeoLibre frame missing`);
  const row = layerRow(frame, name);
  await row.waitFor({ state: "visible", timeout: timeoutMs });
  const current = await getLayerVisibility(page, name);
  if ((visible && current === "visible") || (!visible && current === "hidden")) {
    return;
  }
  const requestedLabel = visible ? "Show layer" : "Hide layer";
  const expectedLabel = visible ? "Hide layer" : "Show layer";
  await row.locator(`button[aria-label="${requestedLabel}"]`).click();
  await layerRow(frame, name)
    .locator(`button[aria-label="${expectedLabel}"]`)
    .waitFor({ state: "attached", timeout: timeoutMs });
  await sleep(settleMs);
};

const chooseReactSelect = async (page, index, value) => {
  const boxes = page.getByRole("combobox");
  await boxes.nth(index).waitFor({ state: "visible", timeout: timeoutMs });
  await page.waitForFunction(
    (selectIndex) => {
      const box = document.querySelectorAll('[role="combobox"]')[selectIndex];
      return box && !box.disabled && box.getAttribute("aria-disabled") !== "true";
    },
    index,
    { timeout: timeoutMs }
  );
  await boxes.nth(index).click();
  await boxes.nth(index).fill(value);
  const option = page.getByRole("option", { name: value, exact: true });
  await option.waitFor({ state: "visible", timeout: timeoutMs });
  await option.click();
  await sleep(500);
};

const visibleLayerNames = async (page) => {
  const frame = geoLibreFrame(page);
  if (!frame) return [];
  return frame
    .locator('[data-testid="layer-row"]')
    .evaluateAll((rows) =>
      rows
        .filter((row) => row.querySelector('button[aria-label="Hide layer"]'))
        .map((row) => row.getAttribute("data-layer-name"))
        .filter(Boolean)
    );
};

const main = async () => {
  await fsp.mkdir(outputDirectory, { recursive: true });
  const repositoryRoot = (await runCommand("git", ["rev-parse", "--show-toplevel"])) ||
    process.cwd();
  const branch = await runCommand("git", ["branch", "--show-current"]);
  const commit = await runCommand("git", ["rev-parse", "HEAD"]);
  const status = await runCommand("git", ["status", "--short"]);
  const buildIndex = path.join(repositoryRoot, "build", "index.html");
  const buildScripts = fs.existsSync(path.join(repositoryRoot, "build", "static", "js"))
    ? (await fsp.readdir(path.join(repositoryRoot, "build", "static", "js")))
        .filter((name) => /^main\..*\.js$/.test(name))
        .sort()
    : [];
  const buildHashes = {
    index: await sha256(buildIndex),
    scripts: Object.fromEntries(
      await Promise.all(
        buildScripts.map(async (name) => [
          name,
          await sha256(path.join(repositoryRoot, "build", "static", "js", name)),
        ])
      )
    ),
  };

  const launchArgs =
    engineName === "chromium"
      ? [
          "--no-sandbox",
          "--disable-dev-shm-usage",
          "--enable-precise-memory-info",
        ]
      : [];
  const server = await browserType.launchServer({
    headless: true,
    executablePath,
    args: launchArgs,
    env: {
      ...process.env,
      MOZ_DISABLE_CONTENT_SANDBOX: "1",
      MOZ_DISABLE_RDD_SANDBOX: "1",
    },
  });
  const browser = await browserType.connect({ wsEndpoint: server.wsEndpoint() });
  const browserPid = server.process()?.pid || null;
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
    ignoreHTTPSErrors: true,
  });
  await context.addInitScript(() => {
    window.__kylMemoryMessages = [];
    window.addEventListener("message", (event) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (!String(data.type || "").startsWith("geolibre:")) return;
      window.__kylMemoryMessages.push({
        timestamp: new Date().toISOString(),
        type: data.type,
        version: data.version || null,
        layerCount: data.project?.layers?.length || null,
        visibleLayers:
          data.project?.layers
            ?.filter((layer) => layer.visible)
            .map((layer) => ({ id: layer.id, name: layer.name, type: layer.type })) ||
          null,
      });
    });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(timeoutMs);

  page.on("request", (request) => {
    requestMetadata.set(request, {
      startedAt: now(),
      phase: activePhase,
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
    });
  });
  page.on("requestfinished", (request) => {
    const promise = (async () => {
      const metadata = requestMetadata.get(request) || {
        startedAt: now(),
        phase: activePhase,
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
      };
      const response = await request.response();
      const sizes = await request.sizes().catch(() => ({}));
      const headers = response?.headers() || {};
      const responseBodyBytes = sizes.responseBodySize || 0;
      networkRecords.push({
        ...metadata,
        finishedAt: now(),
        status: response?.status() || null,
        failed: false,
        fromServiceWorker: response?.fromServiceWorker?.() || false,
        category: classifyRequest(metadata.url),
        responseBodyBytes,
        wireBytes: responseBodyBytes + (sizes.responseHeadersSize || 0),
        responseHeadersBytes: sizes.responseHeadersSize || 0,
        requestBodyBytes: sizes.requestBodySize || 0,
        requestHeadersBytes: sizes.requestHeadersSize || 0,
        contentLengthBytes: Number(headers["content-length"] || 0) || 0,
        contentType: headers["content-type"] || null,
      });
    })();
    pendingNetworkRecords.add(promise);
    promise.finally(() => pendingNetworkRecords.delete(promise));
  });
  page.on("requestfailed", (request) => {
    const metadata = requestMetadata.get(request) || {
      startedAt: now(),
      phase: activePhase,
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
    };
    networkRecords.push({
      ...metadata,
      finishedAt: now(),
      failed: true,
      failure: request.failure(),
      category: classifyRequest(metadata.url),
      responseBodyBytes: 0,
      wireBytes: 0,
      contentLengthBytes: 0,
    });
  });
  page.on("console", (message) => {
    const text = message.text();
    if (
      message.type() === "error" ||
      /WebGL|Three\.js|Pyodide|kernel|wasm/i.test(text)
    ) {
      record("console", { type: message.type(), text: text.slice(0, 2000) });
    }
  });
  page.on("pageerror", (error) => {
    errors.push({ timestamp: now(), type: "pageerror", error: String(error) });
    record("pageerror", { error: String(error) });
  });

  const cdp =
    engineName === "chromium"
      ? await context.newCDPSession(page).catch(() => null)
      : null;
  if (cdp) {
    await cdp.send("Performance.enable").catch(() => undefined);
    await cdp.send("Memory.enable").catch(() => undefined);
    await cdp.send("Network.enable").catch(() => undefined);
  }

  const runMetadata = {
    schemaVersion: 2,
    startedAt: now(),
    engine: engineName,
    browserVersion: browser.version(),
    executablePath,
    browserPid,
    headless: true,
    baseUrl,
    scope,
    settleMs,
    stableIntervalMs,
    timeoutMs,
    repositoryRoot,
    branch,
    commit,
    gitStatusAtStart: status,
    buildHashes,
    nodeVersion: process.version,
    platform: process.platform,
    kernel: os.release(),
    cpuCount: os.cpus().length,
    totalSystemMemoryBytes: os.totalmem(),
  };
  record("run_started", runMetadata);

  await runScenario(page, cdp, browserPid, "01-home-stabilized", async () => {
    await navigate(page, "/", settleMs);
    const heading = await page.getByText(/Know your landscape/i).first().textContent();
    assertProbe(
      "01-home-stabilized",
      "home page rendered",
      /Know/i.test(heading || ""),
      heading,
      "Know your landscape"
    );
    await stableSamples(page, cdp, browserPid, "01-home-stabilized");
  });

  await runScenario(page, cdp, browserPid, "02-select-inputs-open-kyl", async () => {
    await navigate(page, "/", settleMs);
    await chooseReactSelect(page, 0, scope.state);
    await chooseReactSelect(page, 1, scope.district);
    await chooseReactSelect(page, 2, scope.tehsil);
    await page.getByRole("button", { name: "Know Your Landscape", exact: true }).click();
    await page.waitForURL(/\/kyl_dashboard(?:\?|$)/, { timeout: timeoutMs });
    await sleep(settleMs * 2);
    assertProbe(
      "02-select-inputs-open-kyl",
      "KYL dashboard route reached",
      new URL(page.url()).pathname === "/kyl_dashboard",
      new URL(page.url()).pathname,
      "/kyl_dashboard"
    );
    await stableSamples(page, cdp, browserPid, "02-select-inputs-open-kyl", 2);
  });

  await runScenario(page, cdp, browserPid, "03-download-layers-route-no-scope", async () => {
    await navigate(page, "/download_layers", settleMs);
    const guidanceVisible = await page
      .getByRole("heading", { name: "Select a tehsil first" })
      .isVisible()
      .catch(() => false);
    assertProbe(
      "03-download-layers-route-no-scope",
      "correct route rendered its no-scope guidance",
      guidanceVisible,
      guidanceVisible,
      true
    );
    const frameCount = await page
      .locator('iframe[title="GeoLibre GIS workspace"]')
      .count();
    assertProbe(
      "03-download-layers-route-no-scope",
      "GeoLibre is not loaded before scope exists",
      frameCount === 0,
      frameCount,
      0
    );
    await stableSamples(
      page,
      cdp,
      browserPid,
      "03-download-layers-route-no-scope",
      2
    );
  });

  const projectPath = `/download_layers?state=${encodeURIComponent(
    scope.state
  )}&district=${encodeURIComponent(scope.district)}&tehsil=${encodeURIComponent(
    scope.tehsil
  )}`;

  await runScenario(page, cdp, browserPid, "04-full-default-project", async () => {
    await navigate(page, projectPath, settleMs);
    await waitForGeoLibre(page);
    const visible = await visibleLayerNames(page);
    const expected = ["Administrative Boundaries", "Socio-Economic Profile"];
    assertProbe(
      "04-full-default-project",
      "exactly two default layers are visible",
      visible.length === 2 && expected.every((name) => visible.includes(name)),
      visible,
      expected
    );
    const frame = geoLibreFrame(page);
    assertProbe(
      "04-full-default-project",
      "GeoLibre embed route loaded",
      frame?.url().includes("embed=1") && frame?.url().includes("welcome=0"),
      frame?.url(),
      "GeoLibre embed URL"
    );
    await stableSamples(page, cdp, browserPid, "04-full-default-project");
  });

  await runScenario(page, cdp, browserPid, "05-raster-three-toggle-cycles", async () => {
    await ensureGroupExpanded(page, "LULC · Level 1 by year");
    const initial = await getLayerVisibility(page, targetRaster);
    assertProbe(
      "05-raster-three-toggle-cycles",
      "target raster begins hidden",
      initial === "hidden",
      initial,
      "hidden"
    );
    for (let cycle = 1; cycle <= 3; cycle += 1) {
      activePhase = `05-raster-cycle-${cycle}:on`;
      await setLayerVisibility(page, targetRaster, true);
      const onState = await getLayerVisibility(page, targetRaster);
      assertProbe(
        "05-raster-three-toggle-cycles",
        `raster cycle ${cycle} reached visible state`,
        onState === "visible",
        onState,
        "visible"
      );
      await sample(page, cdp, browserPid, `05-raster-cycle-${cycle}:on`);
      activePhase = `05-raster-cycle-${cycle}:off`;
      await setLayerVisibility(page, targetRaster, false);
      const offState = await getLayerVisibility(page, targetRaster);
      assertProbe(
        "05-raster-three-toggle-cycles",
        `raster cycle ${cycle} returned to hidden state`,
        offState === "hidden",
        offState,
        "hidden"
      );
      await sample(page, cdp, browserPid, `05-raster-cycle-${cycle}:off`);
    }
    await stableSamples(page, cdp, browserPid, "05-raster-after-cycles", 2);
  });

  await runScenario(page, cdp, browserPid, "06-multiple-layers-and-controls", async () => {
    for (const target of targetLayers) {
      activePhase = `06-multiple:${target.name}:on`;
      await ensureGroupExpanded(page, target.group);
      await setLayerVisibility(page, target.name, true);
      const state = await getLayerVisibility(page, target.name);
      assertProbe(
        "06-multiple-layers-and-controls",
        `${target.name} became visible`,
        state === "visible",
        state,
        "visible"
      );
      await sample(page, cdp, browserPid, `06-multiple:${target.name}:on`, {
        targetLayer: target,
      });
    }
    const visible = await visibleLayerNames(page);
    assertProbe(
      "06-multiple-layers-and-controls",
      "no implicit MRU eviction removed requested layers",
      targetLayers.every((target) => visible.includes(target.name)),
      visible,
      targetLayers.map((target) => target.name)
    );
    await ensureGroupExpanded(page, "Land");
    const frame = geoLibreFrame(page);
    const dem = layerRow(frame, "Digital Elevation Model");
    const zoomButton = dem.locator('button[aria-label="Zoom to layer"]');
    if (await zoomButton.count()) {
      activePhase = "06-multiple:zoom-to-dem";
      await zoomButton.click();
      await sleep(settleMs);
      await sample(page, cdp, browserPid, "06-multiple:zoom-to-dem");
      assertProbe(
        "06-multiple-layers-and-controls",
        "zoom-to-layer control was available and invoked",
        true,
        true,
        true
      );
    }
    for (const target of [...targetLayers].reverse()) {
      activePhase = `06-multiple:${target.name}:off`;
      await ensureGroupExpanded(page, target.group);
      await setLayerVisibility(page, target.name, false);
      await sample(page, cdp, browserPid, `06-multiple:${target.name}:off`);
    }
    await stableSamples(page, cdp, browserPid, "06-multiple-after-cleanup", 2);
  });

  await runScenario(page, cdp, browserPid, "07-notebook-real-python", async () => {
    const notebookMenu = page.getByRole("button", {
      name: /Explore CoRE Stack Data Layers with Notebooks/i,
    });
    await notebookMenu.click();
    const downloadPromise = page.waitForEvent("download", { timeout: timeoutMs });
    await page
      .getByRole("button", { name: /Quick start: inspect five micro-watersheds/i })
      .click();
    const download = await downloadPromise;
    const downloadPath = path.join(outputDirectory, download.suggestedFilename());
    await download.saveAs(downloadPath);
    const downloadBytes = (await fsp.stat(downloadPath)).size;
    assertProbe(
      "07-notebook-real-python",
      "scoped notebook downloaded",
      Boolean(downloadBytes && downloadBytes > 0),
      { filename: download.suggestedFilename(), bytes: downloadBytes },
      "non-empty .ipynb"
    );

    let frame = geoLibreFrame(page);
    await frame.getByRole("button", { name: "Processing", exact: true }).click();
    await frame
      .getByRole("menuitem", { name: "Jupyter Notebook", exact: true })
      .click();
    const jupyter = await waitForJupyterFrame(page);
    assertProbe(
      "07-notebook-real-python",
      "JupyterLite frame opened",
      Boolean(jupyter),
      jupyter?.url(),
      "JupyterLite frame URL"
    );
    await jupyter.getByText("Launcher", { exact: true }).first().waitFor({
      state: "visible",
      timeout: timeoutMs,
    });
    activePhase = "07-notebook:panel-open-no-kernel";
    await stableSamples(page, cdp, browserPid, "07-notebook:panel-open", 2);

    await jupyter.getByText("Python (Pyodide)", { exact: true }).first().click();
    const editor = jupyter.locator(".jp-CodeCell .cm-content").first();
    await editor.waitFor({ state: "visible", timeout: timeoutMs });
    activePhase = "07-notebook:new-python-notebook";
    await sample(page, cdp, browserPid, "07-notebook:new-python-notebook");
    await editor.click({ force: true });
    await editor.fill('print("KYL memory probe")');
    activePhase = "07-notebook:execute-python";
    await editor.press("Shift+Enter");
    await jupyter
      .locator(".jp-OutputArea-output")
      .filter({ hasText: "KYL memory probe" })
      .waitFor({ state: "visible", timeout: timeoutMs });
    await jupyter
      .locator(".jp-KernelStatus")
      .filter({ hasText: /Idle/i })
      .waitFor({ state: "visible", timeout: timeoutMs });
    assertProbe(
      "07-notebook-real-python",
      "Python cell executed through Pyodide",
      true,
      "KYL memory probe; kernel Idle",
      "executed output and idle kernel"
    );
    await sleep(settleMs);
    await stableSamples(page, cdp, browserPid, "07-notebook:python-executed");

    frame = geoLibreFrame(page);
    activePhase = "07-notebook:close-panel";
    await frame.locator('button[aria-label="Close notebook"]').click();
    const closeDeadline = Date.now() + timeoutMs;
    while (jupyterFrame(page) && Date.now() < closeDeadline) {
      await sleep(500);
    }
    await sleep(settleMs);
    assertProbe(
      "07-notebook-real-python",
      "Jupyter frame closed",
      !jupyterFrame(page),
      jupyterFrame(page)?.url() || null,
      null
    );
    await stableSamples(page, cdp, browserPid, "07-notebook:closed", 2);
  });

  await runScenario(page, cdp, browserPid, "08-warm-reload", async () => {
    activePhase = "08-warm-reload:navigation";
    await page.reload({ waitUntil: "domcontentloaded", timeout: timeoutMs });
    await waitForGeoLibre(page);
    assertProbe(
      "08-warm-reload",
      "warm reload restored GeoLibre",
      Boolean(geoLibreFrame(page)),
      geoLibreFrame(page)?.url(),
      "GeoLibre frame"
    );
    await stableSamples(page, cdp, browserPid, "08-warm-reload");
  });

  await runScenario(page, cdp, browserPid, "08-cold-reload", async () => {
    activePhase = "08-cold-reload:navigation";
    if (cdp) {
      await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    } else {
      await context.setExtraHTTPHeaders({
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      });
    }
    await page.reload({ waitUntil: "domcontentloaded", timeout: timeoutMs });
    await waitForGeoLibre(page);
    assertProbe(
      "08-cold-reload",
      "cache-bypassing reload restored GeoLibre",
      Boolean(geoLibreFrame(page)),
      geoLibreFrame(page)?.url(),
      "GeoLibre frame"
    );
    await stableSamples(page, cdp, browserPid, "08-cold-reload");
    if (cdp) {
      await cdp.send("Network.setCacheDisabled", { cacheDisabled: false });
    } else {
      await context.setExtraHTTPHeaders({});
    }
  });

  await runScenario(page, cdp, browserPid, "09-close-geolibre", async () => {
    await navigate(page, "/", settleMs);
    const iframeCount = await page
      .locator('iframe[title="GeoLibre GIS workspace"]')
      .count();
    assertProbe(
      "09-close-geolibre",
      "GeoLibre iframe was removed",
      iframeCount === 0,
      iframeCount,
      0
    );
    await stableSamples(page, cdp, browserPid, "09-close-geolibre");
  });

  await runScenario(page, cdp, browserPid, "10-reopen-close-residual-cycles", async () => {
    for (let cycle = 1; cycle <= 2; cycle += 1) {
      activePhase = `10-reopen-close:${cycle}:open`;
      await navigate(page, projectPath, settleMs);
      await waitForGeoLibre(page);
      await sample(page, cdp, browserPid, `10-reopen-close:${cycle}:open`);
      activePhase = `10-reopen-close:${cycle}:closed-home`;
      await navigate(page, "/", settleMs);
      await stableSamples(
        page,
        cdp,
        browserPid,
        `10-reopen-close:${cycle}:closed-home`,
        2
      );
    }
    assertProbe(
      "10-reopen-close-residual-cycles",
      "final page contains no GeoLibre iframe",
      (await page.locator('iframe[title="GeoLibre GIS workspace"]').count()) === 0,
      await page.locator('iframe[title="GeoLibre GIS workspace"]').count(),
      0
    );
  });

  activePhase = "final";
  const finalSample = await sample(page, cdp, browserPid, "final-home");
  await waitForPendingNetwork();
  const report = {
    schemaVersion: 2,
    generatedAt: now(),
    run: runMetadata,
    scenarios,
    assertions,
    samples,
    networkRecords,
    events,
    errors,
    finalSample,
  };
  const outputPath = path.join(outputDirectory, "memory-run-v2.json");
  await fsp.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    JSON.stringify(
      {
        output: outputPath,
        engine: engineName,
        browserVersion: browser.version(),
        scenarios: scenarios.length,
        failedScenarios: scenarios.filter((scenario) => scenario.status !== "passed")
          .map((scenario) => scenario.id),
        assertions: assertions.length,
        failedAssertions: assertions.filter((entry) => !entry.passed).length,
        samples: samples.length,
        networkRecords: networkRecords.length,
        errors: errors.length,
      },
      null,
      2
    )
  );
  await context.close().catch(() => undefined);
  await browser.close().catch(() => undefined);
  await server.close().catch(() => undefined);
  if (scenarios.some((scenario) => scenario.status !== "passed")) {
    process.exitCode = 1;
  }
};

main().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});
