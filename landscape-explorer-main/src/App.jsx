import { BrowserRouter, Routes, Route } from "react-router-dom";
import KYLDashboardPage from "./pages/kyl_dashboard";
import LEHomepage from "./pages/LE_homepage";
import LandscapeExplorer from "./pages/LandscapeExplorer";
import PlansPage from "./components/plansPage";
import PlanViewPage from "./components/plan_detailView";
import AgroHorticulture from "./pages/AgroHorticulture";
import RWBDashboard from "./pages/RWBDashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LEHomepage />} />
        <Route path="/kyl_dashboard" element={<KYLDashboardPage />} />
        <Route path="/download_layers" element={<LandscapeExplorer />} />
        <Route path="/agrohorticulture" element={<AgroHorticulture/>}/>
        <Route path="/rwb" element={<RWBDashboard/>}/>
        <Route path="/CCUsagePage" element={<PlansPage />} />
        <Route path="/plan-view" element={<PlanViewPage />} />



      </Routes>
    </BrowserRouter>
  );
}

export default App;
