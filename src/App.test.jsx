import fs from "fs";
import path from "path";

describe("application routes", () => {
  it("keeps /explore_data wired to the GeoLibre implementation", () => {
    const appSource = fs.readFileSync(path.join(__dirname, "App.jsx"), "utf8");
    const exploreDataPageSource = fs.readFileSync(
      path.join(__dirname, "pages/LandscapeExplorer.jsx"),
      "utf8"
    );

    expect(appSource).toContain(
      '<Route path="/explore_data" element={<LandscapeExplorer />} />'
    );
    expect(exploreDataPageSource).toContain(
      'import GeoLibreFrame from "../components/geolibre/GeoLibreFrame";'
    );
    expect(exploreDataPageSource).toContain("<GeoLibreFrame");
    expect(exploreDataPageSource).not.toContain(
      'components/landscape-explorer/map/Map.jsx'
    );
    expect(exploreDataPageSource).not.toContain(
      'components/landscape-explorer/sidebar/RightSidebar.jsx'
    );
  });
});
