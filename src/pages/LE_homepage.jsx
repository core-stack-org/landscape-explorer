import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { useRecoilState } from "recoil";
import Lenis from "lenis";
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
  const scrollRef = useRef(null);
  const lenisRef = useRef(null);

  const [statesData, setStatesData] = useRecoilState(stateDataAtom);
  const [state, setState] = useRecoilState(stateAtom);
  const [district, setDistrict] = useRecoilState(districtAtom);
  const [block, setBlock] = useRecoilState(blockAtom);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const el = scrollRef.current;
    if (!el) return;

    const content = el.firstElementChild;
    if (!content) return;

    let lenis;
    const init = () => {
      lenis = new Lenis({
        wrapper: el,
        content,
        eventsTarget: el,
        smoothWheel: true,
        syncTouch: true,
        syncTouchLerp: 0.12,
        lerp: 0.18,
        wheelMultiplier: 1.1,
        touchMultiplier: 1.15,
        autoRaf: true,
        duration: 1.15,
      });
      lenisRef.current = lenis;
    };

    requestAnimationFrame(() => requestAnimationFrame(init));

    return () => {
      lenisRef.current = null;
      if (lenis) lenis.destroy();
    };
  }, []);

  const scrollToBottom = () => {
    if (lenisRef.current) {
      const limit = lenisRef.current.limit;
      lenisRef.current.scrollTo(limit?.max ?? 1e6, { duration: 1.2 });
    } else if (scrollRef.current) {
      const el = scrollRef.current;
      el.scrollTo({ top: el.scrollHeight - el.clientHeight, behavior: "smooth" });
    }
  };

  const scrollToSection = (sectionId) => {
    const selector = `#${sectionId}`;
    if (lenisRef.current) {
      lenisRef.current.scrollTo(selector, { duration: 1.1, offset: -80 });
    } else {
      const el = document.querySelector(selector);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

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
    <div className="font-sans h-screen flex flex-col">
      <header className="shrink-0">
        <LandingNavbar />
      </header>

      {/* In-page navigation for smooth scrolling between sections */}
      <div className="shrink-0 border-b border-purple-50 bg-white/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-2 flex flex-wrap gap-2 text-sm">
          <button
            type="button"
            onClick={() => scrollToSection("landing-know-section")}
            className="px-3 py-1 rounded-full border border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors"
          >
            Know
          </button>
          <button
            type="button"
            onClick={() => scrollToSection("landing-plan-section")}
            className="px-3 py-1 rounded-full border border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors"
          >
            Plan
          </button>
          <button
            type="button"
            onClick={() => scrollToSection("landing-track-section")}
            className="px-3 py-1 rounded-full border border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors"
          >
            Track &amp; Assess
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={scrollToBottom}
        className="fixed bottom-12 right-6 z-50 flex items-center justify-center w-12 h-12 rounded-full bg-white/90 hover:bg-white text-purple-700 border border-purple-200 shadow-md hover:shadow-lg transition-all"
        aria-label="Scroll to bottom"
      >
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M19 12l-7 7-7-7" />
        </svg>
      </button>

      <main ref={scrollRef} className="landing-scroll-container flex-1 min-h-0">
        <div
          className="landing-scroll-content min-h-full bg-cover bg-center bg-no-repeat pt-8 md:pt-12"
          style={{ backgroundImage: `url(${landingPageBg})` }}
        >
        {/* Know Section */}
        <section
          id="landing-know-section"
          className="landing-section backdrop-brightness-90 bg-white/10 px-4 pt-8 pb-6 md:px-10 md:pt-10 md:pb-10 rounded-xl mx-2 md:mx-6 mb-4 md:mb-6"
          style={{ position: "relative", overflow: "visible", zIndex: 10 }}
        >
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
            <div className="w-full lg:w-1/2">
              <h2 className="text-3xl md:text-4xl mb-4">
                <span className="font-bold text-purple-700">Know</span>{" "}
                <span className="font-normal text-purple-700">
                  your landscape
                </span>
              </h2>

              <ul className="list-disc list-outside ml-5 text-black text-base md:text-lg space-y-3 font-medium text-justify">
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
            <div className="flex flex-col items-end gap-0 ">
              {/* First Card */}
              <div
                className="w-full max-w-lg bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-gray-100 flex flex-col justify-between relative"
                style={{ overflow: "visible", zIndex: 100 }}
              >
                <p className="mb-0 text-center font-semibold text-xl md:text-2xl text-gray-800 leading-none">
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
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg w-full sm:w-auto"
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
        <section id="landing-plan-section" className="landing-section backdrop-brightness-90 bg-white/10 px-4 py-6 md:px-10 md:py-10 rounded-xl mx-2 md:mx-6 my-6">
          <div>
            <div className="w-full lg:w-2/3 mb-10">
              <h2 className="text-3xl md:text-4xl mb-4">
                <span className="font-bold text-purple-700">Plan</span>{" "}
                <span className="font-normal text-purple-700">
                  for a sustainable tomorrow
                </span>
              </h2>

              <ul className="list-disc list-outside ml-5 text-black text-base md:text-lg space-y-3 font-medium text-justify">
                <li>
                  <b>Identification of the right problems</b> is key to
                  sustainable Natural Resource Management (NRM). Commons Connect
                  is a community-focused app enabling landscape stewards to plan
                  NRM works in a participatorily manner.
                </li>
                <li>
                  <b>Assess and raise demands</b>: This tool provides decision
                  support to identify suitable sites for NRM assets and supports
                  community reflection on equity in resource ownership and use.
                </li>
                <li>
                  <b>Develop Detailed Project Reports (DPRs)</b> in an automated
                  manner that can be integrated into the GPDP, MGNREGS, and
                  other processes.
                </li>
              </ul>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Card 1 */}
              <a
                href="https://www.youtube.com/watch?v=ln7wpoW7Eg4&list=PLZ0pcz8ccRmIU8wHzHv-CbDOs4JOqgNHC"
                target="_blank"
                rel="noopener noreferrer"
                className="block hover:shadow-lg transition duration-200 ease-in-out"
              >
                <div className="flex flex-col items-center text-center cursor-pointer">
                  <div className="w-full max-w-[420px] aspect-square mx-auto rounded overflow-hidden shadow mb-4 relative">
                    <img
                      src={participatoryImg}
                      alt="Participatory Planning"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="p-4">
                    <h3 className="font-bold mb-2 text-sm">
                      How to do Participatory Planning?
                    </h3>
                    <p className="text-xs text-gray-700 mb-2">
                      View tutorial videos to conduct a rapid PRA and create
                      DPRs using Commons Connect.
                    </p>
                    <span className="text-purple-700 text-sm font-semibold underline">
                      Learn More →
                    </span>
                  </div>
                </div>
              </a>

              {/* Card 2  */}
              <a
                href="https://play.google.com/store/apps/details?id=com.corestack.commonsconnect"
                target="_blank"
                rel="noopener noreferrer"
                className="block hover:shadow-lg transition duration-200 ease-in-out"
              >
                <div className="flex flex-col items-center text-center cursor-pointer">
                  <div className="w-full max-w-[420px] aspect-square mx-auto rounded overflow-hidden shadow mb-4 relative">
                    <img
                      src={newLogo}
                      alt="Commons Connect App"
                      className="w-full h-full object-cover object-center"
                    />
                  </div>

                  <div className="p-4">
                    <h3 className="font-bold mb-2 text-sm">
                      Download Commons Connect App
                    </h3>
                    <p className="text-xs text-gray-700 mb-2">
                      An Android app to guide you in a step-by-step manner to
                      record community demands for NRM assets.
                    </p>
                    <span className="text-purple-700 text-sm font-semibold underline">
                      Download Now →
                    </span>
                  </div>
                </div>
              </a>

              {/*  Card 3 */}
              <div onClick={() => navigate("/CCUsagePage")}
                className="cursor-pointer hover:shadow-lg transition duration-200 ease-in-out"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-full max-w-[420px] aspect-square mx-auto rounded overflow-hidden shadow mb-4 relative">
                    <img
                      src={planAndView}
                      alt="View and Support Plans"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </div>

                  <div className="p-4">
                    <h3 className="font-bold mb-2 text-sm">
                      View and Support Plans
                    </h3>
                    <p className="text-xs text-gray-700 mb-2">
                      Explore existing community plans and find opportunities to
                      support or collaborate with ongoing initiatives.
                    </p>
                    <span className="text-purple-700 text-sm font-semibold underline">
                      Learn More →
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Track Section */}
        <section
          id="landing-track-section"
          className="landing-section backdrop-brightness-90 bg-white/10 px-4 py-6 md:px-10 md:py-10 rounded-xl mx-2 md:mx-6 mt-6"
        >
          <div>
            {/* Narrow text container */}
            <div className="w-full lg:w-2/3 mb-10">
              <h2 className="text-2xl md:text-4xl mb-4 text-purple-700">
                <span className="font-bold">Track and Assess </span>
                <span className="font-normal">NRM interventions</span>
              </h2>
              <ul className="list-disc list-outside ml-5 text-black text-base md:text-xl font-medium space-y-5 mb-6 text-justify">
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

            {/* Full-width cards container */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
              {[
                {
                  title: "Jaltol App",
                  description:
                    "Monitor changes in cropping patterns and assess the impact of watershed development interventions.",
                  icon: "🌾",
                  link: "https://welllabs.org/jaltol/",
                },
                {
                  title: "Agrohorticulture Plantations",
                  description:
                    "Track the health and growth of plantations across time using satellite-based monitoring.",
                  icon: "🌳",
                  link:"/agrohorticulture"
                },
                {
                  title: "Waterbody Rejuvenation",
                  description:
                    "Visualize waterbody interventions and evaluate their effects on water availability and agriculture.",
                  icon: "💧",
                  link: "/rwb",
                },
                {
                  title: "Commons Connect Plans",
                  description:
                    "Site and landscape level tracking of plans built using Commons Connect",
                  icon: "☀️",
                },
              ].map((item, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    if (item.link) {
                      handleNavigate(item.link, item.title);
                    }
                  }}
                  className={`w-full h-full text-left rounded-2xl border transition-all duration-300 transform focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
                    item.link
                      ? "bg-white border-gray-100 shadow-md hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02]"
                      : "bg-gray-50 border-dashed border-gray-300 text-gray-400 cursor-default"
                  }`}
                >
                  <div className="flex flex-col h-full p-6 sm:p-8">
                    <div className="flex items-start gap-4">
                      <div
                        className={`rounded-full w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center text-xl sm:text-2xl ${
                          item.link
                            ? "bg-yellow-100 text-yellow-500"
                            : "bg-gray-200 text-gray-400"
                        }`}
                      >
                        {item.icon}
                      </div>
                      <div className="flex-1">
                        <h3
                          className={`text-lg sm:text-xl font-semibold mb-2 ${
                            item.link ? "text-gray-900" : "text-gray-500"
                          }`}
                        >
                          {item.title}
                        </h3>
                        <p
                          className={`text-sm mb-3 card-description-clamp ${
                            item.link ? "text-gray-700" : "text-gray-400"
                          }`}
                        >
                          {item.description}
                        </p>
                        {item.link ? (
                          <span className="inline-flex items-center gap-1 text-purple-700 font-medium text-sm hover:underline">
                            Learn More →
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 bg-gray-200/70 px-2 py-1 rounded-full">
                            Coming soon
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
        </div>
      </main>
      <footer className="shrink-0">
        <Footer />
      </footer>
    </div>
  );
}
