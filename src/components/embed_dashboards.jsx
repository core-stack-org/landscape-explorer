import React from "react";
import { useParams } from "react-router";
import LandingNavbar from "../components/landing_navbar";
import Footer from '../components/footer'
const EmbedDashboard = () => {

  const { dashboardType } = useParams();

  const DASHBOARD_URLS = {

    waterbody:
      process.env.REACT_APP_ORG_DASHBOARD_URL,
    
  };

  const dashboardUrl =
    DASHBOARD_URLS[dashboardType];

  if (!dashboardUrl) {
    return (
      <div className="p-10 text-red-500">
        Invalid dashboard type
      </div>
    );
  }

  return (
    <div
    className="min-h-screen flex flex-col bg-white"
    style={{ colorScheme: "light" }}
    >  
      {/* HEADER */}
      <LandingNavbar />
  
      {/* DASHBOARD */}
      <div
        className="flex-1 overflow-hidden bg-white"
        style={{ colorScheme: "light" }}
    >        <iframe
          src={dashboardUrl}
          title={dashboardType}
          width="100%"
          height="100%"
          style={{
            border: "none",
            minHeight: "calc(100vh - 140px)",
            overflow:"hidden",
            colorScheme: "light",
            backgroundColor: "white",
          }}
          allowFullScreen
        />
      </div>
  
      {/* FOOTER */}
      <Footer />
  
    </div>
  );
};

export default EmbedDashboard;