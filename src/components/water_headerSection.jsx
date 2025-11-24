import React, { useEffect, useState } from "react";
import { Avatar } from "@mui/material";
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
  const [projects, setProjects] = useState([]);
  const [projectCount, setProjectCount] = useState(0);
  const [projectOptions, setProjectOptions] = useState([]);
  const [dashboardLocked, setDashboardLocked] = useState(false);

  const navigate = useNavigate();

  const isOnDashboard = location.pathname.includes("/dashboard");

  // ---- LOCK LOGIC ----
  useEffect(() => {
    if (location.pathname.includes("/dashboard") && project) {
      setDashboardLocked(true);
    } else {
      setDashboardLocked(false);
    }
  }, [location.pathname, project]);

  // ---- LOGIN TOKEN ----
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
      localStorage.setItem("accessToken", data.access);
      return data.access;
    } catch (err) {
      console.error(" Auto-login failed:", err);
      return null;
    }
  };

  useEffect(() => {
    loginAndGetToken(); // always refresh token when dashboard loads
  }, []);

  // ---- LOAD ORGANIZATIONS ----
  useEffect(() => {
    const fetchOrganizations = async () => {
      const options = await loadOrganization();
      setOrganizationOptions(options);

      if (!organization && isOnDashboard) {
        const storedOrg = localStorage.getItem("selectedOrganization");
        if (storedOrg) {
          setOrganization(JSON.parse(storedOrg));
        } else if (options.length > 0) {
          setOrganization(options[0]);
        }
      }
    };

    fetchOrganizations();
  }, []);

  // ---- LOAD PROJECTS FOR ORG ----
  useEffect(() => {
    const fetchProjects = async () => {
      if (!organization) return;

      let token = localStorage.getItem("accessToken");
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

        if (!response.ok)
          throw new Error(`HTTP error! Status: ${response.status}`);

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

        // Try to restore from URL
        const params = new URLSearchParams(location.search);
        const projectNameFromURL = params.get("project_name");

        if (projectNameFromURL) {
          const match = options.find(
            (p) => p.label.toLowerCase() === projectNameFromURL.toLowerCase()
          );
          if (match) {
            setProject(match);
            localStorage.setItem("selectedProject", JSON.stringify(match));
            return;
          }
        }

        // Fallback to saved project
        const storedProject = localStorage.getItem("selectedProject");
        if (storedProject) {
          const parsed = JSON.parse(storedProject);
          const matched = options.find((p) => p.value === parsed.value);
          if (matched) setProject(matched);
        }
      } catch (error) {
        console.error("Error fetching projects:", error);
      }
    };

    fetchProjects();
  }, [organization, location.search]);

  // ---- FETCH ORGANIZATIONS API ----
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

  // ---- SELECT MENUS UI ----
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

  // ---- ORGANIZATION CHANGE ----
  const handleOrganizationChange = (selectedOption) => {
    setOrganization(selectedOption);
    setProject(null);
    setProjectOptions([]);

    if (selectedOption) {
      localStorage.setItem(
        "selectedOrganization",
        JSON.stringify(selectedOption)
      );
      localStorage.setItem(
        "organizationName",
        selectedOption.label.toUpperCase()
      );
    } else {
      localStorage.removeItem("selectedOrganization");
      localStorage.removeItem("organizationName");
    }

    localStorage.removeItem("selectedProject");

    if (setView) setView("table");
    setDashboardLocked(false);
  };

  // ---- PROJECT CHANGE ----
  const handleProjectChange = (selectedOption) => {
    setProject(selectedOption);

    localStorage.setItem("selectedProject", JSON.stringify(selectedOption));

    if (setView) setView("table");
    setDashboardLocked(true);

    if (selectedOption?.value) {
      navigate(
        `/dashboard?type=project&project_name=${encodeURIComponent(
          selectedOption.label
        )}`
      );
    }
  };

  // ---- POPSTATE ----
  useEffect(() => {
    const handlePopState = () => {
      if (dashboardLocked) {
        setDashboardLocked(false);
        if (setView) setView("table");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [dashboardLocked, setView]);

  // ---- SYNC ORG TO LOCALSTORAGE ----
  useEffect(() => {
    if (organization) {
      localStorage.setItem(
        "selectedOrganization",
        JSON.stringify(organization)
      );
    }
  }, [organization]);

  return (
    <div class="h-screen overflow-hidden bg-[#EAEAEA]">
      <div class="relative z-[1] bg-[#11000080] backdrop-blur-md h-[120px] shadow-none flex justify-center">
        <div class="max-w-[2440px] w-full px-4 mx-auto">
          <div class="flex items-center h-full w-full px-0">
            <Avatar sx={{ bgcolor: "#d1d1d1", width: 40, height: 40 }} />

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
                  localStorage.removeItem("selectedProject");
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
