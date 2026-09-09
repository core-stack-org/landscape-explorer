// Create local JS/Python parity cases from one GeoJSON sample per source.
// No data files or execution outputs are included in the public build.
import {readFile, mkdir, writeFile} from "node:fs/promises";
import path from "node:path";
const sampleDirectory = path.resolve(process.argv[2] || ".local/notebooks/source-samples");
const directory = path.resolve(process.argv[3] || ".local/visualise-validation");
const moduleText = await readFile("src/components/geolibre/visualiseData.js", "utf8");
const groups = await readFile("src/components/geolibre/villageSurveyGroups.json", "utf8");
// Group definitions must exist before VIEWS is evaluated.
const content = `const villageGroups = ${groups};\n` + moduleText.replace(/^import .*;$/gm, "");
const {VIEWS, chartRows, pythonExample} = await import(`data:text/javascript;base64,${Buffer.from(content).toString("base64")}`);
await mkdir(directory, {recursive:true});
const index = JSON.parse(await readFile(path.join(sampleDirectory,"index.json"),"utf8"));
const manifest = [];
for (const view of VIEWS) {
  const layer = view.layer === "demographics" ? "administrative_boundaries" : view.layer;
  const entry = index.find(item => item.layer === layer);
  const sample = JSON.parse(await readFile(path.join(sampleDirectory,entry.sample),"utf8"));
  const record = sample.features[0].properties;
  const idField = view.idField || "uid";
  // A missing identifier in a sample is given a fixture-only ID to exercise numeric transformations.
  if (record[idField] === null || record[idField] === undefined) record[idField] = view.entity === "Village" ? 123 : "sample";
  const code = pythonExample(view,{},entry.url,String(record[idField]),"All years");
  const rows = chartRows(view,record);
  await writeFile(path.join(directory,`${view.id}.py`),code);
  await writeFile(path.join(directory,`${view.id}.case.json`),JSON.stringify({sample,rows,view}));
  manifest.push(view.id);
}
await writeFile(path.join(directory,"cases.json"),JSON.stringify(manifest));
console.log(`Wrote ${manifest.length} parity cases to ${directory}`);
