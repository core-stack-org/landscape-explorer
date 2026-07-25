# Cycle 002 handoff — tehsil-filtered Explore

Date: 2026-07-25
Branch: `platform/core-geostack`

## Outcome

Explore is now a page of the same KYL workspace and map used by Focus. It opens
for the selected tehsil and exposes the established Micro-watershed, Village,
and Waterbody filters from `/kyl_dashboard`.

The implementation preserves all 46 indicators and 138 choice buckets. It
applies inclusive ranges, OR within an indicator, AND across indicators, clears
filters when the location changes, derives MWS-intersecting villages, and
derives the four legacy waterbody matching fields. Filter ids remain in the URL
and browser navigation restores them.

## Runtime boundary

- React owns workspace/page/category/checkbox state.
- `CoreGeoStackExploreRuntime` loads only required KYL JSON and WFS sources.
- Requests are abortable and session-cached.
- Results are native GeoLibre GeoJSON layers on the existing map.
- Leaving Explore or clearing filters removes result layers.
- A missing tehsil produces a direct return-to-Focus action.

## Validation evidence

- Focused tests: 14 passed, 0 failed.
- TypeScript and production PWA build: passed; 7,707 modules transformed.
- Nambulipulikunta live results:
  - High Relief: 42/45 micro-watersheds
  - derived village context: 12/15 mapped villages
  - population 800-2400: 5 mapped villages
  - Off river: 456/510 waterbodies
- Desktop and 393x851 browser smokes: zero console/page errors.
- URL filter persistence, result layer registration, and tehsil-first empty
  state were verified.
- Rust validation remains unavailable because `cargo` is not installed; this
  cycle changes no Rust source.

## Known limitations

- Pattern evaluation is not yet implemented.
- Full thematic-style and active-only legend equivalence remains.
- Live equivalence needs expansion beyond Nambulipulikunta.
- Waterbody payloads need explicit mobile performance measurement.
- National tehsil/village PMTiles deployment artifacts remain unconfigured.

## Next executable step

Specify a generalized tehsil-story scene that references the existing location,
filter ids, result summaries, camera, and visible layers. Prove one Explore URL
can be reopened as a reproducible GeoLibre story scene without duplicating
selection or data-loading logic.
