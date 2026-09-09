import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
const source = fs.readFileSync('src/config/geolibreLayers.js', 'utf8');
const { GEOLIBRE_LAYERS } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const names = {district:'{district}', tehsil:'{tehsil}'};
const layers = GEOLIBRE_LAYERS.map(layer => ({id:layer.id, label:layer.label, service:layer.sourceType === 'wfs' ? 'WFS':'WMS', workspace:layer.workspace, layerNameTemplate:layer.layerName(names)}));
const extra = [
 ['mws','Micro-watersheds and basins','mws','mws_{district}_{tehsil}'],
 ['mws_connectivity','Upstream and downstream micro-watersheds','mws_connectivity','{district}_{tehsil}_mws_connectivity'],
 ['dem_vector','Elevation summary','dem','{district}_{tehsil}_dem_vector'],
 ['drainage_density','Drainage density','drainage_density','{district}_{tehsil}_drainage_density'],
 ['stream_order','Stream-order shares','stream_order','stream_order_{district}_{tehsil}_vector'],
 ['lulc_vector','Land-cover areas','lulc_vector','lulc_vector_{district}_{tehsil}'],
];
for (const [id,label,workspace,layerNameTemplate] of extra) layers.push({id,label,service:'WFS',workspace,layerNameTemplate});
for (const kind of ['crop','tree','shrub']) layers.push({id:`ndvi_${kind}`,label:`NDVI on ${kind}`,service:'WFS',workspace:'ndvi_timeseries',layerNameTemplate:`ndvi_timeseries_{district}_{tehsil}_${kind}`});
export const manifest = layers;
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) console.log(JSON.stringify(layers,null,2));
