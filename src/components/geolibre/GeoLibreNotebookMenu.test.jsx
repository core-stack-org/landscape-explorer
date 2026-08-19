import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import GeoLibreNotebookMenu from "./GeoLibreNotebookMenu";

const project = {
  metadata: {
    scope: { state: "Assam", district: "Cachar", tehsil: "Lakhipur" },
  },
};

describe("GeoLibre notebook download menu", () => {
  beforeEach(() => window.localStorage.clear());

  it("shows the workflow, official documentation, and six disabled downloads without a scope", () => {
    render(<GeoLibreNotebookMenu />);
    fireEvent.click(
      screen.getByRole("button", {
        name: /Explore CoRE Stack Data Layers with Notebooks/i,
      })
    );

    expect(screen.getByText(/Processing → Jupyter Notebook → Upload Files/i)).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /GeoLibre interface guide/i }).getAttribute("href")
    ).toBe("https://geolibre.app/user-guide/interface/");
    expect(
      screen.getByRole("link", { name: /Notebook guide/i }).getAttribute("href")
    ).toBe("https://geolibre.app/notebook/");
    expect(screen.getAllByTitle(/^Download (?!guided)/i)).toHaveLength(6);
    expect(screen.getByText("Guided notebooks")).toBeTruthy();
    expect(screen.getByText("Complete layer manifest")).toBeTruthy();
    expect(
      screen.getAllByTitle(/^Download (?!guided)/i).every((button) => button.disabled)
    ).toBe(true);
    expect(screen.getByText(/Select a state, district, and tehsil/i)).toBeTruthy();
  });

  it("downloads a notebook, explains the upload step, and records at most two recent choices", async () => {
    const onDownload = jest
      .fn()
      .mockImplementation(async (id) => ({ filename: `${id}.ipynb` }));
    render(<GeoLibreNotebookMenu project={project} onDownload={onDownload} />);
    fireEvent.click(screen.getByRole("button", { name: /Explore CoRE Stack/i }));

    fireEvent.click(screen.getByTitle("Download Understand the micro-watersheds in a tehsil"));
    await waitFor(() => expect(onDownload).toHaveBeenCalledWith("tehsil-mws-overview"));
    expect((await screen.findByRole("status")).textContent).toMatch(
      /Processing → Jupyter Notebook → Upload Files/i
    );

    fireEvent.click(screen.getByTitle("Download Follow water conditions through time"));
    await waitFor(() => expect(onDownload).toHaveBeenCalledWith("hydrology-water-balance"));
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain(
        "hydrology-water-balance.ipynb"
      )
    );
    fireEvent.click(screen.getByTitle("Download Compare cropping intensity and drought"));
    await waitFor(() => expect(onDownload).toHaveBeenCalledWith("agriculture-drought"));
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain(
        "agriculture-drought.ipynb"
      )
    );

    expect(JSON.parse(window.localStorage.getItem("corestack.geolibre.recentNotebooks"))).toEqual([
      "agriculture-drought",
      "hydrology-water-balance",
    ]);
    expect(screen.getByText("Recently downloaded")).toBeTruthy();
    expect(
      screen.getAllByTitle("Download Compare cropping intensity and drought")
    ).toHaveLength(2);
    expect(
      screen.getAllByTitle("Download Follow water conditions through time")
    ).toHaveLength(2);
    expect(
      screen.getAllByTitle("Download Understand the micro-watersheds in a tehsil")
    ).toHaveLength(1);
  });

  it("keeps the menu open and reports a failed template download", async () => {
    const onDownload = jest.fn().mockRejectedValue(new Error("Notebook template unavailable"));
    render(<GeoLibreNotebookMenu project={project} onDownload={onDownload} />);
    fireEvent.click(screen.getByRole("button", { name: /Explore CoRE Stack/i }));
    fireEvent.click(screen.getByTitle("Download Find unusual micro-watersheds"));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Notebook template unavailable"
    );
    expect(screen.getByRole("dialog", { name: /notebook downloads/i })).toBeTruthy();
  });
});
