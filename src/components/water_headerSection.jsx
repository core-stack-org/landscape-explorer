import React, { useEffect, useState } from "react";
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
  const [organizationOptions, setOrganizationOptions] = useState([]);
  const [project, setProject] = useState(initialProject || "");
  const [filter, setFilter] = useState("");

  const navigate = useNavigate();
  const location = useLocation();
  const isOnDashboard = location.pathname.includes("/dashboard");

  useEffect(() => {
    const fetchOrganizations = async () => {
      const options = await loadOrganization();
      setOrganizationOptions(options);
      if (!organization && isOnDashboard) {
        const storedOrg = sessionStorage.getItem("selectedOrganization");
        if (storedOrg) {
          setOrganization(JSON.parse(storedOrg));
        } else if (options.length > 0) {
          setOrganization(options[0]);
        }
      }
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
    sessionStorage.setItem("selectedProject", selectedValue);
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
                  { label: "ATE_MP", value: "ATE_MP" },
                  { label: "ATECH_UP", value: "ATECH_UP" },
                  { label: "ATE_Water_Tamil", value: "ATE_Water_Tamil" },
                ]}
                placeholder="Select Project"
                styles={customStyles}
                isClearable
                isDisabled={isOnDashboard}
                menuPortalTarget={document.body}
                menuPosition="fixed"
              />
            </Box>
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
