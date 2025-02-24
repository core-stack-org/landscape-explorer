import React from 'react';
import logo from '../assets/logo.png'; // Replace with the correct path to your logo image

const Navbar = () => {
  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center h-16">
          <div className="flex items-center gap-2"> {/* Use gap-2 to add spacing between logo and text */}
            <img src={logo} alt="KYL Logo" className="h-8 w-8" /> {/* Adjust size if needed */}
            <span className="text-xl font-semibold text-gray-800">KYL</span>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
