import React from "react";
import { Link } from "react-router-dom";
import newLogo from "../assets/newLogo.png";

const Navbar = () => {
  return (
    <nav className="bg-white shadow-2xl">
      <div className="w-full px-10">
        {" "}
        <div className="flex items-center h-16">
          <Link to="/" className="flex items-center gap-2 cursor-pointer">
            <img src={newLogo} alt="KYL Logo" className="h-8 w-8" />
            <span className="text-xl font-semibold text-gray-800">KYL</span>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
