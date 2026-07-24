# ADR-0003: Implement KYL as a first-class platform plugin

- Status: accepted
- Date: 2026-07-24

## Decision

KYL-specific locations, layers, filters, patterns, and Focus workflows live in a
trusted built-in CoRE-GeoStack plugin. The plugin shares GeoLibre's map,
sidebars, project state, layer store, stories, and processing engines.

## Why

A plugin isolates domain code while still participating in the platform. An
iframe or separate route would duplicate camera, layer, legend, persistence, and
mobile state.

## Consequences

- Direct WFS/WMS/COG layers are native GeoLibre layers.
- The Focus panel shares the Layers rail.
- Plugin state can persist in `.geolibre.json` and URL state.
- Upstream files need only registration and lifecycle hooks.
