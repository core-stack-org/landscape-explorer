import { PMTiles } from 'pmtiles';
import VectorTileLayer from 'ol/layer/VectorTile';
import VectorTileSource from 'ol/source/VectorTile';
import MVT from 'ol/format/MVT';
import { createXYZ } from 'ol/tilegrid';
import { Style, Fill, Stroke } from 'ol/style';

const BUCKET_URL = 'https://corestack-farm-dataset.s3.ap-south-1.amazonaws.com';

const farmStyle = new Style({
  stroke: new Stroke({ color: 'rgba(255, 179, 0, 1)', width: 1.5 }),
  fill: new Fill({ color: 'rgba(255, 179, 0, 0.01)' }),
});

function buildPmtilesUrl(stateLabel, districtLabel, blockLabel) {
  const slug = (s) => s.toLowerCase();
  return `${BUCKET_URL}/${encodeURIComponent(slug(stateLabel))}/${encodeURIComponent(slug(districtLabel))}/${encodeURIComponent(slug(blockLabel))}.pmtiles`;
}

export default async function getFarmBoundariesLayer(stateLabel, districtLabel, blockLabel) {
  const url = buildPmtilesUrl(stateLabel, districtLabel, blockLabel);
  const pmtilesFile = new PMTiles(url);

  await pmtilesFile.getHeader();

  const tileGrid = createXYZ({ minZoom: 8, maxZoom: 16 });

  const source = new VectorTileSource({
    format: new MVT(),
    tileGrid,
    tileUrlFunction: (tileCoord) => tileCoord.join('/'),
    tileLoadFunction: (tile) => {
      const [z, x, y] = tile.getTileCoord();

      //const start = performance.now();

      pmtilesFile.getZxy(z, x, y)
        .then((response) => {

          //const afterFetch = performance.now();

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

          tile.setFeatures(features);
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