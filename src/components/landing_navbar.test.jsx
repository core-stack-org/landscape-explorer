import { render, screen } from "@testing-library/react";
import LandingNavbar from "./landing_navbar";

jest.mock(
  "react-router-dom",
  () => ({ useLocation: () => ({ pathname: "/download_layers" }) }),
  { virtual: true }
);

describe("Download Layers navigation", () => {
  it("links to GeoLibre, QGIS, and the QML style fallback", () => {
    render(<LandingNavbar />);

    expect(
      screen.getByRole("link", { name: /GeoLibre User Guide/i })
        .getAttribute("href")
    ).toBe("https://geolibre.app/user-guide/interface/");
    expect(
      screen.getByRole("link", { name: /QGIS Documentation/i })
        .getAttribute("href")
    ).toContain("docs.google.com/document");
    expect(
      screen.getByRole("link", { name: /CoRE Stack QGIS Styles repository/i })
        .getAttribute("href")
    ).toBe("https://github.com/core-stack-org/QGIS-Styles");
  });
});
