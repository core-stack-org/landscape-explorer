import { act, render, screen } from "@testing-library/react";
import GeoLibreFrame, {
  applyGlobalHoverState,
  formatGeoLibreLog,
  geoLibreProjectLoadSignature,
} from "./GeoLibreFrame";

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

const announceReady = (frame, version = "2.6.0") => {
  window.dispatchEvent(
    new MessageEvent("message", {
      origin: "https://web.geolibre.app",
      source: frame.contentWindow,
      data: { type: "geolibre:ready", version },
    })
  );
};

const receive = (frame, data) => act(() => {
  window.dispatchEvent(new MessageEvent("message", { origin: "https://web.geolibre.app", source: frame.contentWindow, data }));
});
const initializeMap = (frame, postMessage, snapshot = project) => {
  const load = postMessage.mock.calls.map(([message]) => message).filter(message => message.type === "geolibre:load-project").at(-1);
  receive(frame, { type: "geolibre:state", seq: load.seq, project: snapshot });
  const getView = postMessage.mock.calls.map(([message]) => message).filter(message => message.method === "getView").at(-1);
  receive(frame, { type: "geolibre:result", requestId: getView.requestId, ok: true, value: { center: [93.04, 24.84] } });
  const fit = postMessage.mock.calls.map(([message]) => message).filter(message => message.method === "fitBounds").at(-1);
  if (fit) receive(frame, { type: "geolibre:result", requestId: fit.requestId, ok: true, value: null });
};

describe("GeoLibre iframe bridge", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("disables every layer hover without changing its popup fields", () => {
    const layers = [
      { id: "on", popup: { click: true, hover: true, fields: [{ field: "uid", hover: true }] } },
      { id: "off", popup: { click: true, hover: false, fields: [{ field: "name" }] } },
      { id: "plain" },
    ];
    const hoverStates = new Map([["on", true], ["off", false]]);
    const disabled = applyGlobalHoverState({ ...project, layers }, false, hoverStates);

    expect(disabled.layers).toEqual([
      { id: "on", popup: { click: true, hover: false, fields: [{ field: "uid", hover: true }] } },
      layers[1],
      layers[2],
    ]);
    expect(applyGlobalHoverState(disabled, true, hoverStates).layers).toEqual(layers);
  });

  it("starts with all hovers off and can restore each previous layer setting", () => {
    const hoverProject = {
      ...project,
      layers: [
        { id: "hover-on", popup: { click: true, hover: true, fields: [{ field: "uid", hover: true }] } },
        { id: "hover-off", popup: { click: true, hover: false, fields: [{ field: "name" }] } },
      ],
    };
    const { rerender } = render(<GeoLibreFrame project={hoverProject} />);
    const frame = screen.getByTitle("GeoLibre GIS workspace");
    const postMessage = jest.spyOn(frame.contentWindow, "postMessage");

    act(() => announceReady(frame));
    const initialLoad = postMessage.mock.calls
      .map(([message]) => message)
      .filter((message) => message.type === "geolibre:load-project")
      .at(-1);
    expect(initialLoad.project.layers.map((layer) => layer.popup.hover)).toEqual([false, false]);

    initializeMap(frame, postMessage, initialLoad.project);
    expect(screen.queryByRole("button", { name: /Hover:/ })).toBeNull();
    rerender(<GeoLibreFrame project={hoverProject} hoverEnabled />);

    const enabledLoad = postMessage.mock.calls
      .map(([message]) => message)
      .filter((message) => message.type === "geolibre:load-project")
      .at(-1);
    expect(enabledLoad.project.layers.map((layer) => layer.popup.hover)).toEqual([true, false]);
  });

  it("keeps the latest live layer state while hovers are toggled globally", () => {
    const hoverProject = {
      ...project,
      layers: [{ id: "hover-on", visible: false, opacity: 1, popup: { click: true, hover: true, fields: [] } }],
    };
    const { rerender } = render(<GeoLibreFrame project={hoverProject} />);
    const frame = screen.getByTitle("GeoLibre GIS workspace");
    const postMessage = jest.spyOn(frame.contentWindow, "postMessage");
    act(() => announceReady(frame));
    const initialLoad = postMessage.mock.calls
      .map(([message]) => message)
      .filter((message) => message.type === "geolibre:load-project")
      .at(-1);
    initializeMap(frame, postMessage, initialLoad.project);

    rerender(<GeoLibreFrame project={hoverProject} hoverEnabled />);
    const enabledLoad = postMessage.mock.calls
      .map(([message]) => message)
      .filter((message) => message.type === "geolibre:load-project")
      .at(-1);
    receive(frame, {
      type: "geolibre:state",
      seq: enabledLoad.seq,
      project: {
        ...enabledLoad.project,
        layers: enabledLoad.project.layers.map((layer) => ({
          ...layer,
          visible: true,
          opacity: 0.6,
          popup: { ...layer.popup, hover: false },
        })),
      },
    });

    rerender(<GeoLibreFrame project={hoverProject} />);
    const disabledLoad = postMessage.mock.calls
      .map(([message]) => message)
      .filter((message) => message.type === "geolibre:load-project")
      .at(-1);
    expect(disabledLoad.project.layers[0]).toEqual(expect.objectContaining({
      visible: true,
      opacity: 0.6,
      popup: expect.objectContaining({ hover: false }),
    }));

    rerender(<GeoLibreFrame project={hoverProject} hoverEnabled />);
    const restoredLoad = postMessage.mock.calls
      .map(([message]) => message)
      .filter((message) => message.type === "geolibre:load-project")
      .at(-1);
    expect(restoredLoad.project.layers[0]).toEqual(expect.objectContaining({
      visible: true,
      opacity: 0.6,
      popup: expect.objectContaining({ hover: false }),
    }));
  });

  it("reloads when only a group name changes", () => {
    const before = { ...project, layerGroups: [{ id: "lulc", name: "LULC by year", collapsed: true }] };
    const after = { ...before, layerGroups: [{ ...before.layerGroups[0], name: "Land Use Land Cover" }] };
    expect(geoLibreProjectLoadSignature(after)).not.toBe(geoLibreProjectLoadSignature(before));
  });

  it("treats a map-layout reset as a project reload", () => {
    const splitProject = {
      ...project,
      mapLayout: { rows: 1, cols: 2 },
      secondaryMapViews: [{ id: "secondary-0", view: project.mapView }],
    };
    const singleMapProject = {
      ...project,
      mapLayout: { rows: 1, cols: 1 },
      secondaryMapViews: [],
    };

    expect(geoLibreProjectLoadSignature(splitProject)).not.toBe(
      geoLibreProjectLoadSignature(singleMapProject)
    );
  });

  it("loads the project and fits its bbox after a compatible v2.6 handshake", () => {
    render(<GeoLibreFrame project={project} />);
    const frame = screen.getByTitle("GeoLibre GIS workspace");
    const postMessage = jest.spyOn(frame.contentWindow, "postMessage");

    act(() => announceReady(frame, "2.6.0"));

    expect(screen.getByText(/GeoLibre 2\.6\.0 · rolling host/i)).toBeTruthy();

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "geolibre:load-project",
        project,
        seq: 1,
      }),
      "https://web.geolibre.app"
    );

    initializeMap(frame, postMessage);
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "geolibre:command",
        method: "fitBounds",
        params: { bounds: project.mapView.bbox },
      }),
      "https://web.geolibre.app"
    );
  });

  it("does not reload the same project for a same-scope rerender", () => {
    const { rerender } = render(<GeoLibreFrame project={project} />);
    const frame = screen.getByTitle("GeoLibre GIS workspace");
    const postMessage = jest.spyOn(frame.contentWindow, "postMessage");

    act(() => announceReady(frame));
    const loadCount = () =>
      postMessage.mock.calls.filter(
        ([message]) => message.type === "geolibre:load-project"
      ).length;
    expect(loadCount()).toBe(1);

    rerender(<GeoLibreFrame project={project} />);
    expect(loadCount()).toBe(1);
  });

  it("loads the project after the supported v3 handshake", () => {
    render(<GeoLibreFrame project={project} />);
    const frame = screen.getByTitle("GeoLibre GIS workspace");
    const postMessage = jest.spyOn(frame.contentWindow, "postMessage");

    act(() => announceReady(frame, "3.0.0"));

    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText(/GeoLibre 3\.0\.0 · rolling host/i)).toBeTruthy();
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "geolibre:load-project", project }),
      "https://web.geolibre.app"
    );
  });

  it("does not send a project to an incompatible major version", () => {
    render(<GeoLibreFrame project={project} />);
    const frame = screen.getByTitle("GeoLibre GIS workspace");
    const postMessage = jest.spyOn(frame.contentWindow, "postMessage");

    act(() => announceReady(frame, "4.0.0"));

    expect(screen.getByRole("alert").textContent).toMatch(
      /map is temporarily unavailable.*try again in a moment/i
    );
    expect(screen.getByRole("alert").textContent).not.toMatch(
      /GeoLibre 4\.0\.0|major version|iframe/i
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
        details: { expectedVersion: "2.6.0" },
      },
    ]);

    expect(output).toContain("KYL GeoLibre technical log");
    expect(output).toContain("iframe_handshake_timeout");
    expect(output).toContain('"expectedVersion":"2.6.0"');
  });

  it("reloads a lazily hydrated project without fitting the tehsil again", () => {
    const { rerender } = render(<GeoLibreFrame project={project} />);
    const frame = screen.getByTitle("GeoLibre GIS workspace");
    const postMessage = jest.spyOn(frame.contentWindow, "postMessage");

    act(() => announceReady(frame));
    initializeMap(frame, postMessage);

    const hydratedProject = {
      ...project,
      layers: [{ id: "corestack-drainage", visible: true }],
    };
    expect(screen.queryByText("GeoLibre is loading")).toBeNull();
    rerender(<GeoLibreFrame project={hydratedProject} />);
    expect(screen.queryByText("GeoLibre is loading")).toBeNull();
    expect(screen.queryByText("Map open. Layers may still be loading.")).toBeNull();

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

  it("keeps an already-loaded raster source when only visibility changes", () => {
    const rasterProject = {
      ...project,
      layers: [
        {
          id: "corestack-lulc_level_2_17_18",
          name: "LULC Level 2 · 2017-2018",
          type: "raster",
          source: {
            type: "raster",
            tiles: ["https://geoserver.example/wms?year=17_18&style=level_2"],
          },
          visible: true,
          opacity: 1,
          style: { rasterBrightnessMin: 0, rasterBrightnessMax: 1 },
        },
      ],
    };
    const { rerender } = render(<GeoLibreFrame project={rasterProject} />);
    const frame = screen.getByTitle("GeoLibre GIS workspace");
    const postMessage = jest.spyOn(frame.contentWindow, "postMessage");

    act(() => announceReady(frame));
    const loadCount = () =>
      postMessage.mock.calls.filter(([message]) =>
        message.type === "geolibre:load-project"
      ).length;
    expect(loadCount()).toBe(1);

    rerender(
      <GeoLibreFrame
        project={{
          ...rasterProject,
          layers: rasterProject.layers.map((layer) => ({
            ...layer,
            visible: false,
          })),
        }}
      />
    );

    expect(loadCount()).toBe(1);
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
          data: { type: "geolibre:state", seq: 1, project: viewerProject },
        })
      );
    });

    expect(onProjectState).toHaveBeenCalledWith(viewerProject);
  });
});
