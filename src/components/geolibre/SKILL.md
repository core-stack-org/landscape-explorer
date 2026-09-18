---
name: manage-geolibre-layers
description: >-
  Add, remove, or modify layers in the Know Your Landscape GeoLibre
  integration. Use for KYL `/download_layers` work involving WFS vectors,
  WMS/WCS rasters, LULC years or presentation levels, GeoServer names, groups
  and ordering, default visibility or opacity, vector styles, raster named
  styles, legends, lazy loading, caching, downloads, or layer-specific tests
  and documentation.
---

# Manage GeoLibre Layers

Use the existing catalog-driven architecture. Make one coherent change across
the data source, project representation, presentation, legend, loading,
download, tests, and knowledge guide wherever those contracts apply.

## Establish the working context

1. Run `git status --short --branch` and preserve unrelated work.
2. Read `src/components/geolibre/README.md` completely.
3. Inspect these implementation files before editing:
   - `src/config/geolibreLayers.js`
   - `src/components/geolibre/geolibreProject.js`
   - `src/components/geolibre/GeoLibreLegend.jsx`
   - `src/components/geolibre/GeoLibreFrame.jsx`
   - `src/pages/LandscapeExplorer.jsx`
4. Inspect the focused tests and `.env.example` when the requested change can
   affect them.
5. Confirm that `src/App.jsx` still maps `/download_layers` to
   `LandscapeExplorer`. Do not extend the legacy OpenLayers map or sidebar.
6. State the current source contract and the requested presentation change in
   plain language before editing.

Do not assume a catalog name proves a deployed layer exists. For a source
change, inspect a representative live WFS, WMS, or WCS response when network
access is available. Record what was verified and what remains an external
GeoServer prerequisite.

## Classify the request

Choose every row that applies; a request may require several workflows.

| Request | Workflow |
|---|---|
| Add a vector dataset | Add a WFS vector |
| Add a raster dataset | Add a WMS/WCS raster |
| Add a year over existing LULC data | Add an LULC year |
| Add a new classification over existing LULC cells | Add an LULC presentation |
| Rename, regroup, reorder, show, hide, or change opacity | Change layer presentation |
| Change vector colours, breaks, labels, or source field | Change a vector style |
| Change raster colours/classes | Change a raster style |
| Change workspace, layer naming, protocol, or endpoint | Change a source contract |
| Change first-toggle, retry, reuse, or project reload behavior | Change loading or caching |
| Change GeoTIFF export | Change the raster download contract |
| Delete a layer | Remove a layer |

Separate **data identity** from **presentation identity**:

- Data identity is the physical WFS feature type or raster coverage.
- Presentation identity is a logical layer name, style, legend, group, order,
  visibility, and opacity.

Reuse one data identity when several logical layers differ only by
presentation. Current LULC Level 1, 2, and 3 presentations must continue to use
one Level 3 coverage per year unless the user explicitly changes the physical
data architecture.

## Add a WFS vector

1. Resolve a real state/district/tehsil example.
2. Build and inspect the expected WFS 1.0.0 `GetFeature` request:
   - workspace and `typeName` are correct;
   - `outputFormat=application/json` returns a GeoJSON `FeatureCollection`;
   - coordinates are EPSG:4326;
   - the response has features and the properties required by the style;
   - browser CORS permits the request.
3. Add one entry to `LAYERS` in `src/config/geolibreLayers.js` with:
   - stable unique `id` and human `label`;
   - `domain` and an existing or new `loadGroup`;
   - `sourceType: "wfs"`, `workspace`, and correct `layerName(scope)`;
   - `geometryType` of `polygon`, `line`, or `point`;
   - a `styleProfile` key and canonical `qmlStyleUrl`.
4. Add or reuse the matching `STYLE_PROFILES` entry in
   `geolibreProject.js`. Use actual source property names and types.
5. Add or reuse a `LEGEND_PROFILES` entry. Its lookup may be keyed by catalog
   `id`, `baseId`, or `styleProfile`, in that priority order.
6. Keep the layer hidden and its GeoJSON empty at startup unless the user
   explicitly requires a default layer. Normal vectors hydrate on first
   visibility.
7. If a new group is needed, add it to `GROUPS_TOP_FIRST` and test the human
   top-first order. Do not leave empty groups.
8. Add tests for catalog membership, generated id/source/group/style/legend,
   unloaded initial state, first hydration, failure/retry when relevant, and
   reuse after off/on.
9. Update fixed inventory counts and layer lists in tests and the README.

Do not add a page-level source registry or hand-build another layer UI.

## Add a WMS/WCS raster

1. Resolve a real coverage and inspect both services:
   - WMS `GetMap` returns a styled transparent PNG for the intended named style;
   - WCS 2.0.1 `GetCoverage` returns the complete GeoTIFF;
   - both endpoints allow browser CORS.
2. Add one `sourceType: "wms"` catalog entry containing `workspace`, scoped
   `layerName`, `wmsStyle`, group, domain, and `qmlStyleUrl`.
3. Set `useGlobalWms: true` only when a cross-workspace style requires the
   global `/geoserver/wms` endpoint. Otherwise retain the workspace WMS.
4. Add the exact visible class palette to `LEGEND_PROFILES`.
5. Let `buildRasterLayer()` construct the WMS display and WCS download URLs.
   Do not create a second download registry.
6. Keep the raster hidden at startup unless explicitly requested.
7. Test WMS endpoint/layer/style, WCS coverage id, bounds, hidden initial state,
   legend contents, and no full project resend for visibility-only changes.
8. Update fixed inventory counts and the README.

Treat WMS and WCS as separate proof points: a valid download does not prove the
styled map works, and a valid map does not prove the complete download works.

## Add an LULC year

1. Confirm the physical Level 3 coverage follows
   `LULC_<year>_<district>_<tehsil>_level_3` in workspace `LULC_level_3`.
2. Add the year once to `GEOLIBRE_LULC_YEARS` in chronological order.
3. Let the existing `flatMap` generate Level 1, 2, and 3 logical entries.
4. Verify all three entries share the same WMS `LAYERS`, WCS URL, and coverage
   id while using their three different WMS `STYLES` values.
5. Verify the new year appears newest-first in each GeoLibre LULC group.
6. Update generated catalog counts, assertions, and README year ranges/counts.

Do not add three coverage functions or Level 1/2 physical raster names.

## Add an LULC presentation

Use this when the raw cells already exist and only a new classification or
cartographic view is needed.

1. Publish and live-test the new named style against a representative Level 3
   coverage, or document this as an external prerequisite if publishing is not
   in scope.
2. Add one definition to `LULC_LEVELS` with stable `id`, label, domain,
   `workspace: LULC_SOURCE_WORKSPACE`, `wmsStyle`, and QML provenance.
3. Add a matching `LEGEND_PROFILES` entry keyed by the new base id.
4. Add its group to `GROUPS_TOP_FIRST` in the requested display position.
5. Verify every year uses the same Level 3 physical coverage and WCS URL as
   the existing levels but the new WMS style.
6. Test independent legend selection and annual deduplication by `baseId`.
7. Update counts, group descriptions, invariants, and manual checks.

New styling requires new WMS tile images. Do not promise zero network requests
when switching between different WMS styles over the same coverage.

## Change layer presentation

Use the smallest responsible configuration:

| Change | Edit |
|---|---|
| Display name | catalog `label` |
| Subject metadata | catalog `domain` |
| Group membership | catalog `loadGroup` |
| Group name/order/collapse | `GROUPS_TOP_FIRST` |
| Normal within-group order | order in `LAYERS` |
| LULC year order | `GEOLIBRE_LULC_YEARS` plus existing reverse display helper |
| Default visibility | catalog `defaultVisible` |
| Initial vector opacity | `buildVectorLayer()` |
| Initial raster opacity | `buildRasterLayer()` |
| Legend position/layout | `GeoLibreLegend.jsx` and legend metadata |

When enabling `defaultVisible` for a vector, also change initial project
loading so the layer contains real data before display. Account for startup
latency and failure behavior. A catalog flag alone is insufficient.

Test the displayed top-first order even though GeoLibre's internal `layers`
array is bottom-first.

## Change a vector style

1. Inspect representative feature properties and the canonical QML.
2. Find the catalog `styleProfile` and its `STYLE_PROFILES` entry.
3. Update the categorized stops or expression using the exact field type,
   fallback, fill/line/circle properties, and opacity.
4. Update `LEGEND_PROFILES` in the same change. Match labels, order, colours,
   and shapes to the actual map.
5. Update `qmlStyleUrl` only for provenance when its canonical file changed.
6. Test representative values at class boundaries, null/missing values, and
   legend output.
7. Visually compare the live map and legend.

Changing QML alone never changes the React-rendered vector style.

## Change a raster style

1. Identify the catalog `wmsStyle` and live WMS request.
2. Update/publish the GeoServer named style, if authorized; otherwise report
   the exact external prerequisite and do not claim the map change is complete.
3. Change catalog `wmsStyle` only if the published name changed.
4. Synchronize `LEGEND_PROFILES` with the server-rendered classes.
5. Update QML provenance when applicable.
6. Verify the exact `STYLES` parameter, returned pixels, transparent NoData,
   legend palette, and behavior at more than one zoom.

KYL does not parse raster QML or recolour WMS pixels in the browser.

## Change a source contract

1. Confirm whether the physical data changed or only its deployed identifier.
2. Update `workspace` and `layerName(scope)` in the catalog for an individual
   layer. Change request builders only for a service-wide protocol change.
3. Preserve `formatGeoServerName()` unless the deployed naming convention has
   changed and representative names prove the new rule.
4. Check WFS `typeName`, WMS `LAYERS`, WMS endpoint scope, WCS `CoverageId`,
   metadata, and `sourcePath` together.
5. If two logical layers share one source, retain one physical request/download
   and independent style/legend/visibility identities.
6. Test names containing spaces and parentheses plus a normal name.

## Change loading or caching

Preserve three different reuse mechanisms:

1. The builder's request cache deduplicates identical initial WFS URLs.
2. `hydratedLayersRef` retains lazily fetched vector data within one scope.
3. `geoLibreProjectLoadSignature()` excludes visibility and opacity so a toggle
   does not replace native raster sources.

For any change, prove:

- first vector visibility fetches once;
- later off/on reuses it;
- errors can retry;
- a scope change clears scope-specific hydrated data;
- stale responses cannot replace a newer scope/state;
- visibility or opacity alone emits no new `geolibre:load-project`;
- structural/data/style changes still reload the project;
- `fitBounds` occurs only once per scope.

Do not use one global cache across tehsils without a scope-qualified key and an
explicit eviction policy.

## Change the raster download contract

1. Keep rendering and download URLs distinct.
2. Confirm the URL returns the intended complete file, content type, filename,
   projection, compression, and coverage—not merely a map tile.
3. For WCS, keep workspace and `CoverageId` aligned with WMS data identity.
4. For a future immutable direct COG, change source metadata and GeoLibre export
   assumptions deliberately; do not label an arbitrary GeoTIFF as an original
   COG without verifying it.
5. Test download behavior in the actual GeoLibre export UI.

## Remove a layer

1. Remove the catalog entry or LULC generator definition.
2. Remove style or legend profiles only when no remaining layer uses them.
3. Remove an empty group from `GROUPS_TOP_FIRST`.
4. Update fixed counts, ordering assertions, README inventory, workflows, and
   manual validation list.
5. Confirm no default loading, hydration cache, print legend, or documentation
   still refers to the removed id.

## Validate proportionally

Always run:

```bash
git diff --check
CI=true npm test -- --watchAll=false --runInBand \
  src/App.test.jsx \
  src/config/geolibre.config.test.js \
  src/components/geolibre/geolibreProject.test.js \
  src/components/geolibre/GeoLibreFrame.test.jsx \
  src/components/geolibre/GeoLibreLegend.test.jsx
npm run build
```

Then use `npm start` and a real query-string scope. Exercise only relevant
manual checks plus these universal checks:

- GeoLibre, not the legacy sidebar, opens at `/download_layers`.
- Initial Demographic layers and legends still appear.
- The changed layer appears once in the intended group/order.
- Its source, map presentation, legend, loading/reuse, and download behavior
  match the requested contract.
- `/kyl_dashboard` remains unaffected.

Do not hide unrelated build warnings. Separate them from new failures.

## Report the result

Explain the completed change in this order:

1. physical source used or reused;
2. logical layer presentation added or changed;
3. files and coupled contracts updated;
4. automated and live validation performed;
5. any unverified GeoServer/deployment prerequisite;
6. branch/commit/PR state requested by the user.

Do not claim live styling, CORS, WMS, WCS, or download success from unit tests
alone.
