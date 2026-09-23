# KYL GeoLibre integration

`/explore_data` is a thin host for GeoLibre. KYL keeps its existing header
(including **Quick Tour**, **Download Excel**, and **QGIS Documentation**)
and gives the rest of the page to a trusted GeoLibre iframe. There is no second
KYL map, layer selector, or project panel.

CoRE Stack datasets are available under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

The app embeds the public viewer at `https://web.geolibre.app/` using its
supported bridge and WFS project representation. It does not build or modify
GeoLibre itself. `npm run build` compiles Landscape Explorer, including its
project builder and imported `@geolibre/core` helpers; the viewer loads separately.
No custom viewer checkout, patch, plugin, or deployment is needed.

## Runtime flow

1. The KYL homepage carries the selected state, district, and tehsil to
   `/explore_data` as query parameters.
2. `geolibreProject.js` requests the configured Terrain coverage's WMS
   GetCapabilities document, derives the complete tehsil bounding box from that
   coverage's advertised geographic extent, then opens the fixed GeoLibre
   catalog. Representative GeoServer listings inform catalog additions offline;
   they do not trigger startup probes or remove finalized layers by tehsil.
3. Terrain starts visible; all vector layers, including Administrative
   Boundaries and Socio-Economic Profile, start hidden and unloaded. All LULC
   years remain available as hidden layers.
4. Every catalog vector starts listed, hidden, and empty. Its first visibility toggle asks KYL to fetch that WFS
   source and send the hydrated layer back to GeoLibre. The hydrated layer is
   retained, so later off/on toggles do not repeat its WFS request.
5. Other raster layers start listed and hidden. GeoLibre requests their styled
   WMS tiles when enabled and retains the live raster
   source for later toggles; normal browser and MapLibre tile caches reuse tiles
   that have already been fetched.
6. The iframe reports `geolibre:ready`; KYL verifies its application version,
   sends the initial project, and fits the exact tehsil bounds once. Lazy
   project updates preserve the user's live map view and never fit it again.
   Startup completes after acknowledged map initialization and staged visibility
   commands. The public bridge does not confirm tile completion; the log records
   `renderVerified: false`.
7. A generated project omits `mapLayout` and `secondaryMapViews`, which is
   GeoLibre's native single-map representation. It also omits GeoLibre's
   Components plugin because that plugin's default control set includes Swipe;
   KYL supplies a separate raster legend. The standalone Swipe plugin
   is omitted too. KYL never simulates a split layout or overrides a layout the
   user later selects from the View menu.

## User guidance

The header provides three complementary entry points:

- **Quick Tour** opens a six-step, keyboard-accessible CoRE Stack guide to the
  Layers panel, layer controls, map navigation, legends, and exports.
- **Download Excel** downloads the Excel datasheet for the selected tehsil.
- **QGIS Documentation** opens the CoRE Stack desktop-GIS workflow.

Header actions include hover and keyboard-focus tooltips. The embedded
GeoLibre controls are cross-origin, so KYL does not reach into the iframe to
modify their DOM; the Quick Tour explains those controls without coupling the
integration to GeoLibre's internal markup.

```mermaid
flowchart LR
    A[KYL location selection] --> B[/explore_data URL]
    B --> C[Project builder]
    C --> D[Shared tehsil WFS]
    D --> C
    C --> E[GeoLibre project]
    E --> F[Trusted iframe bridge]
    F --> G[Public GeoLibre viewer]
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
2. **Extent:** the Terrain WMS GetCapabilities response supplies the
   authoritative extent for the configured Terrain coverage.
3. **Catalog:** `geolibreLayers.js` is the single layer inventory. It assigns
   the deployed KYL domain, GeoServer source, year, and order.
4. **Cartography:** named raster styles are rendered directly by GeoServer WMS.
   Every layer exposes live GeoServer SLD and JSON/PNG legend endpoints. The
   finalized vector profiles remain in the project as a visual-parity safeguard
   because GeoLibre project JSON cannot attach a remote SLD to a predeclared
   WFS layer. GeoLibre handles native vector legends; KYL provides raster legends.
5. **Loading:** only Terrain's WMS capabilities run at startup. Feature data is never preloaded; every
   vector hydrates once on first toggle, and rasters remain native lazy WMS layers.
6. **Units:** the public field dictionary comes from the local STAC unit CSV,
   with documented corrections and conservative year/field-name rules. Exact
   GeoServer column names remain unchanged. After hydration, units appear in
   popup labels and `metadata.corestack.fields`; structured records are `mixed`
   and unresolved numeric measures are explicitly `unknown`. The public
   viewer's attribute-table headers remain raw names because its project
   format does not expose a field-header alias contract.
7. **Download:** vector data remains available through GeoLibre and complete
   raster coverage is exposed through WCS for **GeoTIFF (COG)** export.
8. **Failure handling:** users receive short recovery guidance. A bounded
   technical trace can be downloaded as a `.log` file when support needs it.

## Native layer organization

GeoLibre's own layer panel follows the deployed CoRE data-layer taxonomy,
ordered top-first as:

1. Demographic (Administrative Boundaries, Socio-Economic Profile)
2. Village Data (facilities access, Mission Antyodaya and livestock)
3. Hydrology (including micro-watersheds, rivers, canals and hydrological variables)
4. Land Use Land Cover
5. Land (including terrain and the Digital Elevation Model)
6. Trees
7. Agriculture
8. Restoration
9. Industry
10. NREGA

All groups are collapsed except Land, which starts expanded. Terrain is the one visible data layer at
startup; every other layer is toggle-to-load. LULC has one Level 3 raster per
year, with 2024-2025 listed first and every year back to 2017-2018 retained.
It uses `lulc_land_use_KYL`, the published 12-class GeoServer style, rather than
creating separate Level 1, Level 2, and Level 3 presentations. This named style
is rendered through GeoServer's global WMS endpoint; downloads continue to use
the single Level 3 WCS coverage.

The catalog has 82 entries: 41 WMS rasters and 41 vector presentations.
Trees contains canopy density and height for every published year (2017–2023,
newest first), forest change, grassland trees, forest fringe,
afforestation/deforestation base/statistics pairs, and NREGA plantation assets.
Base/statistics partners appear consecutively in the top-first layer list for
Terrain, Soil Health, five Change Detection themes, Restoration Atlas, and the
LULC statistics after the yearly rasters. Suffixes follow the finalized CSV;
reference layers have no suffix. Shrubland Diversion has a pending raster
entry and a published statistics vector. GeoLibre does not load the NDVI
time-series vectors.

The checked-in `src/config/geolibreCatalog.json` contains presentation and
source-backed field definitions. The private workbook and authoring CSV are
not loaded by the application or its start, test, and build commands.
The workbook supplied descriptions for 2,093 vector-column records and 40
source layers; other catalog descriptions are limited to what the published
layer names, fields, and established methods support. Previously reviewed
units take precedence where workbook units conflict with live field semantics.

MicroWatershed Boundaries reads `mws:mws_{district}_{tehsil}` through the
workspace WFS endpoint. Its published WMS map is a view of the same feature
type. The vector source supplies `uid` labels and the basin and watershed
attributes used by the hover tooltip. All 41 vector presentations configure
hover titles or fields; the click popup continues to expose the full attributes.
Hover follows the finalized CSV field selection, expands matching field patterns,
and uses source descriptions as labels when available. LULC statistics show
their own measured area shares, and Terrain Clusters shows area ratios from its
published fields. Raster layers retain their existing identify behavior.

`drought_peak_intensity`, annual peaks and stress-week sums are computed in
`droughtPresentation.js` when drought features first load. That module also
groups the published top-three annual causality pathways into recorded impact
categories; ties and missing records remain distinct. These summaries do not
declare official drought. `withLulcAreaFractions` in `geolibreProject.js`
divides mean annual class areas by `area_in_ha`; the seasonal water share
requires all three water classes in a given year. Original source fields and
names remain intact. GeoLibre styles and tooltips consume these local derived
properties after hydration.

The project camera is calculated from the Terrain coverage's GeoServer-advertised
geographic extent using a padded Web Mercator fit. `mapView.bbox` is also retained in project metadata,
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

KYL renders one movable raster legend card over the iframe. It is constrained to
the iframe area; the public bridge does not expose the internal map rectangle
to exclude native side panels. Vector legends use GeoLibre's native controls.
Its selector is updated directly from GeoLibre state snapshots and contains the
currently visible raster layers. A newly enabled layer becomes the selected legend, so
Level 1, Level 2, and Level 3 LULC styles each immediately show their own class
palette. This update does not send the full project back to the iframe, preserving
GeoLibre's native raster sources and avoiding redundant tile reloads. The
separate `legend` project field retains the complete layer ordering and grouping
for GeoLibre's Print Layout legend.

## Version configuration

The default hosted viewer accepts any GeoLibre release from `2.6.0` up to, but
not including, `4.0.0`. Compatible 2.x and 3.x hosted upgrades need no KYL code change.
The compatibility policy is configured in
`../../config/geolibre.config.js`:

```js
export const GEOLIBRE_CONFIG = Object.freeze({
  version: process.env.REACT_APP_GEOLIBRE_VERSION || "2.6.0",
  minimumCompatibleVersion: "2.6.0",
  supportedMajorVersion: 3, // inclusive major-version ceiling
  // ...
});
```

`version` records the preferred/tested release and fills `{version}` in a
versioned URL template. It cannot select the release served by the unversioned
`https://web.geolibre.app/` deployment.

For an exactly pinned self-hosted release, set:

```dotenv
REACT_APP_GEOLIBRE_VERSION=2.6.0
REACT_APP_GEOLIBRE_URL_TEMPLATE=https://maps.example.org/geolibre/{version}/
REACT_APP_GEOLIBRE_STRICT_VERSION=true
```

The hosted URL follows GeoLibre's current web deployment and may also be served
from an existing browser cache. KYL checks its reported version, accepts the
compatible 2.x/3.x range, and rejects releases outside that range. The minimum
version supplies the lower bound; `supportedMajorVersion` is the inclusive
upper major-version bound. This check alone does not provide an older hosted
build when the rolling site upgrades beyond the ceiling. `{version}` is replaced
automatically for versioned deployments. A major-version update should update
the compatibility rules and project/bridge tests, not just the version value.
The small badge over the iframe reports the version that actually completed the
GeoLibre handshake and whether its deployment URL is `rolling` or `pinned`.

GeoLibre's application version (`2.6.0`) is separate from its project schema
version (`0.2.0`). Do not change the project format merely when upgrading the
application.

## Files

| File | Responsibility |
|---|---|
| `../../config/geolibre.config.js` | Viewer application version, URL resolution, strict handshake compatibility |
| `../../config/geolibreLayers.js` | GeoServer names, deployed domains, raster `rasterStyle` values, and all LULC years |
| `../../config/geolibreCatalog.json` | Checked-in layer presentation, descriptions, and field definitions |
| `geolibreProject.js` | Project generation, legends, Google imagery, vector hydration, GeoServer style/WFS/WMS/WCS references, bbox camera, and date-record JSON parsing |
| `GeoLibreFrame.jsx` | Iframe bridge, one-time bbox fit, human error states and downloadable bounded technical log |
| `../../pages/LandscapeExplorer.jsx` | Route-to-project orchestration and fetch-on-first-toggle vector cache; no duplicate map or layer UI |

The current project contains 85 entries: 44 vector entries, 8 LULC yearly
rasters, and 33 other rasters. Initial startup performs one Terrain WMS
GetCapabilities request, then displays Terrain. Each vector makes its own WFS
request only on its first toggle. Hidden rasters make no WMS tile
request.

The checked-in catalog is the application source of truth for layer order,
names, sources, descriptions, units, styles, and tooltip definitions. The
private workbook and CSV can inform deliberate catalog edits, but never run
as part of the application lifecycle. The catalog validates source IDs and
patterns against the layer definitions.
The additional six published rasters use GeoServer's named styles. The
Shrubland Diversion raster and proposed `change_shrubland_diversion_style`
remain unpublished; its one legend item is only a placeholder, not a binning
specification.

## Error handling

The page never presents iframe handshakes, version parsing, viewer URLs, or
browser-console instructions as end-user error text. It asks the user to retry,
check their connection where relevant, and contact the CoRE Stack team if the
problem continues. **Download technical log** creates a small
`kyl-geolibre-<timestamp>.log` file containing at most the latest 40 lifecycle
events. Browsers require this explicit user download and cannot silently write
a log file to the user's filesystem.

## Styling contract

Fortnightly Water Balance and Annual Water Balance share the same `rdbu`
diverging palette, with red for net depletion and blue for net recharge. Each
layer colors on the mean `DeltaG` across its own embedded date-keyed or
year-keyed JSON records (`avg_delta_g`), computed client-side at hydration;
GeoServer never returns a precomputed net field. A second derived field,
`avg_delta_g_class`, bins that average into one of 6 mm-labeled classes so
GeoLibre's native legend lists each class instead of nothing, which is what
an expression-mode fill color leaves. Fortnightly's thresholds are narrower
than Annual's because averaging many fortnights per feature yields much
smaller magnitudes than averaging a handful of annual sums. Date-keyed JSON
strings are decoded for attribute inspection with their field names and full
records retained; only the two derived fields above are added. The MWS
stroke color `#05081c` is retained for both layers. It adds no diagrams or
time controls beyond GeoLibre's native vector legend.

NREGA work-category assets are colored per category from one shared point
source, pre-filtered client-side into each logical layer. GeoServer has
published this source under two field names over time: earlier layers use the
clipped `WorkCatego`, newer layers publish the full `WorkCategory`. Hydration
reads whichever field a feature has and normalizes it onto `WorkCatego` before
categorizing or styling, so both schemas render identically without knowing in
advance which one a given tehsil's dataset uses. Each category renders as a
plain filled circle (`circleRadius`/`fillColor`, no marker/icon symbol) using
the CoRE Stack `workToColorMapping`; a category absent from that mapping falls
back to its `Default` color.

Terrain Clusters has the same two-schema situation on its cluster id field:
earlier layers publish `terrainClu`, later layers publish `terrainClusters`.
Hydration normalizes every feature onto `terrainClu`, the field the
categorized style keys on, before classification, so both schemas classify
and color identically.

Native style controls belong to public GeoLibre. KYL does not automatically open
the Style panel, add palette controls, or change GeoLibre's internal treatment of
missing values after native style edits. The generated project still supplies its
initial vector styles and missing-data guards.

- Style delivery no longer depends on GitHub-hosted QML files. Each layer's
  `metadata.corestack.geoserverStyle` contains public GeoServer `GetStyles` and
  `GetLegendGraphic` URLs for SLD, JSON legend, and PNG legend access.
- Every raster catalog entry has a `rasterStyle` key. A non-empty value is sent
  as the WMS `STYLES` parameter; `""` deliberately asks GeoServer to use the
  layer's published default. Named raster styles keep rendered pixels and the
  published server style in one contract.
- WFS returns geometry and attributes, not cartography. GeoLibre 2.6 can import
  an SLD interactively, but its project format cannot associate a remote SLD
  URL with an already declared WFS layer. The finalized GeoLibre vector styles
  and legends therefore remain embedded as a tested parity fallback instead of
  adopting GeoServer's generic `polygon`, `line`, `point`, or `generic` defaults.
- When a finalized vector style is assigned on GeoServer, validate its public
  SLD and JSON legend against the parity profile before making it authoritative.
- Each raster keeps its styled WMS tiles for display and exposes its complete
  WCS GetCoverage GeoTIFF as `source.url`. This is the contract GeoLibre 2.1+
  uses to show **Export → GeoTIFF (COG)** and save the returned bytes without
  subset extraction or client-side re-encoding.

GeoServer WCS returns the complete published coverage, matching KYL's previous
download flow. It is not guaranteed to be byte-identical to GeoServer's private
backing file. If immutable original COG objects are published later, place those
direct object URLs in the raster catalogue and use them instead of the WCS
fallback.

Changing a GeoServer vector default does not automatically alter rendered
GeoLibre symbology; update and test the matching parity profile until GeoLibre
supports remote SLD URLs in saved project layers. Raster appearance changes
must be published to the named GeoServer WMS style.

## Fresh-checkout setup

No backend patch, generated project file, vendored GeoLibre bundle, or local
`.local/` prototype is required. A tester needs this branch and one `.env` file:

```bash
git fetch origin
git switch feat/geolibre_loading
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
   **Explore CoRE Data Layers**.
3. Confirm the GeoLibre badge reports a compatible 2.x version, the Google
   Satellite Hybrid basemap appears, the map fits the tehsil, and Demographic
   shows Administrative Boundaries then Socio-Economic Profile,
   both visible at `0.80`.
4. Confirm the native legend starts minimized and lists only Administrative
   Boundaries and Socio-Economic Profile. Toggle a raster or LULC layer on and
   confirm its legend appears; toggle it off and confirm that entry disappears.
5. Confirm no other layer loads by itself. Toggle MicroWatershed Boundaries and Drainage
   under Hydrology and confirm each loads. Toggle each
   off and on again and confirm its WFS request is not repeated.
6. Confirm the map does not refit after those vector loads. Enable a raster and
   verify its styled WMS display and **Export → GeoTIFF
   (COG)** full-coverage download.
7. Confirm there is no vertical Layer Swipe divider after the project loads.
   Open **Quick Tour**, step through all five tips, and open both documentation
   links. Inspect a generated layer's metadata and confirm its style URLs use
   the configured GeoServer.
8. If testing a failure state, confirm it uses human recovery guidance and that
   **Download technical log** saves a `.log` file.

The generated `/explore_data?state=...&district=...&tehsil=...` URL can be
refreshed or shared on the same KYL host because the location is URL-backed.

For a release upgrade, verify all of the following before changing the default
version: the ready handshake reports the expected release, the project loads
without `geolibre:error`, only Terrain is initially visible,
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

GeoLibre 2.6 leaves room for deeper work without another KYL map implementation:

- use direct object-store COG URLs for immutable original-file downloads;
- preconfigure processing models, bookmarks, print layouts, stories, or plugins;
- expose saved/shareable GeoLibre project files for partner workflows;
- replace vector parity profiles with live SLD URLs once GeoLibre's project
  format supports remote styles on predeclared WFS layers;
- self-host tested versioned builds so a single version change selects the
  exact deployed application binary.
