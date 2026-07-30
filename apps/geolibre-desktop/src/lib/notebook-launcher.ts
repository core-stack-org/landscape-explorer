import { useAppStore } from "@geolibre/core";

export interface JupyterNotebookCell {
  cell_type: "markdown" | "code";
  id: string;
  metadata: Record<string, unknown>;
  source: string[];
  execution_count?: null;
  outputs?: unknown[];
}

export interface JupyterNotebookDocument {
  cells: JupyterNotebookCell[];
  metadata: Record<string, unknown>;
  nbformat: 4;
  nbformat_minor: 5;
}

export interface NotebookLaunchRequest {
  id: number;
  fileName: string;
  notebook: JupyterNotebookDocument;
}

const NOTEBOOK_LAUNCH_EVENT = "geolibre:notebook-launch";

let nextRequestId = 1;
let pendingRequest: NotebookLaunchRequest | null = null;

/**
 * Open a generated notebook in GeoLibre's docked notebook panel.
 *
 * The request is retained at module scope because opening the panel mounts
 * NotebookPanel lazily. The panel consumes the same request after it mounts,
 * so the first click does not race the event listener.
 */
export function launchNotebook(
  fileName: string,
  notebook: JupyterNotebookDocument,
): NotebookLaunchRequest {
  const request = {
    id: nextRequestId++,
    fileName,
    notebook,
  };
  pendingRequest = request;
  useAppStore.getState().setNotebookOpen(true);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<NotebookLaunchRequest>(NOTEBOOK_LAUNCH_EVENT, {
        detail: request,
      }),
    );
  }
  return request;
}

export function getPendingNotebookLaunch(): NotebookLaunchRequest | null {
  return pendingRequest;
}

export function completeNotebookLaunch(requestId: number): void {
  if (pendingRequest?.id === requestId) pendingRequest = null;
}

export function subscribeNotebookLaunch(
  listener: (request: NotebookLaunchRequest) => void,
): () => void {
  if (typeof window === "undefined") return () => undefined;
  const onLaunch = (event: Event) => {
    const request = (event as CustomEvent<NotebookLaunchRequest>).detail;
    if (request) listener(request);
  };
  window.addEventListener(NOTEBOOK_LAUNCH_EVENT, onLaunch);
  return () => window.removeEventListener(NOTEBOOK_LAUNCH_EVENT, onLaunch);
}
