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
import Navbar from "../components/navbar";

export default function KYLHomePage() {
  const navigate = useNavigate();

  const [statesData, setStatesData] = useRecoilState(stateDataAtom);
  const [state, setState] = useRecoilState(stateAtom);
  const [district, setDistrict] = useRecoilState(districtAtom);
  const [block, setBlock] = useRecoilState(blockAtom);
  const [showOverlay, setShowOverlay] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    initializeAnalytics();
    trackPageView("/kyl_home");

    const fetchStates = async () => {
      const data = await getStates();
      setStatesData(data);
    };

    fetchStates();
  }, []);

  const handleItemSelect = (setter, value) => {
    if (setter === setState && value) {
      trackEvent("Location", "select_state", value.label);
    } else if (setter === setDistrict && value) {
      trackEvent("Location", "select_district", value.label);
    } else if (setter === setBlock && value) {
      trackEvent("Location", "select_block", value.label);
    }
    setter(value);
  };

  const handleNavigate = (path, buttonName) => {
    // Track navigation events
    trackEvent("Navigation", "button_click", buttonName);
    navigate(path);
  };

  return (
    <div className="font-sans">
      <Navbar />
      <div
        className="bg-cover bg-center bg-no-repeat min-h-screen"
        style={{ backgroundImage: `url(${landingPageBg})` }}
      >
        {/* Know Section */}
        <section className="backdrop-brightness-90 backdrop-blur-sm bg-white/0 p-8 rounded-xl mx-6 my-2">
          {" "}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between">
            <div className="pl-16 pr-8 md:w-1/2">
              <h2 className="text-3xl mb-2">
                <span className="font-bold text-purple-700">Know</span>{" "}
                <span className="font-normal text-purple-700">
                  your landscape
                </span>
              </h2>

              <ul className="list-disc list-inside text-black text-sm space-y-2 font-medium">
                <li>
                  With 20+ geospatial layers, explore your landscape’s
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
              <div className="bg-purple-50 border-l-4 border-purple-500 text-purple-700 p-4 rounded-md mb-6 mt-8">
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
            <div className="bg-white p-6 rounded shadow max-w-md w-full mr-10">
              <p className="mb-4 text-center font-semibold">Select Location</p>
              <div className="space-y-4">
                <SelectButton
                  currVal={state || { label: "Select State" }}
                  stateData={statesData}
                  handleItemSelect={handleItemSelect}
                  setState={setState}
                />
                <SelectButton
                  currVal={district || { label: "Select District" }}
                  stateData={state !== null ? state.district : null}
                  handleItemSelect={handleItemSelect}
                  setState={setDistrict}
                />
                <SelectButton
                  currVal={block || { label: "Select Tehsil" }}
                  stateData={district !== null ? district.blocks : null}
                  handleItemSelect={handleItemSelect}
                  setState={setBlock}
                />
              </div>
              <div className="flex justify-between mt-4">
                <button
                  className="bg-purple-600 text-white px-4 py-2 rounded"
                  onClick={() =>
                    handleNavigate("/kyl_dashboard", "Know Your Landscape")
                  }
                >
                  Know Your Landscape
                </button>
                <button
                  className="bg-gray-300 text-black px-4 py-2 rounded"
                  onClick={() =>
                    handleNavigate("/landscape_explorer", "Download Layers")
                  }
                >
                  Download Layers
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Plan Section */}
        <section className="backdrop-brightness-90 backdrop-blur-sm bg-white/0 p-8 rounded-xl mx-6 my-10">
          <div className="px-16">
            {/* Heading + Bullet Points */}
            <div className="w-full md:w-2/3 mb-10">
              <h2 className="text-3xl mb-2">
                <span className="font-bold text-purple-700">Plan</span>{" "}
                <span className="font-normal text-purple-700">
                  for a sustainable tomorrow
                </span>
              </h2>

              <ul className="list-disc list-inside text-black text-sm space-y-2 font-medium">
                <li>
                  <b>Identifying the right problems</b> is key to sustainable
                  Natural Resource Management (NRM). Commons Connect is a
                  community-focused app enabling landscape stewards to plan NRM
                  works participatorily.
                </li>
                <li>
                  <b>Assess and raise demands</b>: This tool provides decision
                  support to identify suitable work sites and supports community
                  reflection on resource equity.
                </li>
                <li>
                  <b>Develop Detailed Project Reports (DPRs)</b> in an automated
                  manner that can be integrated into the GPDP, MGNREGS, and
                  other processes.
                </li>
              </ul>
            </div>

            {/* Card Grid - Now comes BELOW */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* === Card 1 === */}
              <div>
                <div className="w-full aspect-[4/4] overflow-hidden rounded shadow mb-4">
                  <img
                    src={participatoryImg}
                    alt="Participatory Planning"
                    className="h-full w-full object-fill"
                  />
                </div>
                <div className="p-4 rounded text-left">
                  <h3 className="font-bold mb-2 text-sm">
                    How to do Participatory Planning?
                  </h3>
                  <p className="text-xs text-gray-700 mb-2">
                    Greater orch pack chuck territorial federal midlothian
                    organic class american explict. Mark s soft cover terrapass
                    key salsa, guide expansion.
                  </p>
                  <button
                    onClick={() => setShowVideo(true)}
                    className="text-purple-700 text-sm font-semibold"
                  >
                    Learn More →
                  </button>
                  {showVideo && (
                    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
                      <div className="bg-white rounded-xl max-w-4xl w-full relative">
                        <button
                          onClick={() => setShowVideo(false)}
                          className="absolute top-2 right-2 text-gray-600 text-xl font-bold"
                        >
                          ✕
                        </button>
                        <div className="aspect-[4/3] w-full rounded overflow-hidden">
                          <iframe
                            className="w-full h-full"
                            src="https://www.youtube.com/embed/videoseries?list=PLZ0pcz8ccRmIU8wHzHv-CbDOs4JOqgNHC"
                            title="Participatory Planning Playlist"
                            frameBorder="0"
                            allowFullScreen
                          ></iframe>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* === Card 2 === */}
              <div>
                <div className="w-full aspect-[4/4] rounded overflow-hidden shadow mb-4 relative">
                  <img
                    src={newLogo}
                    alt="Commons Connect App"
                    className="absolute inset-0 w-full h-full object-cover object-center"
                  />
                </div>
                <div className="p-4 rounded-b text-left">
                  <h3 className="font-bold mb-2 text-sm">
                    Download Commons Connect App
                  </h3>
                  <p className="text-xs text-gray-700 mb-2">
                    Access tools and resources for landscape planning directly
                    on your smartphone using our free mobile app.
                  </p>
                  <p className="text-purple-700 text-sm font-semibold">
                    Please mail us at{" "}
                    <a
                      href="mailto:support@core-stack.org"
                      className="underline"
                    >
                      support@core-stack.org
                    </a>{" "}
                    to download the app →
                  </p>
                </div>
              </div>

              {/* === Card 3 === */}
              <div>
                <div className="w-full aspect-[4/4] rounded overflow-hidden shadow mb-4 relative">
                  <img
                    src={planAndView}
                    alt="View and Support Plans"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  {showOverlay && (
                    <div className="absolute inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-10">
                      <p className="text-white text-lg font-semibold">
                        Coming Soon...
                      </p>
                    </div>
                  )}
                </div>
                <div className="p-4 rounded-b text-left">
                  <h3 className="font-bold mb-2 text-sm">
                    View and Support Plans
                  </h3>
                  <p className="text-xs text-gray-700 mb-2">
                    Explore existing community plans and find opportunities to
                    support or collaborate with ongoing initiatives.
                  </p>
                  <button
                    onClick={() => {
                      setShowOverlay(true);
                      setTimeout(() => setShowOverlay(false), 5000);
                    }}
                    className="text-purple-700 text-sm font-semibold"
                  >
                    Learn More →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Track Section */}
        <section className="backdrop-brightness-90 backdrop-blur-sm bg-white/0 p-8 rounded-xl mx-6 my-10">
          <div className="px-16">
            {/* Heading */}
            <h2 className="text-3xl mb-4 text-purple-700">
              <span className="font-bold">Track and Assess </span>
              <span className="font-normal">planned interventions</span>
            </h2>

            {/* Bullet Points */}
            <ul className="list-disc list-inside text-black text-sm font-medium space-y-3 mb-6">
              <li>
                Presenting you a suite of dashboards enabling continuous
                monitoring of Natural Resource Management (NRM) interventions
                undertaken in an area, and ex-post assessment of their impact.
              </li>
              <li>
                Use <b>Jaltol</b> to monitor changes in cropping pattern in
                villages where extensive watershed development programmes were
                undertaken.
              </li>
              <li>
                Agroforestry practitioners can assess the health of tree
                plantations over time with <b>&lt;Plantation Dashboard&gt;</b>.
              </li>
              <li>
                Track waterbody rejuvenation interventions and their impact on
                cropping in nearby areas with <b>&lt;WaterBody Dashboard&gt;</b>
                .
              </li>
            </ul>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto mt-8">
              {[
                {
                  title: "Jaltol App",
                  description:
                    "Monitor changes in cropping patterns and assess the impact of watershed development interventions.",
                  icon: "🌾",
                  link: "https://welllabs.org/jaltol/",
                },
                {
                  title: "Agroforestry Plantations",
                  description:
                    "Track the health and growth of plantations across time and space using satellite-based monitoring.",
                  icon: "🌳",
                },
                {
                  title: "Waterbody Rejuvenation",
                  description:
                    "Visualize waterbody interventions and evaluate their effects on water availability and agriculture.",
                  icon: "💧",
                  link: "https://development-waterbody-dashboard.d2s4eeyazvtd2g.amplifyapp.com/water_dashboard",
                },
                {
                  title: "Commons Connect Plans",
                  description:
                    "The tools, guides and plans that folks trust when they need to organize and track their landscape efforts.",
                  icon: "☀️",
                },
              ].map((item, index) => (
                <div key={index} className="h-full">
                  <div
                    onClick={() =>
                      item.link && window.open(item.link, "_blank")
                    }
                    className="cursor-pointer bg-white rounded-2xl shadow-md p-8 h-full min-h-[280px] flex flex-col justify-start transform transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02]"
                  >
                    <div className="flex items-start gap-4">
                      <div className="bg-yellow-100 text-yellow-500 rounded-full w-14 h-14 flex items-center justify-center text-2xl">
                        {item.icon}
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold mb-2 text-gray-900">
                          {item.title}
                        </h3>
                        <p className="text-sm text-gray-700 mb-3">
                          {item.description}
                        </p>
                        {item.link ? (
                          <span className="text-purple-700 font-medium text-sm hover:underline">
                            Learn More →
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm italic">
                            Coming soon...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
