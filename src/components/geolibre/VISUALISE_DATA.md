# Visualise Data

Open **Visualise Data** from the GeoLibre header. Choose a topic, a visual and an identifier. Charts show temporal and tabular details that complement the map.

The panel includes 43 views: annual and seasonal water balance, fortnightly water, groundwater change, seasonal waterbody areas, groundwater extraction, aquifer shares, cropping areas and shares, cropping intensity, land cover, crop/tree/shrub NDVI, terrain, elevation, stream orders, drainage density, village population, service distances, livestock and Mission Antyodaya categories and original survey answers.

## Rendering and data

React owns source loading, selections and lifecycle. Chart.js renders charts independently of Python. The selected source loads on demand; other views using it reuse its property rows for the life of this panel. Geometry is discarded. A changed place remounts the panel and cancels outstanding requests. Requests time out after 90 seconds; incomplete feature counts are shown explicitly. The panel does not read GeoLibre's internal cache or use the CoRE Stack API.

Map layer URLs take priority. Other URLs use the shared GeoLibre layer catalogue and the explicit vector summary definitions in `visualiseData.js`. Source links and read times appear below the charts. Identifiers are selected within each visual. When an identifier has several records, a record selector keeps them separate.

Water depths are millimetres, elevation and groundwater change are metres, areas are hectares, service distances are kilometres, and category shares retain their recorded percentages. Seasonal water sums require all 26 fortnight starts assigned to the three seasons within each July–June year. Waterbody seasonal hectares use `area_ored × percentage / 100`. Cropping shares require all four categories and a nonzero total. Missing values stay missing. Village population groups overlap and are not stacked.

Chart data is available as a table and CSV. The panel can be resized with the pointer or arrow keys; on small screens it fills the map area. Selections remain local to the panel and are not saved in the URL.

## Python

Each collapsed Python cell contains a standalone source read, selection, transformation and Matplotlib plot for that visual. It is editable and can be copied or run. It does not drive the JavaScript chart. Changing the selection supplies a fresh example.

Python starts in a dedicated worker on the first run using [Pyodide 0.28.2](https://pyodide.org/en/0.28.2/usage/index.html), with pandas, Matplotlib, requests and pyodide-http prepared automatically. Matplotlib outputs are PNGs; printed tables and errors appear below the editor. Stop terminates the worker; changing the selection or unmounting the editor also releases it. The runtime and packages require internet access on first use. Copied snippets run in a Python environment with requests, pandas and Matplotlib installed.

## Verification

```sh
npm run visualise:lint
CI=true npm test -- --watchAll=false --runInBand src/components/geolibre/visualiseData.test.js src/components/geolibre/VisualiseDataPanel.test.jsx
node scripts/export-visualise-examples.mjs /path/to/source-samples
uv run --with pandas --with matplotlib --with requests python scripts/validate-visualise-examples.py
npm run build
```

The parity scripts keep their fixtures and outputs in `.local/visualise-validation`. They execute the generated Python against sample responses and compare every plotted value with the independent JavaScript transformation. The 43 sample cases and 19 panel/unit tests pass. Sample parity checks do not establish live coverage for every tehsil. Samples, credentials and execution outputs are excluded from commits.
