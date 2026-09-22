/* Synchronize the private authoring CSV when present; deployments use the
 * committed manifest when .local is intentionally absent. */
const fs = require("node:fs");
const path = require("node:path");
const XLSX = require("xlsx");

const root = path.resolve(__dirname, "../..");
const source = path.join(root, ".local/units/layers_used_sugestions.csv");
const output = path.join(root, "src/config/geolibreLayerPresentation.json");
const groups = {
  Demographic: "demographic", "Village Data": "village-data",
  Hydrology: "hydrology", "Land Use Land Cover": "lulc", Land: "land",
  Trees: "trees", Agriculture: "agriculture", Restoration: "restoration",
  Industry: "industry", NREGA: "nrega",
};

if (!fs.existsSync(source)) {
  if (!fs.existsSync(output)) throw new Error("Missing GeoLibre presentation manifest");
  console.log("GeoLibre: using committed presentation manifest (.local CSV absent).");
} else {
  const workbook = XLSX.read(fs.readFileSync(source, "utf8"), { type: "string", raw: true });
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });
  const ids = new Set();
  const completedGroups = new Set();
  let previousGroup;
  const manifest = rows.map(row => {
    const id = row["Layer ID"];
    if (!id || ids.has(id)) throw new Error(`Missing or duplicate Layer ID: ${id}`);
    ids.add(id);
    if (!groups[row.Group]) throw new Error(`Unknown group: ${row.Group}`);
    if (previousGroup !== row.Group) {
      if (completedGroups.has(row.Group)) throw new Error(`Group rows must be consecutive: ${row.Group}`);
      if (previousGroup) completedGroups.add(previousGroup);
      previousGroup = row.Group;
    }
    if (!["WFS", "WMS"].includes(row["Source Type"])) throw new Error(`Invalid source type: ${id}`);
    if (!row["Default property shown"] || !row.changes_made) throw new Error(`Missing property or changes record: ${id}`);
    if (row.added === "new" && !row["Style availability / action"]) throw new Error(`Missing new-layer style status: ${id}`);
    return {
      id, label: row["Layer Name"], category: row["Suffix (categorisation)"],
      groupId: groups[row.Group], groupName: row.Group,
      sourceType: row["Source Type"].toLowerCase(), workspace: row.Workspace,
      sourcePattern: row["GeoServer Name Pattern"],
      style: row["Style Profile / Raster Style"] === "GeoServer layer default" ? "" : row["Style Profile / Raster Style"],
      defaultVisible: row["Default Visible"] === "Yes",
      defaultProperty: row["Default property shown"],
    };
  });
  if (!manifest.length) throw new Error("Empty GeoLibre CSV");
  const generated = JSON.stringify(manifest, null, 2) + "\n";
  if (!fs.existsSync(output) || fs.readFileSync(output, "utf8") !== generated) fs.writeFileSync(output, generated);
  console.log(`GeoLibre: synchronized ${manifest.length} layers from CSV.`);
}
