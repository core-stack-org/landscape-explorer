import { act, render, screen } from "@testing-library/react";
import GeoLibreFrame, { formatGeoLibreLog } from "./GeoLibreFrame";

const project = {
  version: "0.2.0",
  name: "Lakhipur project",
  metadata: {
    scope: { state: "Assam", district: "Cachar", tehsil: "Lakhipur" },
  },
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
      /map is temporarily unavailable.*try again in a moment/i
    );
    expect(screen.getByRole("alert").textContent).not.toMatch(
      /GeoLibre 3\.0\.0|major version|iframe/i
    );
    expect(
      screen.getByRole("button", { name: /Download technical log/i })
    ).toBeTruthy();
    expect(postMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "geolibre:load-project" }),
      expect.any(String)
    );
  });

  it("shows helpful language when the iframe handshake is delayed", () => {
    render(<GeoLibreFrame project={project} onRetry={jest.fn()} />);

    act(() => jest.advanceTimersByTime(90000));

    expect(screen.getByRole("alert").textContent).toMatch(
      /map is taking longer than expected.*internet connection.*try again/i
    );
    expect(screen.getByRole("alert").textContent).not.toMatch(
      /iframe handshake|browser console/i
    );
  });

  it("formats bounded troubleshooting entries as a plain-text log", () => {
    const output = formatGeoLibreLog([
      {
        timestamp: "2026-07-22T00:00:00.000Z",
        event: "iframe_handshake_timeout",
        details: { expectedVersion: "2.2.0" },
      },
    ]);

    expect(output).toContain("KYL GeoLibre technical log");
    expect(output).toContain("iframe_handshake_timeout");
    expect(output).toContain('"expectedVersion":"2.2.0"');
  });

  it("reloads a lazily hydrated project without fitting the tehsil again", () => {
    const { rerender } = render(<GeoLibreFrame project={project} />);
    const frame = screen.getByTitle("GeoLibre GIS workspace");
    const postMessage = jest.spyOn(frame.contentWindow, "postMessage");

    act(() => announceReady(frame));
    act(() => jest.advanceTimersByTime(1500));

    const hydratedProject = {
      ...project,
      layers: [{ id: "corestack-drainage", visible: true }],
    };
    rerender(<GeoLibreFrame project={hydratedProject} />);

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "geolibre:load-project",
        project: hydratedProject,
        seq: 2,
      }),
      "https://web.geolibre.app"
    );
    act(() => jest.advanceTimersByTime(1500));
    expect(
      postMessage.mock.calls.filter(
        ([message]) => message.type === "geolibre:command" && message.method === "fitBounds"
      )
    ).toHaveLength(1);
  });

  it("forwards viewer state snapshots for toggle-triggered loading", () => {
    const onProjectState = jest.fn();
    render(
      <GeoLibreFrame project={project} onProjectState={onProjectState} />
    );
    const frame = screen.getByTitle("GeoLibre GIS workspace");
    act(() => announceReady(frame));

    const viewerProject = {
      ...project,
      layers: [{ id: "corestack-drainage", visible: true }],
    };
    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: "https://web.geolibre.app",
          source: frame.contentWindow,
          data: { type: "geolibre:state", project: viewerProject },
        })
      );
    });

    expect(onProjectState).toHaveBeenCalledWith(viewerProject);
  });
});
