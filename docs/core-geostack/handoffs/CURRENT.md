# Current handoff

Updated: 2026-07-26
Cycle: 003 — generalized tehsil Stories

## Branch and base

- Branch: `platform/core-geostack-stories-observability`
- Story work is based on `platform/core-geostack` at `3ddb1e35`.
- Base remote: `geolibre-upstream`
- Base commit at platform creation:
  `bfca39a02e50b898497bd8c29cd3c287606d7326`
- Legacy and experimental branches remain untouched.

## Implemented

- One map-first application with three modes: Focus, Explore, and Stories.
- Removed the duplicate Present mode; old `mode=present` URLs resolve to
  Stories while new URLs emit only `mode=stories`.
- A first `core-tehsil-v1` generalized story generator backed by the current
  state, district, tehsil, selected KYL layers, filter ids, camera, visible
  native GeoLibre layers/opacities, and live Explore result summaries.
- Deterministic orientation, human-context, thematic-domain, Explore-evidence,
  and synthesis scenes.
- Generated story preview with layer/filter/evidence counts and ordered scenes
  before replacing an existing project story.
- Direct actions to build/rebuild, read, and edit the native GeoLibre story.
- GeoLibre's existing scroll reader, chapter navigation, camera/layer-opacity
  transitions, editor, and export remain authoritative; no second presenter or
  map was added.
- Explore result layers remain mounted in Stories, avoiding an unnecessary
  reload and preserving the evidence referenced by generated scenes.
- A tehsil-first Stories empty state that returns directly to Focus.
- Immediate CoRE plugin activation once a map controller exists, so a slow or
  blocked basemap `load` event cannot leave the KYL workspace unregistered.
- Typed tests, ADR-0005, updated architecture/data/visual contracts, learning
  log, roadmap, and immutable cycle handoff.

## Validation

- Focused CoRE-GeoStack tests: 18 passed, 0 failed.
- Focused ESLint for the changed CoRE source: passed with 0 warnings.
- TypeScript project build: passed.
- Production PWA build: passed; 7,709 modules transformed and 428 entries
  precached.
- Desktop production browser smoke at 1440x900:
  - Nambulipulikunta opened directly in Stories;
  - the selected relief filter produced a five-scene proposal;
  - the evidence scene recorded 42 of 45 matching micro-watersheds;
  - building and reading used GeoLibre's native scroll presenter;
  - chapter navigation applied the Micro-watershed evidence scene;
  - Present was absent from the mode bar; and
  - zero page or console errors occurred.
- Legacy `mode=present` browser smoke opened the Stories workspace.
- Mobile 393x851 smoke displayed the operable tehsil-first Stories empty state.
- Browser screenshots were visually inspected for the desktop reader and
  mobile empty state.
- Knowledge-base structure and `git diff --check`: passed.
- Rust check remains unavailable because `cargo` is not installed. This cycle
  changes no Rust source.

## Known limitations

- Generated prose is a structured first preset, not a curated editorial story.
- Live equivalence remains proven for Nambulipulikunta rather than the approved
  multi-tehsil validation set.
- Pattern evaluation and deeper cross-source composition remain incomplete.
- Full thematic-style and active-only legend equivalence remains Phase 2 work.
- National tehsil/village PMTiles deployment artifacts remain unconfigured.
- Story generation captures the current camera rather than a persisted
  tehsil-specific editorial camera template.
- A cold local build still carries the inherited large startup graph.

## Next executable step

Add a second story preset with explicit source/date/caveat blocks and validate
both presets across the approved multi-tehsil set. Then expose print/handout
templates without creating another story state model.

The immutable snapshot for this handoff is
[`2026-07-26-cycle-003-tehsil-stories.md`](2026-07-26-cycle-003-tehsil-stories.md).
