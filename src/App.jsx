import { BrowserRouter, Routes, Route } from "react-router-dom";
import LE_page from "./pages/LE_page";
import LandingPage from "./pages/landingPage";
import KYLDashboardPage from "./pages/kyl_dashboard";
import LEHomepage from "./pages/LE_homepage";

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          {/* <Route path="/" element={<LandingPage/>}/> */}
          <Route path="/" element={<LEHomepage />} />
          <Route path="/kyl_dashboard" element={<KYLDashboardPage />} />
          <Route path="/landscape_explorer" element={<LE_page />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
