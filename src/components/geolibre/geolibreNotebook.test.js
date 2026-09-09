import { GEOLIBRE_NOTEBOOK_CATALOGUE, injectGeoLibreNotebookScope, geoLibreNotebookFilename, loadGeoLibreNotebookTemplate } from './geolibreNotebook';
import fs from 'fs';
import path from 'path';
const project = {metadata:{scope:{state:'Bihar',district:'Nalanda',tehsil:'Hilsa',bounds:[1,2,3,4]}}};
test('all six downloadable notebooks have the same injectable setup and valid catalogue entries', () => {
  expect(GEOLIBRE_NOTEBOOK_CATALOGUE).toHaveLength(6);
  for (const entry of GEOLIBRE_NOTEBOOK_CATALOGUE) {
    const notebook = JSON.parse(fs.readFileSync(path.join(process.cwd(),'public/geolibre-notebooks',entry.filename),'utf8'));
    const original = JSON.stringify(notebook);
    const scoped = injectGeoLibreNotebookScope(notebook,project,'2026-09-09T00:00:00Z');
    expect(scoped.metadata.corestack.generatedFor.tehsil).toBe('Hilsa');
    expect(scoped.cells.filter(c=>c.source.some(line=>line.startsWith('SCOPE = json.loads(')))).toHaveLength(1);
    expect(JSON.stringify(notebook)).toBe(original);
    expect(geoLibreNotebookFilename(entry.id,project)).toMatch(/^core-stack-hilsa-/);
    expect(notebook.cells.filter(c=>c.cell_type==='code').every(c=>c.execution_count===null && c.outputs.length===0)).toBe(true);
  }
});
test('scope is JSON encoded rather than inserted as Python code',()=>{
  const entry=GEOLIBRE_NOTEBOOK_CATALOGUE[0];
  const notebook=JSON.parse(fs.readFileSync(path.join(process.cwd(),'public/geolibre-notebooks',entry.filename),'utf8'));
  const malicious={metadata:{scope:{state:'Bihar',district:'Nalanda',tehsil:'x\"); print("oops") #'}}};
  const result=injectGeoLibreNotebookScope(notebook,malicious);
  const line=result.cells.flatMap(c=>c.source).find(s=>s.startsWith('SCOPE = json.loads('));
  expect(JSON.parse(JSON.parse(line.slice('SCOPE = json.loads('.length,-2))).tehsil).toBe(malicious.metadata.scope.tehsil);
});
test('missing scope and failed downloads show useful errors',async()=>{
  expect(()=>geoLibreNotebookFilename('start',{})).toThrow('Select a state');
  await expect(loadGeoLibreNotebookTemplate('start',async()=>({ok:false,status:404}))).rejects.toThrow('HTTP 404');
});
