# CoRE Stack notebooks for GeoLibre

The KYL GeoLibre page provides five guided analytical notebooks and one
separate layer-manifest notebook. Each download is a normal `.ipynb` file for
GeoLibre's native Jupyter Notebook panel.

## User workflow

1. Select a state, district, and tehsil in Know Your Landscape.
2. Open the GeoLibre page.
3. Open **Explore CoRE Stack Data Layers with Notebooks** in the top bar.
4. Download a notebook. Its location controls default to the active tehsil.
5. In GeoLibre, choose **Processing → Jupyter Notebook → Upload Files**.
6. Upload the `.ipynb` and run cells in order with **Shift+Enter**.

Every notebook also displays state, district, and tehsil text controls. Change
those controls and rerun the data cells to explore another published scope;
users do not need to edit a GeoServer URL or Python source.

Official references:

- [GeoLibre interface guide](https://geolibre.app/user-guide/interface/)
- [GeoLibre notebook guide](https://geolibre.app/notebook/)

## Notebook inventory and visualization brief

| Notebook | Analytical job and relevant layers | Primary evidence | Important caveat and QA |
|---|---|---|---|
| Understand the micro-watersheds in a tehsil | Establish MWS context from annual groundwater change and terrain vector data | Joined table, groundwater distribution, area-weighted terrain composition, temporary MWS map | A tehsil average does not describe every MWS; verify UID join and missingness |
| Follow water conditions through time | Inspect one MWS through annual groundwater, fortnightly water balance, and filtered waterbody history | Three directly labelled time-series panels and selected-MWS map | Co-movement does not establish causation; verify parsed dates and selected UID |
| Compare cropping intensity and drought | Compare yearly and cross-MWS agricultural variation | Separate yearly panels, scatter plot, transparent threshold shortlist | Separate units stay in separate panels; correlation is descriptive, not causal |
| Find unusual micro-watersheds | Detect profiles that depart from the tehsil using hydrology, agriculture, area, drought, and terrain | Robust-score table, ranked bars, reason field, flagged map | “Unusual” does not mean “bad”; show available metric count and inspect raw values |
| Find similar micro-watersheds within a tehsil | Retrieve five comparable multivariate MWS profiles | Distance table, directly labelled standardized heatmap, target/peer map layers | Similarity depends on variables, period, missingness, and distance definition |
| Find and download CoRE Stack GeoServer layers | Discover all 55 GeoLibre presentations and construct scoped downloads | Searchable table, WFS/WCS URL, safe vector preview | Empty/unpublished data is not evidence that a phenomenon is absent |

The map is used for spatial orientation and feature inspection. Tables and
charts carry rankings, distributions, time change, and multivariate comparison
because those questions are harder to answer accurately from map color alone.

Shared color roles are deliberately limited: blue/cyan for hydrology, green
for agriculture/terrain context, purple for neutral comparison, amber for a
selected target, and red only for an explicit flag or threshold. Essential
values and caveats remain visible without hover.

## Data access contract

The notebooks fetch only the relevant published sources for their question:

- vectors use GeoServer WFS `GetFeature` with GeoJSON output;
- rasters in the manifest use GeoServer WCS `GetCoverage` with GeoTIFF output;
- WMS tiles are not treated as analytical pixel data; and
- no API key is embedded or requested.

The five analytical notebooks carry two to four layer definitions each. The
manifest notebook carries all 55 layer presentations, including the 24 annual
LULC presentations. Static templates default to Dumka–Masalia so they remain
usable when opened directly; KYL injects the selected project's display names
and bounds at download time.

Layer availability varies by tehsil. A failed or empty response is reported as
unavailable for that scope, rather than interpreted as a zero real-world count.
The notebooks preserve raw values beside derived scores and expose missingness
where it affects comparison.

## GeoLibre web capability boundary

GeoLibre's web notebook panel uses a JupyterLite Pyodide kernel. Notebook cells
can send supported map mutations such as `add_geojson()` and `fit_bounds()`
through `geolibre.connect()`. The kernel cannot synchronously read the open
iframe project's layer list, because the Pyodide worker cannot attach to the
iframe's main-window message listener.

The implementation therefore does not pretend to read live map state. KYL
injects the active scope into a checked-in template, and the notebook fetches
the named GeoServer sources directly. GeoLibre's **Processing → Python
Console** is a separate main-thread environment that can inspect live layers.

Automatic preloading into the hosted `web.geolibre.app` JupyterLite filesystem
is not available through the GeoLibre 2.6 project/embed contract. Removing the
upload step would require a self-hosted GeoLibre/JupyterLite launcher or
frontend extension.

## Regeneration and validation

Templates and `catalog.json` are generated deterministically by:

```bash
npm run notebooks:generate
npm run notebooks:check
```

The generator lives beside the notebooks in
`public/geolibre-notebooks/generate_notebooks.mjs`. Repository tests and the
check command verify:

- exactly five guided notebooks plus the separate manifest;
- output-free Python (Pyodide) notebook metadata;
- public code cells of at most ten lines;
- no API key or unsupported iframe/worker read-back bridge;
- the intended relevant-layer set for every analytical notebook;
- all 55 unique layer presentations in the manifest;
- deterministic regeneration; and
- active-tehsil injection without mutating the public template.

Release QA also includes representative live WFS schema/UID checks, desktop
and narrow-screen dropdown review, the full React test suite, production build,
and an `npm start` compilation smoke test.
