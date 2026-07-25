# Current handoff

Updated: 2026-07-25
Cycle: 002 — tehsil-filtered Explore

## Branch and base

- Branch: `platform/core-geostack`
- Base remote: `geolibre-upstream`
- Base commit at creation: `bfca39a02e50b898497bd8c29cd3c287606d7326`
- Legacy and experimental branches remain untouched.

## Implemented

- CoRE-GeoStack product identity for web, PWA, and Tauri.
- Single map-first application with Focus, Explore, Stories, and Present modes.
- First-class KYL plugin using GeoLibre's shared Layers rail.
- Mercator India new-project view with the migrated Google hybrid basemap.
- Focus-mode Style rail auto-collapse so the map is not boxed between two
  permanently expanded sidebars.
- Typed URL/project state for mode, location, layers, and filters.
- Migrated active-location, filter, pattern, and 45-layer catalogue contracts.
- Lazy direct GeoServer WFS/WMS layer runtime.
- Independent tehsil/village PMTiles mounting contract.
- Visible live/loading/partial/error data states.
- Approved desktop, portrait, and landscape visual contracts.
- Architecture, data, performance, ADR, roadmap, learning, and handoff system.
- One KYL workspace shared by Focus and Explore; Explore no longer opens a
  separate or unfiltered surface.
- Tehsil-filtered Micro-watershed, Village, and Waterbody Explore pages.
- All 46 preserved KYL indicators and 138 choice buckets exposed by category.
- Inclusive range matching, OR within an indicator, AND across indicators, and
  filter reset on location change.
- URL-backed filter ids and browser back/forward-safe state.
- Lazy KYL JSON/WFS loading, stale-request cancellation, session caching, and
  native GeoLibre result layers.
- MWS-derived village context and legacy-derived waterbody filter fields.
- Tehsil-first empty state that returns directly to Focus selection.

## Validation

- Node 22 dependency graph installed in a native-filesystem validation mirror:
  1,405 packages.
- Focused CoRE-GeoStack tests: 14 passed, 0 failed.
- Focused ESLint: passed.
- TypeScript and production PWA build: passed; 7,707 modules transformed.
- Cold production preview smoke at 1440x900 and 393x851: HTTP 200, product
  identity/Focus/Pan India visible, service worker active, 0 runtime errors.
- Live Nambulipulikunta smoke: both default WFS layers loaded, the map fitted to
  their bounds over Google hybrid imagery, and the status retained the missing
  national-index caveat alongside layer readiness.
- Live Explore smoke for Nambulipulikunta: High Relief matched 42/45
  micro-watersheds and derived 12/15 mapped villages; a population bucket
  matched 5 villages; Off river matched 456/510 waterbodies.
- Desktop result-layer and narrow mobile empty-state screenshots passed with
  zero browser console or page errors. Filter state remained in the URL.
- Knowledge-base structure and `git diff --check`: passed.
- Rust check could not run because `cargo` is not installed in this environment.
  No Rust source changed; Tauri product configuration remains JSON-valid.

## Known limitations

- National PMTiles URLs are deployment inputs and are not yet populated.
- A cold local preview reached the Focus workspace in 4.2-9.8 seconds across
  sampled browser runs. This is a baseline, not compliance with the 2.5-second
  warm-load budget; startup code splitting and measurement remain required.
- KYL patterns are preserved but are not yet executed.
- Explore result layers use a deliberately clear matched/context style; full
  legacy thematic styles and active-only legends remain incomplete.
- Cross-source composition currently derives MWS-to-village context. Pattern
  evaluation and deeper MWS/waterbody composition remain.
- Live equivalence has been proven for Nambulipulikunta, not yet across the
  approved multi-tehsil validation set.
- Waterbody WFS payloads can be comparatively large and need explicit mobile
  payload/performance budgets.
- Only the most important vector style profiles are currently applied directly;
  complete style/legend equivalence remains Phase 2.
- Product-specific icons still inherit the upstream GeoLibre asset set.

## Next executable step

Define the generalized tehsil-story schema so a story can reuse the selected
tehsil, filter ids, result summaries, camera, and visible GeoLibre layers. The
first prototype should render one validated Explore state as a reproducible
story scene without introducing a second selection model.

The immutable snapshot for this handoff is
[`2026-07-25-cycle-002-explore-filters.md`](2026-07-25-cycle-002-explore-filters.md).
