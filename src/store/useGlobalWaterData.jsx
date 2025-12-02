// src/store/useGlobalWaterData.jsx
import { useEffect } from "react";
import { useRecoilState } from "recoil";

import {
  waterGeoDataAtom,
  waterMwsDataAtom,
  zoiFeaturesAtom,
  tehsilZoiFeaturesAtom
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
  const [projectZoi, setProjectZoi] = useRecoilState(zoiFeaturesAtom);
  const [tehsilZoi, setTehsilZoi] = useRecoilState(tehsilZoiFeaturesAtom);

  useEffect(() => {
    const fetchAll = async () => {

      // ---------------- FETCH HELPER ----------------
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
          console.log("Fetching:", url);

          const res = await fetch(url);
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

      // ---------------- PROJECT MODE ----------------
      if (type === "project" && projectName && projectId) {
        const p = projectName.toLowerCase();

        geo = await fetchWFS(`water_bodies:waterbodies_${p}_${projectId}`);
        mws = await fetchWFS(`mws:waterbodies_mws_${p}_${projectId}`);
        zoi = await fetchWFS(`zoi_layers:waterbodies_zoi_${p}_${projectId}`);

        // Convert ZOI → PROJECT ZOI ATOM
        if (zoi?.features) {
          const features = new GeoJSON().readFeatures(zoi, {
            dataProjection: "EPSG:4326",
            featureProjection: "EPSG:4326"
          });
          setProjectZoi(features);
        } else {
          setProjectZoi([]);
        }

        // CLEAR tehsil zoi
        setTehsilZoi([]);
      }

      // ---------------- TEHSIL MODE ----------------
      if (type === "tehsil" && district && block) {
        const d = district.toLowerCase().replace(/\s+/g, "_");
        const b = block.toLowerCase().replace(/\s+/g, "_");

        // water_bodies workspace
        zoi = await fetchWFS(`water_bodies:waterbodies_zoi_${d}_${b}`);

        // fallback
        if (!zoi?.features?.length) {
          zoi = await fetchWFS(`zoi_layers:waterbodies_zoi_${d}_${b}`);
        }

        // Convert ZOI → TEHSIL ZOI ATOM
        if (zoi?.features) {
          const features = new GeoJSON().readFeatures(zoi, {
            dataProjection: "EPSG:4326",
            featureProjection: "EPSG:4326"
          });
          setTehsilZoi(features);
        } else {
          setTehsilZoi([]);
        }

        // TEHSIL MODE DOES NOT USE project ZOI
        setProjectZoi([]);
      }

      // ---------------- SET GEO + MWS ----------------
      setGeo(geo || null);
      setMws(mws || null);
    };

    fetchAll();
  }, [type, projectName, projectId, state, district, block]);

  return {
    geoData: waterGeoData,
    mwsData: waterMwsData,
    projectZoi,
    tehsilZoi,
  };
};
