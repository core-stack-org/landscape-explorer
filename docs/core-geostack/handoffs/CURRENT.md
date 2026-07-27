# Current handoff

Updated: 2026-07-27
Cycle: 004 — whole-app observability and reliable WSL review

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
- One structured logger installed at the application entry point before React
  loads, covering startup diagnostics, GeoLibre menus/dialogs/panels/plugins,
  map interactions, CoRE workspace transitions, and story actions.
- A privacy allow-list that excludes typed values, feature attributes,
  credentials, raw URLs/query strings, and diagnostic bodies.
- A bounded local activity log with download/clear/inspect controls and optional
  HTTP(S) batching that honors Do Not Track.
- `npm start` as the reliable `/mnt/y` production-preview path and
  `npm run open:wsl` as the dedicated SwiftShader WebGL Chrome launcher.
- Actionable map-failure recovery text for WSL WebGL blocklisting.
- ADR-0006, an observability/privacy contract, focused privacy tests, and a
  recursive knowledge-base update.

## Validation

- Focused CoRE-GeoStack and logger tests: 20 passed, 0 failed.
- Focused ESLint for the changed CoRE source: passed with 0 warnings.
- TypeScript project build: passed.
- Production PWA build: passed; 7,710 modules transformed and 427 entries
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
- Production preview returned HTTP 200 and reached the CoRE shell in 2.17
  seconds in a clean browser with zero page errors.
- The cold `/mnt/y` Vite development path was reproduced: it exceeded 2 GB
  resident memory and did not reach DOM content in 180 seconds.
- The user's WSL Chrome failure was traced to explicit `WebGL1 blocklisted` and
  `WebGL2 blocklisted` messages. Chromium's documented SwiftShader WebGL flags
  restored WebGL1, created the MapLibre canvas, and produced zero page errors.
- Generic Project-menu clicks, map events, workspace/data transitions, and
  semantic story events were observed in the shared local logger.
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
- Hot-module development is not practical from the Windows `9p` mount; it needs
  a WSL-native Linux clone/worktree.
- The WSL fallback is CPU-rendered and slower than supported hardware WebGL.
- Remote logger transport remains unconfigured until retention, access,
  authorization, and deletion policies are approved.

## Next executable step

Define the first approved aggregation/retention policy for privacy-filtered
activity events and use the local evidence to prioritize startup splitting.
Then add a source/date/caveat-aware story preset and validate it across the
approved multi-tehsil set.

The immutable snapshot for this handoff is
[`2026-07-27-cycle-004-observability-wsl-runtime.md`](2026-07-27-cycle-004-observability-wsl-runtime.md).
