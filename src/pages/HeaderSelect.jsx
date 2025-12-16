import React, { useEffect } from "react";
import { Box, Avatar, Toolbar, AppBar, Container, Button } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import SelectReact from "react-select";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import { useRecoilState } from "recoil";
import {
  organizationAtom,
  projectAtom,
  dashboardLockedAtom,
  organizationOptionsAtom,
  projectOptionsAtom,
} from "../store/locationStore";

const HeaderSelect = ({ setView }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [organization, setOrganization] = useRecoilState(organizationAtom);
  const [project, setProject] = useRecoilState(projectAtom);
  const [dashboardLocked, setDashboardLocked] =
    useRecoilState(dashboardLockedAtom);
  const [organizationOptions, setOrganizationOptions] = useRecoilState(organizationOptionsAtom);

  const [projectOptions, setProjectOptions] = useRecoilState(projectOptionsAtom);

  const isOnDashboard = location.pathname.includes("/dashboard");

  useEffect(() => {
    if (isOnDashboard && project) setDashboardLocked(true);
    else setDashboardLocked(false);

    const savedOrg = sessionStorage.getItem("selectedOrganization");

    if (savedOrg !== null) {
      const parsed = JSON.parse(savedOrg);
      const matched = organizationOptions.find((o) => o.value === parsed.value);
      if (matched) setOrganization(matched);
    }

    const savedProj = sessionStorage.getItem("selectedProject");
    if (savedProj) {
      const parsed = JSON.parse(savedProj);
      setProject(parsed);
    }
  }, [location.pathname, organizationOptions]);

  const fetchOrganizations = async () => {
    try {

      // Login and get token first
      let token = sessionStorage.getItem("accessToken");
      if (!token) token = await loginAndGetToken();
      if (!token) return;
  
      //  Fetch ALL plantation projects first
      const projRes = await fetch(
        `${process.env.REACT_APP_API_URL}/projects/?app_type=plantation`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      const projectData = await projRes.json();
      const plantationProjects = projectData.filter(
        (p) => p.app_type === "plantation"
      );
  
      //  Collect org IDs that actually have projects
      const orgsWithProjects = new Set(
        plantationProjects.map((p) => p.organization)
      );
  
  
      // Extract org IDs that have plantation projects
      // const orgsWithProjects = new Set(projectData.map((p) => p.organization));
  
      // Fetch organizations AFTER knowing which ones have projects
      const orgRes = await fetch(
        `${process.env.REACT_APP_API_URL}/auth/register/available_organizations/?app_type=plantation`
      );
      const orgData = await orgRes.json();
  
      const validOrganizations = orgData
        .filter((org) => orgsWithProjects.has(org.id))
        .map((org) => ({
          value: org.id,
          label: org.name,
        }));
      
        console.log(validOrganizations)

      setOrganizationOptions(validOrganizations);

      
      // Restore selected org if saved
      const savedOrg = sessionStorage.getItem("selectedOrganization");

      if (savedOrg !== "null") {
        const parsed = JSON.parse(savedOrg);
        const match = validOrganizations.find((o) => o.value === parsed.value);
        if (match) setOrganization(match);
      }
  
    } catch (err) {
      console.error("Error fetching organizations:", err);
    }
  };

  
  const fetchProjects = async (orgId) => {
    let token = sessionStorage.getItem("accessToken");
    if (!token) token = await loginAndGetToken();
    if (!token) return;
  
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/projects/?app_type=plantation`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
  
      const data = await response.json();
      const filtered = data.filter((p) => p.organization === orgId && p.app_type === "plantation");
  
      const options = filtered.map((p) => ({
        label: p.name,
        value: String(p.id),
      }));
  
      setProjectOptions(options);
  
      // restore saved project
      const savedProj = sessionStorage.getItem("selectedProject");
      if (savedProj) {
        const parsed = JSON.parse(savedProj);
        const matched = options.find((p) => p.value === parsed.value);
        if (matched) setProject(matched);
      }
  
    } catch (err) {
      console.error("Error fetching projects:", err);
    }
  };
  
  

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const loginAndGetToken = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/auth/login/`,
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
      console.error("Auto-login failed:", err);
      return null;
    }
  };


  useEffect(() => {
    if (organization) fetchProjects(organization.value);
  }, [organization]);

  const handleOrganizationChange = (option) => {
    setOrganization(option);
    setProject(null);
    setProjectOptions([]);
    sessionStorage.setItem("selectedOrganization", JSON.stringify(option));
    sessionStorage.removeItem("selectedProject");
    setDashboardLocked(false);
    if (setView) setView("table");
  };

  const handleProjectChange = (option) => {
    setProject(option);
    sessionStorage.setItem("selectedProject", JSON.stringify(option));
    setDashboardLocked(true);
    if (setView) setView("table");

    if (option?.value) {
      navigate(`/dashboard/${option.value}`);

      window.location.reload();
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

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [dashboardLocked, setView]);

  const customStyles = {
    control: (base) => ({ ...base, height: 48, minHeight: 48, width: 264 }),
    menu: (base) => ({ ...base, zIndex: 9999 }),
    menuPortal: (base) => ({ ...base, zIndex: 1300 }),
  };

  return (
    <Box
      sx={{ height: "100vh", overflow: "hidden", backgroundColor: "#EAEAEA" }}
    >
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
        <Container maxWidth={false} sx={{ px: 4 }}>
          <Toolbar sx={{ display: "flex", alignItems: "center", px: 0 }}>
            <Avatar sx={{ bgcolor: "#d1d1d1", width: 40, height: 40 }} />

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

            <Box sx={{ ml: "auto" }}>
              <Button
                variant="outlined"
                startIcon={<ArrowBackIosNewIcon />}
                onClick={() => {
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
                Change Project
              </Button>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      <Box
        sx={{
          position: "relative",
          top: 0,
          left: 0,
          width: "70%",
          height: "calc(100vh - 120px)",
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
