import React, { useEffect, useRef, useState, useMemo } from "react";
import { useRecoilState } from "recoil";

import TileLayer from "ol/layer/Tile";
import XYZ from "ol/source/XYZ";
import { Control, defaults as defaultControls } from "ol/control";
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

// ---------------------------
// ⭐ NEW FUNCTION: Meta Stats API
// ---------------------------
const getPlanMetaStats = async () => {
  try {
    const response = await fetch(
      "https://614f0dbf85ed.ngrok-free.app/api/v1/watershed/plans/meta-stats/",
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "420",
          "X-API-KEY": "siOgP9SO.oUCc1vuWQRPkdjXjPmtIZYADe5eGl3FK",
        },
      }
    );

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
  const [districtLookup, setDistrictLookup] =
    useRecoilState(districtLookupAtom);
  const [blockLookup, setBlockLookup] = useRecoilState(blockLookupAtom);

  // -----------------------------------
  // ⭐ Load Meta Stats
  // -----------------------------------
  useEffect(() => {
    const loadMeta = async () => {
      const stats = await getPlanMetaStats();
      setMetaStats(stats);
      console.log("📊 Meta Stats:", stats);
    };
    loadMeta();
  }, []);

  // -----------------------------------
  // ⭐ State → Plan Count lookup
  // -----------------------------------
  const statePlanCounts = useMemo(() => {
    if (!metaStats?.state_breakdown) return {};
    const lookup = {};
    metaStats.state_breakdown.forEach((s) => {
      lookup[s.state_name] = s.total_plans;
    });
    return lookup;
  }, [metaStats]);

  // ======================================================
  // ⭐ 1. Load organizations
  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/auth/register/available_organizations/`,
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

  // ======================================================
  // ⭐ Load PLANS once
  useEffect(() => {
    const loadPlansOnce = async () => {
      if (plans?.length > 0) return;
      const data = await getPlans();
      if (data?.raw) setPlans(data.raw);
    };
    loadPlansOnce();
  }, []);

  // ======================================================
  // ⭐ Load States, Districts, Blocks
  useEffect(() => {
    const loadLocations = async () => {
      if (rawStateData && states?.length > 0) return;

      const data = await getStates();
      setRawStateData(data);

      const stateList = data?.states || [];
      setStates(stateList);

      let distList = [];
      let distLookupTemp = {};

      stateList.forEach((s) => {
        s?.district?.forEach((d) => {
          distList.push(d);
          distLookupTemp[d.id] = d.name;
        });
      });

      setDistricts(distList);
      setDistrictLookup(distLookupTemp);

      let blockList = [];
      let blockLookupTemp = {};

      stateList.forEach((s) => {
        s?.district?.forEach((d) => {
          d?.blocks?.forEach((b) => {
            blockList.push(b);
            blockLookupTemp[b.id] = b.name;
          });
        });
      });

      setBlocks(blockList);
      setBlockLookup(blockLookupTemp);
    };

    loadLocations();
  }, []);

  // ======================================================
  // ⭐ MAP INIT
  useEffect(() => {
    const baseLayer = new TileLayer({
      source: new XYZ({
        url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
        maxZoom: 30,
      }),
    });

    const view = new View({
      center: [78.9, 23.6],
      zoom: 5,
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

  // ======================================================
  // ⭐ ADD BUBBLES TO MAP (state plan counts)
// ======================================================
// ⭐ ADD BUBBLES TO MAP (state plan counts)
// ======================================================
useEffect(() => {
  if (!mapRef.current || !metaStats) return;

  const getBubbleRadius = (plans) => {
    const base = 8; // minimum size
    const scale = 2.2; // adjust bubble growth
    return base + Math.sqrt(plans) * scale;
  };

  const features = [];

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
          radius: radius,
          fill: new Fill({ color: "rgba(0,122,255,0.75)" }),
          stroke: new Stroke({ color: "#fff", width: 2 }),
        }),
        text: new Text({
          text: total.toString(),
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


  // ======================================================
  return (
    <div className="bg-white min-h-screen">
      <LandingNavbar />

      <div className="flex gap-8 items-start p-6">
        {/* MAP */}
        <div
          className="relative border border-gray-300 rounded-lg overflow-hidden shadow"
          style={{ width: "60%", height: "900px" }}
        >
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

          <SelectReact
            value={organization}
            onChange={setOrganization}
            options={organizationOptions}
            placeholder="Select Organization"
          />

          {/* INFO */}
          <div className="w-full bg-gray-50 border border-gray-300 rounded-lg p-4 shadow-sm mt-12">
            <h3 className="font-semibold text-gray-800 text-lg mb-3">
              Overview
            </h3>

            <div className="flex flex-col gap-2 text-sm text-gray-700">
              <p>
                <span className="font-medium">States Loaded:</span>{" "}
                {states.length}
              </p>
              <p>
                <span className="font-medium">Districts Loaded:</span>{" "}
                {districts.length}
              </p>
              <p>
                <span className="font-medium">Blocks Loaded:</span>{" "}
                {blocks.length}
              </p>
              <p>
                <span className="font-medium">Plans Loaded:</span>{" "}
                {plans.length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlansPage;


// import React, { useEffect, useRef, useState } from "react";
// import { useRecoilState, useRecoilValue } from "recoil";
// import TileLayer from "ol/layer/Tile";
// import XYZ from "ol/source/XYZ";
// import { Control, defaults as defaultControls } from "ol/control";
// import View from "ol/View";
// import Map from "ol/Map";
// import SelectReact from "react-select";

// // Components
// import YearSlider from "./yearSlider.jsx";
// import LandingNavbar from "../components/landing_navbar.jsx";

// // Recoil Store
// import {
//   plansAtom,
//   stateDataAtom,
//   stateAtom,
//   districtAtom,
//   blockAtom,
//   districtLookupAtom,
//   blockLookupAtom,
// } from "../store/locationStore";

// // APIs
// import getStates from "../actions/getStates";
// import getPlans from "../actions/getPlans";

// const PlansPage = () => {
//   const mapElement = useRef(null);
//   const mapRef = useRef(null);

//   const [organization, setOrganization] = useState();
//   const [organizationOptions, setOrganizationOptions] = useState([]);

//   // Recoil Atoms
//   const [plans, setPlans] = useRecoilState(plansAtom);
//   const [rawStateData, setRawStateData] = useRecoilState(stateDataAtom);

//   const [states, setStates] = useRecoilState(stateAtom);
//   const [districts, setDistricts] = useRecoilState(districtAtom);
//   const [blocks, setBlocks] = useRecoilState(blockAtom);

//   const [districtLookup, setDistrictLookup] =
//     useRecoilState(districtLookupAtom);
//   const [blockLookup, setBlockLookup] = useRecoilState(blockLookupAtom);

//   // ======================================================
//   // ⭐ 1. Load organizations
//   useEffect(() => {
//     const fetchOrganizations = async () => {
//       const options = await loadOrganization();
//       setOrganizationOptions(options);
//     };
//     fetchOrganizations();
//   }, []);

//   const loadOrganization = async () => {
//     try {
//       const response = await fetch(
//         `${process.env.REACT_APP_API_URL}/auth/register/available_organizations/`,
//         {
//           method: "GET",
//           headers: {
//             "Content-Type": "application/json",
//             "ngrok-skip-browser-warning": "420",
//           },
//         }
//       );
//       const data = await response.json();

//       return data.map((org) => ({
//         value: org.id,
//         label: org.name,
//       }));
//     } catch (error) {
//       console.error("Error fetching organizations:", error);
//       return [];
//     }
//   };

//   // ======================================================
//   // ⭐ 2. Load PLANS (only once)
//   useEffect(() => {
//     const loadPlans = async () => {
//       try {
//         if (plans && plans.length > 0) return;
//         const data = await getPlans();

//         if (data?.raw) setPlans(data.raw);
//       } catch (err) {
//         console.error("Plans load error:", err);
//       }
//     };

//     loadPlans();
//   }, []);

//   // ======================================================
//   // ⭐ 3. Load ALL location data → states, districts, blocks + lookup tables
//   useEffect(() => {
//     const loadLocationData = async () => {
//       try {
//         // Already loaded → skip
//         if (
//           rawStateData &&
//           states.length > 0 &&
//           districts.length > 0 &&
//           blocks.length > 0
//         )
//           return;

//         // SAME as KYLHomePage
//         const data = await getStates();
//         setRawStateData(data);

//         const stateList = data?.states || [];
//         setStates(stateList);

//         // DISTRICTS + lookup
//         let districtList = [];
//         let distLookup = {};

//         stateList.forEach((st) => {
//           st?.district?.forEach((d) => {
//             districtList.push(d);
//             distLookup[d.id] = d.name;
//           });
//         });

//         setDistricts(districtList);
//         setDistrictLookup(distLookup);

//         // BLOCKS + lookup
//         let blockList = [];
//         let blkLookup = {};

//         stateList.forEach((st) => {
//           st?.district?.forEach((d) => {
//             d?.blocks?.forEach((b) => {
//               blockList.push(b);
//               blkLookup[b.id] = b.name;
//             });
//           });
//         });

//         setBlocks(blockList);
//         setBlockLookup(blkLookup);

//         // DEBUG LOGS
//         console.log("🟦 RAW STATE DATA:", data);
//         console.log("🟩 STATES:", stateList);
//         console.log("🟧 DISTRICTS:", districtList);
//         console.log("🟪 BLOCKS:", blockList);
//       } catch (err) {
//         console.error("Location load error:", err);
//       }
//     };

//     loadLocationData();
//   }, []);

//   // ======================================================
//   // ⭐ 4. Print PLAN → District + Block Names
//   useEffect(() => {
//     if (!plans || plans.length === 0) return;
//     if (!districtLookup || !blockLookup) return;

//     console.log("🔍 Plan District & Block Names:");

//     plans.forEach((p) => {
//       console.log({
//         planId: p.id,
//         district_id: p.district_id,
//         district_name: districtLookup[p.district_id],
//         block_id: p.block_id,
//         block_name: blockLookup[p.block_id],
//       });
//     });
//   }, [plans, districtLookup, blockLookup]);

//   // ======================================================
// // ⭐ NEW: Fetch Plan Meta Stats
// const getPlanMetaStats = async () => {
//   try {
//     const response = await fetch(
//       // `${process.env.REACT_APP_API_URL}/api/v1/watershed/plans/meta-stats/`,
//       `https://614f0dbf85ed.ngrok-free.app/api/v1/watershed/plans/meta-stats/`,

//       {
//         method: "GET",
//         headers: {
//           "Content-Type": "application/json",
//           "ngrok-skip-browser-warning": "420",
//           "X-API-KEY":"siOgP9SO.oUCc1vuWQRPkdjXjPmtIZYADe5eGl3FK"
//           // "X-API-Key": `${process.env.REACT_APP_API_KEY}`,  
//               },
//       }
//     );

//     if (!response.ok) {
//       throw new Error(`API Error: ${response.status}`);
//     }

//     const data = await response.json();
//     console.log("📊 Plan Meta Stats:", data);

//     return data;
//   } catch (error) {
//     console.error("❌ Error fetching plan meta stats:", error);
//     return null;
//   }
// };

// useEffect(()=>{
//   getPlanMetaStats()
// })


//   // ======================================================
//   // ⭐ Select style
//   const customStyles = {
//     control: (base) => ({
//       ...base,
//       height: 48,
//       width: 464,
//       backgroundColor: "#fff",
//       borderRadius: 4,
//       paddingLeft: 4,
//       zIndex: 2,
//     }),
//     menu: (base) => ({ ...base, zIndex: 9999 }),
//     menuPortal: (base) => ({ ...base, zIndex: 1300 }),
//   };

//   // ======================================================
//   // ⭐ MAP INITIALIZATION
//   useEffect(() => {
//     initializeMap();
//     return () => {
//       if (mapRef.current) {
//         mapRef.current.setTarget(null);
//         mapRef.current = null;
//       }
//     };
//   }, []);

//   const initializeMap = () => {
//     const baseLayer = new TileLayer({
//       source: new XYZ({
//         url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
//         maxZoom: 30,
//       }),
//     });

//     class GoogleLogoControl extends Control {
//       constructor() {
//         const element = document.createElement("div");
//         element.style.pointerEvents = "none";
//         element.style.position = "absolute";
//         element.style.bottom = "5px";
//         element.style.left = "5px";
//         element.style.background = "#f2f2f27f";
//         element.style.fontSize = "10px";
//         element.style.padding = "5px";
//         element.innerHTML = "&copy; Google Satellite Hybrid contributors";
//         super({ element });
//       }
//     }

//     const view = new View({
//       center: [78.9, 23.6],
//       zoom: 5,
//       projection: "EPSG:4326",
//     });

//     const map = new Map({
//       target: mapElement.current,
//       layers: [baseLayer],
//       controls: defaultControls().extend([new GoogleLogoControl()]),
//       view,
//     });

//     mapRef.current = map;
//   };

//   // ======================================================
//   // ⭐ UI
//   return (
//     <div className="bg-white min-h-screen">
//       <LandingNavbar />

//       <div className="flex gap-8 items-start p-6">
//         {/* Map */}
//         <div
//           className="relative border border-gray-300 rounded-lg overflow-hidden shadow"
//           style={{ width: "60%", height: "900px" }}
//         >
//           <div ref={mapElement} className="w-full h-full" />

//           {/* Zoom Buttons */}
//           <div className="absolute top-12 right-4 flex flex-col gap-1 z-[1000]">
//             {["+", "–"].map((sign) => (
//               <button
//                 key={sign}
//                 className="bg-white border border-gray-300 rounded-md w-10 h-10 text-xl hover:bg-gray-100 shadow"
//                 onClick={() => {
//                   const view = mapRef.current?.getView();
//                   const delta = sign === "+" ? 1 : -1;
//                   view?.animate({
//                     zoom: view.getZoom() + delta,
//                     duration: 300,
//                   });
//                 }}
//               >
//                 {sign}
//               </button>
//             ))}
//           </div>

//           <div className="absolute bottom-4 right-0 transform -translate-x-1/2 z-[1000] w-full max-w-xl px-4 ">
//             <YearSlider currentLayer={[{ name: "lulc_test_layer" }]} />
//           </div>
//         </div>

//         {/* Sidebar */}
//         <div className="flex flex-col items-start gap-4 w-[25%] text-left mt-16">
//           <label className="font-semibold text-gray-700 text-lg">
//             Select Organization
//           </label>

//           <SelectReact
//             value={organization}
//             onChange={(selected) => {
//               setOrganization(selected);

//               if (selected) {
//                 sessionStorage.setItem(
//                   "selectedOrganization",
//                   JSON.stringify(selected)
//                 );
//                 sessionStorage.setItem(
//                   "organizationName",
//                   selected.label.toUpperCase()
//                 );
//               } else {
//                 sessionStorage.removeItem("selectedOrganization");
//                 sessionStorage.removeItem("organizationName");
//               }
//             }}
//             options={organizationOptions}
//             placeholder="Select Organization"
//             styles={customStyles}
//             menuPortalTarget={document.body}
//             menuPosition="fixed"
//           />

//           {/* INFO BOX */}
//           <div className="w-full bg-gray-50 border border-gray-300 rounded-lg p-4 shadow-sm mt-12">
//             <h3 className="font-semibold text-gray-800 text-lg mb-3">
//               Overview
//             </h3>

//             <div className="flex flex-col gap-2 text-sm text-gray-700">
//               <p>
//                 <span className="font-medium">States Loaded:</span>{" "}
//                 {states?.length || 0}
//               </p>
//               <p>
//                 <span className="font-medium">Districts Loaded:</span>{" "}
//                 {districts?.length || 0}
//               </p>
//               <p>
//                 <span className="font-medium">Blocks Loaded:</span>{" "}
//                 {blocks?.length || 0}
//               </p>
//               <p>
//                 <span className="font-medium">Plans Loaded:</span>{" "}
//                 {plans?.length || 0}
//               </p>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default PlansPage;
