import React, { useEffect, useState } from "react";
import newLogo from "../assets/newlogoWhite.png";
import { useLocation } from "react-router-dom";
import { BookOpen, Compass, ExternalLink, FileSpreadsheet, Info } from "lucide-react";
import { CORE_STACK_NOTEBOOKS_URL } from "./geolibre/notebookResources";
import GeoLibreTour from "./geolibre/GeoLibreTour";
import { downloadExcel } from "./landscape-explorer/utils/downloadHelper";

const HeaderTooltip = ({ children, text }) => (
  <div className="group relative">
    {children}
    <div
      role="tooltip"
      className="pointer-events-none absolute right-0 top-full z-[100] mt-2 w-64 rounded-lg bg-slate-900 px-3 py-2 text-xs leading-5 text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
    >
      {text}
    </div>
  </div>
);

const LandingNavbar = ({
  downloadScope = null,
  onResetExplorer,
  onChooseLocation,
}) => {
  const location = useLocation();
  const isExploreDataPage = location.pathname.replace(/\/$/, "") === "/explore_data";
  const isHomePage = location.pathname === "/";
  const isKylDashboard = location.pathname === "/kyl_dashboard";
  const [explorerReset, setExplorerReset] = useState(false);
  useEffect(() => setExplorerReset(false), [downloadScope?.state, downloadScope?.district, downloadScope?.tehsil]);
  const canResetExplorer = isExploreDataPage && onResetExplorer;
  const Brand = canResetExplorer ? "button" : "a";
  const brandAction = explorerReset ? "Choose another tehsil" : "Reset tehsil view";
  const handleBrandClick = () => {
    setShowGeoLibreTour(false);
    if (explorerReset) onChooseLocation();
    else { onResetExplorer(); setExplorerReset(true); }
  };
  const [showTooltip, setShowTooltip] = useState(false);
  const [showGeoLibreTour, setShowGeoLibreTour] = useState(false);
  const [isDownloadingDataSheet, setIsDownloadingDataSheet] = useState(false);

  const canDownloadDataSheet = Boolean(
    downloadScope?.state && downloadScope?.district && downloadScope?.tehsil
  );

  const handleIndicatorsClick = () => {
    window.open(
      "https://docs.google.com/document/d/13wht82tXmw0x-ORfVLYBnfUDkkabzqOxvqwmIXGRmpk/edit?usp=sharing",
      '_blank',
      'noopener,noreferrer'
    );
  };

  const handleDataSheetDownload = async () => {
    if (!canDownloadDataSheet || isDownloadingDataSheet) return;

    setIsDownloadingDataSheet(true);
    const query = new URLSearchParams({
      state: downloadScope.state,
      district: downloadScope.district,
      block: downloadScope.tehsil,
    });
    const apiBaseUrl = (
      process.env.REACT_APP_API_URL ||
      "https://geoserver.core-stack.org/api/v1"
    ).replace(/\/$/, "");

    try {
      await downloadExcel(
        `${apiBaseUrl}/download_excel_layer?${query.toString()}`,
        `${downloadScope.tehsil}_data.xlsx`
      );
    } finally {
      setIsDownloadingDataSheet(false);
    }
  };

  return (
    <nav className="bg-white shadow-2xl sticky top-0 z-50">
      <div className="w-full px-4 sm:px-6 md:px-10">
        <div className="flex flex-col sm:flex-row items-center justify-between h-auto sm:h-20 py-4 sm:py-0 gap-4 sm:gap-0">
          <Brand
            {...(canResetExplorer ? { type: "button", onClick: handleBrandClick } : { href: "/" })}
            aria-label={canResetExplorer ? brandAction : "Go to the main explorer"}
            className="flex items-center gap-3 cursor-pointer text-left"
          >
            <img
              src={newLogo}
              alt="Corestack Logo"
              className="h-14 w-14 sm:h-[70px] sm:w-[70px] shrink-0"
            />
            <span className="text-lg sm:text-xl font-semibold text-gray-800">
              CoRE Stack
              {canResetExplorer && <span className="block text-xs font-normal text-gray-600">{brandAction}</span>}
            </span>
          </Brand>

          <div className="flex flex-wrap gap-3 items-center justify-center">
            {isExploreDataPage && (
              <>
                <HeaderTooltip text="New to the map? See where to find layers and try a few useful ways to explore your landscape.">
                  <button
                    type="button"
                    onClick={() => setShowGeoLibreTour(true)}
                    className="flex items-center gap-2 rounded-lg border border-purple-300 bg-purple-700 px-4 py-2 text-white transition-all duration-200 hover:bg-purple-800"
                    aria-label="Start the GeoLibre quick tour"
                  >
                    <Compass className="h-4 w-4" />
                    Quick Tour
                  </button>
                </HeaderTooltip>

                <HeaderTooltip text="Explore CoRE Stack data with Python notebooks in Google Colab.">
                  <a
                    href={CORE_STACK_NOTEBOOKS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-sm font-semibold text-purple-800 hover:bg-purple-100"
                  >
                    <BookOpen className="h-4 w-4" aria-hidden="true" />
                    CoRE Stack Notebooks
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </a>
                </HeaderTooltip>

                <HeaderTooltip text={canDownloadDataSheet ? "Download the Excel datasheet for the selected tehsil." : "Select a state, district, and tehsil to download its datasheet."}>
                  <button
                    type="button"
                    onClick={handleDataSheetDownload}
                    disabled={!canDownloadDataSheet || isDownloadingDataSheet}
                    className="flex items-center justify-center rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 transition-colors duration-200 hover:bg-emerald-100 focus:outline-none disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:hover:bg-gray-100"
                    aria-label="Download Excel for the selected tehsil"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    <span className="ml-2">
                      {isDownloadingDataSheet ? "Downloading…" : "Download Excel"}
                    </span>
                  </button>
                </HeaderTooltip>

                <HeaderTooltip text="Learn how to download CoRE Stack layers and open them in QGIS.">
                  <a
                    href="https://docs.google.com/document/d/1jet4EEBbbKgpNrPnuNJJDRuAJUiR2pIMFQp9JTlygAQ/edit?usp=sharing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-4 py-2 transition-all duration-200 hover:bg-purple-100"
                    aria-label="Open QGIS Documentation in a new tab"
                  >
                    <span className="text-sm font-medium text-purple-700 sm:text-base">
                      QGIS Documentation
                    </span>
                    <ExternalLink className="h-4 w-4 text-purple-600" />
                  </a>
                </HeaderTooltip>
              </>
            )}

            {isHomePage && (
              <>
                <a
                  href="https://ee-corestackdev.projects.earthengine.app/view/core-stack-gee-app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-50 hover:bg-purple-100 transition-all duration-200 border border-purple-200 group"
                >
                  <span className="text-sm sm:text-base font-medium text-purple-700 group-hover:text-purple-800">
                    Explore GEE App
                  </span>
                  <ExternalLink className="h-4 w-4 text-purple-600 group-hover:scale-110 transition-transform" />
                </a>

                <a
                  href="https://dashboard.core-stack.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-50 hover:bg-purple-100 transition-all duration-200 border border-purple-200 group"
                >
                  <span className="text-sm sm:text-base font-medium text-purple-700 group-hover:text-purple-800">
                    Project Management Dashboard
                  </span>
                  <ExternalLink className="h-4 w-4 text-purple-600 group-hover:scale-110 transition-transform" />
                </a>
              </>
            )}

            {isKylDashboard && (
              <div className="relative">
                <button
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 transition-all duration-200 group border border-purple-200"
                  onClick={handleIndicatorsClick}
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                >
                  <Info className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 group-hover:scale-110 transition-transform" />
                  <span className="text-sm sm:text-base font-medium text-purple-700 group-hover:text-purple-800">
                    KYL Indicators
                  </span>
                </button>

                {showTooltip && (
                  <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-purple-100 rounded-lg shadow-xl p-3 z-50">
                    <p className="text-xs text-gray-600">
                      Click to learn more about the indicators used in the KYL dashboard
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <GeoLibreTour
        open={showGeoLibreTour}
        onClose={() => setShowGeoLibreTour(false)}
      />
    </nav>
  );
};

export default LandingNavbar;
