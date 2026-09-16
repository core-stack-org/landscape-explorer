#!/usr/bin/env bash
set -euo pipefail
bundle_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
viewer_dir="${1:?Usage: install.sh /path/to/GeoLibre-v3.0.0-checkout}"
expected_commit=9778da6cbf5c06d5395b0725f24f025a029bc3df
if [[ "$(git -C "$viewer_dir" rev-parse HEAD)" != "$expected_commit" ]]; then
  echo "Use a clean GeoLibre v3.0.0 checkout ($expected_commit)." >&2
  exit 1
fi
if [[ -n "$(git -C "$viewer_dir" status --porcelain)" ]]; then
  echo "The GeoLibre checkout has changes; use a clean checkout." >&2
  exit 1
fi
git -C "$viewer_dir" apply --check "$bundle_dir/patches/corestack-viewer.patch"
git -C "$viewer_dir" apply "$bundle_dir/patches/corestack-viewer.patch"
install -m 644 "$bundle_dir/host/corestack-expression-style.ts" "$viewer_dir/apps/geolibre-desktop/src/lib/corestack-expression-style.ts"
mkdir -p "$viewer_dir/apps/geolibre-desktop/public/plugins/corestack-embed"
install -m 644 "$bundle_dir/plugins/corestack-embed/"* "$viewer_dir/apps/geolibre-desktop/public/plugins/corestack-embed/"
echo "Integration installed. Build and deploy this GeoLibre checkout using its documented web build."
