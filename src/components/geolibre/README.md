# KYL GeoLibre integration

`/download_layers` is a thin host for GeoLibre. KYL keeps its existing header
(including **QGIS Documentation**) and gives the rest of the page to a trusted
GeoLibre iframe. There is no second KYL map, layer selector, or project panel.

The implementation targets
[GeoLibre v2.2.0](https://github.com/opengeos/GeoLibre/releases/tag/v2.2.0)
and uses its supported embed bridge and WFS project representation.

## Runtime flow

1. The KYL homepage carries the selected state, district, and tehsil to
   `/download_layers` as query parameters.
2. `geolibreProject.js` fetches the Socio-Economic WFS layer first and derives
   the complete tehsil bounding box from its GeoJSON.
3. It fetches MWS next, followed by the remaining vectors. Duplicate sources
   (Socio-Economic / Administrative Boundary and MWS / Hydrological Boundary)
   are fetched once and reused.
4. Vector layers are represented exactly as GeoLibre 2.2 WFS layers: an
   embedded `FeatureCollection`, a live `sourcePath`, and
   `metadata.sourceKind = "wfs-getfeature"`.
5. WMS layers are configured but hidden, so raster tiles are requested only
   when a user makes a layer visible in GeoLibre.
6. The iframe reports `geolibre:ready`; KYL verifies its application version
   and sends one `geolibre:load-project` message. It then uses GeoLibre 2.2's
   command bridge to fit the exact bounds against the iframe's real map size.

Only **Socio-Economic Profile** starts visible. Every other layer starts hidden
with opacity `1`, so turning it on in GeoLibre shows its intended styling rather
than an invisible zero-opacity layer.

## Native layer organization

GeoLibre's own layer panel is ordered top-first as:

1. Overview (Socio-Economic Profile, Administrative Boundaries)
2. Watersheds (MWS and related hydrological layers)
3. Other vector layers
4. LULC Level 3, Level 2, and Level 1 by year
5. Other raster layers

The non-overview groups are collapsed where appropriate. Each LULC group shows
2024-2025 first while retaining every available year back to 2017-2018.

The project camera is calculated from the Socio-Economic geometry using a
padded Web Mercator fit. `mapView.bbox` is also retained in project metadata,
and the iframe receives a `fitBounds` command after loading, so the initial map
contains the full tehsil rather than a generic India extent.

## Version configuration

The normal upgrade control is the `version` value in
`../../config/geolibre.config.js`:

```js
export const GEOLIBRE_CONFIG = Object.freeze({
  version: process.env.REACT_APP_GEOLIBRE_VERSION || "2.2.0",
  supportedMajorVersion: 2,
  // ...
});
```

For a compatible GeoLibre 2.x release, change that one fallback value, or set:

```dotenv
REACT_APP_GEOLIBRE_VERSION=2.3.0
```

The hosted `https://web.geolibre.app/` URL follows GeoLibre's current web
deployment; it is not an immutable versioned release asset. KYL therefore
checks the version reported by the iframe and refuses to send data on a
mismatch. For an exactly pinned self-hosted deployment, use a URL template:

```dotenv
REACT_APP_GEOLIBRE_URL_TEMPLATE=https://maps.example.org/geolibre/{version}/
```

`{version}` is replaced automatically. Set
`REACT_APP_GEOLIBRE_STRICT_VERSION=false` only for deliberate compatibility
testing of a newer GeoLibre 2.x viewer. A major-version update should update
the compatibility rules and project/bridge tests, not just the version value.

GeoLibre's application version (`2.2.0`) is separate from its project schema
version (`0.2.0`). Do not change the project format merely when upgrading the
application.

## Files

| File | Responsibility |
|---|---|
| `../../config/geolibre.config.js` | Viewer application version, URL resolution, strict handshake compatibility |
| `../../config/geolibreLayers.js` | GeoServer names, all LULC years, QML references, WMS styles, load groups |
| `geolibreProject.js` | Priority WFS fetching, v2.2 project construction, styles, WMS/WCS references, bbox camera |
| `GeoLibreFrame.jsx` | Iframe lifecycle, trusted-origin bridge, version check, loading and failure overlays |
| `../../pages/LandscapeExplorer.jsx` | Route-to-project orchestration; no duplicate map or layer UI |

The current project contains 45 entries: 13 vector entries (11 distinct WFS
requests), 24 LULC year/level rasters, and 8 other rasters.

## Styling contract

- Vector QML rules are translated into GeoLibre categorized or expression
  styles. The source QML URL remains in `metadata.corestack.qmlStyleUrl`.
- Raster QML styles are published as named GeoServer styles and rendered by
  WMS. Their original QML URLs are also retained.
- WCS GetCoverage URLs remain in raster metadata for data export workflows.

Changing only a QML URL does not alter rendered vector symbology; update the
matching style profile in `geolibreProject.js`. Raster appearance changes must
be published to the named GeoServer WMS style.

## Validation

Focused tests:

```bash
CI=true npm test -- --watchAll=false \
  src/config/geolibre.config.test.js \
  src/components/geolibre/geolibreProject.test.js
```

Build:

```bash
npm run build
```

Local demo:

```bash
HOST=0.0.0.0 PORT=3000 BROWSER=none npm start
```

Open `http://localhost:3000`, select a state, district, and tehsil, and click
**Download Layers**. The generated URL can be refreshed or shared on the same
KYL host because it contains the selected location.

For a release upgrade, verify all of the following before changing the default
version: the ready handshake reports the expected release, the project loads
without `geolibre:error`, Socio-Economic is the only visible layer, the full
tehsil fits, hidden vectors can be enabled, WMS tiles appear when enabled, and
GeoLibre can save/export the resulting project.
