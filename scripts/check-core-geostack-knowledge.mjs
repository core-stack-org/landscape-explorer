import { access, readFile } from "node:fs/promises";

const required = [
  "docs/core-geostack/README.md",
  "docs/core-geostack/PRODUCT_PRINCIPLES.md",
  "docs/core-geostack/ARCHITECTURE.md",
  "docs/core-geostack/DATA_CONTRACTS.md",
  "docs/core-geostack/PERFORMANCE_BUDGETS.md",
  "docs/core-geostack/OBSERVABILITY.md",
  "docs/core-geostack/VISUAL_CONTRACT.md",
  "docs/core-geostack/ROADMAP.md",
  "docs/core-geostack/LEARNING_LOG.md",
  "docs/core-geostack/handoffs/CURRENT.md",
];

for (const path of required) await access(path);

const current = await readFile("docs/core-geostack/handoffs/CURRENT.md", "utf8");
for (const heading of [
  "## Branch and base",
  "## Implemented",
  "## Known limitations",
  "## Next executable step",
]) {
  if (!current.includes(heading)) {
    throw new Error(`Current handoff is missing required section: ${heading}`);
  }
}

console.log(`CoRE-GeoStack knowledge base: ${required.length} required files present.`);
