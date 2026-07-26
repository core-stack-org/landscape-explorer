# ADR-0005: Use one Stories mode for authoring and playback

- Status: accepted
- Date: 2026-07-26

## Decision

CoRE-GeoStack has three top-level workspace modes: Focus, Explore, and Stories.
Stories owns tehsil-story generation, editing, reading/presentation, and export.
Present is removed as a separate top-level mode.

The generalized tehsil story is generated from existing KYL workspace and
runtime state and stored as GeoLibre's native `StoryMap`. It reuses the one
MapLibre map and GeoLibre's existing story editor, reader, and static export.

Incoming links with `mode=present` migrate to Stories for compatibility. New
URLs emit `mode=stories`.

## Consequences

- There is no duplicate page or second presenter to keep synchronized.
- Focus and Explore remain the only places that select analytical state;
  Stories explains that same state.
- Explore result layers remain available while Stories is active.
- Generated chapter ids carry a versioned `core-tehsil-v1` namespace.
- A custom GeoLibre story remains editable and readable without being mistaken
  for a generated CoRE tehsil story.
