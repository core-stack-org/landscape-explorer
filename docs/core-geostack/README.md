# CoRE-GeoStack knowledge base

This directory is the maintained memory of CoRE-GeoStack. It explains what the
platform is, why its boundaries exist, how its data and rendering contracts
work, what has been learned, and what the next contributor should do.

Start with:

1. [Product principles](PRODUCT_PRINCIPLES.md)
2. [Architecture](ARCHITECTURE.md)
3. [Data contracts](DATA_CONTRACTS.md)
4. [Performance budgets](PERFORMANCE_BUDGETS.md)
5. [Approved visual contract](VISUAL_CONTRACT.md)
6. [Roadmap](ROADMAP.md)
7. [Current handoff](handoffs/CURRENT.md)

Architectural decisions are immutable records under [`decisions/`](decisions/).
When a decision changes, add a superseding ADR rather than rewriting history.
Cycle handoffs work the same way: update `handoffs/CURRENT.md` and add a dated
snapshot. Append durable findings to [LEARNING_LOG.md](LEARNING_LOG.md).

Run `npm run check:core-geostack` before handing off a cycle. The check ensures
that the required knowledge files and current handoff stay present.

## Current platform boundary

CoRE-GeoStack is developed on `platform/core-geostack`, based on the upstream
GeoLibre platform. Legacy deployment work continues independently on the
repository's existing branches.

The CoRE-specific implementation currently lives in
`apps/geolibre-desktop/src/core-geostack/`. Upstream-facing changes should stay
small and deliberate:

- register the CoRE-GeoStack plugin;
- expose the approved mode bar and product name;
- restore the plugin when the underlying MapLibre instance is recreated;
- keep deployment configuration in environment variables and the admin profile.

## Knowledge update rule

A cycle is not complete until its implementation evidence, known limitations,
and next executable step are recorded in the current handoff. Documentation is
part of the product contract, not release-note cleanup.
