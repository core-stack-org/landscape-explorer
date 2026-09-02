import { fireEvent, render, screen } from "@testing-library/react";
import GeoLibreLegend from "./GeoLibreLegend";

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
      screen.getByRole("button", { name: "Legend" }).getAttribute("aria-expanded")
    ).toBe("true");
    expect(screen.getByText("Built-up")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Legend" }));
    expect(
      screen.getByRole("button", { name: "Legend" }).getAttribute("aria-expanded")
    ).toBe("false");

    rerender(<GeoLibreLegend legends={[level1, level2]} />);

    expect(
      screen.getByRole("button", { name: "Legend" }).getAttribute("aria-expanded")
    ).toBe("true");
    expect(
      screen.getByRole("combobox", { name: "Visible layer legend" }).value
    ).toBe("LULC Level 2 legend");
    expect(screen.getByText("Crops")).toBeTruthy();
  });
});
