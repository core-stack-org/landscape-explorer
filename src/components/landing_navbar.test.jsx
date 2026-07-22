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
    expect(document.body.textContent).toContain(
      "To Use these layers with QGIS, download layer styles from the CoRE Stack QGIS Styles repository."
    );
    expect(
      screen.getByRole("link", { name: "CC BY 4.0" }).getAttribute("href")
    ).toBe("https://creativecommons.org/licenses/by/4.0/");
    expect(document.body.textContent).toContain(
      "CoRE Stack datasets are available under CC BY 4.0."
    );
  });
});
