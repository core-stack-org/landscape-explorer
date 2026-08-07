# KYL GeoLibre integration

`/download_layers` is a thin host for GeoLibre. KYL keeps its existing header
(including **GeoLibre User Guide**, **QGIS Documentation**, and the QML style
repository fallback) and gives the rest of the page to a trusted GeoLibre
iframe. There is no second KYL map, layer selector, or project panel.

CoRE Stack datasets are available under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

The implementation targets
[GeoLibre v2.2.0](https://github.com/opengeos/GeoLibre/releases/tag/v2.2.0)
and uses its supported embed bridge and WFS project representation.

## Runtime flow

1. The KYL homepage carries the selected state, district, and tehsil to
   `/download_layers` as query parameters.
2. `geolibreProject.js` fetches the shared Demographic WFS source once. It creates
   **Administrative Boundaries** and **Socio-Economic Profile** from that data,
   derives the complete tehsil bounding box, and immediately opens GeoLibre.
3. Both default Demographic layers start visible at opacity `0.8`, in that
   display order.
4. Every vector outside the two default Demographic entries starts listed,
   hidden, and empty. Its first visibility toggle asks KYL to fetch that WFS
   source and send the hydrated layer back to GeoLibre. The hydrated layer is
   retained, so later off/on toggles do not repeat its WFS request.
5. Raster layers also start listed and hidden. GeoLibre requests their styled
   WMS tiles only after the first visibility toggle and retains the live raster
   source for later toggles; normal browser and MapLibre tile caches reuse tiles
   that have already been fetched.
6. The iframe reports `geolibre:ready`; KYL verifies its application version,
   sends the initial project, and fits the exact tehsil bounds once. Lazy
   project updates preserve the user's live map view and never fit it again.

```mermaid
flowchart LR
    A[KYL location selection] --> B[/download_layers URL]
    B --> C[Project builder]
    C --> D[Shared tehsil WFS]
    D --> C
    C --> E[GeoLibre project]
    E --> F[Trusted iframe bridge]
    F --> G[GeoLibre 2.x]
    G --> H[Lazy WFS vectors]
    G --> I[WMS display and WCS downloads]
```

```mermaid
sequenceDiagram
    actor User
    participant GeoLibre
    participant KYL
    participant GeoServer
    User->>GeoLibre: Toggle a hidden vector
    GeoLibre-->>KYL: geolibre:state
    KYL->>GeoServer: WFS GetFeature
    GeoServer-->>KYL: GeoJSON FeatureCollection
    KYL-->>GeoLibre: Hydrated state and active-layer legends
    User->>GeoLibre: Toggle the layer off and on
    GeoLibre-->>KYL: geolibre:state
    Note over KYL,GeoLibre: Reuse cached layer; no second WFS request or bbox fit
```

## Methodology

1. **Scope:** state, district, and tehsil are read from the route so a project
   is reproducible and shareable.
2. **Extent:** the shared panchayat-boundary WFS response supplies both default
   Demographic layers and the authoritative tehsil bbox.
3. **Catalog:** `geolibreLayers.js` is the single layer inventory. It assigns
   the deployed KYL domain, GeoServer source, QML reference, year, and order.
4. **Cartography:** vector QML logic is represented in GeoLibre styles; raster
   QML is rendered by the corresponding named GeoServer WMS style. Matching
   color labels are synchronized into GeoLibre's native legend only while the
   corresponding layer is visible.
5. **Loading:** only the shared default WFS is fetched at startup. Other
   vectors hydrate once on first toggle; rasters remain native lazy WMS layers.
6. **Download:** vector data remains available through GeoLibre and complete
   raster coverage is exposed through WCS for **GeoTIFF (COG)** export.
7. **Failure handling:** users receive short recovery guidance. A bounded
   technical trace can be downloaded as a `.log` file when support needs it.

## Native layer organization

GeoLibre's own layer panel follows the deployed Download Layers taxonomy,
ordered top-first as:

1. Demographic (Administrative Boundaries, Socio-Economic Profile)
2. Hydrology (including micro-watersheds and hydrological variables)
3. LULC Level 3 by year
4. LULC Level 2 by year
5. LULC Level 1 by year
6. Land
7. Agriculture
8. Restoration
9. Climate
10. NREGA

The remaining groups are collapsed. Every layer outside the two default
Demographic entries is toggle-to-load. Each LULC group shows 2024-2025 first
while retaining every available year back to 2017-2018.

The project camera is calculated from the Socio-Economic geometry using a
padded Web Mercator fit. `mapView.bbox` is also retained in project metadata,
and the iframe receives one `fitBounds` command after its initial load, so the
initial map contains the full tehsil rather than a generic India extent. Layer
toggles and lazy hydration do not issue another fit command.

## Basemap and legends

The default is the same Google Satellite Hybrid tile source used by the
existing KYL maps. It is wrapped in an inline MapLibre style with Google
attribution. A deployment can replace it with another valid MapLibre style:

```dotenv
REACT_APP_GEOLIBRE_BASEMAP_STYLE_URL=https://maps.example.org/style.json
```

GeoLibre's built-in Components plugin provides one on-map legend control in
minimized mode by default. Its rendered legend uses the bottom-right map corner,
and its selector contains only layers that are currently visible. Toggling a
layer on adds its symbol classes; toggling it off removes them. One selected
layer's classes are shown at a time, so enabling several layers does not expand
every palette across the map. The separate `legend` project field retains the
complete layer ordering and grouping for GeoLibre's Print Layout legend.

## Version configuration

The default hosted viewer accepts any GeoLibre release from `2.0.0` up to, but
not including, `3.0.0`. Compatible 2.x hosted upgrades need no KYL code change.
The one source-code fallback to update is the version value in
`../../config/geolibre.config.js`:

```js
export const GEOLIBRE_CONFIG = Object.freeze({
  version: process.env.REACT_APP_GEOLIBRE_VERSION || "2.2.0",
  minimumCompatibleVersion: "2.0.0",
  supportedMajorVersion: 2,
  // ...
});
```

`version` records the preferred/tested release and fills `{version}` in a
versioned URL template. It cannot select the release served by the unversioned
`https://web.geolibre.app/` deployment.

For an exactly pinned self-hosted release, set:

```dotenv
REACT_APP_GEOLIBRE_VERSION=2.3.0
REACT_APP_GEOLIBRE_URL_TEMPLATE=https://maps.example.org/geolibre/{version}/
REACT_APP_GEOLIBRE_STRICT_VERSION=true
```

The hosted URL follows GeoLibre's current web deployment and may also be served
from an existing browser cache. KYL checks its reported version, accepts the
compatible 2.x range, and rejects other major versions. `{version}` is replaced
automatically for versioned deployments. A major-version update should update
the compatibility rules and project/bridge tests, not just the version value.
The small badge over the iframe reports the version that actually completed the
GeoLibre handshake and whether its deployment URL is `rolling` or `pinned`.

GeoLibre's application version (`2.2.0`) is separate from its project schema
version (`0.2.0`). Do not change the project format merely when upgrading the
application.

## Files

| File | Responsibility |
|---|---|
| `../../config/geolibre.config.js` | Viewer application version, URL resolution, strict handshake compatibility |
| `../../config/geolibreLayers.js` | GeoServer names, deployed domains, all LULC years, QML references and WMS styles |
| `geolibreProject.js` | Project generation, legends, Google imagery, vector hydration, WMS/WCS references and bbox camera |
| `GeoLibreFrame.jsx` | Iframe bridge, one-time bbox fit, human error states and downloadable bounded technical log |
| `../../pages/LandscapeExplorer.jsx` | Route-to-project orchestration and fetch-on-first-toggle vector cache; no duplicate map or layer UI |

The current project contains 45 entries: 13 vector entries, 24 LULC year/level
rasters, and 8 other rasters. Initial startup performs exactly one distinct WFS
request for the shared Demographic data and no WMS request. Each other vector
makes its own WFS request only on its first toggle. Hidden rasters make
no WMS tile request.

## Error handling

The page never presents iframe handshakes, version parsing, viewer URLs, or
browser-console instructions as end-user error text. It asks the user to retry,
check their connection where relevant, and contact the CoRE Stack team if the
problem continues. **Download technical log** creates a small
`kyl-geolibre-<timestamp>.log` file containing at most the latest 40 lifecycle
events. Browsers require this explicit user download and cannot silently write
a log file to the user's filesystem.

## Styling contract

- Vector QML rules are translated into GeoLibre categorized or expression
  styles. The source QML URL remains in `metadata.corestack.qmlStyleUrl`.
- To use these layers with QGIS, download layer styles from the
  [CoRE Stack QGIS Styles repository](https://github.com/core-stack-org/QGIS-Styles)
  and load them through QGIS layer properties.
- Raster QML styles are published as named GeoServer styles and rendered by
  WMS. Their original QML URLs are also retained.
- Each raster keeps its styled WMS tiles for display and exposes its complete
  WCS GetCoverage GeoTIFF as `source.url`. This is the contract GeoLibre 2.1+
  uses to show **Export → GeoTIFF (COG)** and save the returned bytes without
  subset extraction or client-side re-encoding.

GeoServer WCS returns the complete published coverage, matching KYL's previous
download flow. It is not guaranteed to be byte-identical to GeoServer's private
backing file. If immutable original COG objects are published later, place those
direct object URLs in the raster catalogue and use them instead of the WCS
fallback.

Changing only a QML URL does not alter rendered vector symbology; update the
matching style profile in `geolibreProject.js`. Raster appearance changes must
be published to the named GeoServer WMS style.

## Fresh-checkout setup

No backend patch, generated project file, vendored GeoLibre bundle, or local
`.local/` prototype is required. A tester needs this branch and one `.env` file:

```bash
git fetch origin
git switch feat/geolibre-cog-download
git pull --ff-only
cp .env.example .env
npm install
```

The committed `.env.example` provides the public API and GeoServer values needed
by both the existing KYL dashboard and the GeoLibre route. GeoLibre uses its
source defaults unless an operator intentionally enables the commented override
variables. Restart the React development server after any `.env` change.

## Validation

Focused tests:

```bash
CI=true npm test -- --watchAll=false \
  src/config/geolibre.config.test.js \
  src/components/geolibre/geolibreProject.test.js \
  src/components/geolibre/GeoLibreFrame.test.jsx \
  src/components/landing_navbar.test.jsx
```

Build:

```bash
npm run build
```

Local demo:

```bash
HOST=0.0.0.0 PORT=3000 BROWSER=none npm start
```

Check both routes:

1. Open `http://localhost:3000/kyl_dashboard` and confirm there is no
   `REACT_APP_GEOSERVER_URL is not set` runtime error.
2. Open `http://localhost:3000`, select a state, district, and tehsil, and click
   **Download Layers**.
3. Confirm the GeoLibre badge reports a compatible 2.x version, the Google
   Satellite Hybrid basemap appears, the map fits the tehsil, and Demographic
   shows Administrative Boundaries then Socio-Economic Profile,
   both visible at `0.80`.
4. Confirm the native legend starts minimized and lists only Administrative
   Boundaries and Socio-Economic Profile. Toggle a raster or LULC layer on and
   confirm its legend appears; toggle it off and confirm that entry disappears.
5. Confirm no other layer loads by itself. Toggle Micro-watersheds and Drainage
   under Hydrology and confirm each loads. Toggle each
   off and on again and confirm its WFS request is not repeated.
6. Confirm the map does not refit after those vector loads. Enable a raster and
   verify its styled WMS display and **Export → GeoTIFF
   (COG)** full-coverage download.
7. Open both documentation buttons, the QML repository, and the CC BY 4.0 link.
8. If testing a failure state, confirm it uses human recovery guidance and that
   **Download technical log** saves a `.log` file.

The generated `/download_layers?state=...&district=...&tehsil=...` URL can be
refreshed or shared on the same KYL host because the location is URL-backed.

For a release upgrade, verify all of the following before changing the default
version: the ready handshake reports the expected release, the project loads
without `geolibre:error`, both default Demographic layers are visible at `0.8`,
the full tehsil fits exactly once, Hydrology and other vectors hydrate
only when toggled and are then reused, WMS tiles appear only when enabled, and GeoLibre
can save/export the resulting project.

## Production deployment

The deployment must set `REACT_APP_API_URL` and `REACT_APP_GEOSERVER_URL` before
running `npm run build`. The current official viewer is a rolling URL. To pin an
exact self-hosted build, additionally set the three version-template variables
shown above. GeoServer WFS, WMS, and WCS endpoints must remain reachable from
the user's browser with CORS enabled, and the site's framing policy must permit
`https://web.geolibre.app`. Browser policy must also permit imagery requests to
`https://mt1.google.com`, unless the basemap override is used.

## Future integration options

GeoLibre 2.2 leaves room for deeper work without another KYL map implementation:

- use direct object-store COG URLs for immutable original-file downloads;
- preconfigure processing models, bookmarks, print layouts, stories, or plugins;
- expose saved/shareable GeoLibre project files for partner workflows;
- add direct QML import once GeoLibre's web project/style contract supports it;
- self-host tested versioned builds so a single version change selects the
  exact deployed application binary.
