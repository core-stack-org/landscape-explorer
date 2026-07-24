# Cycle 001: CoRE-GeoStack foundation

Date: 2026-07-24

## Intent

Replace the redundant legacy-homepage/separate-tool architecture with one
map-first platform that makes KYL a first-class GeoLibre capability.

## Result

The new product line now has an independent upstream GeoLibre base, a named
CoRE-GeoStack distribution, a typed KYL plugin boundary, direct live-layer
runtime, multiscale administrative data contract, approved responsive visual
contract, migrated Google hybrid context, and maintained knowledge system.

## Evidence

- Product source: `apps/geolibre-desktop/src/core-geostack/`
- Deployment profile: `apps/geolibre-desktop/public/admin-profile.json`
- Configuration sample: `apps/geolibre-desktop/.env.core-geostack.example`
- Decisions: `docs/core-geostack/decisions/`
- Visual references: `docs/core-geostack/assets/concepts/`

## Validation result

- 8/8 focused contract tests passed.
- Focused lint completed with no errors.
- TypeScript and the full production PWA build passed.
- Fresh desktop and mobile browser contexts reached CoRE-GeoStack Focus/Pan
  India with no runtime errors and an active service worker.
- A live active-location smoke loaded and fitted both default Nambulipulikunta
  WFS layers while retaining the missing national-index caveat.
- Rust validation remains unexecuted because this environment has no `cargo`.

The cold local Focus-ready samples ranged from 4.2 to 9.8 seconds. This is
recorded as a performance problem to solve, not a launch-readiness claim.

## Carry forward

Do not claim national boundary performance until real PMTiles artifacts are
generated, connected, and measured. Do not claim filter equivalence until every
legacy choice and bucket is covered by fixtures.
