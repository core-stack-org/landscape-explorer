import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { transformSync } from "@babel/core";
import fieldMetadata from "../../src/config/geolibreFieldMetadata.json" with { type: "json" };
import { fieldDefinitionFor } from "../../src/config/geolibreFieldUnits.js";

// The application catalog uses CRA's JSON imports. Compile that local module
// in memory so the audit can use the same catalog in Node without changing
// the browser module's import contract.
const catalogUrl = new URL("../../src/config/geolibreLayers.js", import.meta.url);
const { code } = transformSync(readFileSync(catalogUrl, "utf8"), {
  babelrc: false, configFile: false, plugins: ["@babel/plugin-transform-modules-commonjs"],
});
const catalogModule = { exports: {} };
new Function("require", "module", "exports", code)(createRequire(catalogUrl), catalogModule, catalogModule.exports);
const { GEOLIBRE_LAYERS } = catalogModule.exports;

const scopes = [
  ["cachar", "lakhipur"],
  ["nalanda", "hilsa"],
  ["banka", "banka"],
  ["dumka", "masalia"],
];
const baseUrl = process.env.REACT_APP_GEOSERVER_URL || "https://geoserver.core-stack.org:8443/geoserver/";
const vectors = GEOLIBRE_LAYERS.filter((layer) => layer.sourceType === "wfs");
const rasters = GEOLIBRE_LAYERS.filter((layer) => layer.sourceType === "wms");
const jobs = scopes.flatMap(([district, tehsil]) => [...vectors, ...rasters].map((layer) => ({
  layer,
  scope: { district, tehsil },
}))).filter((job) => !job.layer.nregaCategoryId || job.layer.nregaCategoryId === "land_restoration");

let next = 0;
async function worker() {
  while (next < jobs.length) {
    const job = jobs[next++];
    const { layer, scope } = job;
    const name = layer.layerName(scope);
    if (layer.sourceType === "wms") {
      const params = new URLSearchParams({
        service: "WMS", version: "1.1.1", request: "GetMap",
        layers: `${layer.workspace}:${name}`, styles: layer.rasterStyle || "",
        format: "image/png", transparent: "true", srs: "EPSG:4326",
        bbox: "80,20,90,30", width: "16", height: "16",
      });
      try {
        const response = await fetch(`${baseUrl.replace(/\/?$/, "/")}${layer.workspace}/wms?${params}`, {
          method: "HEAD", signal: AbortSignal.timeout(12000),
        });
        job.status = response.headers.get("content-type")?.toLowerCase().startsWith("image/png")
          ? "present" : "absent";
      } catch (error) {
        job.status = `error:${error.name}`;
      }
      continue;
    }
    const params = new URLSearchParams({
      service: "WFS", version: "1.0.0", request: "DescribeFeatureType",
      typeName: `${layer.workspace}:${name}`,
    });
    const url = `${baseUrl.replace(/\/?$/, "/")}${layer.workspace}/ows?${params}`;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
      const xml = await response.text();
      if (!xml.includes("<xsd:schema")) {
        job.status = "absent";
        continue;
      }
      const schemaFields = [...xml.matchAll(/<xsd:element\s+[^>]*name="([^"]+)"[^>]*type="([^"]+)"/g)]
        .map((match) => ({ name: match[1], type: match[2] }));
      const fields = schemaFields.map((field) => field.name)
        .filter((field) => field !== name && !["the_geom", "geometry", "geom"].includes(field));
      job.fields = fields;
      job.unmapped = fields.filter((field) => !fieldDefinitionFor(layer, field, fieldMetadata));
      job.suspicious = schemaFields.filter(({ name: field, type }) => {
        if (!fields.includes(field) || type !== "xsd:string") return false;
        const unit = (layer.unitSources || []).map((source) => fieldMetadata[source]?.[field]?.unit).find(Boolean);
        return unit && !["NA", "unknown", "boolean", "mixed", "dimensionless", "year"].includes(unit);
      }).map(({ name: field }) => field);
      job.status = "present";
    } catch (error) {
      job.status = `error:${error.name}`;
    }
  }
}

await Promise.all(Array.from({ length: 8 }, worker));
for (const [district, tehsil] of scopes) {
  const scopeJobs = jobs.filter((job) => job.scope.district === district && job.scope.tehsil === tehsil);
  const present = scopeJobs.filter((job) => job.status === "present");
  const unmapped = scopeJobs.filter((job) => job.unmapped?.length);
  const suspicious = scopeJobs.filter((job) => job.suspicious?.length);
  console.log(`${district}_${tehsil}: ${present.filter((job) => job.layer.sourceType === "wfs").length}/${scopeJobs.filter((job) => job.layer.sourceType === "wfs").length} WFS, ${present.filter((job) => job.layer.sourceType === "wms").length}/${scopeJobs.filter((job) => job.layer.sourceType === "wms").length} WMS present, ${unmapped.length} with fields lacking a specific unit rule (runtime marks unresolved numeric units unknown)`);
  for (const job of unmapped) console.log(`  ${job.layer.id}: ${job.unmapped.length} missing (${job.unmapped.slice(0, 8).join(", ")}${job.unmapped.length > 8 ? ", ..." : ""})`);
  if (suspicious.length) {
    console.log(`  ${suspicious.length} layers have string fields with physical units in the source dictionary`);
    if (district === "cachar") for (const job of suspicious) console.log(`    ${job.layer.id}: ${job.suspicious.slice(0, 8).join(", ")}`);
  }
  for (const job of scopeJobs.filter((item) => item.status !== "present")) {
    console.log(`  ${job.layer.id}: ${job.status}`);
  }
}
