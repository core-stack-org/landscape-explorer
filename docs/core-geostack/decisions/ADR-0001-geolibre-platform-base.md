# ADR-0001: Base CoRE-GeoStack directly on GeoLibre

- Status: accepted
- Date: 2026-07-24

## Decision

The `platform/core-geostack` product branch is based directly on the current
`opengeos/geolibre` main branch. Legacy landscape-explorer development continues
independently.

## Why

GeoLibre already owns the desired map, analysis, processing, project, story,
presentation, mobile, offline, plugin, and Rust-backed execution systems.
Embedding it in the legacy shell would preserve duplicated maps, routes, state,
and loading behavior.

## Consequences

- Upstream synchronization is a first-class maintenance task.
- CoRE customizations must remain isolated and reviewable.
- Legacy React/OpenLayers components are references, not runtime dependencies.
- CoRE-GeoStack can ship web, PWA, Tauri desktop, and future mobile surfaces from
  one platform.
