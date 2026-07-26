# Cycle 003 handoff — generalized tehsil Stories

Date: 2026-07-26
Branch: `platform/core-geostack-stories-observability`
Story base: `platform/core-geostack` at `3ddb1e35`

## Outcome

Stories is now the single CoRE communication workspace. It can generate an
editable native GeoLibre story from the active tehsil, selected KYL layers,
filter ids, map camera, visible layers, and live Explore summaries. It then
uses GeoLibre's existing chapter editor and scroll reader on the same map.

The duplicate Present mode is removed. Existing `mode=present` links migrate to
Stories, while new links emit only Focus, Explore, or Stories.

## Runtime boundary

- React owns the Stories workspace and proposed-scene preview.
- `buildCoreGeoStackTehsilStory` is a pure typed transformation to `StoryMap`.
- `core-tehsil-v1` chapter ids identify generated CoRE stories without claiming
  unrelated custom project stories.
- The Explore runtime remains active in Stories so filter result layers and
  matched/total evidence stay available.
- Scene camera and opacity changes address native GeoLibre map/layer state.
- GeoLibre owns editing, reading, chapter navigation, and static export.
- A slow basemap `load` event no longer blocks CoRE plugin registration.

## Validation evidence

- Focused tests: 18 passed, 0 failed.
- Focused CoRE ESLint: passed with 0 warnings.
- TypeScript and production PWA build: passed; 7,709 modules transformed and
  428 entries precached.
- Nambulipulikunta High Relief browser story:
  - five deterministic scenes;
  - 42/45 matching micro-watersheds recorded in the evidence scene;
  - story generation and scroll-reader chapter navigation passed;
  - zero page or console errors.
- Legacy Present URL migration passed.
- 393x851 tehsil-first mobile empty state passed.
- Desktop reader and mobile screenshots passed visual inspection.
- Rust validation remains unavailable because `cargo` is not installed; no
  Rust source changed.

## Known limitations

- The first preset uses structured generated prose rather than curated
  editorial narratives.
- Multi-tehsil equivalence, source/caveat blocks, and additional presets remain.
- Pattern evaluation, complete thematic styling/legends, and national PMTiles
  deployment remain open platform work.

## Next executable step

Create a source-aware second preset and validate story generation, layer
transitions, print/handout output, and live evidence across the approved
multi-tehsil set.
