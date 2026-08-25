import { fireEvent, render, screen } from "@testing-library/react";
import GeoLibreTour, { GEOLIBRE_TOUR_STEPS } from "./GeoLibreTour";

describe("GeoLibre quick tour", () => {
  it("walks through the CoRE Stack guidance and finishes", () => {
    const onClose = jest.fn();
    render(<GeoLibreTour open onClose={onClose} />);

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText(GEOLIBRE_TOUR_STEPS[0].title)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText(GEOLIBRE_TOUR_STEPS[1].title)).toBeTruthy();

    for (let index = 1; index < GEOLIBRE_TOUR_STEPS.length - 1; index += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
    }
    fireEvent.click(screen.getByRole("button", { name: "Finish" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes with Escape and links to the official tutorials", () => {
    const onClose = jest.fn();
    render(<GeoLibreTour open onClose={onClose} />);

    expect(
      screen.getByRole("link", { name: /Official tutorials/i }).getAttribute("href")
    ).toBe("https://geolibre.app/tutorials/");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
