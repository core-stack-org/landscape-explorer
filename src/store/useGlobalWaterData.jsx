import { useEffect } from "react";
import { useRecoilState } from "recoil";

import {
  waterGeoDataAtom,
  waterMwsDataAtom,
  zoiFeaturesAtom,
  tehsilZoiFeaturesAtom,
  tehsilDroughtDataAtom
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
  const [tehsilDrought, setTehsilDrought] = useRecoilState(tehsilDroughtDataAtom);

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

        const fullURL = base + params.toString();
        console.log("Fetching WFS:", fullURL);


        try {
          const res = await fetch(base + params.toString());
          if (!res.ok) return null;
          return await res.json();
        } catch (e) {
          console.log(" WFS Fetch Error:", typeName, e);
          return null;
        }
      };

      let geo = null;
      let mws = null;
      let zoi = null;
      let drought = null;

      //  PROJECT MODE
      if (type === "project" && projectName && projectId) {
        const p = projectName.toLowerCase();

        geo = await fetchWFS(`swb:waterbodies_${p}_${projectId}`);
        mws = await fetchWFS(`mws:waterbodies_mws_${p}_${projectId}`);
        zoi = await fetchWFS(`zoi_layers:waterbodies_zoi_${p}_${projectId}`);

        if (zoi?.features) {
          setProjectZoi(
            new GeoJSON().readFeatures(zoi, {
              dataProjection: "EPSG:4326",
              featureProjection: "EPSG:4326",
            })
          );
        } else setProjectZoi([]);

        // CLEAR tehsil atoms
        setTehsilZoi([]);
        setTehsilDrought(null);
      }

      //  TEHSIL MODE
      if (type === "tehsil" && district && block) {
        const d = district.toLowerCase().replace(/\s+/g, "_");
        const b = block.toLowerCase().replace(/\s+/g, "_");

        // ZOI
        zoi = await fetchWFS(`swb:waterbodies_zoi_${d}_${b}`);
        if (!zoi?.features?.length) {
          // zoi = await fetchWFS(`water_bodies:waterbodies_zoi_${d}_${b}`);
        }

        if (zoi?.features) {
          setTehsilZoi(
            new GeoJSON().readFeatures(zoi, {
              dataProjection: "EPSG:4326",
              featureProjection: "EPSG:4326",
            })
          );
        } else setTehsilZoi([]);


       // NEW: DROUGHT FETCH FOR TEHSIL
      const droughtTypeName = `drought:${d}_${b}_drought`;

// PRINT FULL URL BEFORE FETCHING
          const droughtWorkspace = droughtTypeName.split(":")[0];
          const droughtBase = `https://geoserver.core-stack.org:8443/geoserver/${droughtWorkspace}/wms?`;
          const droughtParams = new URLSearchParams({
            service: "WFS",
            version: "1.0.0",
            request: "GetFeature",
            typeName: droughtTypeName,
            outputFormat: "application/json",
          });
          console.log("Drought WFS URL:", droughtBase + droughtParams.toString());

          drought = await fetchWFS(droughtTypeName);


        if (drought?.features) {
          setTehsilDrought(
            new GeoJSON().readFeatures(drought, {
              dataProjection: "EPSG:4326",
              featureProjection: "EPSG:4326",
            })
          );
        } else {
          setTehsilDrought([]);
        }

        // clear project zoi
        setProjectZoi([]);
      }

      // -------------------- Set GEO + MWS --------------------
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
    tehsilDrought
  };
};
