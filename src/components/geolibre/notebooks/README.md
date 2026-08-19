# GeoLibre project notebooks

KYL generates `Core Stack project explorer` notebooks from the active tehsil
project. The notebook is created only when the user selects **Download project
notebook**, so it contains the correct scope, layer catalogue and analytical
GeoServer source URLs without asking the user to edit Python.

The generated notebook is a normal `.ipynb` for GeoLibre's native Notebook
panel. It is not a parallel notebook implementation in KYL.

## Correct GeoLibre 2.6 capability boundary

GeoLibre's bundled web notebook client can send map mutations such as
`add_geojson()` and `fit_bounds()` through JavaScript display output. It cannot
synchronously return `list_layers()` or feature data to the JupyterLite kernel.

GeoLibre's **Processing → Python Console** is different: it runs its Pyodide
interpreter against the app on the main thread, so `geolibre.layers` and
`layer.get_features()` can inspect live web-map state there. The limitation
described here is specific to the separate JupyterLite notebook kernel.

An earlier experiment attempted to await `geolibre:result` directly from
Pyodide Python. A browser test showed that this was invalid: the JupyterLite
kernel runs in a worker, while the reply reaches the notebook iframe's main
window. Workers cannot attach DOM/window listeners. The failed list cell left
`layers` undefined and caused the later `NameError` messages. That experiment
has been removed.

The corrected generated notebook uses only supported paths:

1. KYL captures a small manifest from the current project at download time.
2. The notebook lists that captured layer manifest locally.
3. It fetches the selected vector's published WFS JSON directly with `pyfetch`.
4. It inventories attributes in ordinary Python.
5. It sends a temporary derived GeoJSON sample to the adjacent map through
   `geolibre.connect()`.

This works in GeoLibre Web without pretending the notebook can read live
browser state. If the layer state changes later, download a fresh notebook.

## Current hosted workflow

The official `web.geolibre.app` deployment owns its cross-origin JupyterLite
filesystem. GeoLibre 2.6 has no notebook field in the project schema and no
embed command for injecting a notebook. The current workflow is therefore:

1. Open the scoped KYL GeoLibre project.
2. Select **Download project notebook**.
3. Open **Processing → Jupyter Notebook** inside GeoLibre.
4. Upload the downloaded `.ipynb` and run the cells in order.

## Preloading in a CoRE Stack deployment

A pinned, self-hosted GeoLibre build can eliminate the upload step:

1. Add a JupyterLite frontend bridge or notebook-launch command that accepts a
   project-scoped notebook from KYL.
2. Save it through JupyterLite's same-origin ContentsManager and open it with
   `docmanager:open`; use the desktop Jupyter server contents endpoint in the
   native application.
3. Bundle reusable static notebooks beside `Welcome.ipynb` during
   `scripts/build-jupyterlite.mjs` when they do not require a selected tehsil.
4. Deploy at a versioned URL and configure
   `REACT_APP_GEOLIBRE_URL_TEMPLATE` in KYL.

Static bundling alone is not sufficient for this project explorer because its
layer names and WFS/WCS URLs are tehsil-specific. The self-hosted launcher must
receive or generate the scoped notebook after the KYL project is known.

## Validation

Tests verify that the generator:

- captures WFS and WCS sources without embedding large GeoJSON datasets;
- emits output-free notebook cells using the Pyodide kernelspec;
- never includes the unsupported window-listener/read-back bridge; and
- keeps the public exploration cells within ten lines.
