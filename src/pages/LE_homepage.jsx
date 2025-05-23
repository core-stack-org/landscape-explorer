import React from "react";
import Navbar from "../components/navbar";
import { FaSearch } from "react-icons/fa";

export default function KYLHomePage() {
  return (
    <div className="font-sans">
      <Navbar />
      {/* Know Section */}
      <section className="bg-[#d3d0d0] py-12 px-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between">
          <div className="pl-16 pr-8 md:w-1/2">
            <h2 className="text-3xl font-bold text-purple-700 mb-2">Know</h2>
            <p className="font-semibold text-black mb-6">
              Know More About your Landscape qualities and see what’s there in
              your surroundings
            </p>
          </div>
          <div className="bg-white p-6 rounded shadow max-w-md w-full">
            <p className="mb-4">
              Lorem ipsum dolor sit amet consectetur. Egestas nisl semper magna
              non eu nisi.
            </p>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <label htmlFor="state" className="w-24 font-semibold">
                  Select State
                </label>
                <div className="relative flex-grow">
                  <select
                    id="state"
                    className="w-full appearance-none border border-gray-300 rounded px-3 py-2 pr-8"
                    defaultValue=""
                  >
                    <option value=""> </option>
                    {/* add your state options here */}
                    <option value="state1">State 1</option>
                    <option value="state2">State 2</option>
                  </select>
                  <FaSearch
                    className="pointer-events-none absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400"
                    size={14}
                  />
                </div>
              </div>

              {/* District */}
              <div className="flex items-center space-x-3">
                <label htmlFor="district" className="w-24 font-semibold">
                  Select District
                </label>
                <div className="relative flex-grow">
                  <select
                    id="district"
                    className="w-full appearance-none border border-gray-300 rounded px-3 py-2 pr-8"
                    defaultValue=""
                  >
                    <option value=""> </option>
                    {/* add your district options here */}
                    <option value="district1">District 1</option>
                    <option value="district2">District 2</option>
                  </select>
                  <FaSearch
                    className="pointer-events-none absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400"
                    size={14}
                  />
                </div>
              </div>

              {/* Block/Tehsil */}
              <div className="flex items-center space-x-3">
                <label htmlFor="block" className="w-24 font-semibold">
                  Select Tehsil
                </label>
                <div className="relative flex-grow">
                  <select
                    id="block"
                    className="w-full appearance-none border border-gray-300 rounded px-3 py-2 pr-8"
                    defaultValue=""
                  >
                    <option value=""> </option>
                    {/* add your block options here */}
                    <option value="block1">Block 1</option>
                    <option value="block2">Block 2</option>
                  </select>
                  <FaSearch
                    className="pointer-events-none absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400"
                    size={14}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-between mt-4">
              <button className="bg-purple-600 text-white px-4 py-2 rounded">
                Know Your Landscape
              </button>
              <button className="bg-gray-300 text-black px-4 py-2 rounded">
                Download Layers
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Plan Section */}
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
            <div className="bg-white p-4 rounded shadow text-left">
              <div className="bg-gray-400 h-48 mb-4 w-full"></div>
              <h3 className="font-bold mb-2 text-sm">
                How to do Participatory Planning ?
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

            {/* Card 2 */}
            <div className="bg-white p-4 rounded shadow text-left">
              <div className="bg-gray-400 h-48 mb-4 w-full"></div>
              <h3 className="font-bold mb-2 text-sm">
                Download Commons Connect App
              </h3>
              <p className="text-xs text-gray-700 mb-2">
                Greater orch pack chuck teritorial federal midlothian organic
                class american explict. Mark s soft cover terrapass key salsa,
                guide expansion.
              </p>
              <a href="#" className="text-purple-700 text-sm font-semibold">
                Download now →
              </a>
            </div>

            {/* Card 3 */}
            <div className="bg-white p-4 rounded shadow text-left">
              <div className="bg-gray-400 h-48 mb-4 w-full"></div>
              <h3 className="font-bold mb-2 text-sm">View and Support Plans</h3>
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
        </div>
      </section>

      {/* Track Section */}
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

        {/* Centered 4th box on next line */}
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
