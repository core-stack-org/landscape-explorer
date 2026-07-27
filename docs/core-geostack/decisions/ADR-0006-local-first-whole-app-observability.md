# ADR-0006: Install local-first observability across the whole application

- Status: accepted
- Date: 2026-07-26

## Decision

Install one structured interaction logger at GeoLibre's application entry point,
before React loads and below the plugin boundary. Capture committed application
and map interactions, semantic workspace transitions, story actions, and the
existing diagnostics stream. CoRE-GeoStack contributes safe workspace context
to that shared logger.

Keep a bounded privacy-filtered log on the device by default. Remote batching is
explicit deployment configuration, is restricted to HTTP(S), and does not
transmit when Do Not Track is enabled.

## Consequences

- Menus, dialogs, panels, controls, plugins, maps, and CoRE modes share one event
  schema and session sequence.
- The logger records stable action descriptors but not typed values, feature
  attributes, credentials, raw URLs/query strings, or diagnostic bodies.
- Product evolution can use real interaction and failure evidence without
  coupling every component to an analytics vendor.
- Remote monitoring requires a separately approved receiver, retention policy,
  authorization model, and access policy.
- High-volume pointer movement is intentionally excluded; scroll is throttled
  and map camera movement is recorded only after it settles.
