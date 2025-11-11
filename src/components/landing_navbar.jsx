import React, { useState } from "react";
import newLogo from "../assets/newlogoWhite.png";
import { useLocation } from "react-router-dom";
import { Info, ExternalLink } from "lucide-react";

const LandingNavbar = () => {
  const location = useLocation();
  const isDownloadPage = location.pathname === "/download_layers";
  const [showTooltip, setShowTooltip] = useState(false);

  const handleIndicatorsClick = () => {
    window.open(
      "https://docs.google.com/document/d/13wht82tXmw0x-ORfVLYBnfUDkkabzqOxvqwmIXGRmpk/edit?usp=sharing",
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    <nav className="bg-white shadow-2xl sticky top-0 z-50">
      <div className="w-full px-4 sm:px-6 md:px-10">
        <div className="flex flex-col sm:flex-row items-center justify-between h-auto sm:h-20 py-4 sm:py-0 gap-4 sm:gap-0">
          <a
            href="https://core-stack.org"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 cursor-pointer"
          >
            <img
              src={newLogo}
              alt="Corestack Logo"
              className="h-14 w-14 sm:h-[70px] sm:w-[70px] shrink-0"
            />
            <span className="text-lg sm:text-xl font-semibold text-gray-800">
              CoRE Stack
            </span>
          </a>

          <div className="flex flex-wrap gap-3 items-center justify-center">
            {isDownloadPage && (
              <a
                href="https://docs.google.com/document/d/1jet4EEBbbKgpNrPnuNJJDRuAJUiR2pIMFQp9JTlygAQ/edit?usp=sharing"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-50 hover:bg-purple-100 transition-all duration-200 border border-purple-200 group"
              >
                <span className="text-sm sm:text-base font-medium text-purple-700 group-hover:text-purple-800">
                  QGIS Documentation
                </span>
                <ExternalLink className="h-4 w-4 text-purple-600 group-hover:scale-110 transition-transform" />
              </a>
            )}

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
          </div>
        </div>
      </div>
    </nav>
  );
};

export default LandingNavbar;