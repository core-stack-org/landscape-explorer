# Performance budgets

These are initial engineering budgets, not measured claims. Record measurements
and revise through a superseding decision when real devices show better limits.

| Budget | Target |
| --- | --- |
| Primary MapLibre instances | exactly 1 |
| Shared deck.gl instances | at most 1 |
| New-project first map paint, warm broadband desktop | under 2.5 s |
| Tehsil boundary visible, warm broadband desktop | under 3.0 s |
| Tehsil boundary payload for India overview | under 1.5 MB transferred |
| Village data below configured minimum zoom | 0 bytes |
| Focus panel interaction response | under 100 ms |
| URL/state update | under 50 ms main-thread work |
| Mobile WebGL device-pixel ratio | cap at 2 where configurable |
| Simultaneously eager KYL thematic layers | 2 default |
| WFS vector fetching | selected location and selected layers only |

## Cycle 001 baseline

The first production-preview smoke used fresh Chromium contexts against a local
production server. Focus/Pan India became visible in 4.2-9.8 seconds across the
sampled desktop and mobile runs. Both viewports returned HTTP 200, activated the
service worker, and reported no runtime errors in a normal browser context.

These cold local measurements are not directly comparable to the warm
broadband target, but they expose enough startup cost to require profiling and
code splitting before performance can be called acceptable.

## Degradation policy

- Keep the last good map visible while replacement data loads.
- Name partial, stale, cached, offline, and failed states.
- Do not replace a slow request with an unbounded national GeoJSON download.
- Prefer simplified tile detail, fewer active labels, and deferred rasters on
  data-saver or low-power devices.
- Pause nonessential animation when the document is hidden or reduced motion is
  requested.
- A WebGL-context failure must retain a textual location/layer/source summary.

## Measurement matrix

Validate at minimum:

- desktop 1440×900;
- mobile portrait 390×844;
- mobile landscape 844×390;
- throttled Fast 3G and offline-after-warm-cache;
- DPR 1 and DPR 2;
- empty, loading, live, partial, offline, and error states.
