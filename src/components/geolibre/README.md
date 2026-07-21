# KYL GeoLibre integration

The **/download_layers** route is a page-integrated
[GeoLibre](https://github.com/opengeos/GeoLibre) workspace. Users select a
state, district, tehsil, and layers in KYL while the matching live CoRE Stack
project opens in the GeoLibre iframe beside the selector. The same selection can
be saved as a **.geolibre.json** project.

The integration targets
[GeoLibre application v2.1.0](https://github.com/opengeos/GeoLibre/releases/tag/v2.1.0).
That application release still declares project-file schema **0.2.0**, so the
application version and project version are intentionally different.

Runtime code lives under **src/**. Files under **.local/geolibre/** are
historical prototypes and are not application dependencies.

## User flow

1. The homepage **Download Layers** button routes to **/download_layers**.
2. If the homepage already has a tehsil, the default project is prepared and
   opened automatically. Direct visits can select the location on this page.
3. KYL reads the panchayat-boundary WFS, calculates the tehsil extent, and sets
   GeoLibre's initial center, zoom, and bbox.
4. The initial project contains the latest Level 3 LULC layer and URL-backed
   vector layers, including MWS. Optional raster layers are absent.
5. Only **Socioeconomic Profile** starts at full layer opacity. Every other
   loaded layer starts at 0, ready for the user to reveal in GeoLibre.
6. Layer changes are staged in KYL. **Update GeoLibre** sends a new project,
   which is when newly selected optional layers begin loading.
7. **Download GeoLibre JSON** saves the staged selection without embedding
   feature arrays.

The existing **QGIS Documentation** link remains in the download-page navbar.

## Layout and layer selection

The left pane contains location controls, a compact LULC selector, searchable
domain groups, and project actions. The right pane is the hosted GeoLibre app.

LULC combinations are not rendered as one long list. The user chooses Level 1,
2, or 3, then selects any combination of years inside that level. Each selected
level/year becomes a separate project layer and all LULC layers are grouped
together in GeoLibre.

~~~mermaid
flowchart LR
    Home[Homepage Download Layers] --> Page[/download_layers]
    Page --> Selector[KYL location and layer selector]
    Selector --> Bounds[Tehsil WFS extent]
    Selector --> Catalog[geolibreLayers.js]
    Bounds --> Builder[geolibreProject.js]
    Catalog --> Builder
    Builder --> Project[Project schema 0.2.0]
    Project --> Bridge[GeoLibre v2.1 embed bridge]
    Bridge --> Viewer[GeoLibre iframe]
    Viewer --> GeoServer[Live WFS and WMS sources]
    Project --> JSON[.geolibre.json]
~~~

## Files

| File | Responsibility |
|---|---|
| **../../config/geolibreLayers.js** | Layer catalog, domains, workspaces, source names, LULC years, QML references, and default preload |
| **geolibreProject.js** | Extent calculation, camera calculation, source URLs, QML-derived styles, opacity rules, project assembly, and JSON download |
| **GeoLibreLayerPanel.jsx** | Location selection, compact multi-year LULC UI, domain accordions, search, and staged actions |
| **GeoLibreWorkspace.jsx** | Trusted-origin v2.1 iframe bridge, project updates, connection state, and version reporting |
| **geolibreProject.test.js** | Extent, camera, source, LULC expansion, opacity, preload, and schema contracts |
| **../../pages/LandscapeExplorer.jsx** | **/download_layers** orchestration and state |

## Loading contract

GeoLibre v2.1 restores every URL-backed vector layer present in a project, even
when its visibility or opacity is zero. Lazy loading therefore happens at the
project boundary:

- default vector layers and latest Level 3 LULC are present immediately;
- unchecked optional layers are not present and cannot be requested;
- checking layers only stages the selection;
- **Update GeoLibre** rebuilds and sends the selected project.

The v2.1 iframe bridge accepts complete project loads. It does not expose an
individual add-layer command.

## View extent

**fetchTehsilBounds** reads the selected tehsil's panchayat-boundary WFS in
EPSG:4326. **geoJsonBounds** calculates [west, south, east, north], and
**mapViewFromBounds** derives a padded center and zoom for the workspace size.
The generated project preserves the bbox in **mapView.bbox**.

GeoLibre v2.1 applies an imported project view with jumpTo; the official embed
bridge does not expose flyTo or fitBounds. The integration therefore opens
already framed to the exact tehsil extent. A true animated fly-in would require
a future GeoLibre bridge command rather than a KYL-only project change.

## Styling and opacity

GeoLibre does not automatically interpret a remote QML URL in a project:

- vector QML rules are represented in GeoLibre style profiles and restore
  metadata;
- raster QML styling is provided by the named GeoServer WMS style;
- each layer retains its original QML URL in
  **metadata.corestack.qmlStyleUrl**;
- raster metadata also includes a WCS GetCoverage URL.

Layer-level opacity is separate from style opacity. The generated layer object
sets **opacity: 1** only for catalog ID **demographics**; all others receive
**opacity: 0**.

## Project contract

**buildGeoLibreProject** produces:

- GeoLibre project schema 0.2.0, targeting application v2.1.0;
- normalized GeoServer names such as cachar_lakhipur;
- one project layer per selected non-LULC layer;
- one project layer per selected LULC level/year;
- live WFS and tiled WMS references, with no embedded features;
- domain groups plus one consolidated lulc group;
- tehsil scope, selection, style, application-version, and camera metadata.

Example:

~~~js
const project = buildGeoLibreProject({
  state: "Assam",
  district: "Cachar",
  tehsil: "Lakhipur",
  selectedLayerIds: ["demographics", "drainage"],
  lulcSelections: {
    lulc_level_1: ["23_24", "24_25"],
    lulc_level_2: [],
    lulc_level_3: ["24_25"],
  },
  mapView: mapViewFromBounds([92.8, 24.6, 93.4, 25.1]),
});
~~~

## Configuration

Create React App build-time overrides:

~~~dotenv
REACT_APP_GEOLIBRE_URL=https://web.geolibre.app/
REACT_APP_GEOSERVER_URL=https://geoserver.core-stack.org:8443/geoserver/
~~~

The viewer URL must support GeoLibre's embed mode and allow iframe embedding.
**GeoLibreWorkspace** accepts messages only from the configured viewer origin
and its own iframe window. It listens for geolibre:ready, geolibre:state, and
geolibre:error, and sends geolibre:load-project followed by
geolibre:request-state for a load acknowledgement.

## Adding or changing a layer

1. Add or edit the catalog item in **../../config/geolibreLayers.js**.
2. Set sourceType, workspace, and its layerName function.
3. For vectors, set geometryType, styleProfile, and qmlStyleUrl.
4. For rasters, set the published wmsStyle and qmlStyleUrl.
5. Update the matching style profile when vector QML symbology changes.
6. Extend the project tests for a new source or style contract.
7. Verify the generated URL against a representative tehsil.

## Validation

~~~bash
CI=true npm test -- --watchAll=false --runInBand \
  src/components/geolibre/geolibreProject.test.js

npx eslint \
  src/config/geolibreLayers.js \
  src/components/geolibre/GeoLibreLayerPanel.jsx \
  src/components/geolibre/GeoLibreWorkspace.jsx \
  src/components/geolibre/geolibreProject.js \
  src/components/geolibre/geolibreProject.test.js \
  src/pages/LandscapeExplorer.jsx

npm run build
~~~

Local demo:

~~~bash
HOST=0.0.0.0 PORT=3000 BROWSER=none npm start
~~~

Open <http://localhost:3000>, choose a location, and click **Download Layers**.
Confirm that the map opens at the tehsil, only Socioeconomic Profile is visible,
optional raster requests appear only after **Update GeoLibre**, multi-year LULC
layers are separate, and the downloaded file ends in **.geolibre.json**.
