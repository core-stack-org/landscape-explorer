# Data contracts

## Administrative indexes

Tehsil and village geometry are separate build artifacts.

### Tehsil PMTiles

- Web Mercator vector tiles
- source-layer default: `tehsils`
- stable feature id
- required properties: state code/name, district code/name, tehsil code/name
- national low-zoom coverage
- simplified by zoom, without changing administrative identity

### Village PMTiles

- Web Mercator vector tiles
- source-layer default: `villages`
- stable village id and parent tehsil id
- default minimum zoom: `9.5`
- geometry may be generalized independently of tehsil geometry

Both URLs and source-layer names are deployment configuration. A missing index
must produce a visible partial state, not a blank map or silent full download.

## Active locations

`apps/geolibre-desktop/src/core-geostack/data/active-locations.json` is migrated
from the proven KYL location hierarchy. It names state, district, and block/
tehsil ids. It is the curated active-location index, not a substitute for the
national geometry indexes.

## KYL layer catalogue

`layer-catalog.ts` is the typed source of truth for the migrated catalogue:

- 45 entries total
- 13 WFS vector entries
- 24 time-enabled LULC WMS entries
- 8 other WMS raster entries
- only Administrative Boundaries and Socio-Economic Profile selected initially
- hydrological boundaries, micro-watersheds, and fortnightly hydrological
  variables belong to Hydrology

Layer names are derived only after a district and tehsil are selected. WFS
vectors are fetched lazily and cached for the browser session. WMS rasters are
registered through GeoLibre's native layer API so they participate in layer
ordering, visibility, project persistence, and legends.

## Filter and pattern sources

The legacy-proven definitions are preserved without reinterpretation:

- `data/kyl-filters.json`
- `data/kyl-patterns.json`

They are migration inputs. The current first slice inventories them in the Focus
workspace; choice-level execution and bucketing must be ported with fixture
tests before being called equivalent to legacy KYL.

## Source and method ledger

| Source | Role | Current policy |
| --- | --- | --- |
| CoRE Stack GeoServer | Tehsil-scoped WFS/WMS layers | lazy, status-visible |
| CoRE QGIS Styles repository | authoritative style inputs | retain source URL |
| PMTiles deployment artifacts | national multiscale boundaries | range-requested |
| COG endpoints | full-resolution raster analysis/download | windowed/lazy |
| Legacy KYL JSON contracts | locations, filters and patterns | migrate with tests |

Data licensing, update cadence, generation commit, feature counts, bounds, CRS,
and checksums must accompany every promoted PMTiles or COG artifact.

## Runtime configuration

Deployment-specific service roots, source-layer names, and PMTiles URLs are
supplied through `VITE_CORE_GEOSTACK_*` environment variables. See
`apps/geolibre-desktop/.env.core-geostack.example`.

The default basemap style preserves the existing KYL Google hybrid endpoint in
`apps/geolibre-desktop/public/basemaps/google-hybrid.json`. A deployment may
replace it with an authorized Google style or any compatible MapLibre style
through `VITE_CORE_GEOSTACK_BASEMAP_STYLE_URL`.
