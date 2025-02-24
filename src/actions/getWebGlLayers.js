import Vector from "ol/source/Vector";
import GeoJSON from 'ol/format/GeoJSON';

import WebGLPointsLayer from 'ol/layer/WebGLPoints.js';

const colorMapping = {
  "Household Livelihood": 1, // Maroon
  "Others - HH, Community": 2, // Blue-Grey
  "Agri Impact - HH, Community": 3, // Yellow
  "SWC - Landscape level impact": 4, // Brown
  "Irrigation - Site level impact": 5, // Blue
  "Plantation": 6, // Green
  "Un Identified": 7, // Lavender
  "Default": 8, // Tan
};


export default async function getWebGlLayers(layer_store, layer_name){

    let url = `${process.env.REACT_APP_GEOSERVER_URL}` + layer_store + '/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=' + layer_store + ':' + layer_name + "&outputFormat=application/json&screen=main"

    const vectorSource = new Vector({
      url: url,
      format: new GeoJSON(),
      loader: async function (extent, resolution, projection) {
        await fetch(url).then(response => {
          if (!response.ok) {
            throw new Error('Network response was not ok for ' + layer_name);
          }
          return response.json();
        }).then(json => {
          vectorSource.addFeatures(vectorSource.getFormat().readFeatures(json).map((item)=>{
  
            item.values_.itemColor = colorMapping[item.values_.WorkCatego] ? colorMapping[item.values_.WorkCatego] : colorMapping["Default"]
            return item;
  
          }));
        }).catch(error => {
          console.log(error);
        });
      }
    });
  
    const style = {
      "shape-points": 12,
      "shape-radius": 6,
      "shape-fill-color": [
          "match",
          [
              "get",
              "itemColor"
          ],
          4,
          "#6495ED",
          1,
          "#C2678D",
          3,
          "#FFA500",
          5,
          "#1A759F",
          6,
          "#52B69A",
          2,
          "#355070",
          7,
          "#6D597A",
          "#00000000"
      ]
    }
  
    let wmsLayer = new WebGLPointsLayer({
      source : vectorSource,
      style: style,
    })
  
    return wmsLayer;
}