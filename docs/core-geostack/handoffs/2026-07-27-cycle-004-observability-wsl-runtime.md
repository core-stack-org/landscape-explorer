# Cycle 004 handoff — whole-app observability and WSL runtime

Date: 2026-07-27
Branch: `platform/core-geostack-stories-observability`
Cycle base: generalized Stories commit `09ce2b8e`

## Outcome

GeoLibre and CoRE-GeoStack now share one structured activity logger from
application startup onward. The bounded local log covers committed application
interactions, settled map interactions, diagnostics, workspace transitions, and
story actions without recording typed values, feature attributes, credentials,
raw URLs/query strings, or diagnostic message bodies.

The repository also has one reliable review path for its current WSL-mounted
workspace. `npm start` serves the completed production bundle on port 4173.
`npm run open:wsl` launches a dedicated Chrome profile with Chromium's explicit
SwiftShader WebGL opt-in when WSL GPU support is blocklisted.

## Runtime boundary

- `main.tsx` installs the logger before React is dynamically loaded.
- `DesktopShell` attaches map click, settled-camera, and map-error events to the
  same logger whenever MapLibre is recreated.
- GeoLibre diagnostics bridge only category/severity metadata into the activity
  log; diagnostic bodies remain in the separate diagnostics system.
- CoRE contributes mode, selected location, counts, and data status as safe
  context and emits semantic state/story actions.
- Local storage holds a configurable ring buffer, defaulting to 1,000 events.
- Remote HTTP(S) batching is optional and disabled by default; Do Not Track
  prevents transmission.
- A product-bar action and Stories footer download the filtered JSON log.

## WSL evidence

- The production PWA build transformed 7,710 modules and precached 427 entries.
- A clean production preview reached the CoRE shell in 2.17 seconds with zero
  page errors.
- Cold Vite development on `/mnt/y` exceeded 2 GB resident memory and failed to
  reach DOM content within 180 seconds.
- Plain WSL Chrome reported both WebGL versions as blocklisted, causing the map
  error boundary.
- Chromium's documented `--use-gl=angle`,
  `--use-angle=swiftshader-webgl`, and `--enable-unsafe-swiftshader` flags
  restored WebGL1 and a functioning MapLibre canvas with zero page errors.
- A separate Chrome profile ensures an existing browser process cannot ignore
  the GPU-process flags and isolates the lower-security software renderer to
  the trusted local application.

## Validation evidence

- Twenty focused CoRE/logger assertions passed.
- TypeScript passed.
- Focused ESLint passed with zero errors; two inherited translation-hook
  warnings remain in untouched DesktopShell regions.
- Knowledge-base validation and `git diff --check` passed.
- The logger privacy tests prove sensitive/free-form keys are dropped and URLs
  and home-directory identities are redacted.

## Known limitations

- SwiftShader is CPU-rendered and is for trusted local review, not untrusted
  browsing or production performance measurement.
- Hot-module development requires a WSL-native Linux checkout.
- Remote activity aggregation has no approved receiver or retention/access
  policy yet.
- Multi-tehsil story validation, additional presets, national PMTiles, and
  complete thematic styling remain open platform work.

## Next executable step

Approve a minimal event aggregation/retention policy, profile the largest
startup capabilities using the local event and diagnostics evidence, and defer
non-Focus chunks. Continue story work with a source/date/caveat-aware preset
validated across the approved multi-tehsil set.
