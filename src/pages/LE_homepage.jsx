import React, { useEffect } from "react";
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
      {/* Know Section */}
      <section
        className="bg-cover bg-center bg-no-repeat py-12 px-6"
        style={{ backgroundImage: `url(${landingPageBg})` }}
      >
        {" "}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between">
          <div className="pl-16 pr-8 md:w-1/2">
            <h2 className="text-3xl font-bold text-purple-700 mb-2">Know</h2>
            <p className="font-semibold text-black mb-6">
              Know More About your Landscape qualities and see what’s there in
              your surroundings
            </p>
          </div>
          <div className="bg-white p-6 rounded shadow max-w-md w-full mr-10">
            <p className="mb-4">
              Lorem ipsum dolor sit amet consectetur. Egestas nisl semper magna
              non eu nisi.
            </p>
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
      <section className="bg-[#eac5c5] py-12 px-6">
        <div className="px-16">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-3xl font-bold text-purple-700 mb-2">Plan</h2>
            </div>
            <div className="md:max-w-xl">
              <p className="font-semibold text-black mb-6">
                Know More About on what can be done in your area, and have tools
                which empower your Planning
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
            {/* Card 1 */}
            <div>
              {/* Image block */}
              <div className="bg-gray-400 h-48 w-full rounded shadow mb-4"></div>

              {/* Content block */}
              <div className=" p-4 rounded text-left">
                <h3 className="font-bold mb-2 text-sm">
                  How to do Participatory Planning?
                </h3>
                <p className="text-xs text-gray-700 mb-2">
                  Greater orch pack chuck teritorial federal midlothian organic
                  class american explict. Mark s soft cover terrapass key salsa,
                  guide expansion.
                </p>
                <a href="#" className="text-purple-700 text-sm font-semibold">
                  Learn More →
                </a>
              </div>
            </div>

            {/* Card 2 */}
            <div>
              <div className="bg-gray-400 h-48 w-full rounded shadow mb-4"></div>
              <div className=" p-4 rounded-b text-left">
                <h3 className="font-bold mb-2 text-sm">
                  Download Commons Connect App
                </h3>
                <p className="text-xs text-gray-700 mb-2">
                  Access tools and resources for landscape planning directly on
                  your smartphone using our free mobile app.
                </p>
                <a href="#" className="text-purple-700 text-sm font-semibold">
                  Download now →
                </a>
              </div>
            </div>

            {/* Card 3 */}
            <div>
              <div className="bg-gray-400 h-48 w-full rounded shadow mb-4"></div>
              <div className=" p-4 rounded-b  text-left">
                <h3 className="font-bold mb-2 text-sm">
                  View and Support Plans
                </h3>
                <p className="text-xs text-gray-700 mb-2">
                  Explore existing community plans and find opportunities to
                  support or collaborate with ongoing initiatives.
                </p>
                <a href="#" className="text-purple-700 text-sm font-semibold">
                  Learn More →
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Track Section */}
      <section className="bg-[#cbaaaa] py-12 px-6 text-center">
        <h2 className="text-3xl font-bold text-purple-700 mb-2">Track</h2>
        <p className="font-semibold text-black mb-8 max-w-2xl mx-auto">
          Using our powerful set of tools you can track the work going on in the
          area, and what others are doing.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {[
            "Jalti App",
            "Agroforestry Plantations",
            "Waterbody Rejuvenation",
          ].map((title, index) => (
            <div
              key={index}
              className="bg-white p-4 rounded shadow flex items-start gap-4 text-left"
            >
              <div className="text-yellow-400 text-2xl">☀️</div>
              <div>
                <h3 className="font-bold mb-1">{title}</h3>
                <p className="text-sm mb-2">
                  Some brief description about the tool and how it helps track
                  landscape work.
                </p>
                <a href="#" className="text-purple-700 font-semibold text-sm">
                  Learn More →
                </a>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center mt-6">
          <div className="bg-white p-4 rounded shadow flex items-start gap-4 text-left max-w-md w-full">
            <div className="text-yellow-400 text-2xl">☀️</div>
            <div>
              <h3 className="font-bold mb-1">Commons Connect Plans</h3>
              <p className="text-sm mb-2">
                The tools, guides and plans that folks trust when they need to
                organize and track their landscape efforts.
              </p>
              <a href="#" className="text-purple-700 font-semibold text-sm">
                Learn More →
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
