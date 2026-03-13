import { Fill, Stroke, Style } from "ol/style.js";
import Vector from "ol/source/Vector";
import VectorLayer from "ol/layer/Vector";
import GeoJSON from "ol/format/GeoJSON";

const PanchayatBoundariesStyle = () => {
  return new Style({
    stroke: new Stroke({
      color: "#292929",
      width: 2.0,
    }),
    fill: new Fill({
      color: "rgba(255, 255, 255, 0)",
    }),
  });
};

export default async function getVectorLayers(layer_store, layer_name, setVisible = true, setActive = true, resource_type = null, plan_id = null, district, block, ifBoundary = false) {

  const url =
    plan_id === null
      ? `${process.env.REACT_APP_GEOSERVER_URL}${layer_store}/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=${layer_store}:${layer_name}&outputFormat=application/json&screen=main`
      : `${process.env.REACT_APP_GEOSERVER_URL}${layer_store}/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=${layer_store}:${resource_type}_${plan_id}_${district}_${block}&outputFormat=application/json&screen=main`;

  console.log("Layer URL:", url);

  const vectorSource = new Vector({
    format: new GeoJSON(),

    loader: function () {
      fetch(url)
        .then((response) => {
          if (!response.ok) {
            throw new Error("Network response was not ok");
          }
          return response.json();
        })
        .then((json) => {
          if (!json || !json.features) return;

          // Apply condition ONLY when ifBoundary is true
          if (ifBoundary === true) {
            json.features.forEach((feature) => {
              feature.properties = null;
            });
          }

          const features = vectorSource
            .getFormat()
            .readFeatures(json);

          vectorSource.addFeatures(features);
        })
        .catch((error) => {
          console.log(
            `Failed to load the "${layer_name}" layer.`,
            error
          );
        });
    },
  });

  const vectorLayer = new VectorLayer({
    source: vectorSource,
    visible: setVisible,
    hover: setActive,
    myData: Math.random(),
  });

  // Apply correct style
  if (ifBoundary === true) {
    vectorLayer.setStyle(PanchayatBoundariesStyle);
  } else {
    vectorLayer.setStyle(() => {
      return new Style({
        stroke: new Stroke({
          color: "black",
          width: 1.2,
        }),
        fill: new Fill({
          color: "rgba(0, 0, 255, 0.25)",
        }),
      });
    });
  }

  return vectorLayer;
}
