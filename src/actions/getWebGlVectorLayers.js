import Vector from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import WebGLVectorLayer from "ol/layer/WebGLVector.js";

const mwsStyle = {
  "stroke-color": [74, 144, 226, 1],
  "stroke-width": 2,
  "fill-color": [85, 152, 229, 0.2],
};

const waterbodyStyle = {
  "stroke-color": [246, 252, 83, 0.8],
  "stroke-width": 2,
  "fill-color": [246, 252, 83, 0.45],
};

const drainageStyle = {
  "stroke-color": [
    "match",
    ["get", "ORDER"],
    1, "#03045E",
    2, "#023E8A",
    3, "#0077B6",
    4, "#0096C7",
    5, "#00B4D8",
    6, "#48CAE4",
    7, "#90E0EF",
    8, "#ADE8F4",
    9, "#CAF0F8",
    "#ffffff99"
  ],
  "stroke-width": 2
};

export default async function getWebGlPolygonLayers(
  layer_store,
  layer_name
) {
  const url =
    `${process.env.REACT_APP_GEOSERVER_URL}` +
    layer_store +
    "/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=" +
    layer_store +
    ":" +
    layer_name +
    "&outputFormat=application/json&screen=main";

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed loading layer: ${layer_name}`);
  }

  const json = await response.json();

  const features = new GeoJSON().readFeatures(json);

  const vectorSource = new Vector({
    features,
  });

  // Preserve your style selection logic
  let style = mwsStyle;

  if (layer_store === "swb") {
    style = waterbodyStyle;
  } else if (layer_store === "drainage") {
    style = drainageStyle;
  }

  return new WebGLVectorLayer({
    source: vectorSource,
    style,
    renderBuffer: 200,
  });
}