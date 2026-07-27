# CoRE-GeoStack knowledge base

This directory is the maintained memory of CoRE-GeoStack. It explains what the
platform is, why its boundaries exist, how its data and rendering contracts
work, what has been learned, and what the next contributor should do.

Start with:

1. [Product principles](PRODUCT_PRINCIPLES.md)
2. [Architecture](ARCHITECTURE.md)
3. [Data contracts](DATA_CONTRACTS.md)
4. [Performance budgets](PERFORMANCE_BUDGETS.md)
5. [Observability and privacy](OBSERVABILITY.md)
6. [Approved visual contract](VISUAL_CONTRACT.md)
7. [Roadmap](ROADMAP.md)
8. [Current handoff](handoffs/CURRENT.md)

Architectural decisions are immutable records under [`decisions/`](decisions/).
When a decision changes, add a superseding ADR rather than rewriting history.
Cycle handoffs work the same way: update `handoffs/CURRENT.md` and add a dated
snapshot. Append durable findings to [LEARNING_LOG.md](LEARNING_LOG.md).

Run `npm run check:core-geostack` before handing off a cycle. The check ensures
that the required knowledge files and current handoff stay present.

## Open the application

Use Node 22. On this repository's `/mnt/y` Windows-mounted filesystem, use the
production preview for routine review:

```bash
cd /mnt/y/core-stack-org/landscape-explorer

export NVM_DIR="${HOME}/.nvm"
. "${NVM_DIR}/nvm.sh"
nvm use 22

npm start
```

Open <http://127.0.0.1:4173/>. If `dist/` is missing or source changed, build
once and then start:

```bash
mkdir -p /tmp/core-geostack-vite-tmp
TMPDIR=/tmp/core-geostack-vite-tmp npm run build
npm start
```

When Chrome runs inside WSL and reports `WebGL1 blocklisted` or
`WebGL2 blocklisted`, keep `npm start` running and open a second WSL terminal:

```bash
cd /mnt/y/core-stack-org/landscape-explorer
npm run open:wsl
```

The command launches a dedicated Chrome profile with Chromium's explicit
SwiftShader WebGL opt-in. Do not reuse that profile for untrusted websites.
DBus/UPower and deprecated GCM endpoint messages printed by WSL Chrome do not
prevent the map from rendering.

Do not use the cold Vite development graph on `/mnt/y` for ordinary review.
The application imports more than 7,000 modules and dependency optimization on
the Windows `9p` mount can consume gigabytes of memory without painting the
shell for several minutes. Contributors who need hot-module replacement should
use a clone/worktree and `node_modules` on WSL's native Linux filesystem, then
run:

```bash
npm run dev -w geolibre-desktop -- --host 127.0.0.1 --port 5173
```

## Current platform boundary

CoRE-GeoStack is developed incrementally from `platform/core-geostack`.
The current Stories and observability cycle lives on
`platform/core-geostack-stories-observability`. Legacy deployment work
continues independently on the repository's existing branches.

The CoRE-specific implementation currently lives in
`apps/geolibre-desktop/src/core-geostack/`. Upstream-facing changes should stay
small and deliberate:

- register the CoRE-GeoStack plugin;
- expose the approved mode bar and product name;
- keep Focus, tehsil-filtered Explore, and generalized tehsil Stories in one
  shared KYL workspace;
- restore the plugin when the underlying MapLibre instance is recreated;
- keep deployment configuration in environment variables and the admin profile.

## Knowledge update rule

A cycle is not complete until its implementation evidence, known limitations,
and next executable step are recorded in the current handoff. Documentation is
part of the product contract, not release-note cleanup.
