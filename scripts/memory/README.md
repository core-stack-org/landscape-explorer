# KYL memory profiler

`kyl-memory-profile.mjs` runs asserted KYL/GeoLibre scenarios in a fresh Chromium or Firefox process and records Linux process memory, browser-profile disk size, frame/worker/storage state, layer visibility, WebGL metadata, and request sizes. `analyze-kyl-memory.py` rejects failed or mismatched runs before creating aggregate JSON and SVG reports.

The profiler does not modify application source. Build and serve the production application from this worktree before running it.

```bash
# Build with the current deployment endpoints available in the environment.
npm run build

# Serve the SPA.
serve -s build -l tcp://127.0.0.1:4173

# In another terminal, run a fresh Chromium profile.
node scripts/memory/kyl-memory-profile.mjs \
  --engine=chromium \
  --url=http://127.0.0.1:4173/ \
  --out=artifacts/memory/corrected/chromium-run1 \
  --settleMs=1000 \
  --stableIntervalMs=750
```

Run repeats sequentially, never concurrently. The runner exits non-zero when a scenario or assertion fails.

Analyze accepted runs:

```bash
python3 scripts/memory/analyze-kyl-memory.py \
  --output artifacts/memory/report-validation-corrected \
  artifacts/memory/corrected/chromium-run1/memory-run-v2.json \
  artifacts/memory/corrected/chromium-run2/memory-run-v2.json \
  artifacts/memory/corrected/chromium-run3/memory-run-v2.json
```

Important interpretation rules:

- Prefer PSS/private memory over summed RSS for a multi-process browser.
- Headless Chromium may use SwiftShader; its `gpu-process` allocation is then system RAM, not measured physical VRAM.
- A negative Playwright response-body size can occur for service-worker/cached responses. The analyzer uses `Content-Length` as an explicit fallback.
- A removed iframe/worker does not prove memory has been returned immediately. Use longer cooldown samples before claiming or rejecting a leak.
