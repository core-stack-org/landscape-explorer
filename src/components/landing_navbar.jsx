import React from "react";
import newLogo from "../assets/newLogo.png";
import { useLocation } from "react-router-dom";

const LandingNavbar = () => {
  const location = useLocation();
  const isDownloadPage = location.pathname === "/download_layers";

  return (
    <nav className="bg-white shadow-2xl">
      <div className="w-full px-4 sm:px-6 md:px-10 bg-[#FCF5EA]">
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

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-center">
            {isDownloadPage && (
              <a
                href="https://docs.google.com/document/d/1jet4EEBbbKgpNrPnuNJJDRuAJUiR2pIMFQp9JTlygAQ/edit?usp=sharing"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-700 font-medium text-sm sm:text-base cursor-pointer hover:underline mr-16"
              >
                QGIS Documentation
              </a>
            )}

            <a
              href="https://ee-corestackdev.projects.earthengine.app/view/core-stack-gee-app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-700 font-medium text-sm sm:text-base cursor-pointer hover:underline"
            >
              Explore GEE App
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default LandingNavbar;
