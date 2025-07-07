import React, { useEffect, useState } from "react";
import { Box, Avatar, Toolbar, AppBar, Container, Button } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import SelectReact from "react-select";
import water from "../assets/water.jpeg";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";

const HeaderSelect = ({
  showExtras = false,
  organization: initialOrg,
  project: initialProject,
  setView,
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  const [organization, setOrganization] = useState(initialOrg || null);
  const [organizationOptions, setOrganizationOptions] = useState([]);
  const [project, setProject] = useState(initialProject || null);
  const [projects, setProjects] = useState([]);
  const [projectOptions, setProjectOptions] = useState([]);
  const [dashboardLocked, setDashboardLocked] = useState(false);

  const isOnDashboard = location.pathname.includes("/dashboard");
  useEffect(() => {
    const isDashboard = location.pathname.includes("/dashboard");
    setDashboardLocked(isDashboard);
    if (isDashboard) {
      setDashboardLocked(true);
    }
  }, [location.pathname]);

  const loginAndGetToken = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_BASEURL}api/v1/auth/login/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: process.env.REACT_APP_WATERBODYREJ_USERNAME,
            password: process.env.REACT_APP_WATERBODYREJ_PASSWORD,
          }),
        }
      );

      if (!response.ok) throw new Error("Login failed");

      const data = await response.json();
      sessionStorage.setItem("accessToken", data.access);
      return data.access;
    } catch (err) {
      console.error("❌ Auto-login failed:", err);
      return null;
    }
  };

  useEffect(() => {
    const fetchOrganizations = async () => {
      const options = await loadOrganization();
      setOrganizationOptions(options);

      const savedOrg = sessionStorage.getItem("selectedOrganization");
      const savedProject = sessionStorage.getItem("selectedProject");

      if (!organization && isOnDashboard) {
        if (savedOrg) {
          setOrganization(JSON.parse(savedOrg));
        } else if (options.length > 0) {
          setOrganization(options[0]);
        }
      }

      if (savedProject) {
        setProject(JSON.parse(savedProject));
      }
    };

    fetchOrganizations();
  }, []);

  useEffect(() => {
    const fetchProjects = async () => {
      if (!organization?.value) return;

      let token = sessionStorage.getItem("accessToken");
      if (!token) token = await loginAndGetToken();
      if (!token) return;

      try {
        const response = await fetch(
          `${process.env.REACT_APP_BASEURL}/api/v1/projects/`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "ngrok-skip-browser-warning": "420",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok)
          throw new Error(`HTTP error! Status: ${response.status}`);
        const data = await response.json();

        const filtered = data.filter(
          (proj) => proj.organization === organization.value
        );

        const options = filtered.map((proj) => ({
          label: proj.name,
          value: String(proj.id),
        }));

        setProjects(filtered);
        setProjectOptions(options);

        const stored = sessionStorage.getItem("selectedProject");
        if (stored) {
          const parsed = JSON.parse(stored);
          const matched = options.find((p) => p.value === parsed.value);
          if (matched) {
            setProject(matched);
          } else {
            setProject(null);
            sessionStorage.removeItem("selectedProject");
          }
        }
      } catch (error) {
        console.error("Error fetching projects:", error);
      }
    };

    fetchProjects();
  }, [organization]);

  const loadOrganization = async () => {
    try {
      const headers = {
        "Content-Type": "application/json",
      };

      if (
        window.location.hostname === "localhost" ||
        process.env.NODE_ENV === "development"
      ) {
        headers["ngrok-skip-browser-warning"] = "420";
      }

      const response = await fetch(
        `${process.env.REACT_APP_BASEURL}api/v1/auth/register/available_organizations/`,
        {
          method: "GET",
          headers,
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
    menu: (base) => ({ ...base, zIndex: 9999 }),
    menuPortal: (base) => ({ ...base, zIndex: 1300 }),
  };

  const handleOrganizationChange = (selectedOption) => {
    setOrganization(selectedOption);
    setProject(null);
    sessionStorage.setItem(
      "selectedOrganization",
      JSON.stringify(selectedOption)
    );
    sessionStorage.removeItem("selectedProject");
    if (setView) setView("table");
    setDashboardLocked(false);
  };

  const handleProjectChange = (selectedOption) => {
    setProject(selectedOption);
    sessionStorage.setItem("selectedProject", JSON.stringify(selectedOption));
    if (setView) setView("table");
    setDashboardLocked(false);
    if (selectedOption?.value) {
      navigate(`/dashboard/${selectedOption.value}`);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      if (dashboardLocked) {
        setDashboardLocked(false);
        if (setView) setView("table");
        window.history.pushState(null, "", window.location.pathname);
      }
    };

    window.addEventListener("popstate", handlePopState);
    window.history.pushState(null, "", window.location.pathname);

    return () => window.removeEventListener("popstate", handlePopState);
  }, [dashboardLocked, setView]);

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
          zIndex: 1,
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
            {/* Left Avatar */}
            <Avatar sx={{ bgcolor: "#d1d1d1", width: 40, height: 40 }} />

            {/* Dropdowns */}
            <Box sx={{ display: "flex", gap: 2, ml: 4 }}>
              <SelectReact
                value={organization}
                onChange={handleOrganizationChange}
                options={organizationOptions}
                placeholder="Select Organization"
                styles={customStyles}
                isClearable={!dashboardLocked}
                isDisabled={dashboardLocked}
                menuPortalTarget={document.body}
                menuPosition="fixed"
              />
              <SelectReact
                value={project}
                onChange={handleProjectChange}
                options={projectOptions}
                placeholder="Select Project"
                styles={customStyles}
                isClearable={!dashboardLocked}
                isDisabled={dashboardLocked}
                menuPortalTarget={document.body}
                menuPosition="fixed"
                noOptionsMessage={() => "No projects available"}
              />
            </Box>

            {/* Back Button */}
            {isOnDashboard && (
              <Box sx={{ ml: "auto" }}>
                <Button
                  variant="outlined"
                  startIcon={<ArrowBackIosNewIcon />}
                  onClick={() => {
                    sessionStorage.setItem("dashboardShouldReset", "true");
                    setDashboardLocked(false);
                    if (setView) setView("table");
                  }}
                  sx={{
                    color: "#333",
                    borderColor: "#bbb",
                    borderRadius: "8px",
                    textTransform: "none",
                    fontWeight: 500,
                    px: 2.5,
                    py: 1,
                    ml: "auto",
                    backgroundColor: "#fff",
                    "&:hover": {
                      backgroundColor: "#f0f0f0",
                      borderColor: "#999",
                    },
                  }}
                >
                  Back
                </Button>
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
