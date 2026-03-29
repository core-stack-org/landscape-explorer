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
import participatoryImg from "../assets/RevisedPlanningCrop.png";
import newLogo from "../assets/RevisedLogoCrop.png";
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
      if (value) {
        trackEvent("Location", "select_state", value.label);
      }
      setter(value);
      setDistrict(null);
      setBlock(null);
    } else if (setter === setDistrict) {
      if (value) {
        trackEvent("Location", "select_district", value.label);
      }
      setter(value);
      setBlock(null);
    } else if (setter === setBlock && value) {
      trackEvent("Location", "select_tehsil", value.label);
      setter(value);
    }
  };

  const handleNavigate = (path, buttonName) => {
    trackEvent("Navigation", "button_click", buttonName);
    navigate(path);
  };

  return (
    <div className="font-sans ">
      <LandingNavbar />
      <div
        className="min-h-screen snap-y snap-mandatory bg-cover bg-center bg-no-repeat pt-8 md:pt-12"
        style={{
          backgroundImage: `url(${landingPageBg})`,
          scrollBehavior: "smooth",
        }}
      >
        {/* Know Section */}
        <section
          className="snap-start backdrop-brightness-90 backdrop-blur-sm bg-white/0 px-4 pt-8 pb-6 md:px-10 md:pt-10 md:pb-10 rounded-xl mx-2 md:mx-6 mb-4 md:mb-6"
          style={{ position: "relative", overflow: "visible", zIndex: 10 }}
        >
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
            <div className="w-full lg:w-1/2">
              <h2 className="text-3xl md:text-4xl mb-4">
                <span className="font-bold text-purple-700">Know</span>{" "}
                <span className="font-normal text-purple-700">your landscape</span>
              </h2>

              <ul className="list-disc list-outside ml-5 text-black text-base md:text-lg space-y-3 font-medium text-justify">
                <li>
                  With 20+ geospatial layers, explore your landscape's
                  diversity, build evidence-based proposals, and plan
                  context-sensitive actions.
                </li>
                <li>
                  Quickly access detailed reports on any micro-watershed in the
                  Tehsil, covering land use, cropping, groundwater, forests, and
                  socio-economic indicators.
                </li>
                <li>
                  Discover unique patterns in different parts of your
                  Tehsil/Block with the help of landscape indicators relevant to
                  the context.
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
            <div className="flex flex-col items-start gap-0">
              {/* First Card */}
              <div
                className="w-full max-w-lg bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-gray-100 flex flex-col justify-between relative"
                style={{ overflow: "visible", zIndex: 100 }}
              >
                <p className="mb-0 text-left font-semibold text-xl md:text-2xl text-gray-800 leading-none">
                  Select Location
                </p>

                <div className="space-y-4 mt-5 relative">
                  {/* State */}
                  <div className="relative z-[9999]">
                    <SelectButton
                      currVal={state || { label: "Select State" }}
                      stateData={statesData}
                      handleItemSelect={handleItemSelect}
                      setState={setState}
                    />
                  </div>

                  {/* District */}
                  <div className="relative z-[9998]">
                    <SelectButton
                      currVal={district || { label: "Select District" }}
                      stateData={state !== null ? state.district : null}
                      handleItemSelect={handleItemSelect}
                      setState={setDistrict}
                    />
                  </div>

                  {/* Block */}
                  <div className="relative z-[9997]">
                    <SelectButton
                      currVal={block || { label: "Select Tehsil" }}
                      stateData={district !== null ? district.blocks : null}
                      handleItemSelect={handleItemSelect}
                      setState={setBlock}
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between gap-2 mt-3">
                  <button
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg w-full sm:w-auto"
                    onClick={() =>
                      handleNavigate("/kyl_dashboard", "Know Your Landscape")
                    }
                  >
                    Know Your Landscape
                  </button>
                  <button
                    className="bg-gray-300 text-black px-4 py-2 rounded-lg w-full sm:w-auto"
                    onClick={() =>
                      handleNavigate("/download_layers", "Download Layers")
                    }
                  >
                    Download Layers
                  </button>
                </div>
              </div>

              {/* Second Card directly below first */}
              <div className="bg-purple-50 border-l-4 border-purple-500 text-purple-700 p-4 rounded-md mt-4 max-w-lg w-full">
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

        {/* Plan Section */}
        <section className="snap-start backdrop-brightness-90 backdrop-blur-sm bg-white/0 px-4 py-6 md:px-10 md:py-10 rounded-xl mx-2 md:mx-6 my-6">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* left: text */}
            <div className="w-full lg:w-1/2">
              <h2 className="text-3xl md:text-4xl mb-4">
                <span className="font-bold text-purple-700">Plan</span>{" "}
                <span className="font-normal text-purple-700">for a sustainable tomorrow</span>
              </h2>
              <ul className="list-disc list-outside ml-5 text-black text-base md:text-lg space-y-3 font-medium text-justify">
                <li><b>Identification of the right problems</b> is key to sustainable Natural Resource Management (NRM). Commons Connect is a community-focused app enabling landscape stewards to plan NRM works in a participatorily manner.</li>
                <li><b>Assess and raise demands</b>: This tool provides decision support to identify suitable sites for NRM assets and supports community reflection on equity in resource ownership and use.</li>
                <li><b>Develop Detailed Project Reports (DPRs)</b> in an automated manner that can be integrated into the GPDP, MGNREGS, and other processes.</li>
              </ul>
            </div>

            {/* right: cards */}
            <div className="w-full lg:w-1/2">
              <div className="space-y-4">
                {/* View Landscape Stewardship Network - Full width with image */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="flex flex-col sm:flex-row">
                    <div className="w-full sm:w-2/5 h-40 sm:h-auto">
                      <img src={planAndView} alt="Landscape Network" className="w-full h-full object-cover" />
                    </div>
                    <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">🌐 View Landscape Stewardship Network</h3>
                        <p className="text-xs text-gray-700 leading-relaxed text-justify">Explore existing community plans and find opportunities to support or collaborate with ongoing initiatives in your region.</p>
                      </div>
                      <button className="mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition w-fit" onClick={() => handleNavigate("/CCUsagePage", "View Landscape Stewardship Network")}>Learn More</button>
                    </div>
                  </div>
                </div>

                {/* Bottom two cards in a grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Participatory Planning */}
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl shadow-md p-5 flex flex-col justify-between hover:shadow-lg transition-shadow">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 mb-2">🎥 Participatory Planning</h3>
                      <p className="text-xs text-gray-700 leading-relaxed text-justify">Learn to conduct PRA and create DPRs using Commons Connect tutorials.</p>
                    </div>
                    <a href="https://www.youtube.com/watch?v=ln7wpoW7Eg4&list=PLZ0pcz8ccRmIU8wHzHv-CbDOs4JOqgNHC" target="_blank" rel="noopener noreferrer" className="mt-3 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition w-fit">Learn More</a>
                  </div>

                  {/* Download Commons Connect App */}
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl shadow-md p-5 flex flex-col justify-between hover:shadow-lg transition-shadow">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 mb-2">📱 Download Commons Connect App</h3>
                      <p className="text-xs text-gray-700 leading-relaxed text-justify">Android app to record community demands for NRM assets in a guided manner.</p>
                    </div>
                    <a href="https://play.google.com/store/apps/details?id=com.corestack.commonsconnect" target="_blank" rel="noopener noreferrer" className="mt-3 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition w-fit">Download Now</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Track Section */}
        <section className="snap-start backdrop-brightness-90 backdrop-blur-sm bg-white/0 px-4 py-6 md:px-10 md:py-10 rounded-xl mx-2 md:mx-6 mt-6">
          <div className="flex flex-col lg:flex-row lg:items-start gap-8">
            {/* left: text */}
            <div className="w-full lg:w-1/2">
              <h2 className="text-3xl md:text-4xl mb-4">
                <span className="font-bold text-purple-700">Track and Assess </span>
                <span className="font-normal text-purple-700">NRM interventions</span>
              </h2>
              <ul className="list-disc list-outside ml-5 text-black text-base md:text-lg space-y-3 font-medium text-justify">
                <li>
                  A suite of dashboards enabling continuous monitoring of
                  Natural Resource Management (NRM) interventions undertaken in
                  an area, and ex-post assessment of their impact.
                </li>
                <li>
                  Use <b>Jaltol</b> to monitor changes in cropping patterns in
                  villages where extensive watershed development programmes have
                  been undertaken.
                </li>
                <li>
                  Agrohorticulture practitioners can assess the health of tree
                  plantations over time using the{" "}
                  <b>Plantation Health Assessment Dashboard</b>.
                </li>
                <li>
                  Track waterbody rejuvenation interventions and their impact on
                  cropping in nearby areas with the{" "}
                  <b>WaterBody Rejuvenation Assessment Dashboard</b>.
                </li>
              </ul>
            </div>

            {/* right: cards */}
            <div className="w-full lg:w-1/2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    title: "Waterbody Rejuvenation",
                    description:
                      "Visualize waterbody interventions and evaluate their effects on water availability and agriculture.",
                    icon: "💧",
                    link: "/rwb",
                  },
                  {
                    title: "Agrohorticulture Plantations",
                    description:
                      "Track the health and growth of plantations across time using satellite-based monitoring.",
                    icon: "🌳",
                    link:"/agrohorticulture"
                  },
                  {
                    title: "Jaltol App",
                    description:
                      "Monitor changes in cropping patterns and assess the impact of watershed development interventions.",
                    icon: "🌾",
                    link: "https://welllabs.org/jaltol/",
                  },
                  {
                    title: "Commons Connect Plans",
                    description:
                      "Site and landscape level tracking of plans built using Commons Connect",
                    icon: "☀️",
                  },
                ].map((item, index) => (
                  <div key={index} className="h-full">
                    <div className="cursor-pointer bg-white rounded-2xl shadow-md p-4 flex flex-col justify-between transform transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02] h-[240px] sm:h-[260px]">
                      <div className="flex flex-col items-start space-y-3">
                        <div className="bg-yellow-100 text-yellow-500 rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-lg sm:text-xl flex-shrink-0">
                          {item.icon}
                        </div>
                        <div className="flex-1 w-full">
                          <h3 className="text-base sm:text-lg font-semibold mb-2 text-gray-900 text-justify">
                            {item.title}
                          </h3>
                          <p className="text-xs text-gray-700 leading-relaxed text-justify mb-3" style={{ textJustify: 'inter-word' }}>
                            {item.description}
                          </p>
                        </div>
                      </div>
                      {item.link ? (
                        <button
                          onClick={() => handleNavigate(item.link, item.title)}
                          className="w-full py-2 px-4 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors text-sm"
                        >
                          Learn More
                        </button>
                      ) : (
                        <button className="w-full py-2 px-4 rounded-lg font-medium text-gray-400 bg-gray-100 cursor-not-allowed text-sm" disabled>
                          Coming Soon
                        </button>
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
