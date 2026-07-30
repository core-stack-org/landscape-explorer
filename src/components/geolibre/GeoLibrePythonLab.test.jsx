import { fireEvent, render, screen } from "@testing-library/react";
import GeoLibrePythonLab from "./GeoLibrePythonLab";

const project = {
  version: "0.2.0",
  name: "Lakhipur project",
  mapView: { bbox: [92.91, 24.71, 93.17, 24.99] },
  layers: [
    {
      id: "corestack-demographics",
      name: "Socio-Economic Profile",
      type: "geojson",
      visible: true,
      opacity: 0.8,
      metadata: {
        loadState: "loaded",
        corestack: { domain: "Demographic" },
      },
    },
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

describe("GeoLibre Python Lab handoff", () => {
  const createObjectURL = jest.fn(() => "blob:kyl-python-lab");
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

  it("explains the native upload flow and downloads both artifacts", () => {
    render(
      <GeoLibrePythonLab open project={project} onClose={jest.fn()} />
    );

    expect(screen.getByRole("dialog").textContent).toMatch(
      /Lakhipur.*Processing.*Jupyter Notebook.*run all cells/i
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Download Jupyter notebook/i })
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: /Download Python Console script/i,
      })
    );

    expect(createObjectURL).toHaveBeenCalledTimes(2);
  });

  it("closes without rendering when requested", () => {
    const onClose = jest.fn();
    const { rerender } = render(
      <GeoLibrePythonLab open project={project} onClose={onClose} />
    );

    fireEvent.click(screen.getByRole("button", { name: /Close Python Lab/i }));
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(
      <GeoLibrePythonLab open={false} project={project} onClose={onClose} />
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
