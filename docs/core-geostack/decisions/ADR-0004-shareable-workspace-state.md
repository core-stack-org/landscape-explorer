# ADR-0004: Make meaningful workspace state shareable

- Status: accepted
- Date: 2026-07-24

## Decision

Mode, state, district, tehsil, selected layers, and selected filters use a typed
URL codec and plugin project state. Incoming URL state overrides local defaults.
Ephemeral hover, pointer, loading, and animation state are excluded.

## Consequences

- Committed changes create browser-history entries.
- Back/forward restores the analytical view.
- Existing unrelated GeoLibre query parameters are preserved.
- Invalid modes fall back to Focus; duplicates are normalized.
