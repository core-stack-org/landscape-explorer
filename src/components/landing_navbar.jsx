import React from "react";
import newLogo from "../assets/newLogo.png";

const LandingNavbar = () => {
  return (
    <nav className="bg-white shadow-2xl">
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
              CoreStack
            </span>
          </a>
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
    </nav>
  );
};

export default LandingNavbar;
