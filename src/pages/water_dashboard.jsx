import React from "react";
import { useState, useEffect } from "react";
import HeaderSelect from "../components/water_headerSection";
import water from "../assets/water.jpeg";
import { Box } from "@mui/material";
const WaterDashboard = () => {
  const [projects, setProjects] = useState([]);

  // useEffect(() => {
  //   const fetchProjects = async () => {
  //     try {
  //       const token = sessionStorage.getItem("accessToken");
  //       const response = await fetch(
  //         `${process.env.local.REACT_APP_BACKENDSERVER_URL}api/v1/projects/`,
  //         {
  //           method: "GET",
  //           headers: {
  //             "Content-Type": "application/json",
  //             "ngrok-skip-browser-warning": "420",
  //             Authorization: `Bearer ${token}`,
  //           },
  //         }
  //       );

  //       if (!response.ok) {
  //         throw new Error(`HTTP error! Status: ${response.status}`);
  //       }

  //       const data = await response.json();
  //       console.log(data);
  //       const statesResponse = await fetch(
  //         `${process.env.local.REACT_APP_API_URL}/api/v1/get_states/`,
  //         {
  //           method: "GET",
  //           headers: {
  //             "Content-Type": "application/json",
  //             "ngrok-skip-browser-warning": "420",
  //           },
  //         }
  //       );

  //       if (!statesResponse.ok) {
  //         throw new Error(`HTTP error! Status: ${statesResponse.status}`);
  //       }

  //       const statesData = await statesResponse.json();
  //       const stateMap = {};
  //       statesData.states.forEach((state) => {
  //         stateMap[state.state_census_code] = state.state_name;
  //       });

  //       // Add state_name to projects
  //       const updatedProjects = data.map((project) => ({
  //         ...project,
  //         state_name: stateMap[project.state] || "Unknown State",
  //       }));
  //       setProjects(updatedProjects);
  //     } catch (error) {
  //       console.error("Error fetching projects:", error);
  //     }
  //   };

  //   fetchProjects();
  // }, []);

  return (
    <div>
      <HeaderSelect />
    </div>
  );
};

export default WaterDashboard;
