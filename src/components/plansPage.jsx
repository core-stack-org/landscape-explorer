import React, { useEffect, useRef, useState, useMemo } from "react";
import { useRecoilState } from "recoil";
import TileLayer from "ol/layer/Tile";
import XYZ from "ol/source/XYZ";
import {defaults as defaultControls } from "ol/control";
import View from "ol/View";
import Map from "ol/Map";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import { Style, Fill, Stroke, Text, Circle as CircleStyle } from "ol/style";
import SelectReact from "react-select";
import LandingNavbar from "../components/landing_navbar.jsx";
import YearSlider from "./yearSlider.jsx";
import Cluster from "ol/source/Cluster";


import {
  plansAtom,
  stateDataAtom,
  stateAtom,
  districtAtom,
  blockAtom,
  districtLookupAtom,
  blockLookupAtom,
} from "../store/locationStore";

// APIs
import getStates from "../actions/getStates";
import getPlans from "../actions/getPlans";

const STATE_COORDINATES = {
  Jharkhand: [85.2799, 23.6102],
  Odisha: [85.0985, 20.9517],
  Gujarat: [71.1924, 22.2587],
  "Uttar Pradesh": [80.9462, 26.8467],
  Rajasthan: [74.2179, 27.0238],
  Bihar: [85.3131, 25.0961],
  Maharashtra: [75.7139, 19.7515],
  Chhattisgarh: [81.8661, 21.2787],
  Haryana: [76.0856, 29.0588],
  Karnataka: [75.7139, 15.3173],
  "Madhya Pradesh": [78.6569, 22.9734],
};

//  NEW FUNCTION: Meta Stats API

const getPlanMetaStats = async (organizationId = null) => {
  try {
    const url = organizationId
      ? `https://92c32fb6bade.ngrok-free.app/api/v1/watershed/plans/meta-stats/?organization_id=${organizationId}`
      : `https://92c32fb6bade.ngrok-free.app/api/v1/watershed/plans/meta-stats/`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "420",
        "X-API-KEY": "siOgP9SO.oUCc1vuWQRPkdjXjPmtIZYADe5eGl3FK",
      },
    });

    if (!response.ok) throw new Error("API error");

    return await response.json();
  } catch (err) {
    console.error("Meta stats error:", err);
    return null;
  }
};

const PlansPage = () => {
  const mapElement = useRef(null);
  const mapRef = useRef(null);

  const [organization, setOrganization] = useState();
  const [organizationOptions, setOrganizationOptions] = useState([]);
  const [metaStats, setMetaStats] = useState(null);

  const [plans, setPlans] = useRecoilState(plansAtom);
  const [rawStateData, setRawStateData] = useRecoilState(stateDataAtom);
  const [states, setStates] = useRecoilState(stateAtom);
  const [districts, setDistricts] = useRecoilState(districtAtom);
  const [blocks, setBlocks] = useRecoilState(blockAtom);
  const [districtLookup, setDistrictLookup] =    useRecoilState(districtLookupAtom);
  const [blockLookup, setBlockLookup] = useRecoilState(blockLookupAtom);
  const bubbleLayerRef = useRef(null);


  //  Load Meta Stats
  useEffect(() => {
    const loadMeta = async () => {
      const stats = await getPlanMetaStats();
      setMetaStats(stats);
      console.log(" Meta Stats:", stats);
    };
    loadMeta();
  }, []);

  //  State → Plan Count lookup
  const statePlanCounts = useMemo(() => {
    if (!metaStats?.state_breakdown) return {};
    const lookup = {};
    metaStats.state_breakdown.forEach((s) => {
      lookup[s.state_name] = s.total_plans;
    });
    return lookup;
  }, [metaStats]);

  //  1. Load organizations
  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/auth/register/available_organizations/?app_type=watershed`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "420",
          },
        }
      );

      const data = await response.json();
      setOrganizationOptions(
        data.map((org) => ({ value: org.id, label: org.name }))
      );
    } catch (error) {
      console.error("Error loading orgs:", error);
    }
  };

  //  Load PLANS once
  useEffect(() => {
    const loadPlansOnce = async () => {
      if (plans?.length > 0) return;
      const data = await getPlans();
      console.log(data)
      if (data?.raw) setPlans(data.raw);
    };
    loadPlansOnce();
  }, []);

  // Load States, Districts, Blocks
  useEffect(() => {
    const loadLocations = async () => {
      if (  states?.length > 0) return;
  
      const data = await getStates();
      setRawStateData(data);
  console.log(data)
      const stateList = data || [];
      setStates(stateList);
  
      // ------------------------------
      // DISTRICT + BLOCK LOOKUP FLAT
      // ------------------------------
  
      const districtLookupTemp = {};
      const blockLookupTemp = [];
  
      const distList = [];
      const blockList = [];
  console.log(stateList)
      stateList.forEach((state) => {
        state?.district?.forEach((d) => {
          // Collect district list
          distList.push(d);
          districtLookupTemp[d.id] = d.name;
  
          // Collect block list
          d?.blocks?.forEach((b) => {
            blockList.push(b);
            blockLookupTemp[b.id] = b.name;
          });
        });
      });
  
      // Save in recoil
      setDistricts(distList);
      setDistrictLookup(districtLookupTemp);
  
      setBlocks(blockList);
      setBlockLookup(blockLookupTemp);
  
      console.log("District Lookup:", districtLookupTemp);
      console.log("Block Lookup:", blockLookupTemp);
    };
  
    loadLocations();
  }, []);
  

  //  MAP INIT
  useEffect(() => {
    const baseLayer = new TileLayer({
      source: new XYZ({
        url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
        maxZoom: 30,
      }),
    });

    const view = new View({
      center: [78.9, 23.6],
      zoom: 6,
      projection: "EPSG:4326",
    });

    const map = new Map({
      target: mapElement.current,
      layers: [baseLayer],
      view,
      controls: defaultControls(),
    });

    mapRef.current = map;
  }, []);

  // ADD BUBBLES TO MAP (state plan counts)

useEffect(() => {
  if (!mapRef.current || !metaStats) return;

  const features = [];

  const getBubbleRadius = (plans) => {
    const base = 8;       // minimum size
    const scale = 2.2;    // bubble growth constant
    return base + Math.sqrt(plans) * scale;
  };

  metaStats.state_breakdown.forEach((state) => {
    const coords = STATE_COORDINATES[state.state_name];
    if (!coords) return;

    const total = state.total_plans;
    const radius = getBubbleRadius(total);

    const feature = new Feature({
      geometry: new Point(coords),
      name: state.state_name,
      plans: total,
    });

    feature.setStyle(
      new Style({
        image: new CircleStyle({
          radius: radius, // DYNAMIC BUBBLE SIZE HERE
          fill: new Fill({ color: "rgba(0,122,255,0.75)" }),
          stroke: new Stroke({ color: "#fff", width: 2 }),
        }),
        text: new Text({
          text: total.toString(), // number inside bubble
          font: "bold 14px sans-serif",
          fill: new Fill({ color: "#fff" }),
        }),
      })
    );

    features.push(feature);
  });

  const bubbleLayer = new VectorLayer({
    source: new VectorSource({ features }),
  });

  mapRef.current.addLayer(bubbleLayer);
}, [metaStats]);

  return (
    <div className="bg-white min-h-screen">
      <LandingNavbar />
      <div className="flex gap-8 items-start p-6">
        {/* MAP */}
        <div  className="relative border border-gray-300 rounded-lg overflow-hidden shadow" style={{ width: "60%", height: "900px" }}>
          <div ref={mapElement} className="w-full h-full" />
          <div className="absolute bottom-4 right-0 w-full max-w-xl px-4">
            <YearSlider currentLayer={[{ name: "lulc_test_layer" }]} />
          </div>
        </div>
        {/* SIDEBAR */}
        <div className="flex flex-col items-start gap-4 w-[25%] text-left mt-16">
          <label className="font-semibold text-gray-700 text-lg">
            Select Organization
          </label>
          <div className="flex items-center gap-2">
          <SelectReact value={organization} 
                      onChange={async (selected) => { setOrganization(selected);
                      if (!selected) {
                                  setMetaStats(await getPlanMetaStats());
                                  return;
                            }
                      const fullStats = await getPlanMetaStats();
                      // FILTER BY ORG
                      const orgData = fullStats.organization_breakdown.find(
                        (o) => o.organization_id === selected.value
                      );
                      if (!orgData) {
                        console.warn("No stats found for selected organization");
                        return;
                      }
                      // BUILD NEW FILTERED SUMMARY
                      const filteredStats = {
                        ...fullStats,
                        summary: {
                          total_plans: orgData.total_plans,
                          completed_plans: orgData.completed_plans,
                          in_progress_plans: orgData.total_plans - orgData.completed_plans,
                          dpr_generated: orgData.dpr_generated,
                          dpr_reviewed: orgData.dpr_approved,
                        },
                        filters_applied: {
                          organization_id: selected.value,
                        },
                      };

                      setMetaStats(filteredStats);
                    }}
                      options={organizationOptions}
                      placeholder="Select Organization"
                      styles={{
                        control: (base) => ({
                                    ...base,
                                    width: "260px",      
                                    minWidth: "260px",   
                                    maxWidth: "260px",   
                                    height: "48px",
                                    borderRadius: "8px",
                                    borderColor: "#cbd5e1",
                                    boxShadow: "none",
                                    "&:hover": {
                                      borderColor: "#94a3b8",
                                    },
                                  }),
                        menu: (base) => ({
                          ...base,
                          width: "260px",      
                        }),
                }}
            />   
            {organization && (
                <button
                    className="px-3 py-2 rounded-lg bg-red-500 text-white text-sm hover:bg-red-600 shadow"
                    onClick={async () => {
                      setOrganization(null);
                        const stats = await getPlanMetaStats(); // reload full data
                        setMetaStats(stats);
                      }}>
                      Clear
                </button>
            )}     
        </div>

          {/* METRICS CARD */}
      <div className="w-full bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-2xl p-6 shadow-sm mt-4">
      <h3 className="font-semibold text-gray-800 text-lg mb-4">
          Overview Metrics
      </h3>
      <div className="grid grid-cols-1 gap-4">
        {/* Commons Connect Operational In */}
        <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <span className="text-gray-600 font-medium">
              Commons Connect Operational In
            </span>
            <span className="text-blue-600 font-bold text-xl">
              {/* {metaStats?.summary?.total_plans ?? 0} */}--
            </span>
      </div>

        {/* No. of plans */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <span className="text-gray-600 font-medium">
              Total no. of Plans
            </span>
            <span className="text-blue-600 font-bold text-xl">
              {metaStats?.summary?.total_plans ?? 0}
            </span>
      </div>

      {/* DPRs Submitted */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <span className="text-gray-600 font-medium">DPRs Submitted</span>
            <span className="text-purple-600 font-bold text-xl">
              {metaStats?.summary?.dpr_generated ?? 0}
            </span>
      </div>

      {/* Demands Approved */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <span className="text-gray-600 font-medium">Demands Approved</span>
            <span className="text-green-600 font-bold text-xl">
              {metaStats?.summary?.dpr_reviewed ?? 0}
            </span>
      </div>

      {/* Landscape Stewards Working */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <span className="text-gray-600 font-medium">
              Landscape Stewards Working
            </span>
            <span className="text-rose-600 font-bold text-xl">
              {/* {metaStats?.summary?.in_progress_plans ?? 0} */}--
            </span>
      </div>    
    </div>
  </div>
</div>
</div>
</div>
  );
};

export default PlansPage;
