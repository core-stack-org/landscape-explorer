# GeoLibre in Know Your Landscape

This is the single implementation and maintenance guide for the GeoLibre-based
**Download Layers** page in Know Your Landscape (KYL). It is meant for people
new to this code, regular maintainers, and AI coding agents. Read this document
before changing the route, catalog, styles, legends, loading behavior, viewer,
or GeoServer contracts.

The implementation is available at:

```text
/download_layers
```

KYL generates a tehsil-scoped GeoLibre project and loads it inside a trusted
cross-origin iframe. GeoLibre supplies the GIS workspace and map interaction;
KYL supplies the location, CoRE Stack catalog, GeoServer URLs, initial map
extent, presentation rules, legends, and lazy-loading behavior.

The implementation was last checked against the public GeoLibre 2.5.0 viewer
and the GeoLibre `0.2.0` project schema on 6 August 2026. The checked-in
fallback application version remains `2.2.0`; see [Versioning](#versioning) for
why those numbers can differ.

CoRE Stack datasets are available under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

## Start here

For a normal local checkout:

```bash
cp .env.example .env
npm install
npm start
```

Then either select a state, district, and tehsil on the home page and click
**Download Layers**, or open a URL such as:

```text
http://localhost:3000/download_layers?state=Gujarat&district=Bhavnagar&tehsil=Mahuva
```

The query-string form is useful for a reproducible test. Without query
parameters, the page uses the location already held in KYL's Recoil store. If
neither source contains all three location values, the page asks the user to
select a tehsil first.

After changing any `.env` value, restart `npm start`; Create React App reads
these variables at build/start time.

## The shortest accurate mental model

There are three systems involved:

1. **KYL React application** chooses the tehsil and builds a GeoLibre project.
2. **GeoLibre** opens that project, renders and controls the map, and reports
   current project state back to KYL.
3. **GeoServer** serves vector features through WFS, styled raster tiles through
   WMS, and complete raster downloads through WCS.

```mermaid
flowchart LR
    User[User selects a tehsil] --> Route[/download_layers]
    Route --> Builder[KYL project builder]
    Builder -->|Initial shared WFS| GS[CoRE Stack GeoServer]
    Builder --> Project[Tehsil GeoLibre project]
    Project --> Bridge[KYL iframe bridge]
    Bridge <--> Viewer[GeoLibre application]
    Viewer -->|Visible raster tiles: WMS| GS
    Viewer -->|Raster export: WCS| GS
    Viewer -->|Layer state| Bridge
    Bridge -->|First visible vector: WFS| GS
    Bridge -->|Hydrated project update| Viewer
```

The `/download_layers` route does **not** mount the old OpenLayers map or its
`Filters & Data` sidebar. The normal KYL dashboard at `/kyl_dashboard` is a
separate implementation and remains unaffected.

## Who owns what

This boundary prevents the most common maintenance mistakes.

| Concern | GeoLibre owns | KYL owns |
|---|---|---|
| Application shell inside the iframe | GIS panels, map canvas, layer tree, tools, export UI | Host page, CoRE Stack navbar, progress/errors, iframe sizing |
| Project lifecycle | Parse, normalize, hold, edit, and render a GeoLibre project | Generate a fresh tehsil project and send structural/data updates |
| Map engine | MapLibre rendering, camera interaction, raster tile lifecycle | Initial tehsil camera, basemap choice, one initial `fitBounds` |
| Data | Understand GeoJSON and raster sources | Catalog, GeoServer workspaces/layer names, WFS/WMS/WCS URLs |
| Presentation | Render supplied vector styles and server-styled raster images | Group/order, names, default visibility/opacity, style profiles |
| Legends | Print legend support and a native Components legend facility | Runtime on-map legend overlay and every displayed class/colour label |
| Loading | Request WMS tiles when a raster becomes visible | Initial WFS, lazy vector fetches, vector cache, avoiding project reloads for visibility-only changes |
| Compatibility | GeoLibre app and project schema | Allowed app versions, trusted origin, handshake, timeout and error UI |

GeoLibre does not discover CoRE Stack layers or infer our GeoServer naming
scheme. Conversely, KYL does not reimplement a second map, layer panel, opacity
control, style editor, export panel, or GIS toolbox over the iframe.

## Runtime behavior

### Initial load

1. `LandscapeExplorer.jsx` reads the location from the URL first, then from the
   Recoil location store.
2. `buildGeoLibreProject()` normalizes district and tehsil names for GeoServer.
3. It fetches the panchayat-boundary WFS FeatureCollection. Administrative
   Boundaries and Socio-Economic Profile share this exact source, so a local
   request cache turns the two logical layers into one network request.
4. The Socio-Economic geometry supplies the authoritative tehsil bounds.
5. KYL creates all 45 logical catalog entries. Only the two Demographic layers
   contain data and start visible; every other vector is an empty hidden
   placeholder and every raster is hidden.
6. The iframe reports `geolibre:ready`. KYL validates the application version,
   sends the project, and asks GeoLibre to fit the tehsil bounds once.
7. The KYL legend overlay appears with the visible Demographic legends.

An initial project cannot be built without the Socio-Economic WFS data and a
usable geographic extent. That failure is intentional: opening a generic India
view would hide a broken scope/data contract.

### First toggle of a vector layer

```mermaid
sequenceDiagram
    actor User
    participant GeoLibre
    participant KYL
    participant GeoServer
    User->>GeoLibre: Turn on hidden vector
    GeoLibre-->>KYL: geolibre:state with visible=true
    KYL->>GeoServer: WFS GetFeature
    GeoServer-->>KYL: GeoJSON FeatureCollection
    KYL->>KYL: Cache hydrated layer by id and scope
    KYL-->>GeoLibre: Reload project with real vector data
    User->>GeoLibre: Turn layer off and on
    GeoLibre-->>KYL: Updated state
    Note over KYL,GeoServer: Cached data is reused; no second WFS request
```

Lazy vector loads are serialized. Scope and state sequence checks prevent a
slow request from a previous tehsil from replacing the current project. A
failed vector can be retried by toggling it off and on.

### Raster toggle and download

A raster entry contains two different URLs for two different jobs:

- `source.tiles` is a WMS `GetMap` template. It returns 256 x 256 transparent,
  styled PNG tiles in EPSG:3857 for display.
- `source.url` and `sourcePath` are a WCS 2.0.1 `GetCoverage` URL. It returns the
  complete GeoTIFF with LZW compression for GeoLibre's GeoTIFF export.

Hidden raster layers do not request tiles. Turning one on causes MapLibre to
request the tiles required by the current camera. Turning the same layer off
and on keeps the live raster source, while normal browser/MapLibre caches can
reuse tiles already fetched for the same URL and bounding boxes.

KYL deliberately does not resend a full project for visibility- or
opacity-only state changes. A full replacement would recreate GeoLibre's native
raster sources and make already loaded tiles request again. The load signature
in `GeoLibreFrame.jsx` therefore includes structure, source, data, and style,
but excludes `visible` and `opacity`.

Network tools may still show legitimate new raster requests when the user
pans/zooms, the browser cache is cold or disabled, a tile expired, or a
different style is enabled. Compare the complete WMS URL, especially `LAYERS`,
`STYLES`, and `BBOX`, before treating two requests as redundant.

### The LULC data-sharing rule

The three LULC levels are three logical presentations of one physical Level 3
coverage per year:

```text
Coverage: LULC_<year>_<district>_<tehsil>_level_3
Workspace: LULC_level_3

Level 1 presentation -> lulc_level_1_style
Level 2 presentation -> lulc_level_2_style
Level 3 presentation -> lulc_level_3_style
```

There are eight annual coverages and 24 logical catalog entries, not 24
physical rasters. All three levels for a year point to the same WCS download.
There is no Level 1 or Level 2 coverage request.

The visible WMS images are nevertheless style-specific. Enabling Level 2 after
Level 1 can require new WMS requests because the server must render different
PNG pixels for the same source cells. Reusing one raw download with zero
cross-style requests would require publishing an immutable COG and reproducing
the classifications client-side. That is a different architecture, not a
cache fix.

LULC uses GeoServer's global `/wms` endpoint because its named styles are
cross-workspace. Other rasters use their workspace-scoped WMS endpoints.

## Layer catalog

`src/config/geolibreLayers.js` is the single inventory. Do not create a second
registry in a page or component.

Current inventory:

| Kind | Logical entries | Physical source behavior |
|---|---:|---|
| WFS vectors | 13 | Two defaults share one request; 11 are loaded on first toggle |
| LULC rasters | 24 | Eight Level 3 yearly coverages, each exposed through three named styles |
| Other rasters | 8 | One WMS/WCS source contract per entry |
| **Total** | **45** | 13 vector entries and 32 raster entries |

Current groups, in the order shown from top to bottom in GeoLibre:

1. Demographic
2. Hydrology
3. LULC - Level 3 by year
4. LULC - Level 2 by year
5. LULC - Level 1 by year
6. Land
7. Agriculture
8. Restoration
9. NREGA

Only Demographic starts expanded. LULC years appear newest first. There is no
Climate group; the earlier blank Climate section was intentionally removed.

Each catalog entry defines the following contract:

| Field | Meaning |
|---|---|
| `id` | Stable KYL identifier. Generated GeoLibre id is `corestack-<id>`. |
| `label` | Human-readable name in the GeoLibre layer panel. |
| `domain` | CoRE Stack subject classification retained in metadata. |
| `loadGroup` | GeoLibre group id and display location. |
| `sourceType` | `wfs` for client-styled vectors or `wms` for server-styled rasters. |
| `workspace` | GeoServer workspace. |
| `layerName(scope)` | Function producing the deployed layer/coverage name. |
| `geometryType` | Vector geometry used for style and legend shape. |
| `styleProfile` | Key into KYL's vector `STYLE_PROFILES`. |
| `wmsStyle` | Published GeoServer style used to render a raster. |
| `qmlStyleUrl` | Provenance and QGIS-use reference; not loaded at runtime. |
| `defaultVisible` | Only for layers that must load and display at startup. |
| `useGlobalWms` | Use the global WMS endpoint for cross-workspace named styles. |
| `baseId` / `year` | Connect annual LULC entries to one level legend and year. |

District and tehsil values are converted to GeoServer names by removing
parentheses, replacing whitespace with underscores, collapsing duplicate
underscores, trimming underscores, and lowercasing. The state remains project
metadata and is not part of current GeoServer layer names.

## Generated project contract

`buildGeoLibreProject()` creates an in-memory `.geolibre.json`-compatible
object. Nothing is generated or committed to disk.

| Project field | KYL value |
|---|---|
| `version` | GeoLibre project schema `0.2.0` |
| `name` | `<tehsil>, <district>: CoRE Stack landscape` |
| `mapView` | Center, zoom and bbox calculated from tehsil geometry |
| `basemapStyleUrl` | Inline Google Satellite Hybrid style or env override |
| `layers` | Ordered 45-entry layer array; GeoLibre stores bottom layer first |
| `layerGroups` | KYL groups, display names, collapsed state and order |
| `styles` | Per-layer vector or raster style object |
| `preferences` | Globe projection, Earth ellipsoid, metric scale, zoom/pitch bounds, Nominatim |
| `plugins` | Normal tool defaults plus a deliberately hidden native map legend |
| `legend` | Full layer order for GeoLibre Print Layout |
| `metadata` | Scope, bounds, license, provenance, app/schema versions, loading failures |

The layer array is reversed after constructing a human top-first group order
because MapLibre/GeoLibre render the first array entry at the bottom.

## Legends and styles

### Why KYL owns the visible on-map legend

Every generated layer carries a legend at:

```text
layer.metadata.corestack.legend
```

GeoLibre sends state snapshots when visibility changes. KYL derives the active
legend list from the visible layers and renders `GeoLibreLegend` outside the
iframe. This lets a legend change immediately without resending the whole
project and recreating raster sources.

The overlay:

- appears on the first successful map load;
- includes only currently visible layers;
- opens and selects a newly enabled layer automatically;
- lets the user switch between visible-layer legends;
- removes a legend when its layer becomes hidden;
- deduplicates annual variants by `baseId`, while Level 1, 2 and 3 remain
  separate and therefore show their own palettes.

GeoLibre's native Components map legend is configured with `visible: false` on
purpose. Do not turn it on without redesigning the no-project-reload behavior.
GeoLibre's separate Print Layout legend remains configured through the top-level
`project.legend` field.

### Vector styling

Vector QML symbology is manually represented by `STYLE_PROFILES` in
`geolibreProject.js`. Profiles use MapLibre-compatible categorized or expression
styles. `LEGEND_PROFILES` contains the human labels, colours, and shapes shown
by KYL.

Changing only `qmlStyleUrl` does not change the map or legend. The QML URL is a
reference for provenance and QGIS users; this React application does not parse
QML at runtime.

When a vector presentation changes, update together:

1. the matching `STYLE_PROFILES` entry;
2. the matching `LEGEND_PROFILES` entry;
3. the catalog's `qmlStyleUrl` if the canonical QML moved;
4. focused style and legend tests.

Check exact source attribute names and value types before writing an expression.
A correct palette applied to the wrong property silently produces an incorrect
map.

### Raster styling

Raster pixels are styled by GeoServer, not by the React style profile. The
catalog's `wmsStyle` becomes the WMS `STYLES` parameter. KYL's raster legend is
a synchronized hand-authored description of that published style.

When a raster presentation changes:

1. publish/update the named GeoServer style;
2. update `wmsStyle` if its published name changed;
3. update the corresponding `LEGEND_PROFILES` palette;
4. update `qmlStyleUrl` if applicable;
5. inspect the live WMS image and the KYL legend side by side.

## How to make common changes

### Add a vector layer

1. Confirm a browser-reachable GeoServer WFS endpoint returns a valid GeoJSON
   `FeatureCollection` in EPSG:4326 for a real tehsil.
2. Add one entry to `LAYERS` in `src/config/geolibreLayers.js` with a unique
   `id`, correct group, workspace, `layerName`, geometry type, style profile,
   and QML reference.
3. Add or reuse a `STYLE_PROFILES` entry in `geolibreProject.js`.
4. Add or reuse the matching `LEGEND_PROFILES` entry.
5. Leave `defaultVisible` absent unless the layer is genuinely required at
   startup. Normal vectors must remain empty and hidden until first toggle.
6. Add catalog, project-generation, hydration, style, and legend assertions.
7. Test first toggle, off/on reuse, failure/retry, and a scope change.

Example catalog shape:

```js
{
  id: "soil_units",
  label: "Soil Units",
  domain: "Land",
  loadGroup: "land",
  sourceType: "wfs",
  workspace: "soil",
  geometryType: "polygon",
  layerName: ({ district, tehsil }) => `soil_${district}_${tehsil}`,
  styleProfile: "soil_units",
  qmlStyleUrl: qmlStyle("Land/Soil-Units.qml"),
}
```

If two logical vector presentations share the exact WFS URL, initial request
deduplication works only inside one project build. For lazy layers, add explicit
source-level sharing only after testing that replacing one presentation does
not overwrite another layer's visibility or style.

### Add a raster layer

1. Confirm the coverage exists and that its WMS and WCS endpoints are available
   to the browser with CORS enabled.
2. Publish the required style in GeoServer and verify a direct WMS `GetMap`.
3. Add a `sourceType: "wms"` catalog entry with workspace, scoped layer name,
   named WMS style, group, and QML reference.
4. Add the palette to `LEGEND_PROFILES`.
5. Check hidden startup, first-toggle display, visible legend, and full GeoTIFF
   export.

Example:

```js
{
  id: "soil_moisture",
  label: "Soil Moisture",
  domain: "Agriculture",
  loadGroup: "agriculture",
  sourceType: "wms",
  workspace: "soil_moisture",
  layerName: ({ district, tehsil }) =>
    `${district}_${tehsil}_soil_moisture`,
  wmsStyle: "soil_moisture:soil_moisture_style",
  qmlStyleUrl: qmlStyle("Agriculture/Soil-Moisture.qml"),
}
```

`buildRasterLayer()` automatically constructs the WMS display source and WCS
download URL from this entry. Do not add a second download registry.

### Add another LULC year

Add the year once to `GEOLIBRE_LULC_YEARS`. The `flatMap` creates Level 1,
Level 2, and Level 3 presentations over that year's Level 3 coverage. Confirm
that GeoServer follows the existing `LULC_<year>_..._level_3` naming rule.

### Add or change an LULC presentation level

Change `LULC_LEVELS`, not the list of physical raster sources. A level needs a
stable `id`, label, domain, named GeoServer style, and legend profile keyed by
that base id. Keep `workspace: LULC_SOURCE_WORKSPACE` and the Level 3
`layerName()` contract unless the physical data architecture really changes.

### Add, remove, or reorder a group

1. Change `GROUPS_TOP_FIRST` in `geolibreProject.js`.
2. Point catalog entries to the exact group id with `loadGroup`.
3. Remember that the builder reverses this order for the internal layers array.
4. Assert the visible top-first order in tests.

Removing a section requires removing both the group and any catalog references.
Do not leave an empty group, as happened with the obsolete Climate section.

### Change layer order, name, visibility, or opacity

- Name: catalog `label`.
- Group: catalog `loadGroup` plus `GROUPS_TOP_FIRST`.
- Order within a normal group: catalog order.
- LULC year order: `GEOLIBRE_LULC_YEARS`; the group display helper reverses it
  so the newest year appears first.
- Initial visibility: catalog `defaultVisible`.
- Initial vector opacity: currently `0.8` for default layers and `1` otherwise,
  in `buildVectorLayer()`.
- Raster opacity: `buildRasterLayer()`.
- Group expansion: `collapsed` in `GROUPS_TOP_FIRST`.

Default visibility has a network cost. Making another vector visible also makes
it part of startup and requires the initial builder to load it correctly.

### Change the basemap or camera

Set a deployed MapLibre style URL without editing code:

```dotenv
REACT_APP_GEOLIBRE_BASEMAP_STYLE_URL=https://maps.example.org/style.json
```

Without that variable, KYL supplies an inline Google Satellite Hybrid style
with attribution. Camera fitting is controlled by `mapViewFromBounds()` and the
one-time `fitBounds` command in `GeoLibreFrame.jsx`. Change both only with tests
for small and large tehsils and confirm lazy hydration never refits the map.

### Change how much GeoLibre interface is shown

`resolveGeoLibreViewer()` currently adds `embed=1` and `welcome=0`. GeoLibre
also supports embed-oriented URL choices such as `layout=viewer`,
`layout=compact`, `toolbar=icons`, `panels=none`, `maponly`, and `theme=dark`.
Add them through the configured viewer URL only after interactive testing.

`maponly` removes GeoLibre's layer controls. It is not a cosmetic change for
this application because KYL intentionally has no replacement layer panel.

### Change the visible legend layout

Edit `GeoLibreLegend.jsx` for position, dimensions, collapsed behavior, or
selector UI. Edit `activeGeoLibreLegends()` and `layerLegend()` for selection,
deduplication, or content rules. Keep the legend outside the iframe unless the
project-reload and raster-source consequences have been deliberately solved.

## Stock GeoLibre compared with this integration

Opening GeoLibre by itself gives the user a general GIS application. It can
create/open a project, add supported data sources, style and reorder layers,
use tools/plugins, save/share a project, compose print layouts, and create other
GeoLibre content. Current GeoLibre supports source types beyond this
integration, including GeoJSON, XYZ, WMS, raster, vector tiles, PMTiles, COG,
FlatGeobuf, Zarr, GeoParquet, ArcGIS, 3D Tiles, lidar, and others.

KYL intentionally starts from a more opinionated project:

| Stock GeoLibre behavior | KYL configuration |
|---|---|
| Opens its own welcome/project workflow or blank/general workspace | Opens a generated project for one selected tehsil |
| User adds and names sources | Ships a fixed 45-entry CoRE Stack catalog |
| Uses the chosen/default project camera | Calculates exact tehsil bounds and fits once |
| Uses the project's/default basemap | Supplies Google Satellite Hybrid unless overridden |
| User organizes layers | Supplies KYL subject groups and year ordering |
| User controls initial visibility | Starts only the two Demographic views at opacity 0.8 |
| Loads sources according to the project and map | Adds KYL-specific fetch-on-first-toggle WFS hydration and caching |
| Can derive/render its native legend from project symbology | KYL hides the native map legend and renders a synchronized external overlay |
| Has no CoRE Stack naming knowledge | Generates deployed workspace/layer names from the selected scope |
| Has no CoRE Stack license/QML convention | Adds CC BY 4.0, style provenance, source and loading metadata |
| May use its current typed embed protocol when a host is allowlisted | Uses the working legacy `geolibre:*` project bridge with strict origin checks |

These are project and host customizations; the GeoLibre source code is not
vendored or patched in this repository.

## Files and impact on KYL

### GeoLibre-specific implementation

| File | Responsibility |
|---|---|
| `src/config/geolibreLayers.js` | Complete CoRE Stack catalog and naming/style/source metadata |
| `src/config/geolibre.config.js` | Viewer URL, app compatibility, project schema, embed URL resolution |
| `src/components/geolibre/geolibreProject.js` | WFS/WMS/WCS construction, styles, legends, groups, bounds, project generation and vector hydration |
| `src/components/geolibre/GeoLibreFrame.jsx` | Trusted iframe, bridge, version check, load deduplication, one-time fit, progress/errors/log |
| `src/components/geolibre/GeoLibreLegend.jsx` | KYL-owned active-layer legend overlay |
| `src/pages/LandscapeExplorer.jsx` | Route orchestration, location resolution, lazy queue/cache and legend state |
| `src/components/geolibre/*.test.*` | Project, bridge, cache and legend behavioral contracts |
| `src/config/geolibre.config.test.js` | URL and version compatibility contracts |

### Non-GeoLibre-only files touched by the integration

| File | Why it is involved |
|---|---|
| `src/App.jsx` | Routes `/download_layers` to `LandscapeExplorer`. This is the critical protection against restoring the legacy page. |
| `src/App.test.jsx` | Locks the route to the GeoLibre implementation and rejects legacy map/sidebar imports. |
| `src/pages/LE_homepage.jsx` | Navigates the selected KYL location to Download Layers. |
| `src/components/landing_navbar.jsx` | Shows the CoRE Stack navbar and QGIS Documentation link on this route. |
| `src/store/locationStore.jsx` | Supplies in-session state, district and tehsil when query parameters are absent. |
| `src/services/analytics.*` | Records page and workspace-open events. |
| `.env.example` | Documents GeoServer and optional GeoLibre deployment values. |

Do not modify `src/components/landscape-explorer/map/Map.jsx` or its old
sidebar to change `/download_layers`; that code belongs to the legacy/KYL map
path and is not mounted by this route.

## Viewer bridge and security

The iframe and KYL are different origins. `GeoLibreFrame` accepts messages only
when both conditions hold:

1. `event.origin` exactly matches the configured GeoLibre origin; and
2. `event.source` is the current iframe's `contentWindow`.

The current bridge handles:

| Message | Direction | Purpose |
|---|---|---|
| `geolibre:ready` | GeoLibre to KYL | Report readiness and application version |
| `geolibre:load-project` | KYL to GeoLibre | Load the generated project |
| `geolibre:state` | GeoLibre to KYL | Report visibility and other live project state |
| `geolibre:command` / `fitBounds` | KYL to GeoLibre | Fit the initial tehsil exactly once |
| `geolibre:error` | GeoLibre to KYL | Report viewer/project failures |

GeoLibre now publishes `@geolibre/embed`, a typed command API. It is disabled
unless the GeoLibre deployment explicitly allowlists the host origin. The
public `web.geolibre.app` deployment does not allow arbitrary hosts, so KYL
continues to use the established project bridge. Migrating requires a
self-hosted/allowlisted viewer and full handshake, state, layer-toggle, export,
and origin-security tests; replacing message names alone is not sufficient.

Do not put credentials, tokens, or private source URLs in the generated
project. `REACT_APP_*` variables are compiled into browser JavaScript and are
not secrets. The deployment's CSP/frame policy must allow the GeoLibre origin,
and browser CORS/policy must permit GeoServer plus the configured basemap.

## Versioning

There are two independent versions:

- **GeoLibre application version**, for example `2.5.0`, is the iframe app.
- **GeoLibre project schema version**, currently `0.2.0`, is the JSON project
  contract.

An application upgrade does not automatically require a schema change.

Default configuration:

```js
export const GEOLIBRE_CONFIG = Object.freeze({
  version: process.env.REACT_APP_GEOLIBRE_VERSION || "2.2.0",
  minimumCompatibleVersion: "2.0.0",
  supportedMajorVersion: 2,
  // ...
});
```

The default `https://web.geolibre.app/` URL is rolling and unversioned. The
fallback value documents the preferred/tested release and fills a `{version}`
URL template; it cannot select which release the public server returns. KYL
accepts compatible version 2 releases at or above 2.0.0 and rejects another
major version. A badge over the map reports the release that actually completed
the handshake and whether the URL is rolling or pinned.

For an exactly pinned self-hosted deployment:

```dotenv
REACT_APP_GEOLIBRE_VERSION=2.5.0
REACT_APP_GEOLIBRE_URL_TEMPLATE=https://geolibre.core-stack.org/{version}/
REACT_APP_GEOLIBRE_STRICT_VERSION=true
```

Before changing compatibility, check GeoLibre's release notes and source types,
load a real generated project, and rerun the full manual checklist below.

## Environment and deployment

Required for KYL and Download Layers:

```dotenv
REACT_APP_API_URL=https://geoserver.core-stack.org/api/v1
REACT_APP_GEOSERVER_URL=https://geoserver.core-stack.org:8443/geoserver/
```

Optional:

```dotenv
REACT_APP_GEOLIBRE_VERSION=2.2.0
REACT_APP_GEOLIBRE_URL=https://web.geolibre.app/
REACT_APP_GEOLIBRE_STRICT_VERSION=false
REACT_APP_GEOLIBRE_BASEMAP_STYLE_URL=https://maps.example.org/style.json
```

No backend patch, generated project, vendored GeoLibre bundle, or `.local/`
prototype is required. Production must provide the variables before
`npm run build`. Verify:

- GeoServer WFS, WMS, and WCS are browser reachable with CORS enabled;
- the site's framing/CSP policy allows the configured GeoLibre origin;
- the browser can reach the configured basemap tile/style hosts;
- a pinned deployment allowlists KYL if the modern embed API is introduced.

## Tests and release checklist

Run the focused contract tests:

```bash
CI=true npm test -- --watchAll=false --runInBand \
  src/App.test.jsx \
  src/config/geolibre.config.test.js \
  src/components/geolibre/geolibreProject.test.js \
  src/components/geolibre/GeoLibreFrame.test.jsx \
  src/components/geolibre/GeoLibreLegend.test.jsx
```

Then build:

```bash
npm run build
```

For the live check:

```bash
BROWSER=none npm start
```

The WSL development server can take a few minutes to compile. Test with browser
DevTools open to the Network tab:

1. `/download_layers` shows GeoLibre, not the old `Filters & Data` sidebar.
2. A direct query-string URL survives refresh and retains the intended scope.
3. The version badge reports a compatible GeoLibre 2.x release.
4. The map uses the expected basemap and fits the whole tehsil once.
5. Demographic starts expanded with Administrative Boundaries followed by
   Socio-Economic Profile; both are visible at opacity 0.8.
6. The legend is visible on initial load and contains those active layers.
7. No Climate group is present.
8. A hidden vector makes one WFS request on first toggle and none after off/on.
9. A failed lazy vector reports a warning and retries after off/on.
10. A raster makes WMS tile requests only when visible and remains resident
    across ordinary off/on toggles.
11. Level 1, Level 2 and Level 3 for one year all use the Level 3 coverage name,
    each uses its own `STYLES` value, and each selects the correct legend.
12. A raster export reaches the matching WCS URL and returns the full GeoTIFF.
13. Panning or lazy vector hydration does not refit the map.
14. Changing the route to another tehsil clears scope-specific caches and fits
    the new scope.
15. QGIS Documentation, licensing, retry, and technical-log paths work.
16. `/kyl_dashboard` still loads normally.

## Troubleshooting

### The old Download Layers page appears

Check `src/App.jsx`. The route must be exactly:

```jsx
<Route path="/download_layers" element={<LandscapeExplorer />} />
```

Run `src/App.test.jsx`. Do not diagnose the GeoLibre components until this
route contract is correct.

### The page says "Select a tehsil first"

Use the home-page selection flow or supply all three query parameters. Check
their exact spelling and URL encoding.

### GeoLibre never becomes ready

Check the iframe URL, network access, CSP/frame restrictions, browser console,
and the 90-second handshake timeout. Download the bounded technical log from
the error card; it contains at most the latest 40 lifecycle events.

### A WFS layer fails or is empty

Open the generated WFS URL directly. Confirm the workspace, normalized
district/tehsil name, `typeName`, JSON response, `FeatureCollection` shape, CORS,
and actual feature count. The initial Demographic source must also have a usable
bbox or coordinates.

### A raster is blank

Inspect the WMS request. Verify workspace, layer name, `STYLES`, global versus
workspace endpoint, EPSG:3857 support, bounds, PNG response, and CORS. A working
WCS download does not prove that the WMS style is published correctly.

### A raster appears to request again

First determine whether it is truly the same request. Different `STYLES` means
a different LULC presentation; different `BBOX` means a different tile; a full
project reload recreates the source. Confirm no visibility-only state caused a
new `geolibre:load-project` message and check the load-signature tests.

### A legend is missing or wrong

Check, in order:

1. the layer is visible in the latest `geolibre:state` project;
2. `metadata.corestack.legend.items` exists for that layer;
3. the correct `LEGEND_PROFILES` key is selected;
4. LULC `baseId` separates levels while deduplicating years;
5. `GeoLibreLegend` is mounted after `viewerState === "loaded"`;
6. the named server style and hand-authored palette still agree.

Do not fix this by enabling GeoLibre's native legend alone; that bypasses the
state and raster-retention design.

### The version is rejected

Compare the badge/logged actual version with `minimumCompatibleVersion`,
`supportedMajorVersion`, and strict-version configuration. Validate the new
release before widening the compatibility range.

### WebGL fails in WSL or a virtualized browser

Try a normal hardware-accelerated host browser against the WSL dev server.
Browser GPU blocklists are environment failures, not evidence that the generated
project or GeoServer URLs are invalid.

## Invariants for maintainers and AI agents

Before editing, read this file plus `geolibreLayers.js`,
`geolibreProject.js`, `GeoLibreFrame.jsx`, `GeoLibreLegend.jsx`, and
`LandscapeExplorer.jsx`. Preserve these invariants unless the requested change
explicitly replaces the architecture:

- `/download_layers` mounts `LandscapeExplorer`, never the legacy map/sidebar.
- The catalog has one authoritative registry.
- There is no empty Climate group.
- Only one distinct WFS request is made for the two initial Demographic views.
- Hidden vectors carry placeholders and hydrate on first visibility.
- Hydrated vectors are reused within their tehsil scope.
- Visibility/opacity alone never triggers a full project resend.
- A camera fit happens once per scope, not after layer changes.
- LULC Level 1/2/3 share each year's Level 3 coverage and differ by WMS style.
- WMS is display; WCS is complete raster download.
- Every visible style has a matching, automatically available KYL legend.
- Native GeoLibre map legend stays hidden while the external overlay is used.
- QML URLs remain provenance; vector and legend code must be changed explicitly.
- Only exact trusted iframe origin/window messages are accepted.
- `/kyl_dashboard` remains independent.

Change the smallest responsible layer: catalog for inventory/naming, project
builder for data/presentation contracts, frame for bridge behavior, legend for
overlay behavior, and route page for orchestration/cache behavior. Add a
regression test for any bug that crossed one of these boundaries.

## Known limitations and deliberate trade-offs

- The public GeoLibre host is rolling; production reproducibility is stronger
  with a tested self-hosted versioned URL.
- Lazy WFS vectors are eventually embedded as GeoJSON in the project, which is
  appropriate for current tehsil sizes but not an unlimited-data strategy.
- WCS returns the complete published coverage; it need not be byte-identical to
  GeoServer's private backing file.
- Raster legends are synchronized manually with server styles; GeoServer does
  not currently generate the KYL overlay palette at runtime.
- Vector QML is not imported dynamically.
- A new WMS style requires its own rendered tile requests even when it presents
  the same physical LULC coverage.
- The current bridge predates the allowlisted typed GeoLibre embed API.

Possible future improvements include direct immutable COG URLs, self-hosted
versioned GeoLibre releases, tested migration to `@geolibre/embed`, generated
legend metadata from the style source of truth, and preconfigured GeoLibre
stories, processing models, dashboards, bookmarks, or print layouts.

## Upstream references

- [GeoLibre repository](https://github.com/opengeos/GeoLibre)
- [GeoLibre 2.5.0 release](https://github.com/opengeos/GeoLibre/releases/tag/v2.5.0)
- [GeoLibre user guide](https://geolibre.app/user-guide/)
- [GeoLibre embedding and sharing guide](https://geolibre.app/user-guide/embedding/)
- [`@geolibre/embed` package documentation](https://www.npmjs.com/package/@geolibre/embed)
- [CoRE Stack QGIS Styles](https://github.com/core-stack-org/QGIS-Styles)

When upgrading, treat GeoLibre source/types and a live tested viewer as the
authoritative runtime evidence. Documentation can lag code; at the time of this
review, GeoLibre source declares project schema `0.2.0`.
