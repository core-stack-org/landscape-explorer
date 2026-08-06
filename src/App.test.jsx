import fs from "fs";
import path from "path";

describe("application routes", () => {
  it("keeps /download_layers wired to the GeoLibre implementation", () => {
    const appSource = fs.readFileSync(path.join(__dirname, "App.jsx"), "utf8");
    const downloadPageSource = fs.readFileSync(
      path.join(__dirname, "pages/LandscapeExplorer.jsx"),
      "utf8"
    );

    expect(appSource).toContain(
      '<Route path="/download_layers" element={<LandscapeExplorer />} />'
    );
    expect(downloadPageSource).toContain(
      'import GeoLibreFrame from "../components/geolibre/GeoLibreFrame";'
    );
    expect(downloadPageSource).toContain("<GeoLibreFrame");
    expect(downloadPageSource).not.toContain(
      'components/landscape-explorer/map/Map.jsx'
    );
    expect(downloadPageSource).not.toContain(
      'components/landscape-explorer/sidebar/RightSidebar.jsx'
    );
  });
});
