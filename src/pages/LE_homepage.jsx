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
import { useTranslation } from "react-i18next";

export default function KYLHomePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

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

  const trackCards = [
    {
      key: "jaltol",
      titleKey: "home.track.jaltol_title",
      descKey: "home.track.jaltol_desc",
      icon: "🌾",
      link: "https://welllabs.org/jaltol/",
    },
    {
      key: "agro",
      titleKey: "home.track.agro_title",
      descKey: "home.track.agro_desc",
      icon: "🌳",
      link: "/agrohorticulture",
    },
    {
      key: "water",
      titleKey: "home.track.water_title",
      descKey: "home.track.water_desc",
      icon: "💧",
      link: "/rwb",
    },
    {
      key: "commons",
      titleKey: "home.track.commons_title",
      descKey: "home.track.commons_desc",
      icon: "☀️",
    },
  ];

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
                <span className="font-bold text-purple-700">{t("home.know.heading_bold")}</span>{" "}
                <span className="font-normal text-purple-700">
                  {t("home.know.heading_normal")}
                </span>
              </h2>

              <ul className="list-disc list-outside ml-5 text-black text-base md:text-lg space-y-3 font-medium text-justify">
                <li>{t("home.know.bullet1")}</li>
                <li>{t("home.know.bullet2")}</li>
                <li>{t("home.know.bullet3")}</li>
              </ul>

              <div className="bg-purple-50 border-l-4 border-purple-500 text-purple-700 p-4 rounded-md mt-8">
                <p className="text-sm">
                  {t("home.know.visionDemo")}{" "}
                  <a
                    href="https://www.youtube.com/playlist?list=PLZ0pcz8ccRmL3wTPRctaVFomGmgJFmM13"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-medium hover:text-purple-900"
                  >
                    {t("home.know.visionDemoLink")}
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
                  {t("home.know.selectLocation")}
                </p>

                <div className="space-y-4 mt-5 relative">
                  <div className="relative z-[9999]">
                    <SelectButton
                      currVal={state}
                      placeholder={t("home.know.selectState")}
                      stateData={statesData}
                      translateNamespace="states"
                      handleItemSelect={handleItemSelect}
                      setState={setState}
                    />
                  </div>

                  <div className="relative z-[9998]">
                    <SelectButton
                      currVal={district}
                      placeholder={t("home.know.selectDistrict")}
                      stateData={state ? state.district : null}
                      translateNamespace="districts"
                      handleItemSelect={handleItemSelect}
                      setState={setDistrict}
                    />
                  </div>

                  <div className="relative z-[9997]">
                    <SelectButton
                      currVal={block}
                      placeholder={t("home.know.selectTehsil")}
                      stateData={district ? district.blocks : null}
                      translateNamespace="blocks"
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
                    {t("home.know.knowYourLandscape")}
                  </button>
                  <button
                    className="bg-gray-300 text-black px-4 py-2 rounded-lg w-full sm:w-auto"
                    onClick={() =>
                      handleNavigate("/download_layers", "Download Layers")
                    }
                  >
                    {t("home.know.downloadLayers")}
                  </button>
                  <button
                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg w-full sm:w-auto"
                    onClick={() =>
                      handleNavigate("/region-comparison", "Region Comparison")
                    }
                  >
                    Region Comparison
                  </button>
                </div>
              </div>

              {/* Second Card */}
              <div className="bg-purple-50 border-l-4 border-purple-500 text-purple-700 p-4 rounded-md mt-4 max-w-lg w-full">
                <p className="text-sm">
                  {t("home.know.generateData")}{" "}
                  <a
                    href="https://forms.gle/HoyfwBbHU8c29TYb8"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-medium hover:text-purple-900"
                  >
                    {t("home.know.generateDataLink")}
                  </a>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Plan Section */}
        <section className="snap-start backdrop-brightness-90 backdrop-blur-sm bg-white/0 px-4 py-6 md:px-10 md:py-10 rounded-xl mx-2 md:mx-6 my-6">
          <div>
            <div className="w-full lg:w-2/3 mb-10">
              <h2 className="text-3xl md:text-4xl mb-4">
                <span className="font-bold text-purple-700">{t("home.plan.heading_bold")}</span>{" "}
                <span className="font-normal text-purple-700">
                  {t("home.plan.heading_normal")}
                </span>
              </h2>

              <ul className="list-disc list-outside ml-5 text-black text-base md:text-lg space-y-3 font-medium text-justify">
                <li>
                  <b>{t("home.plan.bullet1_bold")}</b>{t("home.plan.bullet1_rest")}
                </li>
                <li>
                  <b>{t("home.plan.bullet2_bold")}</b>{t("home.plan.bullet2_rest")}
                </li>
                <li>
                  <b>{t("home.plan.bullet3_bold")}</b>{t("home.plan.bullet3_rest")}
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
                    <h3 className="font-bold mb-2 text-sm">{t("home.plan.card1_title")}</h3>
                    <p className="text-xs text-gray-700 mb-2">{t("home.plan.card1_desc")}</p>
                    <span className="text-purple-700 text-sm font-semibold underline">
                      {t("home.plan.learnMore")}
                    </span>
                  </div>
                </div>
              </a>

              {/* Card 2 */}
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
                    <h3 className="font-bold mb-2 text-sm">{t("home.plan.card2_title")}</h3>
                    <p className="text-xs text-gray-700 mb-2">{t("home.plan.card2_desc")}</p>
                    <span className="text-purple-700 text-sm font-semibold underline">
                      {t("home.plan.downloadNow")}
                    </span>
                  </div>
                </div>
              </a>

              {/* Card 3 */}
              <div
                onClick={() => navigate("/CCUsagePage")}
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
                    <h3 className="font-bold mb-2 text-sm">{t("home.plan.card3_title")}</h3>
                    <p className="text-xs text-gray-700 mb-2">{t("home.plan.card3_desc")}</p>
                    <span className="text-purple-700 text-sm font-semibold underline">
                      {t("home.plan.learnMore")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Track Section */}
        <section className="snap-start backdrop-brightness-90 backdrop-blur-sm bg-white/0 px-4 py-6 md:px-10 md:py-10 rounded-xl mx-2 md:mx-6 mt-6">
          <div>
            <div className="w-full lg:w-2/3 mb-10">
              <h2 className="text-2xl md:text-4xl mb-4 text-purple-700">
                <span className="font-bold">{t("home.track.heading_bold")}</span>
                <span className="font-normal">{t("home.track.heading_normal")}</span>
              </h2>
              <ul className="list-disc list-outside ml-5 text-black text-base md:text-xl font-medium space-y-5 mb-6 text-justify">
                <li>{t("home.track.bullet1")}</li>
                <li>
                  {t("home.track.bullet2_pre")}<b>{t("home.track.bullet2_bold")}</b>{t("home.track.bullet2_post")}
                </li>
                <li>
                  {t("home.track.bullet3_pre")}<b>{t("home.track.bullet3_bold")}</b>{t("home.track.bullet3_post")}
                </li>
                <li>
                  {t("home.track.bullet4_pre")}<b>{t("home.track.bullet4_bold")}</b>{t("home.track.bullet4_post")}
                </li>
              </ul>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
              {trackCards.map((item) => (
                <div key={item.key} className="h-full">
                  <div
                    onClick={() => {
                      if (item.link) {
                        handleNavigate(item.link, t(item.titleKey));
                      }
                    }}
                    className="cursor-pointer bg-white rounded-2xl shadow-md p-6 sm:p-8 h-full min-h-[220px] flex flex-col justify-start transform transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02]"
                  >
                    <div className="flex items-start gap-4">
                      <div className="bg-yellow-100 text-yellow-500 rounded-full w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center text-xl sm:text-2xl">
                        {item.icon}
                      </div>
                      <div>
                        <h3 className="text-lg sm:text-xl font-semibold mb-2 text-gray-900">
                          {t(item.titleKey)}
                        </h3>
                        <p className="text-sm text-gray-700 mb-3">
                          {t(item.descKey)}
                        </p>
                        {item.link ? (
                          <span className="text-purple-700 font-medium text-sm hover:underline">
                            {t("home.track.learnMore")}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm italic">
                            {t("home.track.comingSoon")}
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

      <Footer />
    </div>
  );
}
