import React from "react";
import { GiGroundSprout } from "react-icons/gi";

const propertyGroups = {
  Climate: [
    "Annual Precipitation (mm/yr)",
    "Aridity Index",
    "Mean Annual Temperature (°C)",
    "Reference Evapotranspiration (mm/yr)",
  ],
  Soil: [
    "Topsoil Bulk Density (kg/dm3)",
    "Topsoil Cation Exchange Capacity (cmol/kg)",
    "Topsoil Organic Carbon (% weight)",
    "Topsoil Texture",
    "Topsoil pH",
    "Subsoil Bulk Density (kg/dm3)",
    "Subsoil Cation Exchange Capacity (cmol/kg)",
    "Subsoil Organic Carbon (% weight)",
    "Subsoil Texture",
    "Subsoil pH",
    "Available Water Capacity (mm/m)",
    "Soil Drainage",
  ],
  Topography: ["Elevation (m)", "Slope (°)", "Aspect (°)"],
  Socioeconomic: [
    "Distance to Drainage Lines (m)",
    "Distance to Roads (m)",
    "Distance to Settlements (m)",
  ],
  Ecology: [],
};

const groupGradients = {
  Climate: "linear-gradient(135deg, #81d4fa, #e1f5fe)",
  Soil: "linear-gradient(135deg, #d7ccc8, #efebe9)",
  Topography: "linear-gradient(135deg, #a5d6a7, #c8e6c9)", // green
  Ecology: "linear-gradient(135deg, #fff9c4, #fffde7)", // yellowish
  Socioeconomic: "linear-gradient(135deg, #ce93d8, #f3e5f5)", // purple
};

const SoilPropertiesSection = ({ plantation }) => {
  if (!plantation?.site_props) return null;

  let siteProps = {};
  try {
    siteProps = JSON.parse(plantation.site_props);
  } catch (err) {
    console.error("Invalid site_props JSON", err);
    return null;
  }

  const soilSubGroups = {
    Topsoil: [
      "Topsoil Bulk Density (kg/dm3)",
      "Topsoil Cation Exchange Capacity (cmol/kg)",
      "Topsoil Organic Carbon (% weight)",
      "Topsoil Texture",
      "Topsoil pH",
    ],
    Subsoil: [
      "Subsoil Bulk Density (kg/dm3)",
      "Subsoil Cation Exchange Capacity (cmol/kg)",
      "Subsoil Organic Carbon (% weight)",
      "Subsoil Texture",
      "Subsoil pH",
    ],
    Others: ["Available Water Capacity (mm/m)", "Soil Drainage"],
  };

  return (
    <div className="mt-4">
      {/* Heading */}
      {/* Heading Row */}
      <div className="flex items-center gap-2 mb-1">
        <GiGroundSprout size={28} color="#4caf50" />
        <h2 className="text-3xl font-bold bg-gradient-to-r from-[#4caf50] to-[#81c784] bg-clip-text text-transparent tracking-wide">
          Soil & Site Properties
        </h2>
        <div className="flex-grow h-[2px] bg-[rgba(0,0,0,0.1)] ml-2 rounded"></div>
      </div>

      {/* Section 1 block — now below the heading */}
      {plantation && (
        <div className="flex flex-col gap-2 w-full p-4 sm:p-6 md:p-4 rounded-lg bg-white shadow mb-4">
          {/* Heading */}
          <h2 className="font-bold text-blue-600 border-b-2 border-blue-600 pb-1 text-[clamp(1.1rem,1.7vw,1.5rem)]">
            Section 2: Soil & Site Properties
          </h2>

          {/* Description */}
          <p className="text-gray-700 leading-relaxed "style={{ fontSize: "clamp(0.70rem, 1vw, 1rem)" }}>
            This section highlights the <strong>climatic</strong>,{" "}
            <strong>soil</strong>, and <strong>topographical</strong>{" "}
            characteristics of the plantation site, which influence plantation
            success and species selection.
            <br />
            <br />
            <strong>Climate:</strong> Indicators such as precipitation,
            temperature, aridity, and evapotranspiration describe the prevailing
            climatic conditions of the site and can help determine suitable tree
            species.
            <br />
            <br />
            <strong>Soil:</strong> Topsoil and subsoil properties, including
            bulk density, cation exchange capacity, organic carbon, pH, and
            texture, reveal the soil fertility, nutrient retention, and
            water-holding capacity — all critical for healthy plant growth.
            <br />
            <br />
            <strong>Topography & Accessibility:</strong> Elevation, slope,
            aspect, and proximity to drainage, roads, and settlements provide
            context for plantation planning and management.
            <br />
            <br />
            Together, these factors offer a comprehensive understanding of the
            site’s ecological potential, guiding sustainable plantation design
            and management.
          </p>
        </div>
      )}

      {Object.entries(propertyGroups).map(([groupName, keys]) => {
        if (groupName === "Soil") {
          return (
            <div key="Soil" className="mb-8">
              <h3 className="text-2xl font-semibold mb-4">Soil</h3>

              {/* Subsections for Soil */}
              {Object.entries(soilSubGroups).map(([subGroup, subKeys]) => {
                const subProps = subKeys
                  .map((key) => ({ key, value: siteProps[key] }))
                  .filter((item) => item.value !== undefined);

                if (!subProps.length) return null;

                return (
                  <div key={subGroup} className="mb-6 ml-3">
                    <h4 className="text-lg font-semibold mb-2 text-[#5d4037]">
                      {subGroup}
                    </h4>

                    <div className="flex flex-wrap gap-4">
                      {subProps.map(({ key, value }) => (
                        <div
                          key={key}
                          title={key}
                          className={`
        flex flex-col justify-center items-center 
        w-fit px-6 py-4 rounded-xl
        shadow-sm border border-black/5
        transition-transform duration-300 ease-in-out
        hover:scale-105 hover:shadow-lg
        min-h-[120px]
      `}
                          style={{ background: groupGradients["Soil"] }}
                        >
                          <p className="text-sm font-semibold text-gray-600 mb-1 whitespace-nowrap">
                            {key}
                          </p>
                          <p className="text-lg font-medium text-green-700 whitespace-nowrap">
                            {value === null ||
                            value === undefined ||
                            value === "" ||
                            value === "NA" ||
                            value === "None"
                              ? "Data not available"
                              : typeof value === "number"
                              ? value.toFixed(2)
                              : String(value)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        }

        // Other sections remain the same
        const groupProps = keys
          .map((key) => ({ key, value: siteProps[key] }))
          .filter((item) => item.value !== undefined);

        if (!groupProps.length) return null;

        return (
          <div key={groupName} className="mb-8">
            <h3 className="text-2xl font-semibold mb-4">{groupName}</h3>

            <div className="flex flex-wrap gap-4">
              {groupProps.map(({ key, value }) => (
                <div
                  key={key}
                  title={key}
                  className={`
        flex flex-col justify-center items-center 
        w-fit px-6 py-4 rounded-xl
        shadow-sm border border-black/5
        transition-transform duration-300 ease-in-out
        hover:scale-105 hover:shadow-lg
        min-h-[120px]
      `}
                  style={{ background: groupGradients[groupName] }}
                >
                  <p className="text-sm font-semibold text-gray-600 mb-1 whitespace-nowrap">
                    {key}
                  </p>
                  <p className="text-lg font-medium text-green-700 whitespace-nowrap">
                    {value === null ||
                    value === undefined ||
                    value === "" ||
                    value === "NA" ||
                    value === "None"
                      ? "Data not available"
                      : typeof value === "number"
                      ? value.toFixed(2)
                      : String(value)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SoilPropertiesSection;
