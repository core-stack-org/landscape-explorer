import React, { useEffect, useRef, useState } from "react";
import TileLayer from "ol/layer/Tile";
import XYZ from "ol/source/XYZ";
import { Control, defaults as defaultControls } from "ol/control";
import View from "ol/View";
import Map from "ol/Map";
import SelectReact from "react-select";
import YearSlider from "./yearSlider.jsx";
import LandingNavbar from "../components/landing_navbar.jsx";

const PlansPage = () => {
  const mapElement = useRef(null);
  const mapRef = useRef(null);
  const [selectedOption, setSelectedOption] = useState("default");
  const [organization, setOrganization] = useState();
  const [organizationOptions, setOrganizationOptions] = useState([]);

  useEffect(() => {
    const fetchOrganizations = async () => {
      const start = performance.now();
      const options = await loadOrganization();
      const end = performance.now();
      setOrganizationOptions(options);
    };

    fetchOrganizations();
  }, []);

  const loadOrganization = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/auth/register/available_organizations/`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "420",
          },
        }
      );
      const data = await response.json();
      return data.map((org) => ({
        value: org.id,
        label: org.name,
      }));
    } catch (error) {
      console.error("Error fetching organizations:", error);
      return [];
    }
  };

  const customStyles = {
    control: (base) => ({
      ...base,
      height: 48,
      minHeight: 48,
      width: 464,
      backgroundColor: "#fff",
      borderRadius: 4,
      paddingLeft: 4,
      zIndex: 2,
    }),
    menu: (base) => ({
      ...base,
      zIndex: 9999,
    }),
    menuPortal: (base) => ({
      ...base,
      zIndex: 1300,
    }),
  };

  const handleOrganizationChange = (selectedOption) => {
    setOrganization(selectedOption);

    if (selectedOption) {
      sessionStorage.setItem(
        "selectedOrganization",
        JSON.stringify(selectedOption)
      );
      sessionStorage.setItem(
        "organizationName",
        selectedOption.label.toUpperCase()
      );
    } else {
      sessionStorage.removeItem("selectedOrganization");
      sessionStorage.removeItem("organizationName");
    }
  };

  useEffect(() => {
    initializeMap();
    return () => {
      if (mapRef.current) {
        mapRef.current.setTarget(null);
        mapRef.current = null;
      }
    };
  }, []);

  const initializeMap = () => {
    const baseLayer = new TileLayer({
      source: new XYZ({
        url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
        maxZoom: 30,
      }),
    });

    class GoogleLogoControl extends Control {
      constructor() {
        const element = document.createElement("div");
        element.style.pointerEvents = "none";
        element.style.position = "absolute";
        element.style.bottom = "5px";
        element.style.left = "5px";
        element.style.background = "#f2f2f27f";
        element.style.fontSize = "10px";
        element.style.padding = "5px";
        element.innerHTML = "&copy; Google Satellite Hybrid contributors";
        super({ element });
      }
    }

    const view = new View({
      center: [78.9, 23.6],
      zoom: 5,
      projection: "EPSG:4326",
    });

    const map = new Map({
      target: mapElement.current,
      layers: [baseLayer],
      controls: defaultControls().extend([new GoogleLogoControl()]),
      view,
    });

    mapRef.current = map;
  };

  return (
    <div className="bg-white min-h-screen">
      <LandingNavbar />

      {/* Flex Layout */}
      <div className="flex r gap-8 items-start p-6">
        {/* Map Section */}
        <div
          className="relative border border-gray-300 rounded-lg overflow-hidden shadow"
          style={{
            width: "60%",
            height: "900px",
          }}
        >
          <div ref={mapElement} className="w-full h-full" />

          {/* Zoom Buttons */}
          <div className="absolute top-4 right-4 flex flex-col gap-1 z-[1000]">
            {["+", "–"].map((sign) => (
              <button
                key={sign}
                className="bg-white border border-gray-300 rounded-md w-10 h-10 text-xl cursor-pointer 
                           hover:bg-gray-100 active:scale-95 transition shadow"
                onClick={() => {
                  const view = mapRef.current?.getView();
                  const delta = sign === "+" ? 1 : -1;
                  view?.animate({
                    zoom: view.getZoom() + delta,
                    duration: 300,
                  });
                }}
              >
                {sign}
              </button>
            ))}
          </div>

          <div className="absolute bottom-4 right-0 transform -translate-x-1/2 z-[1000] w-full max-w-xl px-4 ">
            <YearSlider currentLayer={[{ name: "lulc_test_layer" }]} />
          </div>
        </div>

        {/* Dropdown Section */}
        <div className="flex flex-col items-start gap-4 w-[25%] text-left">
          <label className="font-semibold text-gray-700 text-lg">
            Select Organization
          </label>
          <SelectReact
            value={organization}
            onChange={handleOrganizationChange}
            options={organizationOptions}
            placeholder="Select Organization"
            styles={customStyles}
            menuPortalTarget={document.body}
            menuPosition="fixed"
          />

          {selectedOption !== "default" && (
            <p className="text-gray-600 text-sm">
              Selected: <span className="font-medium">{selectedOption}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlansPage;
