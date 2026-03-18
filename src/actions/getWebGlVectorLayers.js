import Vector from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import WebGLVectorLayer from "ol/layer/WebGLVector.js";

const mwsStyle = {
  "stroke-color": [74,144,226,1],
  "stroke-width": 1,
  "fill-color": [85,152,229,0.2],
};

const waterbodyStyle = {
  "stroke-color": [246, 252, 83, 0.8],
  "stroke-width": 2,
  "fill-color": [246, 252, 83, 0.45],
};

export default async function getWebGlPolygonLayers(layer_store, layer_name) {

  const url =
    `${process.env.REACT_APP_GEOSERVER_URL}` +
    layer_store +
    "/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=" +
    layer_store +
    ":" +
    layer_name +
    "&outputFormat=application/json&screen=main";

  const vectorSource = new Vector({
    format: new GeoJSON(),
    loader: async function () {
      try {
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error("Network response was not ok");
        }

        const json = await response.json();

        const features = vectorSource
          .getFormat()
          .readFeatures(json);

        vectorSource.addFeatures(features);

      } catch (error) {
        console.error("Failed loading layer:", layer_name, error);
      }
    },
  });

  let style = mwsStyle;

  if (layer_store === "swb") {
    style = waterbodyStyle;
  }

  const layer = new WebGLVectorLayer({
    source: vectorSource,
    style: style,
    renderBuffer: 200,
  });

  return layer;
}