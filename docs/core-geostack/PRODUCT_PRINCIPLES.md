# Product principles

1. **The map is the entry point.** There is no landing page between a person and
   the Pan-India workspace.
2. **One application, three modes.** Focus, Explore, and Stories are states of
   one workspace and one map, not competing pages. Stories includes authoring,
   playback, and export; presentation is an action, not another mode.
3. **KYL is first-class.** Its location hierarchy, filters, patterns, bucketing,
   styles, and layer taxonomy are authoritative domain knowledge.
4. **GeoLibre is infrastructure, not an embed.** CoRE-GeoStack extends its map,
   project, processing, story, plugin, and persistence systems directly.
5. **Progressive detail beats eager geometry.** Tehsil and village indexes are
   produced separately. Village geometry is never downloaded merely to derive a
   national tehsil overview in the browser.
6. **Visible state is honest state.** Loading, live, cached, partial, offline,
   stale, and failed data must be distinguishable without opening diagnostics.
7. **Exploration and explanation coexist.** A saved exploration can become a
   focused view, story, presentation, print layout, or shareable project without
   rebuilding it elsewhere.
8. **Mobile is a sibling surface.** Portrait uses a map with a bottom/side sheet;
   landscape preserves a wide map and two-handed navigation.
9. **Power is progressively disclosed.** Focus mode is curated; Explore exposes
   the full GIS engine. Neither requires a lesser second application.
10. **Every cycle teaches the next one.** Decisions, evidence, regressions,
    performance results, and open questions are written down as they occur.

## Explicit non-goals

- Reimplementing GeoLibre's mature GIS functions in a separate KYL frontend.
- Using an iframe or duplicated WebGL map to join KYL and GeoLibre.
- Client-side Pan-India dissolves.
- Pretending a configured URL is proof that a layer is performant or correct.
- Hiding source, date, uncertainty, missingness, or partial results.
