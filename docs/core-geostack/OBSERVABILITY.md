# Whole-application observability

CoRE-GeoStack uses one privacy-filtered activity logger across the complete
GeoLibre application. It is installed at the application entry point before
React loads; plugins can enrich the safe context, but they do not create
separate telemetry systems.

## What is recorded

- committed clicks, changes, and form submissions;
- non-text navigation/command keys;
- scroll activity, throttled to at most one event per second;
- map clicks, settled camera movement, and map errors;
- CoRE mode, location, layer, filter, data-status, and story transitions; and
- GeoLibre diagnostics by category and severity, without diagnostic bodies.

Meaningful controls should use a stable `data-log-action` value. Controls that
do not have one still produce a generic tag/role descriptor. The logger does not
record pointer movement because it is noisy rather than useful product evidence.

## Event contract

Every event has:

- schema version, event id, session id, sequence, UTC timestamp, level, and
  stable event name;
- bounded context: visible/total layer counts and, while the CoRE plugin is
  active, mode, state, district, tehsil, selected counts, and status; and
- allow-listed event data such as action, target, source, counts, camera
  values, or error class.

The current schema version is `1`. Consumers must tolerate new event names and
new allow-listed fields within the same version.

## Privacy and retention

The logger must not capture:

- typed input, textarea contents, or labels derived from free-form text;
- feature properties, query results, or raw GeoJSON;
- credentials, cookies, authorization headers, tokens, or email addresses;
- raw URLs or URL query strings; or
- full diagnostic and exception messages.

Strings are length-bounded and URLs/home-directory identities are redacted.
The default store is a ring buffer of 1,000 events in browser `localStorage`.
It stays on the device unless an explicit remote endpoint is configured. Do Not
Track disables transmission even when an endpoint exists.

## Configuration

Copy values from `apps/geolibre-desktop/.env.core-geostack.example` into the
deployment's `.env.local`:

```dotenv
VITE_GEOLIBRE_LOG_ENDPOINT=
VITE_GEOLIBRE_LOG_MAX_EVENTS=1000
VITE_GEOLIBRE_LOG_CONSOLE=false
```

`VITE_GEOLIBRE_LOG_ENDPOINT` must be an HTTP(S) endpoint that accepts
`POST application/json` batches shaped as:

```json
{
  "schemaVersion": 1,
  "events": []
}
```

Remote retention, authorization, access, deletion, and aggregation policies are
deployment decisions and must be approved before this value is populated.

## Local monitoring

The activity button in the product mode bar downloads the privacy-filtered JSON
log. During development the same operations are available in browser DevTools:

```js
window.__GEOLIBRE_LOGGER__.getEvents()
window.__GEOLIBRE_LOGGER__.download()
window.__GEOLIBRE_LOGGER__.flush()
window.__GEOLIBRE_LOGGER__.clear()
```

Use the event stream to identify broken flows, repeated errors, abandoned
actions, and slow or confusing sequences. Counts are evidence for investigation,
not an automatic product decision; qualitative review and accessibility testing
remain necessary.

## Verification

The logger privacy allow-list is covered by `tests/app-logger.test.ts`. Browser
validation must also prove that:

1. interactions outside CoRE panels are captured;
2. map click and settled-camera events are captured;
3. Stories generation and reading emit semantic events;
4. an interaction export can be downloaded; and
5. no typed values appear in exported event data.
