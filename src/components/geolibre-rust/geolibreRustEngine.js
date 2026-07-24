let worker;
let nextRequestId = 1;
const pending = new Map();

function getWorker() {
  if (worker) {
    return worker;
  }

  worker = new Worker(
    new URL("./geolibreRust.worker.js", import.meta.url),
    { type: "module", name: "kyl-geolibre-rust" }
  );

  worker.onmessage = ({ data }) => {
    const request = pending.get(data.id);
    if (!request) {
      return;
    }

    pending.delete(data.id);
    if (data.ok) {
      request.resolve(data.payload);
    } else {
      const error = new Error(
        data.error?.message || "GeoLibre Rust worker failed"
      );
      error.stack = data.error?.stack || error.stack;
      request.reject(error);
    }
  };

  worker.onerror = (event) => {
    const error = new Error(
      event.message || "GeoLibre Rust worker could not start"
    );
    pending.forEach((request) => request.reject(error));
    pending.clear();
  };

  return worker;
}

function request(action, payload) {
  const id = nextRequestId++;
  const activeWorker = getWorker();

  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    activeWorker.postMessage({ id, action, payload });
  });
}

export function initializeGeoLibreRust() {
  return request("initialize");
}

export function runGeoLibreRustRasterWorkflow(payload) {
  return request("runRasterWorkflow", payload);
}

export function runGeoLibreRustVectorWorkflow(payload) {
  return request("runVectorWorkflow", payload);
}

export function stopGeoLibreRust() {
  if (worker) {
    worker.terminate();
    worker = undefined;
  }
  const error = new Error("GeoLibre Rust worker stopped");
  pending.forEach((request) => request.reject(error));
  pending.clear();
}
