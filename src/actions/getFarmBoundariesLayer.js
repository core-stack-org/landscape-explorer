import { PMTiles } from 'pmtiles';
import VectorTileLayer from 'ol/layer/VectorTile';
import VectorTileSource from 'ol/source/VectorTile';
import MVT from 'ol/format/MVT';
import { createXYZ } from 'ol/tilegrid';
import { Style, Fill, Stroke } from 'ol/style';

const BUCKET_URL = 'https://corestack-farm-dataset.s3.ap-south-1.amazonaws.com';

// Amber/gold — deliberately distinct from the village-selected yellow
// (rgba(255,225,0,1)) so the two boundary types stay visually separable
// when both are on screen at once.
const farmStyle = new Style({
  stroke: new Stroke({ color: 'rgba(255, 179, 0, 1)', width: 1.5 }),
  fill: new Fill({ color: 'rgba(255, 179, 0, 0.01)' }),
});

function buildPmtilesUrl(stateLabel, districtLabel, blockLabel) {
  const slug = (s) => s.toLowerCase();
  return `${BUCKET_URL}/${encodeURIComponent(slug(stateLabel))}/${encodeURIComponent(slug(districtLabel))}/${encodeURIComponent(slug(blockLabel))}.pmtiles`;
}

// Throws if the file doesn't exist for this location — caller should catch
// and show an error rather than silently rendering an empty layer.
export default async function getFarmBoundariesLayer(stateLabel, districtLabel, blockLabel) {
  const url = buildPmtilesUrl(stateLabel, districtLabel, blockLabel);
  const pmtilesFile = new PMTiles(url);

  // Validates the file actually exists/loads before we build a layer around it —
  // without this, a missing file fails silently per-tile instead of surfacing
  // as a toggle error.
  await pmtilesFile.getHeader();

  const tileGrid = createXYZ({ minZoom: 8, maxZoom: 16 });

  const source = new VectorTileSource({
    format: new MVT(),
    tileGrid,
    tileUrlFunction: (tileCoord) => tileCoord.join('/'),
    tileLoadFunction: (tile) => {
      const [z, x, y] = tile.getTileCoord();

      const start = performance.now();

      pmtilesFile.getZxy(z, x, y)
        .then((response) => {

          const afterFetch = performance.now();

          if (!response?.data) {
            tile.setFeatures([]);
            return;
          }

          const tileExtent =
            tileGrid.getTileCoordExtent(tile.getTileCoord());

          const features = new MVT().readFeatures(response.data, {
            extent: tileExtent,
            featureProjection: 'EPSG:3857',
          });

          const afterDecode = performance.now();

          tile.setFeatures(features);

          const afterSet = performance.now();

          console.log({
            tile: [z, x, y],
            bytes: response.data.byteLength,
            features: features.length,
            fetchMs: afterFetch - start,
            decodeMs: afterDecode - afterFetch,
            setFeaturesMs: afterSet - afterDecode,
            totalMs: afterSet - start,
          });
        })
        .catch((error) => {
          console.error('PMTiles tile error', error);
          tile.setFeatures([]);
        });
      }
  });

  return new VectorTileLayer({
    source,
    renderMode: 'hybrid',
    style: farmStyle,
  });
}