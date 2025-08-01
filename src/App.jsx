import { BrowserRouter, Routes, Route } from "react-router-dom";
import KYLDashboardPage from "./pages/kyl_dashboard";
import LandscapeExplorer from "./pages/LandscapeExplorer";
import LEHomepage from "./pages/LE_homepage";

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LEHomepage />} />
          <Route path="/kyl_dashboard" element={<KYLDashboardPage />} />
        <Route path="/download_layers" element={<LandscapeExplorer/>}/>
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
