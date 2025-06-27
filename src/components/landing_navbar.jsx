import React from "react";
import newLogo from "../assets/newLogo.png";

const LandingNavbar = () => {
  return (
    <nav className="bg-white shadow-2xl">
      <div className="w-full px-10">
        <div className="flex items-center justify-between h-20">
          <a
            href="https://core-stack.org"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 cursor-pointer"
          >
            <img
              src={newLogo}
              alt="Corestack Logo"
              style={{ height: "70px", width: "70px" }}
              className="shrink-0"
            />
            <span className="text-xl font-semibold text-gray-800">
              CoreStack
            </span>
          </a>

          <a
            href="https://ee-corestackdev.projects.earthengine.app/view/core-stack-gee-app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-700 font-medium text-base cursor-pointer hover:underline"
          >
            Explore GEE App
          </a>
        </div>
      </div>
    </nav>
  );
};

export default LandingNavbar;
