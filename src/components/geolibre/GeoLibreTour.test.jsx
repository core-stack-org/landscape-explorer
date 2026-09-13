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

it("offers notebook guidance before the final slide with the shared Drive link", () => {
  const notebookSteps = GEOLIBRE_TOUR_STEPS.map((step, index) => ({ ...step, index })).filter(step => step.link);
  expect(notebookSteps).toHaveLength(2);
  expect(notebookSteps.every(step => step.index < GEOLIBRE_TOUR_STEPS.length - 1)).toBe(true);
  render(<GeoLibreTour open onClose={jest.fn()} />);
  for (let i = 0; i < notebookSteps[0].index; i += 1) fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByRole("link", { name: "Open CoRE Stack Notebooks" }).getAttribute("href"))
    .toBe("https://drive.google.com/drive/folders/1UcqMoiqfcSzv0COTGnJQPPf8LiK4W4v6");
});
