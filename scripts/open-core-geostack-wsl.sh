#!/usr/bin/env bash

set -euo pipefail

core_geostack_url="${1:-http://127.0.0.1:4173/}"
core_geostack_profile="${CORE_GEOSTACK_CHROME_PROFILE:-/tmp/core-geostack-chrome-swiftshader}"

if ! command -v google-chrome-stable >/dev/null 2>&1; then
  echo "google-chrome-stable is not installed or is not on PATH." >&2
  exit 1
fi

if ! curl --fail --silent --show-error --max-time 5 "${core_geostack_url}" >/dev/null; then
  echo "CoRE-GeoStack is not reachable at ${core_geostack_url}" >&2
  echo "Start it in another terminal with: npm start" >&2
  exit 1
fi

mkdir -p "${core_geostack_profile}"

echo "Opening ${core_geostack_url} with SwiftShader WebGL."
echo "Chrome profile: ${core_geostack_profile}"

exec google-chrome-stable \
  --user-data-dir="${core_geostack_profile}" \
  --no-first-run \
  --no-default-browser-check \
  --disable-sync \
  --use-gl=angle \
  --use-angle=swiftshader-webgl \
  --enable-unsafe-swiftshader \
  "${core_geostack_url}"
