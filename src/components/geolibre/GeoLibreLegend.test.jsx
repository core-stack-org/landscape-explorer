import { fireEvent, render, screen } from "@testing-library/react";
import GeoLibreLegend, { legendPosition } from "./GeoLibreLegend";

const level1 = {
  title: "LULC Level 1 legend",
  items: [{ label: "Built-up", color: "#ff0000", shape: "square" }],
};

const level2 = {
  title: "LULC Level 2 legend",
  items: [{ label: "Crops", color: "#fad36f", shape: "square" }],
};

describe("GeoLibre legend", () => {
  it("selects the legend for a newly visible LULC style", () => {
    const { rerender } = render(<GeoLibreLegend legends={[level1]} />);

    expect(
      screen.getByRole("button", { name: "Raster legend" }).getAttribute("aria-expanded")
    ).toBe("true");
    expect(screen.getByText("Built-up")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Raster legend" }));
    expect(
      screen.getByRole("button", { name: "Raster legend" }).getAttribute("aria-expanded")
    ).toBe("false");

    rerender(<GeoLibreLegend legends={[level1, level2]} />);

    expect(
      screen.getByRole("button", { name: "Raster legend" }).getAttribute("aria-expanded")
    ).toBe("true");
    expect(
      screen.getByRole("combobox", { name: "Visible layer legend" }).value
    ).toBe("LULC Level 2 legend");
    expect(screen.getByText("Crops")).toBeTruthy();
  });
});

test("legend stays inside a map that shrinks, grows, or moves beside panels", () => {
  const size = { width: 288, height: 200 };
  expect(legendPosition({ width: 1000, height: 600 }, size)).toMatchObject({ left: 700, top: 388 });
  expect(legendPosition({ width: 500, height: 400 }, size)).toMatchObject({ left: 200, top: 188 });
  const tiny = legendPosition({ width: 200, height: 100 }, size, { x: 2, y: -1 });
  expect(tiny).toEqual({ left: 12, top: 12, width: 176, height: 76 });
});
