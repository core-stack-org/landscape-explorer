import { act, render, screen } from "@testing-library/react";
import GeoLibreFrame from "./GeoLibreFrame";

const project = {
  version: "0.2.0",
  name: "Lakhipur project",
  mapView: {
    center: [93.04, 24.84],
    zoom: 9.6,
    bearing: 0,
    pitch: 0,
    bbox: [92.91, 24.71, 93.17, 24.99],
  },
  layers: [],
};

const announceReady = (frame, version = "2.2.0") => {
  window.dispatchEvent(
    new MessageEvent("message", {
      origin: "https://web.geolibre.app",
      source: frame.contentWindow,
      data: { type: "geolibre:ready", version },
    })
  );
};

describe("GeoLibre iframe bridge", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("loads the project and fits its bbox after a compatible v2.1 handshake", () => {
    render(<GeoLibreFrame project={project} />);
    const frame = screen.getByTitle("GeoLibre GIS workspace");
    const postMessage = jest.spyOn(frame.contentWindow, "postMessage");

    act(() => announceReady(frame, "2.1.0"));

    expect(screen.getByText(/GeoLibre 2\.1\.0 · rolling host/i)).toBeTruthy();

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "geolibre:load-project",
        project,
        seq: 1,
      }),
      "https://web.geolibre.app"
    );

    act(() => jest.advanceTimersByTime(1500));
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "geolibre:command",
        method: "fitBounds",
        params: { bounds: project.mapView.bbox },
      }),
      "https://web.geolibre.app"
    );
  });

  it("does not send a project to an incompatible major version", () => {
    render(<GeoLibreFrame project={project} />);
    const frame = screen.getByTitle("GeoLibre GIS workspace");
    const postMessage = jest.spyOn(frame.contentWindow, "postMessage");

    act(() => announceReady(frame, "3.0.0"));

    expect(screen.getByRole("alert").textContent).toMatch(
      /GeoLibre 3\.0\.0 is not compatible.*major version 2/i
    );
    expect(postMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "geolibre:load-project" }),
      expect.any(String)
    );
  });
});
