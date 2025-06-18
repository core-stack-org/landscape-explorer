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
              <h2 className="text-3xl font-bold text-purple-700 mb-2">Know</h2>
              <p className="font-semibold text-black mb-6">
                By bringing together over two dozen geospatial layers and
                datapoints, the Know Your Landscape dashboard allows
                unprecedented ability to understand the diversity and plan
                context-sensitive action strategies suited to different areas.
                This can be used to get an instant report on any micro-watershed
                (about 10km
                <sup>2</sup> areal extent) in a Tehsil in terms of its terrain,
                land-use, cropping pattern, forest health, rainfall, groundwater
                stress, socio-economic information, etc. It also allows users to
                discover unique patterns in different parts of a Tehsil/Block
                and plan Natural Resource Management (NRM) activities
                accordingly.
              </p>

              <div className="bg-purple-50 border-l-4 border-purple-500 text-purple-700 p-4 rounded-md mb-6">
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
              <p className="mb-4">Select Location</p>
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
            <div className="flex flex-col md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-3xl font-bold text-purple-700 mb-2">
                  Plan
                </h2>
              </div>
              <div className="w-full max-w-5xl">
                <p className="font-semibold text-black mb-6">
                  The Commons Connect application empowers communities and
                  landscape stewards to plan Natural Resource Management (NRM)
                  works in their villages in a participatory manner. It provides
                  decision support to determine appropriate sites for different
                  types of works, features to encourage communities to reflect
                  on the equity in resource ownership and access and factor it
                  in future planning, and develop Detailed Project Reports
                  (DPRs) in an automated manner that can be integrated into the
                  GPDP, MGNREGS, and other processes.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
              {/* Card 1 */}
              <div>
                {/* Image block */}
                <div className="w-full aspect-[4/4] overflow-hidden rounded shadow mb-4">
                  <img
                    src={participatoryImg}
                    alt="Participatory Planning"
                    className="h-full w-full object-fill"
                  />
                </div>

                {/* Content block */}
                <div className=" p-4 rounded text-left">
                  <h3 className="font-bold mb-2 text-sm">
                    How to do Participatory Planning?
                  </h3>
                  <p className="text-xs text-gray-700 mb-2">
                    Greater orch pack chuck teritorial federal midlothian
                    organic class american explict. Mark s soft cover terrapass
                    key salsa, guide expansion.
                  </p>
                  {/* Inside Card 1 */}
                  <button
                    onClick={() => setShowVideo(true)}
                    className="text-purple-700 text-sm font-semibold"
                  >
                    Learn More →
                  </button>

                  {showVideo && (
                    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
                      <div className="bg-white  rounded-xl max-w-4xl w-full relative">
                        <button
                          onClick={() => setShowVideo(false)}
                          className="absolute top-2 right-2 text-gray-600 text-xl font-bold"
                        >
                          ✕
                        </button>

                        {/* Responsive video container */}
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

              {/* Card 2 */}
              <div>
                <div className="w-full aspect-[4/4] rounded overflow-hidden shadow mb-4 relative">
                  <img
                    src={newLogo}
                    alt="Participatory Planning"
                    className="absolute inset-0 w-full h-full object-cover object-center"
                  />
                </div>
                <div className=" p-4 rounded-b text-left">
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

              {/* Card 3 */}
              <div>
                <div className="w-full aspect-[4/4] rounded overflow-hidden shadow mb-4 relative">
                  <img
                    src={planAndView}
                    alt="Participatory Planning"
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
            <div className="flex flex-col md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-3xl font-bold text-purple-700 mb-2">
                  Track and Assess
                </h2>
              </div>
              <div className="w-full max-w-5xl">
                <p className="font-semibold text-black mb-6">
                  A suite of dashboards enables continuous monitoring of Natural
                  Resource Management (NRM) interventions undertaken in an area,
                  and ex-post assessment of their impact. This includes Jaltol
                  to observe changes in cropping pattern that have taken place
                  in villages where extensive watershed development programmes
                  were undertaken. For agroforestry practitioners, it provides
                  the ability to monitor the health of tree plantations over
                  time. Similarly, it provides a dashboard to track waterbody
                  rejuvenation interventions and their impact on cropping in
                  nearby areas.
                </p>
              </div>
            </div>

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
                <div
                  key={index}
                  className="bg-white rounded-2xl shadow-md p-8 transform transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02]"
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
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-700 font-medium text-sm hover:underline"
                        >
                          Learn More →
                        </a>
                      ) : (
                        <span className="text-gray-400 text-sm italic">
                          Coming soon...
                        </span>
                      )}
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
