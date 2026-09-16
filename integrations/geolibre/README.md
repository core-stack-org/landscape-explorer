# CoRE Stack GeoLibre deployment integration

This bundle targets GeoLibre **v3.0.0**, commit `9778da6cbf5c06d5395b0725f24f025a029bc3df`. It is prepared for a CoRE Stack-controlled viewer deployment; pushing this repository does **not** update `web.geolibre.app`.

From a clean checkout of that GeoLibre tag, run:

```sh
/path/to/landscape-explorer/integrations/geolibre/install.sh /path/to/GeoLibre
```

Then install, test and build the viewer using its own web deployment instructions. The installer checks the pinned revision and a clean worktree before applying the patch and copying the bundled plugin. Configure Landscape Explorer's `REACT_APP_GEOLIBRE_URL` to the deployed viewer URL, `REACT_APP_GEOLIBRE_VERSION=3.0.0`, and `REACT_APP_GEOLIBRE_REQUIRE_RENDER_CONFIRMATION=true`. Preserve the embedding page's HTTP(S) referrer (the browser's default `strict-origin-when-cross-origin` is sufficient).

The plugin uses GeoLibre's documented bundled drop-in mechanism. No project manifest URL or runtime trust bypass is used. The project activates `corestack-embed`; all messages check the parent window, origin, scope and request sequence. The plugin reports the primary MapLibre container rectangle and confirms rendering only after a fresh idle event, loaded visible sources, and completed tiles. Source errors are reported separately. Observers/listeners are removed on deactivation.

The accompanying host patch:

- Opens the native Style panel initially for `?corestack=1`; subsequent user collapse/expand actions remain available.
- Uses `#3b3b3b` for missing categorical and graduated values, including when users change native styles.
- Adds the native palette selector beside CoRE Stack fixed-threshold expressions. Changing the palette recolors only the classifier, retaining thresholds and the gray missing-data branch. Source fields and class counts remain visible. Computed expressions are edited through the native expression editor.
- Retains the selected lighter middle samples of Red–Yellow–Green for Cropping Intensity.

The unpatched public viewer supports the generated projects and native graduated/category controls, but lacks these expression controls, automatic Style-panel expansion, and the map-bounds bridge. Without bounds, the raster card is constrained to the iframe area; accurate exclusion of native side panels requires this deployment bundle.

## Finalized style contract

The implementation follows the private `geolibre_layer_style_finalised.xlsx` sheet `finalised_v1`. Neither the workbook nor sample features are published. Original source field names are preserved. Palette interpolation and Natural Breaks come from pinned `@geolibre/core@3.0.0`; no local palette copies or example-tehsil break tables are used. Missing values remain distinct from valid zero. Facilities requires `data_availability_status="computed"`; Antyodaya and Livestock require `data_availability_status="matched"`. Missing or different statuses are unavailable, even if thematic fields contain values. Unavailable observations are excluded from Natural Breaks. Source records remain present and missing observations are gray.

Raster WMS styles remain unchanged. Native legends describe vector symbology; the movable React card holds only raster legends. Dataset names always come from the catalog's `label` (the workbook's `Layer` column), never from a selected measurement.

Village outlines are `#000000` for Administrative Boundaries, Socio-Economic Profile, Facilities Proximity, Mission Antyodaya and Village Livestock Census. MWS outlines are `#05081c` for MWS boundaries, both Water Balance layers, Terrain Clusters, Cropping Intensity and Drought. These stroke colors are independent of thematic fills and missing values. Boundary-only layers retain transparent fills.

Fortnightly Water Balance parses date-keyed JSON/object records once on hydration. It preserves every original property and derives `__corestack_delta_g_mm` and `__corestack_observation_date` for the latest date shared across the layer. A feature missing that date is gray; it does not silently substitute an older observation. The approved seven-class Red–Blue expression uses DeltaG in mm and thresholds -100, -50, -10, 10, 50, 100. Metadata records the chosen date and the full date list. This is a latest-observation view, not a claim that GeoLibre's native time slider can yet move through the wide date-keyed data. The Hilsa sample check found 208 dates and 105 valid DeltaG values on 2025-06-16.

## Startup lifecycle

Only the latest LULC layers start enabled. Level 1 starts first; Levels 2 and 3 are enabled by acknowledged native commands 300 ms apart after map creation and extent fitting. Their published transparent WMS masks refine the lower levels at opacity 1, preserving class colors. WMS requests have different `STYLES`, so browser cache reuse across all three is not assumed. MWS, administrative boundaries and demographics are initially off; the shared administrative source is fetched solely to locate the tehsil.

The iframe handshake, project acknowledgement, live map creation, extent fit, deferred layers and render completion are distinct events. Request sequences and scopes reject stale replies. Startup completes once per iframe instance; later vector hydration never reopens the startup overlay or reenables defaults that users disabled. Retry remounts the viewer and aborts old data requests. The GeoLibre version button downloads the timestamped lifecycle log, including handshake-to-map and, on the bundled viewer, handshake-to-render timing. Shared KYL logger integration was deferred at the user's request.

The public host can confirm a live map through its command bridge but exposes no tile-completion event. It finishes startup after acknowledged map initialization without a persistent loading message and records rendering as unverified. Enable the setting above on the patched deployment to require a true render event. There is no timer-based success fallback.

## Checks

```sh
CI=true npm test -- --watchAll=false --runInBand src/config/geolibre.config.test.js src/components/geolibre
npm run build
```

These are local source/unit/build checks. A release should also verify the patched viewer build and actual iframe behavior on the deployed origins (panel resizing, a palette change, WMS rendering and retries). No browser or local viewer is launched by this change's validation.

For the patched viewer sources, `node integrations/geolibre/verify-host.mjs /path/to/GeoLibre` checks patched TS/TSX syntax and executes missing-value expressions through MapLibre, plus palette recoloring. This does not substitute for the viewer's full TypeScript build.
