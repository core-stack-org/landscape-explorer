# KYL GeoLibre Rust Workbench

This integration adds `geolibre-rust` to KYL `/download_layers` as a parallel,
browser-native analysis workbench. It does not replace the existing OpenLayers
map or the Python GeoLibre viewer integration.

## Why it is a workbench, not an iframe

`opengeos/geolibre-rust` publishes the `geolibre-wasm` Rust/WebAssembly
geospatial engine. Its hosted page is a tool demo, not a project-map viewer with
an iframe messaging API. KYL therefore uses the engine directly:

```text
KYL state/district/tehsil
             |
             v
45-source KYL catalog ---- current OpenLayers viewport
             |                         |
             +------------+------------+
                          |
                          v
              GeoLibre Rust Web Worker
               |                     |
          live WFS vectors       live WMS rasters
               |                     |
      GeoParquet/classify/      COG/profile/slope/
           dissolve             hillshade/focal
               |                     |
               +----------+----------+
                          |
                    browser download
```

All analysis runs in a dedicated Web Worker. The 26.7 MB WASM package is only
compiled when a user opens the workbench, so the existing map remains
interactive and initial `/download_layers` loading does not pay the Rust cost.

## KYL data contract

`src/config/geolibreRustLayers.js` is the source catalog:

- 13 live vector layers from GeoServer WFS;
- 8 non-LULC raster layers from GeoServer WMS;
- 24 LULC rasters: three levels across eight years;
- Micro-watersheds, hydrological boundaries, and fortnightly hydrological
  variables are grouped under Hydrology.

The catalog stores only naming rules and service metadata. It does not embed
features or raster pixels. Every runtime source is scoped from the selected
district and tehsil.

## Workflows

Raster workflows first request the current map extent as GeoTIFF through WMS.
Rust then writes a compressed Cloud Optimized GeoTIFF or processes the in-memory
raster:

- viewport COG;
- summary statistics;
- slope;
- hillshade;
- focal statistics.

Vector workflows read the selected WFS GeoJSON, optionally restricted to the
current map extent:

- Hilbert-sorted GeoParquet with ZSTD, Snappy, Gzip, or no compression;
- field classification using natural breaks, quantile, equal interval,
  geometric interval, or standard deviation;
- polygon dissolve, globally or by attribute.

## Runtime and failure boundaries

- Browser support requires WebAssembly, module workers, and enough memory for
  the selected extent.
- GeoServer must allow the browser's cross-origin WFS/WMS requests.
- Raster requests are capped at 4096 × 4096 pixels in the UI.
- Terrain derivatives are technically available for any raster, but slope and
  hillshade are semantically meaningful only for continuous elevation-like
  sources.
- Closing the workbench does not terminate the cached worker; reopening it
  reuses the compiled WASM engine for the current page session.

The package is pinned to `geolibre-wasm` 1.1.0. Its runtime manifest is loaded
inside the worker and reported in the UI, so the visible tool count comes from
the installed engine rather than a hard-coded claim.

## Focused checks

```bash
CI=true npm test -- --runInBand --watchAll=false \
  src/config/geolibreRustLayers.test.js \
  src/components/geolibre-rust/GeoLibreRustWorkbench.test.jsx

npm run build
```
