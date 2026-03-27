import { useState } from 'react';
import layerDetail from '../../data/layers_details.json';

// Import icons
import well_icon from "../../../assets/well_proposed.svg";
import livelihood_icon from "../../../assets/livelihood_proposed.svg";
import settlement_icon from "../../../assets/settlement_icon.svg";
import farm_pond_icon from "../../../assets/farm_pond_proposed.svg";
import land_leveling_icon from "../../../assets/land_leveling_proposed.svg";
import boulder_icon from "../../../assets/boulder_proposed.svg";
import waterbodies_icon from "../../../assets/waterbodies_proposed.svg";
import tcb_icon from "../../../assets/tcb_proposed.svg";
import check_dam_icon from "../../../assets/check_dam_proposed.svg";
import landscape_icon from "../../../assets/eco.png";

const LeftSidebar = ({ onClose }) => {
  const [currTab, setCurrTab] = useState("panchayat_boundaries");
  const [currSection, setCurrSection] = useState("Administrative Boundaries");

  // Button mappings
  const buttonMap = [
    {json_name: "panchayat_boundaries", name: "Administrative Boundaries"},
    {json_name: "drainage_layer", name: "Drainage Layer"},
    {json_name: "mws_layer", name: "Hydrological Variables Layer"},
    {json_name: "nrega_layer", name: "NREGA Layer"},
    {json_name: "terrain_layer", name: "Terrain Layer"},
    {json_name: "drought_layer", name: "Drought Layer"},
    {json_name: "hydrological_layer", name: "Hydrological Boundaries"},
    {json_name: "waterbodies_layer", name: "Waterbodies Layer"},
    {json_name: "lulc_layer", name: "LULC Layer"}
  ];

  const toggleTabs = (name, section) => {
    setCurrTab(name);
    setCurrSection(section);
  };

  const handleLayerStyleDownload = (url) => {
    window.open(url);
  };

  // Custom TabButton component to replace the imported one
  const TabButton = ({ name, onClickEvent, isActive }) => {
    return (
      <button 
        onClick={onClickEvent}
        className={`ui-pressable whitespace-nowrap rounded-xl border px-3 py-2 text-sm font-medium focus-visible:ring-0 ${
          isActive 
            ? 'border-violet-500 bg-[#8B5CF6] text-white shadow-md'
            : 'border-violet-200 bg-[#EDE9FE] text-[#8B5CF6] hover:bg-[#DDD6FE]'
        }`}
      >
        {name}
      </button>
    );
  };

  return (
    <div className="ui-slide-in flex h-full w-96 flex-col overflow-auto border-r border-[#332E4A] bg-[#1E1B2E]">
      <div className="flex items-center justify-between border-b border-gray-700 p-4">
        <div className="flex items-center gap-3">
          <img src={landscape_icon} alt="Landscape Explorer" className="w-10 h-10" />
          <div>
            <h3 className="text-white font-medium text-lg">Landscape Explorer</h3>
            <p className="text-gray-300 text-xs">v1.0.0</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="ui-pressable rounded-full p-2 text-gray-400 hover:bg-[#332E4A] hover:text-white focus-visible:ring-0"
          aria-label="Close information panel"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
            <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/>
          </svg>
        </button>
      </div>

      {/* Redesigned button grid with 2-3 buttons per row */}
      <div className="p-3 mt-2 flex flex-wrap gap-2">
        {buttonMap.map((item, idx) => (
          <TabButton 
            key={idx} 
            name={item.name} 
            onClickEvent={() => toggleTabs(item.json_name, item.name)}
            isActive={currTab === item.json_name}
          />
        ))}
      </div>

      <div className="ui-surface mx-3 mt-2 rounded-2xl bg-[#2A263C] p-4">
        <div className="text-lg font-semibold text-gray-200 mb-3 border-b border-gray-700 pb-2">
          {currSection}
        </div>
        <div className="text-gray-300 flex-col">
          <article className="overflow-y-auto max-h-48 text-sm leading-relaxed">
            {layerDetail[currTab]["info"]}
          </article>
          <div className="flex flex-wrap gap-2 mt-4 justify-center">
            <a 
              href="https://gitlab.com/corestack.org/corestack" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="ui-pressable rounded-xl bg-[#8B5CF6] px-3 py-2 text-sm text-white hover:bg-[#7C3AED] focus-visible:ring-0"
            >
              KNOW MORE
            </a>
            {layerDetail[currTab]["style_url"].map((item, index) => (
              <button 
                key={index}
                className="ui-pressable rounded-xl bg-[#8B5CF6] px-3 py-2 text-sm text-white hover:bg-[#7C3AED] focus-visible:ring-0"
                onClick={() => handleLayerStyleDownload(item["url"])}
              >
                {item["name"]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {currSection !== "NREGA Layer" ? (
        <div className="mt-4">
          <h4 className="text-lg font-semibold text-white px-4 py-2 bg-[#2A263C]">
            Map Marker's Directory
          </h4>
          <div className="px-3 py-2 overflow-y-auto grid gap-1">
            <div className="ui-surface flex items-center rounded-xl bg-[#332E4A] p-2">
              <img src={well_icon} alt="Well Marker" className="h-8 w-8" />
              <span className="text-gray-300 text-sm pl-2">Well Marker</span>
            </div>
            <div className="ui-surface flex items-center rounded-xl bg-[#332E4A] p-2">
              <img src={livelihood_icon} alt="Livelihood Marker" className="h-8 w-8" />
              <span className="text-gray-300 text-sm pl-2">Livelihood Marker</span>
            </div>
            <div className="ui-surface flex items-center rounded-xl bg-[#332E4A] p-2">
              <img src={settlement_icon} alt="Settlement Marker" className="h-8 w-8" />
              <span className="text-gray-300 text-sm pl-2">Settlement Marker</span>
            </div>
            <div className="ui-surface flex items-center rounded-xl bg-[#332E4A] p-2">
              <img src={waterbodies_icon} alt="Waterbodies Marker" className="h-8 w-8" />
              <span className="text-gray-300 text-sm pl-2">Waterbodies Marker</span>
            </div>
            <div className="ui-surface flex items-center rounded-xl bg-[#332E4A] p-2">
              <img src={tcb_icon} alt="TCB Marker" className="h-8 w-8" />
              <span className="text-gray-300 text-sm pl-2">Trench-Cum-Bund Marker</span>
            </div>
            <div className="ui-surface flex items-center rounded-xl bg-[#332E4A] p-2">
              <img src={land_leveling_icon} alt="Land Leveling Marker" className="h-8 w-8" />
              <span className="text-gray-300 text-sm pl-2">Land Leveling Marker</span>
            </div>
            <div className="ui-surface flex items-center rounded-xl bg-[#332E4A] p-2">
              <img src={farm_pond_icon} alt="Farm Pond Marker" className="h-8 w-8" />
              <span className="text-gray-300 text-sm pl-2">Farm Pond Marker</span>
            </div>
            <div className="ui-surface flex items-center rounded-xl bg-[#332E4A] p-2">
              <img src={check_dam_icon} alt="Check Dam Marker" className="h-8 w-8" />
              <span className="text-gray-300 text-sm pl-2">Check Dam Marker</span>
            </div>
            <div className="ui-surface flex items-center rounded-xl bg-[#332E4A] p-2">
              <img src={boulder_icon} alt="Boulder Marker" className="h-8 w-8" />
              <span className="text-gray-300 text-sm pl-2">Boulder Marker</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <h4 className="text-lg font-semibold text-white px-4 py-2 bg-[#2A263C]">
            NREGA Color Coding
          </h4>
          <div className="px-3 py-2 overflow-y-auto grid gap-1">
            <div className="ui-surface flex items-center rounded-xl bg-[#332E4A] p-2">
              <div className="h-6 w-6 rounded-full bg-yellow-500" />
              <span className="text-gray-300 text-sm pl-2">Land Restoration</span>
            </div>
            <div className="ui-surface flex items-center rounded-xl bg-[#332E4A] p-2">
              <div className="h-6 w-6 rounded-full bg-pink-400" />
              <span className="text-gray-300 text-sm pl-2">Off-Farm Livelihood Assets</span>
            </div>
            <div className="ui-surface flex items-center rounded-xl bg-[#332E4A] p-2">
              <div className="h-6 w-6 rounded-full bg-sky-800" />
              <span className="text-gray-300 text-sm pl-2">Irrigation on farms</span>
            </div>
            <div className="ui-surface flex items-center rounded-xl bg-[#332E4A] p-2">
              <div className="h-6 w-6 rounded-full bg-emerald-400" />
              <span className="text-gray-300 text-sm pl-2">Plantations</span>
            </div>
            <div className="ui-surface flex items-center rounded-xl bg-[#332E4A] p-2">
              <div className="h-6 w-6 rounded-full bg-blue-400" />
              <span className="text-gray-300 text-sm pl-2">Soil and Water Conservation</span>
            </div>
            <div className="ui-surface flex items-center rounded-xl bg-[#332E4A] p-2">
              <div className="h-6 w-6 rounded-full bg-gray-600" />
              <span className="text-gray-300 text-sm pl-2">Community Assets</span>
            </div>
            <div className="ui-surface flex items-center rounded-xl bg-[#332E4A] p-2">
              <div className="h-6 w-6 rounded-full bg-zinc-800" />
              <span className="text-gray-300 text-sm pl-2">Unidentified</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeftSidebar;
