// src/store/useGlobalWaterData.jsx
import { useEffect } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import {
  waterGeoDataAtom,
  waterMwsDataAtom,
  zoiFeaturesAtom
} from "./locationStore";
import GeoJSON from "ol/format/GeoJSON";

export const useGlobalWaterData = ({
  type,
  projectName,
  projectId,
  state,
  district,
  block
}) => {

  const [waterGeoData, setGeo] = useRecoilState(waterGeoDataAtom);
  const [waterMwsData, setMws] = useRecoilState(waterMwsDataAtom);
  const [zoiFeatures, setZoi] = useRecoilState(zoiFeaturesAtom);

  useEffect(() => {
    const fetchAll = async () => {
      const fetchWFS = async (typeName) => {
        if (!typeName) return null;

        const workspace = typeName.split(":")[0];
        const base = `https://geoserver.core-stack.org:8443/geoserver/${workspace}/wms?`;

        const params = new URLSearchParams({
          service: "WFS",
          version: "1.0.0",
          request: "GetFeature",
          typeName,
          outputFormat: "application/json",
        });

        try {
          const url = base + params.toString();
          const res = await fetch(url);
          console.log(url)
          if (!res.ok) return null;
          return await res.json();
        } catch (e) {
          console.log("WFS Fetch Error:", e);
          return null;
        }
      };

      let geo = null;
      let mws = null;
      let zoi = null;

      // ------------------ PROJECT MODE ------------------
      if (type === "project" && projectName && projectId) {
        const p = projectName.toLowerCase();
        console.log(p)

        geo = await fetchWFS(`water_bodies:waterbodies_${p}_${projectId}`);
        mws = await fetchWFS(`mws:waterbodies_mws_${p}_${projectId}`);
        zoi = await fetchWFS(`zoi_layers:waterbodies_zoi_${p}_${projectId}`);
      }


      // ------------------ TEHSIL MODE ------------------
      // if (type === "tehsil" && district && block) {
      //   const d = district.toLowerCase().replace(/\s+/g, "_");
      //   const b = block.toLowerCase().replace(/\s+/g, "_");

      //   mws = await fetchWFS(`mws:waterbodies_mws_${d}_${b}`);
      //   zoi = await fetchWFS(`water_bodies:waterbodies_zoi_${d}_${b}`);
      // }

      // save to recoil
      setGeo(geo || null);
      setMws(mws || null);

      if (zoi?.features) {
        const features = new GeoJSON().readFeatures(zoi, {
          dataProjection: "EPSG:4326",
          featureProjection: "EPSG:4326",
        });
        setZoi(features);
      } else {
        setZoi([]);
      }
    };

    fetchAll();
  }, [type, projectName, projectId, state, district, block]);

  return {
    geoData: waterGeoData,
    mwsData: waterMwsData,
    zoiData: zoiFeatures,
  };
};
