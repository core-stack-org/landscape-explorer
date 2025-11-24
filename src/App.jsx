import { BrowserRouter, Routes, Route } from "react-router-dom";
<<<<<<< HEAD
import KYLDashboardPage from "./pages/kyl_dashboard";
import LandscapeExplorer from "./pages/LandscapeExplorer";
import LEHomepage from "./pages/LE_homepage";
=======
import LE_page from "./pages/LE_page";
import LandingPage from "./pages/landingPage";
import KYLDashboardPage from "./pages/kyl_dashboard";
import WaterDashboard from "./pages/water_dashboard";
import WaterProjectDashboard from "./components/water_project_dashboard";
>>>>>>> 6761200 (water body rej dashboard added)

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
          <Route path="/landscape_explorer" element={<LE_page />} />
          <Route path="/water_dashboard" element={<WaterDashboard />} />
          <Route
            path="/dashboard/:projectId"
            element={<WaterProjectDashboard />}
          />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
