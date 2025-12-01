import { BrowserRouter, Routes, Route } from "react-router-dom";
import KYLDashboardPage from "./pages/kyl_dashboard";
import WaterDashboard from "./pages/water_dashboard";
import WaterProjectDashboard from "./components/water_project_dashboard";
import LEHomepage from "./pages/LE_homepage";


function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LEHomepage />} />
          {/* <Route path="/kyl_dashboard" element={<KYLDashboardPage />} />
        <Route path="/download_layers" element={<LandscapeExplorer/>}/>
          <Route path="/" element={<LandingPage />} /> */}
          <Route path="/kyl_dashboard" element={<KYLDashboardPage />} />
          {/* <Route path="/landscape_explorer" element={<LE_page />} /> */}
          <Route path="/water_dashboard" element={<WaterProjectDashboard />} />
          <Route
            path="/dashboard"
            element={<WaterProjectDashboard />}
          />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
