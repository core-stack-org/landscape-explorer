# Learning log

## 2026-07-24 — foundation reset

- A separate homepage and attached GeoLibre workbench reproduced product
  boundaries instead of removing them.
- Current GeoLibre already supplies the GIS, story, print, dashboard, project,
  plugin, mobile, DuckDB-WASM, Rust/Tauri, and Rust/WASM platform capabilities
  that the new product needs.
- The maintainable fork boundary is a CoRE-owned plugin/profile plus small
  lifecycle and branding hooks.
- Existing KYL knowledge should be migrated as typed data contracts and tested
  behavior, not copied as an OpenLayers page.
- Pan-India tehsil visibility must depend on an independent multiscale artifact.
  Loading villages to compute a tehsil overview in the browser is explicitly
  rejected.
- The current legacy layer contract contains 45 entries: 13 vectors and 32
  rasters, including 24 LULC time slices.
- A source URL is not evidence of readiness. The UI needs honest partial and
  failure states until national artifacts are configured and measured.
- Distribution-owned Focus must activate as soon as MapLibre exists. Waiting
  for optional external-plugin discovery delayed the primary workspace on a
  cold load.
- The inherited application currently ships a very large startup graph. Cold
  local Focus-ready samples ranged from 4.2 to 9.8 seconds, so Phase 1 must
  profile and defer non-Focus capability before claiming the startup budget.
- On this mounted workspace, npm package materialization was too slow for a
  reliable validation loop. An exact source mirror on the native Linux
  filesystem installed 1,405 packages in 31 seconds and became the reproducible
  Node 22 build/test environment.

## 2026-07-25 — tehsil-filtered Explore

- Explore should be another page of the one KYL workspace, not a separate
  product or map. Focus chooses the tehsil; Explore consumes that same state.
- The legacy `/kyl_dashboard` contract is more than a filter catalogue. Its
  important behavior includes inclusive ranges, OR within an indicator, AND
  across indicators, reset on location change, and MWS-derived village context.
- The KYL JSON records and GeoServer geometry have different responsibilities
  and sometimes different counts. Stable identifiers must join them, while the
  UI reports geometry matches over the actual map layer.
- Empty filter buckets are valid results. Live Nambulipulikunta relief data has
  no records below 6 metres, while the 110-900 metre bucket matches 42 of 45
  micro-watersheds.
- Waterbody exploration is materially heavier than MWS or village exploration:
  the validated tehsil WFS returned 510 geometries and about 2 MB. Keep it lazy
  and include it in future payload/performance measurements.
- A generalized tehsil story should reuse the same location, filter ids, result
  summaries, and map camera rather than inventing a second story-specific data
  selection model.

## 2026-07-26 — generalized tehsil stories

- Stories and Present were two labels for one workflow. A single Stories mode
  now owns generation, chapter editing, scroll-driven reading, and export.
- A story is a typed view of existing KYL state, not a separate saved analysis.
  The generator consumes the selected tehsil, layer/filter ids, current camera,
  visible layer ids/opacities, and live Explore summaries.
- Explore result layers must remain mounted while Stories derives and reads its
  evidence scenes; switching between those modes should not trigger an
  unnecessary reload.
- Scene changes reference native GeoLibre layer ids, so the existing map, layer
  tree, editor, reader, and static handout remain authoritative.
- Generated chapter ids need a versioned namespace. `core-tehsil-v1` identifies
  CoRE-generated stories without taking ownership of custom GeoLibre projects.
- Compatibility migration belongs at the URL boundary: old `mode=present`
  links resolve to Stories while new URLs emit only the three supported modes.

Append only. If a learning changes an architectural rule, also create an ADR.
