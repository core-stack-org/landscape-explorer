import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useRecoilState } from "recoil";
import {
  stateDataAtom,
  stateAtom,
  districtAtom,
  blockAtom,
} from "../store/locationStore";
import SelectButton from "../components/buttons/select_button.jsx";
import landingPageBg from "../assets/landingpagebg.svg";
import planAndView from "../assets/RevisedViewAndSupportCrop.png";
import getStates from "../actions/getStates";
import {
  trackPageView,
  trackEvent,
  initializeAnalytics,
} from "../services/analytics";
import Footer from "../components/footer.jsx";
import LandingNavbar from "../components/landing_navbar.jsx";

export default function KYLHomePage() {
  const navigate = useNavigate();

  const [statesData, setStatesData] = useRecoilState(stateDataAtom);
  const [state, setState] = useRecoilState(stateAtom);
  const [district, setDistrict] = useRecoilState(districtAtom);
  const [block, setBlock] = useRecoilState(blockAtom);

  useEffect(() => {
    initializeAnalytics();
    trackPageView("/kyl_home");

    const fetchStates = async () => {
      const data = await getStates();
      setStatesData(data);
    };

    fetchStates();
    setBlock(null);
  }, []);

  const handleItemSelect = (setter, value) => {
    if (setter === setState) {
      if (value) trackEvent("Location", "select_state", value.label);
      setter(value);
      setDistrict(null);
      setBlock(null);
    } else if (setter === setDistrict) {
      if (value) trackEvent("Location", "select_district", value.label);
      setter(value);
      setBlock(null);
    } else if (setter === setBlock && value) {
      trackEvent("Location", "select_tehsil", value.label);
      setter(value);
    }
  };

  const handleNavigate = (path, buttonName) => {
    if(buttonName === "Jaltol App"){
      window.open(path, "_blank", "noopener,noreferrer");
    }
    else{
      trackEvent("Navigation", "button_click", buttonName);
      navigate(path);
    }
  };

  return (
    <div className="font-sans">
      <LandingNavbar />
      <div
        className="min-h-screen snap-y snap-mandatory bg-cover bg-center bg-no-repeat pt-8 md:pt-12"
        style={{ backgroundImage: `url(${landingPageBg})`, scrollBehavior: "smooth" }}
      >

        {/* ── KNOW SECTION ─────────────────────────────────────────────────────── */}
        <section
          className="snap-start backdrop-brightness-90 backdrop-blur-sm bg-white/0 px-4 pt-8 pb-6 md:px-10 md:pt-10 md:pb-10 rounded-xl mx-2 md:mx-6 mb-4 md:mb-6"
          style={{ position: "relative", overflow: "visible", zIndex: 10 }}
        >
          <div className="flex flex-col lg:flex-row lg:items-stretch gap-8">
            {/* Left: text */}
            <div className="w-full lg:w-1/2 flex flex-col justify-between">
              <h2 className="text-3xl md:text-4xl mb-4">
                <span className="font-bold text-purple-700">Know</span>{" "}
                <span className="font-normal text-purple-700">your landscape</span>
              </h2>
              <ul className="list-disc list-outside ml-5 text-black text-base md:text-lg space-y-3 font-medium text-justify">
                <li>
                  <b>With 20+ geospatial layers</b>, explore your landscape's diversity,
                  build evidence-based proposals, and plan context-sensitive actions.
                </li>
                <li>
                  Quickly access <b>detailed reports on any micro-watershed in the Tehsil</b>,
                  covering land use, cropping, groundwater, forests, and socio-economic indicators.
                </li>
                <li>
                  Discover unique patterns in different parts of your Tehsil/Block with the
                  help of landscape indicators relevant to the context.
                </li>
              </ul>
              <div className="bg-purple-50 border-l-4 border-purple-500 text-purple-700 p-4 rounded-md mt-8">
                <p className="text-sm">
                  Check out the vision and demo{" "}
                  <a
                    href="https://www.youtube.com/playlist?list=PLZ0pcz8ccRmL3wTPRctaVFomGmgJFmM13"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-medium hover:text-purple-900"
                  >
                    here →
                  </a>
                </p>
              </div>
            </div>

            {/* Right: selector card */}
            <div className="flex flex-col justify-between w-full lg:w-1/2 lg:max-w-lg lg:ml-auto">
              <div
                className="w-full flex-1 bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-gray-100 flex flex-col justify-between relative"
                style={{ overflow: "visible", zIndex: 100 }}
              >
                <p className="mb-0 text-left font-semibold text-xl md:text-2xl text-gray-800 leading-none">
                  Select Location
                </p>
                <div className="space-y-4 mt-5 relative">
                  <div className="relative z-[9999]">
                    <SelectButton
                      currVal={state || { label: "Select State" }}
                      stateData={statesData}
                      handleItemSelect={handleItemSelect}
                      setState={setState}
                    />
                  </div>
                  <div className="relative z-[9998]">
                    <SelectButton
                      currVal={district || { label: "Select District" }}
                      stateData={state !== null ? state.district : null}
                      handleItemSelect={handleItemSelect}
                      setState={setDistrict}
                    />
                  </div>
                  <div className="relative z-[9997]">
                    <SelectButton
                      currVal={block || { label: "Select Tehsil" }}
                      stateData={district !== null ? district.blocks : null}
                      handleItemSelect={handleItemSelect}
                      setState={setBlock}
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-center gap-2 mt-3">
                  {/* ← changed from blue-600 to purple-600 */}
                  <button
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg w-full sm:w-auto text-base font-medium transition-colors"
                    onClick={() => handleNavigate("/kyl_dashboard", "Know Your Landscape")}
                  >
                    Know Your Landscape
                  </button>
                  <button
                    className="bg-purple-100 hover:bg-purple-200 text-purple-800 px-4 py-2 rounded-lg w-full sm:w-auto text-base font-medium transition-colors"
                    onClick={() => handleNavigate("/download_layers", "Download Layers")}
                  >
                    Download Layers
                  </button>
                </div>
              </div>

              <div className="bg-purple-50 border-l-4 border-purple-500 text-purple-700 p-4 rounded-md mt-4 w-full">
                <p className="text-sm">
                  Generate data for a specific location?{" "}
                  <a
                    href="https://forms.gle/HoyfwBbHU8c29TYb8"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-medium hover:text-purple-900"
                  >
                    Let us know here →
                  </a>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── PLAN SECTION ─────────────────────────────────────────────────────── */}
        <section className="snap-start backdrop-brightness-90 backdrop-blur-sm bg-white/0 px-4 py-6 md:px-10 md:py-10 rounded-xl mx-2 md:mx-6 my-6">
          <div className="flex flex-col lg:flex-row lg:items-stretch gap-8">

            {/* LEFT: card + video tutorials callout */}
            <div className="w-full lg:w-1/2 order-2 lg:order-1 flex flex-col gap-4">
              <div className="group relative bg-white rounded-2xl shadow-md overflow-hidden border border-purple-100 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex-1 min-h-[280px]">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none" />
                <div className="flex flex-row h-full">
                  <div className="w-1/2 flex-shrink-0 relative overflow-hidden">
                    <img
                      src={planAndView}
                      alt="Landscape Network"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-r from-transparent to-white" />
                  </div>
                  <div className="flex flex-col justify-between p-5 flex-1">
                    <div>
                      <span className="inline-block text-xs font-semibold uppercase tracking-widest text-purple-400 mb-2">
                        Explore
                      </span>
                      <h3 className="text-lg font-bold text-gray-900 leading-snug mb-3">
                        View Landscape Stewardship Network
                      </h3>
                      <p className="text-sm text-gray-500 leading-relaxed">
                        Explore existing community plans and find opportunities to support
                        or collaborate with ongoing initiatives in your region.
                      </p>
                    </div>
                    <button
                      className="self-start mt-4 px-5 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors shadow-sm shadow-purple-200"
                      onClick={() => handleNavigate("/CCUsagePage", "View Landscape Stewardship Network")}
                    >
                      Learn More →
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 border-l-4 border-purple-500 text-purple-700 p-4 rounded-md">
                <p className="text-sm">
                  Watch participatory planning tutorials{" "}
                  <a
                    href="https://www.youtube.com/watch?v=ln7wpoW7Eg4&list=PLZ0pcz8ccRmIU8wHzHv-CbDOs4JOqgNHC"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-medium hover:text-purple-900"
                  >
                    here →
                  </a>
                </p>
              </div>
            </div>

            {/* RIGHT: text + app download callout */}
            <div className="w-full lg:w-1/2 order-1 lg:order-2 flex flex-col justify-between">
              <h2 className="text-3xl md:text-4xl mb-4">
                <span className="font-bold text-purple-700">Plan</span>{" "}
                <span className="font-normal text-purple-700">for a sustainable tomorrow</span>
              </h2>
              <ul className="list-disc list-outside ml-5 text-black text-base md:text-lg space-y-3 font-medium text-justify">
                <li>
                  <b>Identification of the right problems</b> is key to sustainable Natural Resource
                  Management (NRM). Commons Connect is a community-focused app enabling landscape
                  stewards to plan NRM works in a participatory manner.
                </li>
                <li>
                  <b>Assess and raise demands</b>: This tool provides decision support to identify
                  suitable sites for NRM assets and supports community reflection on equity in
                  resource ownership and use.
                </li>
                <li>
                  <b>Develop Detailed Project Reports (DPRs)</b> in an automated manner that can be
                  integrated into the GPDP, MGNREGS, and other processes.
                </li>
              </ul>
              <div className="bg-purple-50 border-l-4 border-purple-500 text-purple-700 p-4 rounded-md mt-8">
                <p className="text-sm">
                  Download the Commons Connect Android app{" "}
                  <a
                    href="https://play.google.com/store/apps/details?id=com.corestack.commonsconnect"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-medium hover:text-purple-900"
                  >
                    here →
                  </a>
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* ── TRACK SECTION ────────────────────────────────────────────────────── */}
        {/* Text → LEFT  |  Boxes → RIGHT  */}
        <section className="snap-start backdrop-brightness-90 backdrop-blur-sm bg-white/0 px-4 py-6 md:px-10 md:py-10 rounded-xl mx-2 md:mx-6 mt-6">
          <div className="flex flex-col lg:flex-row lg:items-start gap-8">

            {/* LEFT: text */}
            <div className="w-full lg:w-1/2">
              <h2 className="text-3xl md:text-4xl mb-4">
                <span className="font-bold text-purple-700">Track and Assess </span>
                <span className="font-normal text-purple-700">NRM interventions</span>
              </h2>
              <ul className="list-disc list-outside ml-5 text-black text-base md:text-lg space-y-3 font-medium text-justify">
                <li>
                  A suite of dashboards enabling continuous monitoring of Natural Resource
                  Management (NRM) interventions undertaken in an area, and ex-post assessment
                  of their impact.
                </li>
                <li>
                  Use <b>Jaltol</b> to monitor changes in cropping patterns in villages where
                  extensive watershed development programmes have been undertaken.
                </li>
                <li>
                  Agrohorticulture practitioners can assess the health of tree plantations over
                  time using the <b>Plantation Health Assessment Dashboard</b>.
                </li>
                <li>
                  Track waterbody rejuvenation interventions and their impact on cropping in
                  nearby areas with the <b>WaterBody Rejuvenation Assessment Dashboard</b>.
                </li>
              </ul>
            </div>

            {/* RIGHT: cards grid */}
            <div className="w-full lg:w-1/2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    title: "Waterbody Rejuvenation",
                    description:
                      "Visualize waterbody interventions and evaluate their effects on water availability and agriculture.",
                    icon: "💧",
                    link: "/rwb",
                    accent: "from-purple-50 to-purple-100/60",
                    iconBg: "bg-purple-100",
                  },
                  {
                    title: "Agrohorticulture Plantations",
                    description:
                      "Track the health and growth of plantations across time using satellite-based monitoring.",
                    icon: "🌳",
                    link: "/agrohorticulture",
                    accent: "from-purple-50 to-purple-100/60",
                    iconBg: "bg-purple-100",
                  },
                  {
                    title: "Jaltol App",
                    description:
                      "Monitor changes in cropping patterns and assess the impact of watershed development interventions.",
                    icon: "🌾",
                    link: "https://welllabs.org/jaltol/",
                    accent: "from-purple-50 to-purple-100/60",
                    iconBg: "bg-purple-100",
                  },
                  {
                    title: "Commons Connect Plans",
                    description:
                      "Site and landscape level tracking of plans built using Commons Connect.",
                    icon: "☀️",
                    link: null,
                    accent: "from-gray-50 to-gray-100/60",
                    iconBg: "bg-gray-100",
                  },
                ].map((item, index) => (
                  <div
                    key={index}
                    className={`group bg-gradient-to-br ${item.accent} rounded-2xl shadow-md p-5 flex flex-col justify-between border border-purple-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 min-h-[260px]`}
                  >
                    <div>
                      <div className={`${item.iconBg} rounded-xl w-11 h-11 flex items-center justify-center text-xl mb-3 flex-shrink-0`}>
                        {item.icon}
                      </div>
                      <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-2 leading-tight">
                        {item.title}
                      </h3>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                    <div className="mt-3">
                      {item.link ? (
                        <button
                          onClick={() => handleNavigate(item.link, item.title)}
                          className="px-4 py-1.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                        >
                          Learn More
                        </button>
                      ) : (
                        <span className="inline-block px-4 py-1.5 text-sm font-medium text-gray-400 bg-gray-100 rounded-lg cursor-not-allowed">
                          Coming Soon
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

      </div>
      <Footer />
    </div>
  );
}