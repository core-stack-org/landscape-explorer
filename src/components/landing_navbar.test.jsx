import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import LandingNavbar from "./landing_navbar";
import { downloadExcel } from "./landscape-explorer/utils/downloadHelper";

jest.mock(
  "react-router-dom",
  () => ({ useLocation: () => ({ pathname: "/explore_data" }) }),
  { virtual: true }
);

jest.mock("./landscape-explorer/utils/downloadHelper", () => ({
  downloadExcel: jest.fn(() => Promise.resolve(true)),
}));

describe("Explore Data navigation help", () => {
  it("shows the quick tour, datasheet download, and QGIS documentation", async () => {
    render(
      <LandingNavbar
        downloadScope={{ state: "BIHAR", district: "BANKA", tehsil: "BANKA" }}
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /Download Excel for the selected tehsil/i,
      })
    );
    await waitFor(() =>
      expect(downloadExcel).toHaveBeenCalledWith(
        "https://geoserver.core-stack.org/api/v1/download_excel_layer?state=BIHAR&district=BANKA&block=BANKA",
        "BANKA_data.xlsx"
      )
    );
    expect(
      screen
        .getByRole("link", { name: /Open QGIS Documentation/i })
        .getAttribute("href")
    ).toBe(
      "https://docs.google.com/document/d/1jet4EEBbbKgpNrPnuNJJDRuAJUiR2pIMFQp9JTlygAQ/edit?usp=sharing"
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Start the GeoLibre quick tour/i })
    );
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Find layers to explore")).toBeTruthy();
  });
});

it("resets the selected explorer first, then returns to location selection", () => {
  const reset = jest.fn(), choose = jest.fn();
  const {rerender} = render(<LandingNavbar downloadScope={{state:"Bihar", district:"Nalanda", tehsil:"Hilsa"}} onResetExplorer={reset} onChooseLocation={choose} />);
  fireEvent.click(screen.getByRole("button",{name:"Reset tehsil view"}));
  expect(reset).toHaveBeenCalledTimes(1);
  expect(choose).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button",{name:"Choose another tehsil"}));
  expect(choose).toHaveBeenCalledTimes(1);
  rerender(<LandingNavbar downloadScope={{state:"Bihar", district:"Banka", tehsil:"Banka"}} onResetExplorer={reset} onChooseLocation={choose} />);
  expect(screen.getByRole("button",{name:"Reset tehsil view"})).toBeTruthy();
});
