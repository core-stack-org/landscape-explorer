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

Append only. If a learning changes an architectural rule, also create an ADR.
