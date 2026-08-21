# GeoLibre issue drafts

These are drafts, not accusations. Before filing the memory issue, add one standalone GeoLibre run and a 30–120 second post-close cooldown so the parent KYL application and Chromium's normal process caching can be separated from GeoLibre behavior.

## Draft 1: Embed lifecycle leaves large renderer allocation after iframe removal/reopen

### Suggested title

`Embed lifecycle: renderer memory remains high across iframe dispose/reopen cycles in Chromium`

### Environment

- GeoLibre web deployment: `https://web.geolibre.app/?embed=1&welcome=0` (observed 21 August 2026; host URL is unversioned)
- Parent app: CoRE Stack KYL, cross-origin iframe integration
- Chromium: `149.0.7827.55`, Playwright headless
- OS: Ubuntu Linux, kernel `7.0.0-29-generic`
- Renderer: ANGLE Vulkan with SwiftShader software WebGL
- Measurement: whole Chromium process tree from `/proc/<pid>/smaps_rollup`; PSS, private memory, RSS, process roles and PIDs
- Repeats: three sequential fresh browser processes; every UI-state assertion passed

### Project/workload

1. Load a GeoLibre project with Administrative Boundaries and Socio-Economic Profile visible.
2. Toggle `LULC Level 1 · 2024-2025` on/off three times.
3. Show MWS vector + DEM raster + CLART raster, invoke zoom-to-layer, then hide them.
4. Open JupyterLite, run `print("KYL memory probe")`, wait for `Python (Pyodide) | Idle`, then click the GeoLibre `Close notebook` button.
5. Remove the GeoLibre iframe by navigating the parent to home.
6. Open and close the same scoped project twice more.

### Observed

- Fresh parent home: median total PSS **493.5 MiB**; two renderer processes; no workers.
- First GeoLibre default project: **1,388.1 MiB**; three renderers; one MapLibre worker.
- After first iframe removal: **1,358.4 MiB**; GeoLibre frame absent; workers zero; three renderers remain.
- Second project reopen: **1,987.4 MiB**.
- Final parent home after second close: **1,750.3 MiB**; GeoLibre frame absent; workers zero; three renderers remain.
- Three-run final-home range: **1,589.7–1,923.2 MiB**.
- Initial renderer PSS median: about **208.5 MiB**. Final renderer PSS median: about **1,286.9 MiB**.
- In a representative run, the same two heavy renderer PIDs remained alive across removal/reopen cycles and their private allocation grew.

The notebook-specific lifecycle did work: closing the notebook removed the JupyterLite frame and Pyodide worker. Removing GeoLibre also removed the MapLibre worker. The concern is the short-window process/private-memory retention after those logical resources disappear.

### Expected

An explicit embed disposal path should release map/WebGL resources, workers, notebook kernels, WASM/SQL engines, observers/listeners, object URLs, large project buffers, and caches that are safe to release. After a reasonable cooldown, repeated open/close cycles should not continually increase retained renderer-private memory.

### Requested API/diagnostics

- `postMessage({type: "geolibre:dispose"})`
- `postMessage({type: "geolibre:disposed", diagnostics: {...}})` only after cleanup
- Diagnostics: build/version, maps/WebGL contexts, workers, notebook kernels, SQL/WASM engines, visible layers/features, object URLs, and registered listeners where measurable
- Idempotent cleanup on `pagehide`/unload as a fallback

### Caveats / requested confirmation

- Current post-close stable sampling is short (~1.5 seconds), so this is not yet proof of an indefinite leak.
- Headless Chromium uses SwiftShader; headed hardware-GPU behavior may differ.
- The parent renderer also grows after project generation/message exchange. A standalone GeoLibre control run is needed to allocate ownership precisely.

### Reproduction artifacts

- Three raw `memory-run-v2.json` files
- `analysis-summary.json`
- `memory-timeline.svg`
- `process-composition.svg`
- Asserted Playwright runner `scripts/memory/kyl-memory-profile.mjs`

## Draft 2: Production JupyterLite bundle logs Module Federation errors

### Suggested title

`Web Notebook panel logs @jupyterlab/docregistry Module Federation errors despite successful execution`

### Steps

1. Open `https://web.geolibre.app/`.
2. Choose Processing → Jupyter Notebook.
3. Create a Python (Pyodide) notebook.
4. Run `print("hello")`.
5. Observe the browser console.

### Observed in all three fresh Chromium runs

The notebook did run and reached `Python (Pyodide) | Idle`, but the console logged:

```text
Error: The getter for the shared module is not a function.
This may be caused by setting "shared.import: false" without the host
providing the corresponding lib. #RUNTIME-012
shareKey: "@jupyterlab/docregistry"
```

It also logged:

```text
ReferenceError: Cannot access 'x' before initialization
```

The stack originates from the `@jupyter-notebook/lab-extension` federated chunks.

### Expected

The production JupyterLite extension graph should load without Module Federation shared-module or initialization errors. A successful trivial cell should not mask a partially failed extension.

### Additional reproducible warning

Every GeoLibre load emitted repeated `WARNING: Multiple instances of Three.js being imported.` messages—25 occurrences per complete run. This may warrant a separate bundling issue if it is unrelated to the Jupyter extension graph.
