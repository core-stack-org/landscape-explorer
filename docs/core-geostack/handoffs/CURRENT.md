# Current handoff

Updated: 2026-07-24
Cycle: 001 — platform foundation

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

## Validation

- Node 22 dependency graph installed in a native-filesystem validation mirror:
  1,405 packages.
- Focused CoRE-GeoStack tests: 8 passed, 0 failed.
- Focused ESLint: 0 errors; 4 inherited hook-dependency warnings in previously
  existing GeoLibre files.
- TypeScript and production PWA build: passed; 7,703 modules transformed.
- Cold production preview smoke at 1440x900 and 393x851: HTTP 200, product
  identity/Focus/Pan India visible, service worker active, 0 runtime errors.
- Live Nambulipulikunta smoke: both default WFS layers loaded, the map fitted to
  their bounds over Google hybrid imagery, and the status retained the missing
  national-index caveat alongside layer readiness.
- Knowledge-base structure and `git diff --check`: passed.
- Rust check could not run because `cargo` is not installed in this environment.
  No Rust source changed; Tauri product configuration remains JSON-valid.

## Known limitations

- National PMTiles URLs are deployment inputs and are not yet populated.
- A cold local preview reached the Focus workspace in 4.2-9.8 seconds across
  sampled browser runs. This is a baseline, not compliance with the 2.5-second
  warm-load budget; startup code splitting and measurement remain required.
- KYL filter and pattern schemas are preserved and inventoried, but choice-level
  execution/bucketing is not yet ported.
- Only the most important vector style profiles are currently applied directly;
  complete style/legend equivalence remains Phase 2.
- Product-specific icons still inherit the upstream GeoLibre asset set.

## Next executable step

Produce and connect the tehsil PMTiles artifact with its manifest, counts,
checksums, and mobile payload measurements. In parallel, profile the cold
startup graph and defer non-Focus GeoLibre capabilities so the direct map
workspace becomes interactive sooner.

The immutable snapshot for this handoff is
[`2026-07-24-cycle-001-foundation.md`](2026-07-24-cycle-001-foundation.md).
