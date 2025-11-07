import React, { useEffect, useState } from "react";
import {
  Box,
  Avatar,
  Toolbar,
  AppBar,
  Container,
  Select,
  MenuItem,
  Button,
} from "@mui/material";
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
  const [organization, setOrganization] = useState(initialOrg || null);
  const [organizationOptions, setOrganizationOptions] = useState([]);
  const [project, setProject] = useState(initialProject || null);
  const [filter, setFilter] = useState("");
  const [projects, setProjects] = useState([]);
  const [projectCount, setProjectCount] = useState(0);
  const [projectOptions, setProjectOptions] = useState([]);
  const [dashboardLocked, setDashboardLocked] = useState(false);

  const navigate = useNavigate();

  const isOnDashboard = location.pathname.includes("/dashboard");

  useEffect(() => {
    if (location.pathname.includes("/dashboard") && project) {
      setDashboardLocked(true);
    } else {
      setDashboardLocked(false);
    }
  }, [location.pathname, project]);

  const loginAndGetToken = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/auth/login/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
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
      console.error(" Auto-login failed:", err);
      return null;
    }
  };

  useEffect(() => {
    const fetchOrganizations = async () => {
      const start = performance.now();
      const options = await loadOrganization();
      const end = performance.now();
      setOrganizationOptions(options);

      if (!organization && isOnDashboard) {
        const storedOrg = sessionStorage.getItem("selectedOrganization");
        if (storedOrg) {
          setOrganization(JSON.parse(storedOrg));
        } else if (options.length > 0) {
          setOrganization(options[0]);
        }
      }

      const storedProject = sessionStorage.getItem("selectedProject");
      if (storedProject) {
        setProject(JSON.parse(storedProject)); // just set, match will happen after `fetchProjects`
      }
    };

    fetchOrganizations();
  }, []);
  useEffect(() => {
    const fetchProjects = async () => {
      if (!organization) {
        return;
      }

      let token = sessionStorage.getItem("accessToken");
      if (!token) {
        token = await loginAndGetToken();
        if (!token) return;
      }

      try {
        const response = await fetch(
          `${process.env.REACT_APP_API_URL}/projects/`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "ngrok-skip-browser-warning": "420",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        const filtered = data.filter(
          (project) => project.organization === organization.value
        );

        const options = filtered.map((project) => ({
          label: project.name,
          value: String(project.id),
        }));

        setProjectOptions(options);
        setProjectCount(filtered.length);
        setProjects(filtered);

        // Handle session-matched project
        const storedProject = sessionStorage.getItem("selectedProject");
        if (storedProject) {
          const parsed = JSON.parse(storedProject);
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
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/auth/register/available_organizations/?app_type=waterbody`,
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
      zIndex: 1300,
    }),
  };

  const handleOrganizationChange = (selectedOption) => {
    setOrganization(selectedOption);
    setProject(null);
    setProjectOptions([]);

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

    sessionStorage.removeItem("selectedProject");

    if (setView) setView("table");
    setDashboardLocked(false);
  };

  const handleProjectChange = (selectedOption) => {
    setProject(selectedOption);
    sessionStorage.setItem("selectedProject", JSON.stringify(selectedOption));

    if (setView) setView("table");
    setDashboardLocked(true);

    if (selectedOption?.value) {
      navigate(`/dashboard/${selectedOption.value}`);
    }
  };

  useEffect(() => {
    const savedOrg = sessionStorage.getItem("selectedOrganization");
    const savedProject = sessionStorage.getItem("selectedProject");

    if (savedOrg) {
      setOrganization(JSON.parse(savedOrg));
    }

    if (savedProject) {
      setProject(JSON.parse(savedProject));
    }
  }, []);

  useEffect(() => {
    const handlePopState = (event) => {
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

  useEffect(() => {
    if (organization) {
      sessionStorage.setItem(
        "selectedOrganization",
        JSON.stringify(organization)
      );
    }
  }, [organization]);

  return (
    <div class="h-screen overflow-hidden bg-[#EAEAEA]">
      {/* AppBar */}
      <div class="relative z-[1] bg-[#11000080] backdrop-blur-md h-[120px] shadow-none flex justify-center">
        <div class="max-w-[2440px] w-full px-4 mx-auto">
          <div class="flex items-center h-full w-full px-0">
            {/* Left: Avatar */}
            <Avatar sx={{ bgcolor: "#d1d1d1", width: 40, height: 40 }} />

            {/* Center: Org + Project Selects */}
            <div class="flex gap-2 ml-4">
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
            </div>
            <div class="ml-auto">
              <button
                onClick={() => {
                  sessionStorage.removeItem("selectedProject");
                  setDashboardLocked(false);
                  if (setView) setView("table");
                }}
                class="flex items-center gap-2 ml-auto border border-[#bbb] text-[#333] bg-white rounded-lg font-medium px-3 py-1.5 hover:bg-[#f0f0f0] hover:border-[#999] transition-colors"
              >
                <ArrowBackIosNewIcon class="w-4 h-4" />
                Change Project
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Background Image */}
      <div
        className="relative top-0 left-0 w-[70%] h-[calc(100vh-120px)] bg-cover bg-center z-0"
        style={{
          backgroundImage: `url(${water})`,
          opacity: 0.3,
        }}
      ></div>
    </div>
  );
};

export default HeaderSelect;
