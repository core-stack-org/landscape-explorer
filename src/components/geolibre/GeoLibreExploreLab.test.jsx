import { fireEvent, render, screen } from "@testing-library/react";
import GeoLibreExploreLab from "./GeoLibreExploreLab";

const lulcLayer = (level, year, label) => ({
  id: `corestack-lulc_level_${level}_${year}`,
  name: `LULC Level ${level} · ${label}`,
  type: "raster",
  visible: false,
  opacity: 1,
  groupId: `lulc-${level}`,
  source: { url: `https://example.test/lulc-${level}-${year}.tif` },
  metadata: {
    corestack: {
      domain: `LULC Level ${level}`,
      year,
    },
  },
});

const project = {
  version: "0.2.0",
  name: "Lakhipur project",
  mapView: {
    center: [93.04, 24.85],
    zoom: 10,
    bearing: 0,
    pitch: 0,
    bbox: [92.91, 24.71, 93.17, 24.99],
  },
  layers: [
    {
      id: "corestack-administrative_boundaries",
      name: "Administrative Boundaries",
      type: "geojson",
      visible: true,
      opacity: 0.8,
      groupId: "demographic",
      metadata: {
        loadState: "loaded",
        corestack: { domain: "Demographic" },
      },
      geojson: { type: "FeatureCollection", features: [] },
    },
    {
      id: "corestack-mws_layers",
      name: "Micro-watersheds and Hydrological Variables",
      type: "geojson",
      visible: false,
      opacity: 1,
      groupId: "hydrology",
      source: {
        service: "wfs",
        typeName: "mws_layers:deltaG_well_depth_cachar_lakhipur",
        url: "https://example.test/mws?service=WFS",
      },
      metadata: {
        loadState: "unloaded",
        corestack: { domain: "Hydrology" },
      },
      geojson: { type: "FeatureCollection", features: [] },
    },
    lulcLayer("1", "17_18", "2017-2018"),
    lulcLayer("1", "24_25", "2024-2025"),
    lulcLayer("2", "17_18", "2017-2018"),
    lulcLayer("2", "24_25", "2024-2025"),
    lulcLayer("3", "17_18", "2017-2018"),
    lulcLayer("3", "24_25", "2024-2025"),
  ],
  metadata: {
    scope: {
      state: "Assam",
      district: "Cachar",
      tehsil: "Lakhipur",
      bounds: [92.91, 24.71, 93.17, 24.99],
    },
    geolibre: { applicationVersion: "2.4.0" },
  },
};

describe("CoRE Stack Explore handoff", () => {
  const createObjectURL = jest.fn(() => "blob:kyl-explore");
  const revokeObjectURL = jest.fn();

  beforeEach(() => {
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
    Object.defineProperty(window.URL, "createObjectURL", {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(window.URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectURL,
    });
    jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("presents curated notebooks and starts a synchronized LULC comparison", () => {
    const onApplyProject = jest.fn();
    const onClose = jest.fn();
    render(
      <GeoLibreExploreLab
        open
        project={project}
        onClose={onClose}
        onApplyProject={onApplyProject}
        onRestoreProject={jest.fn()}
      />
    );

    expect(screen.getByRole("dialog").textContent).toMatch(
      /CoRE Stack Explore.*Hydrology and cropping.*LULC change.*Layer workbench/i
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Open comparison/i })
    );

    expect(onApplyProject).toHaveBeenCalledWith(
      expect.objectContaining({
        mapLayout: { rows: 1, cols: 2, syncView: true },
        primaryMapLabel: "LULC Level 3 · 2017-2018",
      })
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("downloads generated notebooks without embedding credentials", () => {
    render(
      <GeoLibreExploreLab
        open
        project={project}
        onClose={jest.fn()}
        onApplyProject={jest.fn()}
        onRestoreProject={jest.fn()}
      />
    );

    const downloads = screen.getAllByRole("button", {
      name: /Download notebook/i,
    });
    downloads.forEach((button) => fireEvent.click(button));

    expect(createObjectURL).toHaveBeenCalledTimes(3);
    for (const call of createObjectURL.mock.calls) {
      const blob = call[0];
      expect(blob).toBeInstanceOf(Blob);
    }
  });

  it("closes without rendering when requested", () => {
    const onClose = jest.fn();
    const { rerender } = render(
      <GeoLibreExploreLab
        open
        project={project}
        onClose={onClose}
        onApplyProject={jest.fn()}
        onRestoreProject={jest.fn()}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Close CoRE Stack Explore/i })
    );
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(
      <GeoLibreExploreLab
        open={false}
        project={project}
        onClose={onClose}
        onApplyProject={jest.fn()}
        onRestoreProject={jest.fn()}
      />
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
