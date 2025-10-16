import React from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Tooltip,
} from "@mui/material";
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

const SoilPropertiesSection = ({ feature }) => {
  if (!feature?.properties?.site_props) return null;

  let siteProps = {};
  try {
    siteProps = JSON.parse(feature.properties.site_props);
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
    <Box sx={{ mt: 4 }}>
      {/* Heading */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
        <GiGroundSprout size={28} color="#4caf50" />
        <Typography
          variant="h4"
          fontWeight={700}
          sx={{
            background: "linear-gradient(90deg, #4caf50, #81c784)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: 1,
          }}
        >
          Soil & Site Properties
        </Typography>
        <Box
          sx={{
            flexGrow: 1,
            height: "2px",
            bgcolor: "rgba(0,0,0,0.1)",
            ml: 2,
            borderRadius: 1,
          }}
        />
      </Box>

      {Object.entries(propertyGroups).map(([groupName, keys]) => {
        if (groupName === "Soil") {
          return (
            <Box key="Soil" sx={{ mb: 4 }}>
              <Typography variant="h5" fontWeight={600} sx={{ mb: 2 }}>
                Soil
              </Typography>

              {/* Subsections for Soil */}
              {Object.entries(soilSubGroups).map(([subGroup, subKeys]) => {
                const subProps = subKeys
                  .map((key) => ({ key, value: siteProps[key] }))
                  .filter((item) => item.value !== undefined);

                if (!subProps.length) return null;

                return (
                  <Box key={subGroup} sx={{ mb: 3, ml: 2 }}>
                    <Typography
                      variant="subtitle1"
                      fontWeight={600}
                      sx={{ mb: 1, color: "#5d4037" }}
                    >
                      {subGroup}
                    </Typography>
                    <Grid container spacing={3}>
                      {subProps.map(({ key, value }) => (
                        <Grid item xs={12} sm={6} md={4} key={key}>
                          <Tooltip title={key}>
                            <Box
                              sx={{
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "center",
                                alignItems: "center",
                                p: 3,
                                borderRadius: 3,
                                background: groupGradients["Soil"],
                                boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                                border: "1px solid rgba(0,0,0,0.05)",
                                transition: "0.4s",
                                "&:hover": {
                                  transform: "scale(1.05)",
                                  boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
                                },
                              }}
                            >
                              <Typography
                                variant="body2"
                                color="textSecondary"
                                fontWeight={500}
                                sx={{ mb: 1 }}
                              >
                                {key}
                              </Typography>
                              <Typography
                                variant="h6"
                                fontWeight={700}
                                sx={{ color: "#388e3c" }}
                              >
                                {value === null ||
                                value === undefined ||
                                value === "" ||
                                value === "NA" ||
                                value === "None"
                                  ? "Data not available"
                                  : typeof value === "number"
                                  ? value.toFixed(2)
                                  : String(value)}
                              </Typography>
                            </Box>
                          </Tooltip>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                );
              })}
            </Box>
          );
        }

        // other sections remain same
        const groupProps = keys
          .map((key) => ({ key, value: siteProps[key] }))
          .filter((item) => item.value !== undefined);

        if (!groupProps.length) return null;

        return (
          <Box key={groupName} sx={{ mb: 4 }}>
            <Typography variant="h5" fontWeight={600} sx={{ mb: 2 }}>
              {groupName}
            </Typography>
            <Grid container spacing={3}>
              {groupProps.map(({ key, value }) => (
                <Grid item xs={12} sm={6} md={4} key={key}>
                  <Tooltip title={key}>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        p: 3,
                        borderRadius: 3,
                        background: groupGradients[groupName],
                        boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                        border: "1px solid rgba(0,0,0,0.05)",
                        transition: "0.4s",
                        "&:hover": {
                          transform: "scale(1.05)",
                          boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
                        },
                      }}
                    >
                      <Typography
                        variant="body2"
                        color="textSecondary"
                        fontWeight={500}
                        sx={{ mb: 1 }}
                      >
                        {key}
                      </Typography>
                      <Typography
                        variant="h6"
                        fontWeight={700}
                        sx={{ color: "#388e3c" }}
                      >
                        {value === null ||
                        value === undefined ||
                        value === "" ||
                        value === "NA" ||
                        value === "None"
                          ? "Data not available"
                          : typeof value === "number"
                          ? value.toFixed(2)
                          : String(value)}
                      </Typography>
                    </Box>
                  </Tooltip>
                </Grid>
              ))}
            </Grid>
          </Box>
        );
      })}
    </Box>
  );
};

export default SoilPropertiesSection;
