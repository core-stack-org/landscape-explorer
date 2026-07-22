import {
  GEOLIBRE_CONFIG,
  geoLibreVersionStatus,
  resolveGeoLibreViewer,
} from "./geolibre.config";

const config = {
  version: "2.2.0",
  minimumCompatibleVersion: "2.0.0",
  supportedMajorVersion: 2,
  viewerUrlTemplate: "https://viewer.example/geolibre/{version}/",
  strictVersion: true,
};

describe("GeoLibre application configuration", () => {
  it("resolves a versioned viewer URL and embed parameters", () => {
    expect(resolveGeoLibreViewer(config)).toEqual({
      url: "https://viewer.example/geolibre/2.2.0/?embed=1&welcome=0",
      origin: "https://viewer.example",
      versionPinned: true,
    });
  });

  it("marks the official unversioned deployment as rolling", () => {
    expect(resolveGeoLibreViewer(GEOLIBRE_CONFIG).versionPinned).toBe(false);
  });

  it("accepts the configured v2.2 viewer", () => {
    expect(geoLibreVersionStatus("2.2.0", config)).toEqual({
      compatible: true,
      message: "",
    });
  });

  it("accepts supported hosted GeoLibre 2.x releases by default", () => {
    expect(geoLibreVersionStatus("2.1.0", GEOLIBRE_CONFIG).compatible).toBe(
      true
    );
    expect(geoLibreVersionStatus("2.2.0", GEOLIBRE_CONFIG).compatible).toBe(
      true
    );
  });

  it("rejects unexpected, older, and major-version viewers", () => {
    expect(geoLibreVersionStatus("2.3.0", config).compatible).toBe(false);
    expect(geoLibreVersionStatus("1.9.9", config).compatible).toBe(false);
    expect(geoLibreVersionStatus("3.0.0", config).compatible).toBe(false);
  });

  it("can allow a compatible newer 2.x viewer for an explicit test deployment", () => {
    expect(
      geoLibreVersionStatus("2.4.0", { ...config, strictVersion: false })
        .compatible
    ).toBe(true);
  });

  it("does not treat a version-only major upgrade as compatible", () => {
    expect(
      geoLibreVersionStatus("3.0.0", { ...config, version: "3.0.0" })
        .compatible
    ).toBe(false);
  });
});
