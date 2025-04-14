import React, { useState } from "react";
import {
  Box,
  Avatar,
  Toolbar,
  AppBar,
  Container,
  Select,
  MenuItem,
} from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import SelectReact from "react-select";
import TuneIcon from "@mui/icons-material/Tune";
import water from "../assets/water.jpeg";

const HeaderSelect = ({
  showExtras = false,
  organization: initialOrg,
  project: initialProject,
}) => {
  const [organization, setOrganization] = useState(initialOrg || null);
  const [project, setProject] = useState(initialProject || "");
  const [filter, setFilter] = useState("");

  const navigate = useNavigate();
  const location = useLocation();
  const isOnDashboard = location.pathname.includes("/dashboard");

  const organizationOptions = [
    { label: "Org1", value: "Org1" },
    { label: "Org2", value: "Org2" },
  ];

  const filterOptions = [
    { label: "State", value: "state" },
    { label: "District", value: "district" },
    { label: "GP/Village", value: "gp/village" },
    { label: "Waterbody", value: "waterbody" },
    { label: "Silt Removed", value: "siltremoved" },
    {
      label: "Avg. Water Availability During Zaid (%)",
      value: "avgwaterAvailabilityDuringZaid",
    },
  ];

  const customStyles = {
    control: (base) => ({
      ...base,
      height: 48,
      minHeight: 48,
      width: 264,
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
      zIndex: 1300, // higher than MUI AppBar and Paper default
    }),
  };

  const handleFilterChange = (event) => {
    setFilter(event.target.value);
    // Apply filter logic here (e.g., fetch filtered data based on selected filter)
  };
  const getSelectedLabel = () => {
    const selected = filterOptions.find((option) => option.value === filter);
    return selected?.label || "Filter";
  };
  const handleOrganizationChange = (selectedOption) => {
    setOrganization(selectedOption);
    sessionStorage.setItem(
      "selectedOrganization",
      JSON.stringify(selectedOption)
    );
  };

  const handleProjectChange = (selectedOption) => {
    const selectedValue = selectedOption?.value || "";
    setProject(selectedValue);
    sessionStorage.setItem("selectedProject", selectedValue); // save only value
    if (selectedValue) {
      navigate(`/dashboard/${selectedValue}`);
    }
  };

  return (
    <Box
      sx={{ height: "100vh", overflow: "hidden", backgroundColor: "#EAEAEA" }}
    >
      {/* AppBar */}
      <AppBar
        position="static"
        sx={{
          background: "#11000080",
          backdropFilter: "blur(8px)",
          height: "120px",
          boxShadow: "none",
          display: "flex",
          justifyContent: "center",
          zIndex: 1, // Ensure the AppBar is above the background image
        }}
      >
        <Container
          maxWidth={false}
          sx={{ maxWidth: "2440px", width: "100%", px: 4 }}
        >
          <Toolbar
            sx={{
              display: "flex",
              alignItems: "center",
              height: "100%",
              width: "100%",
              px: 0,
            }}
          >
            {/* Left: Avatar */}
            <Avatar sx={{ bgcolor: "#d1d1d1", width: 40, height: 40 }} />

            {/* Center: Org + Project Selects */}
            <Box sx={{ display: "flex", gap: 2, ml: 4 }}>
              <SelectReact
                value={organization}
                onChange={handleOrganizationChange}
                options={organizationOptions}
                placeholder="Select Organization"
                styles={customStyles}
                isClearable={!isOnDashboard}
                isDisabled={isOnDashboard}
                menuPortalTarget={document.body}
                menuPosition="fixed"
              />

              <SelectReact
                value={project ? { label: project, value: project } : null}
                onChange={handleProjectChange}
                options={[
                  { label: "Project 1", value: "Project1" },
                  { label: "Project 2", value: "Project2" },
                  { label: "Project 3", value: "Project3" },
                ]}
                placeholder="Select Project"
                styles={customStyles}
                isClearable
                isDisabled={isOnDashboard}
                menuPortalTarget={document.body}
                menuPosition="fixed"
              />
            </Box>

            {/* Right: Filter Dropdown */}
            {showExtras && (
              <Box sx={{ ml: "auto" }}>
                <Select
                  value={filter}
                  onChange={handleFilterChange}
                  displayEmpty
                  sx={{
                    minWidth: 200,
                    backgroundColor: "#fff",
                    px: 1,
                    height: 48,
                    color: filter ? "inherit" : "#9e9e9e",
                    "& .MuiSelect-select": {
                      display: "flex",
                      alignItems: "center",
                    },
                  }}
                  renderValue={() => (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <TuneIcon fontSize="small" />
                      <span style={{ color: filter ? "#000" : "#9e9e9e" }}>
                        {getSelectedLabel()}
                      </span>
                    </Box>
                  )}
                >
                  {filterOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </Box>
            )}
          </Toolbar>
        </Container>
      </AppBar>

      {/* Background Image */}
      <Box
        sx={{
          position: "relative",
          top: 0,
          left: 0,
          width: "70%",
          height: "calc(100vh - 120px)",
          backgroundImage: `url(${water})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.3,
          zIndex: 0,
        }}
      />
    </Box>
  );
};

export default HeaderSelect;
