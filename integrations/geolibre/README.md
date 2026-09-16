# CoRE Stack GeoLibre deployment integration

This bundle targets GeoLibre **v3.0.0**, commit `9778da6cbf5c06d5395b0725f24f025a029bc3df`. It is prepared for a CoRE Stack-controlled viewer deployment; pushing this repository does **not** update `web.geolibre.app`.

From a clean checkout of that GeoLibre tag, run:

```sh
/path/to/landscape-explorer/integrations/geolibre/install.sh /path/to/GeoLibre
```

Then install, test and build the viewer using its own web deployment instructions. The installer checks the pinned revision and a clean worktree before applying the patch and copying the bundled plugin. Configure Landscape Explorer's `REACT_APP_GEOLIBRE_URL` to the deployed viewer URL, and `REACT_APP_GEOLIBRE_VERSION=3.0.0`. Preserve the embedding page's HTTP(S) referrer (the browser's default `strict-origin-when-cross-origin` is sufficient).

The plugin uses GeoLibre's documented bundled drop-in mechanism. No project manifest URL or runtime trust bypass is used. The project activates `corestack-embed`; all messages check the parent window, origin, scope and request sequence. The plugin reports the primary MapLibre container rectangle and cleans up observers/listeners on deactivation.

The accompanying host patch:

- Opens the native Style panel initially for `?corestack=1`; subsequent user collapse/expand actions remain available.
- Uses `#3b3b3b` for missing categorical and graduated values, including when users change native styles.
- Adds the native palette selector beside CoRE Stack fixed-threshold expressions. Changing the palette recolors only the classifier, retaining thresholds and the gray missing-data branch. Source fields and class counts remain visible. Computed expressions are edited through the native expression editor.
- Retains the selected lighter middle samples of Red–Yellow–Green for Cropping Intensity.

The unpatched public viewer supports the generated projects and native graduated/category controls, but lacks these expression controls, automatic Style-panel expansion, and the map-bounds bridge. Without bounds, the raster card is constrained to the iframe area; accurate exclusion of native side panels requires this deployment bundle.

## Finalized style contract

The implementation follows the private `geolibre_layer_style_finalised.xlsx` sheet `finalised_v1`. Neither the workbook nor sample features are published. Original source field names are preserved. Palette interpolation and Natural Breaks come from pinned `@geolibre/core@3.0.0`; no local palette copies or example-tehsil break tables are used. Missing values remain distinct from valid zero. Facilities excludes non-`computed` observations from classification. Source records remain present and missing observations are gray.

Raster WMS styles remain unchanged. Native legends describe vector symbology; the movable React card holds only raster legends. Boundary fills stay transparent. The finalized Fortnightly Water Balance row explicitly defers thematic styling until a derived time-series view is implemented, so it remains a transparent boundary. Its date-keyed JSON measurements must be unpivoted and bound to their actual dates before applying the proposed DeltaG ramp; a scalar date cannot be inferred from one feature's many observation dates.

## Checks

```sh
CI=true npm test -- --watchAll=false --runInBand src/config/geolibre.config.test.js src/components/geolibre
npm run build
```

These are local source/unit/build checks. A release should also verify the patched viewer build and actual iframe behavior on the deployed origins (panel resizing, a palette change, WMS rendering and retries). No browser or local viewer is launched by this change's validation.

For the patched viewer sources, `node integrations/geolibre/verify-host.mjs /path/to/GeoLibre` checks patched TS/TSX syntax and executes missing-value expressions through MapLibre, plus palette recoloring. This does not substitute for the viewer's full TypeScript build.
