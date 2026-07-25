# Architecture

## Platform shape

CoRE-GeoStack is a focused distribution of GeoLibre rather than an application
that launches GeoLibre. The upstream repository remains the platform base and
is tracked as the `geolibre-upstream` Git remote.

```text
CoRE-GeoStack application
├── React application shell and accessible controls
├── one MapLibre map/camera/context
├── CoRE-GeoStack KYL plugin and Focus/Explore workspace
├── shared deck.gl analytical overlays
├── GeoLibre project, story, print, and plugin systems
├── DuckDB-WASM local spatial query
├── Rust/WASM geoprocessing and Tauri native services
└── CoRE data plane
    ├── independent tehsil PMTiles index
    ├── progressive village PMTiles index
    ├── GeoServer WFS/WMS services
    ├── COG rasters
    └── QGIS style sources
```

## Ownership

| Concern | Owner |
| --- | --- |
| Camera, Google hybrid basemap, vector-tile rendering, labels | GeoLibre MapLibre instance |
| Dense analytical overlays | GeoLibre's shared deck.gl instance |
| KYL modes, locations, catalogue, filters and patterns | CoRE-GeoStack plugin |
| Local tabular/spatial queries | DuckDB-WASM |
| Native file/system services | Tauri/Rust |
| Browser geoprocessing | GeoLibre Rust/WASM and existing processing engines |
| National multiscale geometry | Precomputed PMTiles data plane |
| Tehsil-scoped operational layers | CoRE Stack GeoServer and COG endpoints |
| Shareable analysis state | URL codec and `.geolibre.json` project state |

No CoRE component may create a second primary MapLibre or deck.gl instance.

## Runtime sequence

1. The application shell starts directly on the map.
2. The CoRE-GeoStack plugin restores URL/project state.
3. The map moves to the India overview for a new untitled project.
4. The tehsil PMTiles source attaches when configured.
5. Village tiles remain dormant below their zoom threshold.
6. Focus mode opens the KYL shared left rail.
7. A tehsil selection resolves the existing workspace/layer naming contract.
8. Only selected WFS/WMS layers load; previous good layers remain until their
   replacements are ready.
9. Explore opens in the same rail and resolves the selected tehsil through the
   established KYL JSON and GeoServer WFS contracts.
10. A selected filter range adds a result layer to the same map; MWS results
    also derive their intersecting village context.
11. Mode, location, layers, and filters stay shareable in the URL and project.

## Explore execution

React owns Explore page, category, filter, and URL state. The
`CoreGeoStackExploreRuntime` owns asynchronous data loading and result-layer
lifecycle. It:

1. resolves stable filter ids in the form `Source:indicator:optionIndex`;
2. fetches only the JSON records and WFS geometry needed by selected filters;
3. applies inclusive KYL ranges, OR within one indicator, and AND across
   indicators;
4. derives legacy waterbody fields before matching;
5. adds styled result and context features through GeoLibre's native GeoJSON
   layer API; and
6. aborts stale requests and replaces previous results only after new results
   are ready.

The runtime does not create another map, maintain a parallel layer tree, or
silently reinterpret the preserved KYL buckets.

## Responsive shell

- **Large screen:** left Focus/Layers rail, central map, optional right
  Style/Inspector rail. Focus collapses the Style rail initially.
- **Mobile portrait:** map stays first; panels use GeoLibre's overlay sheet.
- **Mobile landscape:** narrow side sheet and wide uninterrupted map.
- Controls use at least 44 CSS pixels for primary touch actions.
- Hover is supplementary; selection and details are available through tap and
  keyboard focus.

## Upstream maintenance

CoRE-specific source is isolated under `src/core-geostack`. Changes to upstream
files should be limited to registration, product identity, and lifecycle hooks.
Before an upstream sync:

1. record the current upstream commit;
2. fetch and inspect upstream changes;
3. merge or rebase in a dedicated sync commit;
4. run frontend tests, build, Rust check, and mobile screenshot checks;
5. document conflicts and resolutions in the learning log and cycle handoff.

See [ADR-0001](decisions/ADR-0001-geolibre-platform-base.md).
