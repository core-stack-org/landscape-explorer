# ADR-0002: Build independent tehsil and village indexes

- Status: accepted
- Date: 2026-07-24

## Decision

Serve Pan-India tehsil and village geometries as separate multiscale PMTiles
artifacts. Tehsil geometry must never require downloading or dissolving village
features in the browser.

## Why

The national view and the close village view have different geometry,
generalization, payload, and update requirements. Coupling them makes first
paint slower and spends bandwidth on detail the user cannot see.

## Consequences

- The data pipeline must produce and validate two related artifacts.
- Parent ids and source lineage must remain consistent across both.
- Villages are not requested below a configured zoom threshold.
- The UI exposes missing/partial indexes explicitly.
