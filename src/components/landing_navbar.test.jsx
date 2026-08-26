import { fireEvent, render, screen } from "@testing-library/react";
import LandingNavbar from "./landing_navbar";

jest.mock(
  "react-router-dom",
  () => ({ useLocation: () => ({ pathname: "/explore_data" }) }),
  { virtual: true }
);

describe("Explore Data navigation help", () => {
  it("shows the quick tour and both tutorial resources", () => {
    render(<LandingNavbar />);

    expect(
      screen
        .getByRole("link", { name: /Open GeoLibre Tutorials/i })
        .getAttribute("href")
    ).toBe("https://geolibre.app/tutorials/");
    expect(
      screen
        .getByRole("link", { name: /Open QGIS Documentation/i })
        .getAttribute("href")
    ).toBe(
      "https://docs.google.com/document/d/1jet4EEBbbKgpNrPnuNJJDRuAJUiR2pIMFQp9JTlygAQ/edit?usp=sharing"
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Start the GeoLibre quick tour/i })
    );
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Find layers to explore")).toBeTruthy();
  });
});
