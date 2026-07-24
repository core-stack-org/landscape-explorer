import { render, screen } from "@testing-library/react";
import GeoLibreRustWorkbench, {
  readGeoLibreRustMapExtent,
} from "./GeoLibreRustWorkbench";
import { initializeGeoLibreRust } from "./geolibreRustEngine";

jest.mock("./geolibreRustEngine", () => ({
  initializeGeoLibreRust: jest.fn(),
  runGeoLibreRustRasterWorkflow: jest.fn(),
  runGeoLibreRustVectorWorkflow: jest.fn(),
}));

describe("GeoLibreRustWorkbench", () => {
  beforeEach(() => {
    initializeGeoLibreRust.mockResolvedValue({
      toolCount: 936,
      curatedTools: [],
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { village_id: "1", score: 12.5 },
            geometry: null,
          },
        ],
      }),
    });
  });

  afterEach(() => {
    delete global.fetch;
  });

  test("stays unmounted until opened", () => {
    render(<GeoLibreRustWorkbench open={false} onClose={() => {}} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  test("asks for a complete KYL location", () => {
    initializeGeoLibreRust.mockReturnValue(new Promise(() => {}));
    render(<GeoLibreRustWorkbench open onClose={() => {}} />);
    expect(screen.getByText("Select a district and tehsil first")).not.toBeNull();
  });

  test("shows the full workbench for a selected tehsil", async () => {
    const map = {
      getSize: () => [800, 600],
      getView: () => ({
        calculateExtent: () => [72.123456789, 21.2, 73.4, 22.5],
      }),
    };

    render(
      <GeoLibreRustWorkbench
        open
        onClose={() => {}}
        district="Banas Kantha"
        tehsil="Palanpur"
        getMap={() => map}
      />
    );

    expect(screen.getByText("KYL GeoLibre Rust Workbench")).not.toBeNull();
    expect(screen.getByText("45 sources")).not.toBeNull();
    expect(screen.getByText("72.123457, 21.2, 73.4, 22.5")).not.toBeNull();
    expect(await screen.findByText("Ready · 936 tools")).not.toBeNull();
    expect(await screen.findByText("2 attributes · 2 numeric")).not.toBeNull();
  });

  test("reads and rounds the current OpenLayers viewport", () => {
    const extent = readGeoLibreRustMapExtent(() => ({
      getSize: () => [100, 100],
      getView: () => ({
        calculateExtent: () => [1.123456789, 2, 3, 4.987654321],
      }),
    }));

    expect(extent).toEqual([1.123457, 2, 3, 4.987654]);
  });
});
