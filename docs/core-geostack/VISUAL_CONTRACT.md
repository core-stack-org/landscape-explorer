# Approved visual and interaction contract

The user approved continuing from the concept set on 2026-07-24.

- [Desktop map workspace](assets/concepts/desktop-map-workspace.png)
- [Mobile portrait workspace](assets/concepts/mobile-portrait-workspace.png)
- [Mobile landscape workspace](assets/concepts/mobile-landscape-workspace.png)

## Locked semantics

- The map is visible immediately; there is no product landing screen.
- Focus, Explore, and Stories are modes of one workspace. Reading or presenting
  a story is an action inside Stories, not a duplicate top-level mode.
- Cyan represents administrative context; violet represents committed
  selection. Color is reinforced by line/fill treatment and text state.
- Location, active layer count, filter state, source, and freshness remain
  visible when secondary controls collapse.
- Desktop supports a compact left work rail and optional right inspector.
- Focus starts with the Style inspector collapsed so the map owns the remaining
  horizontal workspace; users may reopen it without leaving Focus.
- Mobile portrait keeps the map visible behind an operable sheet.
- Mobile landscape preserves a wide pan/pinch area and compact side sheet.
- Tehsil readiness and progressive village loading are stated in text.

## Flexible implementation details

- Exact icon glyphs and typography may use the inherited GeoLibre design system.
- The Focus workspace may share the existing Layers rail rather than duplicate
  a permanent rail.
- The existing KYL Google hybrid context is the default; deployments may
  override it with an authorized compatible MapLibre style.
- Inspector placement may follow GeoLibre's existing responsive panel rules.

## Accessibility description

CoRE-GeoStack opens on an interactive map of India. Administrative tehsil
outlines provide national context; a selected tehsil is distinguished by both a
stronger outline and translucent fill. A Focus panel names the current state,
district, and tehsil, lists active layers and data status, and provides
searchable location controls. The same information is available through
keyboard-operable controls and textual status, without depending on map color or
hover. On phones, the panel becomes a sheet while the map remains visible.

## Embedded visualization inventory

| Layer | Job | Primary owner | Fallback/QA |
| --- | --- | --- | --- |
| National map | spatial orientation and selection | MapLibre/geospatial | text location path; nonblank screenshot |
| Tehsil/village boundaries | multiscale administrative context | PMTiles + MapLibre | readiness status; zoom payload check |
| KYL thematic layers | focused local evidence | WFS/WMS/COG | source/error summary; layer count tests |
| Attribute summaries | selected-feature lookup/comparison | GeoLibre panels | accessible table |
| Stories | authoring, explanatory sequence, playback, and export | GeoLibre story system | printable/static handout |

All specialist passes were completed locally; no subagent delegation was used.
